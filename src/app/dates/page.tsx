"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Gamepad2,
  X,
} from "lucide-react";
import { DateCategory, ImportantDate } from "@/lib/types";
import { VirtualDatesArena } from "@/components/VirtualDatesArena";

export default function ImportantDatesPage() {
  const [activeTab, setActiveTab] = useState<"arcade" | "milestones">("arcade");
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [category, setCategory] = useState<DateCategory>("next_visit");
  const [reminderDays, setReminderDays] = useState(7);
  const [notes, setNotes] = useState("");
  const [recurring, setRecurring] = useState(true);
  const [roomCodeFromUrl, setRoomCodeFromUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchDates();
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const rm = sp.get("room");
      if (rm) {
        setRoomCodeFromUrl(rm.toUpperCase());
        setActiveTab("arcade");
      }
    }
  }, []);

  const fetchDates = async () => {
    try {
      const res = await fetch("/api/dates");
      const data: any = await res.json();
      if (data.dates) setDates(data.dates);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !eventDate) return;

    try {
      const res = await fetch("/api/dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          event_date: eventDate,
          category,
          reminder_days_before: reminderDays,
          notes,
          is_recurring_yearly: recurring,
        }),
      });

      if (res.ok) {
        setModalOpen(false);
        setTitle("");
        setEventDate("");
        setNotes("");
        fetchDates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/dates?id=${id}`, { method: "DELETE" });
      setDates((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const calculateDaysUntil = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    let diff = Math.ceil(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff < 0) {
      target.setFullYear(today.getFullYear() + 1);
      diff = Math.ceil(
        (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
    }
    return diff;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6 pb-16">
      {/* Top Mode Switcher */}
      <div className="bg-[#261c7a] text-white border-[3.5px] border-black rounded-3xl p-4 shadow-[0_6px_0_#000] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-wide drop-shadow-[0_2px_0_#000]">
            🎮 Virtual Dates Arcade & Relationship Milestones
          </h1>
          <p className="text-xs text-white/85 font-bold">
            Play live multiplayer board & party games together, or track your upcoming visits & anniversaries!
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("arcade")}
            className={`px-4 py-2 rounded-xl font-black text-xs border-2 border-black transition-all flex items-center gap-1.5 ${
              activeTab === "arcade"
                ? "bg-[#38e54d] text-[#05290a] shadow-[0_3px_0_#000]"
                : "bg-[#fffdf7] text-black hover:bg-[#ffe033]"
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Multiplayer Games</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("milestones")}
            className={`px-4 py-2 rounded-xl font-black text-xs border-2 border-black transition-all flex items-center gap-1.5 ${
              activeTab === "milestones"
                ? "bg-[#ffe033] text-black shadow-[0_3px_0_#000]"
                : "bg-[#fffdf7] text-black hover:bg-[#ffe033]"
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Important Dates ({dates.length})</span>
          </button>
        </div>
      </div>

      {activeTab === "arcade" ? (
        <VirtualDatesArena initialRoomCode={roomCodeFromUrl} />
      ) : (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#38e54d] hover:bg-[#4df060] text-black font-black text-xs border-[2.5px] border-black shadow-[0_4px_0_#000]"
            >
              <Plus className="w-4 h-4" />
              Add Important Date
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dates.map((date) => {
              const daysLeft = calculateDaysUntil(date.event_date);
              return (
                <div
                  key={date.id}
                  className="bg-[#fffdf7] text-[#1a1a2e] border-[3px] border-black rounded-2xl p-5 shadow-[0_5px_0_#000] flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-[#ffe033] text-black border-2 border-black">
                        {date.category}
                      </span>

                      <button
                        onClick={() => handleDelete(date.id)}
                        className="p-1.5 rounded-lg bg-[#ff5252] text-white border border-black"
                        title="Delete date"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h3 className="font-black text-base text-[#1a1a2e]">
                      {date.title}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                      <CalendarIcon className="w-3.5 h-3.5 text-[#3529a8]" />
                      <span>
                        {new Date(
                          date.event_date + "T00:00:00"
                        ).toLocaleDateString(undefined, {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    {date.notes && (
                      <p className="text-xs text-gray-700 font-medium italic pt-1">
                        &ldquo;{date.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t-2 border-dashed border-black/20 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-600">
                      Reminder: {date.reminder_days_before}d prior
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black border-2 border-black ${
                        daysLeft === 0
                          ? "bg-[#38e54d] text-black"
                          : "bg-[#ff6bd6] text-black"
                      }`}
                    >
                      {daysLeft === 0 ? "🎉 Today!" : `${daysLeft} Days Away`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Date Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#fffdf7] text-[#1a1a2e] border-[3.5px] border-black rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 shadow-[0_8px_0_#000] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b-2 border-black">
              <h3 className="font-black text-base">
                Add Important Relationship Date
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-[#ff5252] text-white font-black border-2 border-black flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-black mb-1">
                  Occasion Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Amelia's Birthday, Anniversary, Next Visit"
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-white border-2 border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-white border-2 border-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-white border-2 border-black"
                  >
                    <option value="next_visit">✈️ Next Trip / Visit</option>
                    <option value="birthday">🎂 Birthday</option>
                    <option value="anniversary">💍 Anniversary</option>
                    <option value="special_occasion">🎉 Special Occasion</option>
                    <option value="plan">🗺️ Future Plan</option>
                    <option value="personal">📌 Personal Reminder</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black mb-1">
                  Notes & Gift Ideas (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-white border-2 border-black"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-gray-200 border-2 border-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-[#38e54d] text-black border-2 border-black shadow-[0_3px_0_#000]"
                >
                  Save Date
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
