"use client";

import React from "react";
import { TEXTING_STYLES } from "@/lib/constants";
import { EmotionalIntensity, MessageLength, NaturalnessLevel, TextingPreferences, TextingStyle } from "@/lib/types";
import { SlidersHorizontal, Sparkles } from "lucide-react";

interface StyleSelectorProps {
  preferences: TextingPreferences;
  onChange: (prefs: TextingPreferences) => void;
}

export function StyleSelector({ preferences, onChange }: StyleSelectorProps) {
  const toggleStyle = (styleId: TextingStyle) => {
    const current = preferences.styles || [];
    let updated: TextingStyle[];
    if (current.includes(styleId)) {
      updated = current.filter((s) => s !== styleId);
      if (updated.length === 0) updated = ["casual"]; // Keep at least one
    } else {
      updated = [...current, styleId];
    }
    onChange({ ...preferences, styles: updated });
  };

  return (
    <div className="bg-white/70 dark:bg-[#1c1124]/70 border border-pink-100 dark:border-pink-900/30 rounded-2xl p-5 shadow-sm backdrop-blur-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-romantic-500" />
          <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            Texting Personality & Tone
          </h3>
        </div>
        <span className="text-xs text-pink-500 font-medium">
          Select 1 or more styles
        </span>
      </div>

      {/* 12 Style Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {TEXTING_STYLES.map((style) => {
          const isSelected = preferences.styles.includes(style.id);
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => toggleStyle(style.id)}
              className={`p-2.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? "bg-gradient-to-br from-romantic-500/20 via-pink-500/15 to-purple-500/20 border-romantic-500 text-romantic-700 dark:text-romantic-300 shadow-sm shadow-pink-500/10 scale-[1.02]"
                  : "bg-gray-50/60 dark:bg-pink-950/20 border-gray-200/60 dark:border-pink-900/20 text-gray-700 dark:text-gray-300 hover:border-pink-300 dark:hover:border-pink-800"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg">{style.emoji}</span>
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full ${isSelected ? "bg-romantic-500 text-white" : "bg-gray-200/50 dark:bg-pink-900/40 text-gray-500 dark:text-gray-400"}`}>
                  {style.tag}
                </span>
              </div>
              <div className="font-semibold text-xs text-gray-900 dark:text-gray-100">{style.label}</div>
              <div className="text-[10.5px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5 leading-tight">
                {style.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Fine-Tuning Sliders & Radios */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-pink-100/60 dark:border-pink-900/20 text-xs">
        {/* Length */}
        <div>
          <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Message Length
          </label>
          <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-pink-950/40 p-1 rounded-xl">
            {(["short", "medium", "long"] as MessageLength[]).map((len) => (
              <button
                key={len}
                type="button"
                onClick={() => onChange({ ...preferences, length: len })}
                className={`py-1 rounded-lg capitalize font-medium transition ${
                  preferences.length === len
                    ? "bg-white dark:bg-[#251532] text-romantic-600 dark:text-romantic-300 shadow-sm"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                }`}
              >
                {len}
              </button>
            ))}
          </div>
        </div>

        {/* Intensity */}
        <div>
          <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Emotional Intensity
          </label>
          <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-pink-950/40 p-1 rounded-xl">
            {(["subtle", "moderate", "strong"] as EmotionalIntensity[]).map((int) => (
              <button
                key={int}
                type="button"
                onClick={() => onChange({ ...preferences, intensity: int })}
                className={`py-1 rounded-lg capitalize font-medium transition ${
                  preferences.intensity === int
                    ? "bg-white dark:bg-[#251532] text-romantic-600 dark:text-romantic-300 shadow-sm"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                }`}
              >
                {int}
              </button>
            ))}
          </div>
        </div>

        {/* Naturalness */}
        <div>
          <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Naturalness
          </label>
          <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-pink-950/40 p-1 rounded-xl">
            {(
              [
                { id: "very_casual", label: "Casual" },
                { id: "balanced", label: "Balanced" },
                { id: "expressive", label: "Expressive" },
              ] as { id: NaturalnessLevel; label: string }[]
            ).map((nat) => (
              <button
                key={nat.id}
                type="button"
                onClick={() => onChange({ ...preferences, naturalness: nat.id })}
                className={`py-1 rounded-lg font-medium transition ${
                  preferences.naturalness === nat.id
                    ? "bg-white dark:bg-[#251532] text-romantic-600 dark:text-romantic-300 shadow-sm"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                }`}
              >
                {nat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Instruction Input */}
      <div>
        <label className="block font-medium text-xs text-gray-700 dark:text-gray-300 mb-1">
          Custom Texting Instructions (Optional)
        </label>
        <div className="relative">
          <input
            type="text"
            value={preferences.customInstruction || ""}
            onChange={(e) => onChange({ ...preferences, customInstruction: e.target.value })}
            placeholder="e.g., 'Keep it super chill', 'Mention her photography project', 'Don't sound needy'"
            className="w-full text-xs px-3 py-2 rounded-xl bg-gray-50 dark:bg-pink-950/20 border border-gray-200 dark:border-pink-900/30 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-romantic-500/50"
          />
        </div>
      </div>
    </div>
  );
}
