type AnyJson = Record<string, any>
type Env = { ROBLOX_OPEN_CLOUD_API_KEY?: string }
type Result<T> = { ok: true; data: T } | { ok: false; data: T; error: string }
type ExecContext = { waitUntil(promise: Promise<unknown>): void }

const corsBase = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8',
}

function json(body: unknown, status = 200, cacheSeconds = 30) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsBase,
      'Cache-Control': status === 200 ? `public, max-age=${Math.min(cacheSeconds, 60)}, s-maxage=${cacheSeconds}` : 'no-store',
    },
  })
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function roblox(url: string, init?: RequestInit) {
  const headers = new Headers(init?.headers || {})
  headers.set('Accept', 'application/json')
  if (init?.body) headers.set('Content-Type', 'application/json')
  headers.set('User-Agent', 'LuxIntel/0.3')

  let lastStatus = 0
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(url, { ...init, headers })
    lastStatus = response.status
    if (response.ok) return (await response.json()) as AnyJson

    const retryable = response.status === 429 || response.status >= 500
    if (!retryable || attempt === 1) break
    const retryAfter = Number(response.headers.get('Retry-After') || 0)
    await sleep(Math.min(Math.max(retryAfter * 1000, 220), 1200))
  }
  throw new Error(`Roblox upstream ${lastStatus || 'request failed'}`)
}

async function openCloud(url: string, apiKey: string) {
  return roblox(url, { headers: { 'x-api-key': apiKey } })
}

async function result<T>(promise: Promise<T>, fallback: T): Promise<Result<T>> {
  try {
    return { ok: true, data: await promise }
  } catch (error) {
    return { ok: false, data: fallback, error: error instanceof Error ? error.message : 'Unknown upstream error' }
  }
}

function resultError(entry: Result<unknown>) {
  return 'error' in entry ? entry.error : undefined
}

function moduleStatus(entry: Result<unknown>, emptyMessage?: string) {
  if (!entry.ok) return { ok: false, message: resultError(entry) || 'Upstream endpoint unavailable.' }
  return emptyMessage ? { ok: true, message: emptyMessage } : { ok: true }
}

async function userThumbnail(userId: number, type: 'AvatarHeadShot' | 'Avatar', size = '420x420') {
  const path = type === 'AvatarHeadShot' ? 'avatar-headshot' : 'avatar'
  const data = await roblox(`https://thumbnails.roblox.com/v1/users/${path}?userIds=${userId}&size=${size}&format=Png&isCircular=false`)
  return data?.data?.[0]?.imageUrl || ''
}

