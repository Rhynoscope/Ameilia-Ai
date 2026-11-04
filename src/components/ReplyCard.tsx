"use client";

import React, { useState } from "react";
import { SuggestedReply } from "@/lib/types";
import { Check, Copy, Sparkles, RefreshCw, Scissors, AlignLeft, Laugh, Heart, Smile } from "lucide-react";

interface ReplyCardProps {
  reply: SuggestedReply;
  onPersonalized?: (newMessage: string) => void;
}

export function ReplyCard({ reply, onPersonalized }: ReplyCardProps) {
  const [copied, setCopied] = useState(false);
  const [transformingStyle, setTransformingStyle] = useState<string | null>(null);
  const [currentMessage, setCurrentMessage] = useState(reply.message);
  const [currentTone, setCurrentTone] = useState(reply.tone);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleTransform = async (styleId: string, label: string) => {
    if (transformingStyle) return;
    setTransformingStyle(styleId);

    try {
      const res = await fetch("/api/improve-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: currentMessage,
          styleId,
        }),
      });

      const data: any = await res.json();
      if (data.improved) {
        setCurrentMessage(data.improved);
        setCurrentTone(label);
        if (onPersonalized) onPersonalized(data.improved);
      }
    } catch (e) {
      console.error("Transform error:", e);
    } finally {
      setTransformingStyle(null);
    }
  };

  return (
    <div className="bg-white border border-pink-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-pink-300 transition-all duration-200 space-y-3">
      {/* Top Header: Tone & Copy Button */}
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-pink-50 text-romantic-600 border border-pink-100">
          <Sparkles className="w-3 h-3 text-romantic-500" />
          {currentTone}
        </span>

        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-xl font-semibold transition ${
            copied
              ? "bg-emerald-500 text-white shadow-sm"
              : "bg-pink-50 hover:bg-pink-100 text-romantic-700 border border-pink-200"
          }`}
          title="Copy text message to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-white" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-romantic-500" />
              <span>Copy Text</span>
            </>
          )}
        </button>
      </div>

      {/* Message Text Bubble */}
      <div className="relative p-3.5 rounded-xl bg-pink-50/50 border border-pink-100 text-gray-900 text-sm font-medium leading-relaxed select-text transition-colors">
        {transformingStyle && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-romantic-600">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Refining message...</span>
          </div>
        )}
        "{currentMessage}"
      </div>

      {/* Explanation Note */}
      {reply.explanation && (
        <p className="text-xs text-gray-500 italic">
          💡 {reply.explanation}
        </p>
      )}

      {/* Action Toolbar: Shorter, Longer, Funnier, Sweeter, More Affectionate, Regenerate, Sound Like Me */}
      <div className="pt-2 border-t border-pink-100/70 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-bold text-gray-600 uppercase tracking-wider">
            Quick Tweaks:
          </span>
          <button
            onClick={() => handleTransform("regenerate", "Fresh Variation")}
            disabled={Boolean(transformingStyle)}
            className="text-[11px] font-semibold text-romantic-600 hover:text-romantic-800 flex items-center gap-1 disabled:opacity-50"
            title="Generate a fresh variation of this message"
          >
            <RefreshCw className={`w-3 h-3 ${transformingStyle === "regenerate" ? "animate-spin" : ""}`} />
            <span>Regenerate</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => handleTransform("shorter", "Shorter & Punchy")}
            disabled={Boolean(transformingStyle)}
            className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-pink-50 border border-gray-200 hover:border-pink-200 text-gray-700 hover:text-romantic-600 transition flex items-center gap-1 disabled:opacity-50"
            title="Make this text message shorter and more concise"
          >
            <span>✂️ Shorter</span>
          </button>

          <button
            onClick={() => handleTransform("longer", "More Detail")}
            disabled={Boolean(transformingStyle)}
            className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-pink-50 border border-gray-200 hover:border-pink-200 text-gray-700 hover:text-romantic-600 transition flex items-center gap-1 disabled:opacity-50"
            title="Expand this message with more detail and depth"
          >
            <span>📝 Longer</span>
          </button>

          <button
            onClick={() => handleTransform("funnier", "Funnier & Playful")}
            disabled={Boolean(transformingStyle)}
            className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-pink-50 border border-gray-200 hover:border-pink-200 text-gray-700 hover:text-romantic-600 transition flex items-center gap-1 disabled:opacity-50"
            title="Make this message funnier with playful wit"
          >
            <span>😂 Funnier</span>
          </button>

          <button
            onClick={() => handleTransform("sweeter", "Sweeter & Caring")}
            disabled={Boolean(transformingStyle)}
            className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-pink-50 border border-gray-200 hover:border-pink-200 text-gray-700 hover:text-romantic-600 transition flex items-center gap-1 disabled:opacity-50"
            title="Make this message sweeter and more thoughtful"
          >
            <span>🍯 Sweeter</span>
          </button>

          <button
            onClick={() => handleTransform("more_affectionate", "More Affectionate")}
            disabled={Boolean(transformingStyle)}
            className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-pink-50 border border-gray-200 hover:border-pink-200 text-gray-700 hover:text-romantic-600 transition flex items-center gap-1 disabled:opacity-50"
            title="Infuse more warmth and love into this text"
          >
            <span>🥰 Affectionate</span>
          </button>

          <button
            onClick={() => handleTransform("more_natural", "Sound Like Me")}
            disabled={Boolean(transformingStyle)}
            className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-pink-100/70 hover:bg-pink-100 border border-pink-200 text-romantic-700 font-semibold transition flex items-center gap-1 disabled:opacity-50 ml-auto"
            title="Adapt this message to match your personal texting profile"
          >
            <Sparkles className="w-3 h-3 text-romantic-500" />
            <span>Sound Like Me</span>
          </button>
        </div>
      </div>
    </div>
  );
}
