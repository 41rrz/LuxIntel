type AnyJson = Record<string, any>
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors })

async function roblox(url: string, init?: RequestInit) {
  const r = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', 'User-Agent': 'LuxIntel/0.1', ...(init?.headers || {}) } })
  if (!r.ok) throw new Error(`Roblox upstream ${r.status}: ${url}`)
  return (await r.json()) as AnyJson
}

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try { return await promise } catch { return fallback }
}

async function thumbnail(userId: number, type: 'AvatarHeadShot' | 'Avatar') {
  const size = type === 'AvatarHeadShot' ? '420x420' : '420x420'
  const data = await roblox(`https://thumbnails.roblox.com/v1/users/${type === 'AvatarHeadShot' ? 'avatar-headshot' : 'avatar'}?userIds=${userId}&size=${size}&format=Png&isCircular=false`)
  return data?.data?.[0]?.imageUrl || ''
}

async function profileByUsername(username: string) {
  const lookup = await roblox('https://users.roblox.com/v1/usernames/users', { method: 'POST', body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }) })
  const found = lookup?.data?.[0]
  if (!found) return null
  const id = found.id as number

  const [detail, friends, followers, followings, groups, history, headshot, fullBody, games] = await Promise.all([
    roblox(`https://users.roblox.com/v1/users/${id}`),
    safe(roblox(`https://friends.roblox.com/v1/users/${id}/friends/count`), { count: 0 }),
    safe(roblox(`https://friends.roblox.com/v1/users/${id}/followers/count`), { count: 0 }),
    safe(roblox(`https://friends.roblox.com/v1/users/${id}/followings/count`), { count: 0 }),
    safe(roblox(`https://groups.roblox.com/v2/users/${id}/groups/roles`), { data: [] }),
    safe(roblox(`https://users.roblox.com/v1/users/${id}/username-history?limit=100&sortOrder=Desc`), { data: [] }),
    safe(thumbnail(id, 'AvatarHeadShot'), ''),
    safe(thumbnail(id, 'Avatar'), ''),
    safe(roblox(`https://games.roblox.com/v2/users/${id}/games?accessFilter=2&limit=50&sortOrder=Desc`), { data: [] }),
  ])

  return {
    id,
    name: detail.name ?? found.name,
    displayName: detail.displayName ?? found.displayName,
    description: detail.description ?? '',
    created: detail.created,
    isBanned: detail.isBanned ?? false,
    hasVerifiedBadge: detail.hasVerifiedBadge ?? found.hasVerifiedBadge ?? false,
    friendCount: friends.count ?? 0,
    followerCount: followers.count ?? 0,
    followingCount: followings.count ?? 0,
    groups: groups.data ?? [],
    usernameHistory: history.data ?? [],
    avatarHeadshot: headshot,
    avatarFullBody: fullBody,
    experiences: games.data ?? [],
    fetchedAt: new Date().toISOString(),
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors })
    const url = new URL(request.url)
    if (url.pathname === '/api/health') return json({ ok: true, service: 'Lux Intel API', version: '0.1.0' })
    const match = url.pathname.match(/^\/api\/profile\/([^/]+)$/)
    if (request.method === 'GET' && match) {
      try {
        const profile = await profileByUsername(decodeURIComponent(match[1]))
        return profile ? json(profile) : json({ error: 'Roblox user not found.' }, 404)
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : 'Profile scan failed.' }, 502)
      }
    }
    return json({ error: 'Not found' }, 404)
  },
}
