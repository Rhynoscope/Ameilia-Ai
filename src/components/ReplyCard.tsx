"use client";

import React, { useState, useEffect } from "react";
import { SuggestedReply } from "@/lib/types";
import { SITUATION_DEFINITIONS } from "@/lib/constants";
import {
  Check,
  Copy,
  Sparkles,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface ReplyVersion {
  message: string;
  tone: string;
  explanation?: string;
  label?: string;
  rating?: "like" | "dislike" | null;
}

interface ReplyCardProps {
  reply: SuggestedReply;
  conversationId?: string;
  conversationContext?: string;
  onPersonalized?: (newMessage: string, updatedReply?: SuggestedReply) => void;
}

export function ReplyCard({
  reply,
  conversationId,
  conversationContext,
  onPersonalized,
}: ReplyCardProps) {
  const [copied, setCopied] = useState(false);
  const [transformingStyle, setTransformingStyle] = useState<string | null>(null);

  const [versions, setVersions] = useState<ReplyVersion[]>(() => {
    const initVersions = reply.versions;
    if (Array.isArray(initVersions) && initVersions.length > 0) {
      return initVersions.map((v, i) => ({
        message: v.message,
        tone: v.tone || reply.tone || "Natural & Warm",
        explanation: v.explanation || reply.explanation,
        label: v.label || `Version ${i + 1}`,
        rating:
          i === (reply.activeVersionIndex ?? initVersions.length - 1)
            ? reply.rating || null
            : null,
      }));
    }
    return [
      {
        message: reply.message,
        tone: reply.tone || "Natural & Warm",
        explanation: reply.explanation,
        label: "Original",
        rating: reply.rating || null,
      },
    ];
  });

  const [versionIdx, setVersionIdx] = useState<number>(() =>
    reply.activeVersionIndex !== undefined
      ? Math.min(reply.activeVersionIndex, Math.max(0, (reply.versions?.length || 1) - 1))
      : Math.max(0, (reply.versions?.length || 1) - 1)
  );

  // Sync if parent updates reply prop directly
  useEffect(() => {
    if (
      reply.message &&
      !versions.some((v) => v.message.trim() === reply.message.trim())
    ) {
      const next: ReplyVersion = {
        message: reply.message,
        tone: reply.tone || "Fresh Match",
        explanation: reply.explanation,
        label: `Version ${versions.length + 1}`,
        rating: reply.rating || null,
      };
      setVersions((prev) => [...prev, next]);
      setVersionIdx(versions.length);
    }
  }, [reply.message]);

  const activeVersion = versions[versionIdx] || versions[versions.length - 1];
  const currentMessage = activeVersion.message;
  const currentTone = activeVersion.tone;
  const currentExplanation = activeVersion.explanation ?? reply.explanation;
  const rating = activeVersion.rating || null;

  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const situationMeta =
    SITUATION_DEFINITIONS.find((s) => s.id === reply.situation) ||
    SITUATION_DEFINITIONS.find((s) => s.id === "general") ||
    SITUATION_DEFINITIONS[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const setCurrentVersionRating = (newRating: "like" | "dislike" | null) => {
    setVersions((prev) =>
      prev.map((v, i) => (i === versionIdx ? { ...v, rating: newRating } : v))
    );
  };

  const handleTransform = async (
    styleId: string,
    label: string,
    extraDislikedTraits?: string[]
  ) => {
    if (transformingStyle) return;
    setTransformingStyle(styleId);

    try {
      const allPreviousTexts = versions.map((v) => v.message);
      const res = await fetch("/api/improve-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: currentMessage,
          styleId,
          previousVersions: allPreviousTexts,
          conversationContext,
          dislikedTraits: extraDislikedTraits,
          situationContext: reply.situation || "general",
        }),
      });

      const data: any = await res.json();
      if (data.improved) {
        const nextVer: ReplyVersion = {
          message: data.improved,
          tone: data.tone || label,
          explanation: data.reasoning || currentExplanation,
          label: `${label} (#${versions.length + 1})`,
          rating: null,
        };
        const nextList = [...versions, nextVer];
        const nextIndex = nextList.length - 1;
        setVersions(nextList);
        setVersionIdx(nextIndex);

        if (onPersonalized) {
          onPersonalized(data.improved, {
            ...reply,
            message: data.improved,
            tone: nextVer.tone,
            explanation: nextVer.explanation || reply.explanation,
            rating: null,
            versions: nextList,
            activeVersionIndex: nextIndex,
          });
        }
      }
    } catch (e) {
      console.error("Transform error:", e);
      setFeedbackToast("⚠️ Couldn't generate new version, please try again.");
      setTimeout(() => setFeedbackToast(null), 3000);
    } finally {
      setTransformingStyle(null);
    }
  };

  const handleFeedback = async (newRating: "like" | "dislike") => {
    if (feedbackLoading || transformingStyle) return;
    if (rating === "like" && newRating === "like") return;

    setFeedbackLoading(true);
    const previousRating = rating;
    setCurrentVersionRating(newRating);

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
          reasoning: currentExplanation,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to record feedback");
      }

      if (newRating === "like") {
        setFeedbackToast("Saved to your Liked style profile! Future messages will match this vibe.");
        setTimeout(() => setFeedbackToast(null), 3500);
      } else {
        setFeedbackToast("Dislike saved! Generating a fresh replacement with a different approach...");
        await handleTransform("dislike_replace", "Better Match", [
          `Avoid the tone "${currentTone}"`,
          `Avoid phrasing like "${currentMessage.slice(0, 80)}"`,
        ]);
        setFeedbackToast("Replaced with a fresh recommendation! Use ◀ ▶ to view earlier versions.");
        setTimeout(() => setFeedbackToast(null), 3800);
      }
    } catch (err) {
      console.error("Feedback error:", err);
      setCurrentVersionRating(previousRating);
      setFeedbackToast("⚠️ Couldn't save feedback, please try again.");
      setTimeout(() => setFeedbackToast(null), 3000);
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <div className="bg-[#fffdf7] border-[3px] border-black rounded-2xl p-3.5 sm:p-4 shadow-[0_5px_0_#000] transition-all duration-200 space-y-3">
      {/* Top Header: Situation Pill, Tone Tag, Version Switcher, Copy */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {situationMeta && (
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#ffe033] text-black border-2 border-black shadow-[0_2px_0_#000]">
              <span>{situationMeta.icon}</span>
              <span>{situationMeta.label}</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#eef2ff] text-[#1e1b4b] border-2 border-black">
            <Sparkles className="w-3 h-3 text-[#6d28d9]" />
            {currentTone}
          </span>

          {/* Version History Switcher */}
          {versions.length > 1 && (
            <div className="inline-flex items-center gap-1 bg-[#261c7a] text-white text-[11px] font-black px-2 py-0.5 rounded-full border-2 border-black shadow-[0_2px_0_#000]">
              <button
                type="button"
                onClick={() => setVersionIdx((i) => Math.max(0, i - 1))}
                disabled={versionIdx === 0}
                className="hover:text-[#ffe033] disabled:opacity-35 p-0.5"
                title="Previous generated version"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-1 select-none">
                {versionIdx + 1} / {versions.length}
              </span>
              <button
                type="button"
                onClick={() =>
                  setVersionIdx((i) => Math.min(versions.length - 1, i + 1))
                }
                disabled={versionIdx === versions.length - 1}
                className="hover:text-[#ffe033] disabled:opacity-35 p-0.5"
                title="Next generated version"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-extrabold border-2 border-black shadow-[0_3px_0_#000] transition active:translate-y-0.5 ${
            copied
              ? "bg-[#38e54d] text-[#05290a]"
              : "bg-[#ff6bd6] hover:bg-[#ff85de] text-black"
          }`}
          title="Copy text message to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Text</span>
            </>
          )}
        </button>
      </div>

      {/* Recommended Message Text Bubble */}
      <div className="relative p-3.5 sm:p-4 rounded-xl bg-white border-[2.5px] border-black text-[#111827] text-[15px] font-semibold leading-relaxed select-text shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]">
        {transformingStyle && (
          <div className="absolute inset-0 bg-[#fffdf7]/90 backdrop-blur-[2px] rounded-xl flex items-center justify-center gap-2 text-xs font-extrabold text-[#261c7a] z-10">
            <RefreshCw className="w-4 h-4 animate-spin text-[#ff4b72]" />
            <span>
              {transformingStyle === "dislike_replace"
                ? "Crafting a better replacement..."
                : "Generating fresh version..."}
            </span>
          </div>
        )}
        <p className="whitespace-pre-wrap select-all break-words">
          &ldquo;{currentMessage}&rdquo;
        </p>
      </div>

      {/* Explanation note */}
      {currentExplanation && (
        <p className="text-xs text-[#374151] font-medium flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#3529a8] mt-0.5 shrink-0" />
          <span>{currentExplanation}</span>
        </p>
      )}

      {/* Feedback & Regenerate Row */}
      <div className="pt-2 border-t-2 border-dashed border-black/20 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Like Button */}
            <button
              type="button"
              onClick={() => handleFeedback("like")}
              disabled={feedbackLoading || Boolean(transformingStyle)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border-2 border-black shadow-[0_2px_0_#000] transition-all active:translate-y-0.5 ${
                rating === "like"
                  ? "bg-[#38e54d] text-[#05290a]"
                  : "bg-white hover:bg-[#dcffe2] text-[#111827]"
              }`}
              title="Like: Learn and recommend similar styles in the future"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>{rating === "like" ? "Liked!" : "Like"}</span>
            </button>

            {/* Dislike Button */}
            <button
              type="button"
              onClick={() => handleFeedback("dislike")}
              disabled={feedbackLoading || Boolean(transformingStyle)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border-2 border-black shadow-[0_2px_0_#000] transition-all active:translate-y-0.5 ${
                rating === "dislike"
                  ? "bg-[#ff5252] text-white"
                  : "bg-white hover:bg-[#ffe3e3] text-[#111827]"
              }`}
              title="Dislike: Learn to avoid this tone/style and immediately replace with a new version"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
              <span>{rating === "dislike" ? "Disliked" : "Dislike"}</span>
            </button>
          </div>

          {/* Regenerate Button */}
          <button
            type="button"
            onClick={() => handleTransform("regenerate", "Fresh Variation")}
            disabled={Boolean(transformingStyle)}
            className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#3ecbff] hover:bg-[#6cdaff] text-black border-2 border-black shadow-[0_2px_0_#000] flex items-center gap-1.5 disabled:opacity-50 transition active:translate-y-0.5"
            title="Generate a completely fresh recommendation (keeps version history)"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                transformingStyle === "regenerate" ? "animate-spin" : ""
              }`}
            />
            <span>Regenerate</span>
          </button>
        </div>

        {/* Feedback confirmation toast / indicator */}
        {feedbackToast && (
          <div className="text-[11.5px] font-bold text-[#1e1b4b] bg-[#ffe033] border-2 border-black rounded-xl px-3 py-1.5 shadow-[0_2px_0_#000] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-black shrink-0" />
            <span>{feedbackToast}</span>
          </div>
        )}

        {/* Quick Tweaks: Shorter, Longer, Funnier, Sweeter, Sound Like Me */}
        <div className="pt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-600 mr-1">
            Quick Tweaks:
          </span>

          <button
            type="button"
            onClick={() => handleTransform("shorter", "Shorter & Punchy")}
            disabled={Boolean(transformingStyle)}
            className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white hover:bg-[#ffe033] border-2 border-black text-black shadow-[0_2px_0_#000] active:translate-y-0.5 transition disabled:opacity-50"
          >
            ✂️ Shorter
          </button>

          <button
            type="button"
            onClick={() => handleTransform("longer", "More Detail")}
            disabled={Boolean(transformingStyle)}
            className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white hover:bg-[#ffe033] border-2 border-black text-black shadow-[0_2px_0_#000] active:translate-y-0.5 transition disabled:opacity-50"
          >
            📝 Longer
          </button>

          <button
            type="button"
            onClick={() => handleTransform("funnier", "Funnier & Playful")}
            disabled={Boolean(transformingStyle)}
            className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white hover:bg-[#ffe033] border-2 border-black text-black shadow-[0_2px_0_#000] active:translate-y-0.5 transition disabled:opacity-50"
          >
            😂 Funnier
          </button>

          <button
            type="button"
            onClick={() => handleTransform("sweeter", "Sweeter & Caring")}
            disabled={Boolean(transformingStyle)}
            className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white hover:bg-[#ffe033] border-2 border-black text-black shadow-[0_2px_0_#000] active:translate-y-0.5 transition disabled:opacity-50"
          >
            🥰 Sweeter
          </button>

          <button
            type="button"
            onClick={() => handleTransform("more_natural", "Sound Like Me")}
            disabled={Boolean(transformingStyle)}
            className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-[#c084fc] hover:bg-[#d8b4fe] border-2 border-black text-black shadow-[0_2px_0_#000] active:translate-y-0.5 transition flex items-center gap-1 disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3 text-black" />
            <span>Sound Like Me</span>
          </button>
        </div>
      </div>
    </div>
  );
}
