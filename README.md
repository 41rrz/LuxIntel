# Lux Intel V0.3

A responsive Roblox profile intelligence dashboard built with React, TypeScript, Vite, GitHub Pages, and a Cloudflare Worker.

## What changed in V0.3

- Live API health indicator
- Username search suggestions
- URL-based profile sharing (`?user=...&tab=...`)
- Recent searches stored locally
- Profile comparison dialog
- Real presence status
- Friend browser with public headshots
- Full current avatar definition, equipped assets, scales, body colors, and emotes
- Public saved avatar outfits with thumbnails
- Current group memberships and roles
- Primary group highlighting
- Public profile promotion/social links
- User-owned plus owned-group experience discovery
- Experience stats and icons
- Roblox platform badges
- Up to 100 recent earned experience badges with icons
- Public inventory visibility and collectible preview
- Optional Roblox Open Cloud inventory support
- Username history that clearly distinguishes missing timestamps from missing data
- Per-module health reporting so an empty result is not silently treated as a successful fetch
- Raw normalized payload viewer + copy button
- Responsive desktop/tablet/mobile navigation
- Updated GitHub Pages actions for the Node 24 runtime
- Worker dry-run validation during GitHub Actions builds
- Edge caching plus one retry for transient Roblox 429/5xx responses

## Upgrade an existing Lux Intel deployment

1. Replace the repository files with this version and keep your existing `VITE_API_BASE_URL` repository variable.
2. Deploy the Worker update first:

```powershell
cd worker
npm install
npm run deploy
```

3. Confirm `/api/health` reports version `0.3.0`.
4. Push the frontend changes to `main`. GitHub Pages will build and deploy automatically.
5. Hard-refresh the site after the Pages workflow finishes.

The Pages workflow validates the Worker bundle but intentionally does not publish it, so your Cloudflare credentials never need to be stored in the repository unless you later choose to automate Worker deployment.

## Local frontend

```powershell
npm install
npm run dev
```

Create `.env.local` in the project root:

```env
VITE_API_BASE_URL=https://lux-roblox-intel-api.luxintel.workers.dev
```

## Deploy/update the Worker

```powershell
cd worker
npm install
npm run deploy
```

The existing Worker name is `lux-roblox-intel-api`.

Test it:

```text
https://lux-roblox-intel-api.luxintel.workers.dev/api/health
https://lux-roblox-intel-api.luxintel.workers.dev/api/profile/builderman
https://lux-roblox-intel-api.luxintel.workers.dev/api/search?q=build
```

## GitHub Pages variable

Repository → **Settings → Secrets and variables → Actions → Variables**

```text
VITE_API_BASE_URL=https://lux-roblox-intel-api.luxintel.workers.dev
```

Then rerun the Pages workflow or push to `main`.

## Optional deeper inventory support

The public scanner works without a Roblox Open Cloud key. If you want the Worker to also query the newer Open Cloud Inventory API, create a Roblox Open Cloud API key with the appropriate inventory access and store it as a Cloudflare Worker secret:

```powershell
cd worker
npx wrangler secret put ROBLOX_OPEN_CLOUD_API_KEY
npm run deploy
```

Never put the key in the frontend, repository, `.env` committed to GitHub, or browser code.

## Privacy / security

Lux Intel does **not** request `.ROBLOSECURITY`. It only displays information available through Roblox public APIs plus an optional server-side Open Cloud key that you control.

Inventory privacy is respected. If Roblox reports an inventory as private, the UI displays that state instead of attempting to bypass it.

## Production notes

Roblox documents many of the legacy `*.roblox.com` web APIs but recommends Open Cloud where possible because legacy APIs can change. V0.3 therefore isolates Roblox calls in the Worker and exposes a normalized frontend response. If an upstream endpoint changes, the Worker can be fixed without redesigning the UI.
