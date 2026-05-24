import { spawnSync } from "child_process";

export function resolveGitHubToken(): string {
  for (const key of ["STEALTH_GITHUB_TOKEN", "GITHUB_TOKEN", "GH_TOKEN"]) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }

  const gh = spawnSync("gh", ["auth", "token"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (gh.status === 0 && gh.stdout?.trim()) {
    return gh.stdout.trim();
  }

  throw new Error(
    "No GitHub token. Set GITHUB_TOKEN or run: gh auth login\n" +
      "  export GITHUB_TOKEN=$(gh auth token)"
  );
}
