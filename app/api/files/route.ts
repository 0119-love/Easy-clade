import { NextResponse, type NextRequest } from "next/server";
import { getFiles, insertFile } from "@/lib/files/queries";
import { storeFile } from "@/lib/files/blobStorage";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ files: await getFiles(auth.id) });
}

export async function POST(request: NextRequest) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || "application/octet-stream";
  const url = await storeFile(file.name, buffer, contentType);

  const row = await insertFile(auth.id, {
    filename: file.name,
    mimeType: contentType,
    size: buffer.byteLength,
    path: url,
  });
  return NextResponse.json({ file: row });
}
