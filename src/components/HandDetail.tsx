import { useMemo, useState } from 'react'
import { db, type HandRecord } from '../db'
import { replayHand } from '../engine/hand'
import { fmt, fmtSigned, fmtBB } from '../engine/money'
import { fmtCards } from '../engine/cards'
import { CardsRow } from './MiniCard'
import { DEFAULT_TAGS } from '../settings'
import { useSwipeBack } from '../useSwipeBack'

/** Plain-text version of the hand — for sharing with a coach, study group, or an AI review. */
export function handToText(hand: HandRecord): string {
  const state = replayHand(hand.setup, hand.events)
  const lines: string[] = []
  const d = new Date(hand.ts)
  lines.push(
    `${fmt(hand.sb)}/${fmt(hand.bb)} cash, ${hand.setup.tableSize} players${hand.setup.straddles.length ? `, straddle ${fmt(hand.setup.straddles[0])}` : ''} — ${d.toLocaleString()}`
  )
  lines.push(`Hero: ${hand.heroPos} with ${fmtCards(hand.heroCards)}`)
  let street = ''
  for (const a of state.log) {
    if (a.street !== street) {
      street = a.street
      if (street === 'preflop') lines.push(`Preflop:`)
      else if (street === 'flop') lines.push(`Flop ${fmtCards(state.board.slice(0, 3))}:`)
      else if (street === 'turn') lines.push(`Turn ${fmtCards(state.board.slice(3, 4))}:`)
      else lines.push(`River ${fmtCards(state.board.slice(4, 5))}:`)
    }
    const verb =
      a.verb === 'fold' ? 'folds' :
      a.verb === 'check' ? 'checks' :
      a.verb === 'call' ? 'calls' :
      a.verb === 'bet' ? `bets ${fmt(a.to ?? 0)}` :
      a.verb === 'raise' ? `raises to ${fmt(a.to ?? 0)}` : `all-in for ${fmt(a.to ?? 0)}`
    lines.push(`  ${a.pos} ${verb}`)
  }
  for (const [pos, cs] of Object.entries(state.shown)) lines.push(`${pos} shows ${fmtCards(cs)}`)
  if (state.winners) lines.push(`Winner: ${state.winners.join(', ')} — pot ${fmt(state.potTotal)}`)
  lines.push(`Hero result: ${fmtSigned(hand.result)} (${fmtBB(hand.result, hand.bb)})`)
  if (hand.note) lines.push(`Note at the table: ${hand.note}`)
  if (hand.reviewNote) lines.push(`Review: ${hand.reviewNote}`)
  return lines.join('\n')
}

