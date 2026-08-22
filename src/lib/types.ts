export type UsernameHistoryItem = { name: string }
export type GroupRole = {
  group: { id: number; name: string; memberCount?: number; hasVerifiedBadge?: boolean }
  role: { id: number; name: string; rank: number }
}
export type Experience = {
  id: number
  name: string
  description?: string
  rootPlace?: { id: number; name: string }
}
export type ProfileData = {
  id: number
  name: string
  displayName: string
  description: string
  created: string
  isBanned?: boolean
  hasVerifiedBadge?: boolean
  friendCount: number
  followerCount: number
  followingCount: number
  groups: GroupRole[]
  usernameHistory: UsernameHistoryItem[]
  avatarHeadshot: string
  avatarFullBody: string
  experiences: Experience[]
  fetchedAt: string
}
