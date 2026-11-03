// The rules of concat-src, with no file system. The CLI and the site both use this module.
//
// The input is a list of files, each a path with "/" separators and a text. The output is the reason of each
// file, the kept files and the Markdown catalog. The CLI gives the same Markdown as before this module.

/** The extensions that the catalog keeps when the caller gives no list. */
export const DEFAULT_INCLUDE = Object.freeze([".ts", ".tsx"]);

/** The folders that the walk does not enter, at each depth. */
export const IGNORED_FOLDERS = Object.freeze(["node_modules", "dist", "build"]);

const IGNORED = new Set(IGNORED_FOLDERS);

/** The language of the code fence for each extension. Another extension uses its own name, with no dot. */
const LANGUAGES = {
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
export function parseList(text) {
  return text.split(",").map((e) => e.trim());
}

/**
 * This function gives the extension of a file name, as the function extname of node:path does. A dot at the start of
 * the name does not start an extension, so ".env" has no extension.
 */
export function extname(name) {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || name === "..") return "";
  return name.slice(dot);
}

/** This function gives the language of the code fence of a file. */
export function languageOf(path) {
  const ext = extname(path.slice(path.lastIndexOf("/") + 1));
  return LANGUAGES[ext] || ext.slice(1);
}

/** This function gives a fence of backticks that is longer than each run of backticks in the text. */
export function fenceFor(text) {
  const matches = text.match(/`+/g);
  const maxRun = matches ? Math.max(...matches.map((s) => s.length)) : 0;
  return "`".repeat(Math.max(3, maxRun + 1));
}

/** This function gives the rules in their full form: the default extensions, and null for no exclude list. */
export function normalizeRules(rules = {}) {
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
export function classify(path, rules = {}) {
  const { include, exclude } = normalizeRules(rules);
  const parts = path.split("/");
  const name = parts[parts.length - 1];
  const folders = parts.slice(0, -1);
  const ext = extname(name);
  const extOk = include.includes(ext);
  const pattern = exclude ? exclude.find((p) => name.endsWith(p)) : undefined;
  const inTree = !folders.some((f) => IGNORED.has(f)) && extOk && pattern === undefined;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const folder = i < parts.length - 1;
    if (part.startsWith(".")) return { kept: false, inTree, reason: { code: "hidden", detail: folder ? `${part}/` : part } };
    if (folder && IGNORED.has(part)) return { kept: false, inTree, reason: { code: "ignored", detail: `${part}/` } };
  }
  if (!extOk) return { kept: false, inTree, reason: { code: "extension", detail: ext } };
  if (pattern !== undefined) return { kept: false, inTree, reason: { code: "excluded", detail: pattern } };
  return { kept: true, inTree, reason: { code: "kept", detail: ext } };
}

/** This function gives the folders of a path, from the root: "a/b/c.ts" gives "a" and "a/b". */
function foldersOf(path) {
  const parts = path.split("/");
  const out = [];
  for (let i = 1; i < parts.length; i++) out.push(parts.slice(0, i).join("/"));
  return out;
}

/** This function writes the directory tree of the catalog, with the connectors of the CLI. */
function renderTree(folders, treeFiles) {
  const children = new Map();
  const add = (parent, entry) => {
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(entry);
  };
  const parentOf = (p) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "");
  const nameOf = (p) => p.slice(p.lastIndexOf("/") + 1);
  for (const folder of folders) add(parentOf(folder), { path: folder, name: nameOf(folder), folder: true });
  for (const file of treeFiles) add(parentOf(file), { path: file, name: nameOf(file), folder: false });

  const render = (dir, prefix) => {
    const entries = (children.get(dir) ?? []).sort((a, b) => {
      if (a.folder !== b.folder) return a.folder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    const lines = [];
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
export function buildCatalog(files, options = {}) {
  const rules = normalizeRules(options);
  const force = options.force ?? {};
  const sep = options.sep ?? "/";
  const generatedAt = options.generatedAt ?? new Date().toISOString();

  const results = files.map((file) => {
    const ruled = classify(file.path, rules);
    const forced = force[file.path];
    if (forced === "in") return { ...ruled, path: file.path, file, kept: true, inTree: true, forced, rule: ruled.reason };
    if (forced === "out") return { ...ruled, path: file.path, file, kept: false, inTree: false, forced, rule: ruled.reason };
    return { ...ruled, path: file.path, file, forced: undefined, rule: ruled.reason };
  });

  const key = (p) => p.split("/").join(sep);
  const byPath = (a, b) => key(a.path).localeCompare(key(b.path));
  const kept = results.filter((r) => r.kept).sort(byPath);

  // The tree shows each folder that the walk enters, and the files that pass the rules of the tree.
  const folders = new Set();
  const addFolders = (path, all) => {
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
