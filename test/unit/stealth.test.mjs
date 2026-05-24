import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  workspaceId,
  parseRepoInput,
  matchesBloatPath,
  isStubContent,
  documentTextIsStub,
  STUB_MARKER,
  formatBytes,
  cacheMaxBytesFromMb,
  totalCacheBytes,
} from "@stealth/shared";

describe("parseRepoInput", () => {
  it("parses owner/repo", () => {
    assert.deepEqual(parseRepoInput("octocat/Hello-World"), {
      owner: "octocat",
      repo: "Hello-World",
      branch: "",
    });
  });

  it("parses owner/repo/branch", () => {
    assert.deepEqual(parseRepoInput("octocat/Hello-World/dev"), {
      owner: "octocat",
      repo: "Hello-World",
      branch: "dev",
    });
  });

  it("parses GitHub URLs", () => {
    assert.deepEqual(
      parseRepoInput("https://github.com/kingpranav21/stealth.git"),
      { owner: "kingpranav21", repo: "stealth", branch: "" }
    );
  });

  it("returns undefined for invalid input", () => {
    assert.equal(parseRepoInput(""), undefined);
    assert.equal(parseRepoInput("solo"), undefined);
  });
});

describe("workspaceId", () => {
  it("sanitizes branch in id", () => {
    const id = workspaceId({
      owner: "a",
      repo: "b",
      branch: "feature/foo",
    });
    assert.match(id, /^a-b-feature/);
  });
});

describe("matchesBloatPath", () => {
  it("blocks node_modules", () => {
    assert.equal(matchesBloatPath("node_modules/pkg/index.js"), true);
    assert.equal(matchesBloatPath("src/foo.ts"), false);
  });

  it("blocks lockfiles", () => {
    assert.equal(matchesBloatPath("package-lock.json"), true);
  });

  it("blocks dist", () => {
    assert.equal(matchesBloatPath("packages/app/dist/bundle.js"), true);
  });
});

describe("stub content", () => {
  it("detects stub buffer", () => {
    assert.equal(isStubContent(Buffer.from(STUB_MARKER)), true);
    assert.equal(isStubContent(Buffer.from("real code\n")), false);
  });

  it("detects stub document text", () => {
    assert.equal(documentTextIsStub(STUB_MARKER), true);
    assert.equal(documentTextIsStub("export const x = 1;\n"), false);
  });
});

describe("formatBytes", () => {
  it("formats sizes", () => {
    assert.equal(formatBytes(512), "512 B");
    assert.match(formatBytes(2048), /KB/);
    assert.match(formatBytes(5 * 1024 * 1024), /MB/);
  });
});

describe("cache helpers", () => {
  it("converts MB to bytes", () => {
    assert.equal(cacheMaxBytesFromMb(500), 500 * 1024 * 1024);
    assert.equal(cacheMaxBytesFromMb(0), 1024 * 1024);
  });

  it("sums cache entries", () => {
    assert.equal(
      totalCacheBytes({
        a: { bytes: 100 },
        b: { bytes: 250 },
      }),
      350
    );
  });
});
