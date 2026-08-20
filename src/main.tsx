import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ThemeProvider } from './theme'
import { ThemeToggle } from './components/ThemeToggle'
import { trackDailyVisit } from './analytics'
import { bootstrapCloudSync } from './bootstrapSync'
import './index.css'

trackDailyVisit()
bootstrapCloudSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
        <ThemeToggle />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
