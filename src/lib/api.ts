import type { ProfileData, SearchResult } from './types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export const apiConfigured = Boolean(API_BASE)

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof body?.error === 'string' ? body.error : `Request failed (${response.status})`
    throw new Error(message)
  }
  return body as T
}

export async function getHealth(): Promise<{ ok: boolean; service: string; version: string }> {
  if (!API_BASE) throw new Error('API_NOT_CONFIGURED')
  return parse(await fetch(`${API_BASE}/api/health`, { cache: 'no-store' }))
}

export async function getProfile(username: string, signal?: AbortSignal): Promise<ProfileData> {
  if (!API_BASE) throw new Error('API_NOT_CONFIGURED')
  return parse(await fetch(`${API_BASE}/api/profile/${encodeURIComponent(username)}`, { signal }))
}

export async function searchUsers(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  if (!API_BASE || query.trim().length < 2) return []
  const result = await parse<{ data: SearchResult[] }>(
    await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query.trim())}`, { signal }),
  )
  return result.data ?? []
}
