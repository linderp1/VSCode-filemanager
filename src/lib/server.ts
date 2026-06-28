import type { DirEntry } from "@/lib/fs";
import { previewKind, type PreviewKind } from "@/lib/mime";

export * from "@/lib/fs";

export interface UiEntry extends DirEntry {
  preview: PreviewKind;
}

/** Annotate listing entries with how (if at all) they can be previewed. */
export function previewKindForEntries(entries: DirEntry[]): UiEntry[] {
  return entries.map((e) => ({
    ...e,
    preview: e.type === "dir" ? "none" : previewKind(e.name),
  }));
}
