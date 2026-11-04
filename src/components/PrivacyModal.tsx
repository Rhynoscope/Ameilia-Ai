"use client";

import React from "react";
import { ShieldCheck, Lock, EyeOff, Sparkles, Check } from "lucide-react";

interface PrivacyModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function PrivacyModal({ isOpen, onConfirm, onClose }: PrivacyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#1f1227] border border-pink-200 dark:border-pink-900/50 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-romantic-500 to-lavender-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
              Privacy & Screenshot Processing
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your relationship conversations are sacred and private.
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-gray-600 dark:text-gray-300 bg-pink-50/50 dark:bg-pink-950/20 p-4 rounded-2xl border border-pink-100 dark:border-pink-900/20">
          <div className="flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-romantic-500 shrink-0 mt-0.5" />
            <span>
              <strong>Direct AI Processing:</strong> Uploaded screenshots are sent securely to Google's Gemini API for multimodal vision analysis.
            </span>
          </div>

          <div className="flex items-start gap-2.5">
            <EyeOff className="w-4 h-4 text-lavender-500 shrink-0 mt-0.5" />
            <span>
              <strong>Zero Long-term Image Storage:</strong> Screenshots are processed in memory and are NOT saved permanently on our server by default.
            </span>
          </div>

          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
            <span>
              <strong>You Control What is Remembered:</strong> Any relationship facts or memories suggested by the AI require your explicit manual approval before being saved.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-pink-950/40 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-romantic-500 to-lavender-500 hover:from-romantic-600 hover:to-lavender-600 shadow-md shadow-pink-500/20 transition flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
}
