import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dns from "dns";

// Prevent localhost resolution issues
dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini if API key is provided
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini API initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini API:", err);
  }
}

// In-memory Database for Signals
interface ParsedSignal {
  direction: 'PLAYER' | 'BANKER' | 'TIE' | 'WAIT' | 'UNKNOWN';
  martingales: number;
  status: 'AGUARDANDO' | 'CONFIRMADA' | 'GREEN' | 'RED' | 'CANCELADO';
  time: string;
  source?: string;
}

interface Signal {
  id: string;
  timestamp: string;
  rawText: string;
  parsed: ParsedSignal;
}

interface Stats {
  totalChecked: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  streak: number;
  maxStreak: number;
  byMartingale: {
    g0: number;
    g1: number;
    g2: number;
  };
}

// Pre-load with some standard historical signals to look professional
let signals: Signal[] = [
  {
    id: "sig_ready_studio",
    timestamp: new Date().toISOString(),
    rawText: "📡 Canal de Futebol Studio Conectado! Aguardando novos sinais ao vivo...",
    parsed: { direction: "WAIT", martingales: 0, status: "AGUARDANDO", time: new Date().toLocaleTimeString("pt-BR"), source: "FutebolStudio" }
  },
  {
    id: "sig_ready_rq",
    timestamp: new Date().toISOString(),
    rawText: "📡 Canal de BacBo Conectado! Aguardando novos sinais ao vivo...",
    parsed: { direction: "WAIT", martingales: 0, status: "AGUARDANDO", time: new Date().toLocaleTimeString("pt-BR"), source: "Rqdados" }
  }
];

// Helper to recalculate statistics based on signal history
function calculateStats(): Stats {
  let wins = 0;
  let losses = 0;
  let ties = 0;
  let currentStreak = 0;
  let maxStreak = 0;
  let g0 = 0;
  let g1 = 0;
  let g2 = 0;

  // Track streak chronologically
  const sortedSignals = [...signals].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  for (const sig of sortedSignals) {
    if (sig.parsed.status === "GREEN") {
      wins++;
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
      if (sig.parsed.direction === "TIE") {
        ties++;
      }
      if (sig.parsed.martingales === 0) g0++;
      else if (sig.parsed.martingales === 1) g1++;
      else if (sig.parsed.martingales === 2) g2++;
    } else if (sig.parsed.status === "RED") {
      losses++;
      currentStreak = 0;
    }
  }

  const totalFinished = wins + losses;
  const winRate = totalFinished > 0 ? parseFloat(((wins / totalFinished) * 100).toFixed(1)) : 100;

  return {
    totalChecked: totalFinished,
    wins,
    losses,
    ties,
    winRate,
    streak: currentStreak,
    maxStreak,
    byMartingale: { g0, g1, g2 }
  };
}

let stats: Stats = calculateStats();

// Heuristic regex parser for Signals
function inspectSignalText(text: string): ParsedSignal {
  const normalized = text.toLowerCase();
  const timeStr = new Date().toLocaleTimeString("pt-BR");

  let direction: 'PLAYER' | 'BANKER' | 'TIE' | 'WAIT' | 'UNKNOWN' = 'UNKNOWN';
  let martingales = 0;
  let status: 'AGUARDANDO' | 'CONFIRMADA' | 'GREEN' | 'RED' | 'CANCELADO' = 'AGUARDANDO';

  // Identify Direction
  if (normalized.includes("player") || normalized.includes("jogador") || normalized.includes("azul") || normalized.includes("🔵")) {
    direction = "PLAYER";
  } else if (normalized.includes("banker") || normalized.includes("banqueiro") || normalized.includes("vermelho") || normalized.includes("🔴")) {
    direction = "BANKER";
  } else if (normalized.includes("empate") || normalized.includes("tie") || normalized.includes("amarelo") || normalized.includes("🟡")) {
    direction = "TIE";
  }

  // Identify Status based on message markers
  if (normalized.includes("verde") || normalized.includes("green") || normalized.includes("win") || normalized.includes("vitória") || normalized.includes("vitoria") || normalized.includes("✅") || normalized.includes("bateu")) {
    status = "GREEN";
  } else if (normalized.includes("red") || normalized.includes("derrota") || normalized.includes("loss") || normalized.includes("❌") || normalized.includes("não bateu")) {
    status = "RED";
  } else if (normalized.includes("cancelad") || normalized.includes("abortar") || normalized.includes("cancelar")) {
    status = "CANCELADO";
  } else if (normalized.includes("confirmada") || normalized.includes("entrar no") || normalized.includes("apostar")) {
    status = "CONFIRMADA";
  } else if (normalized.includes("atenção") || normalized.includes("atencao") || normalized.includes("analisando") || normalized.includes("preparar") || normalized.includes("fique atento")) {
    status = "AGUARDANDO";
    direction = direction !== "UNKNOWN" ? direction : "WAIT";
  }

  // Check GALE / Martingales level matching
  if (normalized.includes("gale 1") || normalized.includes("g1")) {
    martingales = 1;
  } else if (normalized.includes("gale 2") || normalized.includes("g2")) {
    martingales = 2;
  } else {
    martingales = 0;
  }

  return {
    direction,
    martingales,
    status,
    time: timeStr
  };
}

