"use client";

import { ChevronRight, HardDrive } from "lucide-react";
import { breadcrumbs } from "@/lib/format";

export function Breadcrumbs({
  path,
  onNavigate,
}: {
  path: string;
  onNavigate: (path: string) => void;
}) {
  const crumbs = breadcrumbs(path);

  return (
    <nav className="flex items-center gap-1 text-sm text-slate-400 overflow-x-auto">
      <button
        onClick={() => onNavigate("")}
        className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-surface-hover hover:text-slate-100 transition-colors"
      >
        <HardDrive className="h-4 w-4" />
        <span>All volumes</span>
      </button>
      {crumbs.map((c) => (
        <span key={c.path} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
          <button
            onClick={() => onNavigate(c.path)}
            className="rounded px-2 py-1 hover:bg-surface-hover hover:text-slate-100 transition-colors whitespace-nowrap"
          >
            {c.name}
          </button>
        </span>
      ))}
    </nav>
  );
}
