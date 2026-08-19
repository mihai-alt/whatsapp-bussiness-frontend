import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { RootErrorBoundary } from './components/ViewErrorBoundary.jsx'

window.addEventListener('error', (event) => {
  const root = document.getElementById('root')
  if (!root || root.dataset.ready === '1') return
  const message = event?.error?.message || event?.message || 'This page failed to load.'
  root.innerHTML = `<div style="min-height:100vh;display:grid;place-items:center;background:#0b121b;color:#eef2f7;font-family:sans-serif;padding:24px"><div style="max-width:420px;text-align:center"><p style="font-weight:800;font-size:18px">This page failed to load.</p><p style="margin-top:8px;color:#94a3b8;font-size:14px">${message}</p><button onclick="location.reload()" style="margin-top:20px;background:#25d366;border:0;border-radius:10px;color:#fff;font-weight:700;padding:10px 16px;cursor:pointer">Reload</button></div></div>`
})

const root = createRoot(document.getElementById('root'))
root.render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
)
document.getElementById('root').dataset.ready = '1'
