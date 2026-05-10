import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { DatasetProvider } from './context/DatasetContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <DatasetProvider>
          <App />
        </DatasetProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
