import type { LucideIcon } from 'lucide-react'

export function StatCard({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint?: string }) {
  return (
    <article className="stat-card">
      <div className="stat-icon"><Icon size={18} /></div>
      <div>
        <span className="eyebrow">{label}</span>
        <strong>{value}</strong>
        {hint && <small>{hint}</small>}
      </div>
    </article>
  )
}
