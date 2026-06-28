"use client";

import { Database, FolderOpen, Loader2 } from "lucide-react";
import type { UiEntry } from "@/types";

/**
 * Lists the top-level directories under the mounted PVC as selectable
 * "volumes" — the entry point for navigation.
 */
export function Sidebar({
  volumes,
  loading,
  activeRoot,
  onSelect,
}: {
  volumes: UiEntry[];
  loading: boolean;
  activeRoot: string;
  onSelect: (name: string) => void;
}) {
  return (
    <aside className="w-64 shrink-0 border-r border-surface-border bg-surface-raised flex flex-col">
      <div className="flex items-center gap-2 px-4 h-14 border-b border-surface-border">
        <Database className="h-5 w-5 text-accent" />
        <h1 className="font-semibold text-slate-100">File Browser</h1>
      </div>

      <div className="px-3 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
        Volumes
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
        {loading ? (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : volumes.length === 0 ? (
          <div className="px-3 py-2 text-sm text-slate-500">
            No volumes found
          </div>
        ) : (
          volumes.map((v) => {
            const active = activeRoot === v.name;
            return (
              <button
                key={v.name}
                onClick={() => onSelect(v.name)}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-accent/15 text-accent"
                    : "text-slate-300 hover:bg-surface-hover hover:text-slate-100"
                }`}
              >
                <FolderOpen className="h-4 w-4 shrink-0" />
                <span className="truncate">{v.name}</span>
              </button>
            );
          })
        )}
      </nav>

      <div className="border-t border-surface-border px-4 py-3 text-[11px] text-slate-600">
        Longhorn · k3s
      </div>
    </aside>
  );
}
