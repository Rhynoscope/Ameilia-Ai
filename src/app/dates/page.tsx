"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Gift,
  Heart,
  Clock,
  Sparkles,
  AlertCircle,
  X,
} from "lucide-react";
import { DateCategory, ImportantDate } from "@/lib/types";

export default function ImportantDatesPage() {
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [category, setCategory] = useState<DateCategory>("next_visit");
  const [reminderDays, setReminderDays] = useState(7);
  const [notes, setNotes] = useState("");
  const [recurring, setRecurring] = useState(true);

  useEffect(() => {
    fetchDates();
  }, []);

  const fetchDates = async () => {
    try {
      const res = await fetch("/api/dates");
      const data = await res.json();
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
    if (!confirm("Are you sure you want to remove this date?")) return;
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8 animate-fade-in pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 text-romantic-600 text-xs font-semibold">
            <CalendarIcon className="w-3.5 h-3.5 text-romantic-500" />
            Special Occasions & Milestones
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Important Dates with Amelia
          </h1>
          <p className="text-sm text-gray-600">
            Never forget birthdays, anniversaries, special dates, or future trips. Get proactive reminders so you can prepare early.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-romantic-500 to-rose-400 hover:from-romantic-600 hover:to-rose-500 text-white font-semibold text-xs shadow-md shadow-pink-200 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Important Date
        </button>
      </div>

      {/* Dates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dates.map((date) => {
          const daysLeft = calculateDaysUntil(date.event_date);
          const isSoon = daysLeft <= 14;

          return (
            <div
              key={date.id}
              className={`relative bg-white border rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3 ${
                daysLeft === 0
                  ? "border-rose-400 ring-2 ring-rose-300"
                  : isSoon
                  ? "border-pink-300"
                  : "border-pink-100"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-pink-50 text-romantic-600 border border-pink-100">
                    {date.category}
                  </span>

                  <button
                    onClick={() => handleDelete(date.id)}
                    className="p-1 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50"
                    title="Delete date"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="font-bold text-base text-gray-900">
                  {date.title}
                </h3>

                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <CalendarIcon className="w-3.5 h-3.5 text-romantic-500" />
                  <span>
                    {new Date(date.event_date + "T00:00:00").toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>

                {date.notes && (
                  <p className="text-xs text-gray-700 italic pt-1">
                    "{date.notes}"
                  </p>
                )}
              </div>

              {/* Countdown Pill */}
              <div className="pt-3 border-t border-pink-50 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">
                  Reminder: {date.reminder_days_before}d prior
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    daysLeft === 0
                      ? "bg-rose-500 text-white animate-pulse"
                      : daysLeft <= 7
                      ? "bg-romantic-500 text-white"
                      : "bg-pink-100 text-romantic-700"
                  }`}
                >
                  {daysLeft === 0 ? "🎉 Today!" : `${daysLeft} Days Away`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Date Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-pink-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-pink-100">
              <h3 className="font-bold text-base text-gray-900">
                Add Important Relationship Date
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Occasion Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Amelia's Birthday, Anniversary, Trip to Cabin"
                  className="w-full text-xs px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-romantic-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-romantic-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-romantic-400"
                  >
                    <option value="next_visit">✈️ Next Trip / Visit to See Her</option>
                    <option value="birthday">🎂 Birthday</option>
                    <option value="anniversary">💍 Anniversary</option>
                    <option value="special_occasion">🎉 Special Occasion</option>
                    <option value="plan">🗺️ Future Plan</option>
                    <option value="personal">📌 Personal Reminder</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Notify Me In Advance:
                </label>
                <select
                  value={reminderDays}
                  onChange={(e) => setReminderDays(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-romantic-400"
                >
                  <option value={14}>14 Days Before</option>
                  <option value={7}>7 Days Before (Recommended)</option>
                  <option value={3}>3 Days Before</option>
                  <option value={1}>1 Day Before</option>
                  <option value={0}>On The Day</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Notes & Gift Ideas (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Remember to book dinner at the Italian place, she wants the film camera..."
                  className="w-full text-xs px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-romantic-400"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={recurring}
                  onChange={(e) => setRecurring(e.target.checked)}
                  className="rounded text-romantic-500 focus:ring-romantic-500/50"
                />
                <label htmlFor="recurring" className="text-xs text-gray-700">
                  Repeat every year
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-romantic-500 to-rose-400 shadow-md shadow-pink-200"
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
