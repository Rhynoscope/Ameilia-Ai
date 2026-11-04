"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Heart,
  Send,
  Paperclip,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Edit2,
  User,
  Clock,
  BookmarkPlus,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Gamepad2,
  MoreVertical,
  Search,
  Archive,
  ArchiveRestore,
  Zap,
  Brain,
  Lightbulb,
  X,
} from "lucide-react";
import {
  ChatAttachment,
  ChatMessage,
  ConversationSummary,
  ExtractedMemorySuggestion,
  SuggestedReply,
  ThinkingMode,
} from "@/lib/types";
import { processUploadedFile } from "@/lib/media-handler";
import { MediaPreview } from "@/components/MediaPreview";
import { ReplyCard } from "@/components/ReplyCard";
import { VirtualDatesModal } from "@/components/VirtualDatesModal";

const LDR_QUICK_SUGGESTIONS = [
  {
    label: "I miss her — sweet text",
    icon: "🥺",
    prompt: "I miss Amelia today. Give me 4 sweet, genuine texts I can send her across the distance that will make her smile without being overly sappy or sad.",
  },
  {
    label: "Analyze conversation screenshot",
    icon: "📱",
    prompt: "I want to analyze our conversation. Here are the screenshots of our texts. How is Amelia feeling, is the chat flowing well, and what should I say next?",
  },
  {
    label: "She sent a photo / selfie",
    icon: "📸",
    prompt: "Amelia sent me a photo. What are 4 natural, attractive ways I can respond to what she sent? (Upload photo via paperclip)",
  },
  {
    label: "Plan a virtual date",
    icon: "🎮",
    prompt: "Suggest 3 creative long-distance date ideas we can do together remotely this week, and include ready-to-send text invitations for Amelia.",
  },
  {
    label: "Restart our quiet chat",
    icon: "🔄",
    prompt: "Our conversation has been quiet for a bit and I don't know what to say. Give me 4 natural, zero-pressure ways to restart our chat smoothly.",
  },
  {
    label: "Improve my draft text",
    icon: "✨",
    prompt: "Can you help me improve this draft message to Amelia? Make it sound more natural, affectionate, and thoughtful: \"Hey, was thinking about you today.\"",
  },
  {
    label: "Fun hypothetical question",
    icon: "🔮",
    prompt: "Give me 4 interesting, playful hypothetical questions or 'would you rather' prompts I can text Amelia to spark a fun conversation.",
  },
  {
    label: "Good morning across miles",
    icon: "🌅",
    prompt: "Give me 4 sweet and varied good morning texts for Amelia that show I'm thinking of her as she starts her day.",
  },
  {
    label: "Understand her voice note",
    icon: "🎙️",
    prompt: "I'm uploading a voice note Amelia sent me. Please listen, explain her tone and emotional cues, and help me formulate a thoughtful reply.",
  },
  {
    label: "Analyze her video clip",
    icon: "🎬",
    prompt: "I'm uploading a video Amelia sent me. What is happening in it, and how should I react or respond?",
  },
  {
    label: "Flirty & playful texts",
    icon: "😉",
    prompt: "Give me 4 flirty and playful texts I can send Amelia to create some fun chemistry and tease her across the distance.",
  },
  {
    label: "Help me apologize properly",
    icon: "🕊️",
    prompt: "I want to apologize to Amelia for not talking to her much yesterday. How do I say I'm sorry with genuine accountability and zero defensive excuses?",
  },
];

