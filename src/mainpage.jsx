import './mainpage.css'
import homsLogo from './assets/homsLogo.png'

function MainPage({ onLogin, onRegister }) {
  return (
    <main className="main-page">
      <section className="main-card" aria-labelledby="main-title">
        <img className="main-logo" src={homsLogo} alt="HOMS logo" />
        <h1 id="main-title">Hostel Outing Management System</h1>
        <p className="main-subtitle">Manage student outing passes quickly and safely.</p>

        <div className="main-actions">
          <button type="button" className="main-primary-button" onClick={onLogin}>
            Login
          </button>
          <button type="button" className="main-secondary-button" onClick={onRegister}>
            Register
          </button>
        </div>
      </section>
    </main>
  )
}

export default MainPage
