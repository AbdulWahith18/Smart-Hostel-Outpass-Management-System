import { useMemo, useState } from 'react'
import './rchome.css'

const PASS_REQUESTS_KEY = 'passRequests'

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

function RCHome({ currentRc }) {
  const [refreshKey, setRefreshKey] = useState(0)

  const requestsForRc = useMemo(() => {
    const storedRequests = JSON.parse(localStorage.getItem(PASS_REQUESTS_KEY) ?? '[]')
    return storedRequests.filter((request) => request.authorizedRc === currentRc?.username)
  }, [currentRc?.username, refreshKey])

  const pendingRequests = requestsForRc.filter((request) => request.status === 'pending')
  const approvedRequests = requestsForRc.filter((request) => request.status === 'approved')

  const handleApprove = (requestId) => {
    const storedRequests = JSON.parse(localStorage.getItem(PASS_REQUESTS_KEY) ?? '[]')
    const updatedRequests = storedRequests.map((request) =>
      request.id === requestId
        ? {
            ...request,
            status: 'approved',
            approvedAt: new Date().toISOString(),
          }
        : request
    )

    localStorage.setItem(PASS_REQUESTS_KEY, JSON.stringify(updatedRequests))
    setRefreshKey((value) => value + 1)
  }

  return (
    <main className="rc-home-page">
      <section className="rc-home-card" aria-labelledby="rc-home-title">
        <h1 id="rc-home-title">RC Home</h1>
        <p className="rc-subtitle">Logged in as: {currentRc?.username ?? 'RC'}</p>

        <div className="pass-section">
          <h2>Pending Passes</h2>
          {pendingRequests.length === 0 ? (
            <p className="empty-text">No pending pass requests for this RC.</p>
          ) : (
            <ul className="pass-list">
              {pendingRequests.map((request) => (
                <li key={request.id} className="pass-item">
                  <p>
                    <strong>Student:</strong> {request.name}
                  </p>
                  <p>
                    <strong>Register No:</strong> {request.registerNo}
                  </p>
                  <p>
                    <strong>Department:</strong> {request.department}
                  </p>
                  <p>
                    <strong>Applied On:</strong> {request.appliedOn}
                  </p>
                  <p>
                    <strong>Leaving:</strong> {formatDateTime(request.leaveDateTime)}
                  </p>
                  <p>
                    <strong>Returning:</strong> {formatDateTime(request.returnDateTime)}
                  </p>
                  <p>
                    <strong>Address:</strong> {request.address}
                  </p>
                  <p>
                    <strong>Phone:</strong> {request.phoneNo}
                  </p>
                  <p>
                    <strong>Parent/Guardian Phone:</strong> {request.guardianPhoneNo}
                  </p>
                  <button type="button" onClick={() => handleApprove(request.id)}>
                    Approve Pass
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="pass-section">
          <h2>Approved Passes</h2>
          {approvedRequests.length === 0 ? (
            <p className="empty-text">No approved passes for this RC.</p>
          ) : (
            <ul className="pass-list">
              {approvedRequests.map((request) => (
                <li key={request.id} className="pass-item approved">
                  <p>
                    <strong>Student:</strong> {request.name}
                  </p>
                  <p>
                    <strong>Register No:</strong> {request.registerNo}
                  </p>
                  <p>
                    <strong>Approved At:</strong> {formatDateTime(request.approvedAt)}
                  </p>
                  <p>
                    <strong>Leaving:</strong> {formatDateTime(request.leaveDateTime)}
                  </p>
                  <p>
                    <strong>Returning:</strong> {formatDateTime(request.returnDateTime)}
                  </p>
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
