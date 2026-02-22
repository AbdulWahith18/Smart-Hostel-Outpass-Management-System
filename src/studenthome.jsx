import { useEffect, useMemo, useState } from 'react'
import './studenthome.css'

const formatDateTime = (value) => {
  if (!value) {
    return '-'
  }

  const parsedValue = new Date(value)
  if (!Number.isNaN(parsedValue.getTime())) {
    return parsedValue.toLocaleString()
  }

  return value.replace('T', ' ')
}

function StudentHome({ currentUser }) {
  const [appliedPasses, setAppliedPasses] = useState([])
  const [passFetchError, setPassFetchError] = useState('')

  const appliedDateTime = useMemo(() => {
    const now = new Date()
    const offset = now.getTimezoneOffset()
    const localNow = new Date(now.getTime() - offset * 60 * 1000)
    return localNow.toISOString().slice(0, 16)
  }, [])

  const fetchAppliedPasses = async () => {
    const studentEmail = currentUser?.email ?? ''

    if (!studentEmail) {
      setAppliedPasses([])
      return
    }

    try {
      const response = await fetch(`/api/pass-requests/student?email=${encodeURIComponent(studentEmail)}`)
      const data = await response.json()

      if (!response.ok) {
        setPassFetchError(data.message ?? 'Failed to fetch applied passes.')
        return
      }

      setPassFetchError('')
      setAppliedPasses(data.requests ?? [])
    } catch {
      setPassFetchError('Unable to reach server. Retrying...')
    }
  }

  useEffect(() => {
    fetchAppliedPasses()

    const intervalId = setInterval(() => {
      fetchAppliedPasses()
    }, 5000)

    return () => {
      clearInterval(intervalId)
    }
  }, [currentUser?.email])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const passRequest = {
      studentEmail: currentUser?.email ?? '',
      studentUsername: currentUser?.username ?? '',
      authorizedRc: currentUser?.authorizedRc ?? '',
      name: formData.get('name')?.toString() ?? '',
      registerNo: formData.get('registerNo')?.toString() ?? '',
      year: formData.get('year')?.toString() ?? '',
      department: formData.get('department')?.toString() ?? '',
      hostelBlockNo: formData.get('hostelBlockNo')?.toString() ?? '',
      roomNo: formData.get('roomNo')?.toString() ?? '',
      appliedOn: formData.get('appliedOn')?.toString() ?? '',
      address: formData.get('address')?.toString() ?? '',
      leaveDateTime: formData.get('leaveDateTime')?.toString() ?? '',
      returnDateTime: formData.get('returnDateTime')?.toString() ?? '',
      phoneNo: formData.get('phoneNo')?.toString() ?? '',
      guardianPhoneNo: formData.get('guardianPhoneNo')?.toString() ?? '',
      status: 'pending',
      approvedAt: '',
    }

    try {
      const response = await fetch('/api/pass-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(passRequest),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.message ?? 'Failed to submit pass application.')
        return
      }

      alert('Pass application submitted successfully!')
      event.currentTarget.reset()
      fetchAppliedPasses()
    } catch {
      alert('Unable to reach server. Please try again.')
    }
  }

  return (
    <main className="student-home-page">
      <section className="student-home-card" aria-labelledby="apply-pass-title">
        <h1 id="apply-pass-title">Apply PASS</h1>

        <form className="apply-pass-form" onSubmit={handleSubmit}>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" type="text" placeholder="Enter your name" required />

          <label htmlFor="registerNo">Register No</label>
          <input id="registerNo" name="registerNo" type="text" placeholder="Enter register number" required />

          <label htmlFor="year">Year</label>
          <input id="year" name="year" type="text" placeholder="Enter year" required />

          <label htmlFor="department">Department</label>
          <input id="department" name="department" type="text" placeholder="Enter department" required />

          <label htmlFor="hostelBlockNo">Hostel Block No</label>
          <input id="hostelBlockNo" name="hostelBlockNo" type="text" placeholder="Enter hostel block no" required />

          <label htmlFor="roomNo">Room No</label>
          <input id="roomNo" name="roomNo" type="text" placeholder="Enter room no" required />

          <label htmlFor="appliedOn">Date and Time of Apply</label>
          <input id="appliedOn" name="appliedOn" type="datetime-local" value={appliedDateTime} readOnly />

          <label htmlFor="address">Address</label>
          <textarea id="address" name="address" placeholder="Enter address" rows={3} required />

          <label htmlFor="leaveDateTime">Date and Time of Leaving the Hostel</label>
          <input id="leaveDateTime" name="leaveDateTime" type="datetime-local" required />

          <label htmlFor="returnDateTime">Date and Time of Coming to Hostel</label>
          <input id="returnDateTime" name="returnDateTime" type="datetime-local" required />

          <label htmlFor="phoneNo">Phone No</label>
          <input
            id="phoneNo"
            name="phoneNo"
            type="tel"
            placeholder="Enter phone number"
            maxLength={10}
            inputMode="numeric"
            required
          />

          <label htmlFor="guardianPhoneNo">Parent/Guardian Phone No</label>
          <input
            id="guardianPhoneNo"
            name="guardianPhoneNo"
            type="tel"
            placeholder="Enter parent/guardian phone number"
            maxLength={10}
            inputMode="numeric"
            required
          />

          <button type="submit">Submit PASS Application</button>
        </form>

        <div className="applied-pass-section">
          <h2>Applied Passes</h2>
          {passFetchError && <p className="fetch-error-text">{passFetchError}</p>}
          {appliedPasses.length === 0 ? (
            <p className="empty-text">No applied passes yet.</p>
          ) : (
            <ul className="applied-pass-list">
              {appliedPasses.map((passRequest) => (
                <li key={passRequest._id} className="applied-pass-item">
                  <p>
                    <strong>Register No:</strong> {passRequest.registerNo}
                  </p>
                  <p>
                    <strong>Leaving:</strong> {formatDateTime(passRequest.leaveDateTime)}
                  </p>
                  <p>
                    <strong>Returning:</strong> {formatDateTime(passRequest.returnDateTime)}
                  </p>
                  <p>
                    <strong>Status:</strong>{' '}
                    <span
                      className={`pass-status ${
                        passRequest.status === 'approved' ? 'pass-status-approved' : 'pass-status-pending'
                      }`}
                    >
                      {passRequest.status === 'approved' ? 'Approved' : 'Pending'}
                    </span>
                  </p>
                  {passRequest.status === 'approved' && (
                    <p>
                      <strong>Approved At:</strong> {formatDateTime(passRequest.approvedAt)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  )
}

export default StudentHome