export function HandDetail({ hand, onClose }: { hand: HandRecord; onClose: () => void }) {
  const state = useMemo(() => replayHand(hand.setup, hand.events), [hand])
  const [note, setNote] = useState(hand.note)
  const [reviewNote, setReviewNote] = useState(hand.reviewNote)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copied, setCopied] = useState(false)

  const saveField = (patch: Partial<HandRecord>) => db.hands.update(hand.id!, patch)

  const toggleTag = (t: string) => {
    const tags = hand.tags.includes(t) ? hand.tags.filter((x) => x !== t) : [...hand.tags, t]
    saveField({ tags })
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(handToText(hand))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  const tagChoices = [...new Set([...DEFAULT_TAGS, ...hand.tags])]
  const swipeBack = useSwipeBack(onClose)

  return (
    <div className="overlay" {...swipeBack.handlers} style={swipeBack.style}>
      <div className="overlay-head">
        <button className="overlay-close" onClick={onClose}>
          ‹ Back
        </button>
        <span className="overlay-title num">
          {fmt(hand.sb)}/{fmt(hand.bb)} · {hand.heroPos}
        </span>
        <button className="overlay-close num" onClick={copy}>
          {copied ? '✓ copied' : 'Share'}
        </button>
      </div>
      <div className="entry-summary" style={{ paddingBottom: 24 }}>
        <div className="pot-line">
          <span className={`pot money ${hand.result >= 0 ? 'pos-win' : 'pos-lose'}`}>{fmtSigned(hand.result)}</span>
          <span className="street num">
            pot {fmt(hand.potTotal)} · {fmtBB(hand.result, hand.bb)}
          </span>
        </div>
        <div className="row" style={{ alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ flex: 'none' }}>
            <div className="small dim" style={{ marginBottom: 4 }}>
              You · <b style={{ color: 'var(--brass)' }}>{hand.heroPos}</b>
            </div>
            <CardsRow cards={hand.heroCards} count={2} />
          </div>
          <div style={{ flex: 1 }} />
          {state.board.length > 0 && (
            <div style={{ flex: 'none' }}>
              <div className="small dim" style={{ marginBottom: 4, textAlign: 'right' }}>
                Board
              </div>
              <CardsRow cards={state.board} count={state.board.length} small />
            </div>
          )}
        </div>

        <div className="timeline" style={{ marginBottom: 16 }}>
          {state.log.map((a, i) => {
            const first = i === 0 || state.log[i - 1].street !== a.street
            return (
              <div key={i}>
                {first && <div className="t-street">{a.street}</div>}
                <div className="t-row">
                  <span className="t-pos">{a.pos === hand.heroPos ? `${a.pos}★` : a.pos}</span>
                  <span
                    className={
                      a.verb === 'fold' ? 't-fold' : a.verb === 'allin' ? 't-allin' : a.verb === 'bet' || a.verb === 'raise' ? 't-raise' : 't-call'
                    }
                  >
                    {a.verb === 'fold' && 'folds'}
                    {a.verb === 'check' && 'checks'}
                    {a.verb === 'call' && 'calls'}
                    {a.verb === 'bet' && `bets ${fmt(a.to ?? 0)}`}
                    {a.verb === 'raise' && `raises to ${fmt(a.to ?? 0)}`}
                    {a.verb === 'allin' && `all-in ${fmt(a.to ?? 0)}`}
                  </span>
                </div>
              </div>
            )
          })}
          {Object.entries(state.shown).map(([pos, cs]) => (
            <div className="t-row" key={pos}>
              <span className="t-pos">{pos}</span>
              <span className="t-call">shows {fmtCards(cs)}</span>
            </div>
          ))}
          {state.winners && (
            <div className="t-row">
              <span className="t-pos" />
              <span style={{ color: 'var(--win)', fontWeight: 700 }}>
                {state.winners.map((w) => (w === hand.heroPos ? 'You' : w)).join(' + ')} win
                {state.winners.length === 1 && state.winners[0] !== hand.heroPos ? 's' : ''} {fmt(state.potTotal)}
              </span>
            </div>
          )}
        </div>

        <h2>Tags</h2>
        <div className="chips" style={{ marginBottom: 8 }}>
          {tagChoices.map((t) => (
            <button key={t} className={`chip sm${hand.tags.includes(t) ? ' on' : ''}`} onClick={() => toggleTag(t)}>
              {t}
            </button>
          ))}
        </div>

        <h2>At the table</h2>
        <textarea
          rows={2}
          placeholder="What were you thinking in the moment?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => saveField({ note: note.trim() })}
        />

        <h2>Your review</h2>
        <textarea
          rows={3}
          placeholder="Looking back — what was the mistake? What's the better line?"
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
          onBlur={() => saveField({ reviewNote: reviewNote.trim() })}
        />
        <div className="chips" style={{ margin: '10px 0 18px' }}>
          <button
            className={`chip${hand.reviewed ? ' on' : ''}`}
            onClick={() => saveField({ reviewed: !hand.reviewed })}
          >
            {hand.reviewed ? '✓ Reviewed' : 'Mark reviewed'}
          </button>
          <button className={`chip${hand.flagged ? ' on' : ''}`} onClick={() => saveField({ flagged: !hand.flagged })}>
            {!hand.flagged && <span className="flag-dot" style={{ marginRight: 6 }} />}
            review later
          </button>
        </div>

        <button
          className="btn danger"
          style={{ width: '100%' }}
          onClick={async () => {
            if (!confirmDelete) return setConfirmDelete(true)
            await db.hands.delete(hand.id!)
            onClose()
          }}
        >
          {confirmDelete ? 'Tap again to delete this hand' : 'Delete hand'}
        </button>
      </div>
    </div>
  )
}
