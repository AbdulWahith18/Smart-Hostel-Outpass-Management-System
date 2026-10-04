import './mainpage.css'
import './publicpages.css'
import homsLogo from './assets/homsLogo.png'

export default function PublicInfoPage({
  pageKey,
  title,
  subtitle,
  intro,
  sections,
  backActionLabel,
  onBackAction,
  onNavigate,
  onLogin,
  onRegister,
}) {
  return (
    <div className="mp-root pi-root">
      <div className="mp-main-wrap mp-show mp-animate">
        <header className="mp-topbar mp-reveal mp-r0">
          <div className="mp-topbar-inner">
            <div className="mp-topbar-brand">
              <img className="mp-topbar-logo" src={homsLogo} alt="HAVENTRA" />
              <div className="mp-topbar-name">
                <span className="mp-topbar-name-main">HAVENTRA</span>
                <span className="mp-topbar-name-sub">Smart Hostel System</span>
              </div>
            </div>
            <nav className="mp-topbar-nav">
              <button type="button" className={`mp-nav-link ${pageKey === 'about' ? 'pi-nav-active' : ''}`} onClick={() => onNavigate('about')}>
                About
              </button>
              <button type="button" className={`mp-nav-link ${pageKey === 'contact' ? 'pi-nav-active' : ''}`} onClick={() => onNavigate('contact')}>
                Contact
              </button>
              <button type="button" className={`mp-nav-link ${pageKey === 'terms' ? 'pi-nav-active' : ''}`} onClick={() => onNavigate('terms')}>
                Terms &amp; Policy
              </button>
              <button type="button" className="mp-nav-link" onClick={() => onNavigate('home')}>
                Home
              </button>
            </nav>
            <div className="mp-topbar-actions">
              <button className="mp-topbar-register" onClick={onRegister}>Register</button>
              <button className="mp-topbar-login" onClick={onLogin}>Login</button>
            </div>
          </div>
        </header>

        <main className="mp-page pi-page">
          <div className="mp-bg" aria-hidden="true">
            <div className="mp-bg-orb mp-orb-1" />
            <div className="mp-bg-orb mp-orb-2" />
            <div className="mp-bg-orb mp-orb-3" />
            <div className="mp-bg-grid" />
          </div>

          <section className="pi-content mp-reveal mp-r1" aria-labelledby="info-title">
            <div className="mp-badge">
              <span className="mp-badge-dot" />
              HAVENTRA — Smart Hostel Management System
            </div>
            <h1 id="info-title" className="pi-title">{title}</h1>
            <p className="pi-subtitle">{subtitle}</p>
            <p className="pi-intro">{intro}</p>
            {onBackAction && (
              <button type="button" className="pi-back-button" onClick={onBackAction}>
                {backActionLabel ?? 'Back'}
              </button>
            )}
          </section>

          <section className="pi-grid mp-reveal mp-r2" aria-label={`${title} details`}>
            {sections.map((section) => (
              <article className="pi-card" key={section.title}>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
                {section.points?.length > 0 && (
                  <ul>
                    {section.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </section>
        </main>
      </div>
    </div>
  )
}
