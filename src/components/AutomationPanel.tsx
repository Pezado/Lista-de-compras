import { useState } from "react";
import { Terminal, Copy, Check, Radio, Code } from "lucide-react";

export default function AutomationPanel({ webhookUrl }: { webhookUrl: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"python" | "node">("python");
  const [scriptChoice, setScriptChoice] = useState<"multichat" | "futebol" | "bacbo">("multichat");

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getPythonScript = () => {
    if (scriptChoice === "futebol") {
      return `import datetime
from telethon import TelegramClient, events
import requests

# CONFIGURAÇÃO DO MONITOR - SINAIS FUTEBOL STUDIO
API_ID = 37119949                           # Obtenha em my.telegram.org
API_HASH = 'a57757f2d2e5c2fcda1ab5fa5c62b208' # Obtenha em my.telegram.org
CHAT_STUDIO = -1001773655378                # ID do canal robofootballstudiofree

# DESTINO NO FIREBASE REALTIME DATABASE
FIREBASE_URL = "https://fermagna-9f211-default-rtdb.firebaseio.com/telegram/footstudio/normal.json"

client = TelegramClient('sessao_studio_normal', API_ID, API_HASH)

@client.on(events.NewMessage(chats=CHAT_STUDIO))
async def handler(event):
    mensagem_texto = event.message.message
    if not mensagem_texto:
        return
        
    print(f"🎲 Sinal futebol studio detectado: {mensagem_texto[:50]}...")
    
    try:
        timestamp = datetime.datetime.utcnow().isoformat() + "Z"
        response = requests.post(
            FIREBASE_URL,
            json={"text": mensagem_texto, "timestamp": timestamp},
            timeout=5
        )
        if response.status_code == 200:
            print("✅ Gravado com sucesso no Firebase!")
        else:
            print(f"❌ Erro ao enviar ao Firebase. Código: {response.status_code}")
    except Exception as e:
        print(f"💥 Falha de conexão com Firebase: {e}")

print("⚡ Monitor do canal @robofootballstudiofree ativado com gravação direta no Firebase...")
client.start()
client.run_until_disconnected()`;
    }

    if (scriptChoice === "bacbo") {
      return `import datetime
from telethon import TelegramClient, events
import requests

# CONFIGURAÇÃO DO MONITOR - RQDADOS BACBO
API_ID = 37119949                           # Obtenha em my.telegram.org
API_HASH = 'a57757f2d2e5c2fcda1ab5fa5c62b208' # Obtenha em my.telegram.org
CHAT_BACBO = -1001641487593                 # ID do canal @RQDADOS

# DESTINO NO FIREBASE REALTIME DATABASE
FIREBASE_URL = "https://fermagna-9f211-default-rtdb.firebaseio.com/telegram/bacbo/americano/Rqdados.json"

client = TelegramClient('sessao_bacbo_rq', API_ID, API_HASH)

@client.on(events.NewMessage(chats=CHAT_BACBO))
async def handler(event):
    mensagem_texto = event.message.message
    if not mensagem_texto:
        return
        
    print(f"🎮 Sinal Bacbo Rqdados detectado: {mensagem_texto[:50]}...")
    
    try:
        timestamp = datetime.datetime.utcnow().isoformat() + "Z"
        response = requests.post(
            FIREBASE_URL,
            json={"text": mensagem_texto, "timestamp": timestamp},
            timeout=5
        )
        if response.status_code == 200:
            print("✅ Gravado com sucesso no Firebase!")
        else:
            print(f"❌ Erro ao enviar ao Firebase. Código: {response.status_code}")
    except Exception as e:
        print(f"💥 Falha de conexão com Firebase: {e}")

print("⚡ Monitor do canal @RQDADOS ativado com gravação direta no Firebase...")
client.start()
client.run_until_disconnected()`;
    }

    // Default: multichat
    return `import datetime
from telethon import TelegramClient, events
import requests

# CONFIGURAÇÃO DO MONITOR - INTEGRADO MULTICANAIS
API_ID = 37119949                           # Obtenha em my.telegram.org
API_HASH = 'a57757f2d2e5c2fcda1ab5fa5c62b208' # Obtenha em my.telegram.org

# MAPEAMENTO DE CHATS DE ORIGEM PARA OS CAMINHOS EXATOS NO FIREBASE
CHATS_MONITORADOS = {
    -1001641487593: "bacbo/americano/Rqdados",
    -1001773655378: "footstudio/normal",
}

BASE_FIREBASE_URL = "https://fermagna-9f211-default-rtdb.firebaseio.com/telegram"

client = TelegramClient('sessao_multicanal_fb', API_ID, API_HASH)

@client.on(events.NewMessage(chats=list(CHATS_MONITORADOS.keys())))
async def handler(event):
    mensagem_texto = event.message.message
    if not mensagem_texto:
        return
        
    chat_id = event.chat_id
    path = CHATS_MONITORADOS.get(chat_id, "bacbo/americano/Rqdados")
    
    print(f"📡 Sinal capturado no chat {chat_id} -> Rota Firebase: {path}")
    
    try:
        url = f"{BASE_FIREBASE_URL}/{path}.json"
        timestamp = datetime.datetime.utcnow().isoformat() + "Z"
        response = requests.post(
            url,
            json={"text": mensagem_texto, "timestamp": timestamp},
            timeout=5
        )
        if response.status_code == 200:
            print(f"✅ Gravado no nó [{path}] do Firebase com sucesso!")
        else:
            print(f"❌ Erro ao salvar dados no Firebase. Código: {response.status_code}")
    except Exception as e:
        print(f"💥 Falha de rede com o Firebase: {e}")

print("⚡ Monitor Multicanais Ativo! Capturando sinais e gravando no Firebase em tempo real...")
client.start()
client.run_until_disconnected()`;
  };

  const getNodeScript = () => {
    return `import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import input from "input";
import fetch from "node-fetch";

const apiId = 37119949; 
const apiHash = "a57757f2d2e5c2fcda1ab5fa5c62b208"; 
const stringSession = new StringSession(""); 

// Mapeamento dos novos chats de origem às rotas especificadas no Firebase Realtime Database
const CHATS_MAP = {
  "-1001641487593": "bacbo/americano/Rqdados",
  "-1001773655378": "footstudio/normal"
};

const BASE_FIREBASE_URL = "https://fermagna-9f211-default-rtdb.firebaseio.com/telegram";

(async () => {
  console.log("Iniciando conexão multicanais para Firebase...");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text("Digite seu telefone com DDI (+55... ou +244...):"),
    password: async () => await input.text("Senha de 2 fatores se ativa:"),
    phoneCode: async () => await input.text("Código de login do Telegram:"),
  });

  console.log("💾 Conexão bem-sucedida! Sessão persistida.");

  client.addEventHandler(async (event) => {
    const message = event.message;
    if (message && message.peerId && message.message) {
      const channelId = message.peerId.channelId?.toString() || message.peerId.chatId?.toString();
      
      const matchedKey = Object.keys(CHATS_MAP).find(k => k.includes(channelId) || channelId.includes(k.replace("-100", "")));
      
      if (matchedKey) {
        const path = CHATS_MAP[matchedKey];
        console.log(\`👉 Nova mensagem capturada do [\${path.toUpperCase()}]! Sincronizando...\`);
        
        try {
          const timestamp = new Date().toISOString();
          await fetch(\`\${BASE_FIREBASE_URL}/\${path}.json\`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: message.message, timestamp })
          });
          console.log("✅ Gravado com sucesso no Firebase Realtime Database!");
        } catch (err) {
          console.error("❌ Falha ao se conectar com o Firebase:", err.message);
        }
      }
    }
  });

  console.log("🚀 Monitor multicanal NodeJS ativo direcionado ao Firebase!");
})();`;
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden" id="telegram-automation-panel">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-4 border-b border-gray-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            Scripts de Captura & Envio (Termux / Linux / VPS)
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Execute os códigos abaixo para salvar as predições do Telegram de forma 100% automatizada no Firebase.
          </p>
        </div>

        <div className="flex gap-2 mt-4 md:mt-0 bg-[#1f2937] p-1 rounded-lg border border-gray-700">
          <button
            onClick={() => setActiveTab("python")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "python" ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/25" : "text-gray-400 hover:text-white"
            }`}
            id="tab-python"
          >
            <Code className="w-3.5 h-3.5 inline mr-1" /> Python script
          </button>
          <button
            onClick={() => setActiveTab("node")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "node" ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/25" : "text-gray-400 hover:text-white"
            }`}
            id="tab-node"
          >
            <Terminal className="w-3.5 h-3.5 inline mr-1" /> NodeJS script
          </button>
        </div>
      </div>

      {activeTab === "python" && (
        <div className="space-y-4">
          <div className="flex flex-wrap border-b border-gray-800/80 mb-2 gap-3 pb-2.5">
            <button
              onClick={() => setScriptChoice("multichat")}
              className={`text-xs pb-1 px-1.5 font-bold transition-all border-b-2 cursor-pointer ${
                scriptChoice === "multichat" ? "text-cyan-400 border-cyan-400 font-extrabold" : "text-gray-400 border-transparent hover:text-white"
              }`}
            >
              🔄 Multi-Canais Integrado (Sincroniza Ambos)
            </button>
            <button
              onClick={() => setScriptChoice("futebol")}
              className={`text-xs pb-1 px-1.5 font-bold transition-all border-b-2 cursor-pointer ${
                scriptChoice === "futebol" ? "text-emerald-400 border-emerald-400 font-extrabold" : "text-gray-400 border-transparent hover:text-white"
              }`}
            >
              🎲 Só Futebol Studio (@robofootballstudiofree)
            </button>
            <button
              onClick={() => setScriptChoice("bacbo")}
              className={`text-xs pb-1 px-1.5 font-bold transition-all border-b-2 cursor-pointer ${
                scriptChoice === "bacbo" ? "text-cyan-500 border-cyan-500 font-extrabold" : "text-gray-400 border-transparent hover:text-white"
              }`}
            >
              🎮 Só BacBo (@RQDADOS)
            </button>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-emerald-400 font-mono">
              {scriptChoice === "multichat" ? "telegram_to_firebase_multi.py" : scriptChoice === "futebol" ? "telegram_studio.py" : "telegram_rqdados.py"}
            </span>
            <button
              onClick={() => copyToClipboard(getPythonScript(), "python")}
              className="text-gray-400 hover:text-white text-xs flex items-center gap-1.5 cursor-pointer bg-gray-900 border border-gray-800 px-2.5 py-1 rounded"
              id="copy-python-code-btn"
            >
              {copied === "python" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied === "python" ? "Copiado!" : "Copiar Script"}
            </button>
          </div>
          <pre className="bg-gray-950 p-4 rounded-xl text-[11px] font-mono text-gray-300 overflow-x-auto max-h-80 border border-gray-800 leading-relaxed">
            <code>{getPythonScript()}</code>
          </pre>
          <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-300">
            <span>ℹ️</span>
            <span>Instale as dependências executando: <code className="bg-gray-900 px-1 py-0.5 rounded text-white text-[10px]">pip install telethon requests</code></span>
          </div>
        </div>
      )}

      {activeTab === "node" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-emerald-400 font-mono">telegram_to_firebase.ts</span>
            <button
              onClick={() => copyToClipboard(getNodeScript(), "node")}
              className="text-gray-400 hover:text-white text-xs flex items-center gap-1.5 cursor-pointer bg-gray-900 border border-gray-800 px-2.5 py-1 rounded"
              id="copy-node-code-btn"
            >
              {copied === "node" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied === "node" ? "Copiado!" : "Copiar Script"}
            </button>
          </div>
          <pre className="bg-gray-950 p-4 rounded-xl text-[11px] font-mono text-gray-300 overflow-x-auto max-h-80 border border-gray-800 leading-relaxed">
            <code>{getNodeScript()}</code>
          </pre>
          <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-300">
            <span>ℹ️</span>
            <span>Instale no projeto executando: <code className="bg-gray-900 px-1 py-0.5 rounded text-white text-[10px]">npm install telegram node-fetch input</code></span>
          </div>
        </div>
      )}
    </div>
  );
}
