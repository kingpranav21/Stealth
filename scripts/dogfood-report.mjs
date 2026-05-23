#!/usr/bin/env node
/**
 * Automated pre-dogfood checks (run before manual SHIP.md checklist).
 * Usage: node scripts/dogfood-report.mjs
 */
import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const extPkg = JSON.parse(
  readFileSync(join(root, "packages/extension/package.json"), "utf8")
);

const checks = [];

function pass(name, detail) {
  checks.push({ ok: true, name, detail });
}
function fail(name, detail) {
  checks.push({ ok: false, name, detail });
}

try {
  execSync("npm run build", { cwd: root, stdio: "pipe" });
  pass("build", "npm run build");
} catch (e) {
  fail("build", String(e.stderr || e.message).slice(0, 200));
}

const extDir = join(root, "packages/extension");
const vsixWanted = `stealth-${extPkg.version}.vsix`;
const vsixPath = join(extDir, vsixWanted);

if (!existsSync(vsixPath)) {
  try {
    execSync("npm run package", { cwd: root, stdio: "pipe" });
    pass("package", "VSIX created");
  } catch (e) {
    fail("package", String(e.stderr || e.message).slice(0, 200));
  }
} else {
  pass("package", `${vsixWanted} already present`);
}

const vsix = existsSync(vsixPath) ? vsixWanted : undefined;
if (vsix) {
  pass("vsix-version", vsix);
} else {
  fail("vsix-version", `Expected stealth-${extPkg.version}.vsix, got ${vsix}`);
}

if (existsSync(join(extDir, "icon.png"))) {
  pass("icon", "packages/extension/icon.png");
} else {
  fail("icon", "missing icon.png");
}

const requiredCmds = [
  "stealth.openRepository",
  "stealth.dashboard",
  "stealth.diskGovernor",
  "stealth.createPullRequest",
  "stealth.copyForAi",
  "stealth.findFile",
];
for (const cmd of requiredCmds) {
  if (extPkg.contributes.commands.some((c) => c.command === cmd)) {
    pass(`command:${cmd}`, "registered");
  } else {
    fail(`command:${cmd}`, "missing from package.json");
  }
}

if (existsSync(join(root, "docs/stealth-demo.gif"))) {
  pass("demo-gif", "docs/stealth-demo.gif");
} else {
  fail("demo-gif", "run: python3 scripts/generate-demo-gif.py");
}

const dist = join(extDir, "dist/extension.js");
if (existsSync(dist) && readFileSync(dist).includes("Stub Guard")) {
  pass("stub-guard", "bundled in extension.js");
} else if (existsSync(dist) && readFileSync(dist).includes("stubGuard")) {
  pass("stub-guard", "bundled (stubGuard symbol)");
} else {
  fail("stub-guard", "not found in bundle");
}

console.log("\n# Stealth dogfood — automated checks\n");
console.log(`Version: ${extPkg.version}\n`);
let allOk = true;
for (const c of checks) {
  const mark = c.ok ? "✓" : "✗";
  if (!c.ok) {
    allOk = false;
  }
  console.log(`${mark} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
}

console.log("\n## Manual (see SHIP.md)\n");
console.log("- [ ] Small repo: save + branch + find file");
console.log("- [ ] Medium repo: shallow + lazy tree");
console.log("- [ ] Large repo: eviction + Disk Governor");
console.log("- [ ] Stub Guard when file evicted");
console.log("- [ ] Dashboard auto-refresh\n");

process.exit(allOk ? 0 : 1);
