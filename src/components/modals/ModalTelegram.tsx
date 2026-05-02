"use client";

import { useState, useEffect } from "react";
import ModalOverlay, { ModalClose, ModalTitle } from "../ModalOverlay";

interface Props {
  open: boolean;
  onClose: () => void;
}

type View = "loading" | "disconnected" | "connected" | "analyzing" | "result";

interface TelegramChat {
  chatId: number;
  chatName: string;
  lastMessage: string;
  date: string;
}

export default function ModalTelegram({ open, onClose }: Props) {
  const [view, setView] = useState<View>("loading");
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [botToken, setBotToken] = useState("");
  const [chats, setChats] = useState<TelegramChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<TelegramChat | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [msgCount, setMsgCount] = useState(0);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);

  useEffect(() => {
    if (!open) return;
    setView("loading");
    setError("");
    fetch("/api/telegram/status")
      .then(r => r.json())
      .then(d => {
        if (d.connected) {
          setBotUsername(d.botUsername);
          setView("connected");
          loadChats();
        } else {
          setView("disconnected");
        }
      })
      .catch(() => setView("disconnected"));
  }, [open]);

  async function loadChats() {
    setLoadingChats(true);
    try {
      const res = await fetch("/api/telegram/messages");
      const data = await res.json();
      if (res.ok) setChats(data.messages || []);
    } catch { /* ignore */ }
    setLoadingChats(false);
  }

  function handleClose() {
    setView("loading");
    setBotToken("");
    setAnalysis("");
    setError("");
    setSelectedChat(null);
    setChats([]);
    setConnecting(false);
    onClose();
  }

  async function handleConnect() {
    if (!botToken.trim()) {
      setError("Inserisci il Bot Token");
      return;
    }
    setConnecting(true);
    setError("");
    try {
      const res = await fetch("/api/telegram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken: botToken.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Errore connessione"); setConnecting(false); return; }
      setBotUsername(data.botUsername);
      setView("connected");
      loadChats();
    } catch {
      setError("Errore di connessione");
    }
    setConnecting(false);
  }

  async function handleDisconnect() {
    await fetch("/api/telegram/connect", { method: "DELETE" });
    setBotUsername(null);
    setChats([]);
    setView("disconnected");
  }

  async function handleAnalyzeChat(chat: TelegramChat) {
    setSelectedChat(chat);
    setView("analyzing");
    setError("");
    try {
      const res = await fetch("/api/telegram/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: chat.chatId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Errore analisi"); setView("connected"); return; }
      setAnalysis(data.analysis);
      setMsgCount(data.count);
      setView("result");
    } catch {
      setError("Errore di connessione");
      setView("connected");
    }
  }

  return (
    <ModalOverlay open={open} onClose={handleClose}>
      <div className="p-7 max-h-[85vh] overflow-y-auto">
        <ModalClose onClose={handleClose} />

        {view === "loading" && (
          <div className="py-12 text-center">
            <div className="text-[13px] text-[#6B6763]">Connessione in corso...</div>
          </div>
        )}

        {view === "disconnected" && (
          <div>
            <ModalTitle>Telegram Bot</ModalTitle>
            <div className="mt-4 text-[13px] text-[#6B6763] leading-[1.6]">
              Connetti il tuo bot Telegram per analizzare le conversazioni.
              NormaAI identificherà aspetti legali e scadenze nei messaggi.
            </div>

            <div className="mt-5 p-4 rounded-xl border border-[#E5E1D8] bg-white">
              <div className="flex items-start gap-3">
                <div className="text-[18px] mt-[1px]">🔒</div>
                <div>
                  <div className="text-[12px] font-semibold text-[#6B6763] mb-1">Privacy first</div>
                  <div className="text-[11px] text-[#6B6763] leading-[1.5]">
                    Analizziamo solo i messaggi del bot che configuri. Nessun dato viene salvato.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="text-[10px] uppercase tracking-[0.06em] text-[#7A766F] mb-[6px]">
                Bot Token (da @BotFather)
              </div>
              <input
                type="password"
                placeholder="Incolla il token da @BotFather"
                value={botToken}
                onChange={e => setBotToken(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleConnect()}
                className="w-full bg-white border border-[#222] rounded-lg px-3 py-[10px] text-[13px] text-[#3D3A37] outline-none focus:border-[#D5D0C8] placeholder:text-[#333]"
              />
            </div>

            {error && <div className="mt-2 text-[12px] text-red-400">{error}</div>}

            <button
              onClick={handleConnect}
              disabled={connecting}
              className="mt-6 w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-[#D5D0C8] bg-white text-[#333] font-semibold text-[13px] cursor-pointer hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              {connecting ? "Connessione..." : "Connetti Telegram"}
            </button>

            <div className="mt-4 text-[10px] text-[#7A766F] leading-[1.5]">
              Crea un bot su Telegram con{" "}
              <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                @BotFather
              </a>{" "}
              e incolla qui il token ricevuto.
            </div>
          </div>
        )}

        {(view === "connected" || view === "analyzing") && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <ModalTitle>Analisi Telegram</ModalTitle>
              {botUsername && (
                <span className="ml-auto text-[10px] text-[#7A766F] bg-[#161616] border border-[#E5E1D8] px-2 py-[3px] rounded-md truncate max-w-[140px]">
                  @{botUsername}
                </span>
              )}
            </div>

            <div className="text-[12px] text-[#6B6763] mb-4 leading-[1.5]">
              Seleziona una conversazione da analizzare. NormaAI rileverà
              aspetti legali, obblighi e scadenze rilevanti.
            </div>

            {error && <div className="mb-3 text-[12px] text-red-400">{error}</div>}

            {loadingChats ? (
              <div className="py-8 text-center text-[12px] text-[#6B6763]">Caricamento chat...</div>
            ) : chats.length === 0 ? (
              <div className="py-6 text-center">
                <div className="text-[12px] text-[#6B6763] mb-2">Nessuna chat trovata</div>
                <div className="text-[10px] text-[#7A766F]">
                  Invia un messaggio al bot per iniziare una conversazione
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {chats.map(chat => (
                  <button
                    key={chat.chatId}
                    onClick={() => handleAnalyzeChat(chat)}
                    disabled={view === "analyzing"}
                    className="w-full text-left p-3 rounded-xl border border-[#E5E1D8] bg-white hover:border-[#D5D0C8] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[13px] text-[#3D3A37] font-medium truncate">
                        {chat.chatName}
                      </div>
                      <div className="text-[10px] text-[#7A766F] shrink-0 ml-2">
                        {chat.date}
                      </div>
                    </div>
                    <div className="text-[11px] text-[#6B6763] truncate">
                      {chat.lastMessage}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {view === "analyzing" && (
              <div className="mt-4 flex items-center justify-center gap-2 text-[13px] text-accent">
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Analisi in corso...
              </div>
            )}

            <button
              onClick={() => loadChats()}
              disabled={loadingChats || view === "analyzing"}
              className="mt-4 w-full bg-white text-[#6B6763] font-medium text-[12px] py-[8px] rounded-xl border border-[#222] cursor-pointer hover:border-[#D5D0C8] transition-colors disabled:opacity-50"
            >
              Aggiorna chat
            </button>

            <button
              onClick={handleDisconnect}
              className="mt-3 w-full text-[11px] text-[#7A766F] hover:text-[#6B6763] bg-transparent border-none cursor-pointer transition-colors"
            >
              Disconnetti Telegram
            </button>
          </div>
        )}

        {view === "result" && (
          <div>
            <button
              onClick={() => { setView("connected"); loadChats(); }}
              className="flex items-center gap-2 text-[11px] text-[#6B6763] mb-5 hover:text-[#6B6763] transition-colors bg-transparent border-none cursor-pointer p-0"
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none stroke-[2]">
                <polyline points="15,18 9,12 15,6"/>
              </svg>
              Nuova analisi
            </button>

            <div className="flex items-center gap-3 mb-5">
              <ModalTitle>Analisi completata</ModalTitle>
              <span className="ml-auto text-[10px] text-[#7A766F] shrink-0">
                {msgCount} messaggi analizzati
              </span>
            </div>

            <div className="text-[10px] uppercase tracking-[0.06em] text-[#7A766F] mb-2">
              {selectedChat?.chatName}
            </div>

            <div className="p-4 rounded-xl border border-[#E5E1D8] bg-[#FAFAF8]">
              <div className="text-[13px] text-[#7A766F] leading-[1.7] whitespace-pre-wrap">
                {analysis.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                  part.startsWith("**") && part.endsWith("**")
                    ? <strong key={i} className="text-[#ddd] font-semibold">{part.slice(2, -2)}</strong>
                    : part
                )}
              </div>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(analysis).catch(() => {});
              }}
              className="mt-4 text-[11px] text-[#7A766F] hover:text-accent transition-colors bg-transparent border-none cursor-pointer p-0"
            >
              Copia analisi
            </button>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
