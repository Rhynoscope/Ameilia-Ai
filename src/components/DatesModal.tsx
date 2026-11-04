"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  X,
  Heart,
  Plane,
} from "lucide-react";
import { DateCategory, ImportantDate } from "@/lib/types";

interface DatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DatesModal({ isOpen, onClose }: DatesModalProps) {
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [addingNew, setAddingNew] = useState(false);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [category, setCategory] = useState<DateCategory>("next_visit");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadDates();
    }
  }, [isOpen]);

  const loadDates = async () => {
    try {
      const res = await fetch("/api/dates");
      const data = await res.json();
      if (data.dates) setDates(data.dates);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
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
          reminder_days_before: 7,
          notes,
          is_recurring_yearly: category !== "next_visit" && category !== "plan",
        }),
      });
      if (res.ok) {
        setTitle("");
        setEventDate("");
        setNotes("");
        setAddingNew(false);
        loadDates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this date?")) return;
    try {
      await fetch(`/api/dates?id=${id}`, { method: "DELETE" });
      setDates((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const calculateDays = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    let diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) {
      target.setFullYear(today.getFullYear() + 1);
      diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }
    return diff;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-pink-200 rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-pink-100 flex items-center justify-between bg-gradient-to-r from-pink-50/50 to-white">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-pink-100 text-romantic-600 text-xs font-semibold">
              <CalendarIcon className="w-3.5 h-3.5 text-romantic-500" />
              Special Occasions & Next Trips
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Important Dates & Next Visits
            </h2>
            <p className="text-xs text-gray-600">
              Count down the days until you see Amelia in person, celebrate anniversaries, and never miss a milestone.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-800">Saved Events ({dates.length})</span>
            <button
              onClick={() => setAddingNew(!addingNew)}
              className="px-3.5 py-1.5 rounded-xl bg-romantic-500 text-white font-semibold text-xs hover:bg-romantic-600 transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{addingNew ? "Cancel" : "Add Date"}</span>
            </button>
          </div>

          {/* Add Date Form */}
          {addingNew && (
            <form onSubmit={handleAdd} className="p-4 rounded-2xl bg-pink-50/60 border border-pink-200 space-y-3">
              <h3 className="font-bold text-xs text-gray-900">Add Date or Next Visit</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Next Flight to Visit Amelia!"
                    className="w-full p-2 rounded-xl border border-pink-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-romantic-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-pink-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-romantic-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full p-2 rounded-xl border border-pink-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-romantic-400"
                  >
                    <option value="next_visit">✈️ Next Visit / Trip</option>
                    <option value="birthday">🎂 Birthday</option>
                    <option value="anniversary">💍 Anniversary</option>
                    <option value="special_occasion">🎉 Special Occasion</option>
                    <option value="plan">🗺️ Future Plan</option>
                    <option value="personal">📌 Personal Reminder</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Flight details, plans, gift ideas..."
                    className="w-full p-2 rounded-xl border border-pink-200 bg-white text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-romantic-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-romantic-500 text-white text-xs font-semibold hover:bg-romantic-600 transition"
                >
                  Save Date
                </button>
              </div>
            </form>
          )}

          {/* Dates List */}
          <div className="space-y-2.5">
            {dates.map((d) => {
              const daysLeft = calculateDays(d.event_date);
              const isNextVisit = d.category === "next_visit";

              return (
                <div
                  key={d.id}
                  className={`group p-3.5 rounded-2xl bg-white border transition flex items-center justify-between ${
                    isNextVisit
                      ? "border-pink-300 ring-1 ring-pink-200 bg-gradient-to-r from-pink-50/40 to-white"
                      : "border-pink-100 hover:border-pink-300"
                  } shadow-sm`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isNextVisit
                          ? "bg-rose-100 text-rose-700 border-rose-200 flex items-center gap-1"
                          : "bg-pink-50 text-romantic-600 border-pink-200"
                      }`}>
                        {isNextVisit && <Plane className="w-2.5 h-2.5" />}
                        {d.category.replace("_", " ")}
                      </span>
                      <span className="font-bold text-xs text-gray-900">{d.title}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-2">
                      <span>{new Date(d.event_date + "T00:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span>
                      {d.notes && <span>• "{d.notes}"</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        daysLeft === 0
                          ? "bg-rose-500 text-white animate-pulse"
                          : daysLeft <= 7
                          ? "bg-romantic-500 text-white shadow-sm"
                          : "bg-pink-50 text-romantic-700 border border-pink-200"
                      }`}
                    >
                      {daysLeft === 0 ? "🎉 Today!" : `${daysLeft}d until visit`}
                    </span>
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-500 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
