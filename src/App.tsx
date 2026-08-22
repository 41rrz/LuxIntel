import { FormEvent, useMemo, useState } from 'react'
import {
  Activity, BadgeCheck, Boxes, CalendarDays, ChevronRight, CircleUserRound, Clock3,
  Code2, Gamepad2, GitCompareArrows, History, Layers3, Network, Search, ShieldCheck,
  Sparkles, UsersRound, UserRoundPlus, UserRoundCheck, WandSparkles
} from 'lucide-react'
import { getProfile, apiConfigured } from './lib/api'
import { mockProfile } from './lib/mock'
import type { ProfileData } from './lib/types'
import { Panel } from './components/Panel'
import { StatCard } from './components/StatCard'

const tabs = ['Overview', 'Avatar', 'Social', 'Groups', 'Creations', 'History', 'Raw Data'] as const
type Tab = typeof tabs[number]

const format = (n: number) => new Intl.NumberFormat('en-US', { notation: n >= 100000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(n)
const exact = (n: number) => new Intl.NumberFormat('en-US').format(n)

function ageParts(created: string) {
  const start = new Date(created).getTime()
  const days = Math.max(0, Math.floor((Date.now() - start) / 86400000))
  return { days, years: days / 365.2425 }
}

export default function App() {
  const [query, setQuery] = useState('')
  const [profile, setProfile] = useState<ProfileData>(mockProfile)
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [demo, setDemo] = useState(true)
  const age = useMemo(() => ageParts(profile.created), [profile.created])

  async function search(e: FormEvent) {
    e.preventDefault()
    const username = query.trim().replace(/^@/, '')
    if (!username) return
    setError('')
    if (!apiConfigured) {
      setError('Live API is not connected yet. Deploy the included Worker and set VITE_API_BASE_URL in GitHub Actions.')
      return
    }
    try {
      setLoading(true)
      const data = await getProfile(username)
      setProfile(data)
      setDemo(false)
      setActiveTab('Overview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load this Roblox profile.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <nav className="topbar">
        <div className="brand"><div className="brand-mark">L</div><div><b>Lux Intel</b><span>ROBLOX PROFILE ANALYTICS</span></div></div>
        <div className="top-actions"><span className="status-dot" /> Public data mode <button className="icon-button" title="Compare profiles"><GitCompareArrows size={18} /></button></div>
      </nav>

      <section className="hero">
        <div className="hero-copy"><span className="pill"><Sparkles size={14}/> PROFILE INTELLIGENCE V0.1</span><h1>Understand a Roblox profile<br/><em>far beyond the profile page.</em></h1><p>Search public Roblox data, relationships, account history, groups, creations, and future historical snapshots from one dense analytics dashboard.</p></div>
        <form className="search-card" onSubmit={search}>
          <Search size={21}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Username or @username" aria-label="Roblox username"/><button disabled={loading}>{loading ? 'Scanning…' : 'Analyze profile'}<ChevronRight size={17}/></button>
        </form>
        {error && <div className="notice">{error}</div>}
      </section>

      <section className="profile-card">
        {demo && <div className="demo-badge">DEMO DATA</div>}
        <div className="avatar-wrap"><img src={profile.avatarHeadshot} alt={`${profile.name} avatar`} /><span className="avatar-ring" /></div>
        <div className="identity"><div className="name-row"><h2>{profile.displayName}</h2>{profile.hasVerifiedBadge && <BadgeCheck size={22} className="verified"/>}</div><p>@{profile.name}</p><div className="identity-meta"><span><CircleUserRound size={14}/> ID {profile.id}</span><span><CalendarDays size={14}/> Joined {new Date(profile.created).toLocaleDateString()}</span></div></div>
        <div className="profile-side"><span className="scan-label"><Activity size={14}/> SNAPSHOT</span><b>{new Date(profile.fetchedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</b><small>Public Roblox endpoints</small></div>
      </section>

      <section className="stats-grid">
        <StatCard icon={UsersRound} label="Friends" value={format(profile.friendCount)} hint={`${exact(profile.friendCount)} total`} />
        <StatCard icon={UserRoundPlus} label="Followers" value={format(profile.followerCount)} hint={`${exact(profile.followerCount)} total`} />
        <StatCard icon={UserRoundCheck} label="Following" value={format(profile.followingCount)} hint={`${exact(profile.followingCount)} total`} />
        <StatCard icon={Clock3} label="Account age" value={`${age.years.toFixed(1)} yr`} hint={`${exact(age.days)} days`} />
        <StatCard icon={Layers3} label="Groups" value={exact(profile.groups.length)} hint="Public memberships" />
        <StatCard icon={Gamepad2} label="Creations" value={exact(profile.experiences.length)} hint="Visible experiences" />
      </section>

      <div className="tabs">{tabs.map(tab => <button key={tab} onClick={() => setActiveTab(tab)} className={activeTab === tab ? 'active' : ''}>{tab}</button>)}</div>

      {activeTab === 'Overview' && <Overview profile={profile} ageDays={age.days} />}
      {activeTab === 'Avatar' && <Avatar profile={profile} />}
      {activeTab === 'Social' && <Social profile={profile} />}
      {activeTab === 'Groups' && <Groups profile={profile} />}
      {activeTab === 'Creations' && <Creations profile={profile} />}
      {activeTab === 'History' && <HistoryTab profile={profile} />}
      {activeTab === 'Raw Data' && <Raw profile={profile} />}

      <footer><div className="brand compact"><div className="brand-mark">L</div><b>Lux Intel</b></div><p>Public Roblox profile intelligence. No .ROBLOSECURITY cookies. No Roblox affiliation.</p><span>V0.1</span></footer>
    </main>
  )
}

function Overview({ profile, ageDays }: { profile: ProfileData; ageDays: number }) {
  const ratio = profile.followingCount ? profile.followerCount / profile.followingCount : profile.followerCount
  return <section className="content-grid">
    <Panel title="Profile overview" subtitle="Core public account identity and metadata" className="wide">
      <div className="overview-layout"><div className="description"><span className="eyebrow">ABOUT</span><p>{profile.description || 'No public profile description.'}</p></div><div className="mini-metrics"><Metric label="Account days" value={exact(ageDays)}/><Metric label="Follower ratio" value={`${ratio.toFixed(1)}×`}/><Metric label="Known names" value={String(profile.usernameHistory.length + 1)}/><Metric label="Verified" value={profile.hasVerifiedBadge ? 'Yes' : 'No'}/></div></div>
    </Panel>
    <Panel title="Intelligence modules" subtitle="Coverage available in this profile scan">
      <div className="module-list"><Module icon={Network} name="Social graph" detail="Friends + follower relationships"/><Module icon={History} name="Identity history" detail="Previous usernames"/><Module icon={Boxes} name="Group graph" detail="Memberships + roles"/><Module icon={Code2} name="Creator profile" detail="Public experiences"/></div>
    </Panel>
    <Panel title="Account timeline" subtitle="Current data plus tracked history in future releases">
      <div className="timeline"><Timeline date={new Date(profile.created).getFullYear().toString()} title="Account created" detail={new Date(profile.created).toLocaleDateString()}/>{profile.usernameHistory.slice(0,2).map((x,i)=><Timeline key={x.name+i} date="History" title={`Previously @${x.name}`} detail="Roblox username history"/>)}<Timeline date="Now" title="Profile snapshot captured" detail={new Date(profile.fetchedAt).toLocaleString()} active/></div>
    </Panel>
    <Panel title="Tracking readiness" subtitle="Historical intelligence begins when snapshots are stored">
      <div className="tracking"><div className="tracking-score"><span>V0.2</span><strong>Snapshot DB</strong></div><p>Next, we connect Supabase so repeat scans can measure follower growth, avatar changes, group changes, descriptions, and account evolution over time.</p><div className="progress"><i style={{width:'68%'}}/></div></div>
    </Panel>
  </section>
}

function Avatar({ profile }: { profile: ProfileData }) { return <section className="content-grid"><Panel title="Avatar render" subtitle="Current full-body public thumbnail" className="avatar-panel"><div className="full-avatar"><img src={profile.avatarFullBody} alt="Full Roblox avatar"/><div><span className="eyebrow">CURRENT LOOK</span><h3>{profile.displayName}</h3><p>The next avatar module will enumerate worn asset IDs, clothing, accessories, bundles, body colors, animations, creators, collectible status, and snapshot-to-snapshot changes.</p></div></div></Panel><Panel title="Analyzer roadmap" subtitle="Deep avatar intelligence"><div className="module-list"><Module icon={WandSparkles} name="Worn assets" detail="Every currently equipped item"/><Module icon={Boxes} name="Asset metadata" detail="Creator, type, availability"/><Module icon={History} name="Avatar history" detail="Compare stored snapshots"/><Module icon={ShieldCheck} name="Collectibles" detail="Limited / collectible flags"/></div></Panel></section> }

function Social({ profile }: { profile: ProfileData }) { return <section className="content-grid"><Panel title="Social ratios" subtitle="High-level public relationship analysis" className="wide"><div className="large-metrics"><Metric label="Friends" value={exact(profile.friendCount)}/><Metric label="Followers" value={exact(profile.followerCount)}/><Metric label="Following" value={exact(profile.followingCount)}/><Metric label="Followers / following" value={`${(profile.followerCount/Math.max(1,profile.followingCount)).toFixed(2)}×`}/></div></Panel><Panel title="Network explorer" subtitle="Planned interactive graph"><div className="empty-state"><Network size={34}/><h3>Relationship graph</h3><p>V0.2 will inspect public friend lists, mutual relationships and shared group structure.</p></div></Panel></section> }

function Groups({ profile }: { profile: ProfileData }) { return <section className="content-grid"><Panel title="Group memberships" subtitle={`${profile.groups.length} public groups returned`} className="wide"><div className="table">{profile.groups.length ? profile.groups.map(g=><div className="table-row" key={g.group.id}><div className="group-icon">{g.group.name.slice(0,1)}</div><div><b>{g.group.name}</b><span>ID {g.group.id}</span></div><div><span className="eyebrow">ROLE</span><b>{g.role.name}</b></div><div><span className="eyebrow">RANK</span><b>{g.role.rank}</b></div></div>) : <div className="empty-state">No public groups returned.</div>}</div></Panel></section> }

function Creations({ profile }: { profile: ProfileData }) { return <section className="content-grid"><Panel title="Creator portfolio" subtitle="Public user-created experiences" className="wide"><div className="experience-grid">{profile.experiences.length ? profile.experiences.map(x=><article key={x.id}><div className="experience-thumb"><Gamepad2/></div><span className="eyebrow">EXPERIENCE · {x.id}</span><h3>{x.name}</h3><p>{x.description || 'No description available.'}</p></article>) : <div className="empty-state">No public experiences returned.</div>}</div></Panel></section> }

function HistoryTab({ profile }: { profile: ProfileData }) { const names=[profile.name,...profile.usernameHistory.map(x=>x.name)].filter((v,i,a)=>a.indexOf(v)===i); return <section className="content-grid"><Panel title="Username history" subtitle="Current and previous public usernames" className="wide"><div className="name-history">{names.map((name,i)=><div key={name}><span>{String(i+1).padStart(2,'0')}</span><i/><div><small>{i===0?'CURRENT':'PREVIOUS'}</small><b>@{name}</b></div></div>)}</div></Panel><Panel title="Historical tracking" subtitle="Lux Intel snapshots"><div className="empty-state"><History size={34}/><h3>Snapshot history starts next</h3><p>Once the database is connected, this page becomes a chronological change log instead of only Roblox-provided username history.</p></div></Panel></section> }

function Raw({ profile }: { profile: ProfileData }) { return <Panel title="Raw profile object" subtitle="Useful while developing new analyzers"><pre className="raw">{JSON.stringify(profile,null,2)}</pre></Panel> }
function Metric({label,value}:{label:string,value:string}) { return <div className="metric"><span>{label}</span><strong>{value}</strong></div> }
function Module({icon:Icon,name,detail}:{icon:any,name:string,detail:string}) { return <div className="module"><div><Icon size={17}/></div><section><b>{name}</b><span>{detail}</span></section><ChevronRight size={16}/></div> }
function Timeline({date,title,detail,active=false}:{date:string,title:string,detail:string,active?:boolean}) { return <div className={`timeline-row ${active?'active':''}`}><span>{date}</span><i/><div><b>{title}</b><small>{detail}</small></div></div> }
