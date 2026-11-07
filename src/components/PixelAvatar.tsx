"use client";

import React, { useState, useEffect } from "react";
import {
  AvatarConfig,
  AVATAR_COLORS,
  COLOR_LABELS,
  EYE_COUNT,
  EYE_LABELS,
  MOUTH_COUNT,
  MOUTH_LABELS,
  HAT_COUNT,
  HAT_LABELS,
  getSpriteStripUrl,
  randomAvatar,
  loadMyAvatar,
  saveMyAvatar,
  loadHerAvatar,
  saveHerAvatar,
  DEFAULT_MY_AVATAR,
  DEFAULT_HER_AVATAR,
} from "@/lib/pixel-avatar";

interface PixelAvatarProps {
  avatar?: Partial<AvatarConfig> | null;
  size?: number;
  showCrown?: boolean;
  className?: string;
  animate?: boolean;
  onClick?: () => void;
  title?: string;
}

export function PixelAvatar({
  avatar,
  size = 44,
  showCrown = false,
  className = "",
  animate = true,
  onClick,
  title,
}: PixelAvatarProps) {
  const [stripUrl, setStripUrl] = useState<string>("");

  useEffect(() => {
    const url = getSpriteStripUrl(avatar || DEFAULT_MY_AVATAR, { showCrown });
    setStripUrl(url);
  }, [
    avatar?.color,
    avatar?.eyes,
    avatar?.mouth,
    avatar?.hat,
    showCrown,
  ]);

  if (!stripUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`inline-block rounded-lg bg-[#fffdf7] border-2 border-black shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      onClick={onClick}
      title={title}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${stripUrl})`,
        backgroundSize: "400% 100%",
        imageRendering: "pixelated",
      }}
      className={`inline-block shrink-0 select-none ${
        animate ? "pixel-avatar-anim" : ""
      } ${onClick ? "cursor-pointer hover:scale-105 active:scale-95 transition-transform" : ""} ${className}`}
    />
  );
}

interface AvatarCustomizerProps {
  initialMyAvatar?: AvatarConfig;
  initialHerAvatar?: AvatarConfig;
  onChangeMyAvatar?: (cfg: AvatarConfig) => void;
  onChangeHerAvatar?: (cfg: AvatarConfig) => void;
  compact?: boolean;
  showDualTabs?: boolean;
  onClose?: () => void;
}

