import { useEffect, useRef, useState } from 'react'
import { exportAll, importAll, db } from '../db'
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
  const fileRef = useRef<HTMLInputElement>(null)

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

  const doExport = async () => {
    const json = await exportAll()
    const file = new File([json], `pokertrack-backup-${new Date().toISOString().slice(0, 10)}.json`, {
      type: 'application/json'
    })
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

      <h2>Your data</h2>
      <div className="session-card">
        <p className="small dim" style={{ lineHeight: 1.6 }}>
          {counts ? `${counts.hands} hands · ${counts.sessions} sessions` : '…'} — stored only on this
          device.
          <br />
          Storage protection:{' '}
          {persisted === null ? 'unknown' : persisted ? '✓ protected by iOS' : 'not yet granted (install the app to enable)'}
        </p>
      </div>
      <div className="row" style={{ marginBottom: 20 }}>
        <button className="btn" onClick={doExport}>
          Back up (JSON)
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          Restore backup
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

      <p className="small faint" style={{ lineHeight: 1.5 }}>
        Tip: back up once in a while and AirDrop the file to your Mac. Restoring replaces everything on this
        device with the backup's contents.
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
