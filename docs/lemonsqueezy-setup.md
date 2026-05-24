# Path B: Lemon Squeezy + Stealth GitHub

Stealth GitHub uses a **14-day trial**, then requires a **license key** from Lemon Squeezy. You do **not** need your own license server when `stealth.licensing.provider` is `lemonsqueezy` (default).

## Overview

```text
1. You create a product on Lemon Squeezy (with license keys)
2. You set stealth.checkoutUrl to your Lemon checkout link
3. User installs extension → trial runs automatically
4. User buys → Lemon emails a license key
5. User runs "Activate License Key" in VS Code
6. Extension talks to Lemon Squeezy API → Pro unlocked
```

## Step 1 — Lemon Squeezy account

1. Sign up at [lemonsqueezy.com](https://lemonsqueezy.com).
2. Create a **Store**.
3. **Settings → API** — you do **not** need the API key for license validation (the License API is public). You only need the API key if you build a custom backend later.

## Step 2 — Product with license keys

1. **Products → New product** (e.g. “Stealth GitHub Pro”).
2. Pricing: one-time or subscription — your choice.
3. Enable **License keys** on the product / variant.
4. Set **Activation limit** (e.g. `1` = one machine per key, `3` = three machines).
5. Publish the product and copy the **Checkout URL**.

## Step 3 — Configure the extension defaults (before publish)

In `packages/extension/package.json` → `contributes.configuration`, set your real checkout URL (or tell users in README):

| Setting | Example |
|---------|---------|
| `stealth.checkoutUrl` | `https://stealth-github-pro.lemonsqueezy.com/checkout/buy/7f8803b4-d9c5-4788-92a7-356b0fb2d12b` |
| `stealth.licensing.provider` | `lemonsqueezy` (default) |
| `stealth.trialDays` | `14` |
| `stealth.licensing.enabled` | `true` |

Users can also set these in **VS Code Settings** → search `stealth`.

`stealth.licenseApiUrl` can stay **empty** for Lemon Squeezy mode.

## After the 14-day trial

If `stealth.licensing.enabled` is on (default), users **cannot**:

- Open new repos or switch workspaces  
- Load or hydrate files from GitHub  
- Save, push, delete, rename, or branch  
- Refresh or deep-index the remote tree  

They still can: sign in, open the dashboard, check license status, **Upgrade**, and **Activate License Key**.

On trial expiry, a one-time modal points them to your [checkout URL](https://stealth-github-pro.lemonsqueezy.com/checkout/buy/7f8803b4-d9c5-4788-92a7-356b0fb2d12b).

For **subscriptions**, set Lemon Squeezy so license keys **expire when the subscription ends**; the extension re-validates every 24 hours.

## Step 4 — Test end-to-end

### A. Test mode purchase

1. In Lemon Squeezy, enable **Test mode** and create a test checkout.
2. Complete a test purchase → copy the **license key** from the email or order page.

### B. In VS Code (Extension Development Host or installed VSIX)

1. Set `stealth.checkoutUrl` to your test checkout (for the Upgrade button).
2. Optional: set `stealth.trialDays` to `0` to force the paywall immediately.
3. Try **Stealth GitHub: Open GitHub Repository** → should prompt to upgrade or enter key.
4. **Stealth GitHub: Activate License Key** → paste the Lemon key.
5. Try open repo again → should work.
6. Status bar should show `| Pro`.

### C. Reset trial on your machine (dev only)

Command Palette → **Developer: Open Extension Global State** or clear:

- `stealth.trialStartedAt`
- license secrets via **Activate** with empty / clear storage

## Step 5 — Ship

1. Bump version in `packages/extension/package.json`.
2. `npm run package` → publish `stealth-github-*.vsix` to [Open VSX](https://open-vsx.org).
3. In the marketplace README, add:
   - 14-day free trial
   - Link to buy (your Lemon checkout)
   - “After purchase, use **Stealth GitHub: Activate License Key**”

## What customers do

1. Install **Stealth GitHub** from Open VSX.
2. Use the trial (14 days).
3. Click **Upgrade to Pro** (or your checkout link) → pay on Lemon Squeezy.
4. Copy the license key from email.
5. **Cmd+Shift+P** → **Stealth GitHub: Activate License Key** → paste key.

## FAQ

**Do I need a server?**  
No, if `stealth.licensing.provider` is `lemonsqueezy`. The extension calls Lemon’s License API directly.

**When do I use `proxy`?**  
If you want your own analytics, custom rules, or to hide logic — deploy `scripts/examples/license-server.mjs` or a Worker and set `stealth.licensing.provider` to `proxy` plus `stealth.licenseApiUrl`.

**Can I turn off payments while testing?**  
Set `stealth.licensing.enabled` to `false` in Settings.

**Refunds / revoked keys?**  
Lemon marks keys inactive; the next **Refresh License** (or revalidate within 24h) will lock Pro features.

## Checklist

- [ ] Lemon Squeezy product live with license keys  
- [ ] Checkout URL in `stealth.checkoutUrl` (or README)  
- [ ] Test purchase + activate in VS Code  
- [ ] Open VSX publish `stealth-github` with trial/Pro mentioned in README  
- [ ] Deprecate old `stealth` listing on Open VSX (optional)
