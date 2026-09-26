import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Code2,
  Command,
  Copy,
  Database,
  Eye,
  EyeOff,
  Gamepad2,
  Gauge,
  GitCompareArrows,
  Globe2,
  Hash,
  History,
  Layers3,
  LayoutDashboard,
  Maximize2,
  Network,
  PackageSearch,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Shirt,
  Sparkles,
  Trophy,
  UserRoundCheck,
  UserRoundPlus,
  UsersRound,
  WandSparkles,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { apiConfigured, getHealth, getProfile, searchUsers } from './lib/api'
import { mockProfile } from './lib/mock'
import type {
  AvatarAsset,
  Experience,
  FriendProfile,
  ProfileData,
  SearchResult,
} from './lib/types'
import { Panel } from './components/Panel'
import { StatCard } from './components/StatCard'

const tabs = [
  'Overview',
  'Avatar',
  'Social',
  'Groups',
  'Creations',
  'Badges',
  'Inventory',
  'History',
  'Raw Data',
] as const

type Tab = (typeof tabs)[number]
type ApiState = 'checking' | 'online' | 'offline' | 'unconfigured'

const tabIcons: Record<Tab, LucideIcon> = {
  Overview: LayoutDashboard,
  Avatar: Shirt,
  Social: Network,
  Groups: Layers3,
  Creations: Gamepad2,
  Badges: Trophy,
  Inventory: PackageSearch,
  History: History,
  'Raw Data': Code2,
}

