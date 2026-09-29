import { useEffect, useRef, useState } from 'react'
import { exportAll, exportHandsCsv, exportSessionsCsv, importAll, db } from '../db'
import { useLiveQuery } from 'dexie-react-hooks'
import { loadSettings, saveSettings, applyTheme, THEMES, type ThemeId } from '../settings'

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function SettingsTab({ onToast }: { onToast: (msg: string) => void }) {
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [theme, setTheme] = useState<ThemeId>(() => loadSettings().theme)
  const [hideCards, setHideCards] = useState(() => loadSettings().hideHoleCards)
  const fileRef = useRef<HTMLInputElement>(null)

  const toggleHideCards = () => {
    const next = !hideCards
    setHideCards(next)
    saveSettings({ ...loadSettings(), hideHoleCards: next })
  }

  const pickTheme = (id: ThemeId) => {
    setTheme(id)
    applyTheme(id)
    saveSettings({ ...loadSettings(), theme: id })
  }
  const counts = useLiveQuery(async () => ({
    sessions: await db.sessions.count(),
    hands: await db.hands.count()
  }))

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null))
  }, [])

  /** Hand the file to the iOS share sheet, falling back to a download. */
  const deliver = async (name: string, type: string, body: string) => {
    const file = new File([body], name, { type })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] })
        return
      } catch {
        /* user cancelled or share failed — fall through to download */
      }
    }
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
  }

  const stamp = () => new Date().toISOString().slice(0, 10)

  const doExport = () =>
    exportAll().then((j) => deliver(`pokertrack-backup-${stamp()}.json`, 'application/json', j))

  const doCsv = async (which: 'sessions' | 'hands') => {
    const body = which === 'sessions' ? await exportSessionsCsv() : await exportHandsCsv()
    await deliver(`pokertrack-${which}-${stamp()}.csv`, 'text/csv', body)
  }

  const doImport = async (f: File) => {
    try {
      const res = await importAll(await f.text())
      onToast(`Restored ${res.sessions} sessions, ${res.hands} hands`)
    } catch (e) {
      onToast(`Import failed: ${e instanceof Error ? e.message : 'bad file'}`)
    }
  }

  return (
    <div className="view">
      <h1 style={{ marginBottom: 16 }}>Settings</h1>

      <h2>Table felt</h2>
      <div className="theme-row">
        {THEMES.map((t) => (
          <button
            key={t.id}
            className={`theme-swatch${theme === t.id ? ' on' : ''}`}
            onClick={() => pickTheme(t.id)}
          >
            <span className="swatch" style={{ background: t.swatch }} />
            <b>{t.name}</b>
            <span className="small faint">{t.blurb}</span>
          </button>
        ))}
      </div>

      {!isStandalone() && (
        <div className="session-card">
          <b>Install PokerTrack on your home screen</b>
          <p className="small dim" style={{ marginTop: 6, lineHeight: 1.5 }}>
            In Safari, tap the <b>Share</b> button, then <b>Add to Home Screen</b>. Installed, the app works
            offline and iOS protects your hand data from being cleaned up.
          </p>
        </div>
      )}

      <h2>At the table</h2>
      <div className="group prose">
        <button className="hand-row" onClick={toggleHideCards}>
          <div className="meta">
            <div className="line1">Hide my hole cards</div>
            <div className="line2">Blur them until tapped, so a neighbour can't read your hand</div>
          </div>
          <span className={`toggle${hideCards ? ' on' : ''}`} role="switch" aria-checked={hideCards} />
        </button>
      </div>

      <h2>Your data</h2>
      <div className="group prose">
        <div className="hand-row">
          <div className="meta">
            <div className="line1">On this device</div>
            <div className="line2">
              {counts ? `${counts.hands} hands · ${counts.sessions} sessions` : '…'} — never leaves
              your phone
            </div>
          </div>
        </div>
        <div className="hand-row">
          <div className="meta">
            <div className="line1">Storage protection</div>
            <div className="line2">
              {persisted === null
                ? 'Unknown'
                : persisted
                  ? 'Granted — iOS won\u2019t evict your data'
                  : 'Not granted — install to the home screen to enable'}
            </div>
          </div>
          <span className={`dot-state${persisted ? ' ok' : ''}`} />
        </div>
      </div>

      <h2>Export</h2>
      <div className="group prose">
        <button className="hand-row" onClick={() => doCsv('sessions')}>
          <div className="meta">
            <div className="line1">Sessions spreadsheet</div>
            <div className="line2">CSV — opens in Excel or Numbers, one row per session</div>
          </div>
          <span className="faint">›</span>
        </button>
        <button className="hand-row" onClick={() => doCsv('hands')}>
          <div className="meta">
            <div className="line1">Hands spreadsheet</div>
            <div className="line2">CSV — one row per logged hand, with cards and result</div>
          </div>
          <span className="faint">›</span>
        </button>
        <button className="hand-row" onClick={doExport}>
          <div className="meta">
            <div className="line1">Full backup</div>
            <div className="line2">JSON — the only format that can be restored below</div>
          </div>
          <span className="faint">›</span>
        </button>
        <button className="hand-row" onClick={() => fileRef.current?.click()}>
          <div className="meta">
            <div className="line1">Restore from backup</div>
            <div className="line2">Replaces everything on this device</div>
          </div>
          <span className="faint">›</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) doImport(f)
            e.target.value = ''
          }}
        />
      </div>
      <p className="small faint" style={{ lineHeight: 1.5, margin: '8px 4px 0' }}>
        Spreadsheets are for reading your results elsewhere — they can't be imported back. Keep a JSON
        backup for that.
      </p>

      <h2>Danger zone</h2>
      <button
        className="btn danger"
        style={{ width: '100%' }}
        onClick={async () => {
          if (!confirmWipe) {
            setConfirmWipe(true)
            setTimeout(() => setConfirmWipe(false), 4000)
            return
          }
          await db.transaction('rw', db.sessions, db.hands, async () => {
            await db.sessions.clear()
            await db.hands.clear()
          })
          setConfirmWipe(false)
          onToast('All sessions and hands deleted')
        }}
      >
        {confirmWipe ? 'Tap again to delete EVERYTHING' : 'Delete all data (start fresh)'}
      </button>
    </div>
  )
}
