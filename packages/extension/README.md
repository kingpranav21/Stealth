# Stealth

Open GitHub repositories in VS Code / Cursor **without a full `git clone`**. Only files you open use meaningful disk space, with a configurable cache cap and LRU eviction.

## Features

- Shallow / lazy repo index, on-demand file hydration
- Save to GitHub via Contents API
- **Stub Guard** — warns when AI/editors see placeholder stub text, not real code
- **Disk Governor** — optional Mac-wide cap across all `~/.stealth` workspaces
- Stealth Dashboard, branch switch, find file, compare/pull, PR link

## Privacy & data

- Uses the editor’s **GitHub Authentication** (OAuth) to access GitHub APIs for repos you open. Credentials are managed by VS Code/Cursor, not embedded in this extension.
- Stores repo indexes and cached file content locally under **`~/.stealth/`** on your computer.
- Contacts **api.github.com** when you browse, open, save, or refresh repositories.
- **No** Stealth-owned telemetry or analytics servers.

## License

MIT — see repository [LICENSE](https://github.com/pranavahuja/stealth/blob/main/LICENSE).

## Support

Issues: https://github.com/pranavahuja/stealth/issues