const compact = (n: number) =>
  new Intl.NumberFormat('en-US', {
    notation: Math.abs(n) >= 100000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(n)
const exact = (n: number) => new Intl.NumberFormat('en-US').format(n)
const date = (value?: string) => (value ? new Date(value).toLocaleDateString() : 'Unknown')

function ageParts(created: string) {
  const start = new Date(created).getTime()
  const days = Math.max(0, Math.floor((Date.now() - start) / 86400000))
  return { days, years: days / 365.2425 }
}

function presenceLabel(profile: ProfileData) {
  switch (profile.presence?.userPresenceType) {
    case 1:
      return { label: 'Online', tone: 'online' }
    case 2:
      return { label: 'In experience', tone: 'game' }
    case 3:
      return { label: 'In Studio', tone: 'studio' }
    case 0:
      return { label: 'Offline', tone: 'offline' }
    default:
      return { label: 'Unknown', tone: 'unknown' }
  }
}

function moduleCoverage(profile: ProfileData) {
  const values = Object.values(profile.modules ?? {})
  if (!values.length) return 0
  return Math.round((values.filter((item) => item.ok).length / values.length) * 100)
}

export default function App() {
  const [query, setQuery] = useState('')
  const [profile, setProfile] = useState<ProfileData>(mockProfile)
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [demo, setDemo] = useState(true)
  const [apiState, setApiState] = useState<ApiState>(apiConfigured ? 'checking' : 'unconfigured')
  const [suggestions, setSuggestions] = useState<SearchResult[]>([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [recent, setRecent] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const activeRequest = useRef<AbortController | null>(null)
  const age = useMemo(() => ageParts(profile.created), [profile.created])
  const presence = useMemo(() => presenceLabel(profile), [profile])
  const coverage = useMemo(() => moduleCoverage(profile), [profile])

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('luxintel.recent') || '[]') as string[]
    setRecent(Array.isArray(saved) ? saved.slice(0, 6) : [])

    if (apiConfigured) {
      getHealth()
        .then(() => setApiState('online'))
        .catch(() => setApiState('offline'))
    }

    const params = new URLSearchParams(window.location.search)
    const initialUser = params.get('user')
    const initialTab = params.get('tab') as Tab | null
    if (initialTab && tabs.includes(initialTab)) setActiveTab(initialTab)
    if (initialUser && apiConfigured) {
      setQuery(initialUser)
      void runSearch(initialUser, false)
    }

    const keyHandler = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (event.key === 'Escape') {
        setSuggestionsOpen(false)
        setCompareOpen(false)
      }
    }
    window.addEventListener('keydown', keyHandler)
    return () => window.removeEventListener('keydown', keyHandler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!apiConfigured || query.trim().length < 2 || loading) {
      setSuggestions([])
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchUsers(query.replace(/^@/, ''), controller.signal)
        .then((results) => {
          setSuggestions(results)
          setSuggestionsOpen(results.length > 0)
        })
        .catch(() => setSuggestions([]))
    }, 260)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query, loading])

  useEffect(() => {
    if (demo) return
    const params = new URLSearchParams(window.location.search)
    params.set('user', profile.name)
    params.set('tab', activeTab)
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
  }, [activeTab, demo, profile.name])

  function addRecent(username: string) {
    const next = [username, ...recent.filter((item) => item.toLowerCase() !== username.toLowerCase())].slice(0, 6)
    setRecent(next)
    localStorage.setItem('luxintel.recent', JSON.stringify(next))
  }

  async function runSearch(input: string, pushUrl = true) {
    const username = input.trim().replace(/^@/, '')
    if (!username) return
    setSuggestionsOpen(false)
    setError('')
    if (!apiConfigured) {
      setError('Live API is not connected. Set VITE_API_BASE_URL to your deployed Lux Intel Worker URL.')
      return
    }

    activeRequest.current?.abort()
    const controller = new AbortController()
    activeRequest.current = controller

    try {
      setLoading(true)
      const data = await getProfile(username, controller.signal)
      setProfile(data)
      setQuery(data.name)
      setDemo(false)
      const sharedTab = !pushUrl
        ? (new URLSearchParams(window.location.search).get('tab') as Tab | null)
        : null
      setActiveTab(sharedTab && tabs.includes(sharedTab) ? sharedTab : 'Overview')
      setApiState('online')
      addRecent(data.name)
      if (pushUrl) {
        const params = new URLSearchParams()
        params.set('user', data.name)
        params.set('tab', 'Overview')
        window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`)
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Unable to load this Roblox profile.')
    } finally {
      if (activeRequest.current === controller) setLoading(false)
    }
  }

  async function search(event: FormEvent) {
    event.preventDefault()
    await runSearch(query)
  }

  function chooseSuggestion(user: SearchResult) {
    setQuery(user.name)
    setSuggestionsOpen(false)
    void runSearch(user.name)
  }

  function handleSearchKeys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') setSuggestionsOpen(false)
  }

  async function shareProfile() {
    const url = new URL(window.location.href)
    if (!demo) {
      url.searchParams.set('user', profile.name)
      url.searchParams.set('tab', activeTab)
    }
    await navigator.clipboard.writeText(url.toString())
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="grid-glow" />

      <nav className="topbar">
        <button className="brand brand-button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="brand-mark">L</div>
          <div>
            <b>Lux Intel</b>
            <span>ROBLOX PROFILE & AVATAR EXPLORER</span>
          </div>
        </button>
        <div className="top-actions">
          <ApiBadge state={apiState} />
          <button className="quiet-button" onClick={() => setCompareOpen(true)} disabled={demo}>
            <GitCompareArrows size={16} /> Compare
          </button>
          <button className="icon-button" title="Copy share link" onClick={shareProfile}>
            {copied ? <CheckCircle2 size={18} /> : <Share2 size={18} />}
          </button>
        </div>
      </nav>

      <section className={`hero ${demo ? '' : 'hero-compact'}`}>
        <div className="hero-copy">
          <span className="pill"><Sparkles size={14} /> PROFILE & AVATAR EXPLORER</span>
          <h1>
            Meet the player
            <br />
            <em>behind the avatar.</em>
          </h1>
          <p>
            Explore a player’s avatar, saved looks, community, creations, achievements, and public
            profile details in one place.
          </p>
        </div>

        <div className="search-zone">
          <form className="search-card" onSubmit={search}>
            <Search size={21} />
            <input
              ref={searchRef}
              value={query}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
              onFocus={() => suggestions.length && setSuggestionsOpen(true)}
              onKeyDown={handleSearchKeys}
              placeholder="Search a Roblox username"
              autoComplete="off"
              aria-label="Roblox username"
            />
            <span className="shortcut"><Command size={12} /> K</span>
            <button disabled={loading || !query.trim()}>
              {loading ? <><RefreshCw size={16} className="spin" /> Scanning</> : <>Analyze <ChevronRight size={17} /></>}
            </button>
          </form>

          {suggestionsOpen && (
            <div className="search-popover">
              <div className="popover-label">USER RESULTS</div>
              {suggestions.map((user) => (
                <button key={user.id} className="search-result" onClick={() => chooseSuggestion(user)}>
                  <AvatarImage src={user.avatarHeadshot} alt="" className="search-avatar" />
                  <span><b>{user.displayName}</b><small>@{user.name}</small></span>
                  {user.hasVerifiedBadge && <BadgeCheck size={16} className="verified" />}
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
          )}

          {demo && recent.length > 0 && (
            <div className="recent-row">
              <span>Recent</span>
              {recent.map((username) => (
                <button key={username} onClick={() => void runSearch(username)}>@{username}</button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="notice error-notice">
            <AlertTriangle size={17} />
            <div><b>Profile scan failed</b><span>{error}</span></div>
            <button onClick={() => setError('')}><X size={16} /></button>
          </div>
        )}
      </section>

      {loading && <LoadingStrip />}

      <section className="profile-card">
        <div className="profile-backdrop" aria-hidden="true"><img src={profile.avatarFullBody} alt="" /></div>
        {demo && <div className="demo-badge">PREVIEW</div>}
        <div className="avatar-wrap">
          <AvatarImage src={profile.avatarHeadshot} alt={`${profile.name} avatar`} />
          <span className="avatar-ring" />
          <span className={`presence-dot ${presence.tone}`} />
        </div>
        <div className="identity">
          <div className="name-row">
            <h2>{profile.displayName}</h2>
            {profile.hasVerifiedBadge && <BadgeCheck size={22} className="verified" />}
          </div>
          <p>@{profile.name}</p>
          <div className="identity-meta">
            <span><CircleUserRound size={14} /> ID {profile.id}</span>
            <span><CalendarDays size={14} /> Joined {date(profile.created)}</span>
            <span className={`presence-text ${presence.tone}`}><Activity size={14} /> {presence.label}</span>
          </div>
        </div>
        <div className="profile-actions">
          <button className="quiet-button avatar-shortcut" onClick={() => { setActiveTab('Avatar'); document.querySelector('.workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>
            <Shirt size={15} /> Explore avatar
          </button>
          {!demo && (
            <a className="quiet-button" href={`https://www.roblox.com/users/${profile.id}/profile`} target="_blank" rel="noreferrer">
              Roblox profile <ArrowUpRight size={15} />
            </a>
          )}
          <div className="profile-side">
            <span className="scan-label"><Gauge size={14} /> DATA COVERAGE</span>
            <b>{coverage}%</b>
            <small>Fetched {new Date(profile.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard icon={UsersRound} label="Friends" value={compact(profile.friendCount)} hint={`${exact(profile.friendCount)} total`} />
        <StatCard icon={UserRoundPlus} label="Followers" value={compact(profile.followerCount)} hint={`${exact(profile.followerCount)} total`} />
        <StatCard icon={UserRoundCheck} label="Following" value={compact(profile.followingCount)} hint={`${exact(profile.followingCount)} total`} />
        <StatCard icon={Clock3} label="Account age" value={`${age.years.toFixed(1)} yr`} hint={`${exact(age.days)} days`} />
        <StatCard icon={Layers3} label="Groups" value={exact(profile.groups.length)} hint="Public memberships" />
        <StatCard icon={Gamepad2} label="Experiences" value={exact(profile.experiences.length)} hint="User + owned groups" />
      </section>

      <section className="workspace">
        <aside className="side-nav">
          <div className="side-label">PROFILE</div>
          {tabs.map((tab) => {
            const Icon = tabIcons[tab]
            return (
              <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
                <Icon size={16} /><span>{tab}</span>
                {tab === 'Avatar' && profile.avatar.assets.length > 0 && <small>{profile.avatar.assets.length}</small>}
                {tab === 'Groups' && profile.groups.length > 0 && <small>{profile.groups.length}</small>}
                {tab === 'Badges' && profile.robloxBadges.length > 0 && <small>{profile.robloxBadges.length}</small>}
              </button>
            )
          })}
          <div className="side-health">
            <span className="eyebrow">SCAN QUALITY</span>
            <div className="coverage-bar"><i style={{ width: `${coverage}%` }} /></div>
            <small>{coverage}% of modules responded</small>
          </div>
        </aside>

        <div className="workspace-content">
          <div className="mobile-tabs">
            {tabs.map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={activeTab === tab ? 'active' : ''}>{tab}</button>)}
          </div>
          {activeTab === 'Overview' && <Overview profile={profile} ageDays={age.days} coverage={coverage} />}
          {activeTab === 'Avatar' && <AvatarTab profile={profile} />}
          {activeTab === 'Social' && <SocialTab profile={profile} />}
          {activeTab === 'Groups' && <GroupsTab profile={profile} />}
          {activeTab === 'Creations' && <CreationsTab profile={profile} />}
          {activeTab === 'Badges' && <BadgesTab profile={profile} />}
          {activeTab === 'Inventory' && <InventoryTab profile={profile} />}
          {activeTab === 'History' && <HistoryTab profile={profile} />}
          {activeTab === 'Raw Data' && <RawTab profile={profile} />}
        </div>
      </section>

      <footer>
        <div className="brand compact"><div className="brand-mark">L</div><b>Lux Intel</b></div>
        <p>Public Roblox profile intelligence. No .ROBLOSECURITY cookies. Not affiliated with Roblox Corporation.</p>
        <span>V0.3</span>
      </footer>

      {compareOpen && !demo && (
        <CompareDialog base={profile} onClose={() => setCompareOpen(false)} />
      )}
    </main>
  )
}

