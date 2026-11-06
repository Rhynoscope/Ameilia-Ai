"use client";

import React, { useState } from "react";
import { SuggestedReply, SituationContext } from "@/lib/types";
import { SITUATION_DEFINITIONS } from "@/lib/constants";
import {
  Check,
  Copy,
  Sparkles,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Info,
} from "lucide-react";

interface ReplyCardProps {
  reply: SuggestedReply;
  conversationId?: string;
  onPersonalized?: (newMessage: string) => void;
}

export function ReplyCard({ reply, conversationId, onPersonalized }: ReplyCardProps) {
  const [copied, setCopied] = useState(false);
  const [transformingStyle, setTransformingStyle] = useState<string | null>(null);
  const [currentMessage, setCurrentMessage] = useState(reply.message);
  const [currentTone, setCurrentTone] = useState(reply.tone || "Natural & Warm");

  // Feedback state
  const [rating, setRating] = useState<"like" | "dislike" | null>(reply.rating || null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Situation metadata lookup
  const situationMeta =
    SITUATION_DEFINITIONS.find((s) => s.id === reply.situation) ||
    SITUATION_DEFINITIONS.find((s) => s.id === "general") ||
    SITUATION_DEFINITIONS[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleFeedback = async (newRating: "like" | "dislike") => {
    // If user clicks the already selected rating, do nothing (deduplication)
    if (rating === newRating || feedbackLoading) return;

    setFeedbackLoading(true);
    const previousRating = rating;
    setRating(newRating);

    try {
      const res = await fetch("/api/preferences/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          suggestionText: currentMessage,
          rating: newRating,
          situationContext: reply.situation || "general",
          tone: currentTone,
          styleTags: reply.styleTags || [currentTone],
          lengthCategory: reply.lengthCategory || "medium",
          reasoning: reply.explanation,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to record feedback");
      }

      const data = await res.json();

      if (newRating === "like") {
        setFeedbackToast("👍 Liked! Learning what you enjoy.");
        setTimeout(() => setFeedbackToast(null), 3500);
      } else {
        setFeedbackToast("👎 Disliked! Generating an alternative...");
        // Dislike triggers quick automatic replacement to fix the issue
        setTimeout(async () => {
          setFeedbackToast(null);
          await handleTransform("regenerate", "Replacement Match");
        }, 1200);
      }
    } catch (err) {
      console.error("Feedback error:", err);
      // Revert rating on error
      setRating(previousRating);
      setFeedbackToast("⚠️ Couldn't save feedback, please try again.");
      setTimeout(() => setFeedbackToast(null), 3000);
    } finally {
      setFeedbackLoading(false);
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
        // Reset feedback for the new transformed message
        setRating(null);
        if (onPersonalized) onPersonalized(data.improved);
      }
    } catch (e) {
      console.error("Transform error:", e);
    } finally {
      setTransformingStyle(null);
    }
  };

  return (
    <div className="bg-white border-2 border-pink-200/90 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 space-y-3.5">
      {/* Top Header: Situation Pill, Tone Tag, Copy */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Situation Badge */}
          {situationMeta && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-pink-100 text-romantic-700 border border-pink-200">
              <span>{situationMeta.icon}</span>
              <span>{situationMeta.label}</span>
            </span>
          )}

          {/* Tone Label */}
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
            <Sparkles className="w-3 h-3 text-romantic-500" />
            {currentTone}
          </span>
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-semibold transition active:scale-95 ${
            copied
              ? "bg-emerald-600 text-white shadow-sm"
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

      {/* Recommended Message Text Bubble */}
      <div className="relative p-4 rounded-xl bg-gradient-to-br from-pink-50/60 to-rose-50/40 border border-pink-200/70 text-gray-950 text-[15px] font-medium leading-relaxed select-text shadow-inner">
        {transformingStyle && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-romantic-700 z-10">
            <RefreshCw className="w-4 h-4 animate-spin text-romantic-600" />
            <span>Refining recommendation...</span>
          </div>
        )}
        <p className="whitespace-pre-wrap select-all">"{currentMessage}"</p>
      </div>

      {/* Explanation note */}
      {reply.explanation && (
        <p className="text-xs text-gray-600 flex items-start gap-1.5 italic">
          <Info className="w-3.5 h-3.5 text-romantic-400 mt-0.5 flex-shrink-0" />
          <span>{reply.explanation}</span>
        </p>
      )}

      {/* YouTube-Style Feedback Row: 👍 Like & 👎 Dislike */}
      <div className="pt-2 border-t border-pink-100 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              Feedback:
            </span>

            {/* Like Button */}
            <button
              onClick={() => handleFeedback("like")}
              disabled={feedbackLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                rating === "like"
                  ? "bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-300"
                  : "bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 border border-gray-200 hover:border-emerald-300"
              }`}
              title="Like: Learn and recommend similar styles in the future"
            >
              <ThumbsUp
                className={`w-3.5 h-3.5 ${
                  rating === "like" ? "fill-white text-white" : ""
                }`}
              />
              <span>{rating === "like" ? "Liked" : "Like"}</span>
            </button>

            {/* Dislike Button */}
            <button
              onClick={() => handleFeedback("dislike")}
              disabled={feedbackLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                rating === "dislike"
                  ? "bg-rose-500 text-white shadow-sm ring-2 ring-rose-300"
                  : "bg-gray-100 hover:bg-rose-50 text-gray-700 hover:text-rose-700 border border-gray-200 hover:border-rose-300"
              }`}
              title="Dislike: Learn to avoid this tone/style and generate a replacement"
            >
              <ThumbsDown
                className={`w-3.5 h-3.5 ${
                  rating === "dislike" ? "fill-white text-white" : ""
                }`}
              />
              <span>{rating === "dislike" ? "Disliked" : "Dislike"}</span>
            </button>
          </div>

          {/* Regenerate Button */}
          <button
            onClick={() => handleTransform("regenerate", "Fresh Variation")}
            disabled={Boolean(transformingStyle)}
            className="text-[11.5px] font-semibold text-romantic-600 hover:text-romantic-800 flex items-center gap-1 disabled:opacity-50 transition active:scale-95"
            title="Generate a completely fresh recommendation"
          >
            <RefreshCw
              className={`w-3 h-3 ${
                transformingStyle === "regenerate" ? "animate-spin" : ""
              }`}
            />
            <span>Regenerate</span>
          </button>
        </div>

        {/* Feedback confirmation toast / indicator */}
        {feedbackToast && (
          <div className="text-[11.5px] font-semibold text-gray-700 bg-pink-50 border border-pink-200 rounded-lg px-2.5 py-1 animate-fade-in flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-romantic-500" />
            <span>{feedbackToast}</span>
          </div>
        )}

        {/* Quick Tweaks: Shorter, Longer, Funnier, Sweeter, Sound Like Me */}
        <div className="pt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold text-gray-600 mr-1">
            Quick Tweaks:
          </span>

          <button
            onClick={() => handleTransform("shorter", "Shorter & Punchy")}
            disabled={Boolean(transformingStyle)}
            className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-gray-50 hover:bg-pink-50 border border-gray-200 hover:border-pink-200 text-gray-700 hover:text-romantic-600 transition flex items-center gap-1 disabled:opacity-50"
            title="Make shorter and more concise"
          >
            <span>✂️ Shorter</span>
          </button>

          <button
            onClick={() => handleTransform("longer", "More Detail")}
            disabled={Boolean(transformingStyle)}
            className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-gray-50 hover:bg-pink-50 border border-gray-200 hover:border-pink-200 text-gray-700 hover:text-romantic-600 transition flex items-center gap-1 disabled:opacity-50"
            title="Expand with more detail"
          >
            <span>📝 Longer</span>
          </button>

          <button
            onClick={() => handleTransform("funnier", "Funnier & Playful")}
            disabled={Boolean(transformingStyle)}
            className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-gray-50 hover:bg-pink-50 border border-gray-200 hover:border-pink-200 text-gray-700 hover:text-romantic-600 transition flex items-center gap-1 disabled:opacity-50"
            title="Add playful humor"
          >
            <span>😂 Funnier</span>
          </button>

          <button
            onClick={() => handleTransform("sweeter", "Sweeter & Caring")}
            disabled={Boolean(transformingStyle)}
            className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-gray-50 hover:bg-pink-50 border border-gray-200 hover:border-pink-200 text-gray-700 hover:text-romantic-600 transition flex items-center gap-1 disabled:opacity-50"
            title="Make sweeter and more caring"
          >
            <span>🥰 Sweeter</span>
          </button>

          <button
            onClick={() => handleTransform("more_natural", "Sound Like Me")}
            disabled={Boolean(transformingStyle)}
            className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-pink-100/80 hover:bg-pink-100 border border-pink-200 text-romantic-700 transition flex items-center gap-1 disabled:opacity-50"
            title="Adapt to strictly match your authentic profile"
          >
            <Sparkles className="w-3 h-3 text-romantic-500" />
            <span>Sound Like Me</span>
          </button>
        </div>
      </div>
    </div>
  );
}
