import * as vscode from "vscode";

/** Scopes for reading private repos and writing in phase 2. */
export const GITHUB_SCOPES = ["read:user", "repo"];

/**
 * GitHub OAuth via the editor's built-in GitHub authentication provider
 * (same flow as GitHub Pull Requests — no pasted tokens).
 */
export async function getGitHubToken(
  createIfNone = true
): Promise<string | undefined> {
  const session = await vscode.authentication.getSession(
    "github",
    GITHUB_SCOPES,
    { createIfNone }
  );
  return session?.accessToken;
}

export async function signInToGitHub(): Promise<boolean> {
  const token = await getGitHubToken(true);
  if (token) {
    void vscode.window.showInformationMessage("Signed in to GitHub.");
    return true;
  }
  void vscode.window.showErrorMessage(
    "GitHub sign-in was cancelled or is unavailable. Install/enable GitHub authentication in your editor."
  );
  return false;
}