// Call Gemini if heuristic fails to determine a standard Bacbo signal
async function parseSignalWithGemini(text: string): Promise<ParsedSignal> {
  if (!ai) {
    return inspectSignalText(text); // Fallback to heuristic
  }

  try {
    const prompt = `Analise a mensagem de Telegram do jogo de cassino Bacbo (Player vs Banker, com dados) apresentada no final.
Extraia se é um sinal ativo, seu resultado ou cancelamento.
Escreva um JSON seguindo exatamente este esquema estruturado:
- direction: um dos valores "PLAYER" "BANKER" "TIE" "WAIT" (para alertas/analisando) "UNKNOWN"
- martingales: quantidade de martingales associado (0, 1 ou 2)
- status: um dos valores "AGUARDANDO" (alerta inicial ou novo sinal) "CONFIRMADA" "GREEN" "RED" "CANCELADO"

Texto das mensagens de cassino brasileiras costumam usar termos como:
- "Entrada confirmada", "🔵 Jogador", "🔴 Banqueiro"
- "Green ✅", "Vitória!", "Red ❌", "Sinal cancelado", "Analisando..."

Retorne apenas o JSON. Sem blocos markdown \`\`\`json ou outra coisa.

Mensagem para analisar:
"${text}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            direction: { type: Type.STRING, enum: ["PLAYER", "BANKER", "TIE", "WAIT", "UNKNOWN"] },
            martingales: { type: Type.INTEGER },
            status: { type: Type.STRING, enum: ["AGUARDANDO", "CONFIRMADA", "GREEN", "RED", "CANCELADO"] }
          },
          required: ["direction", "martingales", "status"]
        }
      }
    });

    const body = response.text ? JSON.parse(response.text.trim()) : null;
    if (body) {
      return {
        direction: body.direction,
        martingales: body.martingales || 0,
        status: body.status,
        time: new Date().toLocaleTimeString("pt-BR")
      };
    }
  } catch (err) {
    console.error("Gemini Parsing Error, falling back to heuristic:", err);
  }

  return inspectSignalText(text);
}

// Reusable function to parse, update and append messages chronologically or reverse-chronologically
async function processMessage(text: string, source?: string, timestampInput?: string): Promise<Signal> {
  // Parse details
  let parsed: ParsedSignal;
  const isSuspiciousUnknown = inspectSignalText(text).direction === 'UNKNOWN';

  if (isSuspiciousUnknown && ai) {
    console.log("Usando Inteligência Artificial (Gemini) para interpretar mensagem diferente...");
    parsed = await parseSignalWithGemini(text);
  } else {
    parsed = inspectSignalText(text);
  }

  // Assign the correct channel source
  parsed.source = source || (text.toUpperCase().includes("RQ") || text.toUpperCase().includes("DADOS") ? "Rqdados" : "FutebolStudio");

  // SE a mensagem indicar um resultado (GREEN ou RED ou CANCELADO)
  // Mas a direção estiver oculta, nós devemos herdar a direção do último sinal correspondente
  if ((parsed.status === "GREEN" || parsed.status === "RED" || parsed.status === "CANCELADO") &&
      (parsed.direction === "UNKNOWN" || parsed.direction === "WAIT")) {
    
    // Filter last active signal for the SAME source to avoid cross-channel mixups
    const lastActive = [...signals]
      .reverse()
      .find(s => s.parsed.source === parsed.source && (s.parsed.status === "AGUARDANDO" || s.parsed.status === "CONFIRMADA"));

    if (lastActive) {
      parsed.direction = lastActive.parsed.direction;
      // Update the previous signal status in the history to reflect active consolidated status
      lastActive.parsed.status = parsed.status;
      lastActive.parsed.martingales = parsed.martingales || lastActive.parsed.martingales;
    }
  }

  const newSignal: Signal = {
    id: "sig_" + Math.random().toString(36).substr(2, 9),
    timestamp: timestampInput || new Date().toISOString(),
    rawText: text,
    parsed: parsed
  };

  // Add to the list
  signals.unshift(newSignal);

  // Maintain state limits
  if (signals.length > 100) {
    signals.pop();
  }

  // Recalculate stats
  stats = calculateStats();
  return newSignal;
}

// Background sync with User's Firebase Realtime Database
const lastFetchedFirebase: Record<string, boolean> = {};
let isFirstFirebasePoll = true;

async function pollFirebaseRTDB() {
  try {
    const res = await fetch("https://fermagna-9f211-default-rtdb.firebaseio.com/telegram.json");
    if (!res.ok) return;
    const data: any = await res.json();
    if (!data) return;

    // Safely extract paths requested by the user
    const bacboData = data.bacbo?.americano?.Rqdados;
    const studioData = data.footstudio?.normal;

    // First background run: hydrate initial history safely without spamming
    if (isFirstFirebasePoll) {
      isFirstFirebasePoll = false;
      const initialHistory: { text: string; source: string; timestamp: string; key: string }[] = [];

      if (bacboData) {
        for (const [key, item] of Object.entries(bacboData as Record<string, any>)) {
          lastFetchedFirebase[key] = true;
          if (item && item.text) {
            initialHistory.push({ text: item.text, source: "Rqdados", timestamp: item.timestamp || new Date().toISOString(), key });
          }
        }
      }

      if (studioData) {
        for (const [key, item] of Object.entries(studioData as Record<string, any>)) {
          lastFetchedFirebase[key] = true;
          if (item && item.text) {
            initialHistory.push({ text: item.text, source: "FutebolStudio", timestamp: item.timestamp || new Date().toISOString(), key });
          }
        }
      }

      // Sort chronologically (oldest to newest) to process them properly in the array
      initialHistory.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Limit to last 20 for starter viewport so app runs lightning fast
      const starterKit = initialHistory.slice(-20);
      for (const item of starterKit) {
        await processMessage(item.text, item.source, item.timestamp);
      }
      console.log(`📡 Sincronização inicial concluída com sucesso: ${starterKit.length} predições resgatadas do Firebase Realtime Database!`);
      return;
    }

    // Subsequent runs: look for real-time changes
    let newSignalsCount = 0;

    // Check Bacbo / Rqdados entries
    if (bacboData) {
      for (const [key, item] of Object.entries(bacboData as Record<string, any>)) {
        if (!lastFetchedFirebase[key]) {
          lastFetchedFirebase[key] = true;
          if (item && item.text) {
            console.log(`🔥 Nova entrada @RQDADOS detectada no Firebase [Id: ${key}]`);
            await processMessage(item.text, "Rqdados", item.timestamp || new Date().toISOString());
            newSignalsCount++;
          }
        }
      }
    }

    // Check Football Studio normal entries
    if (studioData) {
      for (const [key, item] of Object.entries(studioData as Record<string, any>)) {
        if (!lastFetchedFirebase[key]) {
          lastFetchedFirebase[key] = true;
          if (item && item.text) {
            console.log(`🔥 Nova entrada Futebol Studio detectada no Firebase [Id: ${key}]`);
            await processMessage(item.text, "FutebolStudio", item.timestamp || new Date().toISOString());
            newSignalsCount++;
          }
        }
      }
    }

    if (newSignalsCount > 0) {
      console.log(`✅ Sincronizados +${newSignalsCount} sinais novos do Firebase Realtime Database!`);
    }

  } catch (err) {
    // Silent fail/retry to maintain uptime
  }
}

// Poll Firebase Realtime Database every 3 seconds for lightning-fast detection
setInterval(pollFirebaseRTDB, 3000);

// REST API Endpoints

// helper to clean and format telephone numbers
function cleanPhone(phone: string): string {
  if (!phone) return "";
  let clean = phone.replace(/[^\d+]/g, "");
  if (!clean.startsWith("+")) {
    clean = "+" + clean;
  }
  return clean;
}

// 0. Get custom app configuration from Firebase
app.get("/api/app-config", async (req, res) => {
  try {
    const response = await fetch("https://fermagna-9f211-default-rtdb.firebaseio.com/telegram.json");
    if (!response.ok) {
      throw new Error("Failed to fetch from Firebase");
    }
    const data: any = await response.json() || {};
    
    const config = data.config || {};
    const bacbo = data.bacbo || {};
    const footstudio = data.footstudio || {};

    // 1. Dialogue popup rendering parameter
    let dialogue = "";
    if (config.dialog !== undefined) {
      if (typeof config.dialog === "string") {
        dialogue = config.dialog;
      } else if (config.dialog && typeof config.dialog === "object") {
        dialogue = config.dialog.mensagem || config.dialog.text || "";
      }
    } else if (config.dialogo !== undefined) {
      if (typeof config.dialogo === "string") {
        dialogue = config.dialogo;
      }
    } else if (config["diálogo"] !== undefined) {
      if (typeof config["diálogo"] === "string") {
        dialogue = config["diálogo"];
      }
    }

    // 2. Profile picture / logo
    const appFoto = config.foto || "https://i.ibb.co/WWvnrxXN/images-22.webp";

    // 3. Maintenance mode (supports automatic timing check)
    let maintenance = false;
    let maintenanceMsg = "Estamos de manutenção temporária para atualização de instabilidade. Voltamos em breve!";
    if (config.manutencao !== undefined) {
      if (typeof config.manutencao === "boolean") {
        maintenance = config.manutencao;
      } else if (config.manutencao && typeof config.manutencao === "object") {
        maintenance = !!config.manutencao.ativo;
        if (config.manutencao.mensagem) {
          maintenanceMsg = config.manutencao.mensagem;
        }
        
        // Schedule auto-check
        const now = new Date().getTime();
        if (config.manutencao.dataInicio && config.manutencao.dataFim) {
          const start = new Date(config.manutencao.dataInicio).getTime();
          const end = new Date(config.manutencao.dataFim).getTime();
          if (!isNaN(start) && !isNaN(end)) {
            if (now >= start && now <= end) {
              maintenance = true;
            }
          }
        }
      }
    } else if (config["manuntenção"] !== undefined) {
      if (typeof config["manuntenção"] === "boolean") {
        maintenance = config["manuntenção"];
      }
    }

    // 4. Trial/Liberado mode for non-VIPs (supports automatic scheduled timing checks)
    let liberado = false;
    if (config.liberado !== undefined) {
      if (typeof config.liberado === "boolean") {
        liberado = config.liberado;
      } else if (config.liberado && typeof config.liberado === "object") {
        liberado = !!config.liberado.ativo;
        
        // Schedule check
        const now = new Date().getTime();
        if (config.liberado.dataInicio && config.liberado.dataFim) {
          const start = new Date(config.liberado.dataInicio).getTime();
          const end = new Date(config.liberado.dataFim).getTime();
          if (!isNaN(start) && !isNaN(end)) {
            if (now >= start && now <= end) {
              liberado = true;
            }
          }
        }
      }
    }
    
    res.json({
      adm: config.ADM || "+244942607599",
      maintenance,
      maintenanceMsg,
      dialogue,
      appFoto,
      liberado,
      bacboFoto: bacbo.foto || "https://i.ibb.co/WWvnrxXN/images-22.webp",
      footstudioFoto: footstudio.foto || "https://i.ibb.co/WWvnrxXN/images-22.webp"
    });
  } catch (error) {
    console.error("Error reading app config from Firebase:", error);
    res.json({
      adm: "+244942607599",
      maintenance: false,
      maintenanceMsg: "Estamos realizandos melhorias no servidor no momento. Retornaremos em instantes!",
      dialogue: "",
      appFoto: "https://i.ibb.co/WWvnrxXN/images-22.webp",
      liberado: false,
      bacboFoto: "https://i.ibb.co/WWvnrxXN/images-22.webp",
      footstudioFoto: "https://i.ibb.co/WWvnrxXN/images-22.webp"
    });
  }
});

// Register a new user
app.post("/api/register-user", async (req, res) => {
  try {
    const { nome, pais, telefone } = req.body;
    if (!nome || !pais || !telefone) {
      return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
    }

    const formattedPhone = cleanPhone(telefone);
    const isAdm = formattedPhone === "+244942607599";
    const isVip = isAdm ? true : false;
    const expireDate = isAdm ? "2099-12-31T23:59:59.000Z" : null;

    const userPayload = {
      nome,
      pais,
      telefone: formattedPhone,
      vip: isVip,
      dataExpiracao: expireDate,
      expireDate, // Legacy support
      plano: isAdm ? "vitalicio" : "30dias",
      status: isAdm ? "ativo" : "pendente"
    };

    // Save to Firebase Realtime Database - New path: users
    const urlUsers = `https://fermagna-9f211-default-rtdb.firebaseio.com/telegram/users/${encodeURIComponent(formattedPhone)}.json`;
    await fetch(urlUsers, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userPayload)
    });

    // Save to Firebase Realtime Database - Legacy path: usuarios
    const urlUsuarios = `https://fermagna-9f211-default-rtdb.firebaseio.com/telegram/usuarios/${encodeURIComponent(formattedPhone)}.json`;
    await fetch(urlUsuarios, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userPayload)
    });

    res.json({
      success: true,
      message: "Usuário cadastrado com sucesso!",
      user: userPayload
    });
  } catch (error: any) {
    console.error("Error during registration:", error);
    res.status(500).json({ error: error.message || "Erro interno de cadastro." });
  }
});

