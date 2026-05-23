# Stealth — GitHub in VS Code & Cursor without `git clone`

Open, browse, edit, and save **GitHub repositories** without a full local clone. Stealth uses a shallow remote index, hydrates only opened files, and caps disk use under `~/.stealth/`.

**Install:** [Open VSX — kingpranav21/stealth](https://open-vsx.org/extension/kingpranav21/stealth) · **Docs:** [github.com/pranavahuja/stealth](https://github.com/pranavahuja/stealth)

## Features

- Shallow / lazy repo index, on-demand file hydration
- Save to GitHub via Contents API (no local `.git`)
- **Stub Guard** — warns when editors show stub placeholders instead of real code
- **Disk Governor** — optional cap across all `~/.stealth` workspaces
- Dashboard, find file, branch switch, compare/pull, PR link

## Privacy & data

- Uses the editor’s **GitHub Authentication** (OAuth) for GitHub APIs. Tokens are managed by VS Code/Cursor, not stored in the VSIX.
- Stores indexes and cached files locally under **`~/.stealth/`**.
- Contacts **api.github.com** when you browse, open, save, or refresh repos.
- **No** Stealth-owned telemetry.

## License & support

MIT — [LICENSE](https://github.com/pranavahuja/stealth/blob/main/LICENSE)  
Issues: https://github.com/pranavahuja/stealth/issues
