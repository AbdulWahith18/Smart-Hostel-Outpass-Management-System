import { useState } from 'react'
import './register.css'

const RC_STORAGE_KEY = 'registeredRcUsers'
const USER_STORAGE_KEY = 'registeredUsers'

function Register({ onBackToLogin }) {
  const [userType, setUserType] = useState('')
  const [authorizedRc, setAuthorizedRc] = useState('')
  const [registeredRcs, setRegisteredRcs] = useState(() => {
    try {
      const storedValue = localStorage.getItem(RC_STORAGE_KEY)
      const parsedValue = storedValue ? JSON.parse(storedValue) : []
      return Array.isArray(parsedValue) ? parsedValue : []
    } catch {
      return []
    }
  })

  const handleSubmit = (event) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const selectedUserType = formData.get('userType')?.toString() ?? ''
    const username = formData.get('username')?.toString().trim() ?? ''
    const authorizedRc = formData.get('authorizedRc')?.toString().trim() ?? ''
    const mobileNo = formData.get('mobileno')?.toString().trim() ?? ''
    const password = formData.get('password')?.toString() ?? ''
    const confirmPassword = formData.get('confirmPassword')?.toString() ?? ''

    const isMobileValid = /^[0-9]{10}$/.test(mobileNo)
    const isPasswordValid =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,12}$/.test(password)

    if (!isMobileValid) {
      alert('Mobile number must be exactly 10 digits.')
      return
    }

    if (!isPasswordValid) {
      alert(
        'Password must be 8-12 characters and include uppercase, lowercase, a number, and a special character.'
      )
      return
    }

    if (password !== confirmPassword) {
      alert('Password and re-entered password must match.')
      return
    }

    if (selectedUserType === 'Student') {
      if (registeredRcs.length === 0) {
        alert('No RC is registered yet. Please register an RC account first.')
        return
      }

      if (!authorizedRc) {
        alert('Please select which RC you are authorized to.')
        return
      }
    }

    if (selectedUserType === 'RC') {
      const alreadyRegistered = registeredRcs.includes(username)

      if (!alreadyRegistered) {
        const updatedRcs = [...registeredRcs, username]
        setRegisteredRcs(updatedRcs)
        localStorage.setItem(RC_STORAGE_KEY, JSON.stringify(updatedRcs))
      }
    }

    const registeredUsers = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) ?? '[]')
    const duplicateUser = registeredUsers.some(
      (user) => user.userType === selectedUserType && user.email === formData.get('email')?.toString()
    )

    if (duplicateUser) {
      alert('An account with this email already exists for the selected user type.')
      return
    }

    const userRecord = {
      userType: selectedUserType,
      username,
      email: formData.get('email')?.toString() ?? '',
      mobileNo,
      password,
      authorizedRc: selectedUserType === 'Student' ? authorizedRc : '',
    }

    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify([...registeredUsers, userRecord]))

    alert('Account created successfully!')
    onBackToLogin?.()
  }

  const handleCreateDemoFlow = () => {
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

    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify([demoRc, demoStudent]))
    localStorage.setItem(RC_STORAGE_KEY, JSON.stringify(['rcdemo']))
    setRegisteredRcs(['rcdemo'])

    alert(
      'Demo accounts created. RC: rc@demo.com / Rc@12345. Student: student@demo.com / Stud@123'
    )
  }

  return (
    <main className="register-page">
      <section className="register-card" aria-labelledby="register-title">
        <h1 id="register-title">Register</h1>

        <form className="register-form" onSubmit={handleSubmit}>
          <label htmlFor="userType">User Type</label>
          <select
            id="userType"
            name="userType"
            value={userType}
            onChange={(event) => {
              setUserType(event.target.value)
              setAuthorizedRc('')
            }}
            required
          >
            <option value="" disabled>
              Select user type
            </option>
            <option value="Student">Student</option>
            <option value="RC">RC</option>
          </select>

          {userType === 'Student' && (
            <>
              <label htmlFor="authorizedRc">Authorized RC</label>
              <select
                id="authorizedRc"
                name="authorizedRc"
                value={authorizedRc}
                onChange={(event) => setAuthorizedRc(event.target.value)}
                required
              >
                <option value="" disabled>
                  Select authorized RC
                </option>
                {registeredRcs.map((rcName) => (
                  <option key={rcName} value={rcName}>
                    {rcName}
                  </option>
                ))}
              </select>
            </>
          )}

          <label htmlFor="username">Username</label>
          <input id="username" name="username" type="text" placeholder="Enter username" required />

          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" placeholder="you@example.com" required />

          <label htmlFor="mobileno">Mobile No</label>
          <input
            id="mobileno"
            name="mobileno"
            type="tel"
            placeholder="Enter mobile number"
            maxLength={10}
            inputMode="numeric"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Enter password"
            minLength={8}
            maxLength={12}
            required
          />

          <label htmlFor="confirmPassword">Re-enter Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Re-enter password"
            required
          />

          <button type="submit">Create Account</button>
          <button type="button" className="demo-flow-button" onClick={handleCreateDemoFlow}>
            Create Demo RC + Student
          </button>

          {onBackToLogin && (
            <p className="switch-text">
              Already have an account?{' '}
              <button type="button" className="switch-link" onClick={onBackToLogin}>
                Sign in
              </button>
            </p>
          )}
        </form>
      </section>
    </main>
  )
}

export default Register
