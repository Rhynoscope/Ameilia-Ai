"use client";

import React, { useState, useEffect } from "react";
import {
  BookMarked,
  Plus,
  Search,
  Trash2,
  X,
  Heart,
  Save,
  CheckCircle2,
} from "lucide-react";
import { MemoryCategory, MemoryItem } from "@/lib/types";

const CATEGORIES: MemoryCategory[] = [
  "Interests",
  "Hobbies",
  "Favorite Things",
  "Dislikes",
  "Important Dates",
  "Favorite Foods",
  "Inside Jokes",
  "Important Conversations",
  "Things She Told Me",
  "Promises Made",
  "Topics She Enjoys",
  "Special Memories",
];

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
  const [selectedCat, setSelectedCat] = useState<MemoryCategory>("Interests");
  const [significance, setSignificance] = useState("");

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
          source: "manual",
        }),
      });
      if (res.ok) {
        setTitle("");
        setContent("");
        setSignificance("");
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white border border-pink-200 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[90dvh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom)]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-pink-100 flex items-center justify-between bg-pink-50/50">
          <div className="flex items-center gap-2.5 pr-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-romantic-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <BookMarked className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-gray-900">
                Amelia's Relationship Memories
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-500 line-clamp-1 sm:line-clamp-none">
                Amelia AI uses these saved facts to personalize every answer and suggestion.
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
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Search & Actions */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search memories (foods, hobbies, inside jokes)..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-pink-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-romantic-500/30"
              />
            </div>
            <button
              onClick={() => setAddingNew(!addingNew)}
              className="px-4 py-2 rounded-xl bg-romantic-500 text-white font-semibold text-xs hover:bg-romantic-600 transition flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{addingNew ? "Cancel" : "Add Memory"}</span>
            </button>
          </div>

          {/* Add New Memory Form */}
          {addingNew && (
            <form onSubmit={handleAdd} className="p-4 rounded-2xl bg-pastelPink-50/70 border border-pink-200 space-y-3">
              <h3 className="font-bold text-xs text-gray-900">Add a New Memory</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={selectedCat}
                    onChange={(e: any) => setSelectedCat(e.target.value)}
                    className="w-full p-2 rounded-xl border border-pink-200 bg-white text-gray-900"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
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
                    placeholder="e.g. Favorite Matcha Order"
                    className="w-full p-2 rounded-xl border border-pink-200 bg-white text-gray-900"
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
              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-romantic-500 text-white text-xs font-semibold hover:bg-romantic-600"
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
                className="group p-3.5 rounded-2xl bg-white border border-pink-100 hover:border-pink-300 shadow-sm transition space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-pastelPink-100 text-romantic-600 border border-pink-200">
                      {mem.category}
                    </span>
                    <span className="font-bold text-xs text-gray-900">{mem.title}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(mem.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-500 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">{mem.content}</p>
                {mem.emotional_significance && (
                  <p className="text-[11px] text-romantic-600 italic">
                    💡 {mem.emotional_significance}
                  </p>
                )}
              </div>
            ))}

            {memories.length === 0 && (
              <p className="text-center py-8 text-xs text-gray-400 italic">
                No memories found. Add details above or Amelia AI can learn them from chat!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
