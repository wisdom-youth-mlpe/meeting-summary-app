import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { useRegisterSW } from 'virtual:pwa-register/react'

// Auto-update component: reloads the page when a new version is deployed
function AutoUpdate() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegistered(r) {
      // Check for updates every 60 seconds
      if (r) {
        setInterval(() => r.update(), 60 * 1000);
      }
    },
  });

  useEffect(() => {
    if (needRefresh) {
      // New version detected — update SW and reload automatically
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AutoUpdate />
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
