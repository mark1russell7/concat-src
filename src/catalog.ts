// The rules of concat-src, with no file system. The CLI and the site both use this module.
//
// The input is a list of files, each a path with "/" separators and a text. The output is the reason of each
// file, the kept files and the Markdown catalog. The CLI gives the same Markdown as before this module.

/** A file of the input: a path with "/" separators, relative to the root, and its text. */
export interface SourceFile {
  readonly path: string;
  /** The text of the file, or a function that reads it. The catalog reads only the kept files. */
  readonly text: string | (() => string);
}

/** The lists of the rules. Null or a missing list means that the user gave no option. */
export interface Rules {
  readonly include?: readonly string[] | null;
  readonly exclude?: readonly string[] | null;
}

/** The code of a reason: a file is kept, or one rule puts it out. */
export type ReasonCode = "kept" | "hidden" | "ignored" | "extension" | "excluded";

/** The reason of a file: the code, and the name, the extension or the pattern that the rule found. */
export interface Reason {
  readonly code: ReasonCode;
  readonly detail: string;
}

/** The result of the rules for one path. */
export interface Classified {
  readonly kept: boolean;
  /** The directory tree of the catalog shows the file. */
  readonly inTree: boolean;
  readonly reason: Reason;
}

/** The result of the catalog for one file. */
export interface FileResult extends Classified {
  readonly path: string;
  /** The user turned the file in or out. */
  readonly forced: "in" | "out" | undefined;
  /** The reason of the rules, before the user turned the file in or out. */
  readonly rule: Reason;
}

export interface CatalogOptions extends Rules {
  /** More folders of the tree, for folders with no files. */
  readonly dirs?: readonly string[];
  /** The files that the user turned in or out, whatever the rules say. */
  readonly force?: Readonly<Record<string, "in" | "out">>;
  /** The time in the line "Generated on". The default is now. */
  readonly generatedAt?: string;
  /** The path separator of the sort. The default is "/". */
  readonly sep?: string;
}

export interface Catalog {
  /** Each file of the input, sorted by path, with its reason. */
  readonly files: readonly FileResult[];
  /** The kept files, in the sequence of the catalog. */
  readonly kept: readonly { readonly path: string; readonly text: string }[];
  /** The Markdown catalog. */
  readonly markdown: string;
  /** The rules in their full form. */
  readonly rules: { readonly include: readonly string[]; readonly exclude: readonly string[] | null };
}

/** The rules in their full form: the extensions, with no duplicates, and the exclude list or null. */
export interface NormalizedRules {
  include: string[];
  exclude: readonly string[] | null;
}

/** The result of the catalog for one file, with the file itself. */
interface Ruled extends FileResult {
  readonly file: SourceFile;
}

/** An entry of the directory tree: a folder or a file. */
interface TreeEntry {
  readonly path: string;
  readonly name: string;
  readonly folder: boolean;
}

/** The extensions that the catalog keeps when the caller gives no list. */
export const DEFAULT_INCLUDE: readonly string[] = Object.freeze([".ts", ".tsx"]);

/** The folders that the walk does not enter, at each depth. */
export const IGNORED_FOLDERS: readonly string[] = Object.freeze(["node_modules", "dist", "build"]);

const IGNORED: ReadonlySet<string> = new Set(IGNORED_FOLDERS);

/** The language of the code fence for each extension. Another extension uses its own name, with no dot. */
const LANGUAGES: Readonly<Record<string, string>> = {
  ".ts": "ts",
  ".tsx": "tsx",
  ".js": "js",
  ".jsx": "jsx",
  ".mjs": "js",
  ".cjs": "js",
  ".json": "json",
  ".md": "markdown",
};

/** This function splits a list such as ".ts, .tsx" at each comma, as the CLI options do. */
export function parseList(text: string): string[] {
  return text.split(",").map((e) => e.trim());
}

/**
 * This function gives the extension of a file name, as the function extname of node:path does. A dot at the start of
 * the name does not start an extension, so ".env" has no extension.
 */
export function extname(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || name === "..") return "";
  return name.slice(dot);
}

/** This function gives the language of the code fence of a file. */
export function languageOf(path: string): string {
  const ext = extname(path.slice(path.lastIndexOf("/") + 1));
  return LANGUAGES[ext] || ext.slice(1);
}