// Check if user is VIP
app.post("/api/check-user-vip", async (req, res) => {
  try {
    const { telefone } = req.body;
    if (!telefone) {
      return res.status(400).json({ error: "Telefone não fornecido." });
    }

    const formattedPhone = cleanPhone(telefone);
    const isAdm = formattedPhone === "+244942607599";

    // 1. Check newer root path "telegram/users"
    const urlUsers = `https://fermagna-9f211-default-rtdb.firebaseio.com/telegram/users/${encodeURIComponent(formattedPhone)}.json`;
    let response = await fetch(urlUsers);
    let data: any = null;
    if (response.ok) {
      data = await response.json();
    }

    // 2. Fallback check for older root path "telegram/usuarios"
    if (!data) {
      const urlUsuarios = `https://fermagna-9f211-default-rtdb.firebaseio.com/telegram/usuarios/${encodeURIComponent(formattedPhone)}.json`;
      const fallbackResponse = await fetch(urlUsuarios);
      if (fallbackResponse.ok) {
        data = await fallbackResponse.json();
      }
    }

    if (!data) {
      // User not found
      if (isAdm) {
        const dummyAdm = { 
          nome: "Administrador Supremo", 
          telefone: formattedPhone, 
          vip: true, 
          dataExpiracao: "2099-12-31T23:59:59.000Z", 
          expireDate: "2099-12-31T23:59:59.000Z",
          plano: "vitalicio",
          status: "ativo",
          pais: "Angola"
        };
        return res.json({ vip: true, user: dummyAdm });
      }
      return res.json({ vip: false, user: null });
    }

    // Determine current VIP status & check expiration time
    let vipStatus = !!data.vip;
    if (isAdm) vipStatus = true; // Always true for admin number

    // Reject outright if account status is "bloqueado"
    if (data.status === "bloqueado") {
      vipStatus = false;
    }

    // Expire check (either under new 'dataExpiracao' or legacy 'expireDate')
    const expirationValue = data.dataExpiracao || data.expireDate;
    if (vipStatus && expirationValue) {
      const expiration = new Date(expirationValue).getTime();
      const now = new Date().getTime();
      if (!isNaN(expiration) && expiration < now) {
        vipStatus = false; // Expired
      }
    }

    res.json({
      vip: vipStatus,
      user: data
    });
  } catch (error: any) {
    console.error("Error checking VIP status:", error);
    res.status(500).json({ error: error.message || "Erro ao verificar acesso." });
  }
});

