import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Session } from '../db'
import { fmt, fmtSigned } from '../engine/money'
import {
  bankrollCurve,
  fmtDuration,
  netBest,
  netFinal,
  onBreak,
  tableMs,
  totals
} from '../engine/sessions'
import { BankrollChart } from './BankrollChart'
import { SessionDetail } from './SessionDetail'
import { ChipRing } from './Icons'

/** "Sep 2026" — month bucket heading for the history list. */
function monthKey(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function SessionRow({ s, onClick }: { s: Session; onClick: () => void }) {
  const live = s.endedAt === null
  const net = live ? netBest(s) : netFinal(s)
  const ms = tableMs(s, Date.now())
  const d = new Date(s.startedAt)

  return (
    <button className="hand-row" onClick={onClick}>
      <div className="meta">
        <div className="line1 num">
          {fmt(s.sb)}/{fmt(s.bb)}
          {s.venue && <span className="tag-badge">{s.venue}</span>}
          {live && <span className="tag-badge live">{onBreak(s) ? 'on break' : 'live'}</span>}
        </div>
        <div className="line2">
          {d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} ·{' '}
          {fmtDuration(ms)}
          {s.note ? ' · noted' : ''}
        </div>
      </div>
      {net === null ? (
        <span className="result faint num">—</span>
      ) : (
        <span className={`result money ${net >= 0 ? 'pos-win' : 'pos-lose'}`}>{fmtSigned(net)}</span>
      )}
    </button>
  )
}

export function SessionsTab({ onToast }: { onToast: (msg: string) => void }) {
  const [openId, setOpenId] = useState<number | null>(null)
  const sessions = useLiveQuery(() => db.sessions.toArray(), [])

  const now = Date.now()
  const t = useMemo(() => totals(sessions ?? [], now), [sessions, now])
  const curve = useMemo(() => bankrollCurve(sessions ?? []), [sessions])

  const byMonth = useMemo(() => {
    const groups = new Map<string, Session[]>()
    for (const s of (sessions ?? []).slice().sort((a, b) => b.startedAt - a.startedAt)) {
      const k = monthKey(s.startedAt)
      const list = groups.get(k)
      if (list) list.push(s)
      else groups.set(k, [s])
    }
    return [...groups.entries()].map(([label, list]) => ({
      label,
      list,
      // Only finished sessions have a result, so a month's subtotal counts those.
      net: list.reduce((sum, s) => sum + (netFinal(s) ?? 0), 0)
    }))
  }, [sessions])

  if (!sessions) return null

  const open = openId !== null ? sessions.find((s) => s.id === openId) : undefined

  if (sessions.length === 0) {
    return (
      <div className="view">
        <p className="screen-cap">Bankroll</p>
        <h1 style={{ marginBottom: 24 }}>Sessions</h1>
        <div className="empty-state">
          <ChipRing size={40} color="var(--brass)" />
          Every session you finish lands here — bankroll over time, hours played, and what you
          made per hour. Start one on the Play tab.
        </div>
      </div>
    )
  }

  return (
    <div className="view">
      <p className="screen-cap">
        {t.sessions === 0
          ? 'Bankroll'
          : `${t.sessions} session${t.sessions === 1 ? '' : 's'} · ${fmtDuration(t.ms)} played`}
      </p>
      <h1 className={`money hero ${t.net >= 0 ? 'pos-win' : 'pos-lose'}`}>{fmtSigned(t.net)}</h1>

      <div className="statline" style={{ marginBottom: 20 }}>
        <div className="stat">
          <b className={`money ${(t.hourly ?? 0) >= 0 ? 'pos-win' : 'pos-lose'}`}>
            {t.hourly !== null ? fmtSigned(t.hourly) : '—'}
          </b>
          <span>per hour</span>
        </div>
        <div className="stat">
          <b className="num">{t.wonPct !== null ? `${t.wonPct}%` : '—'}</b>
          <span>sessions won</span>
        </div>
        <div className="stat">
          <b className="num">{fmtDuration(t.ms)}</b>
          <span>at the table</span>
        </div>
      </div>

      {curve.length > 0 && <BankrollChart points={curve} />}

      {t.sessions === 0 && (
        <p className="small dim" style={{ lineHeight: 1.5, marginTop: 4 }}>
          Your bankroll line appears once you cash out of a session.
        </p>
      )}

      {byMonth.map((g) => (
        <div key={g.label}>
          <h2 className="month-head">
            <span>{g.label}</span>
            <span className={`num ${g.net >= 0 ? 'pos-win' : 'pos-lose'}`}>{fmtSigned(g.net)}</span>
          </h2>
          <div className="group">
            {g.list.map((s) => (
              <SessionRow key={s.id} s={s} onClick={() => setOpenId(s.id!)} />
            ))}
          </div>
        </div>
      ))}

      {open && (
        <SessionDetail session={open} onClose={() => setOpenId(null)} onToast={onToast} />
      )}
    </div>
  )
}