const THINKING_MODES: {
  id: ThinkingMode;
  label: string;
  icon: any;
  desc: string;
}[] = [
  {
    id: "quick",
    label: "Quick",
    icon: Zap,
    desc: "Minimal reasoning effort · Faster replies · Best for quick texting ideas",
  },
  {
    id: "normal",
    label: "Normal",
    icon: Brain,
    desc: "Balanced reasoning · Context-aware · Everyday relationship coaching",
  },
  {
    id: "extra",
    label: "Extra Thinking",
    icon: Lightbulb,
    desc: "Deep reasoning · In-depth analysis · Best for complex situations & long chats",
  },
];

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDays = Math.floor(diffHour / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function AmeliaAICentralChat() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [stagedAttachments, setStagedAttachments] = useState<ChatAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [savedMemoryTitles, setSavedMemoryTitles] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [virtualDatesModalOpen, setVirtualDatesModalOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Thinking Mode
  const [thinkingMode, setThinkingMode] = useState<ThinkingMode>("normal");

  // Sidebar Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  // Dropdown Menu & Modals State
  const [openMenuConvoId, setOpenMenuConvoId] = useState<string | null>(null);
  const [convoToDelete, setConvoToDelete] = useState<ConversationSummary | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [convoToRename, setConvoToRename] = useState<ConversationSummary | null>(null);
  const [renameInputValue, setRenameInputValue] = useState("");

  // Inline Message Editing
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editingMsgText, setEditingMsgText] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Initialize Thinking Mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("amelia_thinking_mode") as ThinkingMode;
    if (saved && ["quick", "normal", "extra"].includes(saved)) {
      setThinkingMode(saved);
    }
  }, []);

  const handleSelectThinkingMode = (mode: ThinkingMode) => {
    setThinkingMode(mode);
    localStorage.setItem("amelia_thinking_mode", mode);
  };

  // Close 3-dot dropdown menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuConvoId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Load conversations on mount & tab change
  useEffect(() => {
    loadConversations();
  }, [activeTab, searchQuery]);

  const loadConversations = async (preferredSelectId?: string) => {
    try {
      const isArchived = activeTab === "archived";
      const params = new URLSearchParams();
      params.set("archived", isArchived ? "true" : "false");
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const res = await fetch(`/api/chat?${params.toString()}`);
      const data = await res.json();
      const list: ConversationSummary[] = data.conversations || [];
      setConversations(list);

      if (list.length > 0) {
        if (preferredSelectId && list.some((c) => c.id === preferredSelectId)) {
          setActiveConvoId(preferredSelectId);
          loadMessages(preferredSelectId);
        } else if (!activeConvoId || !list.some((c) => c.id === activeConvoId)) {
          setActiveConvoId(list[0].id);
          loadMessages(list[0].id);
        }
      } else if (!isArchived && !searchQuery.trim()) {
        startNewConversation();
      }
    } catch (e) {
      console.error(e);
      if (activeTab === "active" && !searchQuery.trim()) {
        startNewConversation();
      }
    }
  };

  const loadMessages = async (id: string) => {
    try {
      const res = await fetch(`/api/chat/${id}`);
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages);
      } else {
        initWelcomeMessage(id);
      }
    } catch (e) {
      console.error(e);
      initWelcomeMessage(id);
    }
  };

  const initWelcomeMessage = (convoId: string) => {
    setMessages([
      {
        id: 0,
        conversation_id: convoId,
        role: "assistant",
        content: `Hi there! I'm **Amelia AI**, your personal long-distance relationship companion and texting coach.

Because physical distance separates you and Amelia, keeping your daily communication warm, genuine, engaging, and affectionate is everything.

Whenever you're not sure what to say, tap the quick suggestions below or upload **screenshots, photos she sent, voice notes, or videos**. I will give you **3 to 5 realistic, ready-to-send messages** with one-click copy, quick tweaks (*shorter, longer, funnier, sweeter, more affectionate*), and help you plan exciting virtual dates!

How can I help you and Amelia today?`,
        created_at: new Date().toISOString(),
      },
    ]);
  };

  const startNewConversation = () => {
    const newId = `conv_${Date.now()}`;
    setActiveConvoId(newId);
    setStagedAttachments([]);
    setEditingMsgId(null);
    initWelcomeMessage(newId);
  };

  // Chat Actions: Rename, Archive, Delete
  const handleOpenRename = (c: ConversationSummary) => {
    setConvoToRename(c);
    setRenameInputValue(c.title || "");
    setOpenMenuConvoId(null);
  };

  const handleSaveRename = async () => {
    if (!convoToRename || !renameInputValue.trim()) return;
    try {
      await fetch(`/api/chat/${convoToRename.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameInputValue.trim() }),
      });
      setConversations((prev) =>
        prev.map((c) => (c.id === convoToRename.id ? { ...c, title: renameInputValue.trim() } : c))
      );
      setConvoToRename(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleArchive = async (c: ConversationSummary) => {
    setOpenMenuConvoId(null);
    try {
      const newArchived = !c.archived;
      await fetch(`/api/chat/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: newArchived }),
      });
      loadConversations();
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmDelete = async () => {
    if (!convoToDelete) return;
    try {
      await fetch(`/api/chat/${convoToDelete.id}`, { method: "DELETE" });
      const deletedId = convoToDelete.id;
      setConvoToDelete(null);
      setOpenMenuConvoId(null);

      const remaining = conversations.filter((c) => c.id !== deletedId);
      setConversations(remaining);

      if (activeConvoId === deletedId) {
        if (remaining.length > 0) {
          setActiveConvoId(remaining[0].id);
          loadMessages(remaining[0].id);
        } else {
          startNewConversation();
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmDeleteAll = async () => {
    try {
      await fetch("/api/chat", { method: "DELETE" });
      setShowDeleteAllModal(false);
      setConversations([]);
      startNewConversation();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkArchive = async (archiveState: boolean) => {
    try {
      await fetch("/api/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: archiveState }),
      });
      loadConversations();
    } catch (e) {
      console.error(e);
    }
  };

  const clearCurrentConversation = async () => {
    if (!activeConvoId) return;
    const current = conversations.find((c) => c.id === activeConvoId);
    if (current) {
      setConvoToDelete(current);
    } else {
      initWelcomeMessage(activeConvoId);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Handle File Uploads (Images, Audio, Video)
  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);

    const newAttachments: ChatAttachment[] = [];
    for (let i = 0; i < fileList.length; i++) {
      try {
        const att = await processUploadedFile(fileList[i]);
        newAttachments.push(att);
      } catch (err: any) {
        setUploadError(err.message || "Failed to process attachment");
      }
    }

    setStagedAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeStagedAttachment = (id: string) => {
    setStagedAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Send Message
  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText !== undefined ? overrideText : inputText;
    const hasText = textToSend.trim().length > 0;
    const hasFiles = stagedAttachments.length > 0;

    if ((!hasText && !hasFiles) || loading) return;

    setInputText("");
    const attachmentsToSend = [...stagedAttachments];
    setStagedAttachments([]);
    setUploadError(null);

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      conversation_id: activeConvoId,
      role: "user",
      content: textToSend.trim(),
      attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
      thinking_mode: thinkingMode,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConvoId,
          message: textToSend.trim(),
          attachments: attachmentsToSend,
          thinkingMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to communicate with Amelia AI");
      }

      const assistantMsg: ChatMessage = {
        id: Date.now() + 1,
        conversation_id: activeConvoId,
        role: "assistant",
        content: data.reply,
        thinking_mode: thinkingMode,
        suggested_replies: data.suggestedReplies,
        suggested_memories: data.suggestedMemories,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      loadConversations(activeConvoId);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: Date.now() + 2,
        conversation_id: activeConvoId,
        role: "assistant",
        content: `I ran into an issue connecting with Google Gemini: ${err.message}. Please check your connection and try again.`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (messages.length <= 1 || loading) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) return;
    handleSend(lastUserMsg.content);
  };

  // Message inline editing
  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMsgId(msg.id);
    setEditingMsgText(msg.content);
  };

  const handleSaveEdit = (msg: ChatMessage) => {
    if (!editingMsgText.trim() || loading) return;
    const editedText = editingMsgText.trim();
    setEditingMsgId(null);

    // Rollback conversation state to this message and re-send
    const idx = messages.findIndex((m) => m.id === msg.id);
    if (idx !== -1) {
      setMessages(messages.slice(0, idx));
    }
    handleSend(editedText);
  };

  const handleSaveMemory = async (mem: ExtractedMemorySuggestion) => {
    try {
      const res = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: mem.category,
          title: mem.title,
          content: mem.content,
          emotional_significance: "Discovered during conversation",
        }),
      });
      if (res.ok) {
        setSavedMemoryTitles((prev) => [...prev, mem.title]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyMessage = async (id: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const activeConvo = conversations.find((c) => c.id === activeConvoId);

  return (
    <div
      className="flex-1 flex h-[calc(100vh-4rem)] bg-white overflow-hidden relative"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      {/* Hidden file input for images, audio, video */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,audio/mp3,audio/wav,audio/m4a,audio/aac,audio/ogg,video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm border-4 border-dashed border-romantic-400 flex flex-col items-center justify-center gap-4 animate-fade-in pointer-events-none">
          <div className="w-20 h-20 rounded-3xl bg-pink-100 flex items-center justify-center shadow-lg shadow-pink-200">
            <UploadCloud className="w-10 h-10 text-romantic-600 animate-bounce" />
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">Drop media for Amelia AI</p>
            <p className="text-sm text-gray-600">
              Supports screenshots, photos she sent, audio voice notes, and videos
            </p>
          </div>
        </div>
      )}

      {/* Sidebar: Complete Conversation Management */}
      <div
        className={`${
          sidebarOpen ? "w-80" : "w-0"
        } transition-all duration-300 ease-in-out border-r border-pink-100 bg-white flex flex-col shrink-0 overflow-hidden shadow-sm z-20`}
      >
        {/* Header: New Chat & Action */}
        <div className="p-3.5 border-b border-pink-100 bg-pink-50/40 flex items-center gap-2">
          <button
            onClick={startNewConversation}
            className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-romantic-500 to-rose-400 hover:from-romantic-600 hover:to-rose-500 text-white font-semibold text-xs shadow-sm shadow-pink-300 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Conversation</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-pink-100 bg-white">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-pink-50/60 border border-pink-100 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-romantic-400 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Active vs Archived Filter Tabs */}
          <div className="flex gap-1 mt-2.5 bg-pink-50/60 p-0.5 rounded-xl border border-pink-100">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition ${
                activeTab === "active"
                  ? "bg-white text-romantic-700 shadow-xs border border-pink-100"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Active Chats
            </button>
            <button
              onClick={() => setActiveTab("archived")}
              className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition flex items-center justify-center gap-1 ${
                activeTab === "archived"
                  ? "bg-white text-romantic-700 shadow-xs border border-pink-100"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Archive className="w-3 h-3" />
              <span>Archived</span>
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
          {conversations.length === 0 ? (
            <div className="text-center py-8 px-4 text-xs text-gray-400 space-y-1">
              <MessageSquare className="w-6 h-6 mx-auto text-gray-300" />
              <p className="font-medium">No {activeTab} conversations</p>
              <p className="text-[11px]">
                {searchQuery ? "Try a different search term" : "Start a new chat to begin"}
              </p>
            </div>
          ) : (
            conversations.map((c) => {
              const isActive = c.id === activeConvoId;
              const isMenuOpen = openMenuConvoId === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setActiveConvoId(c.id);
                    loadMessages(c.id);
                  }}
                  className={`group relative flex flex-col p-2.5 rounded-2xl cursor-pointer text-xs transition border ${
                    isActive
                      ? "bg-pink-100/70 border-pink-200 text-romantic-800 shadow-xs"
                      : "bg-white hover:bg-pink-50/50 border-pink-50 text-gray-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 truncate">
                      <MessageSquare
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? "text-romantic-600" : "text-gray-400"
                        }`}
                      />
                      <span className="font-bold truncate text-[12.5px] text-gray-900">
                        {c.title || "New Conversation"}
                      </span>
                    </div>

                    {/* Three-dot Menu Trigger Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuConvoId(isMenuOpen ? null : c.id);
                      }}
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-pink-100/60 transition opacity-80 group-hover:opacity-100"
                      title="Conversation options"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Message Preview & Date */}
                  <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500 pl-5.5">
                    <p className="truncate max-w-[170px] text-gray-600">
                      {c.last_message || "No messages yet"}
                    </p>
                    <span className="shrink-0 text-[10px] text-gray-400 ml-1">
                      {formatRelativeTime(c.last_message_at || c.updated_at)}
                    </span>
                  </div>

                  {/* 3-Dot Dropdown Popup */}
                  {isMenuOpen && (
                    <div
                      ref={menuRef}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-2 top-8 z-50 w-44 bg-white rounded-2xl shadow-xl border border-pink-200 py-1.5 animate-in fade-in zoom-in-95 text-xs text-gray-700"
                    >
                      <button
                        onClick={() => handleOpenRename(c)}
                        className="w-full px-3 py-2 text-left hover:bg-pink-50 flex items-center gap-2 transition text-gray-800"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-romantic-500" />
                        <span>Rename</span>
                      </button>

                      <button
                        onClick={() => handleToggleArchive(c)}
                        className="w-full px-3 py-2 text-left hover:bg-pink-50 flex items-center gap-2 transition text-gray-800"
                      >
                        {c.archived ? (
                          <>
                            <ArchiveRestore className="w-3.5 h-3.5 text-romantic-500" />
                            <span>Restore to Active</span>
                          </>
                        ) : (
                          <>
                            <Archive className="w-3.5 h-3.5 text-gray-500" />
                            <span>Archive Chat</span>
                          </>
                        )}
                      </button>

                      <div className="my-1 border-t border-pink-100" />

                      <button
                        onClick={() => {
                          setConvoToDelete(c);
                          setOpenMenuConvoId(null);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2 transition font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Permanently</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Global Chat Management Footer */}
        <div className="p-3 border-t border-pink-100 bg-pink-50/30 flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between text-gray-600">
            {activeTab === "active" ? (
              <button
                onClick={() => handleBulkArchive(true)}
                disabled={conversations.length === 0}
                className="text-[11px] text-gray-500 hover:text-gray-800 flex items-center gap-1 transition disabled:opacity-40"
              >
                <Archive className="w-3 h-3" />
                <span>Archive all</span>
              </button>
            ) : (
              <button
                onClick={() => handleBulkArchive(false)}
                disabled={conversations.length === 0}
                className="text-[11px] text-gray-500 hover:text-gray-800 flex items-center gap-1 transition disabled:opacity-40"
              >
                <ArchiveRestore className="w-3 h-3" />
                <span>Restore all</span>
              </button>
            )}

            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="text-[11px] text-rose-500 hover:text-rose-700 flex items-center gap-1 transition"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete all</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Central Column */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white relative">
        {/* Top Chat Bar */}
        <div className="px-4 py-3 border-b border-pink-100 flex items-center justify-between bg-white/95 backdrop-blur-xs">
          <div className="flex items-center gap-2.5 truncate">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-xl text-gray-500 hover:bg-pink-50 hover:text-gray-800 transition shrink-0"
              title="Toggle sidebar"
            >
              {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <span className="font-bold text-sm text-gray-900 truncate">
                {activeConvo?.title || "Amelia AI"}
              </span>
              {activeConvo && (
                <button
                  onClick={() => handleOpenRename(activeConvo)}
                  className="text-gray-400 hover:text-gray-700 transition"
                  title="Rename title"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Active Thinking Mode Indicator Badge */}
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-pink-50 border border-pink-200 text-xs font-semibold text-romantic-700">
              {thinkingMode === "quick" && <Zap className="w-3 h-3 text-amber-500" />}
              {thinkingMode === "normal" && <Brain className="w-3 h-3 text-romantic-500" />}
              {thinkingMode === "extra" && <Lightbulb className="w-3 h-3 text-purple-600" />}
              <span className="capitalize">{thinkingMode} Mode</span>
            </div>

            <button
              onClick={() => setVirtualDatesModalOpen(true)}
              className="text-xs px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-romantic-700 font-semibold transition flex items-center gap-1.5"
            >
              <Gamepad2 className="w-3.5 h-3.5 text-romantic-500" />
              <span className="hidden md:inline">Virtual Dates</span>
            </button>

            <button
              onClick={handleRegenerate}
              disabled={loading || messages.length <= 1}
              className="text-xs px-2.5 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 hover:bg-pink-50 font-medium transition flex items-center gap-1 disabled:opacity-40"
              title="Regenerate last response"
            >
              <RefreshCw className="w-3 h-3 text-romantic-500" />
              <span className="hidden sm:inline">Regenerate</span>
            </button>

            <button
              onClick={clearCurrentConversation}
              className="p-1.5 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition"
              title="Clear current conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Stream Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
          {messages.map((msg, index) => {
            const isUser = msg.role === "user";
            const isEditing = editingMsgId === msg.id;

            return (
              <div
                key={index}
                className={`flex gap-3 max-w-3xl ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                    isUser
                      ? "bg-pink-100 text-romantic-600 border border-pink-200"
                      : "bg-romantic-500 text-white"
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Heart className="w-4 h-4 fill-white" />}
                </div>

                {/* Message Content Container */}
                <div className="space-y-3 max-w-[88%]">
                  {/* User Attachments Preview (if any) */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="grid grid-cols-1 gap-2">
                      {msg.attachments.map((att, i) => (
                        <MediaPreview key={i} attachment={att} />
                      ))}
                    </div>
                  )}

                  {/* Bubble or Inline Editor */}
                  {isEditing ? (
                    <div className="p-3 bg-white border-2 border-romantic-400 rounded-3xl shadow-sm space-y-2">
                      <textarea
                        value={editingMsgText}
                        onChange={(e) => setEditingMsgText(e.target.value)}
                        className="w-full text-sm text-gray-900 p-2 focus:outline-none resize-none"
                        rows={3}
                      />
                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          onClick={() => setEditingMsgId(null)}
                          className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(msg)}
                          className="px-3 py-1.5 rounded-xl bg-romantic-500 hover:bg-romantic-600 text-white font-semibold transition"
                        >
                          Save & Re-send
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`p-4 rounded-3xl text-sm leading-relaxed shadow-sm group relative ${
                        isUser
                          ? "bg-pink-50 text-gray-900 border border-pink-200 rounded-tr-none font-medium whitespace-pre-wrap"
                          : "bg-white text-gray-900 border border-pink-100 rounded-tl-none whitespace-pre-wrap"
                      }`}
                    >
                      {msg.content}

                      {/* User message edit button */}
                      {isUser && (
                        <button
                          onClick={() => handleStartEdit(msg)}
                          className="absolute -left-7 top-2 text-gray-300 hover:text-gray-700 transition opacity-0 group-hover:opacity-100 p-1"
                          title="Edit this message"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Interactive Suggested Replies with 3-5 Ready-to-Send Text Messages */}
                  {msg.suggested_replies && msg.suggested_replies.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-romantic-500" />
                        Ready-to-Send Texts for Amelia (tap Copy or tweak with buttons):
                      </div>
                      <div className="grid grid-cols-1 gap-2.5">
                        {msg.suggested_replies.map((reply, i) => (
                          <ReplyCard key={i} reply={reply} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Extracted Memory Suggestions */}
                  {msg.suggested_memories && msg.suggested_memories.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-pink-50 border border-pink-200 space-y-2">
                      <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <BookmarkPlus className="w-3.5 h-3.5 text-romantic-500" />
                        Save discovered detail to Amelia's Memories?
                      </div>
                      {msg.suggested_memories.map((mem, i) => {
                        const isSaved = savedMemoryTitles.includes(mem.title);
                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-pink-100 text-xs"
                          >
                            <div>
                              <span className="font-bold text-gray-900">[{mem.category}] {mem.title}</span>
                              <p className="text-gray-600 text-[11px] mt-0.5">{mem.content}</p>
                            </div>
                            <button
                              onClick={() => handleSaveMemory(mem)}
                              disabled={isSaved}
                              className={`shrink-0 ml-3 px-3 py-1 rounded-xl font-semibold transition flex items-center gap-1 ${
                                isSaved
                                  ? "bg-emerald-500 text-white"
                                  : "bg-romantic-500 text-white hover:bg-romantic-600"
                              }`}
                            >
                              {isSaved ? <CheckCircle2 className="w-3 h-3" /> : <BookmarkPlus className="w-3 h-3" />}
                              <span>{isSaved ? "Saved" : "Save"}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Message Meta / Copy button */}
                  <div className={`flex items-center gap-2 text-[10.5px] text-gray-400 ${isUser ? "justify-end" : "justify-start"}`}>
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {!isUser && (
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="hover:text-gray-700 ml-1 transition"
                        title="Copy AI response"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex gap-3 max-w-xl mr-auto animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-romantic-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Heart className="w-4 h-4 fill-white" />
              </div>
              <div className="bg-white border border-pink-100 p-4 rounded-3xl rounded-tl-none shadow-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-romantic-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-romantic-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-romantic-400 animate-bounce [animation-delay:0.4s]" />
                <span className="text-xs text-gray-600 ml-2">
                  {thinkingMode === "extra"
                    ? "Amelia AI is deeply analyzing relationship context..."
                    : "Amelia AI is thinking..."}
                </span>
              </div>
            </div>
          )}

          {/* Quick Suggestions Cards (Shown when chat is fresh) */}
          {messages.length <= 1 && (
            <div className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider block">
                  Long-Distance Relationship Starters:
                </span>
                <button
                  onClick={() => setVirtualDatesModalOpen(true)}
                  className="text-xs font-semibold text-romantic-600 hover:text-romantic-800 flex items-center gap-1"
                >
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>Virtual Date Ideas</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {LDR_QUICK_SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (item.label.includes("voice note") || item.label.includes("video") || item.label.includes("photo") || item.label.includes("screenshot")) {
                        setInputText(item.prompt);
                        fileInputRef.current?.click();
                      } else {
                        handleSend(item.prompt);
                      }
                    }}
                    className="p-3 rounded-2xl bg-white border border-pink-200 hover:border-pink-300 hover:bg-pink-50/50 shadow-xs transition text-left space-y-1 group"
                  >
                    <span className="text-lg block group-hover:scale-110 transition-transform">{item.icon}</span>
                    <span className="font-bold text-xs text-gray-900 block">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input & Staging Bottom Bar */}
        <div className="p-4 border-t border-pink-100 bg-white space-y-2">
          {/* FEATURE 2: Thinking Mode Selector (directly near message input) */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-pink-50/70 border border-pink-200 shadow-xs">
              <span className="text-[10.5px] uppercase font-bold text-gray-400 px-2 hidden sm:inline">
                Reasoning Effort:
              </span>
              {THINKING_MODES.map((mode) => {
                const Icon = mode.icon;
                const isSelected = thinkingMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => handleSelectThinkingMode(mode.id)}
                    title={mode.desc}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition ${
                      isSelected
                        ? "bg-white text-romantic-700 shadow-xs border border-pink-200"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-romantic-600" : "text-gray-400"}`} />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>

            <span className="text-[11px] text-gray-500 hidden md:inline">
              {thinkingMode === "quick" && "⚡ Quick ideas & fast texting drafts"}
              {thinkingMode === "normal" && "🧠 Balanced everyday relationship coach"}
              {thinkingMode === "extra" && "💡 Deep reasoning for complex moments"}
            </span>
          </div>

          {uploadError && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
              <button onClick={() => setUploadError(null)} className="text-rose-500 font-bold">×</button>
            </div>
          )}

          {/* Staged Attachments Preview Carousel */}
          {stagedAttachments.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {stagedAttachments.map((att) => (
                <div key={att.id} className="shrink-0 w-64">
                  <MediaPreview attachment={att} isStaging onRemove={() => removeStagedAttachment(att.id)} />
                </div>
              ))}
            </div>
          )}

          {/* Main Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end gap-2 bg-white rounded-3xl p-1.5 border border-pink-200 shadow-sm focus-within:ring-2 focus-within:ring-romantic-500/20 focus-within:border-romantic-400 transition"
          >
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-2xl text-romantic-500 hover:bg-pink-100 hover:text-romantic-600 transition shrink-0"
              title="Attach screenshots, photos she sent, voice notes, or videos"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Auto-growing Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask what to say, paste draft, or attach Amelia's photo/voice note/video..."
              className="flex-1 max-h-36 py-3 px-2 bg-transparent text-gray-900 placeholder-gray-400 text-sm focus:outline-none resize-none"
            />

            {/* Beautiful Pink Send Button */}
            <button
              type="submit"
              disabled={(!inputText.trim() && stagedAttachments.length === 0) || loading}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-romantic-500 to-rose-400 hover:from-romantic-600 hover:to-rose-500 text-white font-bold text-xs shadow-md shadow-pink-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-gray-500 px-2">
            <span>Press Enter to send, Shift + Enter for new line</span>
            <span>Supports Photos, Audio Voice Notes (MP3/WAV/M4A), & Videos (MP4/MOV)</span>
          </div>
        </div>
      </div>

      {/* RENAME CONVERSATION MODAL */}
      {convoToRename && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-pink-100 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-gray-900">Rename Conversation</h3>
            <input
              type="text"
              value={renameInputValue}
              onChange={(e) => setRenameInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveRename()}
              placeholder="Enter new conversation title"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-pink-200 text-sm text-gray-900 focus:outline-none focus:border-romantic-500"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConvoToRename(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRename}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-romantic-500 text-white hover:bg-romantic-600 transition"
              >
                Save Title
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE SINGLE CONVERSATION CONFIRMATION MODAL */}
      {convoToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-pink-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Delete Conversation?</h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                This will permanently delete <span className="font-semibold text-gray-900">"{convoToDelete.title}"</span> and all its messages and media from the database. This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConvoToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ALL CONVERSATIONS CONFIRMATION MODAL */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-pink-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Delete All Conversations?</h3>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                This will permanently purge <strong>ALL</strong> conversations and their message history from the database. Deleted conversations will not reappear upon page refresh.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteAll}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition"
              >
                Purge All Chats
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Virtual Dates Modal */}
      <VirtualDatesModal
        isOpen={virtualDatesModalOpen}
        onClose={() => setVirtualDatesModalOpen(false)}
        onSelectPrompt={(prompt) => handleSend(prompt)}
      />
    </div>
  );
}
