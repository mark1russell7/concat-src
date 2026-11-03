#!/usr/bin/env node
// Concatenate all source files into a single Markdown file.
// Usage:
//   node concat-src.ts [output.md] [--include=.ts,.tsx] [--exclude=.spec.ts,.test.ts]
// Default output: src-catalog.md
// Default include: .ts,.tsx
// Examples:
//   node concat-src.ts output.md --include=.ts,.tsx,.js
//   node concat-src.ts output.md --exclude=.spec.ts,.test.ts
//   node concat-src.ts output.md --include=.ts --exclude=.test.ts
//
// The rules and the Markdown are in src/catalog.ts. The site of the project uses the same module.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { buildCatalog, IGNORED_FOLDERS, parseList, type SourceFile } from "./src/catalog.ts";

const root = process.cwd();
const SRC_DIR = root;
const IGNORE_DIRS = new Set(IGNORED_FOLDERS);

// Parse command-line arguments
function parseArgs(): { output: string; include: string[] | null; exclude: string[] | null } {
  const args = process.argv.slice(2);
  let output = "src-catalog.md";
  let include: string[] | null = null;
  let exclude: string[] | null = null;

  for (const arg of args) {
    if (arg.startsWith("--include=")) {
      include = parseList(arg.slice("--include=".length));
    } else if (arg.startsWith("--exclude=")) {
      exclude = parseList(arg.slice("--exclude=".length));
    } else if (!arg.startsWith("--")) {
      output = arg;
    }
  }

  return { output, include, exclude };
}

// Collect each file and each folder below dir, as paths with "/" separators. The walk does not enter the ignored
// folders. It enters the hidden folders, because the directory tree of the catalog shows them.
function scan(dir: string, rel: string, files: SourceFile[], dirs: string[]): void {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    const relPath = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue;
      dirs.push(relPath);
      scan(full, relPath, files, dirs);
    } else {
      files.push({ path: relPath, text: () => fs.readFileSync(full, "utf8") });
    }
  }
}

function main(): void {
  const { output: OUTPUT, include, exclude } = parseArgs();
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`⚠️  No ./src directory found at: ${SRC_DIR}`);
    process.exit(1);
  }

  const files: SourceFile[] = [];
  const dirs: string[] = [];
  scan(SRC_DIR, "", files, dirs);
  const catalog = buildCatalog(files, { include, exclude, dirs, sep: path.sep, generatedAt: new Date().toISOString() });

  fs.writeFileSync(path.join(root, OUTPUT), catalog.markdown, "utf8");
  console.log(`✅ Wrote ${OUTPUT} with ${catalog.kept.length} files.`);
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
