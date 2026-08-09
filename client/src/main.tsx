import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { FeedbackProvider } from './components/Feedback'
import { AuthProvider } from './lib/auth'
import './styles.css'
import './hero-slider.css'
import './pdf-changes.css'

const app = (
  <StrictMode>
    <BrowserRouter>
      <FeedbackProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </FeedbackProvider>
    </BrowserRouter>
  </StrictMode>
)

createRoot(document.getElementById('root')!).render(app)
