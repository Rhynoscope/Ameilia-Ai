"use client";

import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Sparkles,
  Key,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  X,
  User,
  Shield,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  TrendingUp,
  BarChart2,
} from "lucide-react";
import { CommunicationProfile, LearnedPreferencesState } from "@/lib/types";
import { DEFAULT_COMMUNICATION_PROFILE } from "@/lib/constants";
import { AvatarCustomizer } from "./PixelAvatar";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [model, setModel] = useState("gemini-3.5-flash-lite");
  const [profile, setProfile] = useState<CommunicationProfile>(DEFAULT_COMMUNICATION_PROFILE);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [newSample, setNewSample] = useState("");
  const [newAvoid, setNewAvoid] = useState("");
  const [saved, setSaved] = useState(false);

  // YouTube-Style Learning Preferences State
  const [learnedPrefs, setLearnedPrefs] = useState<LearnedPreferencesState | null>(null);
  const [loadingPrefs, setLoadingPrefs] = useState(false);
  const [resettingPrefs, setResettingPrefs] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadLearnedPreferences();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data: any = await res.json();
      if (data.model) setModel(data.model);
      if (data.profile) setProfile(data.profile);
      setHasApiKey(Boolean(data.hasKey));
    } catch (e) {
      console.error(e);
    }
  };

  const loadLearnedPreferences = async () => {
    setLoadingPrefs(true);
    try {
      const res = await fetch("/api/preferences");
      if (res.ok) {
        const data: any = await res.json();
        if (data.preferences) {
          setLearnedPrefs(data.preferences);
        }
      }
    } catch (e) {
      console.error("Failed to load learned preferences:", e);
    } finally {
      setLoadingPrefs(false);
    }
  };

  const handleRemoveTrait = async (trait: string) => {
    try {
      const res = await fetch(`/api/preferences/trait?trait=${encodeURIComponent(trait)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const data: any = await res.json();
        if (data.preferences) setLearnedPrefs(data.preferences);
      }
    } catch (e) {
      console.error("Failed to delete trait:", e);
    }
  };

  const handleResetPreferences = async () => {
    const confirmReset = window.confirm(
      "Are you sure you want to reset all learned recommendations and preferences? Amelia AI will return to Stage 1 base recommendations."
    );
    if (!confirmReset) return;

    setResettingPrefs(true);
    try {
      const res = await fetch("/api/preferences/reset", {
        method: "POST",
      });
      if (res.ok) {
        const data: any = await res.json();
        if (data.preferences) setLearnedPrefs(data.preferences);
      }
    } catch (e) {
      console.error("Failed to reset preferences:", e);
    } finally {
      setResettingPrefs(false);
    }
  };

  const handleTestKey = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/gemini/test", { method: "POST" });
      const data: any = await res.json();
      setTestResult(data);
      if (data.success) setHasApiKey(true);
    } catch (e) {
      setTestResult({ success: false, message: "Error pinging API route." });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, profile }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const addSample = () => {
    if (!newSample.trim()) return;
    setProfile({
      ...profile,
      sampleTexts: [...(profile.sampleTexts || []), newSample.trim()],
    });
    setNewSample("");
  };

  const removeSample = (idx: number) => {
    setProfile({
      ...profile,
      sampleTexts: profile.sampleTexts.filter((_, i) => i !== idx),
    });
  };

  const addAvoid = () => {
    if (!newAvoid.trim()) return;
    setProfile({
      ...profile,
      wordsToAvoid: [...(profile.wordsToAvoid || []), newAvoid.trim()],
    });
    setNewAvoid("");
  };

  const removeAvoid = (idx: number) => {
    setProfile({
      ...profile,
      wordsToAvoid: profile.wordsToAvoid.filter((_, i) => i !== idx),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white border border-pink-200 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[90dvh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom)]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-pink-100 flex items-center justify-between bg-pink-50/50">
          <div className="flex items-center gap-2.5 pr-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-romantic-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <SettingsIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-gray-900">
                Amelia AI Settings & Voice
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-500 line-clamp-1 sm:line-clamp-none">
                Gemini AI integration, model selection, and your authentic writing profile.
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
        <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Jeoparty Pixel Character Studio */}
          <div className="space-y-2">
            <h3 className="font-black text-sm text-gray-900 flex items-center gap-1.5">
              <span>🎨 Jeoparty Pixel Character Customizer</span>
            </h3>
            <AvatarCustomizer compact={true} />
          </div>

          {/* Gemini AI Card */}
          <div className="p-4 rounded-2xl bg-white border border-pink-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-romantic-500" />
                Google Gemini API
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                  hasApiKey
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-pastelPink-100 text-romantic-600 border border-pink-200"
                }`}
              >
                {hasApiKey ? "● Key Configured" : "○ Demo Mode (Offline)"}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Active Gemini Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-pink-200 bg-white text-gray-900 font-mono text-xs"
              >
                <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Default • Fast • Affordable)</option>
                <option value="gemini-3.8-flash">gemini-3.8-flash (Balanced Multimodal & Reasoning)</option>
                <option value="gemini-4-argon">gemini-4-argon (Maximum Reasoning)</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleTestKey}
                disabled={testing}
                className="px-3.5 py-1.5 rounded-xl bg-pastelPink-50 border border-pink-200 text-romantic-600 font-semibold hover:bg-pastelPink-100 transition flex items-center gap-1"
              >
                {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                <span>Test API Connection</span>
              </button>
              {testResult && (
                <span className={`text-[11px] font-medium ${testResult.success ? "text-emerald-600" : "text-amber-600"}`}>
                  {testResult.message}
                </span>
              )}
            </div>
          </div>

          {/* Authentic Communication Profile Card */}
          <div className="p-4 rounded-2xl bg-white border border-pink-200 space-y-3">
            <div>
              <span className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <User className="w-4 h-4 text-romantic-500" />
                My Authentic Texting Voice
              </span>
              <p className="text-gray-500 text-[11px] mt-0.5">
                The AI mimics your real phrasing so every suggestion sounds genuinely like you.
              </p>
            </div>

            {/* Sample Texts */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-gray-700">Sample Messages You've Sent:</label>
              <div className="space-y-1.5">
                {profile.sampleTexts?.map((txt, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-pastelPink-50/50 border border-pink-100 text-gray-800">
                    <span className="truncate">"{txt}"</span>
                    <button type="button" onClick={() => removeSample(i)} className="p-1 text-gray-400 hover:text-rose-500">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  value={newSample}
                  onChange={(e) => setNewSample(e.target.value)}
                  placeholder="Paste a message you've sent before..."
                  className="flex-1 p-2 rounded-xl border border-pink-200 bg-white text-gray-900"
                />
                <button
                  type="button"
                  onClick={addSample}
                  className="px-3 py-2 rounded-xl bg-romantic-500 text-white font-semibold text-xs hover:bg-romantic-600"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Words to Avoid */}
            <div className="space-y-1.5 pt-2 border-t border-pink-100">
              <label className="block text-[11px] font-semibold text-gray-700">Phrases / Words to Avoid:</label>
              <div className="flex flex-wrap gap-1.5">
                {profile.wordsToAvoid?.map((word, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-lg bg-pastelPink-100 text-romantic-600 text-[11px] font-medium flex items-center gap-1 border border-pink-200">
                    <span>{word}</span>
                    <button type="button" onClick={() => removeAvoid(i)} className="hover:text-rose-700">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  value={newAvoid}
                  onChange={(e) => setNewAvoid(e.target.value)}
                  placeholder="e.g. Dearest, thou, formal jargon..."
                  className="flex-1 p-2 rounded-xl border border-pink-200 bg-white text-gray-900"
                />
                <button
                  type="button"
                  onClick={addAvoid}
                  className="px-3 py-2 rounded-xl bg-pastelPink-100 border border-pink-200 text-romantic-600 font-semibold text-xs hover:bg-pastelPink-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* YouTube-Style Recommendation Learning System */}
          <div className="p-4 rounded-2xl bg-white border border-pink-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-romantic-500" />
                  Recommendation Learning (YouTube-Style)
                </span>
                <p className="text-gray-500 text-[11px] mt-0.5">
                  Learns from your Likes 👍 and Dislikes 👎 to personalize future single recommendations.
                </p>
              </div>

              {learnedPrefs && (
                <button
                  type="button"
                  onClick={handleResetPreferences}
                  disabled={resettingPrefs}
                  className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition flex items-center gap-1 shrink-0"
                  title="Reset all learned preferences back to default"
                >
                  <RotateCcw className={`w-3 h-3 ${resettingPrefs ? "animate-spin" : ""}`} />
                  <span>Reset All</span>
                </button>
              )}
            </div>

            {loadingPrefs ? (
              <div className="p-4 text-center text-gray-400 text-xs flex items-center justify-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Loading learned preferences...</span>
              </div>
            ) : learnedPrefs ? (
              <div className="space-y-3">
                {/* Stage Banner */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200/80 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-900 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-romantic-500" />
                      {learnedPrefs.stageLabel}
                    </span>
                    <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-white text-romantic-600 border border-pink-200">
                      Stage {learnedPrefs.stage} of 4
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-pink-200/50 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-romantic-500 h-full rounded-full transition-all duration-500"
                      style={{
                        width:
                          learnedPrefs.stage === 4
                            ? "100%"
                            : learnedPrefs.stage === 3
                            ? "75%"
                            : learnedPrefs.stage === 2
                            ? "50%"
                            : "25%",
                      }}
                    />
                  </div>

                  {/* Stats counts */}
                  <div className="flex items-center gap-4 pt-1 text-[11px] text-gray-600 font-medium">
                    <span className="flex items-center gap-1 text-emerald-700">
                      <ThumbsUp className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                      <strong>{learnedPrefs.totalLikes}</strong> Likes
                    </span>
                    <span className="flex items-center gap-1 text-rose-700">
                      <ThumbsDown className="w-3 h-3 fill-rose-600 text-rose-600" />
                      <strong>{learnedPrefs.totalDislikes}</strong> Dislikes
                    </span>
                    <span className="text-gray-500">
                      Preferred length: <strong className="text-gray-800 uppercase">{learnedPrefs.preferredLength}</strong>
                    </span>
                  </div>
                </div>

                {/* Things I Like */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3 text-emerald-600" />
                    <span>Things I Like (Prioritized in Recommendations):</span>
                  </label>
                  {learnedPrefs.preferredTones.length === 0 &&
                  learnedPrefs.globalLikedStyles.length === 0 ? (
                    <p className="text-[11px] text-gray-400 italic">
                      No positive feedback yet. Tap 👍 on recommended texts to build this list!
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(
                        new Set([...learnedPrefs.preferredTones, ...learnedPrefs.globalLikedStyles])
                      ).map((trait, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-medium flex items-center gap-1.5 border border-emerald-200"
                        >
                          <span>{trait}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTrait(trait)}
                            className="text-emerald-500 hover:text-emerald-800 transition"
                            title={`Remove "${trait}" from liked styles`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Things I Dislike */}
                <div className="space-y-1.5 pt-1.5 border-t border-pink-100">
                  <label className="block text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                    <ThumbsDown className="w-3 h-3 text-rose-600" />
                    <span>Things I Dislike (Avoided in Recommendations):</span>
                  </label>
                  {learnedPrefs.avoidedTones.length === 0 &&
                  learnedPrefs.globalDislikedStyles.length === 0 ? (
                    <p className="text-[11px] text-gray-400 italic">
                      No negative feedback yet. Tap 👎 if a recommendation feels robotic or cringey to penalize that style.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(
                        new Set([...learnedPrefs.avoidedTones, ...learnedPrefs.globalDislikedStyles])
                      ).map((trait, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-800 text-[11px] font-medium flex items-center gap-1.5 border border-rose-200"
                        >
                          <span>{trait}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTrait(trait)}
                            className="text-rose-500 hover:text-rose-800 transition"
                            title={`Remove "${trait}" from disliked styles`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Backup & Data */}
          <div className="p-4 rounded-2xl bg-white border border-pink-200 flex items-center justify-between">
            <div>
              <div className="font-bold text-gray-900 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-romantic-500" />
                Data & Privacy
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Your data is stored locally in SQLite. Export an offline JSON backup anytime.
              </p>
            </div>
            <a
              href="/api/data/export"
              download
              className="px-3.5 py-1.5 rounded-xl bg-pastelPink-50 border border-pink-200 text-gray-800 font-semibold hover:bg-pastelPink-100 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-romantic-500" /> Export JSON
            </a>
          </div>

          {/* Footer Save */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-gray-500 hover:bg-gray-100"
            >
              Close
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-romantic-500 text-white font-bold hover:bg-romantic-600 shadow-sm flex items-center gap-1.5"
            >
              {saved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
                </>
              ) : (
                "Save Preferences"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