/** This function gives a fence of backticks that is longer than each run of backticks in the text. */
export function fenceFor(text: string): string {
  const matches = text.match(/`+/g);
  const maxRun = matches ? Math.max(...matches.map((s) => s.length)) : 0;
  return "`".repeat(Math.max(3, maxRun + 1));
}

/** This function gives the rules in their full form: the default extensions, and null for no exclude list. */
export function normalizeRules(rules: Rules = {}): NormalizedRules {
  return {
    include: [...new Set(rules.include ?? DEFAULT_INCLUDE)],
    exclude: rules.exclude ?? null,
  };
}

/**
 * This function applies the rules to one path, in the sequence of the walk of the CLI:
 * 1. a hidden entry (a name that starts with a dot) is out,
 * 2. a file in node_modules, dist or build is out,
 * 3. a file with an extension that is not in the include list is out,
 * 4. a file name that ends with a pattern of the exclude list is out,
 * 5. each other file is kept.
 * The result also tells if the directory tree of the catalog shows the file. The tree does not apply the first rule.
 */
export function classify(path: string, rules: Rules = {}): Classified {
  const { include, exclude } = normalizeRules(rules);
  const parts = path.split("/");
  const name = parts[parts.length - 1] ?? "";
  const folders = parts.slice(0, -1);
  const ext = extname(name);
  const extOk = include.includes(ext);
  const pattern = exclude ? exclude.find((p) => name.endsWith(p)) : undefined;
  const inTree = !folders.some((f) => IGNORED.has(f)) && extOk && pattern === undefined;

  for (const [i, part] of parts.entries()) {
    const folder = i < parts.length - 1;
    if (part.startsWith(".")) return { kept: false, inTree, reason: { code: "hidden", detail: folder ? `${part}/` : part } };
    if (folder && IGNORED.has(part)) return { kept: false, inTree, reason: { code: "ignored", detail: `${part}/` } };
  }
  if (!extOk) return { kept: false, inTree, reason: { code: "extension", detail: ext } };
  if (pattern !== undefined) return { kept: false, inTree, reason: { code: "excluded", detail: pattern } };
  return { kept: true, inTree, reason: { code: "kept", detail: ext } };
}

/** This function gives the folders of a path, from the root: "a/b/c.ts" gives "a" and "a/b". */
function foldersOf(path: string): string[] {
  const parts = path.split("/");
  const out: string[] = [];
  for (let i = 1; i < parts.length; i++) out.push(parts.slice(0, i).join("/"));
  return out;
}

/** This function writes the directory tree of the catalog, with the connectors of the CLI. */
function renderTree(folders: Iterable<string>, treeFiles: readonly string[]): string {
  const children = new Map<string, TreeEntry[]>();
  const add = (parent: string, entry: TreeEntry): void => {
    const list = children.get(parent);
    if (list) list.push(entry);
    else children.set(parent, [entry]);
  };
  const parentOf = (p: string): string => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "");
  const nameOf = (p: string): string => p.slice(p.lastIndexOf("/") + 1);
  for (const folder of folders) add(parentOf(folder), { path: folder, name: nameOf(folder), folder: true });
  for (const file of treeFiles) add(parentOf(file), { path: file, name: nameOf(file), folder: false });

  const render = (dir: string, prefix: string): string => {
    const entries = (children.get(dir) ?? []).sort((a, b) => {
      if (a.folder !== b.folder) return a.folder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    const lines: string[] = [];
    entries.forEach((e, i) => {
      const last = i === entries.length - 1;
      lines.push(prefix + (last ? "└── " : "├── ") + e.name + (e.folder ? "/" : ""));
      if (e.folder) lines.push(render(e.path, prefix + (last ? "    " : "│   ")));
    });
    return lines.join("\n");
  };
  return render("", "");
}

/**
 * This function makes the catalog of a list of files.
 *
 * Each file has a path with "/" separators, relative to the root, and a text. The text can be a function, so the CLI
 * reads only the kept files. The option dirs adds folders that have no files. The option force turns a file in or out,
 * whatever the rules say. The option sep is the path separator of the sort: the CLI sorts the paths of its platform.
 */
export function buildCatalog(files: readonly SourceFile[], options: CatalogOptions = {}): Catalog {
  const rules = normalizeRules(options);
  const force = options.force ?? {};
  const sep = options.sep ?? "/";
  const generatedAt = options.generatedAt ?? new Date().toISOString();

  const results = files.map((file): Ruled => {
    const ruled = classify(file.path, rules);
    const forced = force[file.path];
    if (forced === "in") return { ...ruled, path: file.path, file, kept: true, inTree: true, forced, rule: ruled.reason };
    if (forced === "out") return { ...ruled, path: file.path, file, kept: false, inTree: false, forced, rule: ruled.reason };
    return { ...ruled, path: file.path, file, forced: undefined, rule: ruled.reason };
  });

  const key = (p: string): string => p.split("/").join(sep);
  const byPath = (a: Ruled, b: Ruled): number => key(a.path).localeCompare(key(b.path));
  const kept = results.filter((r) => r.kept).sort(byPath);

  // The tree shows each folder that the walk enters, and the files that pass the rules of the tree.
  const folders = new Set<string>();
  const addFolders = (path: string, all: boolean): void => {
    for (const folder of foldersOf(path)) {
      if (!all && IGNORED.has(folder.slice(folder.lastIndexOf("/") + 1))) return;
      folders.add(folder);
    }
  };
  for (const dir of options.dirs ?? []) addFolders(`${dir}/x`, false);
  for (const r of results) addFolders(r.path, r.forced === "in");
  const tree = renderTree(folders, results.filter((r) => r.inTree).map((r) => r.path));

  let out = "";
  out += "# Source Catalog\n\n";
  out += `Generated on ${generatedAt}\n\n`;
  out += `**Included extensions:** ${rules.include.join(", ")}\n\n`;
  if (rules.exclude) out += `**Excluded patterns:** ${rules.exclude.join(", ")}\n\n`;
  out += "## Directory structure\n\n";
  out += "```\n" + tree + "\n```\n\n";
  out += "## Files\n\n";

  const keptFiles = kept.map((r) => {
    const text = typeof r.file.text === "function" ? r.file.text() : r.file.text;
    const fence = fenceFor(text);
    out += `### ${r.path}\n\n`;
    out += `${fence} ${languageOf(r.path)}\n${text}\n${fence}\n\n`;
    return { path: r.path, text };
  });

  return {
    files: [...results].sort(byPath).map(({ path, kept: k, inTree, reason, forced, rule }) => ({ path, kept: k, inTree, reason, forced, rule })),
    kept: keptFiles,
    markdown: out,
    rules,
  };
}
