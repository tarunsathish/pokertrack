import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, sessionInvested, type Session, type HandRecord } from '../db'
import { fmt, fmtSigned, parseCents, type Cents } from '../engine/money'
import {
  fmtAgo,
  fmtDuration,
  netLive,
  onBreak,
  tableMs,
  STACK_STALE_MS
} from '../engine/sessions'
import { nextPosition, positionsFor } from '../engine/positions'
import { loadSettings, saveSettings, rememberStakes, type AppSettings } from '../settings'
import { HandEntry, loadDraft, type Draft } from './HandEntry'
import { HandRow } from './HandRow'
import { HandDetail } from './HandDetail'

function MoneyInput({ value, onChange, placeholder }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      inputMode="decimal"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function SessionSetup({ settings, onStart }: {
  settings: AppSettings
  onStart: (s: Omit<Session, 'id'>, settings: AppSettings) => void
}) {
  const [sbText, setSbText] = useState(fmt(settings.recentStakes[0]?.sb ?? 10).slice(1))
  const [bbText, setBbText] = useState(fmt(settings.recentStakes[0]?.bb ?? 20).slice(1))
  const [tableSize, setTableSize] = useState(settings.lastTableSize)
  const [buyInText, setBuyInText] = useState(fmt(settings.lastBuyIn).slice(1))
  const [venue, setVenue] = useState(settings.lastVenue)

  const sb = parseCents(sbText)
  const bb = parseCents(bbText)
  const buyIn = parseCents(buyInText)
  const valid = sb !== null && bb !== null && sb > 0 && bb > 0 && buyIn !== null

  const start = () => {
    if (!valid) return
    const stakes = { sb: sb!, bb: bb!, ante: 0 }
    const next = rememberStakes(
      { ...settings, lastTableSize: tableSize, lastVenue: venue, lastBuyIn: buyIn! },
      stakes
    )
    onStart(
      {
        startedAt: Date.now(),
        endedAt: null,
        sb: sb!,
        bb: bb!,
        ante: 0,
        tableSize,
        venue: venue.trim(),
        buyIn: buyIn!,
        cashOut: null
      },
      next
    )
  }

  return (
    <div>
      <p className="screen-cap">Sitting down?</p>
      <h1 style={{ marginBottom: 24 }}>New session</h1>
      <div className="field">
        <label>Blinds</label>
        <div className="chips" style={{ marginBottom: 8 }}>
          {settings.recentStakes.map((s, i) => (
            <button
              key={i}
              className={`chip sm num${parseCents(sbText) === s.sb && parseCents(bbText) === s.bb ? ' on' : ''}`}
              onClick={() => {
                setSbText(fmt(s.sb).slice(1))
                setBbText(fmt(s.bb).slice(1))
              }}
            >
              {fmt(s.sb)}/{fmt(s.bb)}
            </button>
          ))}
        </div>
        <div className="row">
          <div>
            <label>Small blind $</label>
            <MoneyInput value={sbText} onChange={setSbText} placeholder="0.10" />
          </div>
          <div>
            <label>Big blind $</label>
            <MoneyInput value={bbText} onChange={setBbText} placeholder="0.20" />
          </div>
        </div>
      </div>
      <div className="field">
        <label>Players at the table</label>
        <div className="stepper">
          <button onClick={() => setTableSize((n) => Math.max(2, n - 1))}>−</button>
          <span>{tableSize}</span>
          <button onClick={() => setTableSize((n) => Math.min(10, n + 1))}>+</button>
        </div>
      </div>
      <div className="row" style={{ marginBottom: 28 }}>
        <div>
          <label>Buy-in $</label>
          <MoneyInput value={buyInText} onChange={setBuyInText} placeholder="20" />
        </div>
        <div>
          <label>Where (optional)</label>
          <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Mike's place" />
        </div>
      </div>
      <button className="btn big primary" disabled={!valid} onClick={start}>
        Start session
      </button>
      <p className="small faint" style={{ marginTop: 14, lineHeight: 1.5, textAlign: 'center' }}>
        Log only the hands worth reviewing — big pots and tough spots. Cash out here when you're done.
      </p>
    </div>
  )
}

function EndSessionForm({ session, onDone, onCancel }: {
  session: Session
  onDone: (cashOut: Cents) => void
  onCancel: () => void
}) {
  // Prefilled from the last stack count when there is one — racking up rarely
  // changes the number, so confirming beats retyping.
  const [text, setText] = useState(session.stack ? fmt(session.stack.amount).slice(1) : '')
  const cashOut = parseCents(text)
  return (
    <div className="session-card">
      <div className="field">
        <label>How much are you leaving with? (you're in for {fmt(sessionInvested(session))})</label>
        <MoneyInput value={text} onChange={setText} placeholder="0.00" />
      </div>
      <div className="row">
        <button className="btn" onClick={onCancel}>
          Keep playing
        </button>
        <button className="btn primary" disabled={cashOut === null} onClick={() => cashOut !== null && onDone(cashOut)}>
          End session
        </button>
      </div>
    </div>
  )
}

function RebuyForm({ session, onDone, onCancel }: {
  session: Session
  onDone: (amount: Cents) => void
  onCancel: () => void
}) {
  const [text, setText] = useState(fmt(session.buyIn).slice(1))
  const amount = parseCents(text)
  return (
    <div className="session-card">
      <div className="field">
        <label>Rebuy — how much are you adding?</label>
        <MoneyInput value={text} onChange={setText} placeholder="20" />
      </div>
      <div className="row">
        <button className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn primary"
          disabled={amount === null || amount <= 0}
          onClick={() => amount !== null && onDone(amount)}
        >
          Add {amount !== null ? fmt(amount) : ''}
        </button>
      </div>
    </div>
  )
}

/**
 * Optional stack count. Never required: without one the session still reports a
 * true result at cash-out, so this exists to make the live number honest, not
 * to add a chore between hands.
 */
function StackForm({ session, onDone, onCancel }: {
  session: Session
  onDone: (amount: Cents) => void
  onCancel: () => void
}) {
  const [text, setText] = useState(session.stack ? fmt(session.stack.amount).slice(1) : '')
  const amount = parseCents(text)
  return (
    <div className="session-card">
      <div className="field">
        <label>Count your stack — what's in front of you right now?</label>
        <MoneyInput value={text} onChange={setText} placeholder={fmt(sessionInvested(session)).slice(1)} />
      </div>
      <div className="row">
        <button className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn primary"
          disabled={amount === null}
          onClick={() => amount !== null && onDone(amount)}
        >
          Save count
        </button>
      </div>
    </div>
  )
}

export function PlayTab({ onToast }: { onToast: (msg: string) => void }) {
  const [settings, setSettings] = useState(loadSettings)
  const [entryOpen, setEntryOpen] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [ending, setEnding] = useState(false)
  const [rebuying, setRebuying] = useState(false)
  const [counting, setCounting] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [openHandId, setOpenHandId] = useState<number | null>(null)

  // null = "no active session" (show setup); undefined = still loading.
  const session = useLiveQuery(
    async () => (await db.sessions.filter((s) => s.endedAt === null).last()) ?? null,
    []
  )
  const hands = useLiveQuery(
    () => (session?.id ? db.hands.where('sessionId').equals(session.id).sortBy('ts') : Promise.resolve([] as HandRecord[])),
    [session?.id]
  )

  const handsResult = useMemo(() => (hands ?? []).reduce((s, h) => s + h.result, 0), [hands])
  const lastHand = hands && hands.length > 0 ? hands[hands.length - 1] : null
  const defaultPos = useMemo(() => {
    if (!session) return 'BTN'
    if (!lastHand) return positionsFor(session.tableSize)[2] ?? 'SB'
    try {
      // Rotate within the CURRENT table size — players may have joined or left
      // since the last hand. nextPosition falls back to SB if the old seat
      // no longer exists; the user can fix it with one tap.
      return nextPosition(lastHand.heroPos, session.tableSize)
    } catch {
      return 'BTN'
    }
  }, [session, lastHand])

  if (session === undefined) return null

  if (!session) {
    return (
      <div className="view">
        <SessionSetup
          settings={settings}
          onStart={async (s, nextSettings) => {
            saveSettings(nextSettings)
            setSettings(nextSettings)
            await db.sessions.add(s as Session)
          }}
        />
      </div>
    )
  }

  const openEntry = () => {
    setDraft(loadDraft(session.id!))
    setEntryOpen(true)
  }
  const hasDraft = loadDraft(session.id!) !== null

  const now = Date.now()
  const paused = onBreak(session)
  const live = netLive(session)
  // The hero number prefers a real stack count; without one it falls back to
  // the sum of logged hands, which is what this screen always showed.
  const heroValue = live ?? handsResult
  const stackStale = session.stack ? now - session.stack.ts > STACK_STALE_MS : false

  return (
    <div className="view">
      <p className="screen-cap num">
        {paused ? 'On break' : 'Live'} · {fmt(session.sb)}/{fmt(session.bb)}
        {session.venue ? ` · ${session.venue}` : ''}
      </p>
      <h1 className={`money hero ${heroValue >= 0 ? 'pos-win' : 'pos-lose'}`}>
        {fmtSigned(heroValue)}
      </h1>
      <p className="hero-sub small">
        {live !== null ? (
          <>
            from your {fmt(session.stack!.amount)} stack
            {stackStale && <span className="faint"> · counted {fmtAgo(session.stack!.ts, now)}</span>}
          </>
        ) : (
          <span className="dim">across {hands?.length ?? 0} logged hands — count your stack for a true figure</span>
        )}
      </p>
      <div className="statline" style={{ marginBottom: 20 }}>
        <div className="stat">
          <b className="num">{hands?.length ?? 0}</b>
          <span>hands logged</span>
        </div>
        <div className="stat">
          <b className="num">{fmtDuration(tableMs(session, now))}</b>
          <span>at the table</span>
        </div>
        <div className="stat">
          <b className="money">{fmt(sessionInvested(session))}</b>
          <span>
            in for{(session.rebuys?.length ?? 0) > 0 ? ` · ${session.rebuys!.length} rebuy` : ''}
          </span>
        </div>
      </div>

      <button className="btn big primary" onClick={openEntry} style={{ marginBottom: 10 }}>
        {hasDraft ? 'Resume hand in progress' : 'Log a hand'}
      </button>

      <div className="row" style={{ marginBottom: 10 }}>
        <button className="btn" onClick={() => setCounting(true)}>
          {session.stack ? 'Recount stack' : 'Count stack'}
        </button>
        <button
          className={`btn${paused ? ' primary' : ''}`}
          onClick={async () => {
            const breaks = session.breaks ?? []
            if (paused) {
              await db.sessions.update(session.id!, {
                breaks: breaks.map((b) => (b.end === null ? { ...b, end: Date.now() } : b))
              })
              onToast('Back at the table')
            } else {
              await db.sessions.update(session.id!, {
                breaks: [...breaks, { start: Date.now(), end: null }]
              })
              onToast('On break — the clock is paused')
            }
          }}
        >
          {paused ? 'Back to table' : 'Take a break'}
        </button>
      </div>

      <div className="row" style={{ marginBottom: 10 }}>
        <div className="stepper">
          <button onClick={() => db.sessions.update(session.id!, { tableSize: Math.max(2, session.tableSize - 1) })}>
            −
          </button>
          <span>{session.tableSize} players</span>
          <button onClick={() => db.sessions.update(session.id!, { tableSize: Math.min(10, session.tableSize + 1) })}>
            +
          </button>
        </div>
      </div>

      {ending ? (
        <EndSessionForm
          session={session}
          onCancel={() => setEnding(false)}
          onDone={async (cashOut) => {
            await db.sessions.update(session.id!, { endedAt: Date.now(), cashOut })
            setEnding(false)
            onToast(`Session saved · ${fmtSigned(cashOut - sessionInvested(session))}`)
          }}
        />
      ) : rebuying ? (
        <RebuyForm
          session={session}
          onCancel={() => setRebuying(false)}
          onDone={async (amount) => {
            await db.sessions.update(session.id!, {
              rebuys: [...(session.rebuys ?? []), { ts: Date.now(), amount }]
            })
            setRebuying(false)
            onToast(`Rebuy ${fmt(amount)} · in for ${fmt(sessionInvested(session) + amount)}`)
          }}
        />
      ) : counting ? (
        <StackForm
          session={session}
          onCancel={() => setCounting(false)}
          onDone={async (amount) => {
            await db.sessions.update(session.id!, { stack: { amount, ts: Date.now() } })
            setCounting(false)
            onToast(`Stack ${fmt(amount)} · ${fmtSigned(amount - sessionInvested(session))}`)
          }}
        />
      ) : (
        <div className="row">
          <button className="btn big" onClick={() => setRebuying(true)}>
            Rebuy
          </button>
          <button className="btn big" onClick={() => setEnding(true)}>
            End session
          </button>
        </div>
      )}

      {noteOpen ? (
        <div style={{ marginTop: 14 }}>
          <textarea
            rows={3}
            autoFocus
            placeholder="Table read, how you're running, why you're staying or leaving."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onBlur={async () => {
              await db.sessions.update(session.id!, { note: noteText.trim() })
              setNoteOpen(false)
            }}
          />
        </div>
      ) : (
        <button
          className="btn"
          style={{ width: '100%', marginTop: 14 }}
          onClick={() => {
            setNoteText(session.note ?? '')
            setNoteOpen(true)
          }}
        >
          {session.note ? 'Edit session note' : 'Add a session note'}
        </button>
      )}

      {lastHand && (
        <>
          <h2>This session</h2>
          <div className="group">
            {(hands ?? [])
              .slice()
              .reverse()
              .map((h) => (
                <HandRow key={h.id} hand={h} onClick={() => setOpenHandId(h.id!)} />
              ))}
          </div>
        </>
      )}

      {openHandId !== null && (hands ?? []).find((h) => h.id === openHandId) && (
        <HandDetail
          hand={(hands ?? []).find((h) => h.id === openHandId)!}
          onClose={() => setOpenHandId(null)}
        />
      )}

      {entryOpen && (
        <HandEntry
          session={session}
          defaultPos={defaultPos}
          draft={draft}
          tagPresets={settings.tagPresets}
          onTableSizeChange={(n) => db.sessions.update(session.id!, { tableSize: n })}
          onClose={() => setEntryOpen(false)}
          onSave={async (rec) => {
            await db.hands.add(rec as HandRecord)
            setEntryOpen(false)
            onToast(`Hand saved · ${fmtSigned(rec.result)}`)
          }}
        />
      )}
    </div>
  )
}