// 1. Get current list of signals and latest stats
app.get("/api/signals", (req, res) => {
  res.json({
    signals,
    stats: calculateStats(),
    isGeminiActive: !!ai
  });
});

// 2. Telegram webhook input endpoint (receives messages automatically as backup/fallback)
app.post("/api/telegram-webhook", async (req, res) => {
  const { text, source } = req.body;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Campo 'text' é obrigatório e precisa ser do tipo string." });
  }

  console.log("Recebida mensagem do Telegram via Webhook:", text, "Source:", source);
  const newSignal = await processMessage(text, source);

  res.json({
    success: true,
    message: "Sinal processado e adicionado!",
    newSignal,
    stats
  });
});

// 3. Clear all signals / Reset Simulation
app.post("/api/clear", (req, res) => {
  signals = [
    {
      id: "sig_initial_studio",
      timestamp: new Date().toISOString(),
      rawText: "🔄 Histórico limpo. Prontos para receber novas predições do Futebol Studio...",
      parsed: { direction: "WAIT", martingales: 0, status: "AGUARDANDO", time: new Date().toLocaleTimeString("pt-BR"), source: "FutebolStudio" }
    },
    {
      id: "sig_initial_rq",
      timestamp: new Date().toISOString(),
      rawText: "🔄 Histórico limpo. Prontos para receber novas predições do BacBo...",
      parsed: { direction: "WAIT", martingales: 0, status: "AGUARDANDO", time: new Date().toLocaleTimeString("pt-BR"), source: "Rqdados" }
    }
  ];
  stats = calculateStats();
  res.json({ success: true, signals, stats });
});

// Configure Vite middleware or static server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Bacbo Server rodando com sucesso no endereço http://localhost:${PORT}`);
  });
}

startServer();
