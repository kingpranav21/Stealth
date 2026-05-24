import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const cli = join(root, "packages/cli/dist/cli.js");

describe("stealth CLI", () => {
  it("cli bundle exists after build", () => {
    assert.equal(existsSync(cli), true);
  });

  it("prints help", () => {
    const r = spawnSync(process.execPath, [cli, "--help"], {
      encoding: "utf8",
    });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /stealth push/);
    assert.match(r.stdout, /stealth write/);
  });
});
