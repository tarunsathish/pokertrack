import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Session } from '../db'
import { fmt, fmtSigned } from '../engine/money'
import { fmtDuration, netFinal, tableMs, totals } from '../engine/sessions'

const POS_ORDER = ['UTG', 'UTG+1', 'UTG+2', 'UTG+3', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']

/** Date windows for the whole tab. "All" is the honest default — no hidden filter. */
const RANGES = [
  { id: 'all', label: 'All time', days: null },
  { id: '90', label: '90 days', days: 90 },
  { id: '30', label: '30 days', days: 30 }
] as const
type RangeId = (typeof RANGES)[number]['id']

/** How results split across a dimension — used for both venue and stake. */
function breakdown(
  sessions: Session[],
  key: (s: Session) => string,
  now: number
): { label: string; net: number; ms: number; n: number }[] {
  const m = new Map<string, { net: number; ms: number; n: number }>()
  for (const s of sessions) {
    const net = netFinal(s)
    if (net === null) continue
    const k = key(s)
    const e = m.get(k) ?? { net: 0, ms: 0, n: 0 }
    e.net += net
    e.ms += tableMs(s, now)
    e.n += 1
    m.set(k, e)
  }
  return [...m.entries()]
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.net - a.net)
}

/** A center-diverging bar row: losses grow left, wins grow right. */
function BarRow({
  label,
  value,
  maxAbs,
  suffix
}: {
  label: string
  value: number
  maxAbs: number
  suffix?: string
}) {
  const frac = Math.abs(value) / maxAbs
  const win = value >= 0
  return (
    <div className="bar-row">
      <span className="b-label">{label}</span>
      <span className="b-track">
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
        {fmtSigned(value)}
        {suffix && <span className="faint"> {suffix}</span>}
      </span>
    </div>
  )
}

