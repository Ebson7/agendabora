/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Appointment, AppointmentStatus } from "./types";
import { SupplierForm } from "./components/SupplierForm";
import { ManagerDashboard } from "./components/ManagerDashboard";
import { generateSeedAppointments } from "./utils/seedData";
import { db } from "./lib/firebase";
import { collection, onSnapshot, doc, setDoc, updateDoc } from "firebase/firestore";
import { Truck, Users, LayoutDashboard, Calendar, HelpCircle, Shield, FileText } from "lucide-react";

export default function App() {
  // Tabs: "supplier" (Agendar Carga) or "manager" (Painel do Gestor)
  const [activeTab, setActiveTab] = useState<"supplier" | "manager">("supplier");
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Load appointments from Firestore in realtime with local cache fallbacks
  useEffect(() => {
    let unsubscribe: () => void = () => {};
    try {
      unsubscribe = onSnapshot(
        collection(db, "appointments"),
        (snapshot) => {
          const list: Appointment[] = [];
          snapshot.forEach((doc) => {
            list.push(doc.data() as Appointment);
          });
          
          // Sort list by date and then timeslot
          list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          
          if (list.length > 0) {
            setAppointments(list);
            localStorage.setItem("bc_appointments", JSON.stringify(list));
          } else {
            // First run on blank Firebase - upload our high-quality seed data
            const seeds = generateSeedAppointments();
            seeds.forEach(async (seed) => {
              try {
                await setDoc(doc(db, "appointments", seed.id), seed);
              } catch (e) {
                console.warn("Could not save seed to firestore: ", e);
              }
            });
            setAppointments(seeds);
            localStorage.setItem("bc_appointments", JSON.stringify(seeds));
          }
        },
        (error) => {
          console.warn("Firestore access error, loading local cache fallback:", error);
          const cached = localStorage.getItem("bc_appointments");
          if (cached) {
            try {
              setAppointments(JSON.parse(cached));
            } catch (e) {
              const seeds = generateSeedAppointments();
              setAppointments(seeds);
            }
          } else {
            const seeds = generateSeedAppointments();
            setAppointments(seeds);
          }
        }
      );
    } catch (e) {
      console.warn("Realtime Firestore listener setup failed:", e);
      const cached = localStorage.getItem("bc_appointments");
      if (cached) {
        setAppointments(JSON.parse(cached));
      }
    }

    // Sequence start marker if not already present
    if (!localStorage.getItem("bc_seq")) {
      localStorage.setItem("bc_seq", "8");
    }

    return () => unsubscribe();
  }, []);

  // Sync to database with local feedback
  const handleAddAppointment = async (newApp: Appointment) => {
    // Optimistic UI state updater
    const updated = [newApp, ...appointments];
    setAppointments(updated);
    localStorage.setItem("bc_appointments", JSON.stringify(updated));

    try {
      await setDoc(doc(db, "appointments", newApp.id), newApp);
    } catch (error) {
      console.warn("Firebase upload delayed. Local cache saved.", error);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: AppointmentStatus) => {
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
      console.warn("Firestore update postponed. Local state synchronized.", error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0f1419] text-slate-100 antialiased font-sans filter-none print:bg-white print:text-black">
      {/* Brand Header / Banner */}
      <header id="app-main-header" className="bg-[#1a2129] border-b border-slate-800 shadow-md sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo / Title */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[#ff6b35] flex items-center justify-center text-white shadow-md shadow-[#ff6b35]/20 shrink-0">
              <Truck className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs bg-[#ff6b35]/15 text-[#ff6b35] font-mono font-bold tracking-wider rounded px-1.5 py-0.5">FILIAL BORACÉIA</span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-[#51cf66] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#51cf66] rounded-full animate-ping"></span>
                  Operacional Sáb/Dom
                </span>
              </div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-tight">
                MARSIL ALIMENTOS <span className="font-light text-slate-400">| Recebimento de Cargas</span>
              </h1>
            </div>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex items-center bg-[#0f1419] p-1 rounded-lg border border-slate-800">
            <button
              id="tab-button-supplier"
              onClick={() => setActiveTab("supplier")}
              className={`px-4 py-2 rounded-md text-xs font-semibold tracking-wide flex items-center gap-2 transition cursor-pointer ${
                activeTab === "supplier"
                  ? "bg-[#ff6b35] text-white shadow-md shadow-[#ff6b35]/10"
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
                  ? "bg-[#ff6b35] text-white shadow-md shadow-[#ff6b35]/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-850"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              📋 PAINEL DO GESTOR
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Space */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 print:p-0">
        
        {/* Quick Operations Summary banner */}
        <div className="bg-[#1c2e36]/30 border border-teal-500/20 text-slate-350 py-3 px-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 text-xs print:hidden">
          <div className="flex items-center gap-2">
            <span className="bg-[#ff6b35] text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Regras CD</span>
            <p>
              Janelas de 1 hora (06h às 18h). Limite de <strong>2 agendamentos por janela</strong> (2 docas). Não permite agendamentos no próprio dia.
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
              <h2 className="text-xl font-bold text-white font-sans tracking-tight">Controle Operacional de Recebimento</h2>
              <p className="text-slate-400 text-xs mt-1">Acompanhe as entregas, valide docas ocupadas e marque cargas como recebidas de forma instantânea.</p>
            </div>
            <ManagerDashboard appointments={appointments} onUpdateStatus={handleUpdateStatus} />
          </div>
        )}

      </main>

      {/* Custom footer indicating Firebase persistence and safety values */}
      <footer className="bg-[#1a2129] border-t border-slate-800 text-slate-500 text-center py-6 text-xs mt-auto print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© 2026 MarSil Alimentos Ltda — Filial CD Boracéia. Todos os direitos reservados.</p>
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
