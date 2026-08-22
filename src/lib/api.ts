import type { ProfileData, SearchResult } from './types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export const apiConfigured = Boolean(API_BASE)

type JsonObject = Record<string, any>

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof body?.error === 'string' ? body.error : `Request failed (${response.status})`
    throw new Error(message)
  }
  return body as T
}

const asObject = (value: unknown): JsonObject =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : {}

const asArray = <T = any>(value: unknown): T[] => (Array.isArray(value) ? value : [])
const asString = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback)
const asNumber = (value: unknown, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

/**
 * Roblox endpoints are intentionally isolated in the Worker, but a browser can
 * briefly receive an older cached Worker payload after a deployment. Normalize
 * the response here so a missing optional module can never crash the React UI.
 */
function normalizeProfile(raw: unknown): ProfileData {
  const source = asObject(raw)
  const avatarSource = asObject(source.avatar)
  const inventorySource = asObject(source.inventory)
  const modulesSource = asObject(source.modules)

  const hasModernAvatar = source.avatar && typeof source.avatar === 'object'
  const hasModernInventory = source.inventory && typeof source.inventory === 'object'

  const modules = Object.keys(modulesSource).length
    ? modulesSource
    : {
        profile: { ok: true },
        social: { ok: true },
        groups: { ok: Array.isArray(source.groups) },
        history: { ok: Array.isArray(source.usernameHistory) },
        avatar: {
          ok: Boolean(hasModernAvatar),
          message: hasModernAvatar ? undefined : 'Avatar analyzer data requires the current Lux Intel Worker.',
        },
        inventory: {
          ok: Boolean(hasModernInventory),
          message: hasModernInventory ? undefined : 'Inventory analyzer data requires the current Lux Intel Worker.',
        },
        experiences: { ok: Array.isArray(source.experiences) },
      }

  return {
    id: asNumber(source.id),
    name: asString(source.name),
    displayName: asString(source.displayName, asString(source.name)),
    description: asString(source.description),
    created: asString(source.created, new Date(0).toISOString()),
    isBanned: Boolean(source.isBanned),
    hasVerifiedBadge: Boolean(source.hasVerifiedBadge),
    friendCount: asNumber(source.friendCount),
    followerCount: asNumber(source.followerCount),
    followingCount: asNumber(source.followingCount),
    groups: asArray(source.groups),
    primaryGroup: source.primaryGroup && typeof source.primaryGroup === 'object' ? source.primaryGroup : null,
    usernameHistory: asArray(source.usernameHistory),
    promotionChannels: asObject(source.promotionChannels),
    avatarHeadshot: asString(source.avatarHeadshot),
    avatarFullBody: asString(source.avatarFullBody),
    avatar: {
      playerAvatarType: asString(avatarSource.playerAvatarType) || undefined,
      assets: asArray(avatarSource.assets),
      scales: asObject(avatarSource.scales),
      bodyColors: asObject(avatarSource.bodyColors),
      emotes: asArray(avatarSource.emotes),
      outfits: asArray(avatarSource.outfits),
      outfitsHasMore: Boolean(avatarSource.outfitsHasMore),
    },
    presence: source.presence && typeof source.presence === 'object' ? source.presence : null,
    friends: asArray(source.friends),
    robloxBadges: asArray(source.robloxBadges),
    experienceBadges: asArray(source.experienceBadges),
    experienceBadgesHasMore: Boolean(source.experienceBadgesHasMore),
    inventory: {
      canView: typeof inventorySource.canView === 'boolean' ? inventorySource.canView : null,
      categories: asArray(inventorySource.categories),
      collectibles: asArray(inventorySource.collectibles),
      collectiblesHasMore: Boolean(inventorySource.collectiblesHasMore),
      openCloudConfigured: Boolean(inventorySource.openCloudConfigured),
      openCloudPreview: asArray(inventorySource.openCloudPreview),
    },
    experiences: asArray(source.experiences),
    fetchedAt: asString(source.fetchedAt, new Date().toISOString()),
    modules,
  }
}

export async function getHealth(): Promise<{ ok: boolean; service: string; version: string }> {
  if (!API_BASE) throw new Error('API_NOT_CONFIGURED')
  return parse(await fetch(`${API_BASE}/api/health`, { cache: 'no-store' }))
}

export async function getProfile(username: string, signal?: AbortSignal): Promise<ProfileData> {
  if (!API_BASE) throw new Error('API_NOT_CONFIGURED')
  const response = await parse<unknown>(
    await fetch(`${API_BASE}/api/profile/${encodeURIComponent(username)}`, {
      signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    }),
  )
  return normalizeProfile(response)
}

export async function searchUsers(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  if (!API_BASE || query.trim().length < 2) return []
  const result = await parse<{ data: SearchResult[] }>(
    await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query.trim())}`, { signal }),
  )
  return result.data ?? []
}
