/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Appointment, AppointmentStatus } from "./types";
import { SupplierForm } from "./components/SupplierForm";
import { ManagerDashboard } from "./components/ManagerDashboard";
import { db, handleFirestoreError, OperationType } from "./lib/firebase";
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { Truck, Users, LayoutDashboard, Calendar, HelpCircle, Shield, FileText, LogOut } from "lucide-react";
import { Login, LoggedInUser } from "./components/Login";

export default function App() {
  // Tabs: "supplier" (Agendar Carga) or "manager" (Painel do Gestor)
  const [activeTab, setActiveTab] = useState<"supplier" | "manager">("manager");
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Simple Auth state
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(() => {
    const saved = localStorage.getItem("bc_session");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as LoggedInUser;
        return parsed;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const handleLoginSuccess = (user: LoggedInUser) => {
    setCurrentUser(user);
    localStorage.setItem("bc_session", JSON.stringify(user));
    setActiveTab("manager");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("bc_session");
  };

  // Load appointments from firestore in realtime
  useEffect(() => {
    let unsubscribe: () => void = () => {};
    try {
      unsubscribe = onSnapshot(
        collection(db, "appointments"),
        (snapshot) => {
          const list: Appointment[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as Appointment;
            list.push(data);
          });
          
          // Sort list by date and then timeslot
          list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          
          setAppointments(list);
          localStorage.setItem("bc_appointments", JSON.stringify(list));
        },
        (error) => {
          console.warn("Firestore access error, loading local cache fallback:", error);
          const cached = localStorage.getItem("bc_appointments");
          if (cached) {
            try {
              const parsed = JSON.parse(cached) as Appointment[];
              setAppointments(parsed);
            } catch (e) {
              setAppointments([]);
            }
          } else {
            setAppointments([]);
          }
          try {
            handleFirestoreError(error, OperationType.LIST, "appointments");
          } catch (e) {
            console.error(e);
          }
        }
      );
    } catch (e) {
      console.warn("Realtime Firestore listener setup failed:", e);
      const cached = localStorage.getItem("bc_appointments");
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as Appointment[];
          setAppointments(parsed);
        } catch (err) {
          setAppointments([]);
        }
      }
    }

    return () => unsubscribe();
  }, []);

  // Sync to database with local feedback
  const handleAddAppointment = async (newApp: Appointment) => {
    // Sanitize newApp to remove any undefined properties recursively to ensure Firestore compatibility
    const sanitizeObj = (data: any): any => {
      if (data === null || data === undefined) return null;
      if (Array.isArray(data)) {
        return data.map(sanitizeObj);
      }
      if (typeof data === "object") {
        const cleaned: any = {};
        Object.keys(data).forEach((key) => {
          const val = data[key];
          if (val !== undefined) {
            cleaned[key] = sanitizeObj(val);
          }
        });
        return cleaned;
      }
      return data;
    };

    const cleanedApp = sanitizeObj(newApp);

    // Optimistic UI state updater
    const updated = [cleanedApp, ...appointments];
    setAppointments(updated);
    localStorage.setItem("bc_appointments", JSON.stringify(updated));

    try {
      await setDoc(doc(db, "appointments", cleanedApp.id), cleanedApp);
    } catch (error) {
      console.error("Firebase upload failed. Reverting local cache.", error);
      
      // Revert optimistic update
      const reverted = appointments.filter(app => app.id !== cleanedApp.id);
      setAppointments(reverted);
      localStorage.setItem("bc_appointments", JSON.stringify(reverted));
      
      const errMsg = error instanceof Error ? error.message : "Erro desconhecido";
      alert(`⚠️ ERRO AO GRAVAR NO BANCO DE DADOS!\n\nNão foi possível salvar o agendamento no servidor do Firebase.\n\nDetalhes do Erro: ${errMsg}\n\nPor favor, verifique se todos os campos obrigatórios estão corretos e certifique-se de que possui uma conexão ativa de rede.`);
      
      try {
        handleFirestoreError(error, OperationType.CREATE, `appointments/${cleanedApp.id}`);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: AppointmentStatus) => {
    // Save original state for possible reversion
    const originalAppointments = [...appointments];

    // Optimistic UI status updater 
    const updated = appointments.map((app) => {
      if (app.id === id) {
        return { ...app, status: newStatus };
      }
      return app;
    });
    setAppointments(updated);
    localStorage.setItem("bc_appointments", JSON.stringify(updated));

    try {
      const docRef = doc(db, "appointments", id);
      await updateDoc(docRef, { status: newStatus });
    } catch (error) {
      console.error("Firestore update failed. Reverting status.", error);
      
      // Revert state
      setAppointments(originalAppointments);
      localStorage.setItem("bc_appointments", JSON.stringify(originalAppointments));
      
      const errMsg = error instanceof Error ? error.message : "Erro desconhecido";
      alert(`⚠️ ERRO AO ATUALIZAR STATUS NO SERVIDOR!\n\nNão foi possível sincronizar a alteração de status com o banco de dados.\n\nDetalhes do Erro: ${errMsg}`);
      
      try {
        handleFirestoreError(error, OperationType.UPDATE, `appointments/${id}`);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    // Save original state for possible reversion
    const originalAppointments = [...appointments];

    // Optimistic UI state updater
    const updated = appointments.filter((app) => app.id !== id);
    setAppointments(updated);
    localStorage.setItem("bc_appointments", JSON.stringify(updated));

    try {
      const docRef = doc(db, "appointments", id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Firestore delete failed. Reverting list.", error);
      
      // Revert state
      setAppointments(originalAppointments);
      localStorage.setItem("bc_appointments", JSON.stringify(originalAppointments));
      
      const errMsg = error instanceof Error ? error.message : "Erro desconhecido";
      alert(`⚠️ ERRO AO EXCLUIR NO SERVIDOR!\n\nNão foi possível excluir o agendamento no banco de dados.\n\nDetalhes do Erro: ${errMsg}`);
      
      try {
        handleFirestoreError(error, OperationType.DELETE, `appointments/${id}`);
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0f1419] text-slate-100 antialiased font-sans filter-none print:bg-white print:text-black">
      {/* Brand Header / Banner */}
      <header id="app-main-header" className="bg-[#1a2129] border-b border-slate-800 shadow-md sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo / Title */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#2563eb] flex items-center justify-center text-white shadow-md shadow-[#2563eb]/20 shrink-0">
              <Truck className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs bg-[#2563eb]/15 text-[#2563eb] font-mono font-bold tracking-wider rounded px-1.5 py-0.5">FILIAL BORACÉIA</span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-[#51cf66] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#51cf66] rounded-full animate-ping"></span>
                  Operacional Sáb/Dom
                </span>
              </div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-tight">
                MARSIL ATACADISTA <span className="font-light text-slate-400">| Recebimento de Cargas</span>
              </h1>
            </div>
          </div>

          {/* Interactive Navigation Tabs & User Sessions */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center bg-[#0f1419] p-1 rounded-lg border border-slate-800">
              <button
                id="tab-button-supplier"
                onClick={() => setActiveTab("supplier")}
                className={`px-4 py-2 rounded-md text-xs font-semibold tracking-wide flex items-center gap-2 transition cursor-pointer ${
                  activeTab === "supplier"
                    ? "bg-[#2563eb] text-white shadow-md shadow-[#2563eb]/10"
                    : "text-slate-400 hover:text-white hover:bg-slate-850"
                }`}
              >
                <FileText className="w-4 h-4" />
                📦 AGENDAR CARGA
              </button>
              <button
                id="tab-button-manager"
                onClick={() => setActiveTab("manager")}
                className={`px-4 py-2 rounded-md text-xs font-semibold tracking-wide flex items-center gap-2 transition cursor-pointer ${
                  activeTab === "manager"
                    ? "bg-[#2563eb] text-white shadow-md shadow-[#2563eb]/10"
                    : "text-slate-400 hover:text-white hover:bg-slate-850"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                {currentUser.role === "admin" ? "📋 PAINEL DO GESTOR" : "📋 CONSULTA DA AGENDA"}
              </button>
            </div>

            {/* Profile info and Log Out */}
            <div className="flex items-center gap-2.5">
              <div className="text-right hidden sm:block">
                <span className="text-[10px] text-slate-500 font-mono block leading-none">Logado como</span>
                <span className="text-xs font-semibold text-white mt-1 block">
                  {currentUser.displayName}
                </span>
              </div>
              <button
                id="btn-app-logout"
                onClick={handleLogout}
                className="p-2 bg-slate-800 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-colors border border-slate-700/60 cursor-pointer"
                title="Sair do CD"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Main Content Space */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 print:p-0">
        
        {/* Quick Operations Summary banner */}
        <div className="bg-[#1c2e36]/30 border border-teal-500/20 text-slate-350 py-3 px-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 text-xs print:hidden">
          <div className="flex items-center gap-2">
            <span className="bg-[#2563eb] text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Regras CD</span>
            <p>
              Janelas de 1 hora (06h às 18h). Limite de <strong>2 agendamentos por janela</strong> (2 docas). Permite agendamentos no próprio dia.
            </p>
          </div>
          <div className="flex items-center gap-3 font-mono text-slate-400 shrink-0">
            <span>Doca Ativa: 1 / 2</span>
            <span>Estacionamento: Aberto</span>
          </div>
        </div>

        {/* View Switcher based on tab state */}
        {activeTab === "supplier" ? (
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white font-sans tracking-tight">Solicitação de Horário para Descarga</h2>
              <p className="text-slate-400 text-xs mt-1">Insira as informações do veículo e da nota fiscal para reservar seu slot de descarga na nossa planta.</p>
            </div>
            <SupplierForm appointments={appointments} onAddAppointment={handleAddAppointment} />
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white font-sans tracking-tight">
                {currentUser.role === "admin" ? "Controle Operacional de Recebimento" : "Consulta de Janelas de Entrega"}
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                {currentUser.role === "admin"
                  ? "Acompanhe as entregas, valide docas ocupadas e marque cargas como recebidas de forma instantânea."
                  : "Acompanhe o cronograma de descargas planejadas para a unidade Marsil CD Boracéia (Modo de Consulta)."}
              </p>
            </div>
            <ManagerDashboard
              appointments={appointments}
              onUpdateStatus={handleUpdateStatus}
              onDeleteAppointment={handleDeleteAppointment}
              isAdmin={currentUser.role === "admin"}
            />
          </div>
        )}

      </main>

      {/* Custom footer indicating Firebase persistence and safety values */}
      <footer className="bg-[#1a2129] border-t border-slate-800 text-slate-500 text-center py-6 text-xs mt-auto print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© 2026 Marsil Atacadista — Filial CD Boracéia. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Shield className="w-3.5 h-3.5" />
              Sincronizado via Firebase Cloud (com Cache Local)
            </span>
            <span className="text-slate-700">|</span>
            <span className="font-mono text-[10px]">v1.4.2-prod</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
