import * as vscode from "vscode";

const DEFAULT_BLOCKLIST = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/vendor/**",
  "**/*.min.js",
  "**/package-lock.json",
  "**/yarn.lock",
  "**/pnpm-lock.yaml",
];

export function getBloatBlocklist(): string[] {
  return vscode.workspace
    .getConfiguration("stealth")
    .get<string[]>("bloatBlocklist", DEFAULT_BLOCKLIST);
}

function defaultBloat(path: string): boolean {
  return (
    path.includes("/node_modules/") ||
    path.startsWith("node_modules/") ||
    path.includes("/.git/") ||
    path.startsWith(".git/") ||
    path.includes("/dist/") ||
    path.startsWith("dist/") ||
    path.includes("/build/") ||
    path.startsWith("build/") ||
    path.includes("/.next/") ||
    path.startsWith(".next/") ||
    path.includes("/vendor/") ||
    path.startsWith("vendor/") ||
    path.endsWith(".min.js") ||
    path.endsWith(".min.css") ||
    path.endsWith("package-lock.json") ||
    path.endsWith("yarn.lock") ||
    path.endsWith("pnpm-lock.yaml")
  );
}

/** Paths we refuse to hydrate — saves disk and avoids useless AI context. */
export function isBloatPath(relativePath: string): boolean {
  const p = relativePath.replace(/\\/g, "/");
  if (defaultBloat(p.toLowerCase())) {
    return true;
  }
  const lower = p.toLowerCase();
  for (const pattern of getBloatBlocklist()) {
    const norm = pattern.toLowerCase().replace(/^\*\*\//, "").replace(/\*\*/g, "");
    if (norm && (lower === norm || lower.endsWith(`/${norm}`) || lower.includes(`/${norm}/`))) {
      return true;
    }
  }
  return false;
}

export function bloatBlockMessage(relativePath: string): string {
  return (
    `Stealth will not hydrate "${relativePath}" — it matches the bloat blocklist ` +
    `(node_modules, lockfiles, build output). Adjust stealth.bloatBlocklist if needed.`
  );
}
