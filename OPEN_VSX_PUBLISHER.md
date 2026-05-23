# Open VSX publisher notes (kingpranav21)

## You must sign first

Your profile shows: **“You need to sign the Eclipse Foundation Open VSX Publisher Agreement”** before any publish.

That is normal and required for everyone. On [open-vsx.org](https://open-vsx.org) → profile → accept/sign the agreement (Version 1.1).

This is not legal advice. If you publish as a company, have counsel review.

---

## What actually matters for Stealth

| Topic | What the agreement says | For Stealth |
|--------|-------------------------|-------------|
| **License** | If you don’t specify one, offering defaults to **MIT** | You already set `"license": "MIT"` in `package.json` ✓ |
| **Your responsibility** | You own the extension; you’re liable for content, IP, malware, accuracy | Stealth is your code; keep it honest in the listing |
| **Eclipse’s rights** | Non-exclusive license to **host, distribute, display** your extension in the registry | Standard for any marketplace |
| **No pay from Eclipse** | Eclipse does **not** owe you money for listing; they may monetize the registry (ads, etc.) | Expected for free extensions |
| **Removal** | Eclipse can remove or reject offerings | Rare if you follow rules |
| **Reviews** | Users can rate/review; you must not manipulate reviews | — |
| **Support** | **You** provide support (if any), not Eclipse | GitHub issues / README |
| **Data / privacy (§6)** | If you collect user data, disclose it in **Listing Information** | See below — use in marketplace README |
| **Liability cap** | Eclipse’s liability capped at **€5,000** | Standard publisher agreement |
| **Indemnity** | You defend Eclipse if claims arise from your extension (IP, misuse, etc.) | Normal for marketplaces |
| **Termination** | Either side can end with **30 days** notice | You can unpublish |
| **Law** | Belgium law, Brussels courts | Only if dispute |

---

## Data disclosure (put this on the Open VSX listing)

Stealth uses **GitHub sign-in** (via the editor’s GitHub auth). Copy into the extension’s marketplace description:

**Privacy / data**

- **GitHub:** Stealth uses VS Code/Cursor **GitHub Authentication** to call the GitHub API (read/write repos you authorize). Tokens are handled by the editor, not stored by Stealth in the VSIX.
- **Local disk:** Repo indexes and file cache live under `~/.stealth/` on your machine.
- **No Stealth analytics:** The extension does not send telemetry to a Stealth server.
- **Third parties:** GitHub (api.github.com) when you open, browse, or save files.

---

## Publish after signing

1. Sign the agreement on open-vsx.org.
2. `publisher` in `package.json` must match your namespace: **`kingpranav21`** ✓
3. Create the namespace once (fixes `Unknown publisher`):
   `npx ovsx create-namespace kingpranav21 -p "$OPEN_VSX_TOKEN"`
4. Publish:

```bash
export OPEN_VSX_TOKEN=your_token_from_open-vsx_settings
./scripts/publish-openvsx.sh
```

5. Extension URL: https://open-vsx.org/extension/kingpranav21/stealth

---

## Not scary, but real

- **Sign the agreement** — required gate, same as Maven Central / similar registries.
- **MIT license** — you’re explicitly allowing reuse; matches your repo LICENSE.
- **Disclose GitHub + local data** — satisfies §6 for a honest listing.
- **You’re not selling to Eclipse** — you’re granting permission to host the VSIX.

If anything in Stealth’s behavior doesn’t match the warranties (malware, hidden data collection, misleading description), fix that before publishing.
