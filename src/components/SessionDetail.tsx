import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type HandRecord, type Session } from '../db'
import { fmt, fmtSigned, parseCents, type Cents } from '../engine/money'
import {
  bbPerHour,
  fmtDuration,
  hourly,
  invested,
  netBest,
  netFinal,
  onBreak,
  tableMs
} from '../engine/sessions'
import { HandRow } from './HandRow'
import { HandDetail } from './HandDetail'
import { useSwipeBack } from '../useSwipeBack'

/** `datetime-local` wants "YYYY-MM-DDTHH:mm" in local time, not an ISO UTC string. */
function toLocalInput(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`
}

/** A money field that only commits when it parses, so a half-typed value never saves. */
function MoneyField({
  label,
  cents,
  onCommit,
  placeholder,
  allowEmpty
}: {
  label: string
  cents: Cents | null
  onCommit: (v: Cents | null) => void
  placeholder?: string
  allowEmpty?: boolean
}) {
  const [text, setText] = useState(cents === null ? '' : fmt(cents).replace('$', ''))
  const parsed = parseCents(text)
  const empty = text.trim() === ''
  const bad = empty ? !allowEmpty : parsed === null

  return (
    <div>
      <label>{label}</label>
      <input
        inputMode="decimal"
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (empty && allowEmpty) return onCommit(null)
          if (parsed !== null) return onCommit(parsed)
          // Unparseable: snap back to the stored value rather than saving garbage.
          setText(cents === null ? '' : fmt(cents).replace('$', ''))
        }}
        style={bad && !empty ? { borderColor: 'var(--loss)' } : undefined}
      />
    </div>
  )
}

export function SessionDetail({
  session,
  onClose,
  onToast
}: {
  session: Session
  onClose: () => void
  onToast: (msg: string) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [note, setNote] = useState(session.note ?? '')
  const [venue, setVenue] = useState(session.venue)
  const [openHandId, setOpenHandId] = useState<number | null>(null)
  const [editingTimes, setEditingTimes] = useState(false)

  const hands = useLiveQuery(
    () =>
      session.id
        ? db.hands.where('sessionId').equals(session.id).sortBy('ts')
        : Promise.resolve([] as HandRecord[]),
    [session.id]
  )

  const save = (patch: Partial<Session>) => db.sessions.update(session.id!, patch)

  const now = Date.now()
  const live = session.endedAt === null
  const inFor = invested(session)
  const net = live ? netBest(session) : netFinal(session)
  const ms = tableMs(session, now)
  const rate = net === null ? null : hourly(net, ms)
  const bbHr = net === null ? null : bbPerHour(net, session.bb, ms)

  const handsNet = useMemo(
    () => (hands ?? []).reduce((sum, h) => sum + h.result, 0),
    [hands]
  )

  // With a cash-out recorded, the gap between the real result and the sum of
  // logged hands is everything that happened in hands you didn't log. Worth
  // naming, because a big gap means the logged sample isn't representative.
  const unlogged = net !== null && !live ? net - handsNet : null

  const openHand = openHandId !== null ? (hands ?? []).find((h) => h.id === openHandId) : undefined
  const swipeBack = useSwipeBack(onClose)

  return (
    <div className="overlay" {...swipeBack.handlers} style={swipeBack.style}>
      <div className="overlay-head">
        <button className="overlay-close" onClick={onClose}>
          ‹ Back
        </button>
        <span className="overlay-title num">
          {new Date(session.startedAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </span>
        <span className="overlay-close" style={{ visibility: 'hidden' }}>
          ‹ Back
        </span>
      </div>

      <div className="entry-summary" style={{ paddingBottom: 24 }}>
        <p className="screen-cap num">
          {fmt(session.sb)}/{fmt(session.bb)} · {session.tableSize} players
          {live ? (onBreak(session) ? ' · on break' : ' · live') : ''}
        </p>
        {net === null ? (
          <h1 className="money hero faint">—</h1>
        ) : (
          <h1 className={`money hero ${net >= 0 ? 'pos-win' : 'pos-lose'}`}>{fmtSigned(net)}</h1>
        )}

        <div className="statline" style={{ marginBottom: 24 }}>
          <div className="stat">
            <b className="num">{fmtDuration(ms)}</b>
            <span>at the table</span>
          </div>
          <div className="stat">
            <b className={`money ${(rate ?? 0) >= 0 ? 'pos-win' : 'pos-lose'}`}>
              {rate !== null ? fmtSigned(rate) : '—'}
            </b>
            <span>per hour</span>
          </div>
          <div className="stat">
            <b className="num">
              {bbHr !== null ? `${bbHr >= 0 ? '+' : ''}${bbHr.toFixed(1)}` : '—'}
            </b>
            <span>bb / hour</span>
          </div>
        </div>

        <h2>The money</h2>
        <div className="row">
          <MoneyField label="Small blind $" cents={session.sb} onCommit={(v) => v !== null && save({ sb: v })} />
          <MoneyField label="Big blind $" cents={session.bb} onCommit={(v) => v !== null && save({ bb: v })} />
        </div>
        <div className="row">
          <MoneyField
            label="Buy-in $"
            cents={session.buyIn}
            onCommit={(v) => v !== null && save({ buyIn: v })}
          />
          <MoneyField
            label="Cashed out $"
            cents={session.cashOut}
            allowEmpty
            placeholder="not yet"
            onCommit={(v) => save({ cashOut: v })}
          />
        </div>
        <p className="small dim" style={{ marginTop: 2, lineHeight: 1.45 }}>
          In for {fmt(inFor)}
          {(session.rebuys?.length ?? 0) > 0
            ? ` — ${fmt(session.buyIn)} buy-in plus ${session.rebuys!.length} rebuy${
                session.rebuys!.length === 1 ? '' : 's'
              }`
            : ''}
          .
        </p>

        {(session.rebuys?.length ?? 0) > 0 && (
          <>
            <h2>Rebuys</h2>
            <div className="group">
              {session.rebuys!.map((r, i) => (
                <div className="hand-row" key={i}>
                  <div className="meta">
                    <div className="line1 money">{fmt(r.amount)}</div>
                    <div className="line2">
                      {new Date(r.ts).toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <button
                    className="chip sm"
                    onClick={() =>
                      save({ rebuys: session.rebuys!.filter((_, j) => j !== i) })
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <h2>Where</h2>
        <input
          value={venue}
          placeholder="Venue"
          onChange={(e) => setVenue(e.target.value)}
          onBlur={() => save({ venue: venue.trim() })}
        />

        <h2>How it went</h2>
        <textarea
          rows={3}
          placeholder="Table read, stop-loss calls, how you felt — the stuff that isn't in the numbers."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => save({ note: note.trim() })}
        />

        <h2>Time</h2>
        {editingTimes ? (
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div>
              <label>Started</label>
              <input
                type="datetime-local"
                value={toLocalInput(session.startedAt)}
                onChange={(e) => {
                  const ts = new Date(e.target.value).getTime()
                  if (!Number.isNaN(ts)) save({ startedAt: ts })
                }}
              />
            </div>
            <div>
              <label>Ended</label>
              <input
                type="datetime-local"
                value={session.endedAt ? toLocalInput(session.endedAt) : ''}
                onChange={(e) => {
                  const ts = new Date(e.target.value).getTime()
                  if (!Number.isNaN(ts)) save({ endedAt: ts })
                }}
              />
            </div>
          </div>
        ) : (
          <button className="btn" style={{ width: '100%' }} onClick={() => setEditingTimes(true)}>
            {new Date(session.startedAt).toLocaleTimeString(undefined, {
              hour: 'numeric',
              minute: '2-digit'
            })}
            {' → '}
            {session.endedAt
              ? new Date(session.endedAt).toLocaleTimeString(undefined, {
                  hour: 'numeric',
                  minute: '2-digit'
                })
              : 'still playing'}
            {(session.breaks?.length ?? 0) > 0 ? ` · ${session.breaks!.length} break` : ''}
            {' · edit'}
          </button>
        )}
        {ms === 0 && session.endedAt !== null && (
          <p className="small" style={{ color: 'var(--loss)', marginTop: 6, lineHeight: 1.45 }}>
            The end time isn't after the start time, so there's no duration to rate. Fix the times
            above and the hourly figures come back.
          </p>
        )}

        <h2>
          Hands logged{' '}
          <span className="faint num">
            {(hands ?? []).length > 0 ? `· ${(hands ?? []).length}` : ''}
          </span>
        </h2>
        {(hands ?? []).length === 0 ? (
          <div className="empty-state">No hands logged in this session.</div>
        ) : (
          <>
            <div className="group">
              {(hands ?? [])
                .slice()
                .reverse()
                .map((h) => (
                  <HandRow key={h.id} hand={h} onClick={() => setOpenHandId(h.id!)} />
                ))}
            </div>
            {unlogged !== null && (
              <p className="small dim" style={{ marginTop: 8, lineHeight: 1.45 }}>
                Logged hands account for {fmtSigned(handsNet)} of this session.{' '}
                {Math.abs(unlogged) === 0
                  ? 'The rest nets out to zero.'
                  : `The other ${fmtSigned(unlogged)} came from hands you didn't log.`}
              </p>
            )}
          </>
        )}

        <button
          className="btn danger"
          style={{ width: '100%', marginTop: 24 }}
          onClick={async () => {
            if (!confirmDelete) return setConfirmDelete(true)
            const n = (hands ?? []).length
            await db.transaction('rw', db.sessions, db.hands, async () => {
              if (session.id) await db.hands.where('sessionId').equals(session.id).delete()
              await db.sessions.delete(session.id!)
            })
            onToast(n > 0 ? `Session and ${n} hand${n === 1 ? '' : 's'} deleted` : 'Session deleted')
            onClose()
          }}
        >
          {confirmDelete
            ? `Tap again to delete this session${
                (hands ?? []).length > 0 ? ` and its ${(hands ?? []).length} hand${(hands ?? []).length === 1 ? '' : 's'}` : ''
              }`
            : 'Delete session'}
        </button>
      </div>

      {openHand && <HandDetail hand={openHand} onClose={() => setOpenHandId(null)} />}
    </div>
  )
}
