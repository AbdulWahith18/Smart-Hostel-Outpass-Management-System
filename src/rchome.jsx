import { useEffect, useState } from 'react'
import './rchome.css'

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

function RCHome({ currentRc, activeView = 'pending', onViewChange }) {
  const [requestsForRc, setRequestsForRc] = useState([])

  useEffect(() => {
    const fetchRequests = async () => {
      if (!currentRc?.username) {
        setRequestsForRc([])
        return
      }

      try {
        const response = await fetch(`/api/pass-requests/rc/${encodeURIComponent(currentRc.username)}`)
        const data = await response.json()

        if (!response.ok) {
          alert(data.message ?? 'Failed to fetch pass requests.')
          return
        }

        setRequestsForRc(data.requests ?? [])
      } catch {
        alert('Unable to reach server. Please try again.')
      }
    }

    fetchRequests()
  }, [currentRc?.username])

  const pendingRequests = requestsForRc.filter((request) => request.status === 'pending')
  const approvedRequests = requestsForRc.filter((request) => request.status === 'approved')
  const visibleRequests = activeView === 'approved' ? approvedRequests : pendingRequests
  const totalRequests = requestsForRc.length

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

  const handleApprove = async (requestId) => {
    try {
      const response = await fetch(`/api/pass-requests/${requestId}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rcUsername: currentRc?.username ?? '' }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.message ?? 'Failed to approve pass request.')
        return
      }

      setRequestsForRc((requests) =>
        requests.map((request) => (request._id === requestId ? data.passRequest : request))
      )
    } catch {
      alert('Unable to reach server. Please try again.')
    }
  }

  return (
    <main className="rc-home-page">
      <section className="rc-home-card" aria-labelledby="rc-home-title">
        <header className="rc-home-header">
          <h1 id="rc-home-title">RC Dashboard</h1>
          <p className="rc-subtitle">Logged in as: {currentRc?.username ?? 'RC'}</p>
        </header>

        <section className="rc-summary-grid" aria-label="RC request summary">
          <article
            className={`rc-summary-card rc-summary-card-clickable ${
              activeView === 'pending' ? 'rc-summary-card-active' : ''
            }`}
            role="button"
            tabIndex={0}
            onClick={() => handleSummaryNavigate('pending')}
            onKeyDown={(event) => handleSummaryKeyDown(event, 'pending')}
            aria-label="Open pending passes"
          >
            <span className="rc-summary-icon" aria-hidden="true">
              ⏳
            </span>
            <div>
              <p className="rc-summary-label">Pending</p>
              <p className="rc-summary-value">{pendingRequests.length}</p>
            </div>
          </article>

          <article
            className={`rc-summary-card rc-summary-card-clickable ${
              activeView === 'approved' ? 'rc-summary-card-active' : ''
            }`}
            role="button"
            tabIndex={0}
            onClick={() => handleSummaryNavigate('approved')}
            onKeyDown={(event) => handleSummaryKeyDown(event, 'approved')}
            aria-label="Open approved passes"
          >
            <span className="rc-summary-icon" aria-hidden="true">
              ✅
            </span>
            <div>
              <p className="rc-summary-label">Approved</p>
              <p className="rc-summary-value">{approvedRequests.length}</p>
            </div>
          </article>

          <article className="rc-summary-card">
            <span className="rc-summary-icon" aria-hidden="true">
              📄
            </span>
            <div>
              <p className="rc-summary-label">Total Requests</p>
              <p className="rc-summary-value">{totalRequests}</p>
            </div>
          </article>
        </section>

        <div className="pass-section">
          <h2>
            {activeView === 'approved'
              ? `Approved Passes (${approvedRequests.length})`
              : `Pending Passes (${pendingRequests.length})`}
          </h2>
          {visibleRequests.length === 0 ? (
            <p className="empty-text">
              {activeView === 'approved'
                ? 'No approved passes for this RC.'
                : 'No pending pass requests for this RC.'}
            </p>
          ) : (
            <ul className="pass-list">
              {visibleRequests.map((request) => (
                <li
                  key={request._id}
                  className={`pass-item ${request.status === 'approved' ? 'approved' : ''}`}
                >
                  <div className="rc-pass-card-header">
                    <p className="rc-pass-card-kicker">Register Number</p>
                    <h3 className="rc-pass-card-register">{request.registerNo}</h3>
                  </div>

                  <section className="rc-pass-section-block" aria-label="Personal details">
                    <p className="rc-pass-section-title">Personal Details</p>
                    <div className="rc-pass-detail-grid">
                      <div className="rc-pass-detail-cell">
                        <span className="rc-pass-detail-label">Student</span>
                        <span className="rc-pass-detail-value">{request.name}</span>
                      </div>
                      <div className="rc-pass-detail-cell">
                        <span className="rc-pass-detail-label">Department</span>
                        <span className="rc-pass-detail-value">{request.department}</span>
                      </div>
                      <div className="rc-pass-detail-cell">
                        <span className="rc-pass-detail-label">Applied On</span>
                        <span className="rc-pass-detail-value">{formatDateTime(request.appliedOn)}</span>
                      </div>
                      <div className="rc-pass-detail-cell">
                        <span className="rc-pass-detail-label">Address</span>
                        <span className="rc-pass-detail-value">{request.address}</span>
                      </div>
                    </div>
                  </section>

                  <div className="rc-pass-divider" aria-hidden="true" />

                  <section className="rc-pass-section-block" aria-label="Hostel details">
                    <p className="rc-pass-section-title">Hostel Details</p>
                    <div className="rc-pass-detail-grid">
                      <div className="rc-pass-detail-cell">
                        <span className="rc-pass-detail-label">Hostel Block No</span>
                        <span className="rc-pass-detail-value">{request.hostelBlockNo || '-'}</span>
                      </div>
                      <div className="rc-pass-detail-cell">
                        <span className="rc-pass-detail-label">Room No</span>
                        <span className="rc-pass-detail-value">{request.roomNo || '-'}</span>
                      </div>
                    </div>
                  </section>

                  <div className="rc-pass-divider" aria-hidden="true" />

                  <section className="rc-pass-section-block" aria-label="Travel details">
                    <p className="rc-pass-section-title">Travel Details</p>
                    <div className="rc-pass-detail-grid">
                      <div className="rc-pass-detail-cell">
                        <span className="rc-pass-detail-label">Leaving</span>
                        <span className="rc-pass-detail-value">{formatDateTime(request.leaveDateTime)}</span>
                      </div>
                      <div className="rc-pass-detail-cell">
                        <span className="rc-pass-detail-label">Returning</span>
                        <span className="rc-pass-detail-value">{formatDateTime(request.returnDateTime)}</span>
                      </div>
                      <div className="rc-pass-detail-cell">
                        <span className="rc-pass-detail-label">Phone</span>
                        <span className="rc-pass-detail-value">{request.phoneNo}</span>
                      </div>
                      <div className="rc-pass-detail-cell">
                        <span className="rc-pass-detail-label">Parent/Guardian Phone</span>
                        <span className="rc-pass-detail-value">{request.guardianPhoneNo}</span>
                      </div>
                    </div>
                  </section>

                  <div className="rc-pass-divider" aria-hidden="true" />

                  <section className="rc-pass-section-block" aria-label="Approval details">
                    <p className="rc-pass-section-title">Approval Details</p>
                    <div
                      className={`rc-pass-approval-grid ${
                        request.status === 'approved' ? 'rc-pass-approval-grid-approved' : 'rc-pass-approval-grid-pending'
                      }`}
                    >
                      <div className="rc-pass-approval-cell">
                        <span className="rc-pass-meta-label">Status</span>
                        <span
                          className={`rc-pass-status ${
                            request.status === 'approved' ? 'rc-pass-status-approved' : 'rc-pass-status-pending'
                          }`}
                        >
                          {request.status === 'approved' && (
                            <span className="rc-pass-status-icon" aria-hidden="true">
                              ✔
                            </span>
                          )}
                          {request.status === 'approved' ? 'Approved' : 'Pending'}
                        </span>
                      </div>

                      {request.status === 'approved' && (
                        <div className="rc-pass-approval-cell rc-pass-approval-cell-right">
                          <span className="rc-pass-meta-label">Approved At</span>
                          <span className="rc-pass-meta-value">{formatDateTime(request.approvedAt)}</span>
                        </div>
                      )}
                    </div>
                  </section>

                  {request.status === 'pending' && (
                    <button className="rc-approve-button" type="button" onClick={() => handleApprove(request._id)}>
                      Approve Pass
                    </button>
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

export default RCHome
