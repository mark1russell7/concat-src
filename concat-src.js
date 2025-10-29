#!/usr/bin/env node
// Concatenate all source files into a single Markdown file.
// Usage:
//   node concat-src.js [output.md] [--include=.ts,.tsx] [--exclude=.spec.ts,.test.ts]
// Default output: src-catalog.md
// Default include: .ts,.tsx
// Examples:
//   node concat-src.js output.md --include=.ts,.tsx,.js
//   node concat-src.js output.md --exclude=.spec.ts,.test.ts
//   node concat-src.js output.md --include=.ts --exclude=.test.ts

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const fsp = fs.promises;

const root = process.cwd();
const SRC_DIR = root;

// Parse command-line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let output = "src-catalog.md";
  let include = null;
  let exclude = null;

  for (const arg of args) {
    if (arg.startsWith("--include=")) {
      include = arg.slice("--include=".length).split(",").map(e => e.trim());
    } else if (arg.startsWith("--exclude=")) {
      exclude = arg.slice("--exclude=".length).split(",").map(e => e.trim());
    } else if (!arg.startsWith("--")) {
      output = arg;
    }
  }

  return { output, include, exclude };
}

const { output: OUTPUT, include: INCLUDE_EXTS, exclude: EXCLUDE_PATTERNS } = parseArgs();
const EXTS = new Set(INCLUDE_EXTS || [".ts", ".tsx"]);
const IGNORE_DIRS = new Set(["node_modules", "dist", "build"]);

// Check if file should be excluded based on patterns
function shouldExclude(filename) {
  if (!EXCLUDE_PATTERNS) return false;
  return EXCLUDE_PATTERNS.some(pattern => filename.endsWith(pattern));
}

// Recursively collect files with specified extensions
async function walk(dir, acc = []) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith(".")) continue; // skip hidden
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue;
      await walk(full, acc);
    } else if (EXTS.has(path.extname(e.name)) && !shouldExclude(e.name)) {
      acc.push(full);
    }
  }
  return acc;
}

// Build a simple ASCII tree showing only dirs and included files
function buildTree(dir, prefix = "") {
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => {
      if (e.isDirectory()) return !IGNORE_DIRS.has(e.name);
      return EXTS.has(path.extname(e.name)) && !shouldExclude(e.name);
    })
    .sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const lines = [];
  entries.forEach((e, i) => {
    const connector = i === entries.length - 1 ? "└── " : "├── ";
    const nextPrefix = i === entries.length - 1 ? "    " : "│   ";
    const name = e.name + (e.isDirectory() ? "/" : "");
    lines.push(prefix + connector + name);
    if (e.isDirectory()) {
      lines.push(buildTree(path.join(dir, e.name), prefix + nextPrefix));
    }
  });
  return lines.join("\n");
}

// Ensure POSIX-style paths in the markdown (prettier on Windows)
function toPosix(p) {
  return p.split(path.sep).join("/");
}

// Pick a fence length that won’t collide with backticks inside the file
function pickFenceFor(content) {
  const matches = content.match(/`+/g);
  const maxRun = matches ? Math.max(...matches.map((s) => s.length)) : 0;
  const length = Math.max(3, maxRun + 1);
  return "`".repeat(length);
}

async function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`⚠️  No ./src directory found at: ${SRC_DIR}`);
    process.exit(1);
  }

  const files = (await walk(SRC_DIR)).sort((a, b) => a.localeCompare(b));
  const tree = buildTree(SRC_DIR);

  let out = "";
  out += "# Source Catalog\n\n";
  out += `Generated on ${new Date().toISOString()}\n\n`;
  out += `**Included extensions:** ${Array.from(EXTS).join(", ")}\n\n`;
  if (EXCLUDE_PATTERNS) {
    out += `**Excluded patterns:** ${EXCLUDE_PATTERNS.join(", ")}\n\n`;
  }
  out += "## Directory structure\n\n";
  out += "```\n" + tree + "\n```\n\n";
  out += "## Files\n\n";

  for (const absPath of files) {
    const rel = toPosix(path.relative(root, absPath));
    const content = fs.readFileSync(absPath, "utf8");
    const fence = pickFenceFor(content);
    const ext = path.extname(absPath);

    // Map extensions to syntax highlighting languages
    const langMap = {
      '.ts': 'ts',
      '.tsx': 'tsx',
      '.js': 'js',
      '.jsx': 'jsx',
      '.mjs': 'js',
      '.cjs': 'js',
      '.json': 'json',
      '.md': 'markdown',
    };
    const lang = langMap[ext] || ext.slice(1); // fallback to extension without dot

    out += `### ${rel}\n\n`;
    out += `${fence} ${lang}\n${content}\n${fence}\n\n`;
  }

  await fsp.writeFile(path.join(root, OUTPUT), out, "utf8");
  console.log(`✅ Wrote ${OUTPUT} with ${files.length} files.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
