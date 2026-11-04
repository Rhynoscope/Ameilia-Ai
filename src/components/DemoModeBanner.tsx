"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Key, ArrowRight, X } from "lucide-react";

export function DemoModeBanner({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const [status, setStatus] = useState<{ configured: boolean; model: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/gemini/test")
      .then((r) => r.json())
      .then((d) => setStatus({ configured: d.configured, model: d.model }))
      .catch(() => setStatus({ configured: false, model: "gemini-3.5-flash-lite" }));
  }, []);

  if (!status || status.configured || dismissed) {
    return null;
  }

  return (
    <div className="bg-pastelPink-50 border-b border-pink-200 px-4 py-2 text-xs sm:text-sm text-gray-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-romantic-500 shrink-0" />
          <span>
            <strong className="text-romantic-600 font-semibold">Demo Mode:</strong> Configure your free{" "}
            <code className="bg-white border border-pink-200 px-1.5 py-0.5 rounded text-romantic-600 font-mono font-medium">GEMINI_API_KEY</code> in{" "}
            <code className="bg-white border border-pink-200 px-1.5 py-0.5 rounded text-gray-700 font-mono">.env</code> to activate live Gemini AI ({status.model}). Running realistic offline suggestions.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onOpenSettings ? (
            <button
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1 font-semibold text-romantic-600 hover:text-romantic-700 underline transition"
            >
              Configure Key <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Link
              href="/settings"
              className="inline-flex items-center gap-1 font-semibold text-romantic-600 hover:text-romantic-700 underline transition"
            >
              Configure Key <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="text-gray-400 hover:text-gray-700 p-1 rounded transition"
            title="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
