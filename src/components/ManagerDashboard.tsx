/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Appointment, AppointmentStatus } from "../types";
import { TIME_SLOTS, formatFriendlyDate, formatDayMonth } from "../utils/dateUtils";
import { copyToClipboard } from "../utils/clipboard";
import {
  Calendar,
  Search,
  CheckCircle,
  Clock,
  Truck,
  FileText,
  MessageSquare,
  AlertCircle,
  FileSpreadsheet,
  Edit2,
  ChevronRight,
  Filter,
  TrendingUp,
  Boxes,
  XCircle,
  FileCheck,
  Trash2
} from "lucide-react";

interface ManagerDashboardProps {
  appointments: Appointment[];
  onUpdateStatus: (id: string, newStatus: AppointmentStatus) => void;
  onDeleteAppointment?: (id: string) => void;
  isAdmin?: boolean;
}

export function ManagerDashboard({
  appointments,
  onUpdateStatus,
  onDeleteAppointment,
  isAdmin = true,
}: ManagerDashboardProps) {
  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  
  // Set default selected date for the detailed view to "Tomorrow" (relative relative)
  const tomorrowStr = useMemo(() => {
    const today = new Date();
    const temp = new Date(today);
    temp.setDate(today.getDate() + 1);
    const yr = temp.getFullYear();
    const mt = String(temp.getMonth() + 1).padStart(2, "0");
    const dy = String(temp.getDate()).padStart(2, "0");
    return `${yr}-${mt}-${dy}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(tomorrowStr);

  // Modal State for Edit/Detail
  const [selectedApp, setSelectedApp] = useState<Appointment | null>(null);

  // Generate 7 upcoming business days starting from today for the quick timeline selector
  const quickDaysList = useMemo(() => {
    const list: { dateStr: string; label: string; weekday: string; count: number }[] = [];
    const today = new Date();
    let added = 0;
    let daysTried = 0;

    while (added < 7 && daysTried < 15) {
      const nextD = new Date(today);
      nextD.setDate(today.getDate() + daysTried);
      daysTried++;

      const isSunday = nextD.getDay() === 0;
      if (isSunday) continue; // skip sunday

      const yr = nextD.getFullYear();
      const mt = String(nextD.getMonth() + 1).padStart(2, "0");
      const dy = String(nextD.getDate()).padStart(2, "0");
      const dateStr = `${yr}-${mt}-${dy}`;

      const totalBookingsForDay = appointments.filter((a) => a.date === dateStr).length;

      const weekdayStr = nextD.toLocaleDateString("pt-BR", { weekday: "short" }).toUpperCase();
      const labelStr = nextD.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

      list.push({
        dateStr,
        label: labelStr,
        weekday: weekdayStr.replace(".", ""),
        count: totalBookingsForDay,
      });
      added++;
    }
    return list;
  }, [appointments]);

  // Overall KPIs calculation
  const kpis = useMemo(() => {
    return {
      total: appointments.length,
      pending: appointments.filter((a) => a.status === AppointmentStatus.Aguardando).length,
      confirmed: appointments.filter((a) => a.status === AppointmentStatus.Confirmado).length,
      receiving: appointments.filter((a) => a.status === AppointmentStatus.EmRecebimento).length,
      concluded: appointments.filter((a) => a.status === AppointmentStatus.Concluido).length,
      canceled: appointments.filter((a) => a.status === AppointmentStatus.Cancelado).length,
      totalVolume: appointments.reduce((acc, current) => acc + (current.status !== AppointmentStatus.Cancelado ? current.volume : 0), 0),
      totalPallets: appointments.reduce((acc, current) => acc + (current.status !== AppointmentStatus.Cancelado ? (current.pallets || 0) : 0), 0),
      totalWeight: appointments.reduce((acc, current) => acc + (current.status !== AppointmentStatus.Cancelado ? current.weight : 0), 0),
    };
  }, [appointments]);

  // Filtered List based on Search, Status filter, AND selected date
  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      const matchesSearch =
        app.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || app.status === statusFilter;
      const matchesDate = !selectedDate || app.date === selectedDate;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [appointments, searchTerm, statusFilter, selectedDate]);

  // Daily Summary Cumulative metrics helper
  const selectedDateMetrics = useMemo(() => {
    const dayApps = appointments.filter(
      (a) => a.date === selectedDate && a.status !== AppointmentStatus.Cancelado
    );
    return {
      count: dayApps.length,
      volume: dayApps.reduce((acc, current) => acc + current.volume, 0),
      pallets: dayApps.reduce((acc, current) => acc + (current.pallets || 0), 0),
      weight: dayApps.reduce((acc, current) => acc + current.weight, 0),
    };
  }, [appointments, selectedDate]);

  // Handle Generating Whatsapp text format
  const handleExportWhatsApp = () => {
    const dayAppointments = appointments.filter(
      (a) => a.date === selectedDate && a.status !== AppointmentStatus.Cancelado
    );

    if (dayAppointments.length === 0) {
      alert(`Nenhum agendamento ativo para a data ${formatDayMonth(selectedDate)}.`);
      return;
    }

    // Sort by slot
    const sorted = [...dayAppointments].sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));

    let txt = `*🚚 PROGRAMAÇÃO DE RECEBIMENTO — CD BORACÉIA 🚚*\n`;
    txt += `*📅 Data:* ${formatFriendlyDate(selectedDate)}\n`;
    txt += `*Doca:* CD Boracéia Matriz\n`;
    txt += `----------------------------------------------\n\n`;

    // Group by slot
    const grouped: Record<string, Appointment[]> = {};
    TIME_SLOTS.forEach((slot) => {
      const items = sorted.filter((a) => a.timeSlot === slot);
      if (items.length > 0) {
        grouped[slot] = items;
      }
    });

    Object.keys(grouped).forEach((slot) => {
      txt += `*⏱️ Janela: ${slot}*\n`;
      grouped[slot].forEach((app) => {
        const checkIcon = app.status === AppointmentStatus.Concluido ? "✅" : app.status === AppointmentStatus.EmRecebimento ? "🔵" : "🟢";
        txt += `  • *${app.supplierName}* (${app.productType})\n`;
        txt += `    | Placa: ${app.plate} | Mot: ${app.driverName}\n`;
        txt += `    | Qtd: ${app.volume} vol | Peso: ${app.weight.toLocaleString("pt-BR")} kg\n`;
        txt += `    | Protocolo: ${app.id} | Responsável: ${app.createdBy || "Sistema"}\n`;
        txt += `    | Status: ${checkIcon} ${app.status}\n\n`;
      });
    });

    txt += `_Boas operações! Atenciosamente, Gerência de Recebimento Marsil Atacadista Boracéia_`;

    copyToClipboard(txt).then((success) => {
      if (success) {
        alert("Grade de entregas do dia copiada no formato WhatsApp com sucesso!");
      } else {
        alert("Não foi possível copiar automaticamente. Por favor, tente copiar manualmente.");
      }
    });
  };

  const handleExportExcel = (mode: "dia" | "semana" | "mes" | "historico") => {
    let listToExport = [...appointments];
    let filename = "agendamentos_historico.xlsx";

    if (mode === "dia") {
      listToExport = appointments.filter(a => a.date === selectedDate);
      filename = `agendamentos_dia_${selectedDate}.xlsx`;
    } else if (mode === "semana") {
      if (!selectedDate) {
        alert("Selecione uma data para exportar a semana correspondente.");
        return;
      }
      const selDateObj = new Date(selectedDate);
      const dayOfWeek = selDateObj.getDay(); 
      const distanceToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      
      const monday = new Date(selDateObj);
      monday.setDate(selDateObj.getDate() + distanceToMon);
      monday.setHours(0,0,0,0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23,59,59,999);

      listToExport = appointments.filter(a => {
        const d = new Date(a.date);
        return d >= monday && d <= sunday;
      });
      filename = `agendamentos_semana_${selectedDate}.xlsx`;
    } else if (mode === "mes") {
      if (!selectedDate) {
        alert("Selecione uma data para exportar o mês correspondente.");
        return;
      }
      const monthStr = selectedDate.substring(0, 7); 
      listToExport = appointments.filter(a => a.date.startsWith(monthStr));
      filename = `agendamentos_mes_${monthStr}.xlsx`;
    }

    if (listToExport.length === 0) {
      alert("Nenhum registro encontrado para esta seleção de exportação.");
      return;
    }

    const rows = listToExport.map(appt => ({
      Protocolo: appt.id,
      Fornecedor: appt.supplierName,
      CNPJ: appt.cnpj,
      Data: formatFriendlyDate(appt.date),
      "Janela de Horário": appt.timeSlot,
      Motorista: appt.driverName,
      Placa: appt.plate,
      "Tipo de Veículo": appt.vehicleType,
      "Tipo de Produto": appt.productType,
      "Quantidade de Caixas (Vol)": appt.volume,
      "Quantidade de Paletes": appt.pallets || 0,
      "Peso Estimado (kg)": appt.weight,
      "Número da NF": appt.invoiceNumber || "Não informado",
      Observações: appt.notes || "",
      Status: appt.status,
      "Cadastrado Por": appt.createdBy || "Sistema",
      "Criado em": new Date(appt.createdAt).toLocaleString("pt-BR"),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    
    const max_len = rows.reduce((prev, next) => {
      Object.keys(next).forEach((k) => {
        const valStr = String(next[k as keyof typeof next] || "");
        prev[k] = Math.max(prev[k] || 10, valStr.length, k.length);
      });
      return prev;
    }, {} as Record<string, number>);

    ws["!cols"] = Object.keys(max_len).map((k) => ({
      wch: max_len[k] + 3
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Agendamentos");
    XLSX.writeFile(wb, filename);
  };

  return (
    <div id="manager-dashboard-view" className="space-y-6">
      {/* 1. KPI Cards */}
      <div id="kpi-panel" className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {/* Total info */}
        <div className="bg-[#1a2129] border border-slate-800 p-3.5 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold tracking-wider">TOTAL</span>
            <Boxes className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <span className="text-xl font-bold text-white font-mono">{kpis.total}</span>
            <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">Cadastrados</span>
          </div>
        </div>

        {/* Pending Card */}
        <div className="bg-[#1a2129] border border-slate-800/80 p-3.5 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-xs font-semibold tracking-wider">AGUARDANDO</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <span className="text-xl font-bold text-amber-400 font-mono">{kpis.pending}</span>
            <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">Pendentes</span>
          </div>
        </div>

        {/* Confirmed Card */}
        <div className="bg-[#1a2129] border border-slate-800/80 p-3.5 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#51cf66] mb-1">
            <span className="text-xs font-semibold tracking-wider">CONFIRMADOS</span>
            <CheckCircle className="w-4 h-4 text-[#51cf66]" />
          </div>
          <div>
            <span className="text-xl font-bold text-[#51cf66] font-mono">{kpis.confirmed}</span>
            <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">Aptos à descarga</span>
          </div>
        </div>

        {/* In Receipt Card */}
        <div className="bg-[#1a2129] border border-slate-800/80 p-3.5 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#4dabf7] mb-1">
            <span className="text-xs font-semibold tracking-wider font-sans">EM DOCAS</span>
            <Truck className="w-4 h-4 text-[#4dabf7]" />
          </div>
          <div>
            <span className="text-xl font-bold text-[#4dabf7] font-mono">{kpis.receiving}</span>
            <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">Em recebimento</span>
          </div>
        </div>

        {/* Concluded Card */}
        <div className="bg-[#1a2129] border border-slate-800/80 p-3.5 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-300 mb-1">
            <span className="text-xs font-semibold tracking-wider">CONCLUÍDO</span>
            <FileCheck className="w-4 h-4 text-[#51cf66]" />
          </div>
          <div>
            <span className="text-xl font-bold text-slate-100 font-mono">{kpis.concluded}</span>
            <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">Finalizados</span>
          </div>
        </div>

        {/* Cancelled Card */}
        <div className="bg-[#1a2129] border border-slate-800/80 p-3.5 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#ff6b6b] mb-1">
            <span className="text-xs font-semibold tracking-wider">CANCELADO</span>
            <XCircle className="w-4 h-4 text-[#ff6b6b]" />
          </div>
          <div>
            <span className="text-xl font-bold text-[#ff6b6b] font-mono">{kpis.canceled}</span>
            <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">Desconsiderados</span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Navigation Calendario Semanal de Docas */}
      <div className="bg-[#1a2129] border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#2563eb]" />
              Painel Diário de Vagas & Slots de Recebimento
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">Controle de lotação: Cada slot permite no máximo 2 agendamentos simultâneos.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <label htmlFor="custom-date-filter" className="text-xs text-slate-400 whitespace-nowrap">Outra Data:</label>
            <input
              id="custom-date-filter"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-[#0f1419] border border-slate-705 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#2563eb]"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate("")}
                className="text-[10px] hover:text-[#2563eb] text-slate-500"
              >
                Limpar Data
              </button>
            )}
          </div>
        </div>

        {/* Quick Date Clicker bar */}
        <div className="grid grid-cols-7 gap-2 border-b border-slate-850 pb-4">
          {quickDaysList.map((day) => {
            const isSel = selectedDate === day.dateStr;
            return (
              <button
                key={day.dateStr}
                onClick={() => setSelectedDate(day.dateStr)}
                className={`py-1.5 px-1 md:py-2.5 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                  isSel
                    ? "bg-[#2563eb] text-white shadow-md shadow-[#2563eb]/20 font-bold"
                    : "bg-[#0f1419] hover:bg-[#1a2129] text-slate-300 border border-slate-850 hover:border-slate-700"
                }`}
              >
                <span className={`text-[9px] md:text-10px uppercase tracking-wider ${isSel ? "text-white" : "text-slate-500"}`}>
                  {day.weekday}
                </span>
                <span className="text-xs md:text-sm font-mono mt-0.5">{day.label}</span>
                
                {day.count > 0 && (
                  <span className={`absolute -top-1.5 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full text-[9px] font-bold px-1 ${
                    isSel ? "bg-[#1a2129] text-[#2563eb]" : "bg-[#2563eb] text-white"
                  }`}>
                    {day.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Time-slots visual capacity bars for the currently selected day */}
        {selectedDate && (
          <div className="mt-4 space-y-4">
            {/* Daily Cumulative Summary Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#0f1419]/50 border border-slate-800 p-3.5 rounded-lg text-xs text-slate-300">
              <div className="text-center md:text-left">
                <span className="text-slate-500 text-[10px] uppercase font-mono block">Cargas Ativas</span>
                <span className="font-bold font-mono text-white text-sm">{selectedDateMetrics.count} veículos</span>
              </div>
              <div className="text-center md:text-left">
                <span className="text-slate-500 text-[10px] uppercase font-mono block">Volume Caixas</span>
                <span className="font-bold font-mono text-white text-sm">{selectedDateMetrics.volume.toLocaleString("pt-BR")} caixas</span>
              </div>
              <div className="text-center md:text-left border-t md:border-t-0 md:border-l border-slate-800 md:pl-4 pt-2 md:pt-0">
                <span className="text-slate-500 text-[10px] uppercase font-mono block">Total de Paletes</span>
                <span className="font-bold font-mono text-[#2563eb] text-sm">{selectedDateMetrics.pallets} Paletes</span>
              </div>
              <div className="text-center md:text-left border-t md:border-t-0 md:border-l border-slate-800 md:pl-4 pt-2 md:pt-0">
                <span className="text-slate-500 text-[10px] uppercase font-mono block">Tonelagem Total</span>
                <span className="font-bold font-mono text-white text-sm">{(selectedDateMetrics.weight / 1000).toFixed(2)} ton. kg</span>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                Taxa de Ocupação das Docas para: {formatFriendlyDate(selectedDate)}
              </span>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                {/* WhatsApp Export */}
                <button
                  id="btn-whatsapp-export"
                  onClick={handleExportWhatsApp}
                  className="bg-[#25d366]/10 hover:bg-[#25d366]/20 text-[#25d366] text-xs font-semibold py-1.5 px-3 border border-[#25d366]/30 rounded transition flex items-center gap-1 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  WhatsApp do Dia
                </button>

                {/* Excel Hover Dropdown */}
                <div className="relative group/export inline-block">
                  <button
                    id="btn-excel-export-menu"
                    className="bg-[#107c41]/10 hover:bg-[#107c41]/20 text-[#107c41] text-xs font-semibold py-1.5 px-3 border border-[#107c41]/35 rounded transition flex items-center gap-1 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Exportar para Excel ▾
                  </button>
                  <div className="absolute right-0 mt-1 w-56 bg-[#1a2129] border border-slate-700 rounded shadow-xl z-20 hidden group-hover/export:block hover:block">
                    <div className="py-1">
                      <button
                        onClick={() => handleExportExcel("dia")}
                        className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-2 cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                        Agenda do Dia Selecionado
                      </button>
                      <button
                        onClick={() => handleExportExcel("semana")}
                        className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-2 cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        Agenda da Semana (Seg-Sáb)
                      </button>
                      <button
                        onClick={() => handleExportExcel("mes")}
                        className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-2 cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-450"></span>
                        Agenda do Mês Inteiro
                      </button>
                      <div className="border-t border-slate-800 my-1"></div>
                      <button
                        onClick={() => handleExportExcel("historico")}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-blue-400 hover:bg-slate-800 hover:text-blue-300 transition flex items-center gap-2 cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                        Todo o Histórico (Completo)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {TIME_SLOTS.map((slot) => {
                const count = appointments.filter(
                  (a) =>
                    a.date === selectedDate &&
                    a.timeSlot === slot &&
                    (a.status === AppointmentStatus.Aguardando || a.status === AppointmentStatus.Confirmado)
                ).length;

                const isLotado = count >= 2;
                let barColor = "bg-[#51cf66]"; // green for active/open and ok
                if (count === 1) barColor = "bg-[#fcc419]"; // yellow
                if (isLotado) barColor = "bg-[#ff6b6b]"; // red

                return (
                  <div
                    key={slot}
                    className={`p-2 bg-[#0f1419] rounded border border-slate-850 flex flex-col justify-between min-h-[56px] transition-all ${
                      count > 0 ? "border-slate-800" : "opacity-70"
                    }`}
                  >
                    <span className="text-[10px] text-slate-400 font-mono font-medium block">{slot}</span>
                    <div className="mt-1 flex items-center gap-1">
                      <div className="flex-1 bg-slate-850 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`${barColor} h-full transition-all`}
                          style={{ width: `${(count / 2) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400">{count}/2</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Operational Section: Search Filters, Operations List & Detail actions */}
      <div className="bg-[#1a2129] border border-slate-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-[#2563eb]" />
          Lista de Agendamentos Filtrados ({filteredAppointments.length})
        </h3>

        {/* Search header & Filter tool */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-850">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              id="search-provider-input"
              type="text"
              placeholder="Buscar por Fornecedor, Motorista, Placa do Veículo ou Protocolo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0f1419] border border-slate-700/60 focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] rounded-md py-1.5 pl-9 pr-4 text-xs text-white focus:outline-none placeholder-slate-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label htmlFor="status-filter-select" className="text-xs text-slate-400 mr-2">Status:</label>
              <select
                id="status-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#0f1419] border border-slate-700/60 rounded px-2.5 py-1 text-xs text-white focus:outline-none"
              >
                <option value="ALL">Todos os status</option>
                <option value={AppointmentStatus.Aguardando}>🟡 AGUARDANDO CONFIRMAÇÃO</option>
                <option value={AppointmentStatus.Confirmado}>🟢 CONFIRMADO</option>
                <option value={AppointmentStatus.EmRecebimento}>🔵 EM RECEBIMENTO</option>
                <option value={AppointmentStatus.Concluido}>✅ CONCLUÍDO</option>
                <option value={AppointmentStatus.Cancelado}>❌ CANCELADO</option>
              </select>
            </div>
          </div>
        </div>

        {/* List layout of booking appointments */}
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs border border-dashed border-slate-850 rounded-lg">
            Nenhum agendamento encontrado para os filtros selecionados.
          </div>
        ) : (
          <div id="booking-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAppointments.map((app) => {
              // Status Badge color rules
              let statusTextClass = "text-amber-400 bg-amber-500/10 border-amber-500/20";
              let statusText = "🟡 Aguardando Confirmação";
              
              if (app.status === AppointmentStatus.Confirmado) {
                statusTextClass = "text-[#51cf66] bg-[#51cf66]/10 border-[#51cf66]/20";
                statusText = "🟢 Confirmado";
              } else if (app.status === AppointmentStatus.EmRecebimento) {
                statusTextClass = "text-[#4dabf7] bg-[#4dabf7]/10 border-[#4dabf7]/20";
                statusText = "🔵 Em Recebimento";
              } else if (app.status === AppointmentStatus.Concluido) {
                statusTextClass = "text-slate-300 bg-slate-700/20 border-slate-700/30";
                statusText = "✅ Concluído";
              } else if (app.status === AppointmentStatus.Cancelado) {
                statusTextClass = "text-[#ff6b6b] bg-[#ff6b6b]/10 border-[#ff6b6b]/20";
                statusText = "❌ Cancelado";
              }

              return (
                <div
                  key={app.id}
                  className="bg-[#0f1419] border border-slate-850 hover:border-[#2563eb]/60 rounded-lg p-4 transition duration-150 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono block">PROTOCOLO</span>
                        <span className="text-sm font-mono font-bold text-white leading-tight tracking-wide">{app.id}</span>
                      </div>
                      <div className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusTextClass}`}>
                        {statusText}
                      </div>
                    </div>

                    <h4 className="text-sm font-semibold text-white line-clamp-1 mb-1.5">{app.supplierName}</h4>

                    <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-xs text-slate-400 mb-3 border-t border-slate-850 pt-2 pb-1">
                      <div>
                        <span className="text-slate-500 text-[10px] block font-medium">AGENDA</span>
                        <span className="font-semibold text-slate-300">
                          {formatDayMonth(app.date)} — {app.timeSlot}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block font-medium">VEÍCULO</span>
                        <span className="font-semibold text-slate-300">
                          {app.vehicleType} (<span className="font-mono text-[11px]">{app.plate}</span>)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block font-medium">PRODUTOR / NF</span>
                        <p className="truncate text-slate-350">
                          {app.productType} {app.invoiceNumber ? `(NF: ${app.invoiceNumber})` : ""}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block font-medium">VOL / PALETES / PESO</span>
                        <span className="font-semibold text-slate-300">
                          {app.volume} vol | {app.pallets || 0} pal | {app.weight.toLocaleString("pt-BR")} kg
                        </span>
                      </div>
                    </div>

                    {app.notes && (
                      <div className="bg-slate-850/50 rounded p-1.5 text-[11px] text-slate-400 italic line-clamp-1 mb-2 shrink-0">
                        Obs: {app.notes}
                      </div>
                    )}
                    <div className="text-[10.5px] text-slate-450 mb-3 block truncate shrink-0">
                      Cadastrado por: <strong className="text-blue-400 font-medium">{app.createdBy || "Sistema"}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-850/80 pt-2 mt-auto">
                    <span className="text-[10px] text-zinc-500">Mot: {app.driverName}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedApp(app)}
                      className="text-xs text-[#2563eb] hover:text-[#1d4ed8] font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                      {isAdmin ? "Gerenciar Status" : "Ver Detalhes"} <ChevronRight className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Overlay Pop up Edit Modal for managing booking parameters */}
      {selectedApp && (
        <div className="fixed inset-0 bg-[#000000]/80 flex items-center justify-center p-4 z-50 animate-fade-in block">
          <div className="bg-[#1a2129] border border-slate-700/80 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="bg-[#0f1419] p-4 border-b border-slate-850 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 font-mono tracking-wider block">
                  {isAdmin ? "ALTERAR STATUS DE CARGA" : "DETALHES DO AGENDAMENTO"}
                </span>
                <span className="text-sm font-mono font-bold text-[#2563eb]">{selectedApp.id}</span>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="text-slate-400 hover:text-white font-bold text-sm bg-slate-800 p-1.5 rounded-full cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-sm">
                <span className="text-slate-500 text-xs block">Fornecedor / Emitente</span>
                <p className="font-bold text-white text-base">{selectedApp.supplierName}</p>
                <div className="flex items-center justify-between text-xs text-slate-400 mt-1 flex-wrap gap-2">
                  <span>CNPJ: {selectedApp.cnpj}</span>
                  <span>Agendado por: <strong className="text-[#2563eb] font-semibold">{selectedApp.createdBy || "Sistema"}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs bg-[#0f1419] p-3.5 rounded border border-slate-850">
                <div>
                  <span className="text-slate-500 block font-medium">Grade Solicitada</span>
                  <p className="font-semibold text-slate-200 mt-0.5">{formatFriendlyDate(selectedApp.date)}</p>
                  <p className="font-mono text-[#2563eb] font-semibold">{selectedApp.timeSlot}</p>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Logística Veicular</span>
                  <p className="font-semibold text-slate-200 mt-0.5">{selectedApp.vehicleType} — <span className="font-mono text-[11px]">{selectedApp.plate}</span></p>
                  <p className="text-slate-300 mt-0.5">Motorista: {selectedApp.driverName}</p>
                </div>
              </div>

              <div className="p-3 bg-[#0f1419] text-xs rounded border border-slate-850">
                <span className="text-slate-500 block font-medium mb-1 uppercase font-mono text-[10px]">Especificação da Carga</span>
                <div className="flex items-center justify-between text-slate-300 font-mono gap-2 flex-wrap mb-2">
                  <span>Família: <strong className="text-white">{selectedApp.productType}</strong></span>
                  <span>Vol: <strong className="text-white">{selectedApp.volume} cx</strong></span>
                  <span>Paletes: <strong className="text-[#2563eb]">{selectedApp.pallets || 0}</strong></span>
                  <span>Peso: <strong className="text-white">{selectedApp.weight.toLocaleString("pt-BR")} kg</strong></span>
                </div>
                {selectedApp.cargoValue !== undefined && (
                  <div className="border-t border-slate-800/85 pt-2 mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 uppercase font-mono">Valor Estimado da Carga:</span>
                    <strong className="text-[#51cf66] font-semibold">{selectedApp.cargoValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                  </div>
                )}
              </div>

              {((selectedApp.invoiceNumbers && selectedApp.invoiceNumbers.length > 0) || selectedApp.invoiceNumber || selectedApp.notes) && (
                <div className="p-3 bg-[#0f1419] text-xs rounded border border-slate-850 space-y-2">
                  {((selectedApp.invoiceNumbers && selectedApp.invoiceNumbers.length > 0) || selectedApp.invoiceNumber) && (
                    <div>
                      <span className="text-slate-500 block font-medium uppercase font-mono text-[10px] mb-1">Notas Fiscais (NF)</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {selectedApp.invoiceNumbers && selectedApp.invoiceNumbers.length > 0 ? (
                          selectedApp.invoiceNumbers.map(n => (
                            <span key={n} className="bg-slate-800 text-slate-300 text-[10px] font-mono font-semibold px-2 py-0.5 rounded border border-slate-700/80">
                              {n}
                            </span>
                          ))
                        ) : (
                          <span className="bg-slate-800 text-slate-300 text-[10px] font-mono font-semibold px-2 py-0.5 rounded border border-slate-700/80">
                            {selectedApp.invoiceNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedApp.notes && (
                    <div className="border-t border-slate-800/85 pt-2 mt-2">
                      <span className="text-slate-500 block font-medium uppercase font-mono text-[10px] mb-1">Observações Especiais</span>
                      <p className="italic text-slate-300 leading-relaxed bg-[#1a2129]/30 p-2 rounded border border-slate-800">{selectedApp.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {isAdmin ? (
                <>
                  <div className="p-3 bg-amber-500/10 border-l-3 border-amber-500 text-[11px] text-amber-300 leading-relaxed rounded-r">
                    <p className="font-semibold mb-0.5">Controle de Lotação Doca Boracéia:</p>
                    Lembre-se que cada slot de 1 hora suporta no máximo 2 veículos. Salvar uma carga como AGUARDANDO ou CONFIRMADO ocupa a vaga no slot selecionado.
                  </div>

                  {/* Status change selector dropdown */}
                  <div>
                    <label htmlFor="modal-status-select" className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">
                      Novo Status Operacional:
                    </label>
                    <div className="grid grid-cols-1 gap-2.5">
                      {[
                        { status: AppointmentStatus.Aguardando, label: "🟡 AGUARDANDO CONFIRMAÇÃO (Vaga retida)", color: "text-amber-400 hover:bg-amber-500/10" },
                        { status: AppointmentStatus.Confirmado, label: "🟢 CONFIRMADO (Apto para descarregar)", color: "text-[#51cf66] hover:bg-[#51cf66]/10" },
                        { status: AppointmentStatus.EmRecebimento, label: "🔵 EM RECEBIMENTO (Na Doca de Descarga)", color: "text-[#4dabf7] hover:bg-[#4dabf7]/10" },
                        { status: AppointmentStatus.Concluido, label: "✅ CONCLUÍDO (Notas fiscais emitidas)", color: "text-slate-300 hover:bg-slate-700/20" },
                        { status: AppointmentStatus.Cancelado, label: "❌ CANCELADO (Libera doca imediatamente)", color: "text-[#ff6b6b] hover:bg-[#ff6b6b]/10" },
                      ].map((elem) => {
                        const isCurrent = selectedApp.status === elem.status;
                        return (
                          <button
                            key={elem.status}
                            onClick={() => {
                              onUpdateStatus(selectedApp.id, elem.status);
                              setSelectedApp(null);
                            }}
                            className={`w-full text-left py-2 px-3 border rounded text-xs transition flex items-center justify-between cursor-pointer ${elem.color} ${
                              isCurrent
                                ? "border-[#2563eb] bg-[#2563eb]/15 font-bold"
                                : "border-slate-800 bg-[#0f1419]"
                            }`}
                          >
                            <span>{elem.label}</span>
                            {isCurrent && <span className="bg-[#2563eb] text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">ATIVO</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-4 bg-slate-850/50 rounded border border-slate-700/40">
                  <span className="block text-xs text-slate-450 font-semibold uppercase tracking-wider mb-2">
                    Status Operacional do Agendamento:
                  </span>
                  <div className="py-3 px-4 bg-[#0f1419] rounded-lg border border-slate-800 text-xs flex items-center justify-between">
                    <span className="font-semibold text-slate-200 flex items-center gap-2">
                      {selectedApp.status === AppointmentStatus.Aguardando && (
                        <>
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                          🟡 AGUARDANDO CONFIRMAÇÃO
                        </>
                      )}
                      {selectedApp.status === AppointmentStatus.Confirmado && (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          🟢 CONFIRMADO (Carga Liberada)
                        </>
                      )}
                      {selectedApp.status === AppointmentStatus.EmRecebimento && (
                        <>
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                          🔵 EM RECEBIMENTO (Na Doca)
                        </>
                      )}
                      {selectedApp.status === AppointmentStatus.Concluido && (
                        <>
                          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                          ✅ CONCLUÍDO (Recebimento Finalizado)
                        </>
                      )}
                      {selectedApp.status === AppointmentStatus.Cancelado && (
                        <>
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          ❌ CANCELADO
                        </>
                      )}
                    </span>
                    <span className="text-[10px] bg-slate-800/80 text-slate-400 px-2 py-0.5 rounded font-bold font-mono">SOMENTE LEITURA</span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-[#0f1419] py-3.5 px-6 border-t border-slate-850 flex justify-between items-center">
              {isAdmin && onDeleteAppointment ? (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Deseja realmente EXCLUIR permanentemente o agendamento ${selectedApp.id}?`)) {
                      onDeleteAppointment(selectedApp.id);
                      setSelectedApp(null);
                    }
                  }}
                  className="bg-red-950/20 hover:bg-red-900/30 border border-red-900/45 hover:border-red-750 text-red-400 hover:text-red-300 px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir Agendamento
                </button>
              ) : (
                <div className="text-[11px] text-slate-500 italic">
                  Apenas administradores podem gerenciar agendamentos.
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="bg-slate-800 hover:bg-slate-700 hover:text-white px-4 py-1.5 rounded text-xs font-semibold text-slate-300 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
