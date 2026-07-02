"use client";

import { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";
import { processAndUploadMultipleAuras, type AuraMetadata, type UploadProgress } from "@/services/uploadService";

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface UploadContextValue {
  status: UploadStatus;
  progress: UploadProgress | null;
  message: string | null;
  startUpload: (files: File[], anchorFile: File, metadata: AuraMetadata) => void;
  dismiss: () => void;
}

const UploadContext = createContext<UploadContextValue>({
  status: "idle",
  progress: null,
  message: null,
  startUpload: () => {},
  dismiss: () => {},
});

export function useUpload() {
  return useContext(UploadContext);
}

function progressPercent(p: UploadProgress | null): number {
  if (!p) return 0;
  if (p.status === "extracting") return 5;
  if (p.status === "optimizing") return Math.round((p.current / p.total) * 80 + 5);
  if (p.status === "uploading") return 90;
  return 100;
}

// ── Toast UI ──────────────────────────────────────────────────────────────────

function UploadToast({ status, progress, message, dismiss }: {
  status: UploadStatus;
  progress: UploadProgress | null;
  message: string | null;
  dismiss: () => void;
}) {
  if (status === "idle") return null;

  const pct = progressPercent(progress);
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 px-3 pb-2">
      <div className={`rounded-xl px-4 py-3 shadow-lg ${
        isSuccess ? "bg-[#1e1e1e]" : isError ? "bg-red-600" : "bg-[#1e1e1e]"
      }`}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-medium text-white truncate">
            {isSuccess
              ? message ?? "Upload successful"
              : isError
              ? message ?? "Upload failed"
              : progress?.status === "extracting"
              ? "Reading photo data…"
              : progress?.status === "optimizing"
              ? `Optimizing ${progress.current}/${progress.total}…`
              : "Uploading…"}
          </p>
          {isError && (
            <button onClick={dismiss} className="shrink-0 text-white/70">
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Progress bar */}
        {!isError && (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isSuccess ? "bg-[#fa6460]" : "bg-white"}`}
              style={{ width: `${isSuccess ? 100 : pct}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    setStatus("idle");
    setProgress(null);
    setMessage(null);
  }, []);

  const startUpload = useCallback((files: File[], anchorFile: File, metadata: AuraMetadata) => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    setStatus("uploading");
    setProgress(null);
    setMessage(null);

    processAndUploadMultipleAuras(files, anchorFile, metadata, (p) => setProgress(p))
      .then((result) => {
        setStatus("success");
        setMessage(result.hasGPS ? "Upload successful" : "Uploaded (no location data)");
        dismissTimer.current = setTimeout(dismiss, 3000);
      })
      .catch((err: Error) => {
        const msg = err.message || "Upload failed";
        setStatus("error");
        setMessage(
          msg.includes("MAX_WRITE_OPERATIONS_PER_HOUR")
            ? "Rate limit exceeded. Try again later."
            : msg.includes("401") || msg.includes("Unauthorized")
            ? "Session expired. Please log in again."
            : "Upload failed. Please try again."
        );
      });
  }, [dismiss]);

  useEffect(() => () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); }, []);

  return (
    <UploadContext.Provider value={{ status, progress, message, startUpload, dismiss }}>
      {children}
      <UploadToast status={status} progress={progress} message={message} dismiss={dismiss} />
    </UploadContext.Provider>
  );
}
