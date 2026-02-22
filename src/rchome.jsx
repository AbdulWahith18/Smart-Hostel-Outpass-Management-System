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

function RCHome({ currentRc }) {
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
        <h1 id="rc-home-title">RC Home</h1>
        <p className="rc-subtitle">Logged in as: {currentRc?.username ?? 'RC'}</p>

        <div className="pass-section">
          <h2>Pending Passes</h2>
          {pendingRequests.length === 0 ? (
            <p className="empty-text">No pending pass requests for this RC.</p>
          ) : (
            <ul className="pass-list">
              {pendingRequests.map((request) => (
                <li key={request._id} className="pass-item">
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
                  <button type="button" onClick={() => handleApprove(request._id)}>
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
                <li key={request._id} className="pass-item approved">
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
