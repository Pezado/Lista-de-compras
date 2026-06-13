import React, { useEffect, useState } from "react";
import { Signal, Stats } from "./types";
import DashboardOverview from "./components/DashboardOverview";
import { 
  Wifi, 
  Lock, 
  ChevronRight, 
  ArrowLeft, 
  Sparkles, 
  MessageSquare, 
  ShieldAlert, 
  RefreshCw,
  Phone,
  Settings,
  X,
  Play
} from "lucide-react";

interface AppConfig {
  adm: string;
  maintenance: boolean;
  maintenanceMsg?: string;
  dialogue: string;
  appFoto: string;
  bacboFoto: string;
  footstudioFoto: string;
  liberado: boolean;
}

export default function App() {
  // Config & State
  const [appConfig, setAppConfig] = useState<AppConfig>({
    adm: "+244942607599",
    maintenance: false,
    maintenanceMsg: "Estamos de manutenção temporária para atualização de instabilidade. Voltamos em breve!",
    dialogue: "",
    appFoto: "https://i.ibb.co/WWvnrxXN/images-22.webp",
    bacboFoto: "https://i.ibb.co/WWvnrxXN/images-22.webp",
    footstudioFoto: "https://i.ibb.co/WWvnrxXN/images-22.webp",
    liberado: false
  });

  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  // Dialogue Dismissal State
  const [showDialogue, setShowDialogue] = useState(false);

  // Auth State
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [isVip, setIsVip] = useState<boolean>(false);
  const [expirationDate, setExpirationDate] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [vipChecking, setVipChecking] = useState<boolean>(true);

  // Registration Multi-Step Card
  const [regStep, setRegStep] = useState<number>(1);
  const [regName, setRegName] = useState<string>("");
  const [regCountry, setRegCountry] = useState<string>("Angola");
  const [regPhoneInput, setRegPhoneInput] = useState<string>("");
  const [regError, setRegError] = useState<string>("");
  const [registering, setRegistering] = useState<boolean>(false);

  // Navigation State
  const [activeGame, setActiveGame] = useState<"Bacbo" | "FutebolStudio" | null>(null);

  // Initialize
  useEffect(() => {
    const stored = localStorage.getItem("userPhone");
    if (stored) {
      setUserPhone(stored);
    } else {
      setVipChecking(false);
    }
    // Fetch configuration and check VIP
    fetchAppConfig();
  }, []);

  // Fetch App Configuration
  const fetchAppConfig = async () => {
    try {
      const res = await fetch("/api/app-config");
      if (res.ok) {
        const configData = await res.json();
        setAppConfig(configData);
        // If there's a non-empty dialog from Firebase, show it
        if (configData.dialogue && configData.dialogue.trim() !== "") {
          setShowDialogue(true);
        }
      }
    } catch (e) {
      console.error("Erro ao carregar configurações do Firebase:", e);
    }
  };

  // Check VIP status on phone change
  useEffect(() => {
    if (userPhone) {
      checkVipStatus(userPhone);
    }
  }, [userPhone]);

  // Check VIP through server API
  const checkVipStatus = async (phoneToCheck: string) => {
    setVipChecking(true);
    try {
      const res = await fetch("/api/check-user-vip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone: phoneToCheck })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.vip) {
          setIsVip(true);
          setExpirationDate(data.user?.expireDate || "Vitalício");
          setUserName(data.user?.nome || "VIP");
        } else {
          setIsVip(false);
          setExpirationDate(null);
          if (data.user) {
            setUserName(data.user.nome);
          }
        }
      }
    } catch (err) {
      console.error("Erro ao validar VIP:", err);
    } finally {
      setVipChecking(false);
    }
  };

  // Fetch Signals from backend API
  const fetchSignals = async (showRefresher = false) => {
    if (showRefresher) setLoading(true);
    try {
      const res = await fetch("/api/signals");
      if (res.ok) {
        const data = await res.json();
        setSignals(data.signals || []);
      }
    } catch (err) {
      console.error("Erro ao atualizar sinais:", err);
    } finally {
      setLoading(false);
      setLastRefreshed(new Date().toLocaleTimeString("pt-BR"));
    }
  };

  // Setup periodic signal poll (every 3s for ultra responsiveness)
  useEffect(() => {
    if (isVip && !appConfig.maintenance) {
      fetchSignals(true);
      const interval = setInterval(() => {
        fetchSignals(false);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isVip, appConfig.maintenance]);

  // Clean clearing handler
  const handleClear = async () => {
    try {
      const response = await fetch("/api/clear", { method: "POST" });
      if (response.ok) {
        fetchSignals(false);
      }
    } catch (err) {
      console.error("Falha ao resetar feed", err);
    }
  };

  // Determine Country Phone Prefix Indicator Code
  const getPrefixIndicator = () => {
    switch (regCountry) {
      case "Angola":
        return "+244";
      case "Brasil":
        return "+55";
      case "Moçambique":
        return "+258";
      default:
        return "+244";
    }
  };

  // Form submission / User creation
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");

    if (!regName.trim()) {
      setRegError("Por favor, digite seu nome.");
      return;
    }
    if (!regPhoneInput.trim()) {
      setRegError("Por favor, digite seu número de telefone.");
      return;
    }

    const fullPhone = getPrefixIndicator() + regPhoneInput.replace(/\D/g, "");
    setRegistering(true);

    try {
      const res = await fetch("/api/register-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: regName.trim(),
          pais: regCountry,
          telefone: fullPhone
        })
      });

      if (res.ok) {
        localStorage.setItem("userPhone", fullPhone);
        setUserPhone(fullPhone);
      } else {
        const errData = await res.json();
        setRegError(errData.error || "Houve um problema durante o cadastro.");
      }
    } catch (error) {
      setRegError("Erro de comunicação com o servidor. Tente novamente.");
    } finally {
      setRegistering(false);
    }
  };

  // Formats WhatsApp ADM number links
  const getAdmWhatsAppLink = () => {
    const rawNoSymbols = appConfig.adm.replace(/[^\d]/g, "");
    return `https://wa.me/${rawNoSymbols}?text=Ol%C3%A1%21%20Gostaria%20de%20ativar%20meu%20acesso%20VIP%20no%20aplicativo%20de%20sinais.`;
  };

  // Render Section 1: Maintenance Block Page
  if (appConfig.maintenance) {
    return (
      <div className="bg-[#080d1a] min-h-screen text-gray-100 flex flex-col items-center justify-center p-6 font-sans relative" id="maintenance-view">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-yellow-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="bg-[#121824] border border-gray-800/80 rounded-3xl p-8 max-w-md text-center shadow-2xl relative">
          <div className="w-16 h-16 bg-yellow-500/10 border border-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8 text-yellow-500 animate-pulse" />
          </div>
          <h2 className="text-xl font-black text-yellow-500 uppercase tracking-wider">Temporariamente Indisponível</h2>
          <p className="text-xs text-gray-400 mt-3 leading-relaxed whitespace-pre-wrap font-sans">
            {appConfig.maintenanceMsg || "Estamos realizando melhorias estruturais no robô de predição em tempo real. Retornaremos em instantes!"}
          </p>
          <div className="border-t border-gray-800 mt-6 pt-4 text-[10px] text-gray-500">
            Administrador Contato: <span className="font-mono text-cyan-400 font-semibold">{appConfig.adm}</span>
          </div>
        </div>
      </div>
    );
  }

  // Render Section 2: Loading State
  if (userPhone && vipChecking) {
    return (
      <div className="bg-[#080d1a] min-h-screen text-gray-100 flex flex-col items-center justify-center p-6 font-sans" id="auth-loading-view">
        <div className="space-y-4 text-center">
          <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin mx-auto" />
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-white mt-4">Verificando Credenciais</h3>
          <p className="text-[11px] text-gray-500 font-medium">Autenticando credenciais do usuário VIP...</p>
        </div>
      </div>
    );
  }

  // Render Section 3: Registration/Onboarding Form Screen
  if (!userPhone) {
    return (
      <div className="bg-[#080d1a] min-h-screen text-gray-100 flex flex-col items-center justify-center p-6 font-sans relative" id="registration-onboarding-view">
        {/* Decorative Background Glows */}
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-sm" id="onboarding-container">
          {/* Logo Heading */}
          <div className="text-center mb-6">
            <img 
              src={appConfig.appFoto} 
              alt="Logo" 
              className="w-20 h-20 rounded-2xl mx-auto object-cover border border-gray-800 shadow-xl"
              referrerPolicy="no-referrer"
            />
            <h1 className="text-2xl font-black text-white mt-4 uppercase tracking-wider font-sans">🎲.BAC-BOT VIP.🎲</h1>
            <p className="text-xs text-gray-400 mt-1">Painel automático de inteligência e sinais em tempo real</p>
          </div>

          {/* Registration Step Card */}
          <div className="bg-[#121824] border border-gray-800 rounded-3xl p-6 shadow-2xl relative" id="register-card">
            
            <form onSubmit={handleRegister} className="space-y-6">
              
              {/* Step 1: NAME */}
              {regStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">Passo 1 de 3</span>
                    <span className="text-[10px] text-gray-500">Nome de Usuário</span>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">Qual o seu Nome?</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Pedro, João, etc."
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full bg-[#0a0f1d] border border-gray-800 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                      required
                    />
                  </div>

                  <button 
                    type="button"
                    onClick={() => {
                      if (regName.trim()) setRegStep(2);
                      else setRegError("Por favor, digite seu nome.");
                    }}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs tracking-wider uppercase py-3.5 px-4 rounded-2xl transition shadow-lg shadow-cyan-500/10 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Continuar</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Step 2: COUNTRY */}
              {regStep === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">Passo 2 de 3</span>
                    <span className="text-[10px] text-gray-500 font-medium">Selecione seu País</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">Qual o seu País?</label>
                    <select 
                      value={regCountry}
                      onChange={(e) => setRegCountry(e.target.value)}
                      className="w-full bg-[#0a0f1d] border border-gray-800 rounded-2xl px-4 py-3.5 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
                    >
                      <option value="Angola">🇦🇴 Angola</option>
                      <option value="Moçambique">🇲🇿 Moçambique</option>
                      <option value="Brasil">🇧🇷 Brasil</option>
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setRegStep(1)}
                      className="w-1/3 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 font-bold text-xs py-3.5 px-3 rounded-2xl transition cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button 
                      type="button"
                      onClick={() => setRegStep(3)}
                      className="w-2/3 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs tracking-wider uppercase py-3.5 px-4 rounded-2xl transition shadow-lg shadow-cyan-500/10 cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>Continuar</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: WHATSAPP PHONE */}
              {regStep === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">Passo 3 de 3</span>
                    <span className="text-[10px] text-gray-500">Número de WhatsApp</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">Telefone (Somente número)</label>
                    
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-sm font-semibold font-mono text-cyan-400 pointer-events-none">
                        {getPrefixIndicator()}
                      </span>
                      <input 
                        type="text" 
                        placeholder="coloca o teu número do WhatsApp"
                        value={regPhoneInput}
                        onChange={(e) => setRegPhoneInput(e.target.value.replace(/\D/g, ""))}
                        className="w-full bg-[#0a0f1d] border border-gray-800 rounded-2xl pl-16 pr-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-cyan-500 transition-colors"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {regError && (
                    <p className="text-[11px] bg-red-500/10 border border-red-500/20 text-red-400 p-2.5 rounded-xl text-center">
                      {regError}
                    </p>
                  )}

                  <div className="flex gap-3">
                    <button 
                      type="button"
                      disabled={registering}
                      onClick={() => setRegStep(2)}
                      className="w-1/3 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 font-bold text-xs py-3.5 px-3 rounded-2xl transition cursor-pointer disabled:opacity-50"
                    >
                      Voltar
                    </button>
                    <button 
                      type="submit"
                      disabled={registering}
                      className="w-2/3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white font-black text-xs tracking-wider uppercase py-3.5 px-4 rounded-2xl transition shadow-lg shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {registering ? "Criando..." : "Criar Conta"}
                    </button>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>
      </div>
    );
  }

  // Render Section 4: VIP Restriction Lock Screen
  if (userPhone && !isVip && !appConfig.liberado) {
    return (
      <div className="bg-[#080d1a] min-h-screen text-gray-100 flex flex-col items-center justify-center p-6 font-sans relative" id="vip-lock-view">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="bg-[#121824] border border-gray-800 rounded-3xl p-8 shadow-2xl relative space-y-6">
            
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7 text-red-500" />
            </div>

            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider">Acesso Restrito</h2>
              <span className="text-[10px] bg-red-500/10 text-red-400 font-mono font-bold px-2 py-0.5 rounded border border-red-500/10 inline-block mt-1">
                CONTA NÃO APROVADA / INATIVA
              </span>
              <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                Olá, <strong className="text-white">{userName || "Usuário"}</strong>.<br/>
                Sua conta foi criada no sistema (<span className="text-cyan-400 font-mono font-bold text-[11px]">{userPhone}</span>), porém seu acesso está restrito para usuários VIP. Consulte o Administrador Supremo para aprovação ou renovação.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {/* WhatsApp direct ADM link contact */}
              <a 
                href={getAdmWhatsAppLink()}
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full bg-[#128C7E] hover:bg-[#075e54] text-white font-extrabold text-xs tracking-wider uppercase py-3.5 px-4 rounded-2xl transition shadow-lg shadow-teal-500/10 flex items-center justify-center gap-1.5"
              >
                <Phone className="w-4 h-4 fill-current" />
                <span>Consultar Administrador</span>
              </a>

              {/* Instant Check Approval button */}
              <button 
                onClick={() => checkVipStatus(userPhone)}
                className="w-full bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-200 hover:text-white font-bold text-xs py-3.5 px-4 rounded-2xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Verificar se ADM Já Aprovou</span>
              </button>
            </div>

            <div className="border-t border-gray-900 mt-6 pt-4 text-[10px] text-gray-500 text-left space-y-1">
              <div>• ADM WhatsApp: <span className="text-white font-mono font-bold">{appConfig.adm}</span></div>
              <div>• Status ID: <span className="text-gray-400 font-mono">Restricted_VIP_NoApproval</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Section 5: Dynamic Dialogue Bulletin Modal
  const renderDialoguePopup = () => {
    if (!showDialogue || !appConfig.dialogue) return null;
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="dialogue-bulletin-modal">
        <div className="bg-[#121824] border border-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative transition-transform">
          
          <div className="flex items-center gap-2 mb-3 text-cyan-400">
            <MessageSquare className="w-4 h-4" />
            <span className="text-[10px] uppercase font-bold tracking-widest font-sans">Comunicado Importante</span>
          </div>

          <h3 className="text-base font-black text-white text-left tracking-wide">AVISO DO ADMINISTRADOR</h3>
          <p className="text-xs text-gray-300 mt-3 leading-relaxed text-left whitespace-pre-wrap font-sans">
            {appConfig.dialogue}
          </p>

          <button 
            onClick={() => setShowDialogue(false)}
            className="w-full bg-[#3b82f6] hover:bg-blue-500 text-white font-bold text-xs py-3.5 px-4 rounded-2xl transition mt-5 uppercase cursor-pointer tracking-wider"
          >
            Entendido
          </button>
        </div>
      </div>
    );
  };

  // Render Section 6: MAIN APPROVED APPLICATION

  // Screen A: Game Selector Page
  if (!activeGame) {
    return (
      <div className="bg-[#080d1a] h-screen overflow-hidden text-gray-100 font-sans selection:bg-cyan-500 selection:text-white flex flex-col" id="game-selector-interface">
        {renderDialoguePopup()}
        
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/4 right-1/4 w-92 h-92 bg-emerald-400/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Top Header Selector */}
        <header className="border-b border-gray-900 bg-[#0c1322]/40 backdrop-blur-md py-3 px-4 shrink-0">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src={appConfig.appFoto} 
                alt="App Avatar" 
                className="w-9 h-9 rounded-xl object-cover border border-gray-800"
                referrerPolicy="no-referrer"
              />
              <div>
                <h2 className="text-xs font-black text-white uppercase tracking-wider block">🎲.BAC-BOT VIP.🎲</h2>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-gray-400 font-bold">Olá, {userName}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded border border-emerald-500/20 uppercase">
                VIP COM ACESSO
              </span>
            </div>
          </div>
        </header>

        {/* Main Selection Area */}
        <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto px-4 w-full pb-10">
          <div className="text-center space-y-1 mb-6">
            <h1 className="text-lg font-black text-white tracking-wide uppercase">Escolha o seu Jogo</h1>
            <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
              Selecione o painel em tempo real para obter sinais ao vivo de forma instantânea.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pb-2">
            {/* Game 1: BacBo */}
            <div 
              onClick={() => setActiveGame("Bacbo")}
              className="group bg-[#121824] hover:bg-[#151c2a] border border-gray-800 hover:border-cyan-500/50 rounded-3xl overflow-hidden shadow-xl transition-all cursor-pointer flex flex-col relative h-[220px]"
              id="game-picker-bacbo"
            >
              <div className="relative flex-1 overflow-hidden">
                <img 
                  src={appConfig.bacboFoto} 
                  alt="Bacbo game" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121824] via-[#121824]/25 to-transparent" />
                <span className="absolute top-3 right-3 bg-cyan-600/90 text-white text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                  BacBo Live
                </span>
              </div>
              <div className="p-3 flex items-center justify-between gap-1 shrink-0 bg-[#121824]">
                <div className="min-w-0">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider truncate">BacBo Live</h3>
                  <p className="text-[9px] text-gray-400 truncate">Sinais ao vivo</p>
                </div>
                <div className="w-7 h-7 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-all shrink-0">
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </div>
              </div>
            </div>

            {/* Game 2: Football Studio */}
            <div 
              onClick={() => setActiveGame("FutebolStudio")}
              className="group bg-[#121824] hover:bg-[#151c2a] border border-gray-800 hover:border-emerald-500/50 rounded-3xl overflow-hidden shadow-xl transition-all cursor-pointer flex flex-col relative h-[220px]"
              id="game-picker-studio"
            >
              <div className="relative flex-1 overflow-hidden">
                <img 
                  src={appConfig.footstudioFoto} 
                  alt="Futebol Studio game" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121824] via-[#121824]/25 to-transparent" />
                <span className="absolute top-3 right-3 bg-emerald-600/90 text-white text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                  Futebol Live
                </span>
              </div>
              <div className="p-3 flex items-center justify-between gap-1 shrink-0 bg-[#121824]">
                <div className="min-w-0">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider truncate">Futebol Club</h3>
                  <p className="text-[9px] text-gray-400 truncate">Sinais ao vivo</p>
                </div>
                <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shrink-0">
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    );
  }

  // Screen B: Centered Prediction Panel View
  return (
    <div className="bg-[#080d1a] min-h-screen text-gray-100 font-sans selection:bg-cyan-500 selection:text-white pb-16" id="prediction-screen-active">
      {renderDialoguePopup()}

      {/* Glow Effects */}
      <div className="absolute top-0 left-1/3 w-80 h-80 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Prediction View Header */}
      <header className="border-b border-gray-900 bg-[#0c1322]/40 backdrop-blur-md py-4 mb-8 px-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button 
            onClick={() => setActiveGame(null)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors py-1 px-2.5 rounded-lg bg-gray-950/40 border border-gray-900 hover:border-gray-800 cursor-pointer font-bold"
            id="back-to-selector-btn"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Mudar Jogo</span>
          </button>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Sincronizado</span>
          </div>
        </div>
      </header>

      {/* Central Prediction Section */}
      <main className="px-4" id="prediction-viewport-container">
        
        {loading && signals.length === 0 ? (
          <div className="py-24 text-center">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-white">Sincronizando Sinais</h3>
            <p className="text-xs text-gray-500 mt-1">Lendo as últimas predições recomendadas pelo bot...</p>
          </div>
        ) : (
          <DashboardOverview 
            signals={signals} 
            activeGame={activeGame}
            onClear={handleClear}
          />
        )}

      </main>

    </div>
  );
}
