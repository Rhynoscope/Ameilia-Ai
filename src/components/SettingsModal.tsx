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
} from "lucide-react";
import { CommunicationProfile } from "@/lib/types";
import { DEFAULT_COMMUNICATION_PROFILE } from "@/lib/constants";

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

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.model) setModel(data.model);
      if (data.profile) setProfile(data.profile);
      setHasApiKey(Boolean(data.hasKey));
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestKey = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/gemini/test", { method: "POST" });
      const data = await res.json();
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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-pink-200 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-pink-100 flex items-center justify-between bg-pastelPink-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-romantic-500 text-white flex items-center justify-center shadow-sm">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-gray-900">
                Amelia AI Settings & Voice
              </h2>
              <p className="text-xs text-gray-500">
                Gemini AI integration, model selection, and your authentic writing profile.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
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
