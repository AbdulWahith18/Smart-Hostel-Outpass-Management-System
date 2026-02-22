import { useState } from 'react'
import './App.css'
import Register from './register'
import StudentHome from './studenthome'
import RCHome from './rchome'
import MainPage from './mainpage'
import TopBar from './topbar'

function App() {
  const [showMainPage, setShowMainPage] = useState(true)
  const [showRegister, setShowRegister] = useState(false)
  const [showStudentHome, setShowStudentHome] = useState(false)
  const [showRCHome, setShowRCHome] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [userType, setUserType] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userType, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.message ?? 'Login failed.')
        return
      }

      localStorage.setItem('authToken', data.token)
      setCurrentUser(data.user)

      if (data.user.userType === 'Student') {
        setShowStudentHome(true)
        return
      }

      if (data.user.userType === 'RC') {
        setShowRCHome(true)
      }
    } catch {
      alert('Unable to reach server. Please try again.')
    }
  }

  const handleOpenRegister = (event) => {
    event.preventDefault()
    setShowMainPage(false)
    setShowRegister(true)
  }

  const handleOpenLogin = () => {
    setShowMainPage(false)
    setShowRegister(false)
  }

  const handleOpenRegisterFromMain = () => {
    setShowMainPage(false)
    setShowRegister(true)
  }

  const handleBackToLogin = () => {
    localStorage.removeItem('authToken')
    setCurrentUser(null)
    setUserType('')
    setEmail('')
    setPassword('')
    setShowRegister(false)
    setShowStudentHome(false)
    setShowRCHome(false)
  }

  if (showRegister) {
    return (
      <>
        <TopBar />
        <Register onBackToLogin={handleBackToLogin} />
      </>
    )
  }

  if (showStudentHome) {
    return (
      <>
        <TopBar showLogout onLogout={handleBackToLogin} />
        <StudentHome currentUser={currentUser} />
      </>
    )
  }

  if (showRCHome) {
    return (
      <>
        <TopBar showLogout onLogout={handleBackToLogin} />
        <RCHome currentRc={currentUser} />
      </>
    )
  }

  if (showMainPage) {
    return <MainPage onLogin={handleOpenLogin} onRegister={handleOpenRegisterFromMain} />
  }

  return (
    <>
      <TopBar />
      <main className="login-page">
        <section className="login-card" aria-labelledby="login-title">
          <h1 id="login-title">Login</h1>
          <p className="login-subtitle">Sign in to continue to your application</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="userType">User Type</label>
            <select
              id="userType"
              name="userType"
              value={userType}
              onChange={(event) => setUserType(event.target.value)}
              required
            >
              <option value="" disabled>
                Select user type
              </option>
              <option value="Student">Student</option>
              <option value="RC">RC</option>
            </select>

            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <button type="submit">Sign in</button>
            <p className="register-text">
              Don&apos;t have an account?{' '}
              <a href="#" onClick={handleOpenRegister}>
                Register now
              </a>
            </p>
          </form>
        </section>
      </main>
    </>
  )
}

export default App
