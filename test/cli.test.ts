// The CLI test: the CLI runs on the fixture folder, and its output must be byte-identical to the expected output.
// The expected outputs in test/expected/ come from concat-src.js before the module src/catalog (commit 04195f0).
// Only the time of the line "Generated on" changes between runs, so the test replaces it.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { CASES, makeFixture, withoutTime } from "./fixture.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.resolve(here, "../concat-src.ts");

for (const c of CASES) {
  test(`the CLI output of the case ${c.name} is the expected output`, () => {
    const dir = makeFixture();
    try {
      const stdout = execFileSync(process.execPath, [cli, ...c.args], { cwd: dir, encoding: "utf8" });
      const name = c.args.find((a) => !a.startsWith("--")) ?? "src-catalog.md";
      const markdown = fs.readFileSync(path.join(dir, name), "utf8");
      assert.match(markdown, /^Generated on \d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/m);
      assert.equal(withoutTime(markdown), fs.readFileSync(path.join(here, "expected", `${c.name}.md`), "utf8"));
      assert.equal(stdout, fs.readFileSync(path.join(here, "expected", `${c.name}.stdout.txt`), "utf8"));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}
