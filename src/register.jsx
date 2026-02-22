import { useEffect, useState } from 'react'
import './register.css'

function Register({ onBackToLogin }) {
  const [userType, setUserType] = useState('')
  const [authorizedRc, setAuthorizedRc] = useState('')
  const [registeredRcs, setRegisteredRcs] = useState([])

  const fetchRcUsers = async () => {
    try {
      const response = await fetch('/api/auth/rc-users')
      const data = await response.json()

      if (response.ok) {
        setRegisteredRcs(data.rcUsers ?? [])
      }
    } catch {
      setRegisteredRcs([])
    }
  }

  useEffect(() => {
    fetchRcUsers()
  }, [])

  const handleSubmit = async (event) => {
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

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userType: selectedUserType,
          username,
          email: formData.get('email')?.toString() ?? '',
          mobileNo,
          password,
          authorizedRc: selectedUserType === 'Student' ? authorizedRc : '',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.message ?? 'Failed to create account.')
        return
      }

      if (selectedUserType === 'RC') {
        setRegisteredRcs((currentRcs) =>
          currentRcs.includes(username) ? currentRcs : [...currentRcs, username]
        )
      }

      alert('Account created successfully!')
      onBackToLogin?.()
    } catch {
      alert('Unable to reach server. Please try again.')
    }
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
              const nextUserType = event.target.value
              setUserType(nextUserType)
              setAuthorizedRc('')

              if (nextUserType === 'Student') {
                fetchRcUsers()
              }
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
