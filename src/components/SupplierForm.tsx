/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Appointment, AppointmentStatus, VehicleType, ProductType } from "../types";
import { isDateBlocked, TIME_SLOTS, formatFriendlyDate } from "../utils/dateUtils";
import { Calendar, Building2, User, Truck, FileText, Package, Check, Clipboard, Printer, AlertTriangle } from "lucide-react";
import { copyToClipboard } from "../utils/clipboard";

interface SupplierFormProps {
  appointments: Appointment[];
  onAddAppointment: (newApp: Appointment) => void;
}

export function SupplierForm({ appointments, onAddAppointment }: SupplierFormProps) {
  // Form State
  const [supplierName, setSupplierName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [driverName, setDriverName] = useState("");
  const [plate, setPlate] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>(VehicleType.Truck);
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [productType, setProductType] = useState<ProductType>(ProductType.Balas);
  const [volume, setVolume] = useState("");
  const [pallets, setPallets] = useState("");
  const [weight, setWeight] = useState("");
  const [invoiceNumbers, setInvoiceNumbers] = useState<string[]>([]);
  const [invoiceInput, setInvoiceInput] = useState("");
  const [cargoValue, setCargoValue] = useState("");
  const [notes, setNotes] = useState("");
  const [createdBy, setCreatedBy] = useState("");

  const handleAddInvoice = () => {
    const parts = invoiceInput.split(/[,;\s]+/).map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) return;
    
    const added = [...invoiceNumbers];
    let duplicates = false;
    parts.forEach(part => {
      if (!added.includes(part)) {
        added.push(part);
      } else {
        duplicates = true;
      }
    });
    
    setInvoiceNumbers(added);
    setInvoiceInput("");
    if (duplicates && parts.length === 1) {
      alert("Esta Nota Fiscal já foi adicionada.");
    }
  };

  const handleRemoveInvoice = (num: string) => {
    setInvoiceNumbers(invoiceNumbers.filter((n) => n !== num));
  };

  const handleCargoValueChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (!digits) {
      setCargoValue("");
      return;
    }
    
    const numberValue = parseInt(digits, 10);
    if (isNaN(numberValue)) {
      setCargoValue("");
      return;
    }
    
    const cents = (numberValue / 100).toFixed(2);
    const parts = cents.split(".");
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const decimalPart = parts[1];
    
    setCargoValue(`${integerPart},${decimalPart}`);
  };

  // UI States
  const [dateError, setDateError] = useState("");
  const [activeSlots, setActiveSlots] = useState<{ slot: string; remaining: number }[]>([]);
  const [successAppointment, setSuccessAppointment] = useState<Appointment | null>(null);
  const [copied, setCopied] = useState(false);

  // Date constraints: Min = Today, Max = 30 days ahead
  const [minDateStr, setMinDateStr] = useState("");
  const [maxDateStr, setMaxDateStr] = useState("");

  useEffect(() => {
    const today = new Date();
    
    // Today
    const minDObj = new Date(today);
    const minY = minDObj.getFullYear();
    const minM = String(minDObj.getMonth() + 1).padStart(2, "0");
    const minD = String(minDObj.getDate()).padStart(2, "0");
    setMinDateStr(`${minY}-${minM}-${minD}`);

    // Today + 30 days
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 30);
    const maxY = maxDate.getFullYear();
    const maxM = String(maxDate.getMonth() + 1).padStart(2, "0");
    const maxD = String(maxDate.getDate()).padStart(2, "0");
    setMaxDateStr(`${maxY}-${maxM}-${maxD}`);
  }, []);

  // Format CNPJ as XX.XXX.XXX/XXXX-XX
  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 14) value = value.slice(0, 14);

    if (value.length > 12) {
      value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    } else if (value.length > 8) {
      value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})$/, "$1.$2.$3/$4");
    } else if (value.length > 5) {
      value = value.replace(/^(\d{2})(\d{3})(\d{0,3})$/, "$1.$2.$3");
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{0,3})$/, "$1.$2");
    }
    setCnpj(value);
  };

  // Format license plate to ABC1D23 or ABC-1234
  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (val.length > 8) val = val.slice(0, 8);
    setPlate(val);
  };

  // Validate date on selection and recalculate available time slots
  useEffect(() => {
    if (!date) {
      setDateError("");
      setActiveSlots([]);
      return;
    }

    const check = isDateBlocked(date);
    if (check.blocked) {
      setDateError(check.reason || "Data bloqueada");
      setActiveSlots([]);
      setTimeSlot("");
      return;
    }

    setDateError("");

    // Calculate dynamic slots remaining for the selected date
    // Capacity logic: Max 2 active appointments per slot (Aguardando or Confirmado)
    const computedSlots = TIME_SLOTS.map((slot) => {
      const activeCount = appointments.filter(
        (app) =>
          app.date === date &&
          app.timeSlot === slot &&
          (app.status === AppointmentStatus.Aguardando || app.status === AppointmentStatus.Confirmado)
      ).length;

      return {
        slot,
        remaining: Math.max(0, 2 - activeCount),
      };
    });

    setActiveSlots(computedSlots);

    // If previously selected timeSlot is now sold out on this new date, reset it
    const selectedObj = computedSlots.find((s) => s.slot === timeSlot);
    if (selectedObj && selectedObj.remaining === 0) {
      setTimeSlot("");
    }
  }, [date, appointments]);

  // Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Re-verify inputs
    if (!supplierName || !cnpj || !date || !timeSlot || !volume || !pallets || !weight || !createdBy) {
      alert("Por favor, preencha todos os campos obrigatórios, incluindo quem está cadastrando o agendamento.");
      return;
    }

    if (dateError) {
      alert(`Data selecionada é inválida: ${dateError}`);
      return;
    }

    // Verify vacancy in slot
    const slotData = activeSlots.find((s) => s.slot === timeSlot);
    if (!slotData || slotData.remaining <= 0) {
      alert("Desculpe, este horário acabou de ficar lotado. Por favor, escolha outra janela.");
      return;
    }

    // Generation of standard dynamic sequence protocol: BC-YYYY-NNNN
    // Calculated robustly by scanning the highest sequence currently present in the synchronized state
    let maxSeq = 0;
    appointments.forEach((app) => {
      const match = app.id.match(/^BC-\d{4}-(\d+)/);
      if (match) {
        const seqNum = parseInt(match[1], 10);
        if (seqNum > maxSeq) {
          maxSeq = seqNum;
        }
      }
    });
    const nextSeq = maxSeq + 1;

    // Save as local fallback just in case
    localStorage.setItem("bc_seq", nextSeq.toString());

    const chosenYear = date.substring(0, 4);
    const padded = String(nextSeq).padStart(4, "0");
    const protocolId = `BC-${chosenYear}-${padded}`;

    // Auto-parse any text in the current invoice input before submitting
    const currentList = [...invoiceNumbers];
    if (invoiceInput.trim()) {
      const parts = invoiceInput.split(/[,;\s]+/).map(p => p.trim()).filter(Boolean);
      parts.forEach(part => {
        if (!currentList.includes(part)) {
          currentList.push(part);
        }
      });
    }

    const newApp: Appointment = {
      id: protocolId,
      supplierName,
      cnpj,
      driverName: driverName.trim() || "Não informado",
      plate: plate.trim() || "Não informado",
      vehicleType,
      date,
      timeSlot,
      productType,
      volume: parseInt(volume, 10) || 0,
      pallets: parseInt(pallets, 10) || 0,
      weight: parseFloat(weight) || 0,
      invoiceNumber: currentList.join(", ") || undefined,
      invoiceNumbers: currentList,
      cargoValue: cargoValue.trim() ? parseFloat(cargoValue.replace(/\./g, "").replace(",", ".")) : undefined,
      notes: notes.trim() || undefined,
      status: AppointmentStatus.Aguardando,
      createdBy: createdBy.trim(),
      createdAt: new Date().toISOString(),
    };

    onAddAppointment(newApp);
    setSuccessAppointment(newApp);

    // Reset Form
    setSupplierName("");
    setCnpj("");
    setDriverName("");
    setPlate("");
    setVehicleType(VehicleType.Truck);
    setDate("");
    setTimeSlot("");
    setProductType(ProductType.Balas);
    setVolume("");
    setPallets("");
    setWeight("");
    setInvoiceNumbers([]);
    setInvoiceInput("");
    setCargoValue("");
    setNotes("");
    setCreatedBy("");
  };

  const handleCopyProtocol = () => {
    if (!successAppointment) return;
    const nfs = successAppointment.invoiceNumbers && successAppointment.invoiceNumbers.length > 0
      ? successAppointment.invoiceNumbers.join(", ")
      : successAppointment.invoiceNumber || "Não informado";
    const valorStr = successAppointment.cargoValue !== undefined
      ? successAppointment.cargoValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "Não informado";

    copyToClipboard(
      `AGENDAMENTO CD BORACÉIA CONCLUÍDO!\n` +
      `Protocolo: ${successAppointment.id}\n` +
      `Fornecedor: ${successAppointment.supplierName}\n` +
      `Data: ${formatFriendlyDate(successAppointment.date)}\n` +
      `Janela: ${successAppointment.timeSlot}\n` +
      `Motorista: ${successAppointment.driverName || "Não informado"}\n` +
      `Placa: ${successAppointment.plate || "Não informado"}\n` +
      `NFs: ${nfs}\n` +
      `Valor da Carga: ${valorStr}\n` +
      `Status: ${successAppointment.status}`
    ).then((success) => {
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } else {
        alert("Não foi possível copiar automaticamente. Por favor, tente copiar manualmente.");
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="supplier-scheduling-view" className="w-full max-w-4xl mx-auto py-4 px-1">
      {successAppointment ? (
        /* Recibo de Confirmação */
        <div id="booking-receipt-box" className="bg-[#1a2129] border-2 border-[#2563eb] rounded-xl p-8 shadow-2xl relative overflow-hidden animate-fade-in print:bg-white print:text-black print:border-none print:shadow-none">
          {/* Decorative stamp background */}
          <div className="absolute right-[-30px] bottom-[-20px] text-slate-800/10 font-bold text-9xl pointer-events-none select-none print:hidden">
            CD BC
          </div>

          <div className="flex items-center gap-3 text-[#2563eb] mb-6 print:text-[#1d4ed8]">
            <div className="p-3 bg-[#2563eb]/10 rounded-full print:bg-slate-100">
              <Check className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-sans tracking-tight">Agendamento Realizado!</h2>
              <p className="text-slate-400 text-sm print:text-slate-600">Envie o protocolo abaixo ao motorista para a conferência fiscal na portaria.</p>
            </div>
          </div>

          <div className="p-6 bg-[#0f1419] rounded-lg border border-slate-700/60 mb-6 print:border-slate-300 print:bg-slate-50">
            <span className="text-xs text-slate-500 font-mono tracking-wider block mb-1">CÓDIGO DE PROTOCOLO</span>
            <span className="text-3xl font-mono font-bold text-[#2563eb] tracking-widest block">{successAppointment.id}</span>
            <div className="mt-2 text-xs text-slate-400 font-mono flex flex-col gap-1 print:text-black">
              <div>
                <span>Local de Entrega:</span> <strong className="text-slate-250 font-semibold">CD Marsil Boracéia</strong>
              </div>
              <div>
                <span>Endereço:</span> <strong className="text-slate-250 font-semibold">R. Terciliano Sgavioli, 671-721, Boracéia - SP, 17270-000</strong>
              </div>
            </div>
            <div className="mt-3 text-xs text-[#fcc419] bg-[#fcc419]/10 py-1 px-2.5 rounded inline-flex items-center gap-1.5 print:border print:border-[#fcc419]">
              <span className="w-2 h-2 rounded-full bg-[#fcc419] animate-pulse"></span>
              {successAppointment.status}
            </div>
          </div>

          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 print:text-black border-b border-slate-700 pb-1.5 print:border-slate-300">
            Dados do Agendamento
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 mb-8 text-sm text-slate-300 print:text-black">
            <div>
              <p className="text-slate-400 text-xs print:text-slate-500">Fornecedor / Razão Social</p>
              <p className="font-semibold">{successAppointment.supplierName}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs print:text-slate-500">CNPJ</p>
              <p className="font-mono">{successAppointment.cnpj}</p>
            </div>

            <div>
              <p className="text-slate-400 text-xs print:text-slate-500">Data Agendada</p>
              <p className="font-semibold text-white print:text-black">{formatFriendlyDate(successAppointment.date)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs print:text-slate-500">Janela de Horário</p>
              <p className="font-semibold text-white print:text-black">{successAppointment.timeSlot}</p>
            </div>

            <div>
              <p className="text-slate-400 text-xs print:text-slate-500">Motorista</p>
              <p className="font-semibold">{successAppointment.driverName}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs print:text-slate-500">Veículo / Placa</p>
              <p className="font-semibold">{successAppointment.vehicleType} — <span className="font-mono">{successAppointment.plate}</span></p>
            </div>

            <div>
              <p className="text-slate-400 text-xs print:text-slate-500">Tipo de Produto</p>
              <p className="font-semibold">{successAppointment.productType}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs print:text-slate-500">Volumes / Paletes / Peso</p>
              <p className="font-semibold">{successAppointment.volume} caixas / {successAppointment.pallets} paletes / {successAppointment.weight.toLocaleString("pt-BR")} kg</p>
            </div>

            <div>
              <p className="text-slate-400 text-xs print:text-slate-500">Responsável pelo Cadastro</p>
              <p className="font-semibold text-[#2563eb] print:text-black">{successAppointment.createdBy}</p>
            </div>

            {successAppointment.invoiceNumbers && successAppointment.invoiceNumbers.length > 0 ? (
              <div>
                <p className="text-slate-400 text-xs print:text-slate-500">Notas Fiscais (NFs)</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {successAppointment.invoiceNumbers.map(n => (
                    <span key={n} className="bg-slate-800 text-xs font-mono font-semibold px-2 py-0.5 rounded border border-slate-700/80 text-slate-300 print:bg-slate-100 print:text-black">
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            ) : successAppointment.invoiceNumber ? (
              <div>
                <p className="text-slate-400 text-xs print:text-slate-500">Nota Fiscal (NF)</p>
                <p className="font-mono font-semibold">{successAppointment.invoiceNumber}</p>
              </div>
            ) : null}

            {successAppointment.cargoValue !== undefined && (
              <div>
                <p className="text-slate-400 text-xs print:text-slate-500">Valor da Carga</p>
                <p className="font-semibold text-emerald-400 print:text-black">
                  {successAppointment.cargoValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
            )}
            {successAppointment.notes && (
              <div className="md:col-span-2">
                <p className="text-slate-400 text-xs print:text-slate-500">Instruções / Observações</p>
                <p className="italic text-slate-300 print:text-slate-700 bg-slate-800/30 p-2.5 rounded mt-1 border border-slate-700/40 print:border-none print:bg-slate-100">{successAppointment.notes}</p>
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-800/40 border-l-4 border-[#2563eb] text-xs text-slate-400 rounded-r mb-8 leading-relaxed print:bg-slate-50 print:text-black print:border-l-4 print:border-[#2563eb]">
            <span className="font-bold text-slate-300 block mb-1 print:text-black">IMPLANTAÇÃO & ENDEREÇO DE DESCARGA CD MARSIL BORACÉIA:</span>
            <span className="text-slate-200 font-semibold print:text-black">R. Terciliano Sgavioli, 671-721, Boracéia - SP, CEP: 17270-000</span>
            <br />
            O veículo deve apresentar-se no endereço acima com 20 minutos de antecedência. É obrigatório o uso de calçado fechado e colete refletivo por parte do motorista.
          </div>

          <div className="flex flex-col sm:flex-row gap-3 print:hidden">
            <button
              id="btn-copy-receipt"
              type="button"
              onClick={handleCopyProtocol}
              className="flex-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold py-3 px-5 rounded-lg flex items-center justify-center gap-2 transition duration-150 shadow-md active:scale-[0.98] cursor-pointer"
            >
              <Clipboard className="w-5 h-5" />
              {copied ? "Copiado!" : "Copiar Dados de Protocolo"}
            </button>
            <button
              id="btn-print-receipt"
              type="button"
              onClick={handlePrint}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 font-semibold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-5 h-5" />
              Imprimir Recibo
            </button>
            <button
              id="btn-new-schedule"
              type="button"
              onClick={() => setSuccessAppointment(null)}
              className="px-5 py-3 hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 text-sm font-medium rounded-lg flex items-center justify-center transition cursor-pointer"
            >
              Fazer outro Agendamento
            </button>
          </div>
        </div>
      ) : (
        /* Formulário de Agendamento */
        <div className="bg-[#1a2129] border border-slate-800 rounded-xl p-6 md:p-8 shadow-xl animate-fade-in">
          <div className="flex flex-col gap-1 mb-6 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-sm text-[#2563eb] font-mono tracking-wider font-semibold">
              <Package className="w-5 h-5 text-[#2563eb]" />
              SOLICITAÇÃO DE JANELA DE DESCARGA — MARSIL ATACADISTA CD BORACÉIA
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">
              <strong>Unidade Boracéia:</strong> R. Terciliano Sgavioli, 671-721, Boracéia - SP, CEP: 17270-000
            </div>
          </div>

          <form id="schedule-cargo-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Secao 1: Identificacao do Fornecedor */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-[#2563eb] rounded-full"></span>
                1. Dados Corporativos do Fornecedor
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="supplier-name-input" className="block text-xs text-slate-400 font-medium mb-1.5">
                    Fornecedor / Razão Social <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
                    <input
                      id="supplier-name-input"
                      type="text"
                      required
                      placeholder="Ex: Marsil Distribuidora Alimentos S.A."
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      className="w-full bg-[#0f1419] border border-slate-700/60 focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="supplier-cnpj-input" className="block text-xs text-slate-400 font-medium mb-1.5">
                    CNPJ do Fornecedor <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
                    <input
                      id="supplier-cnpj-input"
                      type="text"
                      required
                      placeholder="00.000.000/0000-00"
                      value={cnpj}
                      onChange={handleCnpjChange}
                      className="w-full bg-[#0f1419] border border-slate-700/60 focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] rounded-lg py-2 pl-10 pr-4 text-sm font-mono text-white placeholder-slate-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="created-by-input" className="block text-xs text-slate-400 font-medium mb-1.5">
                    Responsável pelo Cadastro <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
                    <input
                      id="created-by-input"
                      type="text"
                      required
                      placeholder="Ex: Amanda Silva (Logística)"
                      value={createdBy}
                      onChange={(e) => setCreatedBy(e.target.value)}
                      className="w-full bg-[#0f1419] border border-slate-700/60 focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Secao 2: Dados do Transporte */}
            <div className="pt-2">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-[#2563eb] rounded-full"></span>
                2. Informações de Transporte
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="driver-name-input" className="block text-xs text-slate-400 font-medium mb-1.5">
                    Nome Completo do Motorista <span className="text-slate-500">(Opcional)</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
                    <input
                      id="driver-name-input"
                      type="text"
                      placeholder="Nome do motorista para a portaria"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="w-full bg-[#0f1419] border border-slate-700/60 focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="vehicle-plate-input" className="block text-xs text-slate-400 font-medium mb-1.5">
                    Placa do Veículo <span className="text-slate-500">(Opcional)</span>
                  </label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
                    <input
                      id="vehicle-plate-input"
                      type="text"
                      placeholder="Ex: ABC1D23"
                      value={plate}
                      onChange={handlePlateChange}
                      className="w-full bg-[#0f1419] border border-slate-700/60 focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] rounded-lg py-2 pl-10 pr-4 text-sm font-mono text-white placeholder-slate-500 focus:outline-none transition-colors text-center"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="vehicle-type-select" className="block text-xs text-slate-400 font-medium mb-1.5">
                    Tipo de Veículo <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="vehicle-type-select"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                    className="w-full bg-[#0f1419] border border-slate-700/60 focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] rounded-lg py-2 px-3 text-sm text-white focus:outline-none transition-colors"
                  >
                    <option value={VehicleType.Truck}>Truck (Até 14T)</option>
                    <option value={VehicleType.VUC}>VUC (Urbano)</option>
                    <option value={VehicleType.Carreta}>Carreta (Até 30T)</option>
                    <option value={VehicleType.Van}>Van / Fiorino</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Secao 3: Data e Janela Disponivel */}
            <div className="pt-2">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-[#2563eb] rounded-full"></span>
                3. Data e Horário (Grade de Recibo)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="delivery-date-input" className="block text-xs text-slate-400 font-medium mb-1.5">
                    Data da Entrega (Seg a Sáb, Exceto Feriados) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
                    <input
                      id="delivery-date-input"
                      type="date"
                      required
                      min={minDateStr}
                      max={maxDateStr}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-[#0f1419] border border-slate-700/60 focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none transition-colors"
                    />
                  </div>
                  {dateError ? (
                    <div className="mt-2 text-xs text-[#ff6b6b] flex items-center gap-1.5 bg-[#ff6b6b]/10 py-1.5 px-3 rounded">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{dateError}</span>
                    </div>
                  ) : date ? (
                    <p className="mt-1.5 text-xs text-[#51cf66] font-medium">
                      ✓ {formatFriendlyDate(date)}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500">Agendamentos permitidos a partir de amanhã, até 30 dias à frente.</p>
                  )}
                </div>

                <div>
                  <label htmlFor="time-slot-select" className="block text-xs text-slate-400 font-medium mb-1.5">
                    Janela de Horário Disponível <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="time-slot-select"
                    required
                    disabled={!date || !!dateError}
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full bg-[#0f1419] border border-slate-700/60 focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] rounded-lg py-2 px-3 text-sm text-white focus:outline-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!date ? "Selecione uma data primeiro" : dateError ? "Data inválida ou bloqueada" : "Selecione a janela..."}
                    </option>
                    {activeSlots.map(({ slot, remaining }) => {
                      const label = remaining === 0 
                        ? `${slot} (ESGOTADO — Sem Docas)` 
                        : `${slot} (${remaining} vaga${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""})`;
                      return (
                        <option key={slot} value={slot} disabled={remaining === 0}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                  {date && !dateError && (
                    <div className="mt-2 p-2 bg-slate-800/20 text-xs text-slate-400 rounded flex items-center gap-1.5 leading-tight">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      Cada janela horária possui limite estrito de 2 recebimentos simultâneos.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Secao 4: Detalhes da Carga */}
            <div className="pt-2">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-[#2563eb] rounded-full"></span>
                4. Especificações da Carga Alimentícia
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label htmlFor="product-type-select" className="block text-xs text-slate-400 font-medium mb-1.5">
                    Família do Produto <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="product-type-select"
                    value={productType}
                    onChange={(e) => setProductType(e.target.value as ProductType)}
                    className="w-full bg-[#0f1419] border border-slate-700/60 focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] rounded-lg py-2 px-3 text-sm text-white focus:outline-none transition-colors"
                  >
                    <option value={ProductType.Balas}>Balas e Doces</option>
                    <option value={ProductType.Chocolates}>Chocolates e Coberturas</option>
                    <option value={ProductType.Biscoitos}>Biscoitos e Bolachas</option>
                    <option value={ProductType.Salgadinhos}>Salgadinhos de Pacote</option>
                    <option value={ProductType.Bebidas}>Bebidas / Líquidos</option>
                    <option value={ProductType.Outros}>Outros Confeitos</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="volume-input" className="block text-xs text-slate-400 font-medium mb-1.5">
                    Qtd. Caixas / Volumes <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="volume-input"
                    type="number"
                    min="1"
                    required
                    placeholder="Ex: 150"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    className="w-full bg-[#0f1419] border border-slate-700/60 focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] rounded-lg py-2 px-4 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="pallets-input" className="block text-xs text-slate-400 font-medium mb-1.5">
                    Qtd. Paletes <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="pallets-input"
                    type="number"
                    min="0"
                    required
                    placeholder="Ex: 6"
                    value={pallets}
                    onChange={(e) => setPallets(e.target.value)}
                    className="w-full bg-[#0f1419] border border-slate-700/60 focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] rounded-lg py-2 px-4 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="weight-input" className="block text-xs text-slate-400 font-medium mb-1.5">
                    Peso Estimado (kg) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="weight-input"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    placeholder="Ex: 2400"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full bg-[#0f1419] border border-slate-700/60 focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] rounded-lg py-2 px-4 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="cargo-value-input" className="block text-xs text-slate-400 font-medium mb-1.5">
                    Valor da Carga <span className="text-slate-500">(Opcional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono font-bold">R$</span>
                    <input
                      id="cargo-value-input"
                      type="text"
                      placeholder="Ex: 15.450,80"
                      value={cargoValue}
                      onChange={(e) => handleCargoValueChange(e.target.value)}
                      className="w-full bg-[#0f1419] border border-slate-700/60 focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Multiple Notes Fiscais (NFs) Input Section */}
              <div className="mt-4">
                <label className="block text-xs text-slate-400 font-medium mb-1.5">
                  Notas Fiscais (NF) <span className="text-slate-500">(Adicione uma ou mais)</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <FileText className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
                    <input
                      id="invoice-number-input"
                      type="text"
                      placeholder="Digite o número da NF e clique em Adicionar (separe por vírgula ou espaço para mais de uma)"
                      value={invoiceInput}
                      onChange={(e) => setInvoiceInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddInvoice();
                        }
                      }}
                      className="w-full bg-[#0f1419] border border-slate-700/60 focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddInvoice}
                    className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    Adicionar NF
                  </button>
                </div>
                
                {invoiceNumbers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 p-3 bg-[#0f1419] border border-slate-800 rounded-lg">
                    {invoiceNumbers.map((num) => (
                      <span
                        key={num}
                        className="bg-[#2563eb]/15 border border-[#2563eb]/35 text-[#2563eb] rounded-full px-3 py-1 text-xs font-mono font-medium flex items-center gap-1.5"
                      >
                        {num}
                        <button
                          type="button"
                          onClick={() => handleRemoveInvoice(num)}
                          className="hover:bg-[#2563eb]/30 rounded-full w-4 h-4 flex items-center justify-center text-[10px] text-red-400 font-bold hover:text-red-300 transition-colors"
                          title="Remover NF"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Secao 5: Observacoes */}
            <div>
              <label htmlFor="notes-textarea" className="block text-xs text-slate-400 font-medium mb-1.5">
                Observações Especiais <span className="text-slate-500">(Opcional)</span>
              </label>
              <textarea
                id="notes-textarea"
                rows={2}
                placeholder="Ex e recomendações: Paletes empilhados, restrições de descarga por motorista, refrigeração necessária, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#0f1419] border border-slate-700/60 focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] rounded-lg py-2.5 px-4 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between flex-wrap gap-4">
              <span className="text-slate-400 text-xs">
                Campos marcados com <span className="text-red-500">*</span> são de preenchimento obrigatório.
              </span>
              <button
                id="btn-submit-booking"
                type="submit"
                disabled={!!dateError || !timeSlot}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold py-3 px-8 rounded-lg flex items-center justify-center gap-2 transition duration-200 shadow-lg active:scale-[0.99] disabled:scale-100 disabled:cursor-not-allowed cursor-pointer"
              >
                Solicitar Reservar de Janela
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
