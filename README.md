# Lux Intel — Roblox Profile Analytics

A production-oriented V0.1 starter for an extremely detailed public Roblox profile intelligence dashboard.

## Included now
- Responsive React + TypeScript dashboard
- Username search flow
- Profile identity / account age
- Friends, followers, following
- Groups + roles
- Username history
- Full-body + headshot thumbnails
- Public creator experiences
- Raw JSON developer view
- Cloudflare Worker Roblox API aggregator
- GitHub Pages deployment workflow
- Demo data when the API is not connected

## 1. Run frontend locally
```bash
npm install
npm run dev
```

## 2. Deploy the API Worker
```bash
cd worker
npm install
npx wrangler login
npm run deploy
```
Wrangler prints a URL such as:
`https://lux-roblox-intel-api.<your-subdomain>.workers.dev`

## 3. Connect frontend to the Worker
For local development create `.env.local` in the repository root:
```env
VITE_API_BASE_URL=https://lux-roblox-intel-api.<your-subdomain>.workers.dev
```
Restart `npm run dev`.

For GitHub Pages, open your GitHub repository:
**Settings → Secrets and variables → Actions → Variables → New repository variable**

Name: `VITE_API_BASE_URL`
Value: your Worker URL

## 4. Enable GitHub Pages
Repository **Settings → Pages → Build and deployment → Source → GitHub Actions**.
Then push to `main`.

## Architecture
```
GitHub Pages / Vite React UI
          |
          v
Cloudflare Worker API aggregator
          |
          +--> users.roblox.com
          +--> friends.roblox.com
          +--> groups.roblox.com
          +--> thumbnails.roblox.com
          +--> games.roblox.com
```

## V0.2 target
- Supabase snapshots
- Avatar asset analyzer
- Public friend list browser
- Mutual friend / group analysis
- Follower growth graphs
- Avatar, description and group change tracking
- Better game analytics
- Shareable profile routes

## Security
This project does **not** request `.ROBLOSECURITY` cookies. Keep it that way. Public data should use public Roblox endpoints; authenticated features should use official Roblox supported auth mechanisms.
