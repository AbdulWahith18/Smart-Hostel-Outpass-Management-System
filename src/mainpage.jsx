import { useEffect, useRef, useState } from 'react'
import './mainpage.css'
import homsLogo from './assets/homsLogo.png'

const FEATURES = [
  { icon: '🎓', label: 'Students', desc: 'Apply for outpass in seconds' },
  { icon: '✅', label: 'RC Approval', desc: 'Review & approve with one click' },
  { icon: '📋', label: 'Track Status', desc: 'Real-time pass status updates' },
]

const STATS = [
  { value: '100%', label: 'Digital' },
  { value: '24/7', label: 'Access' },
  { value: '0', label: 'Paperwork' },
]

// Splash: fade in (1.9s) → hold (1.2s) → fade out (1.9s) = 5s total
const PHASE_DURATIONS = [5000]

export default function MainPage({ onLogin, onRegister, onNavigate }) {
  const [phase, setPhase] = useState(0)
  const [mainVisible, setMainVisible] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })
  const heroRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase(1)
      setTimeout(() => setMainVisible(true), 60)
    }, PHASE_DURATIONS[0])
    return () => clearTimeout(timer)
  }, [])

  const handleMouseMove = (e) => {
    const rect = heroRef.current?.getBoundingClientRect()
    if (!rect) return
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  const splashDone = phase >= 1

  return (
    <div className="mp-root" ref={heroRef} onMouseMove={handleMouseMove}>

      {/* ═══ SPLASH SCREEN ═══ */}
      {!splashDone && (
        <div className="splash" aria-hidden="true">
          <div className="splash-bg">
            <div className="splash-orb splash-orb-1" />
            <div className="splash-orb splash-orb-2" />
            <div className="splash-grid" />
          </div>

          {/* Logo + name — single comet block */}
          <div className="splash-content">
            <div className="splash-logo-wrap">
              <div className="splash-logo-ring" />
              <div className="splash-logo-glow" />
              <img className="splash-logo" src={homsLogo} alt="HOMS" />
            </div>
            <div className="splash-name">
              <span className="splash-name-hostel">Hostel</span>
              <span className="splash-name-outpass">Outpass</span>
              <span className="splash-name-sub">Management System</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MAIN PAGE ═══ */}
      <div className={`mp-main-wrap ${splashDone ? 'mp-show' : 'mp-hide'} ${mainVisible ? 'mp-animate' : ''}`}>

        {/* TOPBAR */}
        <header className="mp-topbar mp-reveal mp-r0">
          <div className="mp-topbar-inner">
            <div className="mp-topbar-brand">
              <img className="mp-topbar-logo" src={homsLogo} alt="HOMS" />
              <div className="mp-topbar-name">
                <span className="mp-topbar-name-main">HOMS</span>
                <span className="mp-topbar-name-sub">Hostel Outpass</span>
              </div>
            </div>
            <nav className="mp-topbar-nav">
              <button type="button" className="mp-nav-link" onClick={() => onNavigate('about')}>About</button>
              <button type="button" className="mp-nav-link" onClick={() => onNavigate('contact')}>Contact</button>
              <button type="button" className="mp-nav-link" onClick={() => onNavigate('terms')}>Terms &amp; Policy</button>
            </nav>
            <div className="mp-topbar-actions">
              <button className="mp-topbar-register" onClick={onRegister}>Register</button>
              <button className="mp-topbar-login" onClick={onLogin}>
                <span className="mp-btn-shine" />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10 17 15 12 10 7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                Login
              </button>
            </div>
          </div>
        </header>

        {/* HERO */}
        <main className="mp-page">
          <div className="mp-bg" aria-hidden="true">
            <div className="mp-bg-orb mp-orb-1" />
            <div className="mp-bg-orb mp-orb-2" />
            <div className="mp-bg-orb mp-orb-3" />
            <div className="mp-bg-cursor" style={{ left: `${mousePos.x}%`, top: `${mousePos.y}%` }} />
            <div className="mp-bg-grid" />
          </div>

          <div className="mp-hero">

            {/* ── Centred headline block ── */}
            <div className="mp-hero-head mp-reveal mp-r1">
              <div className="mp-badge">
                <span className="mp-badge-dot" />
                Hostel Outpass Management Platform
              </div>
              <h1 className="mp-headline">
                <span className="mp-hl-top">Smart Outpass,</span>
                <span className="mp-hl-btm">Paperless Approvals</span>
              </h1>
              <p className="mp-subtitle">
                A single platform where students apply for outing passes and wardens approve them instantly — no queues, no paperwork.
              </p>
            </div>

            {/* ── Stats row ── */}
            <div className="mp-stats mp-reveal mp-r2">
              {STATS.map((s) => (
                <div className="mp-stat" key={s.label}>
                  <span className="mp-stat-value">{s.value}</span>
                  <span className="mp-stat-label">{s.label}</span>
                </div>
              ))}
            </div>

            {/* ── Feature cards ── */}
            <div className="mp-features mp-reveal mp-r3">
              {FEATURES.map((f) => (
                <div className="mp-feature" key={f.label}>
                  <span className="mp-feature-icon">{f.icon}</span>
                  <p className="mp-feature-label">{f.label}</p>
                  <p className="mp-feature-desc">{f.desc}</p>
                </div>
              ))}
            </div>

            {/* ── How it works ── */}
            <div className="mp-steps mp-reveal mp-r4">
              {[
                { n: '01', title: 'Student Applies', desc: 'Fill in destination, leave & return time and submit.' },
                { n: '02', title: 'RC Reviews',      desc: 'Warden sees the request and approves or rejects.' },
                { n: '03', title: 'Pass Issued',     desc: 'Student gets instant confirmation with pass details.' },
              ].map((s) => (
                <div className="mp-step" key={s.n}>
                  <span className="mp-step-num">{s.n}</span>
                  <div>
                    <p className="mp-step-title">{s.title}</p>
                    <p className="mp-step-desc">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>

          <p className="mp-brand mp-reveal mp-r6">
            HOMS <span>·</span> Hostel Outpass Management System
          </p>
        </main>
      </div>
    </div>
  )
}
