"use client";

import React, { useState, useEffect } from "react";
import { Download, Heart, X, Share } from "lucide-react";

export function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if already in standalone PWA mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // Check if user previously dismissed
    const dismissedAt = localStorage.getItem("amelia_pwa_dismissed");
    if (dismissedAt) {
      const daysSinceDismiss = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < 7) {
        return;
      }
    }

    // Detect iOS
    const ua = window.navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    if (isIosDevice && isSafari) {
      setIsIos(true);
      setShowBanner(true);
      return;
    }

    // Android / Chromium beforeinstallprompt handler
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIosGuide(false);
    localStorage.setItem("amelia_pwa_dismissed", String(Date.now()));
  };

  if (!showBanner) return null;

  return (
    <>
      <aside
        aria-label="App installation banner"
        className="fixed bottom-20 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50 bg-white border border-pink-200 rounded-3xl p-3.5 shadow-xl shadow-pink-500/10 animate-in slide-in-from-bottom duration-300"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-romantic-500 to-rose-400 flex items-center justify-center shrink-0 shadow-sm shadow-pink-300">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-gray-900 truncate">Install Ameilia AI App</h4>
            <p className="text-[11px] text-gray-600 line-clamp-1">
              Add to home screen for fullscreen mobile chat & quick texting tools
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl bg-romantic-500 hover:bg-romantic-600 text-white font-bold text-xs shadow-xs transition flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-pink-50 transition"
              aria-label="Dismiss install banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* iOS Instructions Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-pink-200 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-pink-100 flex items-center justify-center text-romantic-600">
                  <Share className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="text-xs text-gray-700 space-y-2.5 list-decimal pl-4">
              <li>
                Tap the <strong className="text-gray-900">Share</strong> button at the bottom of Safari (
                <Share className="w-3.5 h-3.5 inline text-romantic-600" />
                ).
              </li>
              <li>Scroll down and tap <strong className="text-gray-900">"Add to Home Screen"</strong>.</li>
              <li>Tap <strong className="text-gray-900">Add</strong> in the top-right corner.</li>
            </ol>

            <button
              onClick={() => {
                setShowIosGuide(false);
                handleDismiss();
              }}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-romantic-500 to-rose-400 text-white font-bold text-xs shadow-sm transition"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
