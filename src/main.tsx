import React from 'react'
import ReactDOM from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './App'
import './i18n'
import './index.css'

const theme = localStorage.getItem('theme') || 'dark'
document.documentElement.classList.add(theme)

window.addEventListener('error', (e) => {
  console.error('[Global Error]', e.error)
})

window.addEventListener('unhandledrejection', (e) => {
  console.error('[Unhandled Rejection]', e.reason)
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary
      fallback={<div style={{ color: 'white', padding: 40 }}>应用出错，请查看控制台</div>}
    >
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
