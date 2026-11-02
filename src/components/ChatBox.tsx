import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Sparkles, Smile, ShieldAlert } from 'lucide-react';
import { ChatMessage, Player } from '../game/types';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  localPlayer: Player;
  isOnlineRoom?: boolean;
}

const QUICK_CHIPS = [
  '⚠️ Awas TAHAN!',
  '🎯 Siap-siap tutup!',
  '🃏 Ada Joker?',
  '🔥 Mantap!',
  '👀 Jangan buang ke kanan!',
  '🙏 Jangan ditutup dulu!',
];

export const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  onSendMessage,
  localPlayer,
  isOnlineRoom = false,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText('');
  };

  const handleQuickChip = (chipText: string) => {
    onSendMessage(chipText);
  };

  const formatTime = (ts: number) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div
      aria-label="Kotak Obrolan Meja"
      className="flex flex-col h-full bg-slate-950/90 border border-emerald-900/40 rounded-xl p-3 shadow-xl backdrop-blur-md text-slate-100 overflow-hidden"
    >
      {/* Chat Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-900/60">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-black tracking-wide text-emerald-300 uppercase">
            Live Chat Meja
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-slate-400 font-medium">
            {isOnlineRoom ? 'Online Antar-Perangkat' : 'Lokal / Bot'}
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[120px] max-h-[220px] scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-3 text-slate-500 text-xs italic">
            <MessageSquare className="w-6 h-6 mb-1 text-slate-600 opacity-60" />
            <span>Belum ada pesan obrolan.</span>
            <span className="text-[10px] text-slate-600 mt-0.5">
              Kirim pesan atau gunakan tombol cepat di bawah!
            </span>
          </div>
        ) : (
          messages.map((msg) => {
            const isLocal = msg.senderId === localPlayer.id;
            const isSystem = msg.senderId === 'system';

            if (isSystem) {
              return (
                <div
                  key={msg.id}
                  className="px-2 py-1 rounded-md bg-amber-950/60 border border-amber-600/40 text-[10px] text-amber-200 text-center font-semibold"
                >
                  {msg.text}
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex gap-1.5 items-start ${isLocal ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <span className="text-sm shrink-0" role="img" aria-label="avatar">
                  {msg.senderAvatar || '👤'}
                </span>
                <div
                  className={`flex flex-col max-w-[80%] rounded-lg px-2.5 py-1 text-xs shadow-xs ${
                    isLocal
                      ? 'bg-emerald-700/80 text-white rounded-tr-none'
                      : 'bg-slate-900 border border-slate-700/70 text-slate-200 rounded-tl-none'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[9px] mb-0.5 text-slate-300/80">
                    <span className="font-bold truncate">
                      {isLocal ? 'Anda' : msg.senderName}
                    </span>
                    <span className="font-mono text-[8px] opacity-75">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className="break-words font-medium leading-relaxed">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Chips for rapid Indonesian card banter */}
      <div className="flex items-center gap-1 overflow-x-auto py-1.5 border-t border-slate-800/80 scrollbar-none">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => handleQuickChip(chip)}
            className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-900 hover:bg-emerald-950 hover:text-emerald-300 text-slate-300 border border-slate-700/70 hover:border-emerald-600/60 transition-colors cursor-pointer"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Field & Send Button */}
      <form onSubmit={handleSend} className="flex items-center gap-1.5 pt-1.5 border-t border-slate-800">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ketik pesan untuk pemain..."
          maxLength={100}
          className="flex-1 bg-slate-900/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          aria-label="Kirim Pesan"
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            inputText.trim()
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
