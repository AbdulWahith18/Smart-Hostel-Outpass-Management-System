import { useEffect, useState } from 'react'
import './App.css'
import Register from './register'
import StudentHome from './studenthome'
import RCHome from './rchome'
import MainPage from './mainpage'
import TopBar from './topbar'

const USER_STORAGE_KEY = 'registeredUsers'
const RC_STORAGE_KEY = 'registeredRcUsers'

function App() {
  const [showMainPage, setShowMainPage] = useState(true)
  const [showRegister, setShowRegister] = useState(false)
  const [showStudentHome, setShowStudentHome] = useState(false)
  const [showRCHome, setShowRCHome] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [userType, setUserType] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    const storedUsers = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) ?? '[]')

    const demoRc = {
      userType: 'RC',
      username: 'rcdemo',
      email: 'rc@demo.com',
      mobileNo: '9876543210',
      password: 'Rc@12345',
      authorizedRc: '',
    }

    const demoStudent = {
      userType: 'Student',
      username: 'studentdemo',
      email: 'student@demo.com',
      mobileNo: '9123456780',
      password: 'Stud@123',
      authorizedRc: 'rcdemo',
    }

    const hasDemoRc = storedUsers.some(
      (user) => user.userType === 'RC' && user.email === demoRc.email
    )
    const hasDemoStudent = storedUsers.some(
      (user) => user.userType === 'Student' && user.email === demoStudent.email
    )

    if (!hasDemoRc || !hasDemoStudent) {
      const updatedUsers = [...storedUsers]

      if (!hasDemoRc) {
        updatedUsers.push(demoRc)
      }

      if (!hasDemoStudent) {
        updatedUsers.push(demoStudent)
      }

      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUsers))
    }

    const storedRcs = JSON.parse(localStorage.getItem(RC_STORAGE_KEY) ?? '[]')
    if (!storedRcs.includes('rcdemo')) {
      localStorage.setItem(RC_STORAGE_KEY, JSON.stringify([...storedRcs, 'rcdemo']))
    }
  }, [])

  const handleSubmit = (event) => {
    event.preventDefault()

    const registeredUsers = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) ?? '[]')
    const matchedUser = registeredUsers.find(
      (user) => user.userType === userType && user.email === email && user.password === password
    )

    if (!matchedUser) {
      alert('Invalid login details. Please check user type, email, and password.')
      return
    }

    if (userType === 'Student') {
      setCurrentUser(matchedUser)
      setShowStudentHome(true)
      return
    }

    if (userType === 'RC') {
      setCurrentUser(matchedUser)
      setShowRCHome(true)
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
