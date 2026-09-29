import { useEffect, useMemo, useState } from 'react'
import type { Session, HandRecord } from '../db'
import {
  replayHand,
  heroResult,
  needsShowdown,
  type HandEvent,
  type HandSetup,
  type HandState,
  type Street,
  STREETS
} from '../engine/hand'
import { positionsFor } from '../engine/positions'
import { fmt, fmtBB, fmtSigned, type Cents } from '../engine/money'
import type { Card } from '../engine/cards'
import { CardKeypad } from './CardKeypad'
import { BetPad } from './BetPad'
import { CardsRow } from './MiniCard'
import { useSwipeBack } from '../useSwipeBack'
import { loadSettings, saveSettings } from '../settings'

const DRAFT_KEY = 'pokertrack-draft'

export interface Draft {
  sessionId: number
  heroPos: string
  tableSize: number
  straddleOn: boolean
  heroCards: Card[]
  events: HandEvent[]
}

export function loadDraft(sessionId: number): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d = JSON.parse(raw) as Draft
    return d.sessionId === sessionId ? d : null
  } catch {
    return null
  }
}

type BetMode = 'bet' | 'raise' | 'allin' | null

export function HandEntry({ session, defaultPos, draft, tagPresets, onSave, onClose, onTableSizeChange }: {
  session: Session
  defaultPos: string
  draft: Draft | null
  tagPresets: string[]
  onSave: (rec: Omit<HandRecord, 'id'>) => void
  onClose: () => void
  onTableSizeChange?: (n: number) => void
}) {
  const [heroPos, setHeroPos] = useState(draft?.heroPos ?? defaultPos)
  const [tableSize, setTableSize] = useState(draft?.tableSize ?? session.tableSize)
  const [straddleOn, setStraddleOn] = useState(draft?.straddleOn ?? false)
  const [heroCards, setHeroCards] = useState<Card[]>(draft?.heroCards ?? [])
  const [events, setEvents] = useState<HandEvent[]>(draft?.events ?? [])
  const [pendingBoard, setPendingBoard] = useState<Card[]>([])
  const [betMode, setBetMode] = useState<BetMode>(null)
  const [actorSel, setActorSel] = useState<string | null>(null)
  const [winnersSel, setWinnersSel] = useState<string[]>([])
  const [editSlot, setEditSlot] = useState<number | null>(null)
  const [posEdit, setPosEdit] = useState(false)
  const [shownEntry, setShownEntry] = useState<{ pos: string; cards: Card[] } | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [flagged, setFlagged] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  // Hole cards are optional and can be filled in after the hand. Someone
  // glancing at the phone at the table can read them, so the flow must never
  // force them onto the screen while you're still in the pot.
  const [cardsDeferred, setCardsDeferred] = useState((draft?.heroCards ?? []).length === 0 && (draft?.events ?? []).length > 0)
  const [cardsHidden, setCardsHidden] = useState(loadSettings().hideHoleCards)

  const changeTableSize = (n: number) => {
    setTableSize(n)
    onTableSizeChange?.(n)
    const seats = positionsFor(n)
    if (!seats.includes(heroPos)) setHeroPos(n >= 3 ? 'BTN' : 'SB')
    if (n < 3) setStraddleOn(false)
  }

  const setup: HandSetup = useMemo(
    () => ({
      tableSize,
      heroPos,
      sb: session.sb,
      bb: session.bb,
      ante: session.ante,
      straddles: straddleOn && tableSize >= 3 ? [session.bb * 2] : [],
      heroStack: null
    }),
    [tableSize, heroPos, session, straddleOn]
  )

  const state: HandState = useMemo(() => replayHand(setup, events), [setup, events])

  // Persist draft on every change so a phone call / app kill loses nothing.
  useEffect(() => {
    const d: Draft = { sessionId: session.id!, heroPos, tableSize, straddleOn, heroCards, events }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d))
  }, [session.id, heroPos, tableSize, straddleOn, heroCards, events])

  const clearDraft = () => localStorage.removeItem(DRAFT_KEY)

  const toggleHidden = () => {
    const next = !cardsHidden
    setCardsHidden(next)
    saveSettings({ ...loadSettings(), hideHoleCards: next })
  }

  const seats = positionsFor(tableSize)
  const lastShowdownIdx = events.findIndex((e) => e.type === 'showdown')
  const shown: Record<string, Card[]> =
    lastShowdownIdx >= 0 ? ((events[lastShowdownIdx] as any).shown ?? {}) : {}

  const usedCards: Card[] = [
    ...heroCards,
    ...state.board,
    ...pendingBoard,
    ...Object.values(shown).flat(),
    ...(shownEntry?.cards ?? [])
  ].filter((c) => c[1] !== 'x')

  // ----- phase -----
  type Phase = 'cards' | 'action' | 'bet' | 'board' | 'showdown' | 'result' | 'shown-cards' | 'position'
  let phase: Phase
  if (posEdit) phase = 'position'
  else if (editSlot !== null || (heroCards.length < 2 && !cardsDeferred && events.length === 0))
    phase = 'cards'
  else if (shownEntry) phase = 'shown-cards'
  else if (betMode) phase = 'bet'
  else if (!state.handOver && state.toAct !== null) phase = 'action'
  else if (!state.handOver && state.toAct === null) phase = 'board'
  else if (needsShowdown(state)) phase = 'showdown'
  else phase = 'result'

  const nextStreet: Street = state.street === 'preflop' ? 'flop' : state.street === 'flop' ? 'turn' : 'river'
  const boardNeed = state.street === 'preflop' ? 3 : 1

  const live = state.players.filter((p) => !p.folded)
  const contendersList = state.players.filter((p) => !p.folded && !p.allIn)
  const actor = actorSel ?? state.toAct
  const actorState = actor ? state.players.find((p) => p.pos === actor) : undefined
  const owe = actorState ? Math.max(0, state.currentBet - actorState.committed) : 0

  // ----- input handlers -----
  const addCard = (card: Card) => {
    if (editSlot !== null) {
      setHeroCards((cs) => {
        const next = [...cs]
        next[editSlot] = card
        return next
      })
      setEditSlot(null)
    } else if (phase === 'cards') {
      setHeroCards((cs) => [...cs, card])
    } else if (phase === 'shown-cards' && shownEntry) {
      const cards = [...shownEntry.cards, card]
      if (cards.length === 2) {
        setEvents((evs) =>
          evs.map((e) =>
            e.type === 'showdown' ? { ...e, shown: { ...(e.shown ?? {}), [shownEntry.pos]: cards } } : e
          )
        )
        setShownEntry(null)
      } else {
        setShownEntry({ ...shownEntry, cards })
      }
    } else if (phase === 'board') {
      const nb = [...pendingBoard, card]
      if (nb.length === boardNeed) {
        setEvents((evs) => [...evs, { type: 'board', cards: nb }])
        setPendingBoard([])
      } else {
        setPendingBoard(nb)
      }
    }
  }

  const pushAction = (verb: 'fold' | 'check' | 'call') => {
    if (!actor) return
    setEvents((evs) => [...evs, { type: 'action', pos: actor, verb }])
    setActorSel(null)
  }

  const confirmBet = (to: Cents) => {
    if (!actor || !betMode) return
    const verb = betMode === 'allin' ? 'allin' : state.currentBet > 0 ? 'raise' : 'bet'
    setEvents((evs) => [...evs, { type: 'action', pos: actor, verb, to }])
    setBetMode(null)
    setActorSel(null)
  }

  const undo = () => {
    setConfirmClose(false)
    if (posEdit) return setPosEdit(false)
    if (betMode) return setBetMode(null)
    if (shownEntry) return setShownEntry(null)
    if (editSlot !== null) return setEditSlot(null)
    if (pendingBoard.length > 0) return setPendingBoard(pendingBoard.slice(0, -1))
    if (events.length > 0) {
      const last = events[events.length - 1]
      setEvents(events.slice(0, -1))
      if (last.type === 'board') setPendingBoard(last.cards.slice(0, -1))
      if (last.type === 'showdown') setWinnersSel(last.winners)
      return
    }
    if (heroCards.length > 0) setHeroCards(heroCards.slice(0, -1))
  }

  const save = () => {
    const rec: Omit<HandRecord, 'id'> = {
      sessionId: session.id!,
      ts: Date.now(),
      setup,
      events,
      heroCards,
      heroPos,
      board: state.board,
      result: heroResult(state, heroPos),
      potTotal: state.potTotal,
      sb: session.sb,
      bb: session.bb,
      tags,
      note: note.trim(),
      reviewNote: '',
      flagged,
      reviewed: false
    }
    clearDraft()
    onSave(rec)
  }

  const requestClose = () => {
    const dirty = heroCards.length > 0 || events.length > 0
    if (dirty && !confirmClose) return setConfirmClose(true)
    clearDraft()
    onClose()
  }

  // ----- render -----
  const heroRes = state.handOver && state.winners ? heroResult(state, heroPos) : null
  // edge-swipe-back leaves the hand without discarding — the draft stays resumable
  const swipeBack = useSwipeBack(onClose)

  return (
    <div className="overlay" {...swipeBack.handlers} style={swipeBack.style}>
      <div className="overlay-head">
        <button className="overlay-close" onClick={undo}>
          ↩ Undo
        </button>
        <span className="overlay-title num">
          {fmt(session.sb)}/{fmt(session.bb)}
          {straddleOn ? ' +straddle' : ''}
        </span>
        <button className="overlay-close" style={confirmClose ? { color: 'var(--loss)' } : undefined} onClick={requestClose}>
          {confirmClose ? 'Discard?' : '✕'}
        </button>
      </div>

      <div className="entry-summary">
        <div className="pot-line">
          <span className="pot money">{fmt(state.potTotal)}</span>
          <span className="street">{state.handOver ? 'hand over' : state.street}</span>
        </div>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 'none' }}>
            <button
              className="small dim"
              style={{ marginBottom: 4, display: 'block', padding: '10px', margin: '-10px -10px -4px', minHeight: 44 }}
              onClick={() => setPosEdit(true)}
            >
              You · <b style={{ color: 'var(--brass)' }}>{heroPos}</b> <span className="faint">✎</span>
            </button>
            <div className={`hero-cards${cardsHidden && heroCards.length > 0 ? ' hidden' : ''}`}>
              <CardsRow
                cards={heroCards}
                count={2}
                activeIndex={editSlot ?? (phase === 'cards' ? heroCards.length : undefined)}
                onSlot={(i) => (heroCards[i] ? setEditSlot(i) : setEditSlot(i))}
              />
              {heroCards.length > 0 && (
                <button
                  className="peek"
                  aria-label={cardsHidden ? 'Show your cards' : 'Hide your cards'}
                  onClick={toggleHidden}
                >
                  {cardsHidden ? 'tap to show' : 'hide'}
                </button>
              )}
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ flex: 'none' }}>
            <div className="small dim" style={{ marginBottom: 4, textAlign: 'right' }}>
              Board
            </div>
            <CardsRow
              cards={[...state.board, ...pendingBoard]}
              count={5}
              small
              labels={['F', 'F', 'F', 'T', 'R']}
              activeIndex={phase === 'board' ? state.board.length + pendingBoard.length : undefined}
            />
          </div>
        </div>

        <div className="timeline">
          {STREETS.filter((st) => state.log.some((a) => a.street === st)).map((st) => (
            <div key={st}>
              <div className="t-street">{st}</div>
              <div className="t-street-group">
                {state.log
                  .filter((a) => a.street === st)
                  .map((a, i) => (
                    <span className="t-row" key={i}>
                      <span className="t-pos">{a.pos === heroPos ? 'You' : a.pos}</span>
                      <span
                        className={
                          a.verb === 'fold'
                            ? 't-fold'
                            : a.verb === 'allin'
                              ? 't-allin'
                              : a.verb === 'bet' || a.verb === 'raise'
                                ? 't-raise'
                                : 't-call'
                        }
                      >
                        {a.verb === 'fold' && 'folds'}
                        {a.verb === 'check' && 'checks'}
                        {a.verb === 'call' && 'calls'}
                        {a.verb === 'bet' && fmt(a.to ?? 0)}
                        {a.verb === 'raise' && `to ${fmt(a.to ?? 0)}`}
                        {a.verb === 'allin' && `all-in ${fmt(a.to ?? 0)}`}
                      </span>
                    </span>
                  ))}
              </div>
            </div>
          ))}
          {Object.entries(shown).map(([pos, cs]) => (
            <div className="t-row" key={pos}>
              <span className="t-pos">{pos}</span>
              <span className="t-call">shows {cs.join(' ')}</span>
            </div>
          ))}
          {state.error && <div style={{ color: 'var(--loss)' }}>⚠ {state.error} — tap Undo</div>}
        </div>
      </div>

      <div className="panel">
        {phase === 'position' && (
          <>
            <div className="panel-q">
              Where's the button? Pick <b>your position</b> this hand
            </div>
            <div className="chips" style={{ justifyContent: 'center', marginBottom: 12 }}>
              {seats.map((pos) => (
                <button
                  key={pos}
                  className={`chip${pos === heroPos ? ' on' : ''}`}
                  onClick={() => {
                    setHeroPos(pos)
                    setPosEdit(false)
                  }}
                >
                  {pos}
                </button>
              ))}
            </div>
            <button className="btn big" onClick={() => setPosEdit(false)}>
              Done
            </button>
          </>
        )}

        {phase === 'cards' && (
          <>
            {heroCards.length === 0 && editSlot === null && (
              <div style={{ marginBottom: 10 }}>
                <div className="actor-row">
                  {seats.map((pos) => (
                    <button
                      key={pos}
                      className={`chip sm${pos === heroPos ? ' on' : ''}`}
                      onClick={() => setHeroPos(pos)}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
                <div className="row" style={{ marginBottom: 4 }}>
                  <div className="stepper" style={{ flex: 1 }}>
                    <button onClick={() => changeTableSize(Math.max(2, tableSize - 1))}>−</button>
                    <span>{tableSize} players</span>
                    <button onClick={() => changeTableSize(Math.min(10, tableSize + 1))}>+</button>
                  </div>
                  <button
                    className={`chip${straddleOn ? ' on' : ''}`}
                    style={{ flex: 'none', justifyContent: 'center' }}
                    onClick={() => tableSize >= 3 && setStraddleOn(!straddleOn)}
                  >
                    Straddle {fmt(session.bb * 2)}
                  </button>
                </div>
              </div>
            )}
            <div className="panel-q">
              {editSlot !== null ? (
                <>Replace card {editSlot + 1}</>
              ) : (
                <>
                  Your cards — <b>{heroCards.length === 0 ? 'first card' : 'second card'}</b>
                </>
              )}
              {editSlot === null && (
                <button className="panel-skip" onClick={() => setCardsDeferred(true)}>
                  Add later
                </button>
              )}
            </div>
            <CardKeypad used={usedCards} onCard={addCard} allowUnknownSuit />
          </>
        )}

        {phase === 'action' && actor && (
          <>
            <div className="panel-q">
              Action on <b>{actor}</b>
              {actor === heroPos ? ' (you)' : ''}
            </div>
            <div className="actor-row">
              {contendersList.map((p) => (
                <button
                  key={p.pos}
                  className={`chip sm${p.pos === actor ? ' on' : ''}`}
                  onClick={() => setActorSel(p.pos)}
                >
                  {p.pos === heroPos ? `${p.pos}★` : p.pos}
                </button>
              ))}
            </div>
            <div className="action-grid">
              <button className="btn fold" onClick={() => pushAction('fold')}>
                Fold
              </button>
              <button className="btn call num" onClick={() => pushAction(owe > 0 ? 'call' : 'check')}>
                {owe > 0 ? `Call ${fmt(owe)}` : 'Check'}
              </button>
              <button className="btn raisebtn" onClick={() => setBetMode(state.currentBet > 0 ? 'raise' : 'bet')}>
                {state.currentBet > 0 ? 'Raise' : 'Bet'}
              </button>
              <button className="btn allin" onClick={() => setBetMode('allin')}>
                All-in
              </button>
              <button
                className="btn wide"
                onClick={() => setEvents((evs) => [...evs, { type: 'passive-rest' }])}
              >
                {state.currentBet > 0 && contendersList.some((p) => p.committed < state.currentBet)
                  ? 'Everyone else folds'
                  : 'Checks through'}
              </button>
            </div>
          </>
        )}

        {phase === 'bet' && actorState && (
          <BetPad
            bb={session.bb}
            pot={state.potTotal}
            currentBet={state.currentBet}
            lastRaiseSize={state.lastRaiseSize}
            committed={actorState.committed}
            isPreflop={state.street === 'preflop'}
            allIn={betMode === 'allin'}
            onConfirm={confirmBet}
            onCancel={() => setBetMode(null)}
          />
        )}

        {phase === 'board' && (
          <>
            <div className="panel-q">
              {nextStreet === 'flop' ? (
                <>
                  Flop — <b>card {pendingBoard.length + 1} of 3</b>
                </>
              ) : (
                <>
                  <b style={{ textTransform: 'capitalize' }}>{nextStreet}</b> card
                </>
              )}
            </div>
            <CardKeypad used={usedCards} onCard={addCard} />
          </>
        )}

        {phase === 'showdown' && (
          <>
            <div className="panel-q">
              Who won the <b className="num">{fmt(state.potTotal)}</b> pot?
            </div>
            <div className="chips" style={{ justifyContent: 'center', marginBottom: 12 }}>
              {live.map((p) => (
                <button
                  key={p.pos}
                  className={`chip${winnersSel.includes(p.pos) ? ' on' : ''}`}
                  onClick={() =>
                    setWinnersSel((w) =>
                      w.includes(p.pos) ? w.filter((x) => x !== p.pos) : [...w, p.pos]
                    )
                  }
                >
                  {p.pos === heroPos ? `${p.pos}★ (you)` : p.pos}
                </button>
              ))}
            </div>
            <button
              className="btn big primary"
              disabled={winnersSel.length === 0}
              onClick={() => {
                setEvents((evs) => [...evs, { type: 'showdown', winners: winnersSel }])
              }}
            >
              {winnersSel.length > 1 ? 'Chopped pot' : 'Confirm winner'}
            </button>
          </>
        )}

        {phase === 'shown-cards' && shownEntry && (
          <>
            <div className="panel-q">
              <b>{shownEntry.pos}</b> shows — card {shownEntry.cards.length + 1} of 2
            </div>
            <CardKeypad used={usedCards} onCard={addCard} allowUnknownSuit />
          </>
        )}

        {phase === 'result' && (
          <>
            <div className="bet-display money">
              <span className={heroRes !== null && heroRes >= 0 ? 'pos-win' : 'pos-lose'}>
                {heroRes !== null ? fmtSigned(heroRes) : ''}
              </span>{' '}
              <span className="sub">
                pot {fmt(state.potTotal)} · {heroRes !== null ? fmtBB(heroRes, session.bb) : ''}
              </span>
            </div>
            {live.filter((p) => p.pos !== heroPos && !shown[p.pos]).length > 0 && (
              <div className="chips" style={{ marginBottom: 10 }}>
                {live
                  .filter((p) => p.pos !== heroPos && !shown[p.pos])
                  .map((p) => (
                    <button
                      key={p.pos}
                      className="chip sm"
                      onClick={() =>
                        lastShowdownIdx >= 0 && setShownEntry({ pos: p.pos, cards: [] })
                      }
                      disabled={lastShowdownIdx < 0}
                    >
                      + {p.pos} cards
                    </button>
                  ))}
              </div>
            )}
            {/* The hand is over and nobody's looking at your phone any more —
                this is the natural moment to record what you held. */}
            {heroCards.length < 2 && (
              <button
                className="btn"
                style={{ width: '100%', marginBottom: 10 }}
                onClick={() => {
                  setCardsDeferred(false)
                  setEditSlot(heroCards.length)
                }}
              >
                Add your cards{heroCards.length === 1 ? ' (1 to go)' : ''}
              </button>
            )}
            <div className="chips" style={{ marginBottom: 10 }}>
              {tagPresets.map((t) => (
                <button
                  key={t}
                  className={`chip sm${tags.includes(t) ? ' on' : ''}`}
                  onClick={() => setTags((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]))}
                >
                  {t}
                </button>
              ))}
              <button
                className={`chip sm${flagged ? ' on' : ''}`}
                onClick={() => setFlagged(!flagged)}
              >
                {!flagged && <span className="flag-dot" style={{ marginRight: 6 }} />}
                review later
              </button>
            </div>
            <input
              placeholder="Note — what were you thinking?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            <button className="btn big primary" onClick={save}>
              Save hand
            </button>
          </>
        )}
      </div>
    </div>
  )
}
