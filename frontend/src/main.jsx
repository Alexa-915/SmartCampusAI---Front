import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { DatasetProvider } from './context/DatasetContext.jsx'
import { AccessibilityProvider } from './context/AccessibilityContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AccessibilityProvider>
        <AuthProvider>
          <DatasetProvider>
            <App />
          </DatasetProvider>
        </AuthProvider>
      </AccessibilityProvider>
    </ThemeProvider>
  </StrictMode>,
)
