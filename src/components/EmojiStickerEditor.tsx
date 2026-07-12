"use client";

import { useState, useRef, useEffect } from "react";

interface Sticker {
  id: number;
  emoji: string;
  x: number; // 0–1 relative to container width
  y: number; // 0–1 relative to container height
  size: number; // px on screen
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

export default function EmojiStickerEditor({ imageFile, onDone, onCancel }: Props) {
  const [imageUrl, setImageUrl] = useState("");
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [nextId, setNextId] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [processing, setProcessing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{
    id: number;
    startTouchX: number;
    startTouchY: number;
    startStickerX: number;
    startStickerY: number;
  } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // ── Sticker management ─────────────────────────────────────────────────────

  const addSticker = (emoji: string) => {
    setStickers((prev) => [
      ...prev,
      { id: nextId, emoji, x: 0.5, y: 0.38, size: DEFAULT_SIZE },
    ]);
    setNextId((n) => n + 1);
    setShowPicker(false);
  };

  const removeSticker = (id: number) => setStickers((prev) => prev.filter((s) => s.id !== id));

  // ── Touch drag ────────────────────────────────────────────────────────────

  const onStickerTouchStart = (e: React.TouchEvent, id: number) => {
    e.stopPropagation();
    const touch = e.touches[0];
    const sticker = stickers.find((s) => s.id === id);
    if (!sticker) return;
    dragRef.current = {
      id,
      startTouchX: touch.clientX,
      startTouchY: touch.clientY,
      startStickerX: sticker.x,
      startStickerY: sticker.y,
    };
  };

  const onContainerTouchMove = (e: React.TouchEvent) => {
    if (!dragRef.current || !containerRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const dx = (touch.clientX - dragRef.current.startTouchX) / rect.width;
    const dy = (touch.clientY - dragRef.current.startTouchY) / rect.height;
    const newX = Math.max(0.05, Math.min(0.95, dragRef.current.startStickerX + dx));
    const newY = Math.max(0.05, Math.min(0.95, dragRef.current.startStickerY + dy));
    setStickers((prev) =>
      prev.map((s) => (s.id === dragRef.current!.id ? { ...s, x: newX, y: newY } : s))
    );
  };

  const onContainerTouchEnd = () => { dragRef.current = null; };

  // Mouse fallback (desktop testing)
  const onStickerMouseDown = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const sticker = stickers.find((s) => s.id === id);
    if (!sticker || !containerRef.current) return;
    const startX = e.clientX, startY = e.clientY;
    const sx = sticker.x, sy = sticker.y;
    const onMove = (ev: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newX = Math.max(0.05, Math.min(0.95, sx + (ev.clientX - startX) / rect.width));
      const newY = Math.max(0.05, Math.min(0.95, sy + (ev.clientY - startY) / rect.height));
      setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, x: newX, y: newY } : s)));
    };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
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

        // Scale factor: natural px per displayed px
        const scaleX = img.naturalWidth / imgRect.width;
        const scaleY = img.naturalHeight / imgRect.height;

        // Offset of the rendered image within the container (object-contain letterboxing)
        const offsetLeft = imgRect.left - containerRect.left;
        const offsetTop = imgRect.top - containerRect.top;

        for (const sticker of stickers) {
          // Convert 0–1 container coords → pixels on displayed image → natural image pixels
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
      const edited = new File(
        [blob],
        imageFile.name.replace(/\.[^.]+$/, ".webp"),
        { type: "image/webp" }
      );
      onDone(edited);
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
          Cancel
        </button>
        <p className="text-[15px] font-semibold text-white">Add Sticker</p>
        <button
          onClick={handleDone}
          disabled={processing}
          className="text-[14px] font-semibold text-[#fa6460] disabled:opacity-50"
        >
          {processing ? "Saving…" : "Done"}
        </button>
      </div>

      {/* Image canvas area */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden"
        onTouchMove={onContainerTouchMove}
        onTouchEnd={onContainerTouchEnd}
      >
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
            onTouchStart={(e) => onStickerTouchStart(e, sticker.id)}
            onMouseDown={(e) => onStickerMouseDown(e, sticker.id)}
          >
            {sticker.emoji}
            {/* Remove ✕ */}
            <button
              className="absolute -right-1.5 -top-1.5 flex size-[18px] items-center justify-center rounded-full bg-black/70 text-[9px] font-bold text-white"
              onTouchStart={(e) => { e.stopPropagation(); removeSticker(sticker.id); }}
              onClick={(e) => { e.stopPropagation(); removeSticker(sticker.id); }}
            >
              ✕
            </button>
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
                  className="text-[38px] active:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowPicker(false)}
              className="mt-3 w-full py-2 text-[13px] text-white/50"
            >
              Cancel
            </button>
          </>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-2 rounded-full bg-white/15 px-6 py-3 text-[14px] font-medium text-white"
            >
              <span className="text-[20px]">😊</span>
              Add sticker
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
