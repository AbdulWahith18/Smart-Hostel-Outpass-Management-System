import { useEffect, useState } from 'react'
import './App.css'
import Register from './register'
import StudentHome from './studenthome'
import RCHome from './rchome'
import AdminHome from './adminhome'
import MainPage from './mainpage'
import TopBar from './topbar'

function App() {
  const rememberedLoginKey = 'rememberedLogin'
  const [showMainPage, setShowMainPage] = useState(true)
  const [showRegister, setShowRegister] = useState(false)
  const [showStudentHome, setShowStudentHome] = useState(false)
  const [showRCHome, setShowRCHome] = useState(false)
  const [showAdminHome, setShowAdminHome] = useState(false)
  const [studentActiveView, setStudentActiveView] = useState('apply')
  const [rcActiveView, setRcActiveView] = useState('pending')
  const [adminActiveView, setAdminActiveView] = useState('view')
  const [currentUser, setCurrentUser] = useState(null)
  const [userType, setUserType] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showForgotCard, setShowForgotCard] = useState(false)
  const [resetIdentifier, setResetIdentifier] = useState('')
  const [resetOtp, setResetOtp] = useState('')
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [isOtpVerified, setIsOtpVerified] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobileNav, setIsMobileNav] = useState(false)

  useEffect(() => {
    const rememberedLoginRaw = localStorage.getItem(rememberedLoginKey)
    if (!rememberedLoginRaw) {
      return
    }

    try {
      const rememberedLogin = JSON.parse(rememberedLoginRaw)
      if (rememberedLogin?.userType) {
        setUserType(rememberedLogin.userType)
      }
      if (rememberedLogin?.email) {
        setEmail(rememberedLogin.email)
      }
      setRememberMe(true)
    } catch {
      localStorage.removeItem(rememberedLoginKey)
    }
  }, [rememberedLoginKey])

  useEffect(() => {
    const mediaQueryList = window.matchMedia('(max-width: 780px)')

    const syncSidebarState = () => {
      const mobileView = mediaQueryList.matches
      setIsMobileNav(mobileView)
      setIsSidebarOpen(!mobileView)
    }

    syncSidebarState()
    mediaQueryList.addEventListener('change', syncSidebarState)

    return () => {
      mediaQueryList.removeEventListener('change', syncSidebarState)
    }
  }, [])

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

      if (rememberMe) {
        localStorage.setItem(
          rememberedLoginKey,
          JSON.stringify({
            userType,
            email,
          })
        )
      } else {
        localStorage.removeItem(rememberedLoginKey)
      }

      localStorage.setItem('authToken', data.token)
      setCurrentUser(data.user)

      if (data.user.userType === 'Student') {
        setStudentActiveView('apply')
        setIsSidebarOpen(!isMobileNav)
        setShowStudentHome(true)
        return
      }

      if (data.user.userType === 'RC') {
        setRcActiveView('pending')
        setIsSidebarOpen(!isMobileNav)
        setShowRCHome(true)
        return
      }

      if (data.user.userType === 'Admin') {
        setAdminActiveView('view')
        setIsSidebarOpen(!isMobileNav)
        setShowAdminHome(true)
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
    setStudentActiveView('apply')
    setRcActiveView('pending')
    setAdminActiveView('view')
    setUserType('')
    setEmail('')
    setPassword('')
    setIsSidebarOpen(false)
    setShowRegister(false)
    setShowStudentHome(false)
    setShowRCHome(false)
    setShowAdminHome(false)
  }

  const clearResetForm = () => {
    setResetIdentifier('')
    setResetOtp('')
    setResetNewPassword('')
    setResetConfirmPassword('')
    setIsOtpVerified(false)
  }

  const handleSendOtp = async () => {
    if (!resetIdentifier.trim()) {
      alert('Please enter username/email first.')
      return
    }

    setIsSendingOtp(true)
    try {
      const response = await fetch('/api/auth/forgot-password/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier: resetIdentifier }),
      })

      const data = await response.json()
      if (!response.ok) {
        alert(data.message ?? 'Failed to send OTP.')
        return
      }

      setIsOtpVerified(false)
      alert(data.message ?? 'OTP sent to your registered email.')
    } catch {
      alert('Unable to reach server. Please try again.')
    } finally {
      setIsSendingOtp(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!resetIdentifier.trim() || !resetOtp.trim()) {
      alert('Please enter username/email and OTP.')
      return
    }

    setIsVerifyingOtp(true)
    try {
      const response = await fetch('/api/auth/forgot-password/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier: resetIdentifier, otp: resetOtp }),
      })

      const data = await response.json()
      if (!response.ok) {
        setIsOtpVerified(false)
        alert(data.message ?? 'Failed to verify OTP.')
        return
      }

      setIsOtpVerified(true)
      alert(data.message ?? 'OTP verified successfully.')
    } catch {
      setIsOtpVerified(false)
      alert('Unable to reach server. Please try again.')
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  const handleResetPassword = async (event) => {
    event.preventDefault()

    if (!resetIdentifier.trim() || !resetOtp.trim() || !resetNewPassword || !resetConfirmPassword) {
      alert('Please fill username/email, OTP, new password, and confirm password.')
      return
    }

    if (!isOtpVerified) {
      alert('Please verify OTP before updating password.')
      return
    }

    if (resetNewPassword !== resetConfirmPassword) {
      alert('New password and confirm password must match.')
      return
    }

    setIsResettingPassword(true)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: resetIdentifier,
          otp: resetOtp,
          newPassword: resetNewPassword,
          confirmPassword: resetConfirmPassword,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        alert(data.message ?? 'Failed to reset password.')
        return
      }

      alert(data.message ?? 'Password reset successful. Please login with your new password.')
      setShowForgotCard(false)
      clearResetForm()
    } catch {
      alert('Unable to reach server. Please try again.')
    } finally {
      setIsResettingPassword(false)
    }
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
        <TopBar
          showLogout
          showMenuToggle
          isSidebarOpen={isSidebarOpen}
          onMenuToggle={() => setIsSidebarOpen((previousState) => !previousState)}
          onLogout={handleBackToLogin}
        />
        <aside className={`app-side-drawer ${isSidebarOpen ? 'app-side-drawer-open' : ''}`} aria-label="Pass menu">
          <button
            type="button"
            className={`app-side-item ${studentActiveView === 'apply' ? 'app-side-item-active' : ''}`}
            onClick={() => {
              setStudentActiveView('apply')
              if (isMobileNav) {
                setIsSidebarOpen(false)
              }
            }}
          >
            Apply Pass
          </button>
          <button
            type="button"
            className={`app-side-item ${studentActiveView === 'pending' ? 'app-side-item-active' : ''}`}
            onClick={() => {
              setStudentActiveView('pending')
              if (isMobileNav) {
                setIsSidebarOpen(false)
              }
            }}
          >
            Pending
          </button>
          <button
            type="button"
            className={`app-side-item ${studentActiveView === 'approved' ? 'app-side-item-active' : ''}`}
            onClick={() => {
              setStudentActiveView('approved')
              if (isMobileNav) {
                setIsSidebarOpen(false)
              }
            }}
          >
            Approved
          </button>
        </aside>
        {isMobileNav && (
          <button
            type="button"
            className={`app-side-overlay ${isSidebarOpen ? 'app-side-overlay-visible' : ''}`}
            aria-label="Close sidebar menu"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        <div className={`app-main-shell ${!isMobileNav ? 'app-main-shell-open' : ''}`}>
          <StudentHome currentUser={currentUser} activeView={studentActiveView} onViewChange={setStudentActiveView} />
        </div>
      </>
    )
  }

  if (showRCHome) {
    return (
      <>
        <TopBar
          showLogout
          showMenuToggle
          isSidebarOpen={isSidebarOpen}
          onMenuToggle={() => setIsSidebarOpen((previousState) => !previousState)}
          onLogout={handleBackToLogin}
        />
        <aside className={`app-side-drawer ${isSidebarOpen ? 'app-side-drawer-open' : ''}`} aria-label="Pass menu">
          <button
            type="button"
            className={`app-side-item ${rcActiveView === 'pending' ? 'app-side-item-active' : ''}`}
            onClick={() => {
              setRcActiveView('pending')
              if (isMobileNav) {
                setIsSidebarOpen(false)
              }
            }}
          >
            Pending
          </button>
          <button
            type="button"
            className={`app-side-item ${rcActiveView === 'approved' ? 'app-side-item-active' : ''}`}
            onClick={() => {
              setRcActiveView('approved')
              if (isMobileNav) {
                setIsSidebarOpen(false)
              }
            }}
          >
            Approved
          </button>
        </aside>
        {isMobileNav && (
          <button
            type="button"
            className={`app-side-overlay ${isSidebarOpen ? 'app-side-overlay-visible' : ''}`}
            aria-label="Close sidebar menu"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        <div className={`app-main-shell ${!isMobileNav ? 'app-main-shell-open' : ''}`}>
          <RCHome currentRc={currentUser} activeView={rcActiveView} onViewChange={setRcActiveView} />
        </div>
      </>
    )
  }

  if (showAdminHome) {
    return (
      <>
        <TopBar
          showLogout
          showMenuToggle
          isSidebarOpen={isSidebarOpen}
          onMenuToggle={() => setIsSidebarOpen((previousState) => !previousState)}
          onLogout={handleBackToLogin}
        />
        <aside
          className={`app-side-drawer admin-side-drawer ${isSidebarOpen ? 'app-side-drawer-open' : ''}`}
          aria-label="Admin menu"
        >
          <button
            type="button"
            className={`app-side-item admin-side-card ${adminActiveView === 'view' ? 'app-side-item-active' : ''}`}
            onClick={() => {
              setAdminActiveView('view')
              if (isMobileNav) {
                setIsSidebarOpen(false)
              }
            }}
          >
            <span className="admin-side-card-kicker">Users</span>
            <span className="admin-side-card-title">View Users</span>
          </button>
          <button
            type="button"
            className={`app-side-item admin-side-card ${adminActiveView === 'manage' ? 'app-side-item-active' : ''}`}
            onClick={() => {
              setAdminActiveView('manage')
              if (isMobileNav) {
                setIsSidebarOpen(false)
              }
            }}
          >
            <span className="admin-side-card-kicker">Control</span>
            <span className="admin-side-card-title">Manage Users</span>
          </button>
        </aside>
        {isMobileNav && (
          <button
            type="button"
            className={`app-side-overlay ${isSidebarOpen ? 'app-side-overlay-visible' : ''}`}
            aria-label="Close sidebar menu"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        <div className={`app-main-shell ${!isMobileNav ? 'app-main-shell-open' : ''}`}>
          <AdminHome currentUser={currentUser} activeView={adminActiveView} onViewChange={setAdminActiveView} />
        </div>
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
              <option value="Admin">Admin</option>
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

            <label className="login-remember-row" htmlFor="rememberMe">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                className="login-remember-checkbox"
                checked={rememberMe}
                onChange={(event) => {
                  const checked = event.target.checked
                  setRememberMe(checked)
                  if (!checked) {
                    localStorage.removeItem(rememberedLoginKey)
                  }
                }}
              />
              <span>Remember me</span>
            </label>

            <p className="login-forgot-text">
              <a
                className="login-forgot-link"
                href="#"
                onClick={(event) => {
                  event.preventDefault()
                  setShowForgotCard((currentValue) => {
                    const nextValue = !currentValue
                    if (!nextValue) {
                      clearResetForm()
                    }
                    return nextValue
                  })
                }}
              >
                Forgot password?
              </a>
            </p>

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

      {showForgotCard && (
        <div
          className="forgot-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Reset password"
          onClick={() => {
            setShowForgotCard(false)
            clearResetForm()
          }}
        >
          <section className="forgot-card" onClick={(event) => event.stopPropagation()}>
            <h2>Reset Password</h2>
            <form className="forgot-form" onSubmit={handleResetPassword}>
              <label htmlFor="resetIdentifier">Username or Email</label>
              <div className="forgot-inline-group">
                <input
                  id="resetIdentifier"
                  name="resetIdentifier"
                  type="text"
                  placeholder="Enter username or email"
                  value={resetIdentifier}
                  onChange={(event) => {
                    setResetIdentifier(event.target.value)
                    setIsOtpVerified(false)
                  }}
                  required
                />
                <button
                  type="button"
                  className="forgot-secondary"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp || isVerifyingOtp || isResettingPassword}
                >
                  {isSendingOtp ? 'Sending...' : 'Send OTP'}
                </button>
              </div>

              <label htmlFor="resetOtp">OTP</label>
              <div className="forgot-inline-group">
                <input
                  id="resetOtp"
                  name="resetOtp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={resetOtp}
                  onChange={(event) => {
                    const value = event.target.value.replace(/\D/g, '')
                    setResetOtp(value)
                    setIsOtpVerified(false)
                  }}
                  required
                />
                <button
                  type="button"
                  className="forgot-secondary"
                  onClick={handleVerifyOtp}
                  disabled={isSendingOtp || isVerifyingOtp || isResettingPassword}
                >
                  {isVerifyingOtp ? 'Verifying...' : isOtpVerified ? 'Verified' : 'Verify OTP'}
                </button>
              </div>
              <p className={`forgot-status ${isOtpVerified ? 'forgot-status-success' : 'forgot-status-muted'}`}>
                {isOtpVerified ? 'OTP verified. You can now reset your password.' : 'Send OTP and verify it first.'}
              </p>

              <label htmlFor="resetNewPassword">New Password</label>
              <input
                id="resetNewPassword"
                name="resetNewPassword"
                type="password"
                placeholder="Enter new password"
                value={resetNewPassword}
                onChange={(event) => setResetNewPassword(event.target.value)}
                minLength={8}
                maxLength={12}
                required
              />

              <label htmlFor="resetConfirmPassword">Confirm New Password</label>
              <input
                id="resetConfirmPassword"
                name="resetConfirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={resetConfirmPassword}
                onChange={(event) => setResetConfirmPassword(event.target.value)}
                minLength={8}
                maxLength={12}
                required
              />

              <div className="forgot-card-actions">
                <button type="submit" className="forgot-submit" disabled={isResettingPassword}>
                  {isResettingPassword ? 'Updating...' : 'Update Password'}
                </button>
                <button
                  type="button"
                  className="forgot-cancel"
                  onClick={() => {
                    setShowForgotCard(false)
                    clearResetForm()
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  )
}

export default App
