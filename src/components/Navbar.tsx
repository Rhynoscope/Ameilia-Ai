"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Heart,
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
  Download,
  Flame,
} from "lucide-react";
import { MemoriesModal } from "./MemoriesModal";
import { RemindersModal } from "./RemindersModal";
import { DatesModal } from "./DatesModal";
import { SettingsModal } from "./SettingsModal";
import { VirtualDatesModal } from "./VirtualDatesModal";
import { StartersModal } from "./StartersModal";
import { ImproveModal } from "./ImproveModal";

export function Navbar() {
  const [memoriesOpen, setMemoriesOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [virtualDatesOpen, setVirtualDatesOpen] = useState(false);
  const [startersOpen, setStartersOpen] = useState(false);
  const [improveOpen, setImproveOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [streakDays, setStreakDays] = useState(1);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    fetch("/api/reminders")
      .then((r) => r.json())
      .then((d: any) => {
        if (d.stats?.streakDays) setStreakDays(d.stats.streakDays);
      })
      .catch(() => {});

    fetch("/api/settings")
      .then((r) => r.json())
      .then((d: any) => setHasApiKey(Boolean(d.hasKey)))
      .catch(() => {});
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-pink-100 transition-colors pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Branding */}
            <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-romantic-500 to-rose-400 flex items-center justify-center shadow-md shadow-pink-500/20 group-hover:scale-105 transition-transform duration-200 shrink-0">
                <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-white" />
              </div>
              <div className="truncate">
                <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-romantic-600 via-rose-500 to-pink-500 bg-clip-text text-transparent">
                  Ameilia AI
                </span>
                <span className="hidden lg:block text-[10.5px] uppercase font-semibold tracking-wider text-gray-500">
                  Long-Distance Relationship Companion
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Tools */}
            <div className="hidden md:flex items-center space-x-1 lg:space-x-1.5">
              <button
                onClick={() => setStartersOpen(true)}
                className="flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 hover:text-romantic-600 hover:bg-pink-50 border border-transparent hover:border-pink-200 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-romantic-500" />
                <span>Starters</span>
              </button>

              <button
                onClick={() => setImproveOpen(true)}
                className="flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 hover:text-romantic-600 hover:bg-pink-50 border border-transparent hover:border-pink-200 transition"
              >
                <Wand2 className="w-3.5 h-3.5 text-romantic-500" />
                <span>Improve</span>
              </button>

              <button
                onClick={() => setVirtualDatesOpen(true)}
                className="flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 hover:text-romantic-600 hover:bg-pink-50 border border-transparent hover:border-pink-200 transition"
              >
                <Gamepad2 className="w-3.5 h-3.5 text-romantic-500" />
                <span>Virtual Dates</span>
              </button>

              <button
                onClick={() => setMemoriesOpen(true)}
                className="flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 hover:text-romantic-600 hover:bg-pink-50 border border-transparent hover:border-pink-200 transition"
              >
                <BookMarked className="w-3.5 h-3.5 text-romantic-500" />
                <span>Memories</span>
              </button>

              <button
                onClick={() => setRemindersOpen(true)}
                className="flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 hover:text-romantic-600 hover:bg-pink-50 border border-transparent hover:border-pink-200 transition"
              >
                <Bell className="w-3.5 h-3.5 text-romantic-500" />
                <span>Reminders</span>
              </button>

              <button
                onClick={() => setDatesOpen(true)}
                className="flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 hover:text-romantic-600 hover:bg-pink-50 border border-transparent hover:border-pink-200 transition"
              >
                <Plane className="w-3.5 h-3.5 text-romantic-500" />
                <span>Visits</span>
              </button>

              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 hover:text-romantic-600 hover:bg-pink-50 border border-transparent hover:border-pink-200 transition"
              >
                <SettingsIcon className="w-3.5 h-3.5 text-gray-500" />
                <span>Settings</span>
              </button>
            </div>

            {/* Right: Streak & Mobile Hamburger Button */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-pink-50 border border-pink-200 text-xs font-semibold text-gray-800">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{streakDays}d Streak</span>
              </div>

              {/* Mobile menu trigger */}
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-2 rounded-xl text-gray-700 hover:bg-pink-50 hover:text-romantic-600 transition"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer (Slide-over Navigation Sheet) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-fade-in">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          {/* Slide-out Sheet */}
          <div className="fixed inset-y-0 right-0 w-full max-w-xs bg-white shadow-2xl flex flex-col z-50 border-l border-pink-100 animate-in slide-in-from-right duration-300 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            {/* Drawer Header */}
            <div className="p-4 border-b border-pink-100 flex items-center justify-between bg-gradient-to-r from-pink-50/70 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-romantic-500 to-rose-400 flex items-center justify-center text-white shadow-xs">
                  <Heart className="w-4 h-4 fill-white" />
                </div>
                <div>
                  <span className="font-extrabold text-sm text-gray-900 block">Ameilia AI</span>
                  <span className="text-[10px] text-gray-500 font-medium">Relationship Companion</span>
                </div>
              </div>

              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-pink-50 transition"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Navigation List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="px-3 py-1.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">
                Tools & Coaching
              </div>

              <button
                onClick={() => {
                  setMobileOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold text-gray-900 hover:bg-pink-50 transition min-h-[44px]"
              >
                <div className="w-7 h-7 rounded-xl bg-pink-100 text-romantic-600 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span>Amelia AI Chat</span>
              </button>

              <button
                onClick={() => {
                  setStartersOpen(true);
                  setMobileOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold text-gray-900 hover:bg-pink-50 transition min-h-[44px]"
              >
                <div className="w-7 h-7 rounded-xl bg-pink-100 text-romantic-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span>Conversation Starters</span>
              </button>

              <button
                onClick={() => {
                  setImproveOpen(true);
                  setMobileOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold text-gray-900 hover:bg-pink-50 transition min-h-[44px]"
              >
                <div className="w-7 h-7 rounded-xl bg-pink-100 text-romantic-600 flex items-center justify-center">
                  <Wand2 className="w-4 h-4" />
                </div>
                <span>Polish Draft Message</span>
              </button>

              <button
                onClick={() => {
                  setVirtualDatesOpen(true);
                  setMobileOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold text-gray-900 hover:bg-pink-50 transition min-h-[44px]"
              >
                <div className="w-7 h-7 rounded-xl bg-pink-100 text-romantic-600 flex items-center justify-center">
                  <Gamepad2 className="w-4 h-4" />
                </div>
                <span>Virtual Dates & Activities</span>
              </button>

              <div className="my-2 border-t border-pink-100" />

              <div className="px-3 py-1.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">
                Relationship Hub
              </div>

              <button
                onClick={() => {
                  setMemoriesOpen(true);
                  setMobileOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold text-gray-900 hover:bg-pink-50 transition min-h-[44px]"
              >
                <div className="w-7 h-7 rounded-xl bg-pink-100 text-romantic-600 flex items-center justify-center">
                  <BookMarked className="w-4 h-4" />
                </div>
                <span>Relationship Memories</span>
              </button>

              <button
                onClick={() => {
                  setRemindersOpen(true);
                  setMobileOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold text-gray-900 hover:bg-pink-50 transition min-h-[44px]"
              >
                <div className="w-7 h-7 rounded-xl bg-pink-100 text-romantic-600 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <span>Texting Reminders</span>
              </button>

              <button
                onClick={() => {
                  setDatesOpen(true);
                  setMobileOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold text-gray-900 hover:bg-pink-50 transition min-h-[44px]"
              >
                <div className="w-7 h-7 rounded-xl bg-pink-100 text-romantic-600 flex items-center justify-center">
                  <Plane className="w-4 h-4" />
                </div>
                <span>Important Dates & Next Visits</span>
              </button>

              <div className="my-2 border-t border-pink-100" />

              <button
                onClick={() => {
                  setSettingsOpen(true);
                  setMobileOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold text-gray-900 hover:bg-pink-50 transition min-h-[44px]"
              >
                <div className="w-7 h-7 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center">
                  <SettingsIcon className="w-4 h-4" />
                </div>
                <span>Settings & Voice Profile</span>
              </button>
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-pink-100 bg-pink-50/40 text-[11px] text-gray-500 text-center">
              Ameilia AI — Long-Distance Relationship Coach
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <VirtualDatesModal isOpen={virtualDatesOpen} onClose={() => setVirtualDatesOpen(false)} />
      <MemoriesModal isOpen={memoriesOpen} onClose={() => setMemoriesOpen(false)} />
      <RemindersModal isOpen={remindersOpen} onClose={() => setRemindersOpen(false)} />
      <DatesModal isOpen={datesOpen} onClose={() => setDatesOpen(false)} />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <StartersModal isOpen={startersOpen} onClose={() => setStartersOpen(false)} />
      <ImproveModal isOpen={improveOpen} onClose={() => setImproveOpen(false)} />
    </>
  );
}
