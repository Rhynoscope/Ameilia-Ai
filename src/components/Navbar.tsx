"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Heart,
  MessageSquare,
  BookMarked,
  Bell,
  Calendar,
  Settings as SettingsIcon,
  CheckCircle2,
  Menu,
  X,
  Sparkles,
  Gamepad2,
  Plane,
} from "lucide-react";
import { MemoriesModal } from "./MemoriesModal";
import { RemindersModal } from "./RemindersModal";
import { DatesModal } from "./DatesModal";
import { SettingsModal } from "./SettingsModal";
import { VirtualDatesModal } from "./VirtualDatesModal";

export function Navbar() {
  const [memoriesOpen, setMemoriesOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [virtualDatesOpen, setVirtualDatesOpen] = useState(false);
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
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-pink-100 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Branding */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-romantic-500 to-rose-400 flex items-center justify-center shadow-md shadow-pink-500/20 group-hover:scale-105 transition-transform duration-200">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-romantic-600 via-rose-500 to-pink-500 bg-clip-text text-transparent">
                  Amelia AI
                </span>
                <span className="hidden sm:block text-[10.5px] uppercase font-semibold tracking-wider text-gray-500">
                  Long-Distance Relationship Companion
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Modals / Tools */}
            <div className="hidden md:flex items-center space-x-1.5">
              <button
                onClick={() => setVirtualDatesOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 hover:text-romantic-600 hover:bg-pink-50 border border-transparent hover:border-pink-200 transition"
              >
                <Gamepad2 className="w-3.5 h-3.5 text-romantic-500" />
                <span>Virtual Dates</span>
              </button>

              <button
                onClick={() => setMemoriesOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 hover:text-romantic-600 hover:bg-pink-50 border border-transparent hover:border-pink-200 transition"
              >
                <BookMarked className="w-3.5 h-3.5 text-romantic-500" />
                <span>Memories</span>
              </button>

              <button
                onClick={() => setRemindersOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 hover:text-romantic-600 hover:bg-pink-50 border border-transparent hover:border-pink-200 transition"
              >
                <Bell className="w-3.5 h-3.5 text-romantic-500" />
                <span>Reminders</span>
              </button>

              <button
                onClick={() => setDatesOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 hover:text-romantic-600 hover:bg-pink-50 border border-transparent hover:border-pink-200 transition"
              >
                <Plane className="w-3.5 h-3.5 text-romantic-500" />
                <span>Visits & Dates</span>
              </button>

              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 hover:text-romantic-600 hover:bg-pink-50 border border-transparent hover:border-pink-200 transition"
              >
                <SettingsIcon className="w-3.5 h-3.5 text-gray-500" />
                <span>Settings</span>
              </button>
            </div>

            {/* Streak & Status Badge */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 border border-pink-200 text-xs font-semibold text-gray-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{streakDays}d Streak</span>
              </div>

              {/* Mobile menu trigger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-xl text-gray-600 hover:bg-pink-50"
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileOpen && (
          <div className="md:hidden border-b border-pink-100 bg-white px-4 py-3 space-y-1 shadow-lg animate-fade-in">
            <button
              onClick={() => {
                setVirtualDatesOpen(true);
                setMobileOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 hover:bg-pink-50"
            >
              <Gamepad2 className="w-4 h-4 text-romantic-500" />
              <span>Virtual Dates & Activities</span>
            </button>
            <button
              onClick={() => {
                setMemoriesOpen(true);
                setMobileOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 hover:bg-pink-50"
            >
              <BookMarked className="w-4 h-4 text-romantic-500" />
              <span>Relationship Memories</span>
            </button>
            <button
              onClick={() => {
                setRemindersOpen(true);
                setMobileOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 hover:bg-pink-50"
            >
              <Bell className="w-4 h-4 text-romantic-500" />
              <span>Texting Reminders</span>
            </button>
            <button
              onClick={() => {
                setDatesOpen(true);
                setMobileOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 hover:bg-pink-50"
            >
              <Plane className="w-4 h-4 text-romantic-500" />
              <span>Important Dates & Next Visits</span>
            </button>
            <button
              onClick={() => {
                setSettingsOpen(true);
                setMobileOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-gray-800 hover:bg-pink-50"
            >
              <SettingsIcon className="w-4 h-4 text-gray-500" />
              <span>Settings & Voice Profile</span>
            </button>
          </div>
        )}
      </nav>

      {/* Slide-over Modals */}
      <VirtualDatesModal isOpen={virtualDatesOpen} onClose={() => setVirtualDatesOpen(false)} />
      <MemoriesModal isOpen={memoriesOpen} onClose={() => setMemoriesOpen(false)} />
      <RemindersModal isOpen={remindersOpen} onClose={() => setRemindersOpen(false)} />
      <DatesModal isOpen={datesOpen} onClose={() => setDatesOpen(false)} />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