function ApiBadge({ state }: { state: ApiState }) {
  const labels: Record<ApiState, string> = {
    checking: 'Checking API',
    online: 'Live API',
    offline: 'API unavailable',
    unconfigured: 'API not configured',
  }
  return (
    <span className={`api-badge ${state}`}>
      {state === 'online' ? <Wifi size={14} /> : state === 'checking' ? <RefreshCw size={14} className="spin" /> : <WifiOff size={14} />}
      {labels[state]}
    </span>
  )
}

function AvatarImage({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  if (!src || failed) {
    return <div className={`avatar-fallback ${className}`} aria-label={alt}><CircleUserRound size={28} /></div>
  }
  return <img className={className} src={src} alt={alt} onError={() => setFailed(true)} />
}

function LoadingStrip() {
  return (
    <div className="loading-strip">
      <span />
      <div><RefreshCw size={14} className="spin" /><b>Building live profile overview</b><small>Roblox endpoints are being aggregated by the Worker.</small></div>
    </div>
  )
}

function Overview({ profile, ageDays, coverage }: { profile: ProfileData; ageDays: number; coverage: number }) {
  const ratio = profile.followingCount ? profile.followerCount / profile.followingCount : profile.followerCount
  const presence = presenceLabel(profile)
  const unavailable = Object.entries(profile.modules ?? {}).filter(([, value]) => !value.ok)
  const promotionEntries = Object.entries(profile.promotionChannels ?? {}).filter(([, value]) => typeof value === 'string' && value.trim()) as Array<[string, string]>

  return (
    <section className="content-grid">
      <Panel title="At a glance" subtitle="The important parts of this account in one place" className="wide">
        <div className="overview-layout">
          <div className="description-block">
            <span className="eyebrow">ABOUT</span>
            <p>{profile.description || 'This user has no public profile description.'}</p>
          </div>
          <div className="mini-metrics">
            <Metric label="Account days" value={exact(ageDays)} />
            <Metric label="Follower ratio" value={`${ratio.toFixed(ratio >= 100 ? 0 : 1)}×`} />
            <Metric label="Past usernames" value={String(profile.usernameHistory.length)} />
            <Metric label="Coverage" value={`${coverage}%`} />
          </div>
        </div>
      </Panel>

      <Panel title="Current status" subtitle="Latest presence information reported by Roblox">
        <div className="status-card">
          <span className={`big-status-dot ${presence.tone}`} />
          <div><span className="eyebrow">PRESENCE</span><h3>{presence.label}</h3><p>{profile.presence?.lastLocation || 'No public location information returned.'}</p></div>
        </div>
        {profile.presence?.lastOnline && <div className="inline-detail"><span>Last online</span><b>{new Date(profile.presence.lastOnline).toLocaleString()}</b></div>}
      </Panel>

      <Panel title="Account signals" subtitle="Useful identity and platform indicators">
        <div className="signal-list">
          <Signal icon={profile.hasVerifiedBadge ? BadgeCheck : CircleUserRound} label="Verified badge" value={profile.hasVerifiedBadge ? 'Verified' : 'Not verified'} good={Boolean(profile.hasVerifiedBadge)} />
          <Signal icon={ShieldCheck} label="Account status" value={profile.isBanned ? 'Banned' : 'Active'} good={!profile.isBanned} />
          <Signal icon={Eye} label="Inventory visibility" value={profile.inventory.canView === false ? 'Private' : profile.inventory.canView === true ? 'Public' : 'Unknown'} good={profile.inventory.canView === true} />
          <Signal icon={Trophy} label="Earned badges" value={`${profile.experienceBadges.length} in scan`} good={profile.experienceBadges.length > 0} />
        </div>
      </Panel>

      <Panel title="Public links" subtitle="Promotion channels published on this Roblox profile">
        {promotionEntries.length ? (
          <div className="promo-grid">
            {promotionEntries.map(([name, value]) => {
              const isUrl = /^https?:\/\//i.test(value)
              const content = <><Globe2 size={16} /><span><small>{humanize(name)}</small><b>{value.replace(/^https?:\/\/(www\.)?/i, '')}</b></span>{isUrl && <ArrowUpRight size={14} />}</>
              return isUrl ? <a key={name} className="promo-link" href={value} target="_blank" rel="noreferrer">{content}</a> : <div key={name} className="promo-link">{content}</div>
            })}
          </div>
        ) : <EmptyState icon={Globe2} title="No public links" text={profile.modules.promotion?.message || 'This user has not published promotion channels on their Roblox profile.'} />}
      </Panel>

      <Panel title="Identity timeline" subtitle="Roblox exposes username order, but not rename timestamps" className="wide">
        <div className="timeline">
          <Timeline date={new Date(profile.created).getFullYear().toString()} title="Account created" detail={date(profile.created)} />
          {[...profile.usernameHistory].reverse().slice(-5).map((item, index) => (
            <Timeline key={`${item.name}-${index}`} date="Past" title={`@${item.name}`} detail="Previous username" />
          ))}
          <Timeline date="Now" title={`@${profile.name}`} detail={`Snapshot captured ${new Date(profile.fetchedAt).toLocaleString()}`} active />
        </div>
      </Panel>

      <Panel title="Data health" subtitle="You can tell the difference between empty data and a failed endpoint">
        <div className="module-health-list">
          {Object.entries(profile.modules ?? {}).map(([name, value]) => (
            <div className="module-health" key={name}>
              {value.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span><b>{name}</b><small>{value.message || (value.ok ? 'Live data loaded' : 'Endpoint unavailable')}</small></span>
            </div>
          ))}
        </div>
        {unavailable.length === 0 && <div className="success-note"><Zap size={15} /> All profile modules responded.</div>}
      </Panel>
    </section>
  )
}

function AvatarTab({ profile }: { profile: ProfileData }) {
  const [selectedOutfit, setSelectedOutfit] = useState<number | null>(null)
  const [camera, setCamera] = useState<'full' | 'headshot'>('full')
  const [viewerOpen, setViewerOpen] = useState(false)
  const grouped = useMemo(() => {
    const groups = new Map<string, AvatarAsset[]>()
    for (const asset of profile.avatar.assets ?? []) {
      const type = asset.assetType?.name || 'Other'
      groups.set(type, [...(groups.get(type) ?? []), asset])
    }
    return [...groups.entries()]
  }, [profile.avatar.assets])
  const outfit = profile.avatar.outfits.find((item) => item.id === selectedOutfit)
  const avatarImage = outfit?.thumbnailUrl || (camera === 'headshot' ? profile.avatarHeadshot : profile.avatarFullBody)
  const avatarLabel = outfit?.name || (camera === 'headshot' ? 'Headshot' : 'Current avatar')

  return (
    <section className="content-grid">
      <Panel title="Avatar studio" subtitle="Explore the current look and saved outfit previews" className="avatar-panel wide">
        <div className="full-avatar">
          <div className="avatar-stage-wrap">
            <div className="avatar-stage" data-camera={camera}>
              <span className="stage-kicker"><Sparkles size={13} /> {outfit ? 'SAVED OUTFIT' : 'LIVE AVATAR'}</span>
              <AvatarImage src={avatarImage} alt={`${profile.name} ${avatarLabel}`} />
              <button className="stage-expand" onClick={() => setViewerOpen(true)} aria-label="Expand avatar viewer" title="Expand viewer"><Maximize2 size={16} /></button>
            </div>
            <div className="viewer-controls" aria-label="Avatar view">
              <button className={!outfit && camera === 'full' ? 'active' : ''} aria-pressed={!outfit && camera === 'full'} onClick={() => { setSelectedOutfit(null); setCamera('full') }}>Full avatar</button>
              <button className={!outfit && camera === 'headshot' ? 'active' : ''} aria-pressed={!outfit && camera === 'headshot'} onClick={() => { setSelectedOutfit(null); setCamera('headshot') }}>Headshot</button>
              {outfit && <button className="active" aria-pressed="true" onClick={() => setSelectedOutfit(null)}>Current look</button>}
            </div>
          </div>
          <div className="avatar-summary">
            <span className="eyebrow">NOW VIEWING · {avatarLabel.toUpperCase()}</span>
            <h3>{outfit?.name || profile.avatar.playerAvatarType || 'Unknown rig'}</h3>
            <p>{outfit ? 'A public saved outfit preview from this profile.' : `${profile.avatar.assets.length} equipped assets are visible in the current avatar response.`}</p>
            <div className="summary-chips">
              <span><Boxes size={14} /> {profile.avatar.assets.length} assets</span>
              <span><WandSparkles size={14} /> {profile.avatar.emotes?.length || 0} emotes</span>
              <span><Gauge size={14} /> {Object.keys(profile.avatar.scales ?? {}).length} scales</span>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Equipped assets" subtitle="Grouped by Roblox avatar asset type" className="wide">
        {grouped.length ? (
          <div className="asset-groups">
            {grouped.map(([type, assets]) => (
              <section className="asset-group" key={type}>
                <header><span>{type}</span><small>{assets.length}</small></header>
                <div>
                  {assets.map((asset) => (
                    <a key={asset.id} className="asset-row" href={`https://www.roblox.com/catalog/${asset.id}`} target="_blank" rel="noreferrer">
                      <div className="asset-icon"><Hash size={14} /></div>
                      <span><b>{asset.name || `Asset ${asset.id}`}</b><small>ID {asset.id}</small></span>
                      <ArrowUpRight size={14} />
                    </a>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : <EmptyState icon={Shirt} title="No avatar assets returned" text={profile.modules.avatar?.message || 'Roblox did not return a current avatar definition for this profile.'} />}
      </Panel>

      <Panel title="Body settings" subtitle="Public avatar scales and body color IDs">
        <div className="key-value-list">
          {Object.entries(profile.avatar.scales ?? {}).map(([key, value]) => <div key={key}><span>{humanize(key)}</span><b>{Number(value).toFixed(2)}</b></div>)}
          {!Object.keys(profile.avatar.scales ?? {}).length && <span className="muted">No scale values returned.</span>}
        </div>
      </Panel>

      <Panel title="Body colors" subtitle="Roblox BrickColor identifiers">
        <div className="key-value-list">
          {Object.entries(profile.avatar.bodyColors ?? {}).map(([key, value]) => <div key={key}><span>{humanize(key)}</span><b>{String(value)}</b></div>)}
          {!Object.keys(profile.avatar.bodyColors ?? {}).length && <span className="muted">No body colors returned.</span>}
        </div>
      </Panel>

      <Panel title="Saved outfit gallery" subtitle={`${profile.avatar.outfits.length} public avatar outfits · select one to preview it`} className="wide">
        {profile.avatar.outfits.length ? (
          <div className="outfit-grid">
            {profile.avatar.outfits.map((outfit) => (
              <button className={`outfit-card ${selectedOutfit === outfit.id ? 'selected' : ''}`} key={outfit.id} onClick={() => { setSelectedOutfit(outfit.id); setCamera('full') }} aria-pressed={selectedOutfit === outfit.id} disabled={!outfit.thumbnailUrl} title={outfit.thumbnailUrl ? `Preview ${outfit.name}` : 'Roblox did not return a preview for this outfit'}>
                <div className="outfit-thumb">{outfit.thumbnailUrl ? <img src={outfit.thumbnailUrl} alt={`${outfit.name} outfit`} /> : <><Shirt size={26} /><span>Preview unavailable</span></>}</div>
                <div><b>{outfit.name}</b><small>{outfit.outfitType || 'Saved outfit'}</small></div>
              </button>
            ))}
          </div>
        ) : <EmptyState icon={Shirt} title="No saved outfits returned" text={profile.modules.outfits?.message || 'Roblox returned no public saved outfits for this account.'} />}
        {profile.avatar.outfitsHasMore && <div className="info-note">Showing the first 50 public outfits. More are available upstream.</div>}
      </Panel>
      {viewerOpen && <AvatarViewerDialog src={avatarImage} alt={`${profile.displayName} · ${avatarLabel}`} onClose={() => setViewerOpen(false)} />}
    </section>
  )
}

function AvatarViewerDialog({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="modal-backdrop viewer-backdrop" role="presentation" onMouseDown={(event: MouseEvent<HTMLDivElement>) => event.target === event.currentTarget && onClose()}>
      <section className="avatar-viewer-modal" role="dialog" aria-modal="true" aria-label="Avatar preview">
        <header><div><span className="eyebrow">AVATAR VIEWER</span><h2>{alt}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close avatar viewer"><X size={18} /></button></header>
        <div className="avatar-viewer-image"><AvatarImage src={src} alt={alt} /></div>
        <p>Preview of the public Roblox avatar image returned for this profile.</p>
      </section>
    </div>
  )
}

function SocialTab({ profile }: { profile: ProfileData }) {
  return (
    <section className="content-grid">
      <Panel title="Social overview" subtitle="Public relationship counts" className="wide">
        <div className="large-metrics">
          <Metric label="Friends" value={exact(profile.friendCount)} />
          <Metric label="Followers" value={exact(profile.followerCount)} />
          <Metric label="Following" value={exact(profile.followingCount)} />
          <Metric label="Follower / following" value={profile.followingCount ? `${(profile.followerCount / profile.followingCount).toFixed(2)}×` : '—'} />
        </div>
      </Panel>

      <Panel title="Friends" subtitle={`${profile.friends.length} public friend records returned`} className="wide">
        {profile.friends.length ? (
          <div className="people-grid">
            {profile.friends.slice(0, 48).map((friend) => <FriendCard key={friend.id} friend={friend} />)}
          </div>
        ) : <EmptyState icon={UsersRound} title="No friends returned" text={profile.modules.social?.message || 'This profile currently has no public friend records in the scan.'} />}
      </Panel>
    </section>
  )
}

function FriendCard({ friend }: { friend: FriendProfile }) {
  return (
    <a className="person-card" href={`?user=${encodeURIComponent(friend.name)}&tab=Overview`}>
      <AvatarImage src={friend.avatarHeadshot} alt={`${friend.name} avatar`} />
      <span><b>{friend.displayName}</b><small>@{friend.name}</small></span>
      {friend.hasVerifiedBadge && <BadgeCheck size={15} className="verified" />}
    </a>
  )
}

function GroupsTab({ profile }: { profile: ProfileData }) {
  return (
    <section className="content-grid one-column">
      <Panel title="Primary group" subtitle="The community selected as this user's primary group">
        {profile.primaryGroup?.group ? (
          <a className="primary-group-card" href={`https://www.roblox.com/communities/${profile.primaryGroup.group.id}`} target="_blank" rel="noreferrer">
            <div className="primary-group-icon">{profile.primaryGroup.group.name.slice(0, 1).toUpperCase()}</div>
            <div><span className="eyebrow">PRIMARY COMMUNITY</span><h3>{profile.primaryGroup.group.name}</h3><p>{profile.primaryGroup.role?.name || 'Member'} · Rank {profile.primaryGroup.role?.rank ?? '—'}</p></div>
            <ArrowUpRight size={16} />
          </a>
        ) : <EmptyState icon={Layers3} title="No primary group" text={profile.modules.primaryGroup?.message || 'Roblox did not return a primary community for this user.'} />}
      </Panel>

      <Panel title="Group memberships" subtitle={`${profile.groups.length} public memberships and roles`}>
        {profile.groups.length ? (
          <div className="table">
            {profile.groups.map((entry) => (
              <a className="table-row" key={entry.group.id} href={`https://www.roblox.com/communities/${entry.group.id}`} target="_blank" rel="noreferrer">
                <div className="group-icon">{entry.group.name.slice(0, 1).toUpperCase()}</div>
                <div><b>{entry.group.name}</b><span>ID {entry.group.id}</span></div>
                <div><span className="eyebrow">ROLE</span><b>{entry.role.name}</b></div>
                <div><span className="eyebrow">RANK</span><b>{entry.role.rank}</b></div>
                <div><span className="eyebrow">MEMBERS</span><b>{entry.group.memberCount == null ? '—' : compact(entry.group.memberCount)}</b></div>
                <ArrowUpRight size={14} />
              </a>
            ))}
          </div>
        ) : <EmptyState icon={Layers3} title="No groups returned" text={profile.modules.groups?.message || 'No public group memberships were returned by Roblox.'} />}
      </Panel>
    </section>
  )
}

function CreationsTab({ profile }: { profile: ProfileData }) {
  const totalVisits = profile.experiences.reduce((sum, game) => sum + Number(game.visits || 0), 0)
  const totalPlaying = profile.experiences.reduce((sum, game) => sum + Number(game.playing || 0), 0)
  const personal = profile.experiences.filter((game) => game.source === 'user').length
  const groupOwned = profile.experiences.filter((game) => game.source === 'group').length

  return (
    <section className="content-grid">
      <Panel title="Creator summary" subtitle="Public user-owned and owned-group experiences" className="wide">
        <div className="large-metrics">
          <Metric label="Experiences" value={exact(profile.experiences.length)} />
          <Metric label="Total visits" value={compact(totalVisits)} />
          <Metric label="Playing now" value={compact(totalPlaying)} />
          <Metric label="Personal / group" value={`${personal} / ${groupOwned}`} />
        </div>
      </Panel>

      <Panel title="Experiences" subtitle="Creator metadata enriched with live game detail" className="wide">
        {profile.experiences.length ? (
          <div className="experience-grid">
            {profile.experiences.map((game) => <ExperienceCard key={`${game.id}-${game.source}`} game={game} />)}
          </div>
        ) : <EmptyState icon={Gamepad2} title="No public experiences found" text={profile.modules.experiences?.message || 'Roblox returned no public experiences owned directly by this user or groups they own.'} />}
      </Panel>
    </section>
  )
}

function ExperienceCard({ game }: { game: Experience }) {
  const placeId = game.rootPlace?.id
  return (
    <a className="experience-card" href={placeId ? `https://www.roblox.com/games/${placeId}` : `https://www.roblox.com/games/?Keyword=${encodeURIComponent(game.name)}`} target="_blank" rel="noreferrer">
      <div className="experience-thumb">
        {game.iconUrl ? <img src={game.iconUrl} alt="" /> : <Gamepad2 size={28} />}
        <span className="source-chip">{game.source === 'group' ? game.sourceName || 'Group' : 'Personal'}</span>
      </div>
      <div className="experience-body">
        <h3>{game.name}</h3>
        <p>{game.description || 'No public description.'}</p>
        <div className="experience-stats">
          <span><Activity size={13} /> {compact(Number(game.playing || 0))}</span>
          <span><Eye size={13} /> {compact(Number(game.visits || 0))}</span>
          <span><UsersRound size={13} /> {exact(Number(game.maxPlayers || 0))} max</span>
        </div>
      </div>
    </a>
  )
}

function BadgesTab({ profile }: { profile: ProfileData }) {
  return (
    <section className="content-grid one-column">
      <Panel title="Roblox platform badges" subtitle="Account-level badges such as legacy platform awards">
        {profile.robloxBadges.length ? (
          <div className="badge-grid">
            {profile.robloxBadges.map((badge) => (
              <article className="badge-card" key={badge.id}>
                <div className="badge-image">{badge.imageUrl ? <img src={badge.imageUrl} alt="" /> : <Trophy size={24} />}</div>
                <div><span className="eyebrow">ROBLOX BADGE</span><h3>{badge.name}</h3><p>{badge.description || 'No description returned.'}</p></div>
              </article>
            ))}
          </div>
        ) : <EmptyState icon={Trophy} title="No Roblox platform badges returned" text={profile.modules.badges?.message || 'This account has no platform badges in the public response.'} />}
      </Panel>

      <Panel title="Earned experience badges" subtitle={`${profile.experienceBadges.length} most recent public badge records`}>
        {profile.experienceBadges.length ? (
          <div className="badge-grid experience-badge-grid">
            {profile.experienceBadges.map((badge) => (
              <article className="badge-card" key={badge.id}>
                <div className="badge-image">{badge.imageUrl ? <img src={badge.imageUrl} alt="" /> : <Trophy size={24} />}</div>
                <div>
                  <span className="eyebrow">{badge.awardingUniverse?.name || 'EXPERIENCE BADGE'}</span>
                  <h3>{badge.displayName || badge.name || `Badge ${badge.id}`}</h3>
                  <p>{badge.displayDescription || badge.description || 'No description returned.'}</p>
                  {badge.awardedDate && <small className="badge-date">Awarded {new Date(badge.awardedDate).toLocaleDateString()}</small>}
                </div>
              </article>
            ))}
          </div>
        ) : <EmptyState icon={Trophy} title="No earned experience badges returned" text={profile.modules.experienceBadges?.message || 'No public earned badge records were returned for this account.'} />}
        {profile.experienceBadgesHasMore && <div className="info-note">Showing the first 100 earned badge records. More are available upstream.</div>}
      </Panel>
    </section>
  )
}

function InventoryTab({ profile }: { profile: ProfileData }) {
  const inventory = profile.inventory
  return (
    <section className="content-grid">
      <Panel title="Inventory access" subtitle="Visibility and scanner capability">
        <div className="inventory-status">
          <div className={`inventory-icon ${inventory.canView === false ? 'private' : 'public'}`}>
            {inventory.canView === false ? <EyeOff size={26} /> : <Eye size={26} />}
          </div>
          <div>
            <span className="eyebrow">PUBLIC INVENTORY</span>
            <h3>{inventory.canView === false ? 'Private' : inventory.canView === true ? 'Visible' : 'Unknown'}</h3>
            <p>{inventory.canView === false ? 'Roblox blocks public inventory enumeration for this account.' : 'Public inventory endpoints can be inspected for this account.'}</p>
          </div>
        </div>
      </Panel>

      <Panel title="Deep inventory API" subtitle="Optional Roblox Open Cloud enhancement">
        <div className="cloud-status">
          <Database size={22} />
          <div><h3>{inventory.openCloudConfigured ? 'Connected' : 'Optional key not configured'}</h3><p>{inventory.openCloudConfigured ? 'The Worker can use Open Cloud inventory-item data.' : 'The public scanner still works. Add ROBLOX_OPEN_CLOUD_API_KEY to the Worker only if you want deeper inventory enumeration.'}</p></div>
          <span className={inventory.openCloudConfigured ? 'connected' : ''}>{inventory.openCloudConfigured ? 'ON' : 'OFF'}</span>
        </div>
      </Panel>

      <Panel title="Collectibles" subtitle={`${inventory.collectibles.length} collectible records in this scan`} className="wide">
        {inventory.canView === false ? (
          <EmptyState icon={EyeOff} title="Inventory is private" text="Lux Intel respects Roblox inventory visibility and will not attempt to bypass it." />
        ) : inventory.collectibles.length ? (
          <div className="collectible-grid">
            {inventory.collectibles.slice(0, 100).map((item, index) => (
              <a className="collectible-card" key={`${item.assetId || index}-${index}`} href={item.assetId ? `https://www.roblox.com/catalog/${item.assetId}` : undefined} target="_blank" rel="noreferrer">
                <div className="collectible-icon"><PackageSearch size={18} /></div>
                <span><b>{item.name || `Asset ${item.assetId || 'Unknown'}`}</b><small>{item.recentAveragePrice != null ? `RAP ${exact(item.recentAveragePrice)}` : item.assetId ? `ID ${item.assetId}` : 'Collectible'}</small></span>
                {item.assetId && <ArrowUpRight size={13} />}
              </a>
            ))}
          </div>
        ) : <EmptyState icon={PackageSearch} title="No collectible records returned" text="The account may not own public collectible assets, or Roblox may have returned an empty inventory page." />}
        {inventory.collectiblesHasMore && <div className="info-note">This scan shows the first 100 collectible records. More pages are available upstream.</div>}
      </Panel>
    </section>
  )
}

function HistoryTab({ profile }: { profile: ProfileData }) {
  const names = [profile.name, ...profile.usernameHistory.map((item) => item.name)]
  return (
    <section className="content-grid">
      <Panel title="Username history" subtitle="Current name followed by Roblox's previous-name order" className="wide">
        {profile.usernameHistory.length ? (
          <div className="name-history">
            {names.map((name, index) => (
              <div key={`${name}-${index}`} className={index === 0 ? 'current' : ''}>
                <span>{index === 0 ? 'NOW' : `-${index}`}</span><i />
                <div><small>{index === 0 ? 'CURRENT USERNAME' : 'PREVIOUS USERNAME'}</small><b>@{name}</b></div>
              </div>
            ))}
          </div>
        ) : <EmptyState icon={History} title="No previous usernames" text={profile.modules.history?.message || 'Roblox returned an empty username-history list for this account.'} />}
      </Panel>
      <Panel title="About timestamps" subtitle="Why exact rename dates are not shown">
        <div className="explain-card"><Clock3 size={20} /><p>The public username-history response provides names and ordering, but it does not provide the date each rename occurred. Lux Intel intentionally does not invent dates.</p></div>
      </Panel>
    </section>
  )
}

function RawTab({ profile }: { profile: ProfileData }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(JSON.stringify(profile, null, 2))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }
  return (
    <section className="content-grid one-column">
      <Panel title="Raw scan payload" subtitle="The normalized JSON received from the Lux Intel Worker" action={<button className="quiet-button" onClick={copy}>{copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}{copied ? 'Copied' : 'Copy JSON'}</button>}>
        <pre className="raw">{JSON.stringify(profile, null, 2)}</pre>
      </Panel>
    </section>
  )
}

function CompareDialog({ base, onClose }: { base: ProfileData; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [other, setOther] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      setLoading(true)
      setOther(await getProfile(query.trim().replace(/^@/, '')))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to compare this profile.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event: MouseEvent<HTMLDivElement>) => event.target === event.currentTarget && onClose()}>
      <section className="compare-modal" role="dialog" aria-modal="true" aria-label="Compare Roblox profiles">
        <header>
          <div><span className="eyebrow">PROFILE COMPARISON</span><h2>Compare with @{base.name}</h2></div>
          <button className="icon-button" onClick={onClose}><X size={18} /></button>
        </header>
        <form className="compare-search" onSubmit={submit}>
          <Search size={18} /><input value={query} onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)} placeholder="Second Roblox username" autoFocus /><button disabled={loading || !query.trim()}>{loading ? 'Loading…' : 'Compare'}</button>
        </form>
        {error && <div className="notice error-notice"><AlertTriangle size={16} /><span>{error}</span></div>}
        {other ? <Comparison base={base} other={other} /> : <EmptyState icon={GitCompareArrows} title="Choose another profile" text="Load a second public Roblox profile to compare account age, social totals, groups, badges, avatar assets, and creations." />}
      </section>
    </div>
  )
}

function Comparison({ base, other }: { base: ProfileData; other: ProfileData }) {
  const rows = [
    ['Followers', base.followerCount, other.followerCount],
    ['Following', base.followingCount, other.followingCount],
    ['Friends', base.friendCount, other.friendCount],
    ['Groups', base.groups.length, other.groups.length],
    ['Avatar assets', base.avatar.assets.length, other.avatar.assets.length],
    ['Roblox badges', base.robloxBadges.length, other.robloxBadges.length],
    ['Experiences', base.experiences.length, other.experiences.length],
    ['Account days', ageParts(base.created).days, ageParts(other.created).days],
  ] as const

  return (
    <div className="comparison">
      <div className="compare-head"><ProfileMini profile={base} /><span>VS</span><ProfileMini profile={other} /></div>
      <div className="compare-table">
        {rows.map(([label, left, right]) => (
          <div key={label}>
            <b className={left > right ? 'winner' : ''}>{compact(left)}</b>
            <span>{label}</span>
            <b className={right > left ? 'winner' : ''}>{compact(right)}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProfileMini({ profile }: { profile: ProfileData }) {
  return <div className="profile-mini"><AvatarImage src={profile.avatarHeadshot} alt="" /><span><b>{profile.displayName}</b><small>@{profile.name}</small></span></div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><b>{value}</b></div>
}

function Signal({ icon: Icon, label, value, good }: { icon: LucideIcon; label: string; value: string; good?: boolean }) {
  return <div className="signal"><div className={good ? 'good' : ''}><Icon size={16} /></div><span><small>{label}</small><b>{value}</b></span></div>
}

function Timeline({ date: timelineDate, title, detail, active = false }: { date: string; title: string; detail: string; active?: boolean }) {
  return <div className={`timeline-row ${active ? 'active' : ''}`}><span>{timelineDate}</span><i /><div><b>{title}</b><small>{detail}</small></div></div>
}

function EmptyState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return <div className="empty-state"><Icon size={26} /><h3>{title}</h3><p>{text}</p></div>
}

function humanize(value: string) {
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase())
}
