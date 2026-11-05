"use client";

import React, { useState } from "react";
import { Sparkles, X, Copy, Check, Send, RefreshCw, Wand2 } from "lucide-react";

interface ImproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToChat?: (improvedText: string) => void;
}

const STYLES = [
  { id: "more_affectionate", label: "🥰 More Affectionate", desc: "Adds genuine love, warmth, and intimacy" },
  { id: "sweeter", label: "🍯 Sweeter & Caring", desc: "Makes tone softer, attentive, and considerate" },
  { id: "funnier", label: "😂 Funnier & Playful", desc: "Adds wit, light teasing, and playful banter" },
  { id: "shorter", label: "✂️ Shorter & Punchy", desc: "Cleans up extra words for a natural, snappy text" },
  { id: "longer", label: "📝 More Depth", desc: "Expands on feelings with thoughtful detail" },
  { id: "more_natural", label: "✨ Sound Like Me", desc: "Matches your saved communication profile" },
];

export function ImproveModal({ isOpen, onClose, onSendToChat }: ImproveModalProps) {
  const [draft, setDraft] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("more_affectionate");
  const [improved, setImproved] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImprove = async () => {
    if (!draft.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/improve-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: draft,
          styleId: selectedStyle,
        }),
      });

      const data: any = await res.json();
      if (data.improved) {
        setImproved(data.improved);
      } else {
        setError("Unable to improve message. Please check your connection.");
      }
    } catch (e: any) {
      setError(e.message || "Failed to connect.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!improved) return;
    try {
      await navigator.clipboard.writeText(improved);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white border border-pink-200 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[90dvh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom)]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-pink-100 flex items-center justify-between bg-gradient-to-r from-pink-50/60 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-romantic-500 to-rose-400 flex items-center justify-center text-white shadow-xs">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900">
                Polish & Improve Message
              </h3>
              <p className="text-xs text-gray-500">Fine-tune your text before sending to Amelia</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-pink-50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">
              Your Draft Message:
            </label>
            <textarea
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Paste or write what you're thinking of sending Amelia..."
              className="w-full text-sm text-gray-900 p-3 rounded-2xl border border-pink-200 focus:outline-none focus:border-romantic-500 resize-none transition"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">
              Choose Tone / Style:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedStyle(s.id)}
                  className={`p-2.5 rounded-xl text-left border transition text-xs ${
                    selectedStyle === s.id
                      ? "bg-pink-100/70 border-romantic-400 text-romantic-800 font-bold shadow-xs"
                      : "bg-white border-pink-100 hover:bg-pink-50 text-gray-700"
                  }`}
                >
                  <div className="truncate">{s.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleImprove}
            disabled={!draft.trim() || loading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-romantic-500 to-rose-400 hover:from-romantic-600 hover:to-rose-500 text-white font-bold text-xs shadow-md shadow-pink-300 disabled:opacity-40 transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Polishing message...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Polish This Message</span>
              </>
            )}
          </button>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          {improved && (
            <div className="p-4 rounded-2xl bg-pink-50 border border-pink-200 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-romantic-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-romantic-500" />
                  Polished Version:
                </span>
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded-xl bg-white border border-pink-200 text-romantic-700 font-semibold text-xs transition flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
              </div>

              <p className="text-sm text-gray-900 leading-relaxed font-medium bg-white p-3 rounded-xl border border-pink-100">
                "{improved}"
              </p>

              <button
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("amelia-insert-prompt", {
                      detail: { prompt: `I'm thinking of texting Amelia this message: "${improved}". What do you think, and should I send it now?` },
                    })
                  );
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-white hover:bg-pink-100 border border-pink-200 text-romantic-700 font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ask Amelia AI About This Text</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
