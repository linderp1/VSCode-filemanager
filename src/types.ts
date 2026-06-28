export type EntryType = "dir" | "file";
export type PreviewKind = "image" | "text" | "pdf" | "none";

export interface UiEntry {
  name: string;
  type: EntryType;
  size: number;
  mtime: number;
  preview: PreviewKind;
}

export interface ListResponse {
  path: string;
  entries: UiEntry[];
}
