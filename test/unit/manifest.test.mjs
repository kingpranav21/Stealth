import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const pkg = JSON.parse(
  readFileSync(join(root, "packages/extension/package.json"), "utf8")
);

const REQUIRED_COMMANDS = [
  "stealth.openRepository",
  "stealth.dashboard",
  "stealth.diskGovernor",
  "stealth.findFile",
  "stealth.copyForAi",
  "stealth.createPullRequest",
];

describe("extension manifest", () => {
  it("has version and publisher", () => {
    assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
    assert.equal(pkg.publisher, "kingpranav21");
    assert.equal(pkg.name, "stealth-github");
    assert.equal(pkg.displayName, "Stealth GitHub");
  });

  it("registers core commands", () => {
    const ids = pkg.contributes.commands.map((c) => c.command);
    for (const cmd of REQUIRED_COMMANDS) {
      assert.ok(ids.includes(cmd), `missing command: ${cmd}`);
    }
  });

  it("points main at built bundle", () => {
    assert.equal(pkg.main, "./dist/extension.js");
  });
});
