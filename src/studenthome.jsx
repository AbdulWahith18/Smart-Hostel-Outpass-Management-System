import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
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

const combineDateAndTime = (dateValue, timeValue) => {
  const date = dateValue?.toString() ?? ''
  const time = timeValue?.toString() ?? ''

  if (!date || !time) {
    return ''
  }

  return `${date}T${time}`
}

function StudentHome({ currentUser, activeView = 'apply', onViewChange }) {
  const [appliedPasses, setAppliedPasses] = useState([])
  const [passFetchError, setPassFetchError] = useState('')
  const [reason, setReason] = useState('')
  const [aiResult, setAiResult] = useState('')
  const [aiError, setAiError] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)

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
    const studentEmail = currentUser?.email?.trim().toLowerCase() ?? ''

    fetchAppliedPasses()

    const intervalId = setInterval(() => {
      fetchAppliedPasses()
    }, 5000)

    if (!studentEmail) {
      return () => {
        clearInterval(intervalId)
      }
    }

    const socket = io('/', {
      transports: ['websocket', 'polling'],
    })

    socket.emit('student:join', { studentEmail })

    const upsertPassRequest = (incomingRequest) => {
      if (!incomingRequest?._id) {
        return
      }

      setAppliedPasses((previousRequests) => {
        const existingIndex = previousRequests.findIndex((request) => request._id === incomingRequest._id)

        if (existingIndex === -1) {
          return [incomingRequest, ...previousRequests]
        }

        return previousRequests.map((request) =>
          request._id === incomingRequest._id ? incomingRequest : request
        )
      })
    }

    socket.on('pass:new', upsertPassRequest)
    socket.on('pass:updated', upsertPassRequest)

    return () => {
      clearInterval(intervalId)
      socket.emit('student:leave', { studentEmail })
      socket.off('pass:new', upsertPassRequest)
      socket.off('pass:updated', upsertPassRequest)
      socket.disconnect()
    }
  }, [currentUser?.email])

  const pendingPasses = appliedPasses.filter((passRequest) => passRequest.status === 'pending')
  const approvedPasses = appliedPasses.filter((passRequest) => passRequest.status === 'approved')
  const visiblePasses = activeView === 'approved' ? approvedPasses : pendingPasses
  const totalPasses = appliedPasses.length
  const appliedDate = appliedDateTime.slice(0, 10)
  const appliedTime = appliedDateTime.slice(11, 16)

  const handleSummaryNavigate = (view) => {
    if (onViewChange) {
      onViewChange(view)
    }
  }

  const handleSummaryKeyDown = (event, view) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleSummaryNavigate(view)
    }
  }

  const analyzeReason = async (reasonValue) => {
    const normalizedReason = reasonValue?.toString().trim() ?? ''

    if (!normalizedReason) {
      setAiError('Please enter a reason to analyze.')
      setAiResult('')
      return
    }

    setIsAnalyzing(true)
    setAiError('')

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: normalizedReason }),
      })

      const data = await res.json()

      if (!res.ok) {
        setAiError(data.error ?? data.message ?? 'Failed to analyze reason with AI.')
        setAiResult('')
        return
      }

      setAiResult(data.aiAnalysis ?? '')
    } catch {
      setAiError('Unable to reach AI service. Please try again.')
      setAiResult('')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const leaveDateTime = combineDateAndTime(formData.get('leaveDate'), formData.get('leaveTime'))
    const returnDateTime = combineDateAndTime(formData.get('returnDate'), formData.get('returnTime'))
    const appliedOn = combineDateAndTime(formData.get('appliedOnDate'), formData.get('appliedOnTime'))

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
      appliedOn,
      address: formData.get('address')?.toString() ?? '',
      reason: formData.get('reason')?.toString() ?? '',
      leaveDateTime,
      returnDateTime,
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
      setReason('')
      setAiResult('')
      setAiError('')
      fetchAppliedPasses()
      if (onViewChange) {
        onViewChange('pending')
      }
    } catch {
      alert('Unable to reach server. Please try again.')
    }
  }

  return (
    <main className="student-home-page">
      <section className="student-home-card saas-card fade-in" aria-labelledby="apply-pass-title">
        <header className="student-home-header">
          <h1 id="apply-pass-title">Student Dashboard</h1>
          <p className="student-home-subtitle">Manage your hostel outpass applications in one place.</p>
        </header>

        <section className="student-summary-grid" aria-label="Application summary">
          <article
            className={`student-summary-card dashboard-card hover-lift student-summary-card-pending student-summary-card-clickable ${
              activeView === 'pending' ? 'student-summary-card-active' : ''
            }`}
            role="button"
            tabIndex={0}
            onClick={() => handleSummaryNavigate('pending')}
            onKeyDown={(event) => handleSummaryKeyDown(event, 'pending')}
            aria-label="Open pending passes"
          >
            <span className="summary-icon summary-icon-pending" aria-hidden="true">
              ⏳
            </span>
            <div>
              <p className="summary-label">Pending</p>
              <p className="summary-value">{pendingPasses.length}</p>
            </div>
          </article>

          <article
            className={`student-summary-card dashboard-card hover-lift student-summary-card-approved student-summary-card-clickable ${
              activeView === 'approved' ? 'student-summary-card-active' : ''
            }`}
            role="button"
            tabIndex={0}
            onClick={() => handleSummaryNavigate('approved')}
            onKeyDown={(event) => handleSummaryKeyDown(event, 'approved')}
            aria-label="Open approved passes"
          >
            <span className="summary-icon summary-icon-approved" aria-hidden="true">
              ✅
            </span>
            <div>
              <p className="summary-label">Approved</p>
              <p className="summary-value">{approvedPasses.length}</p>
            </div>
          </article>

          <article className="student-summary-card dashboard-card hover-lift student-summary-card-total">
            <span className="summary-icon summary-icon-total" aria-hidden="true">
              📄
            </span>
            <div>
              <p className="summary-label">Total Applications</p>
              <p className="summary-value">{totalPasses}</p>
            </div>
          </article>
        </section>

        <div className="applied-pass-section">
          <div className="student-pass-content">
            {activeView === 'apply' ? (
              <>
                <h2>Apply for Outpass</h2>
                <form className="apply-pass-form" onSubmit={handleSubmit}>
                  <label htmlFor="name">Name</label>
                  <input className="input" id="name" name="name" type="text" placeholder="Enter your name" required />

                  <label htmlFor="registerNo">Register No</label>
                  <input className="input" id="registerNo" name="registerNo" type="text" placeholder="Enter register number" required />

                  <label htmlFor="year">Year</label>
                  <input className="input" id="year" name="year" type="text" placeholder="Enter year" required />

                  <label htmlFor="department">Department</label>
                  <input className="input" id="department" name="department" type="text" placeholder="Enter department" required />

                  <label htmlFor="hostelBlockNo">Hostel Block No</label>
                  <input className="input" id="hostelBlockNo" name="hostelBlockNo" type="text" placeholder="Enter hostel block no" required />

                  <label htmlFor="roomNo">Room No</label>
                  <input className="input" id="roomNo" name="roomNo" type="text" placeholder="Enter room no" required />

                  <div className="datetime-group">
                    <label className="datetime-main-label" htmlFor="appliedOnDate">
                      Date and Time of Apply
                    </label>
                    <div className="datetime-row">
                      <div className="datetime-field">
                        <span className="datetime-sub-label">Date</span>
                        <div className="datetime-input-wrap">
                          <span className="datetime-icon" aria-hidden="true">
                            📅
                          </span>
                          <input className="input" id="appliedOnDate" name="appliedOnDate" type="date" value={appliedDate} readOnly />
                        </div>
                      </div>
                      <div className="datetime-field">
                        <span className="datetime-sub-label">Time</span>
                        <div className="datetime-input-wrap">
                          <span className="datetime-icon" aria-hidden="true">
                            🕒
                          </span>
                          <input className="input" id="appliedOnTime" name="appliedOnTime" type="time" value={appliedTime} readOnly />
                        </div>
                      </div>
                    </div>
                  </div>

                  <label htmlFor="address">Address</label>
                  <textarea className="input" id="address" name="address" placeholder="Enter address" rows={3} required />

                  <label htmlFor="reason">Reason for Outpass</label>
                  <textarea
                    className="input"
                    id="reason"
                    name="reason"
                    placeholder="Enter reason for outpass"
                    rows={3}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    required
                  />

                  <button
                    className="btn btn-outline hover-lift w-full max-w-xl mx-auto"
                    type="button"
                    onClick={() => analyzeReason(reason)}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Reason'}
                  </button>

                  {(aiResult || aiError) && (
                    <div className="w-full max-w-xl mx-auto bg-white rounded-xl shadow-md border p-4 mt-4">
                      <p className="text-sm font-semibold text-teal-700 mb-2">AI Suggestion</p>
                      <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm text-gray-700">
                        {aiError ? <p>{aiError}</p> : <p className="whitespace-pre-line">{aiResult}</p>}
                      </div>
                      <p className="text-xs text-gray-500 italic mt-2">AI Generated Insight</p>
                    </div>
                  )}

                  <div className="datetime-group">
                    <label className="datetime-main-label" htmlFor="leaveDate">
                      Date and Time of Leaving the Hostel
                    </label>
                    <div className="datetime-row">
                      <div className="datetime-field">
                        <span className="datetime-sub-label">Date</span>
                        <div className="datetime-input-wrap">
                          <span className="datetime-icon" aria-hidden="true">
                            📅
                          </span>
                          <input className="input" id="leaveDate" name="leaveDate" type="date" required />
                        </div>
                      </div>
                      <div className="datetime-field">
                        <span className="datetime-sub-label">Time</span>
                        <div className="datetime-input-wrap">
                          <span className="datetime-icon" aria-hidden="true">
                            🕒
                          </span>
                          <input className="input" id="leaveTime" name="leaveTime" type="time" required />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="datetime-group">
                    <label className="datetime-main-label" htmlFor="returnDate">
                      Date and Time of Coming to Hostel
                    </label>
                    <div className="datetime-row">
                      <div className="datetime-field">
                        <span className="datetime-sub-label">Date</span>
                        <div className="datetime-input-wrap">
                          <span className="datetime-icon" aria-hidden="true">
                            📅
                          </span>
                          <input className="input" id="returnDate" name="returnDate" type="date" required />
                        </div>
                      </div>
                      <div className="datetime-field">
                        <span className="datetime-sub-label">Time</span>
                        <div className="datetime-input-wrap">
                          <span className="datetime-icon" aria-hidden="true">
                            🕒
                          </span>
                          <input className="input" id="returnTime" name="returnTime" type="time" required />
                        </div>
                      </div>
                    </div>
                  </div>

                  <label htmlFor="phoneNo">Phone No</label>
                  <input
                    className="input"
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
                    className="input"
                    id="guardianPhoneNo"
                    name="guardianPhoneNo"
                    type="tel"
                    placeholder="Enter parent/guardian phone number"
                    maxLength={10}
                    inputMode="numeric"
                    required
                  />

                  <button className="student-apply-button btn btn-primary hover-lift" type="submit">
                    Apply Now
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2>{activeView === 'approved' ? 'Approved Passes' : 'Pending Passes'}</h2>
                {passFetchError && <p className="fetch-error-text">{passFetchError}</p>}
                {visiblePasses.length === 0 ? (
                  <p className="empty-text">
                    {activeView === 'approved' ? 'No approved passes yet.' : 'No pending passes yet.'}
                  </p>
                ) : (
                  <ul className="applied-pass-list">
                    {visiblePasses.map((passRequest) => (
                      <li
                        key={passRequest._id}
                        className={`applied-pass-item ${
                          passRequest.status === 'approved' ? 'applied-pass-item-approved' : 'applied-pass-item-pending'
                        }`}
                      >
                        <div className="pass-card-header">
                          <p className="pass-card-kicker">Register Number</p>
                          <h3 className="pass-card-register">{passRequest.registerNo}</h3>
                        </div>

                        <div className="pass-detail-grid">
                          <div className="pass-detail-cell">
                            <span className="pass-detail-label">Leaving</span>
                            <span className="pass-detail-value">{formatDateTime(passRequest.leaveDateTime)}</span>
                          </div>
                          <div className="pass-detail-cell">
                            <span className="pass-detail-label">Returning</span>
                            <span className="pass-detail-value">{formatDateTime(passRequest.returnDateTime)}</span>
                          </div>
                        </div>

                        <div className="pass-item-divider" aria-hidden="true" />

                        <div className="pass-detail-grid pass-detail-grid-meta">
                          <div className="pass-detail-cell">
                            <span className="pass-detail-label">Status</span>
                            <span
                              className={`pass-status ${
                                passRequest.status === 'approved' ? 'pass-status-approved' : 'pass-status-pending'
                              }`}
                            >
                              {passRequest.status === 'approved' && (
                                <span className="pass-status-icon" aria-hidden="true">
                                  ✔
                                </span>
                              )}
                              {passRequest.status === 'approved' ? 'Approved' : 'Pending'}
                            </span>
                          </div>

                          {passRequest.status === 'approved' && (
                            <div className="pass-detail-cell">
                              <span className="pass-detail-label">Approved At</span>
                              <span className="pass-detail-value">{formatDateTime(passRequest.approvedAt)}</span>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

export default StudentHome
