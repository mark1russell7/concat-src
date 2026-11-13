import { describe, expect, it } from "vitest";
import { CAP_BYTES } from "./load.ts";
import { formatBytes } from "./reasons.ts";

/** The copy of the site before the move to `@mark1russell7/quantity`, word for word: 1536 gives "1.5 KB". */
function copyFormatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

const KI = 1024;
const MI = KI * KI;
const GI = MI * KI;
const SIZES: Readonly<Record<string, number>> = { B: 1, KB: KI, KiB: KI, MB: MI, MiB: MI, GiB: GI };

/** The sizes of the sweep: each power of 1024, the values next to each change of unit, and a dense run. */
const BYTES: number[] = [0, 1, 512, 999, 1000, 1023, 1024, 1536, 1_048_524, 1_048_575, 1_048_576, 1_300_000, 1_572_864, CAP_BYTES];
for (const base of [1, KI, MI]) {
  for (const factor of [1, 1.05, 1.5, 10, 100, 999.9, 1023.9, 1023.94, 1023.95, 1024]) BYTES.push(Math.round(base * factor));
}
for (let bytes = 0; bytes <= 3 * MI; bytes += 997) BYTES.push(bytes);

/** This function reads a text of a size and gives its bytes: "1.5 KiB" gives 1536. */
const bytesOf = (text: string): { readonly amount: number; readonly unit: number } => {
  const [value, unit] = text.split(" ") as [string, string];
  const size = SIZES[unit];
  if (size === undefined) throw new Error(`no unit in ${text}`);
  return { amount: Number(value.replaceAll(",", "")) * size, unit: size };
};

describe("formatBytes on the scale of @mark1russell7/quantity and the copy of the site", () => {
  it("shows the same size as the copy, to the rounding of the coarser text", () => {
    let same = 0;
    for (const b of BYTES) {
      const old = bytesOf(copyFormatBytes(b));
      const next = bytesOf(formatBytes(b));
      // the expected differences: KiB for KB, 1 decimal place at most, "1,000 B" for "1000 B", GiB above 1,024 MiB,
      // and the rounded value can fill the next step: "1024.0 KB" is "1 MiB" now
      expect(Math.abs(next.amount - old.amount), `${b} B`).toBeLessThanOrEqual(Math.max(next.unit, old.unit) * 0.1);
      expect(Math.abs(next.amount - b), `${b} B`).toBeLessThanOrEqual(next.unit * 0.05 * (1 + 1e-9));
      if (formatBytes(b) === copyFormatBytes(b).replace(/ KB$/, " KiB").replace(/ MB$/, " MiB")) same++;
    }
    expect(BYTES.length).toBeGreaterThan(3_000);
    expect(same).toBeGreaterThan(0);
  });

  it("gives the listed text changes", () => {
    const changes: readonly (readonly [number, string, string])[] = [
      [512, "512 B", "512 B"],
      [1000, "1000 B", "1,000 B"],
      [1024, "1.0 KB", "1 KiB"],
      [1536, "1.5 KB", "1.5 KiB"],
      [1_048_575, "1024.0 KB", "1 MiB"],
      [1_572_864, "1.50 MB", "1.5 MiB"],
      [1_300_000, "1.24 MB", "1.2 MiB"],
      [CAP_BYTES, "5.00 MB", "5 MiB"],
      [5 * GI, "5120.00 MB", "5 GiB"],
    ];
    for (const [b, old, text] of changes) {
      expect(copyFormatBytes(b)).toBe(old);
      expect(formatBytes(b)).toBe(text);
    }
  });
});
