export type ModuleStatus = {
  ok: boolean
  message?: string
}

export type UsernameHistoryItem = { name: string }

export type GroupRole = {
  group: {
    id: number
    name: string
    description?: string
    memberCount?: number
    hasVerifiedBadge?: boolean
  }
  role: { id: number; name: string; rank: number }
}

export type AvatarAsset = {
  id: number
  name: string
  assetType?: { id?: number; name?: string }
  currentVersionId?: number
  meta?: Record<string, unknown>
}

export type AvatarOutfit = {
  id: number
  name: string
  isEditable?: boolean
  outfitType?: string
  thumbnailUrl?: string
}

export type AvatarData = {
  playerAvatarType?: string
  assets: AvatarAsset[]
  scales?: Record<string, number>
  bodyColors?: Record<string, string | number>
  emotes?: Array<{ assetId?: number; assetName?: string; position?: number }>
  outfits: AvatarOutfit[]
  outfitsHasMore: boolean
}

export type PresenceData = {
  userPresenceType?: number
  lastLocation?: string
  placeId?: number | null
  rootPlaceId?: number | null
  gameId?: string | null
  universeId?: number | null
  lastOnline?: string | null
}

export type FriendProfile = {
  id: number
  name: string
  displayName: string
  hasVerifiedBadge?: boolean
  avatarHeadshot?: string
}

export type RobloxBadge = {
  id: number
  name: string
  description?: string
  imageUrl?: string
}

export type ExperienceBadge = {
  id: number
  name?: string
  displayName?: string
  description?: string
  displayDescription?: string
  enabled?: boolean
  iconImageId?: number
  displayIconImageId?: number
  awardedDate?: string
  imageUrl?: string
  awardingUniverse?: {
    id?: number
    name?: string
    rootPlaceId?: number
  }
}

export type Experience = {
  id: number
  name: string
  description?: string
  rootPlace?: { id: number; name?: string }
  playing?: number
  visits?: number
  maxPlayers?: number
  favoritedCount?: number
  created?: string
  updated?: string
  genre?: string
  iconUrl?: string
  creator?: { id?: number; name?: string; type?: string }
  source?: 'user' | 'group'
  sourceName?: string
}

export type Collectible = {
  assetId?: number
  name?: string
  recentAveragePrice?: number
  originalPrice?: number
  assetStock?: number
  buildersClubMembershipType?: number
}

export type InventorySummary = {
  canView: boolean | null
  categories: unknown[]
  collectibles: Collectible[]
  collectiblesHasMore: boolean
  openCloudConfigured: boolean
  openCloudPreview?: unknown[]
}

export type PromotionChannels = Record<string, string | null | undefined>

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
  primaryGroup: GroupRole | null
  usernameHistory: UsernameHistoryItem[]
  promotionChannels: PromotionChannels
  avatarHeadshot: string
  avatarFullBody: string
  avatar: AvatarData
  presence: PresenceData | null
  friends: FriendProfile[]
  robloxBadges: RobloxBadge[]
  experienceBadges: ExperienceBadge[]
  experienceBadgesHasMore: boolean
  inventory: InventorySummary
  experiences: Experience[]
  fetchedAt: string
  modules: Record<string, ModuleStatus>
}

export type SearchResult = {
  id: number
  name: string
  displayName: string
  hasVerifiedBadge?: boolean
  avatarHeadshot?: string
}
