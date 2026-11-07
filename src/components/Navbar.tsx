"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  BookMarked,
  Bell,
  Settings as SettingsIcon,
  Menu,
  X,
  Sparkles,
  Gamepad2,
  Plane,
  Wand2,
  Flame,
  Palette,
} from "lucide-react";
import { MemoriesModal } from "./MemoriesModal";
import { RemindersModal } from "./RemindersModal";
import { DatesModal } from "./DatesModal";
import { SettingsModal } from "./SettingsModal";
import { VirtualDatesModal } from "./VirtualDatesModal";
import { StartersModal } from "./StartersModal";
import { ImproveModal } from "./ImproveModal";
import { PixelAvatar, AvatarCustomizerModal } from "./PixelAvatar";
import {
  AvatarConfig,
  loadHerAvatar,
  loadMyAvatar,
} from "@/lib/pixel-avatar";

export function Navbar() {
  const [memoriesOpen, setMemoriesOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [virtualDatesOpen, setVirtualDatesOpen] = useState(false);
  const [startersOpen, setStartersOpen] = useState(false);
  const [improveOpen, setImproveOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [streakDays, setStreakDays] = useState(1);

  const [myAvatar, setMyAvatar] = useState<AvatarConfig>(() => loadMyAvatar());
  const [herAvatar, setHerAvatar] = useState<AvatarConfig>(() => loadHerAvatar());

  useEffect(() => {
    fetch("/api/reminders")
      .then((r) => r.json())
      .then((d: any) => {
        if (d.stats?.streakDays) setStreakDays(d.stats.streakDays);
      })
      .catch(() => {});

    fetch("/api/settings")
      .then((r) => r.json())
      .then((d: any) => {
        if (d.myAvatar) setMyAvatar(d.myAvatar);
        if (d.herAvatar) setHerAvatar(d.herAvatar);
      })
      .catch(() => {});

    const onAvatarChanged = () => {
      setMyAvatar(loadMyAvatar());
      setHerAvatar(loadHerAvatar());
    };
    window.addEventListener("amelia-avatar-changed", onAvatarChanged);
    return () =>
      window.removeEventListener("amelia-avatar-changed", onAvatarChanged);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#261c7a] border-b-[3.5px] border-black shadow-[0_4px_0_#000] transition-colors pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            {/* Branding: Animated Skribbl / Jeoparty Pixel Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 sm:gap-3 group min-w-0 shrink-0"
            >
              <div
                className="pixel-logo-anim w-[132px] h-[33px] sm:w-[164px] sm:h-[41px] shrink-0"
                title="Ameilia AI — Hand-Drawn Relationship Companion"
              />
            </Link>

            {/* Desktop Navigation Tools */}
            <div className="hidden md:flex items-center space-x-1.5 lg:space-x-2">
              <button
                onClick={() => setVirtualDatesOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-[#38e54d] hover:bg-[#4df060] text-[#05290a] border-2 border-black shadow-[0_3px_0_#000] active:translate-y-0.5 transition"
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>Virtual Dates</span>
              </button>

              <button
                onClick={() => setMemoriesOpen(true)}
                className="flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#fffdf7] hover:bg-[#ffe033] text-black border-2 border-black shadow-[0_3px_0_#000] active:translate-y-0.5 transition"
              >
                <BookMarked className="w-3.5 h-3.5 text-[#3529a8]" />
                <span>Memories</span>
              </button>

              <button
                onClick={() => setStartersOpen(true)}
                className="flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#fffdf7] hover:bg-[#ffe033] text-black border-2 border-black shadow-[0_3px_0_#000] active:translate-y-0.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#ff4b72]" />
                <span>Starters</span>
              </button>

              <button
                onClick={() => setImproveOpen(true)}
                className="flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#fffdf7] hover:bg-[#ffe033] text-black border-2 border-black shadow-[0_3px_0_#000] active:translate-y-0.5 transition"
              >
                <Wand2 className="w-3.5 h-3.5 text-[#a855f7]" />
                <span>Improve</span>
              </button>

              <button
                onClick={() => setRemindersOpen(true)}
                className="flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#fffdf7] hover:bg-[#ffe033] text-black border-2 border-black shadow-[0_3px_0_#000] active:translate-y-0.5 transition"
              >
                <Bell className="w-3.5 h-3.5 text-[#eab308]" />
                <span>Reminders</span>
              </button>

              <button
                onClick={() => setDatesOpen(true)}
                className="flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#fffdf7] hover:bg-[#ffe033] text-black border-2 border-black shadow-[0_3px_0_#000] active:translate-y-0.5 transition"
              >
                <Plane className="w-3.5 h-3.5 text-[#0284c7]" />
                <span>Visits</span>
              </button>

              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#fffdf7] hover:bg-[#ffe033] text-black border-2 border-black shadow-[0_3px_0_#000] active:translate-y-0.5 transition"
              >
                <SettingsIcon className="w-3.5 h-3.5 text-gray-800" />
                <span>Settings</span>
              </button>
            </div>

            {/* Right: Couple Pixel Avatars, Streak & Mobile Menu */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Clickable Jeoparty Couple Avatars */}
              <button
                type="button"
                onClick={() => setAvatarModalOpen(true)}
                title="Customize your Jeoparty Pixel Characters!"
                className="flex items-center gap-0.5 px-2 py-0.5 rounded-xl bg-[#3529a8] hover:bg-[#4335ca] border-2 border-black shadow-[0_2px_0_#000] active:translate-y-0.5 transition"
              >
                <PixelAvatar avatar={myAvatar} size={28} />
                <span className="text-[11px]">💖</span>
                <PixelAvatar avatar={herAvatar} size={28} />
              </button>

              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#ffe033] border-2 border-black shadow-[0_2px_0_#000] text-xs font-black text-black">
                <Flame className="w-3.5 h-3.5 text-[#ff4b4b] fill-[#ff4b4b]" />
                <span>{streakDays}d</span>
              </div>

              {/* Mobile menu trigger */}
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-2 rounded-xl bg-[#ffe033] text-black border-2 border-black shadow-[0_2px_0_#000] active:translate-y-0.5"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-fade-in">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 w-full max-w-xs bg-[#261c7a] text-white shadow-2xl flex flex-col z-50 border-l-[4px] border-black pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <div className="p-4 border-b-[3px] border-black flex items-center justify-between bg-[#3529a8]">
              <div className="flex items-center gap-2">
                <PixelAvatar avatar={myAvatar} size={32} />
                <PixelAvatar avatar={herAvatar} size={32} />
                <div>
                  <span className="font-black text-sm text-white block">
                    Ameilia AI
                  </span>
                  <span className="text-[10px] text-[#ffe033] font-bold">
                    Couple Companion
                  </span>
                </div>
              </div>

              <button
                onClick={() => setMobileOpen(false)}
                className="w-8 h-8 rounded-xl bg-[#ff5252] text-white font-black border-2 border-black flex items-center justify-center"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <button
                onClick={() => {
                  setVirtualDatesOpen(true);
                  setMobileOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-black bg-[#38e54d] text-[#05290a] border-2 border-black shadow-[0_3px_0_#000]"
              >
                <Gamepad2 className="w-4 h-4" />
                <span>🎮 Playable Virtual Dates Arcade</span>
              </button>

              <button
                onClick={() => {
                  setAvatarModalOpen(true);
                  setMobileOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-black bg-[#ff6bd6] text-black border-2 border-black shadow-[0_3px_0_#000]"
              >
                <Palette className="w-4 h-4" />
                <span>🎨 Customize Pixel Characters</span>
              </button>

              <button
                onClick={() => {
                  setMemoriesOpen(true);
                  setMobileOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-black bg-[#fffdf7] text-black border-2 border-black shadow-[0_3px_0_#000]"
              >
                <BookMarked className="w-4 h-4 text-[#3529a8]" />
                <span>💖 Relationship Memories</span>
              </button>

              <button
                onClick={() => {
                  setStartersOpen(true);
                  setMobileOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-black bg-[#fffdf7] text-black border-2 border-black shadow-[0_3px_0_#000]"
              >
                <Sparkles className="w-4 h-4 text-[#ff4b72]" />
                <span>✨ Conversation Starters</span>
              </button>

              <button
                onClick={() => {
                  setImproveOpen(true);
                  setMobileOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-black bg-[#fffdf7] text-black border-2 border-black shadow-[0_3px_0_#000]"
              >
                <Wand2 className="w-4 h-4 text-[#a855f7]" />
                <span>🪄 Polish Draft Message</span>
              </button>

              <button
                onClick={() => {
                  setRemindersOpen(true);
                  setMobileOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-black bg-[#fffdf7] text-black border-2 border-black shadow-[0_3px_0_#000]"
              >
                <Bell className="w-4 h-4 text-[#eab308]" />
                <span>🔔 Texting Reminders</span>
              </button>

              <button
                onClick={() => {
                  setDatesOpen(true);
                  setMobileOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-black bg-[#fffdf7] text-black border-2 border-black shadow-[0_3px_0_#000]"
              >
                <Plane className="w-4 h-4 text-[#0284c7]" />
                <span>✈️ Important Dates & Next Visits</span>
              </button>

              <button
                onClick={() => {
                  setSettingsOpen(true);
                  setMobileOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-black bg-[#ffe033] text-black border-2 border-black shadow-[0_3px_0_#000]"
              >
                <SettingsIcon className="w-4 h-4" />
                <span>⚙️ Settings & Learned Style</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AvatarCustomizerModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
      />
      <VirtualDatesModal
        isOpen={virtualDatesOpen}
        onClose={() => setVirtualDatesOpen(false)}
      />
      <MemoriesModal
        isOpen={memoriesOpen}
        onClose={() => setMemoriesOpen(false)}
      />
      <RemindersModal
        isOpen={remindersOpen}
        onClose={() => setRemindersOpen(false)}
      />
      <DatesModal isOpen={datesOpen} onClose={() => setDatesOpen(false)} />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <StartersModal
        isOpen={startersOpen}
        onClose={() => setStartersOpen(false)}
      />
      <ImproveModal
        isOpen={improveOpen}
        onClose={() => setImproveOpen(false)}
      />
    </>
  );
}
