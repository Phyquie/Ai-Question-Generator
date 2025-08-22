import { useState } from 'react'
import './App.css'
import PdfUploadLanding from './pages/imageupload.jsx'
import TestPage from './pages/TestPage.jsx'
import TestHistory from './pages/TestHistory.jsx'

function App() {
  const [currentView, setCurrentView] = useState('landing')
  const [extractedText, setExtractedText] = useState('')

  const handleNavigate = (view, data = null) => {
    setCurrentView(view)
    if (view === 'test' && data) {
      setExtractedText(data)
    }
  }

  if (currentView === 'upload') {
    return <PdfUploadLanding onNavigateBack={handleNavigate} />
  }

  if (currentView === 'test') {
    return <TestPage extractedText={extractedText} onNavigateBack={() => handleNavigate('landing')} />
  }

  if (currentView === 'history') {
    return <TestHistory onNavigateBack={() => handleNavigate('landing')} />
  }

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="nav-container">
          <div className="logo">
            <h2>AI Testing Platform</h2>
          </div>
          <nav className="nav-menu">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <button className="nav-btn" onClick={() => setCurrentView('history')}>
              Test History
            </button>
            <button className="cta-btn" onClick={() => setCurrentView('upload')}>
              Start Test
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            — AI POWERED TESTING PLATFORM —
          </div>
          
          <h1 className="hero-title">
            Transform Any PDF into an
            <br />
            Interactive AI Knowledge Test
          </h1>
          
          <p className="hero-subtitle">
            Upload any PDF document and instantly generate 30 personalized multiple choice questions. 
            Features 15-minute timed tests, fullscreen mode, auto-submission, and comprehensive results tracking.
          </p>

          {/* Feature Icons */}
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon blue">�</div>
              <span>Resume Scanning</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon green">❓</div>
              <span>Smart Questions</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon purple">🎯</div>
              <span>Lie Detection</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon orange">📊</div>
              <span>Credibility Score</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon pink">⚙️</div>
              <span>Difficulty Levels</span>
            </div>
          </div>

          {/* CTA Button */}
          <button 
            className="get-started-btn"
            onClick={() => setCurrentView('upload')}
          >
            Try Verification — It's Free
          </button>

          {/* Benefits */}
          <div className="benefits">
            <div className="benefit">
              <span className="checkmark">✓</span>
              <span>Free Resume Upload</span>
            </div>
            <div className="benefit">
              <span className="checkmark">✓</span>
              <span>Instant Verification</span>
            </div>
            <div className="benefit">
              <span className="checkmark">✓</span>
              <span>Detailed Reports</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="trusted-by">
        <p className="trusted-title">Trusted by HR professionals at</p>
        <div className="trusted-logos">
          <div className="trusted-logo">
            <svg className="company-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Google</span>
          </div>
          <div className="trusted-logo">
            <svg className="company-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.4 24H12.6V16.8H11.4V24ZM3.6 15.6H20.4V14.4H3.6V15.6ZM7.2 12H16.8V10.8H7.2V12ZM0 8.4H24V7.2H0V8.4ZM4.8 4.8H19.2V3.6H4.8V4.8ZM9.6 1.2H14.4V0H9.6V1.2Z"/>
            </svg>
            <span>Microsoft</span>
          </div>
          <div className="trusted-logo">
            <svg className="company-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.232 12.064c0-1.001.826-1.825 1.826-1.825.999 0 1.826.824 1.826 1.825 0 1-.827 1.826-1.826 1.826-1 0-1.826-.826-1.826-1.826zm-9.64 6.49c.827.434 2.447 1.284 4.876 1.284 1.515 0 2.542-.434 3.369-1.284l-1.892-1.892c-.434.434-1.284.826-2.17.826-.999 0-1.649-.392-2.083-.826L1.592 18.554zm7.548-15.21c1.892 0 3.262.826 4.262 1.892l3.131-3.131C16.987.392 14.54 0 11.888 0c-3.131 0-6.262 1.284-8.566 3.566l3.131 3.131c.826-1.066 2.196-1.892 4.287-1.892zm9.64 6.49c.827-.434 1.284-1.001 1.284-1.892 0-.999-.457-1.458-1.284-1.892L16.987 9.064c.434.434.826 1.284.826 2.17 0 .999-.392 1.649-.826 2.083l3.793 3.793zm-15.21 7.548c-1.892 0-3.262-.826-4.262-1.892L.177 18.62C1.723 21.347 4.2 24 11.888 24c3.131 0 6.262-1.284 8.566-3.566l-3.131-3.131c-.826 1.066-2.196 1.892-4.287 1.892z"/>
            </svg>
            <span>Amazon</span>
          </div>
          <div className="trusted-logo">
            <svg className="company-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span>Meta</span>
          </div>
          <div className="trusted-logo">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-apple" viewBox="0 0 16 16">
  <path d="M11.182.008C11.148-.03 9.923.023 8.857 1.18c-1.066 1.156-.902 2.482-.878 2.516s1.52.087 2.475-1.258.762-2.391.728-2.43m3.314 11.733c-.048-.096-2.325-1.234-2.113-3.422s1.675-2.789 1.698-2.854-.597-.79-1.254-1.157a3.7 3.7 0 0 0-1.563-.434c-.108-.003-.483-.095-1.254.116-.508.139-1.653.589-1.968.607-.316.018-1.256-.522-2.267-.665-.647-.125-1.333.131-1.824.328-.49.196-1.422.754-2.074 2.237-.652 1.482-.311 3.83-.067 4.56s.625 1.924 1.273 2.796c.576.984 1.34 1.667 1.659 1.899s1.219.386 1.843.067c.502-.308 1.408-.485 1.766-.472.357.013 1.061.154 1.782.539.571.197 1.111.115 1.652-.105.541-.221 1.324-1.059 2.238-2.758q.52-1.185.473-1.282"/>
  <path d="M11.182.008C11.148-.03 9.923.023 8.857 1.18c-1.066 1.156-.902 2.482-.878 2.516s1.52.087 2.475-1.258.762-2.391.728-2.43m3.314 11.733c-.048-.096-2.325-1.234-2.113-3.422s1.675-2.789 1.698-2.854-.597-.79-1.254-1.157a3.7 3.7 0 0 0-1.563-.434c-.108-.003-.483-.095-1.254.116-.508.139-1.653.589-1.968.607-.316.018-1.256-.522-2.267-.665-.647-.125-1.333.131-1.824.328-.49.196-1.422.754-2.074 2.237-.652 1.482-.311 3.83-.067 4.56s.625 1.924 1.273 2.796c.576.984 1.34 1.667 1.659 1.899s1.219.386 1.843.067c.502-.308 1.408-.485 1.766-.472.357.013 1.061.154 1.782.539.571.197 1.111.115 1.652-.105.541-.221 1.324-1.059 2.238-2.758q.52-1.185.473-1.282"/>
</svg>
            <span>Apple</span>
          </div>
        </div>
      </section>
    </>
  )
}

export default App
