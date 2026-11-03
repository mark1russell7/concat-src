// The types of catalog.js, for the site and for editors.

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

export declare const DEFAULT_INCLUDE: readonly string[];
export declare const IGNORED_FOLDERS: readonly string[];
export declare function parseList(text: string): string[];
export declare function extname(name: string): string;
export declare function languageOf(path: string): string;
export declare function fenceFor(text: string): string;
export declare function normalizeRules(rules?: Rules): { include: string[]; exclude: readonly string[] | null };
export declare function classify(path: string, rules?: Rules): Classified;
export declare function buildCatalog(files: readonly SourceFile[], options?: CatalogOptions): Catalog;
