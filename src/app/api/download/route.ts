import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { statFile, PathError } from "@/lib/fs";
import { mimeFor } from "@/lib/mime";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rel = searchParams.get("path") ?? "";
  try {
    const file = await statFile(rel);
    const nodeStream = createReadStream(file.abs);
    // Bridge Node stream → Web ReadableStream for the Response body.
    const body = Readable.toWeb(nodeStream) as ReadableStream;

    return new Response(body, {
      headers: {
        "Content-Type": mimeFor(file.name),
        "Content-Length": String(file.size),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
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
