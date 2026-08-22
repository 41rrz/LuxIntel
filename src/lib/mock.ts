import type { ProfileData } from './types'

const headshot = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 420"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#151824"/><stop offset="1" stop-color="#282341"/></linearGradient></defs><rect width="420" height="420" rx="72" fill="url(#g)"/><circle cx="210" cy="162" r="72" fill="#b9bdc9"/><rect x="125" y="235" width="170" height="125" rx="45" fill="#8c82ff"/><rect x="159" y="146" width="16" height="12" rx="6" fill="#17191f"/><rect x="245" y="146" width="16" height="12" rx="6" fill="#17191f"/><path d="M176 190q34 28 68 0" fill="none" stroke="#17191f" stroke-width="9" stroke-linecap="round"/><text x="210" y="394" text-anchor="middle" fill="#777d90" font-size="18" font-family="Arial">LUX INTEL DEMO</text></svg>`)}`
const fullBody = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 420"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#11131b"/><stop offset="1" stop-color="#242039"/></linearGradient></defs><rect width="420" height="420" rx="40" fill="url(#g)"/><circle cx="210" cy="96" r="48" fill="#c0c4ce"/><rect x="150" y="150" width="120" height="120" rx="18" fill="#8c82ff"/><rect x="104" y="158" width="38" height="120" rx="16" fill="#a9adba"/><rect x="278" y="158" width="38" height="120" rx="16" fill="#a9adba"/><rect x="158" y="278" width="46" height="112" rx="15" fill="#707787"/><rect x="216" y="278" width="46" height="112" rx="15" fill="#707787"/><rect x="175" y="87" width="11" height="9" rx="4" fill="#17191f"/><rect x="234" y="87" width="11" height="9" rx="4" fill="#17191f"/></svg>`)}`

export const mockProfile: ProfileData = {
  id: 156,
  name: 'builderman',
  displayName: 'builderman',
  description: 'Welcome to the Lux Intel V0.1 demo profile. Connect the included Cloudflare Worker to load live public Roblox data.',
  created: '2006-03-08T00:00:00.000Z',
  hasVerifiedBadge: true,
  friendCount: 152,
  followerCount: 1004821,
  followingCount: 68,
  avatarHeadshot: headshot,
  avatarFullBody: fullBody,
  groups: [
    { group: { id: 1200769, name: 'Roblox', memberCount: 1000000, hasVerifiedBadge: true }, role: { id: 1, name: 'Member', rank: 1 } },
    { group: { id: 7, name: 'Roblox HQ', memberCount: 240000 }, role: { id: 255, name: 'Owner', rank: 255 } },
  ],
  usernameHistory: [{ name: 'builderman' }, { name: 'ROBLOX' }, { name: 'Admin' }],
  experiences: [
    { id: 1, name: 'Example Experience', description: 'Experience analytics will expand in V0.2.' },
    { id: 2, name: 'Prototype World', description: 'Creator portfolio preview.' },
  ],
  fetchedAt: new Date().toISOString(),
}
