import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { loadSettings, applyTheme } from './settings'
import './styles.css'

registerSW({ immediate: true })

applyTheme(loadSettings().theme)

// Ask iOS/Safari to protect our storage from eviction.
if (navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
