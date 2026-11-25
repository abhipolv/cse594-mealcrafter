import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// Fridge photos live in Supabase Storage when SUPABASE_URL and
// SUPABASE_SECRET_KEY are set (production), otherwise under .data/uploads,
// which .gitignore keeps out of the repo (rule 6).
const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");
const BUCKET = process.env.SUPABASE_BUCKET || "media";

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

function safe(part: string) {
  if (!/^[a-zA-Z0-9-]+$/.test(part)) throw new Error("Bad storage path");
  return part;
}

/** Stores one JPEG and returns its storage path: <userId>/<scanId>/<name>.jpg */
export async function putImage(userId: string, scanId: string, name: string, data: Buffer): Promise<string> {
  const rel = `${safe(userId)}/${safe(scanId)}/${safe(name)}.jpg`;
  const sb = supabase();
  if (sb) {
    const { error } = await sb.storage.from(BUCKET).upload(rel, data, { contentType: "image/jpeg", upsert: false });
    if (error) throw new Error(`Could not store the photo: ${error.message}`);
  } else {
    const file = path.join(LOCAL_ROOT, rel);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
  }
  return rel;
}

export async function getImage(storagePath: string): Promise<Buffer | null> {
  const parts = storagePath.split("/");
  if (parts.length !== 3 || !parts[2].endsWith(".jpg")) return null;
  parts.slice(0, 2).forEach(safe);
  safe(parts[2].slice(0, -4));
  const sb = supabase();
  try {
    if (sb) {
      const { data, error } = await sb.storage.from(BUCKET).download(storagePath);
      if (error || !data) return null;
      return Buffer.from(await data.arrayBuffer());
    }
    return await readFile(path.join(LOCAL_ROOT, storagePath));
  } catch {
    return null;
  }
}
