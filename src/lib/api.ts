import type { ProfileData } from './types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export const apiConfigured = Boolean(API_BASE)

export async function getProfile(username: string): Promise<ProfileData> {
  if (!API_BASE) throw new Error('API_NOT_CONFIGURED')
  const response = await fetch(`${API_BASE}/api/profile/${encodeURIComponent(username)}`)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`)
  return body as ProfileData
}
