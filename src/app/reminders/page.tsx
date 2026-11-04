"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  CheckCircle2,
  Clock,
  Play,
  Save,
  Sliders,
} from "lucide-react";
import {
  generateDailyRandomSchedule,
  getNotificationPermission,
  playRomanticChime,
  registerServiceWorker,
  requestNotificationPermission,
  showBrowserNotification,
} from "@/lib/notifications";
import { ReminderLogItem, ReminderSettings } from "@/lib/types";
import { DEFAULT_REMINDER_SETTINGS } from "@/lib/constants";

export default function RemindersPage() {
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [logs, setLogs] = useState<ReminderLogItem[]>([]);
  const [stats, setStats] = useState({
    completedCount: 0,
    targetCount: 3,
    streakDays: 1,
    lastCheckin: null as string | null,
  });
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [scheduledTimes, setScheduledTimes] = useState<string[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [quickNotes, setQuickNotes] = useState("");

  useEffect(() => {
    setPermission(getNotificationPermission());
    registerServiceWorker();
    fetchRemindersData();
  }, []);

  const fetchRemindersData = async () => {
    try {
      const res = await fetch("/api/reminders");
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
        const times = generateDailyRandomSchedule(
          data.settings.startTime,
          data.settings.endTime,
          data.settings.minPerDay
        );
        setScheduledTimes(times);
      }
      if (data.logs) setLogs(data.logs);
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
        body: "You will receive randomized gentle reminders to text Amelia throughout your day.",
      });
    }
  };

  const handleTestNotification = () => {
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
        body: JSON.stringify({
          action: "checkin",
          notes: quickNotes.trim() || "Sent text message to Amelia",
        }),
      });
      const data = await res.json();
      if (data.stats) setStats(data.stats);
      setQuickNotes("");
      fetchRemindersData();
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
        body: JSON.stringify({
          action: "update_settings",
          settings,
        }),
      });
      const times = generateDailyRandomSchedule(
        settings.startTime,
        settings.endTime,
        settings.minPerDay
      );
      setScheduledTimes(times);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in bg-white min-h-[calc(100vh-4rem)]">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pastelPink-100 text-romantic-600 text-xs font-semibold border border-pink-200">
          <Bell className="w-3.5 h-3.5" />
          Smart Texting Reminders
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
          Reminders & Check-in Schedule
        </h1>
        <p className="text-xs sm:text-sm text-gray-600">
          Randomized gentle nudges throughout your waking hours so reaching out to Amelia becomes an effortless daily habit.
        </p>
      </div>

      {/* Browser Notification Permission Banner */}
      <div className="p-5 rounded-3xl bg-pastelPink-50 border border-pink-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-romantic-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-gray-900">
              Browser Notifications Status:{" "}
              <span
                className={`uppercase tracking-wider text-xs px-2.5 py-0.5 rounded-full ${
                  permission === "granted"
                    ? "bg-emerald-100 text-emerald-800 font-bold border border-emerald-200"
                    : "bg-pastelPink-200 text-romantic-700 font-bold border border-pink-300"
                }`}
              >
                {permission}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              {permission === "granted"
                ? "Desktop notifications and audio chimes are ready to gently remind you."
                : "Enable browser notifications to receive nudges throughout your day."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {permission !== "granted" ? (
            <button
              onClick={handleRequestPermission}
              className="px-4 py-2 rounded-xl bg-romantic-500 text-white font-bold text-xs shadow-sm hover:bg-romantic-600"
            >
              Enable Notifications
            </button>
          ) : (
            <button
              onClick={handleTestNotification}
              className="px-3.5 py-2 rounded-xl bg-white border border-pink-200 text-romantic-600 font-semibold text-xs flex items-center gap-1.5 hover:bg-pastelPink-100 transition"
            >
              <Play className="w-3.5 h-3.5" />
              Test Notification Sound
            </button>
          )}
        </div>
      </div>

      {/* Manual Check-in & Today's Schedule Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's Randomized Schedule */}
        <div className="bg-white border border-pink-200 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-romantic-500" />
              <h3 className="font-bold text-sm text-gray-900">
                Today's Randomized Times
              </h3>
            </div>
            <span className="text-xs font-semibold text-romantic-600">
              {stats.completedCount} / {settings.minPerDay} Done
            </span>
          </div>

          <div className="space-y-2">
            {scheduledTimes.map((t, idx) => {
              const isCompleted = idx < stats.completedCount;
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-2xl border text-xs ${
                    isCompleted
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-pastelPink-50/50 border-pink-100 text-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{t}</span>
                    <span className="text-gray-500">— Slot #{idx + 1}</span>
                  </div>

                  {isCompleted ? (
                    <span className="flex items-center gap-1 font-semibold text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" /> Completed
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">Scheduled</span>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-gray-500 italic">
            Times are scattered randomly within waking hours ({settings.startTime} – {settings.endTime}) to keep reach-outs feeling natural.
          </p>
        </div>

        {/* Quick Check-in Logger */}
        <div className="bg-white border border-pink-200 rounded-3xl p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <h3 className="font-bold text-sm text-gray-900">
                Manual Check-in Logger
              </h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Whenever you text Amelia, tap below to log it toward your daily goal!
            </p>

            <div className="mt-3">
              <input
                type="text"
                value={quickNotes}
                onChange={(e) => setQuickNotes(e.target.value)}
                placeholder="Optional note: e.g. Sent funny cat reel, asked about lunch..."
                className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-white border border-pink-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-romantic-500/30"
              />
            </div>
          </div>

          <button
            onClick={handleQuickCheckin}
            className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>I Texted Amelia! (Log Progress)</span>
          </button>
        </div>
      </div>

      {/* Reminder Configuration Form */}
      <form
        onSubmit={handleSaveSettings}
        className="bg-white border border-pink-200 rounded-3xl p-6 space-y-6 shadow-sm"
      >
        <div className="flex items-center justify-between pb-3 border-b border-pink-100">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-romantic-500" />
            <h3 className="font-bold text-base text-gray-900">
              Reminder Frequency & Time Windows
            </h3>
          </div>
          {savedSuccess && (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Settings Saved!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Min Reminders / Day</label>
            <input
              type="number"
              min={1}
              max={10}
              value={settings.minPerDay}
              onChange={(e) => setSettings({ ...settings, minPerDay: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-pink-200 text-gray-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Max Reminders / Day</label>
            <input
              type="number"
              min={1}
              max={10}
              value={settings.maxPerDay}
              onChange={(e) => setSettings({ ...settings, maxPerDay: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-pink-200 text-gray-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Start Time (Waking)</label>
            <input
              type="time"
              value={settings.startTime}
              onChange={(e) => setSettings({ ...settings, startTime: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-pink-200 text-gray-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">End Time (Bedtime)</label>
            <input
              type="time"
              value={settings.endTime}
              onChange={(e) => setSettings({ ...settings, endTime: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-pink-200 text-gray-900"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-2xl bg-romantic-500 hover:bg-romantic-600 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" /> Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
