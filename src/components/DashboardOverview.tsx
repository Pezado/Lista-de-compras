import { useState } from "react";
import { Signal, Stats } from "../types";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldAlert, 
  RotateCcw,
  TrendingUp
} from "lucide-react";

interface DashboardOverviewProps {
  signals: Signal[];
  activeGame: "Bacbo" | "FutebolStudio";
  onClear: () => void;
}

export default function DashboardOverview({ signals, activeGame, onClear }: DashboardOverviewProps) {
  // Filter signals list based on selected active game
  const targetSource = activeGame === "Bacbo" ? "Rqdados" : "FutebolStudio";
  const gameSignals = signals.filter(sig => sig.parsed.source === targetSource);

  // Dynamic statistics calculations
  const stats = (() => {
    let wins = 0;
    let losses = 0;
    let ties = 0;

    for (const sig of gameSignals) {
      if (sig.parsed.status === "GREEN") {
        wins++;
        if (sig.parsed.direction === "TIE") {
          ties++;
        }
      } else if (sig.parsed.status === "RED") {
        losses++;
      }
    }

    const totalFinished = wins + losses;
    const winRate = totalFinished > 0 ? parseFloat(((wins / totalFinished) * 100).toFixed(1)) : 100;

    return { totalFinished, wins, losses, ties, winRate };
  })();

  // Find the active/current signal that is either AGUARDANDO or CONFIRMADA
  const activeSignal = gameSignals.find(s => s.parsed.status === "AGUARDANDO" || s.parsed.status === "CONFIRMADA");
  const latestSignal = gameSignals.length > 0 ? gameSignals[0] : null;

  const getDirectionText = (direction: string) => {
    switch (direction) {
      case "PLAYER":
        return activeGame === "Bacbo" ? "🔵 JOGADOR (AZUL)" : "🔵 JOGADOR (BLUE)";
      case "BANKER":
        return activeGame === "Bacbo" ? "🔴 BANQUEIRO (VERMELHO)" : "🔴 BANQUEIRO (RED)";
      case "TIE":
        return "🟡 EMPATE (TIE)";
      case "WAIT":
        return "⏳ ANALISANDO PADRÕES...";
      default:
        return "AGUARDANDO PREVISÃO";
    }
  };

  const getStatusLabelText = (status: string) => {
    switch (status) {
      case "GREEN":
        return "✅ GREEN VITÓRIA!";
      case "RED":
        return "❌ RED (LOSS)";
      case "CANCELADO":
        return "🚫 ENTRADA CANCELADA";
      case "CONFIRMADA":
        return "🚨 ENTRADA CONFIRMADA!";
      case "AGUARDANDO":
      default:
        return "⚠️ ATENÇÃO: PREPARA-SE";
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-6" id="dashboard-prediction-view">
      
      {/* 1. Main Centralized Signal Card */}
      <div className="bg-[#121824] border border-gray-800 rounded-3xl p-6 relative overflow-hidden shadow-2xl" id="centralized-prediction-box">
        {/* Glow Effects */}
        {activeSignal?.parsed.direction === "PLAYER" && (
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
        )}
        {activeSignal?.parsed.direction === "BANKER" && (
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-red-500/10 rounded-full blur-[80px] pointer-events-none" />
        )}
        {(!activeSignal) && (
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none" />
        )}

        <div className="text-center pb-2 border-b border-gray-800/80 mb-6">
          <h2 className="text-lg font-extrabold text-white mt-1 uppercase tracking-wider">
            {activeGame === "Bacbo" ? "BACBO LIVE" : "FUTEBOL STUDIO LIVE"}
          </h2>
        </div>

        {activeSignal ? (
          <div className="text-center space-y-6 py-2">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                Status da Operação
              </span>
              <div className={`text-sm font-black tracking-wide ${
                activeSignal.parsed.status === "GREEN" ? "text-emerald-400" :
                activeSignal.parsed.status === "RED" ? "text-red-500" :
                activeSignal.parsed.status === "CONFIRMADA" ? "text-blue-400 animate-pulse" :
                "text-amber-400"
              }`}>
                {getStatusLabelText(activeSignal.parsed.status)}
              </div>
            </div>

            {/* Giant Entry Direction Emblem */}
            <div className="flex flex-col items-center justify-center my-4 animate-fade-in">
              <div className="flex gap-2 mb-2">
                {activeSignal.parsed.direction === "PLAYER" && (
                  <span className="text-6xl filter drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">🔵</span>
                )}
                {activeSignal.parsed.direction === "BANKER" && (
                  <span className="text-6xl filter drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">🔴</span>
                )}
                {activeSignal.parsed.direction === "TIE" && (
                  <span className="text-6xl filter drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">🟡</span>
                )}
                {activeSignal.parsed.direction === "WAIT" && (
                  <span className="text-6xl animate-pulse">⏳</span>
                )}
              </div>

              <span className="text-xs font-semibold text-gray-400 mt-2 block uppercase tracking-wider">ENTRADA RECOMENDADA</span>
              <h3 className={`text-xl font-black mt-1 ${
                activeSignal.parsed.direction === "PLAYER" ? "text-blue-400" :
                activeSignal.parsed.direction === "BANKER" ? "text-red-400" :
                activeSignal.parsed.direction === "TIE" ? "text-amber-400" :
                "text-cyan-400"
              }`}>
                {getDirectionText(activeSignal.parsed.direction)}
              </h3>
            </div>

            {/* Guidelines Card */}
            <div className="bg-gray-950/80 border border-gray-800 rounded-2xl p-4 grid grid-cols-2 gap-4 text-left">
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Proteção em:</span>
                <span className="text-xs font-black text-amber-500 block mt-0.5">🟡 EMPATE (Tie)</span>
              </div>
              <div className="border-l border-gray-900 pl-4">
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Martingales:</span>
                <span className="text-xs font-black text-purple-400 block mt-0.5">Até {activeSignal.parsed.martingales || 2} Gales</span>
              </div>
            </div>
            
            <div className="text-[10px] text-gray-500">
              Capturado às: {activeSignal.parsed.time}
            </div>
          </div>
        ) : (
          <div className="py-12 text-center flex flex-col items-center justify-center space-y-3" id="central-waiting-view">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border border-dashed border-cyan-500/30 flex items-center justify-center animate-spin-slow">
                <Clock className="w-6 h-6 text-cyan-400/80" />
              </div>
              <span className="absolute top-0 right-0 w-3' h-3 bg-cyan-500 rounded-full animate-ping" />
            </div>
            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-widest">Aguardando novo padrão...</h4>
            <p className="text-[11px] text-gray-500 max-w-xs leading-relaxed">
              Nosso bot está analisando os padrões atuais e enviará uma nova previsão assim que identificar uma oportunidade VIP.
            </p>
          </div>
        )}
      </div>

      {/* 2. Assertivity Meter / Stats Panel */}
      <div className="bg-[#121824] border border-gray-800 rounded-2xl p-4 flex items-center justify-between shadow-xl" id="quick-assertiveness-panel">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 block font-bold uppercase tracking-wider">Assertividade Geral</span>
            <span className="text-base font-black text-white">{stats.winRate}%</span>
          </div>
        </div>

        <div className="flex gap-4 text-right">
          <div>
            <span className="text-[10px] text-emerald-400 font-bold block">{stats.wins}</span>
            <span className="text-[9px] text-gray-500 uppercase font-semibold block">Green</span>
          </div>
          <div className="border-r border-gray-800 self-center h-6" />
          <div>
            <span className="text-[10px] text-red-500 font-bold block">{stats.losses}</span>
            <span className="text-[9px] text-gray-500 uppercase font-semibold block">Red</span>
          </div>
          <div className="border-r border-gray-800 self-center h-6" />
          <div>
            <span className="text-[10px] text-yellow-500 font-bold block">{stats.ties}</span>
            <span className="text-[9px] text-gray-500 uppercase font-semibold block">Tie</span>
          </div>
        </div>
      </div>

    </div>
  );
}
