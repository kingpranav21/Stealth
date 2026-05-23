# Demo GIF

## Generated slideshow (in repo)

```bash
npm run demo-gif
# → docs/stealth-demo.gif (embedded in README)
```

Re-run after UI changes. For a **screen recording**, use the script below.

## Screen recording script (~30 seconds)

Record in the **Extension Development Host** or a window with Stealth installed.

1. **Open** — Cmd+Shift+P → `Stealth: Open GitHub Repository` → pick your repo.
2. **Status bar** — point at bottom-right: `Stealth: you/repo | cache | API`.
3. **Tree** — expand **Remote Repository** → click a file → it opens.
4. **Edit** — change one line → **Cmd+S** → brief “Pushed to GitHub” toast.
5. **Disk story** — Cmd+Shift+P → `Cache Actions` → show usage vs cap.
6. **Optional** — `Find File` → type `readme` → open result.

Caption ideas:

- “No git clone”
- “Only opened files use disk”
- “Push with Cmd+S”

Export as `docs/stealth-demo.gif` and embed in README:

```markdown
![Stealth demo](./docs/stealth-demo.gif)
```