async function userHeadshots(userIds: number[]) {
  const unique = [...new Set(userIds)].slice(0, 100)
  if (!unique.length) return new Map<number, string>()
  const data = await roblox(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${unique.join(',')}&size=150x150&format=Png&isCircular=false`)
  return new Map<number, string>((data?.data ?? []).map((item: AnyJson) => [Number(item.targetId), item.imageUrl || '']))
}

async function outfitThumbnails(outfitIds: number[]) {
  const unique = [...new Set(outfitIds)].slice(0, 100)
  if (!unique.length) return new Map<number, string>()
  const data = await roblox(`https://thumbnails.roblox.com/v1/users/outfits?userOutfitIds=${unique.join(',')}&size=420x420&format=Png&isCircular=false`)
  return new Map<number, string>((data?.data ?? []).map((item: AnyJson) => [Number(item.targetId), item.imageUrl || '']))
}

async function badgeThumbnails(badgeIds: number[]) {
  const unique = [...new Set(badgeIds)].slice(0, 100)
  if (!unique.length) return new Map<number, string>()
  const data = await roblox(`https://thumbnails.roblox.com/v1/badges/icons?badgeIds=${unique.join(',')}&size=150x150&format=Png&isCircular=false`)
  return new Map<number, string>((data?.data ?? []).map((item: AnyJson) => [Number(item.targetId), item.imageUrl || '']))
}

async function lookupUser(username: string) {
  const lookup = await roblox('https://users.roblox.com/v1/usernames/users', {
    method: 'POST',
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
  })
  return lookup?.data?.[0] ?? null
}

async function profileDetail(userId: number) {
  return roblox(`https://users.roblox.com/v1/users/${userId}`)
}

async function presence(userId: number) {
  const response = await roblox('https://presence.roblox.com/v1/presence/users', {
    method: 'POST',
    body: JSON.stringify({ userIds: [userId] }),
  })
  return response?.userPresences?.[0] ?? null
}

async function userFriends(userId: number) {
  const response = await roblox(`https://friends.roblox.com/v1/users/${userId}/friends`)
  const friends = (response?.data ?? []).slice(0, 200)
  const thumbs = await userHeadshots(friends.slice(0, 60).map((x: AnyJson) => Number(x.id)))
  return friends.map((friend: AnyJson, index: number) => ({
    id: Number(friend.id),
    name: friend.name ?? '',
    displayName: friend.displayName ?? friend.name ?? '',
    hasVerifiedBadge: Boolean(friend.hasVerifiedBadge),
    avatarHeadshot: index < 60 ? thumbs.get(Number(friend.id)) || '' : '',
  }))
}

async function avatarDetails(userId: number) {
  const response = await roblox(`https://avatar.roblox.com/v1/users/${userId}/avatar`)
  return {
    playerAvatarType: response?.playerAvatarType,
    assets: response?.assets ?? [],
    scales: response?.scales ?? {},
    bodyColors: response?.bodyColors ?? {},
    emotes: response?.emotes ?? [],
  }
}

async function avatarOutfits(userId: number) {
  const response = await roblox(`https://avatar.roblox.com/v2/avatar/users/${userId}/outfits?itemsPerPage=50&outfitType=Avatar&page=1`)
  const outfits = (response?.data ?? []).slice(0, 50)
  const thumbs = await outfitThumbnails(outfits.map((entry: AnyJson) => Number(entry.id)))
  return {
    data: outfits.map((entry: AnyJson) => ({
      id: Number(entry.id),
      name: entry.name ?? `Outfit ${entry.id}`,
      isEditable: entry.isEditable,
      outfitType: entry.outfitType,
      thumbnailUrl: thumbs.get(Number(entry.id)) || '',
    })),
    hasMore: Boolean(response?.paginationToken),
  }
}

async function userExperienceBadges(userId: number) {
  const response = await roblox(`https://badges.roblox.com/v1/users/${userId}/badges?limit=100&sortOrder=Desc`)
  const badges = (response?.data ?? []).slice(0, 100)
  const thumbs = await badgeThumbnails(badges.map((entry: AnyJson) => Number(entry.id)))
  return {
    data: badges.map((entry: AnyJson) => ({ ...entry, imageUrl: thumbs.get(Number(entry.id)) || '' })),
    hasMore: Boolean(response?.nextPageCursor),
  }
}

async function publicInventory(userId: number, apiKey?: string) {
  const visibility = await result(
    roblox(`https://inventory.roblox.com/v1/users/${userId}/can-view-inventory`),
    { canView: null },
  )
  const canView = typeof visibility.data?.canView === 'boolean' ? visibility.data.canView : null
  if (canView === false) {
    return {
      canView,
      categories: [],
      collectibles: [],
      collectiblesHasMore: false,
      openCloudConfigured: Boolean(apiKey),
      openCloudPreview: [],
    }
  }

  const [categories, collectibles] = await Promise.all([
    result(roblox(`https://inventory.roblox.com/v1/users/${userId}/categories`), { categories: [] }),
    result(
      roblox(`https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?sortOrder=Desc&limit=100`),
      { data: [], nextPageCursor: null },
    ),
  ])

  let openCloudPreview: AnyJson[] = []
  if (apiKey) {
    const cloud = await result(
      openCloud(`https://apis.roblox.com/cloud/v2/users/${userId}/inventory-items?maxPageSize=50`, apiKey),
      { inventoryItems: [] },
    )
    openCloudPreview = cloud.data?.inventoryItems ?? []
  }

  return {
    canView,
    categories: categories.data?.categories ?? categories.data?.data ?? [],
    collectibles: collectibles.data?.data ?? [],
    collectiblesHasMore: Boolean(collectibles.data?.nextPageCursor),
    openCloudConfigured: Boolean(apiKey),
    openCloudPreview,
  }
}

async function createdExperiences(userId: number, groups: AnyJson[]) {
  const userGames = await result(
    roblox(`https://games.roblox.com/v2/users/${userId}/games?accessFilter=2&limit=50&sortOrder=Desc`),
    { data: [] },
  )

  const ownerGroups = groups
    .filter((entry: AnyJson) => Number(entry?.role?.rank ?? 0) === 255)
    .slice(0, 5)

  const groupGameResults = await Promise.all(
    ownerGroups.map(async (entry: AnyJson) => {
      const groupId = Number(entry?.group?.id)
      const groupName = entry?.group?.name ?? 'Owned group'
      const games = await result(
        roblox(`https://games.roblox.com/v2/groups/${groupId}/gamesV2?accessFilter=2&limit=25&sortOrder=Desc`),
        { data: [] },
      )
      return (games.data?.data ?? []).map((game: AnyJson) => ({ ...game, source: 'group', sourceName: groupName }))
    }),
  )

  const raw = [
    ...(userGames.data?.data ?? []).map((game: AnyJson) => ({ ...game, source: 'user', sourceName: 'Personal' })),
    ...groupGameResults.flat(),
  ]

  const deduped = [...new Map(raw.map((game: AnyJson) => [Number(game.id), game])).values()].slice(0, 50)
  const ids = deduped.map((game: AnyJson) => Number(game.id)).filter(Boolean)
  if (!ids.length) return { games: [], directOk: userGames.ok }

  const [details, icons] = await Promise.all([
    result(roblox(`https://games.roblox.com/v1/games?universeIds=${ids.join(',')}`), { data: [] }),
    result(
      roblox(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${ids.join(',')}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`),
      { data: [] },
    ),
  ])

  const detailMap = new Map<number, AnyJson>((details.data?.data ?? []).map((x: AnyJson) => [Number(x.id), x]))
  const iconMap = new Map<number, string>((icons.data?.data ?? []).map((x: AnyJson) => [Number(x.targetId), x.imageUrl || '']))

  const games = deduped.map((game: AnyJson) => {
    const detail = detailMap.get(Number(game.id)) ?? {}
    return {
      ...game,
      ...detail,
      source: game.source,
      sourceName: game.sourceName,
      iconUrl: iconMap.get(Number(game.id)) || '',
    }
  })

  return { games, directOk: userGames.ok }
}

async function profileByUsername(username: string, env: Env) {
  const found = await lookupUser(username)
  if (!found) return null
  const id = Number(found.id)

  const [
    detailR,
    friendsCountR,
    followersR,
    followingR,
    groupsR,
    primaryGroupR,
    historyR,
    promotionR,
    headshotR,
    fullBodyR,
    avatarR,
    outfitsR,
    presenceR,
    friendsR,
    badgesR,
    experienceBadgesR,
    inventoryR,
  ] = await Promise.all([
    result(profileDetail(id), found),
    result(roblox(`https://friends.roblox.com/v1/users/${id}/friends/count`), { count: 0 }),
    result(roblox(`https://friends.roblox.com/v1/users/${id}/followers/count`), { count: 0 }),
    result(roblox(`https://friends.roblox.com/v1/users/${id}/followings/count`), { count: 0 }),
    result(roblox(`https://groups.roblox.com/v1/users/${id}/groups/roles`), { data: [] }),
    result(roblox(`https://groups.roblox.com/v1/users/${id}/groups/primary/role`), null),
    result(roblox(`https://users.roblox.com/v1/users/${id}/username-history?limit=100&sortOrder=Desc`), { data: [] }),
    result(roblox(`https://accountinformation.roblox.com/v1/users/${id}/promotion-channels`), {}),
    result(userThumbnail(id, 'AvatarHeadShot'), ''),
    result(userThumbnail(id, 'Avatar'), ''),
    result(avatarDetails(id), { playerAvatarType: undefined, assets: [], scales: {}, bodyColors: {}, emotes: [] }),
    result(avatarOutfits(id), { data: [], hasMore: false }),
    result(presence(id), null),
    result(userFriends(id), []),
    result(roblox(`https://accountinformation.roblox.com/v1/users/${id}/roblox-badges`), []),
    result(userExperienceBadges(id), { data: [], hasMore: false }),
    result(publicInventory(id, env.ROBLOX_OPEN_CLOUD_API_KEY), {
      canView: null,
      categories: [],
      collectibles: [],
      collectiblesHasMore: false,
      openCloudConfigured: Boolean(env.ROBLOX_OPEN_CLOUD_API_KEY),
      openCloudPreview: [],
    }),
  ])

  const groups = groupsR.data?.data ?? []
  const experiencesR = await result(createdExperiences(id, groups), { games: [], directOk: false })
  const detail = detailR.data ?? found
  const history = historyR.data?.data ?? []

  return {
    id,
    name: detail.name ?? found.name,
    displayName: detail.displayName ?? found.displayName ?? found.name,
    description: detail.description ?? '',
    created: detail.created ?? new Date(0).toISOString(),
    isBanned: detail.isBanned ?? false,
    hasVerifiedBadge: detail.hasVerifiedBadge ?? found.hasVerifiedBadge ?? false,
    friendCount: Number(friendsCountR.data?.count ?? 0),
    followerCount: Number(followersR.data?.count ?? 0),
    followingCount: Number(followingR.data?.count ?? 0),
    groups,
    primaryGroup: primaryGroupR.data,
    usernameHistory: history,
    promotionChannels: promotionR.data ?? {},
    avatarHeadshot: headshotR.data,
    avatarFullBody: fullBodyR.data,
    avatar: {
      ...avatarR.data,
      outfits: outfitsR.data.data,
      outfitsHasMore: outfitsR.data.hasMore,
    },
    presence: presenceR.data,
    friends: friendsR.data,
    robloxBadges: Array.isArray(badgesR.data) ? badgesR.data : [],
    experienceBadges: experienceBadgesR.data.data,
    experienceBadgesHasMore: experienceBadgesR.data.hasMore,
    inventory: inventoryR.data,
    experiences: experiencesR.data.games,
    fetchedAt: new Date().toISOString(),
    schemaVersion: 3,
    modules: {
      profile: moduleStatus(detailR),
      social: { ok: friendsCountR.ok && followersR.ok && followingR.ok && friendsR.ok, message: friendsR.ok ? undefined : resultError(friendsR) },
      groups: moduleStatus(groupsR, groups.length === 0 ? 'No public group memberships returned.' : undefined),
      primaryGroup: moduleStatus(primaryGroupR, primaryGroupR.data ? undefined : 'No primary group returned.'),
      history: moduleStatus(historyR, history.length === 0 ? 'No previous usernames returned by Roblox.' : undefined),
      promotion: moduleStatus(promotionR, Object.values(promotionR.data ?? {}).some(Boolean) ? undefined : 'No public promotion channels returned.'),
      avatar: moduleStatus(avatarR),
      outfits: moduleStatus(outfitsR, outfitsR.data.data.length === 0 ? 'No public saved outfits returned.' : undefined),
      presence: moduleStatus(presenceR),
      badges: moduleStatus(badgesR),
      experienceBadges: moduleStatus(experienceBadgesR, experienceBadgesR.data.data.length === 0 ? 'No earned experience badges returned.' : undefined),
      inventory: moduleStatus(inventoryR),
      experiences: moduleStatus(experiencesR, experiencesR.data.games.length === 0 ? 'No public user-owned or owned-group experiences returned.' : undefined),
    },
  }
}

async function searchByKeyword(query: string) {
  const response = await roblox(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(query)}&limit=10`)
  const users = (response?.data ?? []).slice(0, 10)
  const thumbs = await userHeadshots(users.map((x: AnyJson) => Number(x.id)))
  return users.map((user: AnyJson) => ({
    id: Number(user.id),
    name: user.name ?? '',
    displayName: user.displayName ?? user.name ?? '',
    hasVerifiedBadge: Boolean(user.hasVerifiedBadge),
    avatarHeadshot: thumbs.get(Number(user.id)) || '',
  }))
}

async function fromEdgeCache(request: Request) {
  if (typeof caches === 'undefined') return null
  try {
    return await (caches as any).default.match(request)
  } catch {
    return null
  }
}

function putEdgeCache(request: Request, response: Response, context?: ExecContext) {
  if (!context || response.status !== 200 || typeof caches === 'undefined') return
  try {
    context.waitUntil((caches as any).default.put(request, response.clone()))
  } catch {
    // Cache is an optimization only; never fail a profile request because of it.
  }
}

export default {
  async fetch(request: Request, env: Env, context?: ExecContext): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsBase })
    if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405, 0)

    const url = new URL(request.url)

    if (url.pathname === '/api/health') {
      return json({ ok: true, service: 'Lux Intel API', version: '0.3.1', schemaVersion: 3, inventoryOpenCloud: Boolean(env.ROBLOX_OPEN_CLOUD_API_KEY) }, 200, 10)
    }

    if (url.pathname === '/api/search') {
      const q = (url.searchParams.get('q') || '').trim().replace(/^@/, '')
      if (q.length < 2) return json({ data: [] }, 200, 15)
      if (q.length > 50) return json({ error: 'Search query is too long.' }, 400, 0)
      const cached = await fromEdgeCache(request)
      if (cached) return cached
      try {
        const response = json({ data: await searchByKeyword(q) }, 200, 45)
        putEdgeCache(request, response, context)
        return response
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : 'Search failed.' }, 502, 0)
      }
    }

    const match = url.pathname.match(/^\/api\/profile\/([^/]+)$/)
    if (match) {
      const username = decodeURIComponent(match[1]).trim().replace(/^@/, '')
      if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) return json({ error: 'Enter a valid Roblox username.' }, 400, 0)
      const cacheUrl = new URL(request.url)
      cacheUrl.searchParams.set('__schema', '3')
      const cacheRequest = new Request(cacheUrl.toString(), request)
      const cached = await fromEdgeCache(cacheRequest)
      if (cached) return cached
      try {
        const profile = await profileByUsername(username, env)
        const response = profile ? json(profile, 200, 90) : json({ error: 'Roblox user not found.' }, 404, 0)
        putEdgeCache(cacheRequest, response, context)
        return response
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : 'Profile scan failed.' }, 502, 0)
      }
    }

    return json({ error: 'Not found.' }, 404, 0)
  },
}
