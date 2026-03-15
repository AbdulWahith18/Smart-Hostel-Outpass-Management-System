import { useEffect, useState } from 'react'
import { FaChevronLeft, FaChevronRight, FaCheckCircle, FaClock, FaFileAlt, FaUsers, FaCogs, FaChartBar } from 'react-icons/fa'
import './App.css'
import Register from './register'
import StudentHome from './studenthome'
import RCHome from './rchome'
import AdminHome from './adminhome'
import MainPage from './mainpage'
import TopBar from './topbar'
import { clearAuthToken, setAuthToken } from './utils/authToken'

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
    const mediaQueryList = window.matchMedia('(max-width: 767px)')

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

      setAuthToken(data.token)
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
    clearAuthToken()
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

  const renderDashboardLayout = ({ menuItems, activeView, onViewChange, sidebarAriaLabel, navAriaLabel, content }) => (
    <>
      <TopBar
        showLogout
        showMenuToggle={false}
        isSidebarOpen={isSidebarOpen}
        onMenuToggle={() => setIsSidebarOpen((previousState) => !previousState)}
        onLogout={handleBackToLogin}
      />
      <div className="bg-slate-50 pt-16">
        <div className="flex min-h-[calc(100vh-64px)]">
          <aside
            className={`saas-side-shell relative sticky top-16 h-[calc(100vh-64px)] shrink-0 border-r border-teal-200/40 bg-gradient-to-b from-teal-700 to-teal-800 text-teal-50 shadow-lg transition-all duration-300 ease-in-out ${
              isSidebarOpen ? 'w-64' : 'w-16'
            }`}
            aria-label={sidebarAriaLabel}
          >
            <button
              type="button"
              className="saas-side-toggle absolute top-8 -right-4 z-30 rounded-full p-1.5 text-[#d8eeec] shadow-md transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
              aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-expanded={isSidebarOpen}
              onClick={() => setIsSidebarOpen((previousState) => !previousState)}
            >
              {isSidebarOpen ? <FaChevronLeft className="h-3.5 w-3.5" /> : <FaChevronRight className="h-3.5 w-3.5" />}
            </button>

            <nav className="flex h-full flex-col space-y-4 px-2.5 py-6" aria-label={navAriaLabel}>
              {menuItems.map((item) => {
                const isActive = activeView === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`app-side-item group relative flex w-full items-center gap-3 rounded-xl py-3 text-sm font-semibold transition-all duration-300 ease-in-out ${
                      isActive
                        ? 'app-side-item-active border-l-4 border-white'
                        : 'border-l-4 border-transparent bg-white/10 text-teal-100 backdrop-blur-md hover:bg-white/20 hover:text-white'
                    } ${isSidebarOpen ? 'justify-start px-4 hover:translate-x-0.5' : 'justify-center px-0'}`}
                    onClick={() => onViewChange(item.key)}
                    aria-label={item.label}
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[15px]">
                      {item.icon}
                    </span>

                    {isSidebarOpen ? (
                      <span className="whitespace-nowrap tracking-wide transition-opacity duration-300 ease-in-out">{item.label}</span>
                    ) : (
                      <span className="pointer-events-none absolute left-full top-1/2 z-40 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900/95 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-all duration-200 group-hover:opacity-100">
                        {item.label}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </aside>

          <div className="min-w-0 flex-1 transition-all duration-300 ease-in-out">{content}</div>
        </div>
      </div>
    </>
  )

  if (showRegister) {
    return (
      <>
        <TopBar />
        <Register onBackToLogin={handleBackToLogin} />
      </>
    )
  }

  if (showStudentHome) {
    const studentMenuItems = [
      { key: 'apply', label: 'Apply Pass', icon: <FaFileAlt className="h-4 w-4" aria-hidden="true" /> },
      { key: 'pending', label: 'Pending', icon: <FaClock className="h-4 w-4" aria-hidden="true" /> },
      { key: 'approved', label: 'Approved', icon: <FaCheckCircle className="h-4 w-4" aria-hidden="true" /> },
    ]

    return renderDashboardLayout({
      menuItems: studentMenuItems,
      activeView: studentActiveView,
      onViewChange: setStudentActiveView,
      sidebarAriaLabel: 'Student pass menu',
      navAriaLabel: 'Student navigation',
      content: <StudentHome currentUser={currentUser} activeView={studentActiveView} onViewChange={setStudentActiveView} />,
    })
  }

  if (showRCHome) {
    const rcMenuItems = [
      { key: 'pending', label: 'Pending', icon: <FaClock className="h-4 w-4" aria-hidden="true" /> },
      { key: 'approved', label: 'Approved', icon: <FaCheckCircle className="h-4 w-4" aria-hidden="true" /> },
      { key: 'analytics', label: 'Analytics', icon: <FaChartBar className="h-4 w-4" aria-hidden="true" /> },
    ]

    return renderDashboardLayout({
      menuItems: rcMenuItems,
      activeView: rcActiveView,
      onViewChange: setRcActiveView,
      sidebarAriaLabel: 'RC pass menu',
      navAriaLabel: 'RC navigation',
      content: <RCHome currentRc={currentUser} activeView={rcActiveView} onViewChange={setRcActiveView} />,
    })
  }

  if (showAdminHome) {
    const adminMenuItems = [
      { key: 'view', label: 'View Users', icon: <FaUsers className="h-4 w-4" aria-hidden="true" /> },
      { key: 'manage', label: 'Manage Users', icon: <FaCogs className="h-4 w-4" aria-hidden="true" /> },
      { key: 'analytics', label: 'Analytics', icon: <FaChartBar className="h-4 w-4" aria-hidden="true" /> },
    ]

    return renderDashboardLayout({
      menuItems: adminMenuItems,
      activeView: adminActiveView,
      onViewChange: setAdminActiveView,
      sidebarAriaLabel: 'Admin menu',
      navAriaLabel: 'Admin navigation',
      content: <AdminHome currentUser={currentUser} activeView={adminActiveView} onViewChange={setAdminActiveView} />,
    })
  }

  if (showMainPage) {
    return <MainPage onLogin={handleOpenLogin} onRegister={handleOpenRegisterFromMain} />
  }

  return (
    <>
      <TopBar />
      <main className="login-page">
        <section className="login-card saas-card fade-in" aria-labelledby="login-title">
          <h1 id="login-title">Login</h1>
          <p className="login-subtitle">Sign in to continue to your application</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="userType">User Type</label>
            <select
              className="input"
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
              className="input"
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
              className="input"
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

            <button type="submit" className="btn btn-primary hover-lift">Sign in</button>
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
          <section className="forgot-card saas-card fade-in" onClick={(event) => event.stopPropagation()}>
            <h2>Reset Password</h2>
            <form className="forgot-form" onSubmit={handleResetPassword}>
              <label htmlFor="resetIdentifier">Username or Email</label>
              <div className="forgot-inline-group">
                <input
                  className="input"
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
                  className="forgot-secondary btn btn-outline hover-lift"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp || isVerifyingOtp || isResettingPassword}
                >
                  {isSendingOtp ? 'Sending...' : 'Send OTP'}
                </button>
              </div>

              <label htmlFor="resetOtp">OTP</label>
              <div className="forgot-inline-group">
                <input
                  className="input"
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
                  className="forgot-secondary btn btn-outline hover-lift"
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
                className="input"
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
                className="input"
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
                <button type="submit" className="forgot-submit btn btn-primary hover-lift" disabled={isResettingPassword}>
                  {isResettingPassword ? 'Updating...' : 'Update Password'}
                </button>
                <button
                  type="button"
                  className="forgot-cancel btn btn-outline hover-lift"
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
