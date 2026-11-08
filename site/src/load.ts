/**
 * The load of a folder of the visitor: from the folder picker or from a drop. The files stay in the browser. The page
 * reads only text files, and it stops at a cap on the total size.
 */
import { classify, type Rules, type SourceFile } from "concat-src/catalog";

/** The cap on the total size of the text that the page reads: 5 MiB. */
export const CAP_BYTES = 5 * 1024 * 1024;

/** A file that the browser gave, before the page reads it. */
export interface Candidate {
  /** The path relative to the chosen folder, with "/" separators. */
  readonly path: string;
  readonly size: number;
  readonly read: () => Promise<ArrayBuffer>;
}

/** A folder or a hidden file that the walk skips. The page does not read its files. */
export interface SkippedGroup {
  /** The path of the folder (with a "/" at the end) or of the hidden file. */
  readonly path: string;
  readonly code: "hidden" | "ignored";
  readonly count: number;
}

/** The plan of a load: the files to read, in sequence, and the files that the page does not read. */
export interface Plan {
  readonly toRead: readonly Candidate[];
  readonly skipped: readonly SkippedGroup[];
}

/** The result of a load. */
export interface Loaded {
  readonly name: string;
  readonly files: readonly SourceFile[];
  readonly skipped: readonly SkippedGroup[];
  readonly binary: number;
  /** The files that the page did not read because of the cap. */
  readonly overCap: readonly string[];
  readonly bytes: number;
}

/**
 * This function makes the plan of a load. The files in hidden folders and in ignored folders go into groups, because
 * the walk does not read them. The page reads the files that the rules keep first, then the other files.
 */
export function planRead(candidates: readonly Candidate[], rules: Rules): Plan {
  const groups = new Map<string, { code: "hidden" | "ignored"; count: number }>();
  const first: Candidate[] = [];
  const later: Candidate[] = [];
  for (const c of candidates) {
    const { kept, reason } = classify(c.path, rules);
    if (reason.code === "hidden" || reason.code === "ignored") {
      const parts = c.path.split("/");
      const at = parts.findIndex((p, i) => p.startsWith(".") || (i < parts.length - 1 && `${p}/` === reason.detail));
      const key = parts.slice(0, at + 1).join("/") + (at < parts.length - 1 ? "/" : "");
      const group = groups.get(key) ?? { code: reason.code, count: 0 };
      group.count++;
      groups.set(key, group);
    } else {
      (kept ? first : later).push(c);
    }
  }
  const byPath = (a: Candidate, b: Candidate) => a.path.localeCompare(b.path);
  return {
    toRead: [...first.sort(byPath), ...later.sort(byPath)],
    skipped: [...groups].map(([path, g]) => ({ path, ...g })).sort((a, b) => a.path.localeCompare(b.path)),
  };
}

/** This function tells if the bytes are text: a file with a zero byte in its first 8000 bytes is binary. */
export function isText(bytes: Uint8Array): boolean {
  const end = Math.min(bytes.length, 8000);
  for (let i = 0; i < end; i++) if (bytes[i] === 0) return false;
  return true;
}

/** This function removes the first folder of each path, when all paths start with the same folder. */
export function stripRoot(paths: readonly string[]): { root: string; paths: string[] } {
  const first = paths[0]?.split("/")[0] ?? "";
  const shared = paths.length > 0 && paths.every((p) => p.startsWith(`${first}/`));
  return shared ? { root: first, paths: paths.map((p) => p.slice(first.length + 1)) } : { root: "", paths: [...paths] };
}

/** This function reads the files of a plan, until the total size is at the cap. */
export async function readPlan(name: string, plan: Plan, onProgress: (done: number, total: number) => void, cap = CAP_BYTES): Promise<Loaded> {
  const decoder = new TextDecoder("utf-8");
  const files: SourceFile[] = [];
  const overCap: string[] = [];
  let bytes = 0;
  let binary = 0;
  let done = 0;
  for (const c of plan.toRead) {
    if (bytes + c.size > cap) {
      overCap.push(c.path);
    } else {
      const data = new Uint8Array(await c.read());
      if (isText(data)) {
        files.push({ path: c.path, text: decoder.decode(data) });
        bytes += data.length;
      } else {
        binary++;
      }
    }
    done++;
    if (done % 25 === 0) onProgress(done, plan.toRead.length);
  }
  return { name, files, skipped: plan.skipped, binary, overCap, bytes };
}

/** This function gives the candidates of the folder picker (an input with webkitdirectory). */
export function fromInput(list: FileList): { name: string; candidates: Candidate[] } {
  const all = [...list];
  const { root, paths } = stripRoot(all.map((f) => f.webkitRelativePath || f.name));
  return { name: root || "your files", candidates: all.map((f, i) => ({ path: paths[i]!, size: f.size, read: () => f.arrayBuffer() })) };
}

/** This function gives all the entries of a folder of a drop. The browser gives them in batches. */
async function entriesOf(dir: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  const reader = dir.createReader();
  const out: FileSystemEntry[] = [];
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
    if (batch.length === 0) return out;
    out.push(...batch);
  }
}

/** This function gives the candidates of a drop. It enters the dropped folders. */
export async function fromDrop(items: DataTransferItemList): Promise<{ name: string; candidates: Candidate[] }> {
  const found: { path: string; file: File }[] = [];
  const visit = async (entry: FileSystemEntry, prefix: string): Promise<void> => {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
      found.push({ path, file });
    } else if (entry.isDirectory) {
      for (const child of await entriesOf(entry as FileSystemDirectoryEntry)) await visit(child, path);
    }
  };
  const roots = [...items].map((item) => item.webkitGetAsEntry()).filter((e): e is FileSystemEntry => e !== null);
  for (const entry of roots) await visit(entry, "");
  const single = roots.length === 1 && roots[0]!.isDirectory;
  const name = single ? roots[0]!.name : "your files";
  return {
    name,
    candidates: found.map(({ path, file }) => ({
      path: single ? path.slice(name.length + 1) : path,
      size: file.size,
      read: () => file.arrayBuffer(),
    })),
  };
}
