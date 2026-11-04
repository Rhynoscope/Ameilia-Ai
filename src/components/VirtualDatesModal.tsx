"use client";

import React, { useState } from "react";
import { LONG_DISTANCE_DATE_IDEAS } from "@/lib/constants";
import { LdrDateCategory, VirtualDateIdea } from "@/lib/types";
import {
  Calendar,
  Check,
  Copy,
  Heart,
  MessageSquare,
  Sparkles,
  Tv,
  Utensils,
  Gamepad2,
  Music,
  HelpCircle,
  X,
  Clock,
  Send,
} from "lucide-react";

interface VirtualDatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt?: (prompt: string) => void;
}

export function VirtualDatesModal({
  isOpen,
  onClose,
  onSelectPrompt,
}: VirtualDatesModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = [
    { id: "all", label: "All Activities", icon: "✨" },
    { id: "watch_party", label: "Watch Party", icon: "🎬" },
    { id: "virtual_dinner", label: "Dinner Date", icon: "🍷" },
    { id: "deep_talks", label: "Deep Talks", icon: "🌌" },
    { id: "games", label: "Co-Op Games", icon: "🎮" },
    { id: "music_jam", label: "Music Jam", icon: "🎵" },
    { id: "quizzes_challenges", label: "Couple Quiz", icon: "🧩" },
  ];

  const filteredIdeas =
    selectedCategory === "all"
      ? LONG_DISTANCE_DATE_IDEAS
      : LONG_DISTANCE_DATE_IDEAS.filter((d) => d.category === selectedCategory);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const handlePersonalizeInChat = (idea: VirtualDateIdea) => {
    const prompt = `I want to plan a virtual date with Amelia: "${idea.title}". Her invitation idea: "${idea.invitationMessage}". How can I personalize this specifically for Amelia's interests and make it super fun for us tonight?`;
    if (onSelectPrompt) {
      onSelectPrompt(prompt);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-pink-200 rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-pink-100 flex items-center justify-between bg-gradient-to-r from-pink-50/50 to-white">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pink-100 text-romantic-600 text-xs font-semibold">
              <Heart className="w-3.5 h-3.5 text-romantic-500 fill-romantic-500" />
              Long-Distance Dates & Remote Activities
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Virtual Dates for You & Amelia
            </h2>
            <p className="text-xs text-gray-600">
              Spend meaningful quality time together across the miles with ready-to-send invitations.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Pills */}
        <div className="px-5 py-3 border-b border-pink-50 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedCategory === c.id
                  ? "bg-romantic-500 text-white shadow-sm"
                  : "bg-gray-50 text-gray-700 hover:bg-pink-50 border border-gray-200"
              }`}
            >
              <span>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        {/* Ideas List */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {filteredIdeas.map((idea) => {
            const isCopied = copiedId === idea.id;
            return (
              <div
                key={idea.id}
                className="bg-white border border-pink-100 hover:border-pink-300 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl p-2 rounded-xl bg-pink-50 border border-pink-100">
                      {idea.emoji}
                    </span>
                    <div>
                      <h3 className="font-bold text-base text-gray-900">
                        {idea.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                        <span className="font-semibold text-romantic-600">
                          {idea.categoryLabel}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {idea.durationMinutes}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-pink-50 text-romantic-600 border border-pink-100 font-semibold">
                    LDR Favorite
                  </span>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed">
                  {idea.description}
                </p>

                {/* Ready-to-send invite box */}
                <div className="p-3 rounded-xl bg-pink-50/60 border border-pink-100 space-y-1.5">
                  <span className="text-[10.5px] font-bold text-romantic-600 uppercase tracking-wider block">
                    Ready-to-Send Text Invitation:
                  </span>
                  <p className="text-xs text-gray-800 italic leading-relaxed select-text">
                    "{idea.invitationMessage}"
                  </p>
                </div>

                {/* Prep Tip */}
                <p className="text-[11px] text-gray-500">
                  <span className="font-semibold text-gray-700">💡 Tip:</span> {idea.prepTip}
                </p>

                {/* Actions */}
                <div className="pt-2 border-t border-pink-50 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handlePersonalizeInChat(idea)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-romantic-600 hover:text-romantic-800 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-romantic-500" />
                    <span>Personalize in Chat</span>
                  </button>

                  <button
                    onClick={() => handleCopy(idea.id, idea.invitationMessage)}
                    className={`inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-xl font-semibold transition ${
                      isCopied
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "bg-pink-50 hover:bg-pink-100 text-romantic-700 border border-pink-200"
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Copied Invitation!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-romantic-500" />
                        <span>Copy Invitation</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