export function AvatarCustomizer({
  initialMyAvatar,
  initialHerAvatar,
  onChangeMyAvatar,
  onChangeHerAvatar,
  compact = false,
  showDualTabs = true,
  onClose,
}: AvatarCustomizerProps) {
  const [activeTab, setActiveTab] = useState<"me" | "her">("me");
  const [myAvatar, setMyAvatar] = useState<AvatarConfig>(
    () => initialMyAvatar || loadMyAvatar()
  );
  const [herAvatar, setHerAvatar] = useState<AvatarConfig>(
    () => initialHerAvatar || loadHerAvatar()
  );
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (initialMyAvatar) setMyAvatar(initialMyAvatar);
  }, [initialMyAvatar]);

  useEffect(() => {
    if (initialHerAvatar) setHerAvatar(initialHerAvatar);
  }, [initialHerAvatar]);

  const current = activeTab === "me" ? myAvatar : herAvatar;

  const updateCurrent = (next: AvatarConfig) => {
    if (activeTab === "me") {
      setMyAvatar(next);
      saveMyAvatar(next);
      onChangeMyAvatar?.(next);
    } else {
      setHerAvatar(next);
      saveHerAvatar(next);
      onChangeHerAvatar?.(next);
    }
  };

  const cycleField = (
    field: "color" | "eyes" | "mouth" | "hat",
    max: number,
    delta: number
  ) => {
    const nextVal = ((Number(current[field]) || 0) + delta + max) % max;
    updateCurrent({ ...current, [field]: nextVal });
  };

  const handleRandomize = () => {
    updateCurrent(randomAvatar());
  };

  const handleSaveToServer = async () => {
    saveMyAvatar(myAvatar);
    saveHerAvatar(herAvatar);
    setSavedNotice(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          my_avatar_json: JSON.stringify(myAvatar),
          her_avatar_json: JSON.stringify(herAvatar),
        }),
      });
    } catch {
      // localStorage already persisted
    }
    setTimeout(() => {
      setSavedNotice(false);
      onClose?.();
    }, 650);
  };

  return (
    <div className="ms-paint-card bg-[#fffdf7] text-[#1a1a2e] p-4 rounded-2xl border-[3px] border-black shadow-[0_6px_0_#000]">
      {showDualTabs && (
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setActiveTab("me")}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm border-[3px] border-black transition-all flex items-center justify-center gap-2 ${
              activeTab === "me"
                ? "bg-[#38e54d] text-[#092b0d] shadow-[0_3px_0_#000] -translate-y-0.5"
                : "bg-[#eef2ff] text-[#1a1a2e] hover:bg-[#e0e7ff]"
            }`}
          >
            <PixelAvatar avatar={myAvatar} size={26} />
            <span>My Character</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("her")}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm border-[3px] border-black transition-all flex items-center justify-center gap-2 ${
              activeTab === "her"
                ? "bg-[#ff6bd6] text-[#2b0922] shadow-[0_3px_0_#000] -translate-y-0.5"
                : "bg-[#eef2ff] text-[#1a1a2e] hover:bg-[#e0e7ff]"
            }`}
          >
            <PixelAvatar avatar={herAvatar} size={26} />
            <span>Amelia&apos;s Character</span>
          </button>
        </div>
      )}

      {/* Stage & Left/Right Arrows (Jeoparty.io style) */}
      <div className="relative bg-[#261c7a] border-[3px] border-black rounded-xl p-3 flex items-center justify-between gap-2 shadow-inner">
        {/* Left Arrows */}
        <div className="flex flex-col gap-1.5 z-10">
          <button
            type="button"
            onClick={() => cycleField("hat", HAT_COUNT, -1)}
            className="w-9 h-8 rounded-lg bg-[#fffdf7] hover:bg-[#ffe033] text-black font-black border-2 border-black shadow-[0_2px_0_#000] active:translate-y-0.5 text-sm flex items-center justify-center"
            title="Previous Hat"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => cycleField("eyes", EYE_COUNT, -1)}
            className="w-9 h-8 rounded-lg bg-[#fffdf7] hover:bg-[#ffe033] text-black font-black border-2 border-black shadow-[0_2px_0_#000] active:translate-y-0.5 text-sm flex items-center justify-center"
            title="Previous Eyes"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => cycleField("mouth", MOUTH_COUNT, -1)}
            className="w-9 h-8 rounded-lg bg-[#fffdf7] hover:bg-[#ffe033] text-black font-black border-2 border-black shadow-[0_2px_0_#000] active:translate-y-0.5 text-sm flex items-center justify-center"
            title="Previous Mouth"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => cycleField("color", AVATAR_COLORS.length, -1)}
            className="w-9 h-8 rounded-lg bg-[#fffdf7] hover:bg-[#ffe033] text-black font-black border-2 border-black shadow-[0_2px_0_#000] active:translate-y-0.5 text-sm flex items-center justify-center"
            title="Previous Color"
          >
            ◀
          </button>
        </div>

        {/* Center Character Stage */}
        <div className="flex flex-col items-center justify-center flex-1 py-1">
          <div className="relative bg-[#3529a8] border-[3px] border-black rounded-2xl p-2 shadow-[0_4px_0_#000] flex items-center justify-center">
            <PixelAvatar
              avatar={current}
              size={compact ? 84 : 104}
              animate={true}
            />
            <button
              type="button"
              onClick={handleRandomize}
              title="Randomize Character!"
              className="absolute -top-2.5 -right-2.5 w-9 h-9 rounded-xl bg-[#ffe033] hover:bg-[#fff066] border-[2.5px] border-black shadow-[0_3px_0_#000] flex items-center justify-center active:translate-y-0.5 transition-transform"
            >
              <img
                src="/assets/dice.png"
                alt="Randomize"
                className="w-6 h-6"
                style={{ imageRendering: "pixelated" }}
              />
            </button>
          </div>

          {/* Trait Badges */}
          <div className="mt-2.5 grid grid-cols-2 gap-1 w-full max-w-[230px] text-[10px] font-bold text-white">
            <div className="bg-black/40 border border-white/20 rounded px-2 py-0.5 truncate text-center">
              🎩 {HAT_LABELS[current.hat] || `Hat #${current.hat}`}
            </div>
            <div className="bg-black/40 border border-white/20 rounded px-2 py-0.5 truncate text-center">
              👀 {EYE_LABELS[current.eyes] || `Eyes #${current.eyes}`}
            </div>
            <div className="bg-black/40 border border-white/20 rounded px-2 py-0.5 truncate text-center">
              👄 {MOUTH_LABELS[current.mouth] || `Mouth #${current.mouth}`}
            </div>
            <div className="bg-black/40 border border-white/20 rounded px-2 py-0.5 truncate text-center">
              🎨 {COLOR_LABELS[current.color] || `Color #${current.color}`}
            </div>
          </div>
        </div>

        {/* Right Arrows */}
        <div className="flex flex-col gap-1.5 z-10">
          <button
            type="button"
            onClick={() => cycleField("hat", HAT_COUNT, 1)}
            className="w-9 h-8 rounded-lg bg-[#fffdf7] hover:bg-[#ffe033] text-black font-black border-2 border-black shadow-[0_2px_0_#000] active:translate-y-0.5 text-sm flex items-center justify-center"
            title="Next Hat"
          >
            ▶
          </button>
          <button
            type="button"
            onClick={() => cycleField("eyes", EYE_COUNT, 1)}
            className="w-9 h-8 rounded-lg bg-[#fffdf7] hover:bg-[#ffe033] text-black font-black border-2 border-black shadow-[0_2px_0_#000] active:translate-y-0.5 text-sm flex items-center justify-center"
            title="Next Eyes"
          >
            ▶
          </button>
          <button
            type="button"
            onClick={() => cycleField("mouth", MOUTH_COUNT, 1)}
            className="w-9 h-8 rounded-lg bg-[#fffdf7] hover:bg-[#ffe033] text-black font-black border-2 border-black shadow-[0_2px_0_#000] active:translate-y-0.5 text-sm flex items-center justify-center"
            title="Next Mouth"
          >
            ▶
          </button>
          <button
            type="button"
            onClick={() => cycleField("color", AVATAR_COLORS.length, 1)}
            className="w-9 h-8 rounded-lg bg-[#fffdf7] hover:bg-[#ffe033] text-black font-black border-2 border-black shadow-[0_2px_0_#000] active:translate-y-0.5 text-sm flex items-center justify-center"
            title="Next Color"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Quick Color Swatch Strip */}
      {!compact && (
        <div className="mt-3">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#1a1a2e]/70 mb-1.5 flex items-center justify-between">
            <span>Color Palette (Solid + Striped Skins)</span>
            <span>{COLOR_LABELS[current.color]}</span>
          </div>
          <div className="grid grid-cols-10 gap-1.5">
            {AVATAR_COLORS.map((c, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => updateCurrent({ ...current, color: idx })}
                title={COLOR_LABELS[idx]}
                style={{
                  background: c.stripe
                    ? `repeating-linear-gradient(135deg, ${c.fill} 0 5px, ${c.stripe} 5px 10px)`
                    : c.fill,
                }}
                className={`h-6 rounded-md border-2 border-black transition-transform ${
                  current.color === idx
                    ? "scale-110 ring-2 ring-[#ffe033] shadow-[0_2px_0_#000]"
                    : "opacity-85 hover:opacity-100"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleRandomize}
          className="px-3 py-2 rounded-xl bg-[#ffe033] hover:bg-[#ffea70] text-black font-extrabold text-xs border-[2.5px] border-black shadow-[0_3px_0_#000] active:translate-y-0.5 flex items-center gap-1.5"
        >
          🎲 Randomize
        </button>
        <button
          type="button"
          onClick={handleSaveToServer}
          className="flex-1 py-2 px-4 rounded-xl bg-[#38e54d] hover:bg-[#4df060] text-[#062409] font-extrabold text-xs sm:text-sm border-[2.5px] border-black shadow-[0_3px_0_#000] active:translate-y-0.5"
        >
          {savedNotice ? "✓ Saved Characters!" : "💾 Save Characters"}
        </button>
      </div>
    </div>
  );
}

export function AvatarCustomizerModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#3529a8] border-[3.5px] border-black rounded-3xl p-4 shadow-[0_8px_0_#000]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎨</span>
              <h2 className="text-lg font-black text-white tracking-wide drop-shadow-[0_2px_0_#000]">
                Jeoparty Character Studio
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-[#ff5252] hover:bg-[#ff6b6b] text-white font-black border-2 border-black shadow-[0_2px_0_#000] flex items-center justify-center"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-white/90 font-medium mb-3">
            Customize your hand-drawn pixel avatar and Amelia&apos;s character! Your characters appear in Chat, Virtual Dates, and Online Multiplayer games.
          </p>
          <AvatarCustomizer onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
