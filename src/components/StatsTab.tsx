import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, sessionInvested } from '../db'
import { fmt, fmtSigned } from '../engine/money'

const POS_ORDER = ['UTG', 'UTG+1', 'UTG+2', 'UTG+3', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']

export function StatsTab({ onReview }: { onReview?: () => void }) {
  const sessions = useLiveQuery(() => db.sessions.toArray(), [])
  const hands = useLiveQuery(() => db.hands.toArray(), [])

  const s = useMemo(() => {
    const done = (sessions ?? []).filter((x) => x.endedAt !== null && x.cashOut !== null)
    const profit = done.reduce((sum, x) => sum + (x.cashOut! - sessionInvested(x)), 0)
    const hours = done.reduce((sum, x) => sum + (x.endedAt! - x.startedAt), 0) / 3600000
    const bbProfit = done.reduce((sum, x) => sum + (x.cashOut! - sessionInvested(x)) / x.bb, 0)
    const won = done.filter((x) => x.cashOut! > sessionInvested(x)).length
    return {
      done: done.length,
      profit,
      hours,
      hourly: hours > 0 ? Math.round(profit / hours) : null,
      bbPerHour: hours > 0 ? bbProfit / hours : null,
      wonPct: done.length > 0 ? Math.round((100 * won) / done.length) : null
    }
  }, [sessions])

  const byPos = useMemo(() => {
    const m = new Map<string, { total: number; n: number }>()
    for (const h of hands ?? []) {
      const e = m.get(h.heroPos) ?? { total: 0, n: 0 }
      e.total += h.result
      e.n += 1
      m.set(h.heroPos, e)
    }
    return POS_ORDER.filter((p) => m.has(p)).map((p) => ({ pos: p, ...m.get(p)! }))
  }, [hands])

  const maxAbs = Math.max(1, ...byPos.map((r) => Math.abs(r.total)))
  const flaggedCount = (hands ?? []).filter((h) => h.flagged && !h.reviewed).length

  if (!sessions || !hands) return null

  return (
    <div className="view">
      <p className="screen-cap">
        {s.done === 0 ? 'The scoreboard' : `Across ${s.done} session${s.done === 1 ? '' : 's'}`}
      </p>
      <h1 className={`money hero ${s.profit >= 0 ? 'pos-win' : 'pos-lose'}`}>{fmtSigned(s.profit)}</h1>
      <div className="statline">
        <div className="stat">
          <b className={`money ${(s.hourly ?? 0) >= 0 ? 'pos-win' : 'pos-lose'}`}>
            {s.hourly !== null ? `${fmtSigned(s.hourly)}` : '—'}
          </b>
          <span>per hour</span>
        </div>
        <div className="stat">
          <b className="num">
            {s.bbPerHour !== null ? `${s.bbPerHour >= 0 ? '+' : ''}${s.bbPerHour.toFixed(1)}` : '—'}
          </b>
          <span>bb / hour</span>
        </div>
        <div className="stat">
          <b className="num">{s.wonPct !== null ? `${s.wonPct}%` : '—'}</b>
          <span>sessions won</span>
        </div>
      </div>

      {byPos.length > 0 && (
        <>
          <h2>Logged hands by position</h2>
          <div>
            {byPos.map((r) => {
              const frac = Math.abs(r.total) / maxAbs
              const win = r.total >= 0
              return (
                <div className="bar-row" key={r.pos}>
                  <span className="b-label">{r.pos}</span>
                  <span className="b-track">
                    {/* center-diverging bar: losses grow left, wins grow right */}
                    <span style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                      {!win && (
                        <span
                          className="b-fill"
                          style={{ width: `${frac * 100}%`, background: 'var(--loss)', borderRadius: '4px 0 0 4px' }}
                        />
                      )}
                    </span>
                    <span style={{ width: 2, height: 18, background: 'var(--felt-600)', flexShrink: 0 }} />
                    <span style={{ flex: 1, display: 'flex' }}>
                      {win && (
                        <span
                          className="b-fill"
                          style={{ width: `${frac * 100}%`, background: 'var(--win)', borderRadius: '0 4px 4px 0' }}
                        />
                      )}
                    </span>
                  </span>
                  <span className={`b-val num ${win ? 'pos-win' : 'pos-lose'}`}>
                    {fmtSigned(r.total)}
                    <span className="faint"> ·{r.n}</span>
                  </span>
                </div>
              )
            })}
          </div>
          <p className="small faint" style={{ marginTop: 8, lineHeight: 1.4 }}>
            Hand stats cover only the hands you chose to log — treat them as study material, not your true
            win rate. Session results above are the real scoreboard.
          </p>
        </>
      )}

      {flaggedCount > 0 && (
        <button
          className="session-card"
          style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}
          onClick={onReview}
        >
          <span className="flag-dot" />
          <span className="small dim" style={{ flex: 1 }}>
            <b style={{ color: 'var(--ink)' }}>{flaggedCount}</b> hand{flaggedCount === 1 ? '' : 's'} waiting
            for review — that's where the improvement lives.
          </span>
          <span className="faint">›</span>
        </button>
      )}

      <h2>Session history</h2>
      {s.done === 0 ? (
        <div className="empty-state">
          Your profit, hourly rate, and per-session results appear here once you finish a session.
        </div>
      ) : (
        <div className="group">
          {(sessions ?? [])
            .filter((x) => x.endedAt !== null)
            .sort((a, b) => b.startedAt - a.startedAt)
            .map((x) => {
              const pl = (x.cashOut ?? sessionInvested(x)) - sessionInvested(x)
              const hrs = (x.endedAt! - x.startedAt) / 3600000
              return (
                <div className="hand-row" key={x.id}>
                  <div className="meta">
                    <div className="line1 num">
                      {fmt(x.sb)}/{fmt(x.bb)}
                      {x.venue && <span className="tag-badge">{x.venue}</span>}
                    </div>
                    <div className="line2">
                      {new Date(x.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ·{' '}
                      {hrs < 1 ? `${Math.round(hrs * 60)}m` : `${hrs.toFixed(1)}h`}
                    </div>
                  </div>
                  <span className={`result money ${pl >= 0 ? 'pos-win' : 'pos-lose'}`}>{fmtSigned(pl)}</span>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}
