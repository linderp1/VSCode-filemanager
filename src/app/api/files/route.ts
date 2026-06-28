import { NextResponse } from "next/server";
import { listDir, PathError, previewKindForEntries } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rel = searchParams.get("path") ?? "";
  try {
    const { rel: normalized, entries } = await listDir(rel);
    return NextResponse.json({
      path: normalized,
      entries: previewKindForEntries(entries),
    });
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown) {
  if (err instanceof PathError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}
