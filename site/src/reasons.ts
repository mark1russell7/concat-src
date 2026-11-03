/** The words of the page for the reasons of the module, and the small formats of the page. */
import { parseList, type FileResult, type Reason, type ReasonCode } from "concat-src/catalog";

/** A group of the file list: a reason of the rules, or a toggle of the visitor. */
export type Group = ReasonCode | "forced-in" | "forced-out";

/** The groups, in the sequence of the bar and of the legend. */
export const GROUPS: readonly { readonly id: Group; readonly label: string }[] = [
  { id: "kept", label: "kept" },
  { id: "forced-in", label: "in by you" },
  { id: "excluded", label: "exclude pattern" },
  { id: "extension", label: "extension" },
  { id: "ignored", label: "ignored folder" },
  { id: "hidden", label: "hidden" },
  { id: "forced-out", label: "out by you" },
];

/** This function gives the label of a group. */
export function labelOf(group: Group): string {
  return GROUPS.find((g) => g.id === group)?.label ?? group;
}

/** This function gives the group of a file. */
export function groupOf(file: FileResult): Group {
  if (file.forced === "in") return "forced-in";
  if (file.forced === "out") return "forced-out";
  return file.reason.code;
}

/** This function tells the reason of the rules in one sentence. */
export function explain(reason: Reason): string {
  switch (reason.code) {
    case "kept":
      return reason.detail ? `The extension ${reason.detail} is in the include list.` : "The include list has the empty extension.";
    case "hidden":
      return reason.detail.endsWith("/") ? `It is in the hidden folder ${reason.detail}.` : "Its name starts with a dot, so it is hidden.";
    case "ignored":
      return `It is in ${reason.detail}, and the walk does not enter that folder.`;
    case "extension":
      return reason.detail ? `The extension ${reason.detail} is not in the include list.` : "The file has no extension.";
    case "excluded":
      return `The name ends with ${reason.detail}, a pattern of the exclude list.`;
  }
}

/** This function tells why a file is in or out, with the toggle of the visitor. */
export function explainFile(file: FileResult): string {
  if (file.forced === "in") return `You turned it in. The rules put it out: ${lower(explain(file.rule))}`;
  if (file.forced === "out") return `You turned it out. The rules keep it: ${lower(explain(file.rule))}`;
  return explain(file.reason);
}

function lower(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** This function reads a field of the page as a list of the CLI. An empty field is the same as no option. */
export function parseField(text: string): string[] | null {
  return text.trim() === "" ? null : parseList(text);
}

/** This function gives the CLI command of the rules. */
export function cliCommand(include: readonly string[] | null, exclude: readonly string[] | null): string {
  const arg = (name: string, list: readonly string[]) => {
    const value = `--${name}=${list.join(",")}`;
    return /^[\w.,=@+/-]*$/.test(value) ? value : `"${value.replace(/(["\\$`])/g, "\\$1")}"`;
  };
  return ["node concat-src.ts", include ? arg("include", include) : "", exclude ? arg("exclude", exclude) : ""].filter(Boolean).join(" ");
}

/** This function gives a size in bytes as text: 1536 gives "1.5 KB". */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
