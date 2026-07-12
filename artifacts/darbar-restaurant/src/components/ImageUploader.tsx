import { useRef, useState, useCallback } from "react";
import imageCompression from "browser-image-compression";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  /** Current image URL stored in the form. */
  value?: string;
  /** Called with the new URL after a successful upload, or "" after removal. */
  onChange: (url: string) => void;
  className?: string;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_MB = 5;

async function compressIfNeeded(file: File): Promise<File> {
  // Only compress if larger than 1 MB; keeps small files as-is to save CPU.
  if (file.size <= 1_048_576) return file;
  return imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1_200,
    useWebWorker: true,
    initialQuality: 0.85,
  });
}

async function uploadToServer(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file, file.name);
  const res = await fetch("/api/upload", {
    method: "POST",
    body,
    credentials: "include",
  });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.error ?? "Upload failed");
  }
  const { url } = await res.json();
  return url as string;
}

export function ImageUploader({ value, onChange, className }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Only JPG, PNG, and WebP files are supported.");
        return;
      }
      if (file.size > MAX_MB * 1_048_576) {
        setError(`File must be smaller than ${MAX_MB} MB.`);
        return;
      }

      setIsLoading(true);
      try {
        // Only upload here — deleting the previous image is the backend's
        // job once the form is actually saved (see menu.ts / specials.ts
        // PATCH handlers). Deleting eagerly here would remove the old file
        // even if the user cancels the dialog or the save request fails,
        // leaving the still-saved record pointing at a deleted image.
        const compressed = await compressIfNeeded(file);
        const url = await uploadToServer(compressed);
        onChange(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed — please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [onChange],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset so the same file can be re-selected after removal.
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRemove = () => {
    // Same reasoning as processFile: the backend deletes the old storage
    // object once the form save actually succeeds, not here.
    onChange("");
  };

  const openPicker = () => inputRef.current?.click();

  return (
    <div className={cn("space-y-2", className)}>
      {value ? (
        /* ── Preview with overlay actions ─────────────────────────── */
        <div className="group relative rounded-xl overflow-hidden border border-border bg-muted aspect-video">
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
          {/* Semi-transparent overlay revealed on hover */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="bg-white/90 hover:bg-white text-stone-900 shadow"
              disabled={isLoading}
              onClick={openPicker}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Upload className="h-4 w-4 mr-1.5" />
              )}
              Replace
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={isLoading}
              onClick={handleRemove}
            >
              <X className="h-4 w-4 mr-1.5" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        /* ── Drop zone ─────────────────────────────────────────────── */
        <div
          role="button"
          tabIndex={0}
          className={cn(
            "aspect-video rounded-xl border-2 border-dashed transition-colors duration-150",
            "flex flex-col items-center justify-center gap-3 cursor-pointer select-none",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/40",
            isLoading && "pointer-events-none opacity-60",
          )}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={openPicker}
          onKeyDown={(e) => e.key === "Enter" && openPicker()}
        >
          {isLoading ? (
            <Loader2 className="h-9 w-9 text-primary animate-spin" />
          ) : (
            <div className="rounded-full bg-muted p-3">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="text-center px-4">
            <p className="text-sm font-medium text-foreground">
              {isLoading ? "Uploading…" : "Click or drag & drop to upload"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              JPG, PNG, WebP &middot; max 5 MB &middot; auto-compressed
            </p>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleInputChange}
        aria-hidden
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
