import * as vscode from "vscode";
import {
  DEFAULT_BLOAT_PATTERNS,
  bloatBlockMessage,
  matchesBloatPath,
} from "@stealth/shared";

export function getBloatBlocklist(): string[] {
  return vscode.workspace
    .getConfiguration("stealth")
    .get<string[]>("bloatBlocklist", DEFAULT_BLOAT_PATTERNS);
}

/** Paths we refuse to hydrate — saves disk and avoids useless AI context. */
export function isBloatPath(relativePath: string): boolean {
  return matchesBloatPath(relativePath, getBloatBlocklist());
}

export { bloatBlockMessage };
