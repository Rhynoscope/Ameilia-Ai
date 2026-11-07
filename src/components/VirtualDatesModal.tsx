"use client";

import React, { useState } from "react";
import { LONG_DISTANCE_DATE_IDEAS } from "@/lib/constants";
import { VirtualDateIdea } from "@/lib/types";
import { VirtualDatesArena } from "./VirtualDatesArena";
import {
  Check,
  Copy,
  Heart,
  Sparkles,
  Gamepad2,
  X,
  Clock,
} from "lucide-react";

interface VirtualDatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt?: (prompt: string) => void;
  initialRoomCode?: string | null;
}

export function VirtualDatesModal({
  isOpen,
  onClose,
  onSelectPrompt,
  initialRoomCode,
}: VirtualDatesModalProps) {
  const [activeTab, setActiveTab] = useState<"arcade" | "ideas">("arcade");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = [
    { id: "all", label: "All Ideas", icon: "✨" },
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
      : LONG_DISTANCE_DATE_IDEAS.filter(
          (d) => d.category === selectedCategory
        );

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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-[#3529a8] border-t-[4px] sm:border-[4px] border-black rounded-t-3xl sm:rounded-3xl max-w-5xl w-full max-h-[94dvh] sm:max-h-[92vh] flex flex-col shadow-[0_10px_0_#000] overflow-hidden pb-[env(safe-area-inset-bottom)]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b-[3px] border-black flex flex-wrap items-center justify-between gap-3 bg-[#261c7a] text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#ffe033] text-black border-[2.5px] border-black shadow-[0_3px_0_#000] flex items-center justify-center text-2xl">
              🎮
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-wide drop-shadow-[0_2px_0_#000]">
                Virtual Dates & Online Multiplayer Arcade
              </h2>
              <p className="text-xs text-white/85 font-bold">
                Play Chess, Checkers, Coupleopolis, Wild Colors, Life Path & Party Games live together!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Switcher Tabs */}
            <button
              type="button"
              onClick={() => setActiveTab("arcade")}
              className={`px-3.5 py-1.5 rounded-xl font-black text-xs border-2 border-black transition-all flex items-center gap-1.5 ${
                activeTab === "arcade"
                  ? "bg-[#38e54d] text-[#05290a] shadow-[0_3px_0_#000]"
                  : "bg-[#fffdf7] text-black hover:bg-[#ffe033]"
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Playable Games (10)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ideas")}
              className={`px-3.5 py-1.5 rounded-xl font-black text-xs border-2 border-black transition-all flex items-center gap-1.5 ${
                activeTab === "ideas"
                  ? "bg-[#ff6bd6] text-black shadow-[0_3px_0_#000]"
                  : "bg-[#fffdf7] text-black hover:bg-[#ffe033]"
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Date Invitations</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-[#ff5252] hover:bg-[#ff6b6b] text-white font-black border-2 border-black shadow-[0_3px_0_#000] flex items-center justify-center shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === "arcade" ? (
            <VirtualDatesArena
              initialRoomCode={initialRoomCode}
              onSelectChatPrompt={(prompt) => {
                if (onSelectPrompt) {
                  onSelectPrompt(prompt);
                  onClose();
                }
              }}
            />
          ) : (
            <div className="space-y-4">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap border-2 border-black transition flex items-center gap-1.5 ${
                      selectedCategory === c.id
                        ? "bg-[#ffe033] text-black shadow-[0_3px_0_#000]"
                        : "bg-[#fffdf7] text-[#1a1a2e] hover:bg-[#eef2ff]"
                    }`}
                  >
                    <span>{c.icon}</span>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredIdeas.map((idea) => {
                  const isCopied = copiedId === idea.id;
                  return (
                    <div
                      key={idea.id}
                      className="bg-[#fffdf7] text-[#1a1a2e] border-[3px] border-black rounded-2xl p-4 shadow-[0_5px_0_#000] space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl p-2 rounded-xl bg-[#ffe033] border-2 border-black shadow-[0_2px_0_#000]">
                              {idea.emoji}
                            </span>
                            <div>
                              <h3 className="font-black text-base text-[#1a1a2e]">
                                {idea.title}
                              </h3>
                              <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600 mt-0.5">
                                <span className="text-[#3529a8]">
                                  {idea.categoryLabel}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {idea.durationMinutes}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs font-semibold text-gray-700 leading-relaxed">
                          {idea.description}
                        </p>

                        <div className="p-3 rounded-xl bg-[#eef2ff] border-2 border-black space-y-1">
                          <span className="text-[10px] font-black text-[#3529a8] uppercase tracking-wider block">
                            Ready-to-Send Text Invitation:
                          </span>
                          <p className="text-xs text-gray-900 font-semibold italic leading-relaxed select-text">
                            &ldquo;{idea.invitationMessage}&rdquo;
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t-2 border-dashed border-black/15 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handlePersonalizeInChat(idea)}
                          className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl bg-[#ff6bd6] text-black border-2 border-black shadow-[0_2px_0_#000]"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Personalize in Chat</span>
                        </button>

                        <button
                          onClick={() =>
                            handleCopy(idea.id, idea.invitationMessage)
                          }
                          className={`inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-xl font-black border-2 border-black shadow-[0_2px_0_#000] transition ${
                            isCopied
                              ? "bg-[#38e54d] text-black"
                              : "bg-[#ffe033] hover:bg-[#ffea70] text-black"
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Invite</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
