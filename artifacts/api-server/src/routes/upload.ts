import { Router } from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "menu-images";
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter(_req, file, cb) {
    const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (ALLOWED.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, and WebP files are allowed"));
    }
  },
});

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Extracts the storage path from a Supabase public URL.
 * Format: .../storage/v1/object/public/<bucket>/<path>
 */
export function storagePathFromUrl(url: string): string | null {
  try {
    const { pathname } = new URL(url);
    const marker = `/public/${BUCKET}/`;
    const idx = pathname.indexOf(marker);
    return idx === -1 ? null : pathname.slice(idx + marker.length);
  } catch {
    return null;
  }
}

/** Silently deletes a Supabase Storage object by its public URL. Never throws. */
export async function deleteStorageImage(url: string | null | undefined): Promise<void> {
  if (!url) return;
  const path = storagePathFromUrl(url);
  if (!path) return;
  try {
    await supabase().storage.from(BUCKET).remove([path]);
  } catch {
    // best-effort — log but don't fail the request
  }
}

// ── POST /api/upload ─────────────────────────────────────────────────────────
// Accepts multipart/form-data with a `file` field.
// Returns { url, path } on success.
router.post(
  "/upload",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ error: "File exceeds the 5 MB limit" });
        return;
      }
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      next();
    });
  },
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const { mimetype, buffer, originalname } = req.file;
    const ext = (originalname.split(".").pop() ?? "jpg").toLowerCase();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

    try {
      const client = supabase();
      const { error } = await client.storage
        .from(BUCKET)
        .upload(fileName, buffer, { contentType: mimetype, upsert: false });

      if (error) throw error;

      const { data } = client.storage.from(BUCKET).getPublicUrl(fileName);
      res.status(201).json({ url: data.publicUrl, path: fileName });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      res.status(500).json({ error: msg });
    }
  },
);

// ── DELETE /api/upload ────────────────────────────────────────────────────────
// Body: { url: string }  — the public URL previously returned by POST.
router.delete("/upload", async (req, res): Promise<void> => {
  const { url } = req.body as { url?: string };
  if (!url) {
    res.status(400).json({ error: "`url` is required" });
    return;
  }

  const path = storagePathFromUrl(url);
  if (!path) {
    res.status(400).json({ error: "URL is not from this storage bucket" });
    return;
  }

  try {
    const { error } = await supabase().storage.from(BUCKET).remove([path]);
    if (error) throw error;
    res.sendStatus(204);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Delete failed";
    res.status(500).json({ error: msg });
  }
});

export default router;
