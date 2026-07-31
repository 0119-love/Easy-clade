import { NextResponse, type NextRequest } from "next/server";
import { deleteFile, getFile } from "@/lib/files/queries";
import { deleteStoredFile } from "@/lib/files/blobStorage";
import { requireUserContext } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const file = await getFile(auth.id, Number(id));
  if (!file) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });

  // file.path is a Vercel Blob URL -- fetched and re-emitted (rather than
  // redirected) so the response keeps this app's own Content-Disposition
  // filename instead of Blob's randomized stored name.
  const blobResponse = await fetch(file.path);
  const buffer = Buffer.from(await blobResponse.arrayBuffer());
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.filename)}"`,
    },
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserContext(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const file = await deleteFile(auth.id, Number(id));
  if (file) {
    await deleteStoredFile(file.path);
  }
  return NextResponse.json({ ok: true });
}
