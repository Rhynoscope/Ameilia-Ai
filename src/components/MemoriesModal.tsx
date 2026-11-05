"use client";

import React, { useState, useEffect } from "react";
import {
  BookMarked,
  Plus,
  Search,
  Trash2,
  X,
  Heart,
  Calendar,
  Sparkles,
} from "lucide-react";
import { MemoryCategory, MemoryItem, MemoryStatus, MemorySourceType } from "@/lib/types";
import { MEMORY_CATEGORIES } from "@/lib/constants";

interface MemoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MemoriesModal({ isOpen, onClose }: MemoriesModalProps) {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [addingNew, setAddingNew] = useState(false);

  // New Memory Form
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedCat, setSelectedCat] = useState<MemoryCategory>("Core Profile & Basics");
  const [significance, setSignificance] = useState("");
  const [approxDate, setApproxDate] = useState("");
  const [status, setStatus] = useState<MemoryStatus>("confirmed");
  const [sourceType, setSourceType] = useState<MemorySourceType>("her_statement");

  useEffect(() => {
    if (isOpen) {
      loadMemories();
    }
  }, [isOpen, search, category]);

  const loadMemories = async () => {
    try {
      let url = "/api/memories?";
      if (category !== "all") url += `category=${encodeURIComponent(category)}&`;
      if (search.trim()) url += `search=${encodeURIComponent(search.trim())}&`;
      const res = await fetch(url);
      const data: any = await res.json();
      if (data.memories) setMemories(data.memories);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      const res = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: selectedCat,
          title,
          content,
          emotional_significance: significance,
          approx_date: approxDate,
          status,
          source_type: sourceType,
          source: "manual",
        }),
      });
      if (res.ok) {
        setTitle("");
        setContent("");
        setSignificance("");
        setApproxDate("");
        setStatus("confirmed");
        setSourceType("her_statement");
        setAddingNew(false);
        loadMemories();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this memory?")) return;
    try {
      await fetch(`/api/memories?id=${id}`, { method: "DELETE" });
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusBadge = (s?: MemoryStatus) => {
    switch (s) {
      case "promise":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">💍 Promise</span>;
      case "goal":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">🎯 Goal</span>;
      case "preference":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200">❤️ Preference</span>;
      case "uncertain":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">⚠️ Uncertain</span>;
      case "confirmed":
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">✅ Confirmed</span>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white border border-pink-200 rounded-t-3xl sm:rounded-3xl max-w-3xl w-full max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom)]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-pink-100 flex items-center justify-between bg-pink-50/50">
          <div className="flex items-center gap-2.5 pr-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-romantic-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <BookMarked className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-gray-900">
                Amelia's Relationship Memories & Knowledge
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-500 line-clamp-1 sm:line-clamp-none">
                Persistent relationship vault. Amelia AI automatically references these facts in chats.
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

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 flex-1">
          {/* Search & Actions */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search memories (sushi, Overwatch, inside jokes, promises)..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-pink-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-romantic-500/30"
              />
            </div>
            <button
              onClick={() => setAddingNew(!addingNew)}
              className="px-3.5 py-2 rounded-xl bg-romantic-500 text-white font-semibold text-xs hover:bg-romantic-600 transition flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{addingNew ? "Cancel" : "Add Memory"}</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              onClick={() => setCategory("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                category === "all"
                  ? "bg-romantic-500 text-white shadow-sm"
                  : "bg-white text-gray-700 hover:text-romantic-600 border border-pink-200"
              }`}
            >
              All ({memories.length})
            </button>
            {MEMORY_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${
                  category === c.id
                    ? "bg-romantic-500 text-white shadow-sm"
                    : "bg-white text-gray-700 hover:text-romantic-600 border border-pink-200"
                }`}
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>

          {/* Add New Memory Form */}
          {addingNew && (
            <form onSubmit={handleAdd} className="p-4 rounded-2xl bg-pastelPink-50/70 border border-pink-200 space-y-3 animate-fade-in">
              <h3 className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-romantic-500" />
                Add a New Relationship Memory
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={selectedCat}
                    onChange={(e: any) => setSelectedCat(e.target.value)}
                    className="w-full p-2 rounded-xl border border-pink-200 bg-white text-gray-900 text-xs"
                  >
                    {MEMORY_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Favorite Sushi Date Order"
                    className="w-full p-2 rounded-xl border border-pink-200 bg-white text-gray-900 text-xs"
                  />
                </div>
              </div>
              <textarea
                rows={2}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Details of what she likes, said, or promised..."
                className="w-full p-2 rounded-xl border border-pink-200 bg-white text-gray-900 text-xs"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Emotional Significance / Notes</label>
                  <input
                    type="text"
                    value={significance}
                    onChange={(e) => setSignificance(e.target.value)}
                    placeholder="Why it matters"
                    className="w-full p-2 rounded-xl border border-pink-200 bg-white text-gray-900 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Approximate Date</label>
                  <input
                    type="text"
                    value={approxDate}
                    onChange={(e) => setApproxDate(e.target.value)}
                    placeholder="e.g. October 8 or Ongoing"
                    className="w-full p-2 rounded-xl border border-pink-200 bg-white text-gray-900 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full p-2 rounded-xl border border-pink-200 bg-white text-gray-900 text-xs"
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="preference">Preference</option>
                    <option value="promise">Promise</option>
                    <option value="goal">Goal</option>
                    <option value="uncertain">Uncertain</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-romantic-500 text-white text-xs font-semibold hover:bg-romantic-600 transition"
                >
                  Save Memory
                </button>
              </div>
            </form>
          )}

          {/* Memories List */}
          <div className="space-y-2.5">
            {memories.map((mem) => (
              <div
                key={mem.id}
                className="group p-3.5 rounded-2xl bg-white border border-pink-100 hover:border-pink-300 shadow-xs transition space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-pastelPink-100 text-romantic-600 border border-pink-200">
                      {mem.category}
                    </span>
                    {getStatusBadge(mem.status)}
                    {mem.approx_date && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        {mem.approx_date}
                      </span>
                    )}
                    <h3 className="font-bold text-xs text-gray-900 ml-1">{mem.title}</h3>
                  </div>
                  <button
                    onClick={() => handleDelete(mem.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-500 transition shrink-0"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{mem.content}</p>
                {mem.emotional_significance && (
                  <p className="text-[11px] text-romantic-600 italic flex items-center gap-1">
                    <Heart className="w-2.5 h-2.5 fill-romantic-500/20" />
                    <span>{mem.emotional_significance}</span>
                  </p>
                )}
                {mem.source_type && (
                  <p className="text-[10px] text-gray-400">
                    Source: {mem.source_type === "her_statement" ? "Her own words" : "Boyfriend's notes"}
                  </p>
                )}
              </div>
            ))}

            {memories.length === 0 && (
              <p className="text-center py-8 text-xs text-gray-400 italic">
                No memories found matching your filter.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
