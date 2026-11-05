"use client";

import React, { useState, useEffect } from "react";
import {
  BookMarked,
  Plus,
  Search,
  Trash2,
  Edit2,
  Heart,
  X,
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

export default function MemoriesPage() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Modal / Form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formCategory, setFormCategory] = useState<MemoryCategory>("Interests");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formEmotionalSignificance, setFormEmotionalSignificance] = useState("");

  useEffect(() => {
    fetchMemories();
  }, [selectedCategory, search]);

  const fetchMemories = async () => {
    try {
      let url = "/api/memories?";
      if (selectedCategory !== "all") url += `category=${encodeURIComponent(selectedCategory)}&`;
      if (search.trim()) url += `search=${encodeURIComponent(search.trim())}&`;

      const res = await fetch(url);
      const data: any = await res.json();
      if (data.memories) {
        setMemories(data.memories);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormCategory("Interests");
    setFormTitle("");
    setFormContent("");
    setFormEmotionalSignificance("");
    setModalOpen(true);
  };

  const openEditModal = (mem: MemoryItem) => {
    setEditingId(mem.id);
    setFormCategory(mem.category);
    setFormTitle(mem.title);
    setFormContent(mem.content);
    setFormEmotionalSignificance(mem.emotional_significance || "");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    try {
      if (editingId) {
        await fetch("/api/memories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            category: formCategory,
            title: formTitle,
            content: formContent,
            emotional_significance: formEmotionalSignificance,
          }),
        });
      } else {
        await fetch("/api/memories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: formCategory,
            title: formTitle,
            content: formContent,
            emotional_significance: formEmotionalSignificance,
          }),
        });
      }
      setModalOpen(false);
      fetchMemories();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this memory?")) return;
    try {
      await fetch(`/api/memories?id=${id}`, { method: "DELETE" });
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in bg-white min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pastelPink-100 text-romantic-600 text-xs font-semibold border border-pink-200">
            <BookMarked className="w-3.5 h-3.5" />
            Amelia's Memories
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
            Relationship Knowledge Vault
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Amelia AI accesses these saved facts and favorites to personalize every suggestion and response.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-romantic-500 hover:bg-romantic-600 text-white font-semibold text-xs shadow-sm transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add New Memory
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search memories by title, detail, or favorite thing..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-pink-200 text-gray-900 placeholder-gray-400 text-xs focus:outline-none focus:ring-2 focus:ring-romantic-500/30"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === "all"
                ? "bg-romantic-500 text-white shadow-sm"
                : "bg-white text-gray-700 hover:text-romantic-600 border border-pink-200"
            }`}
          >
            All Categories ({memories.length})
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? "bg-romantic-500 text-white shadow-sm"
                  : "bg-white text-gray-700 hover:text-romantic-600 border border-pink-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Memory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {memories.map((mem) => (
          <div
            key={mem.id}
            className="group relative bg-white border border-pink-200 rounded-3xl p-5 shadow-sm hover:shadow-soft-pink hover:border-pink-300 transition-all flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-pastelPink-100 text-romantic-600 border border-pink-200">
                  {mem.category}
                </span>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(mem)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-romantic-600 hover:bg-pastelPink-50"
                    title="Edit memory"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(mem.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50"
                    title="Delete memory"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-base text-gray-900">
                {mem.title}
              </h3>

              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                {mem.content}
              </p>
            </div>

            {mem.emotional_significance && (
              <div className="pt-2 border-t border-pink-100 text-[11px] text-romantic-600 italic flex items-center gap-1.5">
                <Heart className="w-3 h-3 shrink-0 fill-romantic-500/20" />
                <span>{mem.emotional_significance}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {memories.length === 0 && !loading && (
        <div className="text-center py-16 space-y-3">
          <BookMarked className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="font-semibold text-gray-700">No memories found</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Add information about Amelia's favorite things, foods, or hobbies to enrich Amelia AI.
          </p>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-pink-200 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90dvh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between pb-2 border-b border-pink-100">
              <h3 className="font-bold text-base text-gray-900">
                {editingId ? "Edit Memory" : "Add Memory about Amelia"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as MemoryCategory)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-pink-200 text-gray-900"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Favorite Coffee Order, The Dog Joke..."
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-pink-200 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Memory Details</label>
                <textarea
                  rows={3}
                  required
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Details of what she likes, said, or promised..."
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-pink-200 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Emotional Significance (Optional)</label>
                <input
                  type="text"
                  value={formEmotionalSignificance}
                  onChange={(e) => setFormEmotionalSignificance(e.target.value)}
                  placeholder="e.g. Always cheers her up when she's stressed"
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-pink-200 text-gray-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-romantic-500 hover:bg-romantic-600 shadow-sm"
                >
                  Save Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
