/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Truck, Shield, Lock, User, Check, AlertCircle } from "lucide-react";

export interface LoggedInUser {
  username: string;
  role: "admin" | "user";
  displayName: string;
}

interface LoginProps {
  onLoginSuccess: (user: LoggedInUser) => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const normUser = username.trim().toLowerCase();
    const normPass = password.trim();

    if (!normUser || !normPass) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    // Checking credentials
    const isComprasGroup =
      (normUser === "compras" && normPass === "compras123") ||
      (normUser === "vendas" && normPass === "vendas123") ||
      (normUser === "comprador" && normPass === "comprador123");

    if (normUser === "admin" && normPass === "admin123") {
      onLoginSuccess({
        username: "admin",
        role: "admin",
        displayName: "Gestor do CD Boracéia",
      });
    } else if (isComprasGroup) {
      onLoginSuccess({
        username: normUser,
        role: "user",
        displayName: "Equipe de Compras / Vendas",
      });
    } else {
      setError("Usuário ou senha incorretos. Dica: use os botões de atalho abaixo.");
    }
  };

  const handlePrefill = (role: "admin" | "user") => {
    setError("");
    if (role === "admin") {
      setUsername("admin");
      setPassword("admin123");
    } else {
      setUsername("compras");
      setPassword("compras123");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1419] flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Dynamic Background Blur Accents */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#2563eb]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-15">
        {/* Logo / Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-[#2563eb] items-center justify-center text-white shadow-xl shadow-[#2563eb]/20 mb-4 animate-bounce">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs bg-[#2563eb]/15 text-[#2563eb] font-mono font-bold tracking-widest rounded px-2.5 py-1 uppercase">
              PLANO DE EXPEDIÇÃO & RECEBIMENTO
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight leading-tight mt-2 uppercase">
              MARSIL ATACADISTA
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Agendamento de Janelas e Gestão Operacional de Docas • CD Boracéia
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-[#1a2129] border border-slate-800 rounded-xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-[#2563eb] to-cyan-500" />
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-6 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#2563eb]" />
            Acesso ao Sistema de Agendamento
          </h2>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-xs text-red-400 rounded-lg flex items-start gap-2 animate-pulse">
                <AlertCircle className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="login-username" className="block text-xs text-slate-400 font-medium mb-1.5">
                Nome de Usuário / Login
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  id="login-username"
                  type="text"
                  required
                  placeholder="Ex: fornecedor ou admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#0f1419] border border-slate-700/60 focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs text-slate-400 font-medium mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  id="login-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0f1419] border border-slate-700/60 focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              id="btn-perform-login"
              type="submit"
              className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-md shadow-[#2563eb]/10 active:scale-[0.98] cursor-pointer"
            >
              Entrar no CD Marsil
            </button>
          </form>

          {/* Prefill Shortcuts / Quick Testing Access */}
          <div className="border-t border-slate-800/80 mt-6 pt-5">
            <span className="block text-[10px] uppercase font-mono tracking-wider text-slate-500 text-center mb-3">
              Acesso Rápido para Auditoria (Clique para preencher)
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handlePrefill("user")}
                className="bg-[#0f1419] hover:bg-[#1c242e] border border-slate-800 text-left p-3 rounded-lg transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Compras / Vendas</span>
                  <Check className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[9px] text-slate-500 font-mono mt-0.5">user: compras</p>
                <p className="text-[9px] text-slate-500 font-mono">senha: compras123</p>
              </button>
              <button
                type="button"
                onClick={() => handlePrefill("admin")}
                className="bg-[#0f1419] hover:bg-[#1c242e] border border-slate-800 text-left p-3 rounded-lg transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-blue-400 font-bold uppercase">Gestor CD</span>
                  <Shield className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[9px] text-slate-500 font-mono mt-0.5">user: admin</p>
                <p className="text-[9px] text-slate-500 font-mono">senha: admin123</p>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-600 text-[10px] mt-6">
          Unidade CD Boracéia: R. Terciliano Sgavioli, 671-721, Boracéia - SP, CEP: 17270-000
        </p>
      </div>
    </div>
  );
}
