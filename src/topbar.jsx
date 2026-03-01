import homsLogo from './assets/homsLogo.png'
import logoutIcon from './assets/logout.png'
import './topbar.css'

function TopBar({ showLogout = false, showMenuToggle = false, isSidebarOpen = false, onMenuToggle, onLogout }) {
  return (
    <header className="top-bar" role="banner">
      <div className="top-bar-content">
        <div className="top-bar-left">
          <img src={homsLogo} alt="HOMS logo" className="top-bar-logo" />
          <h1 className="top-bar-title">HOMS</h1>
        </div>

        <div className="top-bar-actions">
          {showMenuToggle && (
            <button
              type="button"
              className={`top-bar-menu-toggle ${isSidebarOpen ? 'top-bar-menu-toggle-open' : ''}`}
              aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isSidebarOpen}
              onClick={onMenuToggle}
            >
              <span className="top-bar-menu-lines" aria-hidden="true" />
            </button>
          )}

          {showLogout && (
            <div className="top-bar-logout-group">
              <span className="top-bar-logout-icon-wrap" aria-hidden="true">
                <img src={logoutIcon} alt="" className="top-bar-logout-icon" />
              </span>
              <button type="button" className="top-bar-logout" onClick={onLogout}>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default TopBar