export function StatsTab({ onReview }: { onReview?: () => void }) {
  const [range, setRange] = useState<RangeId>('all')
  const [deepDive, setDeepDive] = useState(false)
  const sessions = useLiveQuery(() => db.sessions.toArray(), [])
  const hands = useLiveQuery(() => db.hands.toArray(), [])

  const now = Date.now()
  const cutoff = useMemo(() => {
    const days = RANGES.find((r) => r.id === range)!.days
    return days === null ? 0 : now - days * 86400000
  }, [range, now])

  const inRange = useMemo(
    () => (sessions ?? []).filter((s) => s.startedAt >= cutoff),
    [sessions, cutoff]
  )
  const handsInRange = useMemo(
    () => (hands ?? []).filter((h) => h.ts >= cutoff),
    [hands, cutoff]
  )

  const t = useMemo(() => totals(inRange, now), [inRange, now])

  const byVenue = useMemo(
    () => breakdown(inRange, (s) => s.venue.trim() || 'Unnamed', now),
    [inRange, now]
  )
  const byStake = useMemo(
    () => breakdown(inRange, (s) => `${fmt(s.sb)}/${fmt(s.bb)}`, now),
    [inRange, now]
  )

  const byPos = useMemo(() => {
    const m = new Map<string, { total: number; n: number }>()
    for (const h of handsInRange) {
      const e = m.get(h.heroPos) ?? { total: 0, n: 0 }
      e.total += h.result
      e.n += 1
      m.set(h.heroPos, e)
    }
    return POS_ORDER.filter((p) => m.has(p)).map((p) => ({ pos: p, ...m.get(p)! }))
  }, [handsInRange])

  const flaggedCount = (hands ?? []).filter((h) => h.flagged && !h.reviewed).length

  if (!sessions || !hands) return null

  const posMax = Math.max(1, ...byPos.map((r) => Math.abs(r.total)))
  const venueMax = Math.max(1, ...byVenue.map((r) => Math.abs(r.net)))
  const stakeMax = Math.max(1, ...byStake.map((r) => Math.abs(r.net)))
  // A single venue or stake compared against itself isn't a comparison.
  const worthComparing = byVenue.length > 1 || byStake.length > 1

  return (
    <div className="view">
      <p className="screen-cap">
        {t.sessions === 0 ? 'The scoreboard' : `Across ${t.sessions} session${t.sessions === 1 ? '' : 's'}`}
      </p>
      <h1 className={`money hero ${t.net >= 0 ? 'pos-win' : 'pos-lose'}`}>{fmtSigned(t.net)}</h1>

      <div className="chips" style={{ margin: '14px 0 18px' }}>
        {RANGES.map((r) => (
          <button
            key={r.id}
            className={`chip sm${range === r.id ? ' on' : ''}`}
            onClick={() => setRange(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="statline">
        <div className="stat">
          <b className={`money ${(t.hourly ?? 0) >= 0 ? 'pos-win' : 'pos-lose'}`}>
            {t.hourly !== null ? fmtSigned(t.hourly) : '—'}
          </b>
          <span>per hour</span>
        </div>
        <div className="stat">
          <b className="num">
            {t.bbPerHour !== null ? `${t.bbPerHour >= 0 ? '+' : ''}${t.bbPerHour.toFixed(1)}` : '—'}
          </b>
          <span>bb / hour</span>
        </div>
        <div className="stat">
          <b className="num">{t.wonPct !== null ? `${t.wonPct}%` : '—'}</b>
          <span>sessions won</span>
        </div>
      </div>

      {t.sessions === 0 ? (
        <div className="empty-state" style={{ marginTop: 20 }}>
          {sessions.length === 0
            ? 'Finish a session on the Play tab and your hourly rate, win rate, and per-position results appear here.'
            : 'No finished sessions in this window. Try a wider date range.'}
        </div>
      ) : (
        <>
          <h2>Session results</h2>
          <div className="group">
            <div className="hand-row">
              <div className="meta">
                <div className="line1">Best session</div>
                <div className="line2">Biggest single win</div>
              </div>
              <span className="result money pos-win">
                {t.best !== null ? fmtSigned(t.best) : '—'}
              </span>
            </div>
            <div className="hand-row">
              <div className="meta">
                <div className="line1">Worst session</div>
                <div className="line2">Biggest single loss</div>
              </div>
              <span className="result money pos-lose">
                {t.worst !== null ? fmtSigned(t.worst) : '—'}
              </span>
            </div>
            <div className="hand-row">
              <div className="meta">
                <div className="line1">Hours played</div>
                <div className="line2">
                  {t.sessions} session{t.sessions === 1 ? '' : 's'} ·{' '}
                  {fmtDuration(Math.round(t.ms / Math.max(1, t.sessions)))} average
                </div>
              </div>
              <span className="result num">{fmtDuration(t.ms)}</span>
            </div>
          </div>
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

      {byPos.length > 0 && (
        <>
          <h2>Logged hands by position</h2>
          <div>
            {byPos.map((r) => (
              <BarRow key={r.pos} label={r.pos} value={r.total} maxAbs={posMax} suffix={`·${r.n}`} />
            ))}
          </div>
          <p className="small faint" style={{ marginTop: 8, lineHeight: 1.4 }}>
            Hand stats cover only the hands you chose to log — treat them as study material, not your true
            win rate. Session results above are the real scoreboard.
          </p>
        </>
      )}

      {worthComparing && (
        <>
          <h2>Deeper</h2>
          {deepDive ? (
            <>
              {byVenue.length > 1 && (
                <>
                  <h2 style={{ marginTop: 18 }}>By venue</h2>
                  <div>
                    {byVenue.map((r) => (
                      <BarRow
                        key={r.label}
                        label={r.label}
                        value={r.net}
                        maxAbs={venueMax}
                        suffix={`·${r.n}`}
                      />
                    ))}
                  </div>
                </>
              )}
              {byStake.length > 1 && (
                <>
                  <h2 style={{ marginTop: 18 }}>By stake</h2>
                  <div>
                    {byStake.map((r) => (
                      <BarRow
                        key={r.label}
                        label={r.label}
                        value={r.net}
                        maxAbs={stakeMax}
                        suffix={`·${r.n}`}
                      />
                    ))}
                  </div>
                </>
              )}
              <p className="small faint" style={{ marginTop: 10, lineHeight: 1.4 }}>
                A handful of sessions in one room says more about variance than about the game. Read these
                once the session counts get real.
              </p>
            </>
          ) : (
            <button className="btn" style={{ width: '100%' }} onClick={() => setDeepDive(true)}>
              Compare venues and stakes
            </button>
          )}
        </>
      )}
    </div>
  )
}
