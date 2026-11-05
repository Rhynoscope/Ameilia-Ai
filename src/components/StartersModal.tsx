"use client";

import React, { useState } from "react";
import { Sparkles, X, MessageSquare, Copy, Check, Send } from "lucide-react";

interface StartersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStarter?: (prompt: string) => void;
}

const CATEGORIES = [
  { id: "all", label: "All Starters" },
  { id: "sweet", label: "Sweet & Affectionate" },
  { id: "playful", label: "Fun & Playful" },
  { id: "deep", label: "Deep & Meaningful" },
  { id: "quiet", label: "Restart Quiet Chat" },
  { id: "morning_night", label: "Morning & Night" },
];

const STARTERS = [
  {
    category: "sweet",
    title: "Genuine 'thinking of you' text",
    prompt: "I want to send Amelia a genuine, warm text letting her know she's on my mind today across the distance. Give me 4 varied, natural options.",
    preview: "Give me 4 natural texts to tell Amelia she's on my mind today.",
  },
  {
    category: "sweet",
    title: "I miss her without being sad",
    prompt: "I miss Amelia a lot today. Give me 4 sweet texts that bridge the distance and make her smile without feeling heavy or sad.",
    preview: "Give me 4 sweet texts to express how much I miss her.",
  },
  {
    category: "playful",
    title: "Fun 'Would You Rather' debate",
    prompt: "Give me 4 fun, unique 'Would you rather' questions tailored for long-distance couples that will spark a playful, laughing debate.",
    preview: "4 playful couple 'Would You Rather' questions for Amelia.",
  },
  {
    category: "playful",
    title: "Hypothetical teleportation scenario",
    prompt: "Give me 3 cute hypothetical scenarios to text Amelia (e.g., 'If we could teleport anywhere for just 2 hours tonight, where are we going?').",
    preview: "Hypothetical teleportation date scenario to text her.",
  },
  {
    category: "deep",
    title: "Favorite shared memory reflection",
    prompt: "Help me craft a text reminiscing about one of our favorite trips/moments together that will bring back warm memories for Amelia.",
    preview: "Reminiscing about our favorite shared memories together.",
  },
  {
    category: "deep",
    title: "Ask about her dreams or goals",
    prompt: "Give me 3 thoughtful, non-cliché questions I can ask Amelia about her week, her passions, or what she's looking forward to.",
    preview: "Thoughtful questions about her passions and goals.",
  },
  {
    category: "quiet",
    title: "Smooth conversation restart",
    prompt: "Our texts have slowed down or paused today. Give me 4 effortless, zero-pressure ways to restart our chat naturally.",
    preview: "4 zero-pressure ways to smoothly revive our texting rhythm.",
  },
  {
    category: "quiet",
    title: "Random interesting observation",
    prompt: "Give me 3 casual, authentic conversation sparkers based on seeing something random during the day that reminded me of her.",
    preview: "Authentic 'this reminded me of you' texting sparkers.",
  },
  {
    category: "morning_night",
    title: "Sweet good morning across time zones",
    prompt: "Give me 4 uplifting, warm good morning messages for Amelia that take into account our long-distance morning routine.",
    preview: "4 uplifting good morning messages tailored for long-distance.",
  },
  {
    category: "morning_night",
    title: "Comforting good night message",
    prompt: "Give me 3 sweet, comforting good night texts to send Amelia before falling asleep, wishing her sweet dreams across the miles.",
    preview: "Comforting good night texts wishing her sweet dreams.",
  },
];

export function StartersModal({ isOpen, onClose, onSelectStarter }: StartersModalProps) {
  const [selectedCat, setSelectedCat] = useState("all");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (!isOpen) return null;

  const filtered =
    selectedCat === "all" ? STARTERS : STARTERS.filter((s) => s.category === selectedCat);

  const handleCopy = async (idx: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white border border-pink-200 rounded-t-3xl sm:rounded-3xl max-w-xl w-full max-h-[90dvh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom)]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-pink-100 flex items-center justify-between bg-gradient-to-r from-pink-50/60 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-romantic-500 to-rose-400 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900">
                Conversation Starters
              </h3>
              <p className="text-xs text-gray-500">Spark engaging, loving chats with Amelia</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-pink-50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 p-3 overflow-x-auto no-scrollbar border-b border-pink-100 bg-pink-50/30">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedCat === c.id
                  ? "bg-white text-romantic-700 shadow-xs border border-pink-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* List of Starters */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-white border border-pink-100 hover:border-pink-300 shadow-xs hover:shadow-sm transition-all space-y-2 group"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs font-bold text-gray-900 group-hover:text-romantic-600 transition-colors">
                  {item.title}
                </h4>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-pink-50 text-romantic-600 border border-pink-100 shrink-0">
                  {item.category.replace("_", " ")}
                </span>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">{item.preview}</p>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-pink-50">
                <button
                  onClick={() => handleCopy(idx, item.prompt)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-gray-600 hover:bg-pink-50 hover:text-romantic-600 transition flex items-center gap-1"
                >
                  {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIdx === idx ? "Copied" : "Copy"}</span>
                </button>

                <button
                  onClick={() => {
                    if (onSelectStarter) onSelectStarter(item.prompt);
                    else {
                      // Dispatch custom event to trigger send in page
                      window.dispatchEvent(
                        new CustomEvent("amelia-insert-prompt", { detail: { prompt: item.prompt } })
                      );
                    }
                    onClose();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-romantic-500 hover:bg-romantic-600 text-white font-bold text-xs shadow-xs transition flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Ask Amelia AI</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
