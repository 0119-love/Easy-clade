import { NextResponse } from "next/server";
import { readdir } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const BACKGROUNDS_DIR = path.join(process.cwd(), "public", "backgrounds");
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

// Scans public/backgrounds at request time (not build time) so dropping a
// new photo in the folder shows up without touching any code.
export async function GET() {
  let files: string[] = [];
  try {
    files = await readdir(BACKGROUNDS_DIR);
  } catch {
    files = [];
  }

  const images = files
    .filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .sort()
    .map((file) => `/backgrounds/${file}`);

  return NextResponse.json({ images });
}
