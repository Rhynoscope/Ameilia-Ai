"use client";

import React, { useState } from "react";
import { ChatAttachment } from "@/lib/types";
import { formatFileSize } from "@/lib/media-handler";
import {
  FileAudio,
  FileVideo,
  FileImage,
  X,
  Play,
  Maximize2,
} from "lucide-react";

interface MediaPreviewProps {
  attachment: ChatAttachment;
  onRemove?: () => void;
  isStaging?: boolean;
}

export function MediaPreview({ attachment, onRemove, isStaging = false }: MediaPreviewProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div
        className={`relative group flex items-center gap-3 p-2.5 rounded-2xl border transition-all ${
          isStaging
            ? "bg-white border-pink-200 shadow-sm"
            : "bg-pastelPink-50/60 border-pink-100"
        }`}
      >
        {/* Category Icon / Thumbnail */}
        {attachment.category === "image" && (
          <div
            onClick={() => !isStaging && setModalOpen(true)}
            className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 border border-pink-100 shrink-0 cursor-pointer relative"
          >
            <img
              src={attachment.data}
              alt={attachment.name}
              className="w-full h-full object-cover"
            />
            {!isStaging && (
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Maximize2 className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        )}

        {attachment.category === "audio" && (
          <div className="w-12 h-12 rounded-xl bg-pastelPink-100 border border-pink-200 text-romantic-500 flex items-center justify-center shrink-0">
            <FileAudio className="w-6 h-6" />
          </div>
        )}

        {attachment.category === "video" && (
          <div className="w-12 h-12 rounded-xl bg-pastelPink-100 border border-pink-200 text-romantic-500 flex items-center justify-center shrink-0 relative overflow-hidden">
            <FileVideo className="w-6 h-6" />
          </div>
        )}

        {/* File Metadata */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="font-semibold text-xs text-gray-900 truncate">
            {attachment.name}
          </div>
          <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
            <span className="capitalize font-medium text-romantic-600">
              {attachment.category}
            </span>
            <span>•</span>
            <span>{formatFileSize(attachment.size)}</span>
          </div>

          {/* Inline Audio Player for audio messages */}
          {!isStaging && attachment.category === "audio" && (
            <div className="mt-2 w-full max-w-xs">
              <audio controls src={attachment.data} className="w-full h-8" />
            </div>
          )}

          {/* Inline Video Player for video messages */}
          {!isStaging && attachment.category === "video" && (
            <div className="mt-2 w-full max-w-sm rounded-xl overflow-hidden border border-pink-200">
              <video controls src={attachment.data} className="w-full max-h-48 rounded-xl bg-black" />
            </div>
          )}
        </div>

        {/* Remove Button (when staging) */}
        {isStaging && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1 rounded-full text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Lightbox Modal for Full Image View */}
      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={attachment.data}
              alt={attachment.name}
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain border border-white/20"
            />
            <button
              onClick={() => setModalOpen(false)}
              className="absolute -top-10 right-0 text-white hover:text-pink-300 font-semibold text-xs flex items-center gap-1"
            >
              <X className="w-5 h-5" /> Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
