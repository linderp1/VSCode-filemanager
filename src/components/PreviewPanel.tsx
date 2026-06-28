"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import type { UiEntry } from "@/types";
import { formatBytes, formatDate } from "@/lib/format";

export function PreviewPanel({
  entry,
  path,
  onClose,
}: {
  entry: UiEntry;
  path: string; // full rel path of the file
  onClose: () => void;
}) {
  const previewUrl = `/api/preview?path=${encodeURIComponent(path)}`;
  const downloadUrl = `/api/download?path=${encodeURIComponent(path)}`;

  return (
    <aside className="w-96 shrink-0 border-l border-surface-border bg-surface-raised flex flex-col">
      <div className="flex items-center justify-between gap-2 h-14 px-4 border-b border-surface-border">
        <span className="truncate font-medium text-slate-100" title={entry.name}>
          {entry.name}
        </span>
        <button
          onClick={onClose}
          className="rounded p-1.5 text-slate-400 hover:bg-surface-hover hover:text-slate-100"
          aria-label="Close preview"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <PreviewBody entry={entry} previewUrl={previewUrl} />
      </div>

      <div className="border-t border-surface-border p-4 space-y-3">
        <dl className="grid grid-cols-3 gap-1 text-xs">
          <dt className="text-slate-500">Size</dt>
          <dd className="col-span-2 text-slate-300">{formatBytes(entry.size)}</dd>
          <dt className="text-slate-500">Modified</dt>
          <dd className="col-span-2 text-slate-300">{formatDate(entry.mtime)}</dd>
        </dl>
        <a
          href={downloadUrl}
          className="flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          <Download className="h-4 w-4" />
          Download
        </a>
      </div>
    </aside>
  );
}

function PreviewBody({
  entry,
  previewUrl,
}: {
  entry: UiEntry;
  previewUrl: string;
}) {
  if (entry.preview === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={previewUrl}
        alt={entry.name}
        className="mx-auto max-w-full rounded-md border border-surface-border"
      />
    );
  }
  if (entry.preview === "pdf") {
    return (
      <iframe
        src={previewUrl}
        title={entry.name}
        className="h-full min-h-[60vh] w-full rounded-md border border-surface-border bg-white"
      />
    );
  }
  if (entry.preview === "text") {
    return <TextPreview url={previewUrl} />;
  }
  return (
    <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
      No preview available for this file type.
      <br />
      Use Download to retrieve it.
    </div>
  );
}

function TextPreview({ url }: { url: string }) {
  const [state, setState] = useState<{
    loading: boolean;
    text?: string;
    error?: string;
  }>({ loading: true });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true });
    fetch(url)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error ?? `Error ${r.status}`);
        }
        return r.text();
      })
      .then((text) => !cancelled && setState({ loading: false, text }))
      .catch((e) => !cancelled && setState({ loading: false, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (state.loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading preview…
      </div>
    );
  }
  if (state.error) {
    return <div className="text-sm text-red-400">{state.error}</div>;
  }
  return (
    <pre className="whitespace-pre-wrap break-words rounded-md bg-surface p-3 font-mono text-xs text-slate-300">
      {state.text}
    </pre>
  );
}
