import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Root directory that the browser is confined to. Mounted from the shared
 * Longhorn/NFS PVC in the cluster; overridable for local development.
 */
export const DATA_ROOT = path.resolve(process.env.DATA_ROOT ?? "/data");

/** Max file size (bytes) we are willing to serve inline for preview. */
export const PREVIEW_MAX_BYTES = 2 * 1024 * 1024; // 2 MiB

export class PathError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "PathError";
    this.status = status;
  }
}

export type EntryType = "dir" | "file";

export interface DirEntry {
  name: string;
  type: EntryType;
  size: number;
  mtime: number; // epoch ms
}

export interface ResolvedPath {
  /** Absolute, symlink-resolved path on disk, guaranteed inside DATA_ROOT. */
  abs: string;
  /** Normalized POSIX-style path relative to DATA_ROOT (no leading slash). */
  rel: string;
}

/**
 * Resolve a user-supplied relative path against DATA_ROOT and guarantee the
 * result cannot escape the root (path-traversal / symlink-escape guard).
 *
 * Security-critical: every filesystem access must go through this function.
 */
export async function safeResolve(relPath: string): Promise<ResolvedPath> {
  // Normalize: strip leading slashes, collapse separators, reject nothing yet —
  // the real check is the prefix test on the *resolved real* path below.
  const cleaned = (relPath ?? "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .trim();

  // Reject NUL bytes outright (can truncate paths in some syscalls).
  if (cleaned.includes("\0")) {
    throw new PathError("Invalid path");
  }

  const joined = path.resolve(DATA_ROOT, cleaned);

  // Resolve symlinks where possible so a symlink inside DATA_ROOT pointing
  // outside is caught. If the target doesn't exist, realpath throws ENOENT.
  let real: string;
  try {
    real = await fs.realpath(joined);
  } catch (err: unknown) {
    if (isErrnoException(err) && err.code === "ENOENT") {
      throw new PathError("Not found", 404);
    }
    throw new PathError("Invalid path");
  }

  const rootReal = await fs.realpath(DATA_ROOT);
  if (real !== rootReal && !real.startsWith(rootReal + path.sep)) {
    throw new PathError("Forbidden", 403);
  }

  const rel = path.relative(rootReal, real).split(path.sep).join("/");
  return { abs: real, rel };
}

/** List a directory's immediate children, dirs first then alphabetical. */
export async function listDir(relPath: string): Promise<{
  rel: string;
  entries: DirEntry[];
}> {
  const { abs, rel } = await safeResolve(relPath);
  const stat = await fs.stat(abs);
  if (!stat.isDirectory()) {
    throw new PathError("Not a directory", 400);
  }

  const dirents = await fs.readdir(abs, { withFileTypes: true });
  const entries: DirEntry[] = [];

  for (const d of dirents) {
    // Skip hidden dotfiles to keep the UI clean; cheap and avoids noise.
    if (d.name.startsWith(".")) continue;
    const childAbs = path.join(abs, d.name);
    try {
      const s = await fs.stat(childAbs); // follows symlinks for type/size
      const isDir = s.isDirectory();
      if (!isDir && !s.isFile()) continue; // skip sockets/devices/etc.
      entries.push({
        name: d.name,
        type: isDir ? "dir" : "file",
        size: isDir ? 0 : s.size,
        mtime: s.mtimeMs,
      });
    } catch {
      // Unreadable / broken symlink — skip rather than fail the whole listing.
      continue;
    }
  }

  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return { rel, entries };
}

/** Resolve a path that must be a regular file (for download/preview). */
export async function statFile(relPath: string): Promise<{
  abs: string;
  rel: string;
  size: number;
  name: string;
}> {
  const { abs, rel } = await safeResolve(relPath);
  const stat = await fs.stat(abs);
  if (!stat.isFile()) {
    throw new PathError("Not a file", 400);
  }
  return { abs, rel, size: stat.size, name: path.basename(abs) };
}

function isErrnoException(e: unknown): e is NodeJS.ErrnoException {
  return e instanceof Error && "code" in e;
}
