"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  CheckCircle2,
  Clock,
  Play,
  Save,
  Sliders,
  X,
} from "lucide-react";
import {
  generateDailyRandomSchedule,
  getNotificationPermission,
  playRomanticChime,
  requestNotificationPermission,
  showBrowserNotification,
} from "@/lib/notifications";
import { ReminderSettings } from "@/lib/types";
import { DEFAULT_REMINDER_SETTINGS } from "@/lib/constants";

interface RemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckinSuccess?: () => void;
}

export function RemindersModal({ isOpen, onClose, onCheckinSuccess }: RemindersModalProps) {
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [stats, setStats] = useState({
    completedCount: 0,
    targetCount: 3,
    streakDays: 1,
    lastCheckin: null as string | null,
  });
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [quickNote, setQuickNote] = useState("");
  const [scheduledTimes, setScheduledTimes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/reminders");
      const data: any = await res.json();
      if (data.settings) {
        setSettings(data.settings);
        setScheduledTimes(
          generateDailyRandomSchedule(data.settings.startTime, data.settings.endTime, data.settings.minPerDay)
        );
      }
      if (data.stats) setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setPermission(perm);
    if (perm === "granted") {
      showBrowserNotification("Amelia Assistant Notifications Enabled! ❤️", {
        body: "Gentle randomized reminders will nudge you throughout the day.",
      });
    }
  };

  const handleTestChime = () => {
    showBrowserNotification("Thinking of Amelia? ❤️", {
      body: "Have you checked in with Amelia today? Send her a little reminder that you're thinking of her across the distance.",
      playSound: true,
    });
  };

  const handleQuickCheckin = async () => {
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkin", notes: quickNote.trim() || "Sent text message" }),
      });
      const data: any = await res.json();
      if (data.stats) setStats(data.stats);
      setQuickNote("");
      if (onCheckinSuccess) onCheckinSuccess();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_settings", settings }),
      });
      setScheduledTimes(
        generateDailyRandomSchedule(settings.startTime, settings.endTime, settings.minPerDay)
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white border border-pink-200 rounded-t-3xl sm:rounded-3xl max-w-xl w-full max-h-[90dvh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom)]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-pink-100 flex items-center justify-between bg-pink-50/50">
          <div className="flex items-center gap-2.5 pr-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-romantic-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-gray-900">
                Texting Reminders & Daily Goal
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-500 line-clamp-1 sm:line-clamp-none">
                Gentle randomized nudges during waking hours.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-white transition shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Permission & Test Sound Banner */}
          <div className="p-4 rounded-2xl bg-pastelPink-50/80 border border-pink-200 flex items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-gray-900">
                Browser Notifications: <span className="uppercase text-romantic-600 font-semibold">{permission}</span>
              </div>
              <p className="text-gray-500 text-[11px] mt-0.5">
                {permission === "granted" ? "Desktop alerts and sound chimes active." : "Enable to receive gentle desktop nudges."}
              </p>
            </div>
            {permission !== "granted" ? (
              <button
                onClick={handleRequestPermission}
                className="px-3 py-1.5 rounded-xl bg-romantic-500 text-white font-semibold text-xs shadow-sm hover:bg-romantic-600"
              >
                Enable
              </button>
            ) : (
              <button
                onClick={handleTestChime}
                className="px-3 py-1.5 rounded-xl bg-white border border-pink-200 text-romantic-600 font-semibold text-xs hover:bg-pastelPink-50 flex items-center gap-1"
              >
                <Play className="w-3 h-3" /> Test Chime
              </button>
            )}
          </div>

          {/* Today's Progress Card */}
          <div className="p-4 rounded-2xl bg-white border border-pink-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-800">Today's Progress</span>
              <span className="font-bold text-romantic-600">
                {stats.completedCount} / {settings.minPerDay} texts completed
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-pink-100 overflow-hidden">
              <div
                className="h-full bg-romantic-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((stats.completedCount / Math.max(settings.minPerDay, 1)) * 100, 100)}%` }}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="I texted Amelia (e.g. asked about lunch)..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-pink-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-romantic-500/30"
              />
              <button
                onClick={handleQuickCheckin}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-semibold text-xs hover:bg-emerald-600 transition flex items-center gap-1.5 shrink-0"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Log Text
              </button>
            </div>
          </div>

          {/* Today's Randomized Slots */}
          <div className="space-y-1.5 text-xs">
            <span className="font-bold text-gray-800">Today's Randomized Times</span>
            <div className="grid grid-cols-3 gap-2">
              {scheduledTimes.map((t, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border text-center font-semibold ${
                    idx < stats.completedCount
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-pastelPink-50/50 border-pink-100 text-gray-700"
                  }`}
                >
                  <Clock className="w-3 h-3 mx-auto mb-0.5 opacity-60" />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Timing Settings Form */}
          <form onSubmit={handleSaveSettings} className="p-4 rounded-2xl bg-white border border-pink-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-800">Schedule Preferences</span>
              {saved && <span className="text-emerald-600 font-semibold text-[11px]">Saved!</span>}
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Target Texts/Day</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={settings.minPerDay}
                  onChange={(e) => setSettings({ ...settings, minPerDay: Number(e.target.value) })}
                  className="w-full p-2 rounded-xl border border-pink-200 bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Waking Hours</label>
                <div className="flex items-center gap-1">
                  <input
                    type="time"
                    value={settings.startTime}
                    onChange={(e) => setSettings({ ...settings, startTime: e.target.value })}
                    className="w-full p-2 rounded-xl border border-pink-200 bg-white text-gray-900"
                  />
                  <span>to</span>
                  <input
                    type="time"
                    value={settings.endTime}
                    onChange={(e) => setSettings({ ...settings, endTime: e.target.value })}
                    className="w-full p-2 rounded-xl border border-pink-200 bg-white text-gray-900"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-romantic-500 text-white font-semibold text-xs hover:bg-romantic-600 transition flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" /> Save Preferences
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
