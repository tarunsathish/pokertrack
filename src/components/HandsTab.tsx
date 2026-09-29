import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type HandRecord } from '../db'
import { HandRow } from './HandRow'
import { HandDetail } from './HandDetail'
import { ChipRing } from './Icons'

type Filter = 'all' | 'review' | 'won' | 'lost'

export function HandsTab({ seed, onSeedConsumed }: {
  seed?: 'review' | null
  onSeedConsumed?: () => void
}) {
  const [filter, setFilter] = useState<Filter>(seed ?? 'all')
  useEffect(() => {
    if (seed) onSeedConsumed?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [posFilter, setPosFilter] = useState<string | null>(null)
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)

  const hands = useLiveQuery(() => db.hands.orderBy('ts').reverse().toArray(), [])

  const allTags = useMemo(() => {
    const s = new Set<string>()
    for (const h of hands ?? []) for (const t of h.tags) s.add(t)
    return [...s]
  }, [hands])

  const allPositions = useMemo(() => {
    const s = new Set<string>()
    for (const h of hands ?? []) s.add(h.heroPos)
    return [...s]
  }, [hands])

  const filtered = (hands ?? []).filter((h: HandRecord) => {
    if (filter === 'review' && !(h.flagged && !h.reviewed)) return false
    if (filter === 'won' && h.result < 0) return false
    if (filter === 'lost' && h.result >= 0) return false
    if (posFilter && h.heroPos !== posFilter) return false
    if (tagFilter && !h.tags.includes(tagFilter)) return false
    return true
  })

  const openHand = openId !== null ? (hands ?? []).find((h) => h.id === openId) : null

  return (
    <div className="view">
      <h1 style={{ marginBottom: 16 }}>Hands</h1>
      <div className="chips" style={{ marginBottom: 10 }}>
        {(['all', 'review', 'won', 'lost'] as Filter[]).map((f) => (
          <button key={f} className={`chip sm${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)}>
            {f === 'review' ? (
              <>
                <span className="flag-dot" style={{ marginRight: 6 }} />
                to review
              </>
            ) : (
              f
            )}
          </button>
        ))}
      </div>
      {(allPositions.length > 1 || allTags.length > 0) && (
        <div className="chips" style={{ marginBottom: 10 }}>
          {allPositions.map((p) => (
            <button
              key={p}
              className={`chip sm${posFilter === p ? ' on' : ''}`}
              onClick={() => setPosFilter(posFilter === p ? null : p)}
            >
              {p}
            </button>
          ))}
          {allTags.map((t) => (
            <button
              key={t}
              className={`chip sm${tagFilter === t ? ' on' : ''}`}
              onClick={() => setTagFilter(tagFilter === t ? null : t)}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <ChipRing size={40} />
          <div>
            {hands && hands.length > 0
              ? 'No hands match these filters.'
              : 'Every hand you log shows up here, ready to review. Start a session on the Play tab and log your first one.'}
          </div>
        </div>
      ) : (
        <div className="group" style={{ marginTop: 6 }}>
          {filtered.map((h) => (
            <HandRow key={h.id} hand={h} onClick={() => setOpenId(h.id!)} />
          ))}
        </div>
      )}

      {openHand && <HandDetail hand={openHand} onClose={() => setOpenId(null)} />}
    </div>
  )
}
