import { promises as fs, createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { statFile, PathError, PREVIEW_MAX_BYTES } from "@/lib/fs";
import { mimeFor, previewKind } from "@/lib/mime";

export const dynamic = "force-dynamic";

/**
 * Inline-serve a file for in-browser preview. Only images, PDFs and small text
 * files are previewable; large/binary files must be downloaded instead.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rel = searchParams.get("path") ?? "";
  try {
    const file = await statFile(rel);
    const kind = previewKind(file.name);

    if (kind === "none") {
      return NextResponse.json(
        { error: "Preview not supported for this file type" },
        { status: 415 },
      );
    }

    if (kind === "text") {
      if (file.size > PREVIEW_MAX_BYTES) {
        return NextResponse.json(
          { error: "File too large to preview" },
          { status: 413 },
        );
      }
      const text = await fs.readFile(file.abs, "utf-8");
      return new Response(text, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "private, no-store",
        },
      });
    }

    // image / pdf — stream inline.
    const nodeStream = createReadStream(file.abs);
    const body = Readable.toWeb(nodeStream) as ReadableStream;
    return new Response(body, {
      headers: {
        "Content-Type": mimeFor(file.name),
        "Content-Length": String(file.size),
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          file.name,
        )}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    if (err instanceof PathError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
