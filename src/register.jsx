import { useEffect, useState } from 'react'
import './register.css'
import { useToast } from './components/Toast'

const defaultDraftValues = {
  userType: '',
  authorizedRc: '',
  username: '',
  email: '',
  mobileNo: '',
  password: '',
  confirmPassword: '',
  termsAccepted: false,
}

function Register({ onBackToLogin, onOpenTerms, draftValues = defaultDraftValues, onDraftChange }) {
  const [registeredRcs, setRegisteredRcs] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const toast = useToast()

  const updateDraft = (fieldName, fieldValue) => {
    onDraftChange?.((currentDraft) => ({ ...currentDraft, [fieldName]: fieldValue }))
  }

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

    if (isSubmitting) return

    const selectedUserType = draftValues.userType
    const username = draftValues.username.trim()
    const authorizedRc = draftValues.authorizedRc.trim()
    const mobileNo = draftValues.mobileNo.trim()
    const password = draftValues.password
    const confirmPassword = draftValues.confirmPassword
    const email = draftValues.email.trim()

    const isMobileValid = /^[0-9]{10}$/.test(mobileNo)
    const isPasswordValid =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,12}$/.test(password)

    if (!isMobileValid) {
      toast.warning('Mobile number must be exactly 10 digits.')
      return
    }

    if (!isPasswordValid) {
      toast.warning(
        'Password must be 8-12 characters and include uppercase, lowercase, a number, and a special character.'
      )
      return
    }

    if (password !== confirmPassword) {
      toast.warning('Password and re-entered password must match.')
      return
    }

    if (!draftValues.termsAccepted) {
      toast.warning('Please accept Terms and Policy before registering.')
      return
    }

    if (selectedUserType === 'Student') {
      if (registeredRcs.length === 0) {
        toast.warning('No active RC is available yet. Please contact hostel administration.')
        return
      }

      if (!authorizedRc) {
        toast.warning('Please select which RC you are authorized to.')
        return
      }
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userType: selectedUserType,
          username,
          email,
          mobileNo,
          password,
          authorizedRc: selectedUserType === 'Student' ? authorizedRc : '',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.message ?? 'Failed to create account.')
        return
      }

      if (selectedUserType === 'RC') {
        toast.success(data.message ?? 'Registration submitted successfully! Your RC account is pending admin approval.')
      } else {
        toast.success(data.message ?? 'Account created successfully!')
      }

      onDraftChange?.({ ...defaultDraftValues })
      onBackToLogin?.()
    } catch {
      toast.error('Unable to reach server. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="register-page">
      <section className="register-card saas-card fade-in" aria-labelledby="register-title">
        <h1 id="register-title">Register</h1>
        <p className="register-subtitle">Create your account to access the hostel outpass system.</p>

        <form className="register-form" onSubmit={handleSubmit}>
          <label htmlFor="userType">User Type</label>
          <select
            className="input"
            id="userType"
            name="userType"
            value={draftValues.userType}
            onChange={(event) => {
              const nextUserType = event.target.value
              updateDraft('userType', nextUserType)
              updateDraft('authorizedRc', '')

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

          {draftValues.userType === 'Student' && (
            <>
              <label htmlFor="authorizedRc">Authorized RC</label>
              <select
                className="input"
                id="authorizedRc"
                name="authorizedRc"
                value={draftValues.authorizedRc}
                onChange={(event) => updateDraft('authorizedRc', event.target.value)}
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
          <input
            className="input"
            id="username"
            name="username"
            type="text"
            placeholder="Enter username"
            value={draftValues.username}
            onChange={(event) => updateDraft('username', event.target.value)}
            required
          />

          <label htmlFor="email">Email</label>
          <input
            className="input"
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={draftValues.email}
            onChange={(event) => updateDraft('email', event.target.value)}
            required
          />

          <label htmlFor="mobileno">Mobile No</label>
          <input
            className="input"
            id="mobileno"
            name="mobileno"
            type="tel"
            placeholder="Enter mobile number"
            maxLength={10}
            inputMode="numeric"
            value={draftValues.mobileNo}
            onChange={(event) => updateDraft('mobileNo', event.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            className="input"
            id="password"
            name="password"
            type="password"
            placeholder="Enter password"
            minLength={8}
            maxLength={12}
            value={draftValues.password}
            onChange={(event) => updateDraft('password', event.target.value)}
            required
          />

          <label htmlFor="confirmPassword">Re-enter Password</label>
          <input
            className="input"
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Re-enter password"
            value={draftValues.confirmPassword}
            onChange={(event) => updateDraft('confirmPassword', event.target.value)}
            required
          />

          <label className="terms-consent" htmlFor="termsAccepted">
            <input
              id="termsAccepted"
              name="termsAccepted"
              type="checkbox"
              checked={draftValues.termsAccepted}
              onChange={(event) => updateDraft('termsAccepted', event.target.checked)}
              required
            />
            <span>
              I accept the Terms and Policy.{' '}
              <button type="button" className="terms-link" onClick={onOpenTerms}>
                View Terms and Policy
              </button>
            </span>
          </label>

          <button type="submit" className="btn btn-primary hover-lift" disabled={!draftValues.termsAccepted || isSubmitting}>
            {isSubmitting ? 'Registering...' : 'Create Account'}
          </button>

          {onBackToLogin && (
            <p className="switch-text">
              Already have an account?{' '}
              <button type="button" className="switch-link btn btn-outline hover-lift" onClick={onBackToLogin}>
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

