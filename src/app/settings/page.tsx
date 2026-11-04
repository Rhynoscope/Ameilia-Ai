"use client";

import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Sparkles,
  Key,
  Sliders,
  Bell,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  User,
  Plus,
  X,
  Shield,
} from "lucide-react";
import { CommunicationProfile, ReminderSettings } from "@/lib/types";
import { DEFAULT_COMMUNICATION_PROFILE, DEFAULT_REMINDER_SETTINGS } from "@/lib/constants";

export default function SettingsPage() {
  // Settings State
  const [model, setModel] = useState("gemini-3.5-flash-lite");
  const [profile, setProfile] = useState<CommunicationProfile>(DEFAULT_COMMUNICATION_PROFILE);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Connection Test State
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    model: string;
    latencyMs: number;
    message: string;
    isDemo: boolean;
  } | null>(null);

  // New Sample Text State
  const [newSample, setNewSample] = useState("");
  const [newAvoidWord, setNewAvoidWord] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.model) setModel(data.model);
      if (data.profile) setProfile(data.profile);
      if (data.reminderSettings) setReminderSettings(data.reminderSettings);
      setHasApiKey(Boolean(data.hasKey));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/gemini/test", { method: "POST" });
      const data = await res.json();
      setTestResult(data);
      if (data.success) {
        setHasApiKey(true);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        model,
        latencyMs: 0,
        message: "Failed to connect to backend endpoint.",
        isDemo: true,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          profile,
          reminderSettings,
        }),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const addSampleText = () => {
    if (!newSample.trim()) return;
    setProfile({
      ...profile,
      sampleTexts: [...(profile.sampleTexts || []), newSample.trim()],
    });
    setNewSample("");
  };

  const removeSampleText = (index: number) => {
    setProfile({
      ...profile,
      sampleTexts: profile.sampleTexts.filter((_, i) => i !== index),
    });
  };

  const addAvoidWord = () => {
    if (!newAvoidWord.trim()) return;
    setProfile({
      ...profile,
      wordsToAvoid: [...(profile.wordsToAvoid || []), newAvoidWord.trim()],
    });
    setNewAvoidWord("");
  };

  const removeAvoidWord = (index: number) => {
    setProfile({
      ...profile,
      wordsToAvoid: profile.wordsToAvoid.filter((_, i) => i !== index),
    });
  };

  const handleClearChatHistory = async () => {
    if (!confirm("Are you sure you want to clear your conversation assistant history?")) return;
    try {
      await fetch("/api/data/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "chat" }),
      });
      alert("Chat history cleared.");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8 animate-fade-in pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 text-romantic-600 text-xs font-semibold">
            <SettingsIcon className="w-3.5 h-3.5 text-romantic-500" />
            Preferences & Security
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            System & Voice Settings
          </h1>
          <p className="text-sm text-gray-600">
            Configure your Gemini AI model, customize your authentic texting voice profile, and manage data.
          </p>
        </div>

        {savedSuccess && (
          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Settings saved successfully!
          </span>
        )}
      </div>

      <form onSubmit={handleSaveAll} className="space-y-8">
        {/* Section 1: Gemini AI Integration & Model */}
        <div className="bg-white border border-pink-100 rounded-3xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-pink-100">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-romantic-500" />
              <h2 className="font-bold text-base text-gray-900">
                Google Gemini AI Configuration
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                  hasApiKey
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${hasApiKey ? "bg-emerald-500" : "bg-amber-500"}`} />
                {hasApiKey ? "API Key Connected" : "Demo / Offline Mode"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-800 mb-1.5">
                Active Gemini Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-romantic-400"
              >
                <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Default • Fastest • Lowest Cost)</option>
                <option value="gemini-3.8-flash">gemini-3.8-flash (Balanced Multimodal & Reasoning)</option>
                <option value="gemini-4-argon">gemini-4-argon (Maximum Reasoning)</option>
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                Configurable via <code className="text-romantic-600 font-semibold">GEMINI_MODEL</code> in your backend <code className="text-romantic-600 font-semibold">.env</code>.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-gray-800 mb-1.5">
                API Key Security & Setup
              </label>
              <div className="p-3 rounded-2xl bg-pink-50/60 border border-pink-100 text-gray-700 space-y-1 text-[11px]">
                <p>
                  Keys are stored exclusively in your local backend <code className="text-romantic-600 font-semibold">.env</code> file:
                </p>
                <code className="block bg-white px-2 py-1 rounded text-romantic-700 border border-pink-200 font-mono select-all">
                  GEMINI_API_KEY=your_key_here
                </code>
                <p className="text-gray-500">
                  Never exposed to frontend JavaScript or client network requests.
                </p>
              </div>
            </div>
          </div>

          {/* Test Connection Button & Result Box */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="px-5 py-2.5 rounded-2xl bg-pink-50 border border-pink-200 text-romantic-700 font-semibold text-xs hover:bg-pink-100 transition flex items-center gap-2 self-start"
            >
              {testingConnection ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Pinging Google Gemini API...</span>
                </>
              ) : (
                <>
                  <Key className="w-3.5 h-3.5 text-romantic-500" />
                  <span>Test Gemini API Connection</span>
                </>
              )}
            </button>

            {testResult && (
              <div
                className={`text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 ${
                  testResult.success
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Communication Voice Profile */}
        <div className="bg-white border border-pink-100 rounded-3xl p-6 space-y-5 shadow-sm">
          <div className="pb-3 border-b border-pink-100">
            <div className="flex items-center gap-2.5">
              <User className="w-5 h-5 text-romantic-500" />
              <h2 className="font-bold text-base text-gray-900">
                My Authentic Texting Voice Profile
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Amelia AI uses these real examples and parameters to craft suggestions that sound genuinely like you—never like a cheesy romance novelist or a therapist.
            </p>
          </div>

          {/* Sample Texts List */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-gray-800">
              Sample Messages You've Sent Before (The AI learns your phrasing and rhythm from these):
            </label>

            <div className="space-y-2">
              {profile.sampleTexts?.map((text, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs"
                >
                  <span className="text-gray-800 font-medium">
                    "{text}"
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSampleText(idx)}
                    className="p-1 rounded-lg text-gray-400 hover:text-rose-500"
                    title="Remove sample"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Sample Text */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newSample}
                onChange={(e) => setNewSample(e.target.value)}
                placeholder="Paste or type a typical text message you've sent..."
                className="flex-1 text-xs px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-romantic-400"
              />
              <button
                type="button"
                onClick={addSampleText}
                className="px-4 py-2.5 rounded-xl bg-pink-100 text-romantic-700 font-semibold text-xs hover:bg-pink-200 transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Sample
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Preferred Overall Tone
              </label>
              <input
                type="text"
                value={profile.preferredTone}
                onChange={(e) => setProfile({ ...profile, preferredTone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-romantic-400"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Emoji Frequency
              </label>
              <select
                value={profile.emojiUsage}
                onChange={(e: any) => setProfile({ ...profile, emojiUsage: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-romantic-400"
              >
                <option value="rare">Rare (Minimal emojis, mostly text)</option>
                <option value="moderate">Moderate (Natural, 1-2 subtle emojis occasionally)</option>
                <option value="frequent">Frequent (Expressive emoji use)</option>
              </select>
            </div>
          </div>

          {/* Words / Styles to Avoid */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-semibold text-gray-800">
              Words & Phrasings to Avoid (e.g. Victorian phrases, pet names you don't use):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {profile.wordsToAvoid?.map((word, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200"
                >
                  <span>{word}</span>
                  <button
                    type="button"
                    onClick={() => removeAvoidWord(idx)}
                    className="hover:text-rose-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newAvoidWord}
                onChange={(e) => setNewAvoidWord(e.target.value)}
                placeholder="e.g. Dearest, thou, overly formal greetings..."
                className="flex-1 text-xs px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-romantic-400"
              />
              <button
                type="button"
                onClick={addAvoidWord}
                className="px-4 py-2.5 rounded-xl bg-rose-100 text-rose-700 font-semibold text-xs hover:bg-rose-200 transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Avoid
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Data Management & Privacy */}
        <div className="bg-white border border-pink-100 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 pb-2 border-b border-pink-100">
            <Shield className="w-5 h-5 text-romantic-500" />
            <h2 className="font-bold text-base text-gray-900">
              Data Management & Privacy
            </h2>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            All memories, preferences, and conversations are stored locally in your private SQLite database. You can export an offline JSON backup or clear conversation history at any time.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href="/api/data/export"
              download
              className="px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-gray-800 text-xs font-semibold flex items-center gap-1.5 hover:bg-pink-50 transition"
            >
              <Download className="w-4 h-4 text-romantic-500" />
              Export Full Backup (JSON)
            </a>

            <button
              type="button"
              onClick={handleClearChatHistory}
              className="px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-4 h-4" />
              Clear Conversation History
            </button>
          </div>
        </div>

        {/* Global Save Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-romantic-500 to-rose-400 hover:from-romantic-600 hover:to-rose-500 text-white font-bold text-sm shadow-md shadow-pink-200 transition"
          >
            Save All Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
