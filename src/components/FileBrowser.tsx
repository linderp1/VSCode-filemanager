"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpDown,
  Download,
  File as FileIcon,
  FileText,
  Folder,
  Image as ImageIcon,
  Loader2,
  Search,
} from "lucide-react";
import type { ListResponse, UiEntry } from "@/types";
import { formatBytes, formatDate, joinPath } from "@/lib/format";
import { Sidebar } from "@/components/Sidebar";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PreviewPanel } from "@/components/PreviewPanel";

type SortKey = "name" | "size" | "mtime";
type SortDir = "asc" | "desc";

function readPathFromUrl(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("path") ?? "";
}

export function FileBrowser() {
  const [path, setPath] = useState("");
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [volumes, setVolumes] = useState<UiEntry[]>([]);
  const [volumesLoading, setVolumesLoading] = useState(true);

  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<UiEntry | null>(null);

  // Initialize from URL + respond to browser back/forward.
  useEffect(() => {
    setPath(readPathFromUrl());
    const onPop = () => setPath(readPathFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((next: string) => {
    const url = next
      ? `?path=${encodeURIComponent(next)}`
      : window.location.pathname;
    window.history.pushState({}, "", url);
    setPath(next);
    setSelected(null);
    setFilter("");
  }, []);

  // Load the current directory listing.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/files?path=${encodeURIComponent(path)}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error ?? `Error ${r.status}`);
        }
        return (await r.json()) as ListResponse;
      })
      .then((d) => {
        if (cancelled) return;
        setData(d);
        // Top level doubles as the volume list for the sidebar.
        if (d.path === "") {
          setVolumes(d.entries.filter((e) => e.type === "dir"));
          setVolumesLoading(false);
        }
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [path]);

  // Ensure the sidebar volume list is populated even when we deep-link past root.
  useEffect(() => {
    if (volumes.length > 0 || !volumesLoading) return;
    fetch(`/api/files?path=`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ListResponse | null) => {
        if (d) setVolumes(d.entries.filter((e) => e.type === "dir"));
      })
      .finally(() => setVolumesLoading(false));
  }, [volumes.length, volumesLoading]);

  const activeRoot = path.split("/")[0] ?? "";

  const entries = useMemo(() => {
    const list = data?.entries ?? [];
    const f = filter.trim().toLowerCase();
    const filtered = f
      ? list.filter((e) => e.name.toLowerCase().includes(f))
      : list;
    const sorted = [...filtered].sort((a, b) => {
      // Folders always group above files regardless of sort column.
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "size") cmp = a.size - b.size;
      else cmp = a.mtime - b.mtime;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [data, filter, sortKey, sortDir]);

  const onRowClick = (e: UiEntry) => {
    if (e.type === "dir") {
      navigate(joinPath(path, e.name));
    } else {
      setSelected(e);
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="flex h-full">
      <Sidebar
        volumes={volumes}
        loading={volumesLoading}
        activeRoot={activeRoot}
        onSelect={(name) => navigate(name)}
      />

      <main className="flex flex-1 min-w-0 flex-col">
        {/* Top bar: breadcrumbs + filter */}
        <div className="flex items-center gap-4 h-14 px-5 border-b border-surface-border">
          <div className="min-w-0 flex-1">
            <Breadcrumbs path={path} onNavigate={navigate} />
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter…"
              className="w-48 rounded-md border border-surface-border bg-surface pl-8 pr-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        {/* Listing */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <CenterState>
              <Loader2 className="h-5 w-5 animate-spin" /> Loading…
            </CenterState>
          ) : error ? (
            <CenterState>
              <AlertCircle className="h-5 w-5 text-red-400" />
              <span className="text-red-400">{error}</span>
            </CenterState>
          ) : entries.length === 0 ? (
            <CenterState>
              {filter ? "No matching files" : "This folder is empty"}
            </CenterState>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-raised text-left text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-surface-border">
                  <Th onClick={() => toggleSort("name")}>Name</Th>
                  <Th
                    onClick={() => toggleSort("size")}
                    className="w-28 text-right"
                  >
                    Size
                  </Th>
                  <Th
                    onClick={() => toggleSort("mtime")}
                    className="w-48"
                  >
                    Modified
                  </Th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const full = joinPath(path, e.name);
                  const isSelected = selected?.name === e.name;
                  return (
                    <tr
                      key={e.name}
                      onClick={() => onRowClick(e)}
                      className={`cursor-pointer border-b border-surface-border/50 transition-colors ${
                        isSelected
                          ? "bg-accent/10"
                          : "hover:bg-surface-hover"
                      }`}
                    >
                      <td className="px-5 py-2.5">
                        <span className="flex items-center gap-2.5">
                          <EntryIcon entry={e} />
                          <span className="truncate text-slate-200">
                            {e.name}
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-right text-slate-400">
                        {e.type === "dir" ? "—" : formatBytes(e.size)}
                      </td>
                      <td className="px-5 py-2.5 text-slate-400">
                        {formatDate(e.mtime)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {e.type === "file" && (
                          <a
                            href={`/api/download?path=${encodeURIComponent(
                              full,
                            )}`}
                            onClick={(ev) => ev.stopPropagation()}
                            className="inline-flex rounded p-1.5 text-slate-500 hover:bg-surface hover:text-accent"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {selected && (
        <PreviewPanel
          entry={selected}
          path={joinPath(path, selected.name)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function CenterState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
      {children}
    </div>
  );
}

function Th({
  children,
  onClick,
  className = "",
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <th className={`px-5 py-2.5 font-medium ${className}`}>
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1 hover:text-slate-300"
      >
        {children}
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      </button>
    </th>
  );
}

function EntryIcon({ entry }: { entry: UiEntry }) {
  if (entry.type === "dir")
    return <Folder className="h-4 w-4 shrink-0 text-accent" />;
  if (entry.preview === "image")
    return <ImageIcon className="h-4 w-4 shrink-0 text-emerald-400" />;
  if (entry.preview === "text")
    return <FileText className="h-4 w-4 shrink-0 text-sky-400" />;
  return <FileIcon className="h-4 w-4 shrink-0 text-slate-500" />;
}
