"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/i18n";

interface Sticker {
  id: number;
  emoji: string;
  x: number;     // 0–1 relative to container width
  y: number;     // 0–1 relative to container height
  size: number;  // px on screen
}

interface Props {
  imageFile: File;
  onDone: (file: File) => void;
  onCancel: () => void;
}

const EMOJI_OPTIONS = [
  "😂", "🤩", "🫢", "🤫", "😀", "😆",
  "🙂", "😍", "😗", "😛", "🤨", "😏",
  "🥳", "🙂‍↕️", "🤗", "🫣", "😎", "😶",
  "😈", "🤠", "🤖", "🌝", "🌸", "🌞",
];

const DEFAULT_SIZE = 72;
const MIN_SIZE = 32;
const MAX_SIZE = 180;

export default function EmojiStickerEditor({ imageFile, onDone, onCancel }: Props) {
  const [imageUrl, setImageUrl] = useState("");
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [nextId, setNextId] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { language } = useLanguage();

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Unified gesture ref — covers both move and resize
  const gestureRef = useRef<{
    type: "move" | "resize";
    id: number;
    startTouchX: number;
    startTouchY: number;
    startStickerX: number;
    startStickerY: number;
    startSize: number;
  } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Native non-passive touchmove so preventDefault() actually works
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchMove = (e: TouchEvent) => {
      if (!gestureRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const rect = container.getBoundingClientRect();
      const g = gestureRef.current;

      if (g.type === "move") {
        const newX = Math.max(0.05, Math.min(0.95, g.startStickerX + (touch.clientX - g.startTouchX) / rect.width));
        const newY = Math.max(0.05, Math.min(0.95, g.startStickerY + (touch.clientY - g.startTouchY) / rect.height));
        setStickers((prev) => prev.map((s) => s.id === g.id ? { ...s, x: newX, y: newY } : s));
      } else {
        // resize: diagonal drag distance → size delta
        const dx = touch.clientX - g.startTouchX;
        const dy = touch.clientY - g.startTouchY;
        const delta = (Math.abs(dx) > Math.abs(dy) ? dx : dy);
        const newSize = Math.max(MIN_SIZE, Math.min(MAX_SIZE, g.startSize + delta));
        setStickers((prev) => prev.map((s) => s.id === g.id ? { ...s, size: newSize } : s));
      }
    };

    const onTouchEnd = () => { gestureRef.current = null; };

    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd);
    container.addEventListener("touchcancel", onTouchEnd);
    return () => {
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  const addSticker = (emoji: string) => {
    setStickers((prev) => [...prev, { id: nextId, emoji, x: 0.5, y: 0.38, size: DEFAULT_SIZE }]);
    setNextId((n) => n + 1);
    setShowPicker(false);
  };

  const removeSticker = (id: number) => setStickers((prev) => prev.filter((s) => s.id !== id));

  const onStickerTouchStart = (e: React.TouchEvent, id: number, type: "move" | "resize") => {
    e.stopPropagation();
    const touch = e.touches[0];
    const sticker = stickers.find((s) => s.id === id);
    if (!sticker) return;
    gestureRef.current = {
      type,
      id,
      startTouchX: touch.clientX,
      startTouchY: touch.clientY,
      startStickerX: sticker.x,
      startStickerY: sticker.y,
      startSize: sticker.size,
    };
  };

  // Mouse fallback for desktop testing
  const onStickerMouseDown = (e: React.MouseEvent, id: number, type: "move" | "resize") => {
    e.stopPropagation();
    const sticker = stickers.find((s) => s.id === id);
    if (!sticker || !containerRef.current) return;
    const startX = e.clientX, startY = e.clientY;
    const sx = sticker.x, sy = sticker.y, ss = sticker.size;
    const onMove = (ev: MouseEvent) => {
      const rect = containerRef.current!.getBoundingClientRect();
      if (type === "move") {
        const newX = Math.max(0.05, Math.min(0.95, sx + (ev.clientX - startX) / rect.width));
        const newY = Math.max(0.05, Math.min(0.95, sy + (ev.clientY - startY) / rect.height));
        setStickers((prev) => prev.map((s) => s.id === id ? { ...s, x: newX, y: newY } : s));
      } else {
        const delta = ev.clientX - startX;
        const newSize = Math.max(MIN_SIZE, Math.min(MAX_SIZE, ss + delta));
        setStickers((prev) => prev.map((s) => s.id === id ? { ...s, size: newSize } : s));
      }
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // ── Flatten to canvas ──────────────────────────────────────────────────────

  const handleDone = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      const img = new Image();
      img.src = imageUrl;
      await new Promise<void>((res) => { img.onload = () => res(); });

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      if (stickers.length > 0 && containerRef.current && imgRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const imgRect = imgRef.current.getBoundingClientRect();
        const scaleX = img.naturalWidth / imgRect.width;
        const scaleY = img.naturalHeight / imgRect.height;
        const offsetLeft = imgRect.left - containerRect.left;
        const offsetTop = imgRect.top - containerRect.top;

        for (const sticker of stickers) {
          const screenX = sticker.x * containerRect.width - offsetLeft;
          const screenY = sticker.y * containerRect.height - offsetTop;
          const canvasX = screenX * scaleX;
          const canvasY = screenY * scaleY;
          const canvasSize = sticker.size * scaleX;

          ctx.font = `${canvasSize}px serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(sticker.emoji, canvasX, canvasY);
        }
      }

      const blob = await new Promise<Blob>((res) =>
        canvas.toBlob((b) => res(b!), "image/webp", 0.92)
      );
      onDone(new File([blob], imageFile.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
    } catch {
      onDone(imageFile);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-3">
        <button onClick={onCancel} className="text-[14px] text-white/60">
          {t("cancel", language)}
        </button>
        <p className="text-[15px] font-semibold text-white">{t("addStickerTitle", language)}</p>
        <button
          onClick={handleDone}
          disabled={processing}
          className="text-[14px] font-semibold text-[#B85C38] disabled:opacity-50"
        >
          {processing ? t("savingDots", language) : t("done", language)}
        </button>
      </div>

      {/* Image + sticker canvas */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={imageUrl}
            alt=""
            className="h-full w-full object-contain"
            draggable={false}
          />
        )}

        {stickers.map((sticker) => (
          <div
            key={sticker.id}
            className="absolute select-none"
            style={{
              left: `${sticker.x * 100}%`,
              top: `${sticker.y * 100}%`,
              transform: "translate(-50%, -50%)",
              fontSize: sticker.size,
              lineHeight: 1,
              touchAction: "none",
              cursor: "grab",
            }}
            onTouchStart={(e) => onStickerTouchStart(e, sticker.id, "move")}
            onMouseDown={(e) => onStickerMouseDown(e, sticker.id, "move")}
          >
            {sticker.emoji}

            {/* Remove ✕ — top-left */}
            <button
              className="absolute -left-1 -top-1 flex size-[18px] items-center justify-center rounded-full bg-black/70 text-[9px] font-bold text-white"
              onTouchStart={(e) => { e.stopPropagation(); removeSticker(sticker.id); }}
              onClick={(e) => { e.stopPropagation(); removeSticker(sticker.id); }}
            >
              ✕
            </button>

            {/* Resize handle — bottom-right */}
            <div
              className="absolute -bottom-1 -right-1 flex size-[20px] cursor-nwse-resize items-center justify-center rounded-full bg-white/80"
              onTouchStart={(e) => onStickerTouchStart(e, sticker.id, "resize")}
              onMouseDown={(e) => onStickerMouseDown(e, sticker.id, "resize")}
            >
              <svg viewBox="0 0 10 10" className="size-[10px]" fill="none" stroke="#333" strokeWidth={1.5} strokeLinecap="round">
                <line x1="3" y1="9" x2="9" y2="3" />
                <line x1="6" y1="9" x2="9" y2="6" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="pb-10 pt-4 px-4">
        {showPicker ? (
          <>
            <div className="flex flex-wrap justify-center gap-3 rounded-2xl bg-white/10 p-4">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => addSticker(emoji)}
                  className="text-[38px] transition-transform active:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowPicker(false)}
              className="mt-3 w-full py-2 text-[13px] text-white/50"
            >
              {t("cancel", language)}
            </button>
          </>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-2 rounded-full bg-white/15 px-6 py-3 text-[14px] font-medium text-white"
            >
              <span className="text-[20px]">😊</span>
              {t("addSticker", language)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
