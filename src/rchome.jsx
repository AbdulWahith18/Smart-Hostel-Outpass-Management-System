import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import './rchome.css'
import { getAuthToken } from './utils/authToken'
import { useToast } from './components/Toast'

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
  const toast = useToast()
  const [requestsForRc, setRequestsForRc] = useState([])

  const [aiInsights, setAiInsights] = useState([])
  const [aiGeneratedAt, setAiGeneratedAt] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(true)
  const [aiErrorMessage, setAiErrorMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [chatboxMessages, setChatboxMessages] = useState([])
  const [replyContent, setReplyContent] = useState('')
  const [chatboxMessageContent, setChatboxMessageContent] = useState('')
  const [replyError, setReplyError] = useState('')
  const [isReplySending, setIsReplySending] = useState(false)
  const [activeMessageTab, setActiveMessageTab] = useState('query')
  const [announcementMessages, setAnnouncementMessages] = useState([])
  const [chatboxClearedAt, setChatboxClearedAt] = useState(() => {
    const storageKey = `rc-chat-cleared-${currentRc?.email?.trim().toLowerCase() ?? 'default'}`
    const storedValue = localStorage.getItem(storageKey)
    const parsedValue = Number(storedValue)
    return Number.isFinite(parsedValue) ? parsedValue : 0
  })

  const sortMessagesChronologically = (list) => {
    return [...list].sort((firstMessage, secondMessage) => {
      const firstTime = new Date(firstMessage?.createdAt ?? 0).getTime()
      const secondTime = new Date(secondMessage?.createdAt ?? 0).getTime()
      return firstTime - secondTime
    })
  }

  const upsertMessage = (previousMessages, incomingMessage) => {
    if (!incomingMessage?._id) {
      return previousMessages
    }

    const existingIndex = previousMessages.findIndex((message) => message._id === incomingMessage._id)

    if (existingIndex !== -1) {
      return previousMessages.map((message) => (message._id === incomingMessage._id ? incomingMessage : message))
    }

    return sortMessagesChronologically([...previousMessages, incomingMessage])
  }

  const getChatboxClearTimestamp = () => {
    const storageKey = `rc-chat-cleared-${currentRc?.email?.trim().toLowerCase() ?? 'default'}`
    const storedValue = localStorage.getItem(storageKey)
    const parsedValue = Number(storedValue)
    return Number.isFinite(parsedValue) ? parsedValue : 0
  }

  const clearChatboxForCurrentUser = () => {
    const storageKey = `rc-chat-cleared-${currentRc?.email?.trim().toLowerCase() ?? 'default'}`
    const now = Date.now()
    localStorage.setItem(storageKey, String(now))
    setChatboxClearedAt(now)
    setChatboxMessages([])
  }

  useEffect(() => {
    setChatboxClearedAt(getChatboxClearTimestamp())
  }, [currentRc?.email])

  const isAnalyticsView = activeView === 'analytics'
  const isQueriesView = activeView === 'queries'
  const isChatboxView = activeView === 'chatbox'
  const groupMessages = sortMessagesChronologically(chatboxMessages)
  const announcementList = sortMessagesChronologically(announcementMessages.filter((message) => message.isBroadcast))

  const fetchAiSummary = async () => {
    setIsAiLoading(true)

    try {
      const token = getAuthToken()
      const response = await fetch('/api/admin/ai-analytics/rc', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        setAiErrorMessage(data.message ?? 'AI summary is not available right now.')
        setAiInsights([])
        setAiGeneratedAt('')
        return
      }

      setAiErrorMessage('')
      setAiInsights(Array.isArray(data.insights) ? data.insights : [])
      setAiGeneratedAt(data.generatedAt ?? '')
    } catch {
      setAiErrorMessage('Unable to load AI insights currently.')
      setAiInsights([])
      setAiGeneratedAt('')
    } finally {
      setIsAiLoading(false)
    }
  }

  useEffect(() => {
    const rcUsername = currentRc?.username?.trim() ?? ''

    const fetchMessages = async () => {
      if (!rcUsername) {
        return
      }

      try {
        const token = getAuthToken()
        const response = await fetch(`/api/messages?userType=RC&email=${encodeURIComponent(currentRc?.email ?? '')}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (response.ok) {
          const incomingMessages = Array.isArray(data.messages) ? data.messages : []
          const clearedAt = getChatboxClearTimestamp()
          const sortedMessages = sortMessagesChronologically(incomingMessages)
          const chatMessages = sortedMessages.filter((message) => message.chatScope === 'students-rcs' && !message.isBroadcast && new Date(message.createdAt ?? 0).getTime() > clearedAt)
          setChatboxMessages(chatMessages)
          setMessages(sortedMessages)
          setAnnouncementMessages(sortedMessages.filter((message) => message.isBroadcast && (message.recipientEmail === currentRc?.email || message.senderType === 'Admin')))
        }
      } catch {
        setReplyError('Unable to load messages.')
      }
    }

    fetchMessages()

    const fetchRequests = async () => {
      if (!rcUsername) {
        setRequestsForRc([])
        return
      }

      try {
        const response = await fetch(`/api/pass-requests/rc/${encodeURIComponent(rcUsername)}`)
        const data = await response.json()

        if (!response.ok) {
          toast.error(data.message ?? 'Failed to fetch pass requests.')
          return
        }

        setRequestsForRc(data.requests ?? [])
      } catch {
        toast.error('Unable to reach server. Please try again.')
      }
    }

    fetchRequests()


    if (!rcUsername) {
      return
    }

    const socket = io('/', {
      transports: ['websocket', 'polling'],
    })

    socket.emit('rc:join', { rcUsername })

    const upsertRequest = (incomingRequest) => {
      if (!incomingRequest?._id) {
        return
      }

      setRequestsForRc((previousRequests) => {
        const existingIndex = previousRequests.findIndex((request) => request._id === incomingRequest._id)

        if (existingIndex === -1) {
          return [incomingRequest, ...previousRequests]
        }

        return previousRequests.map((request) =>
          request._id === incomingRequest._id ? incomingRequest : request
        )
      })
    }

    socket.on('pass:new', upsertRequest)
    socket.on('pass:updated', upsertRequest)
    socket.on('message:new', (incomingMessage) => {
      const isGroupMessage = incomingMessage?.chatScope === 'students-rcs' && !incomingMessage?.isBroadcast
      const isAnnouncement = incomingMessage?.isBroadcast && (incomingMessage?.recipientEmail === currentRc?.email || incomingMessage?.senderType === 'Admin')

      if (isGroupMessage) {
        const incomingTime = new Date(incomingMessage?.createdAt ?? 0).getTime()
        if (incomingTime > getChatboxClearTimestamp()) {
          setChatboxMessages((previousMessages) => upsertMessage(previousMessages, incomingMessage))
        }
      }

      if (isAnnouncement) {
        setAnnouncementMessages((previousAnnouncements) => upsertMessage(previousAnnouncements, incomingMessage))
      }
    })
    socket.on('announcement:new', (incomingMessage) => {
      const isAnnouncement = incomingMessage?.isBroadcast && (incomingMessage?.recipientEmail === currentRc?.email || incomingMessage?.senderType === 'Admin')

      if (isAnnouncement) {
        setAnnouncementMessages((previousAnnouncements) => upsertMessage(previousAnnouncements, incomingMessage))
      }
    })

    return () => {
      socket.emit('rc:leave', { rcUsername })
      socket.off('pass:new', upsertRequest)
      socket.off('pass:updated', upsertRequest)
      socket.off('message:new')
      socket.off('announcement:new')
      socket.disconnect()
    }
  }, [currentRc?.username])

  useEffect(() => {
    if (activeView !== 'analytics') {
      return
    }

    fetchAiSummary()
  }, [activeView])

  const pendingRequests = requestsForRc.filter((request) => request.status === 'pending')
  const approvedRequests = requestsForRc.filter((request) => request.status === 'approved')
  const rejectedRequests = requestsForRc.filter((request) => request.status === 'rejected')
  let visibleRequests = pendingRequests
  if (activeView === 'approved') visibleRequests = approvedRequests
  else if (activeView === 'rejected') visibleRequests = rejectedRequests
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
        toast.error(data.message ?? 'Failed to approve pass request.')
        return
      }

      toast.success(data.message ?? 'Pass request approved successfully.')

      setRequestsForRc((requests) =>
        requests.map((request) => (request._id === requestId ? data.passRequest : request))
      )
    } catch {
      toast.error('Unable to reach server. Please try again.')
    }
  }


  const handleSendReply = async (event) => {
    event.preventDefault()
    if (!replyContent.trim()) {
      setReplyError('Please enter a reply.')
      return
    }

    setIsReplySending(true)
    setReplyError('')

    try {
      const token = getAuthToken()
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: replyContent,
          subject: 'Query to Admin',
          recipientType: 'Admin',
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setReplyError(data.message ?? 'Failed to send reply.')
        return
      }

      setReplyContent('')
      setMessages((previousMessages) => upsertMessage(previousMessages, data.data))
    } catch {
      setReplyError('Unable to send reply right now.')
    } finally {
      setIsReplySending(false)
    }
  }

  const handleSendChatboxMessage = async (event) => {
    event.preventDefault()
    if (!chatboxMessageContent.trim()) {
      setReplyError('Please enter a message before sending.')
      return
    }

    setIsReplySending(true)
    setReplyError('')

    try {
      const token = getAuthToken()
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: chatboxMessageContent,
          subject: 'Group chat message',
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setReplyError(data.message ?? 'Failed to send chat message.')
        return
      }

      setChatboxMessageContent('')
      setChatboxMessages((previousMessages) => upsertMessage(previousMessages, data.data))
    } catch {
      setReplyError('Unable to send chat message right now.')
    } finally {
      setIsReplySending(false)
    }
  }

  const handleReject = async (requestId) => {
    try {
      const response = await fetch(`/api/pass-requests/${requestId}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rcUsername: currentRc?.username ?? '' }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.message ?? 'Failed to reject pass request.')
        return
      }

      toast.success(data.message ?? 'Pass request rejected.')

      setRequestsForRc((requests) =>
        requests.map((request) => (request._id === requestId ? data.passRequest : request))
      )
    } catch {
      toast.error('Unable to reach server. Please try again.')
    }
  }


  return (
    <main className="rc-home-page">
      <section className="rc-home-card saas-card fade-in" aria-labelledby="rc-home-title">
        <header className="rc-home-header">
          <h1 id="rc-home-title">RC Dashboard</h1>
          <p className="rc-subtitle">Logged in as: {currentRc?.username ?? 'RC'}</p>
        </header>

        <section className="rc-summary-grid" aria-label="RC request summary">
          <article
            className={`rc-summary-card dashboard-card hover-lift rc-summary-card-clickable ${
              activeView === 'pending' ? 'rc-summary-card-active' : ''
            }`}
            role="button"
            tabIndex={0}
            onClick={() => handleSummaryNavigate('pending')}
            onKeyDown={(event) => handleSummaryKeyDown(event, 'pending')}
            aria-label="Open pending passes"
          >
            <span className="rc-summary-icon" aria-hidden="true">⏳</span>
            <div>
              <p className="rc-summary-label">Pending</p>
              <p className="rc-summary-value">{pendingRequests.length}</p>
            </div>
          </article>
          <article
            className={`rc-summary-card dashboard-card hover-lift rc-summary-card-clickable ${
              activeView === 'approved' ? 'rc-summary-card-active' : ''
            }`}
            role="button"
            tabIndex={0}
            onClick={() => handleSummaryNavigate('approved')}
            onKeyDown={(event) => handleSummaryKeyDown(event, 'approved')}
            aria-label="Open approved passes"
          >
            <span className="rc-summary-icon" aria-hidden="true">✅</span>
            <div>
              <p className="rc-summary-label">Approved</p>
              <p className="rc-summary-value">{approvedRequests.length}</p>
            </div>
          </article>
          <article
            className={`rc-summary-card dashboard-card hover-lift rc-summary-card-clickable ${
              activeView === 'rejected' ? 'rc-summary-card-active' : ''
            }`}
            role="button"
            tabIndex={0}
            onClick={() => handleSummaryNavigate('rejected')}
            onKeyDown={(event) => handleSummaryKeyDown(event, 'rejected')}
            aria-label="Open rejected passes"
          >
            <span className="rc-summary-icon" aria-hidden="true">✖</span>
            <div>
              <p className="rc-summary-label">Rejected</p>
              <p className="rc-summary-value">{rejectedRequests.length}</p>
            </div>
          </article>
          <article className="rc-summary-card rc-summary-card-total dashboard-card hover-lift">
            <span className="rc-summary-icon" aria-hidden="true">📄</span>
            <div>
              <p className="rc-summary-label">Total Requests</p>
              <p className="rc-summary-value">{totalRequests}</p>
            </div>
          </article>
        </section>

        {isAnalyticsView && (
          <section className="rc-analytics-wrap" aria-label="RC AI analytics snapshot">
            <p className="rc-analytics-kicker">AI Powered Insights</p>
            <div className="rc-analytics-card saas-card hover-lift analytics-card">
              <div className="rc-analytics-header-row">
                <h3 className="rc-analytics-title">AI Analytics Summary</h3>
                <button type="button" className="rc-approve-button btn btn-primary hover-lift" onClick={fetchAiSummary}>
                  Refresh Summary
                </button>
              </div>

              {isAiLoading && <p className="rc-analytics-state">Loading latest AI insights...</p>}

              {!isAiLoading && aiErrorMessage && <p className="rc-analytics-state rc-analytics-state-error">{aiErrorMessage}</p>}

              {!isAiLoading && !aiErrorMessage && aiInsights.length === 0 && (
                <p className="rc-analytics-state">No AI insights available yet.</p>
              )}

              {!isAiLoading && !aiErrorMessage && aiInsights.length > 0 && (
                <>
                  <ul className="rc-analytics-insights">
                    {aiInsights.map((insight, index) => (
                      <li key={`${insight}-${index}`} className="rc-analytics-insight-item">
                        <span className="rc-analytics-insight-dot" aria-hidden="true" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                  {aiGeneratedAt && (
                    <p className="rc-analytics-updated">Updated: {new Date(aiGeneratedAt).toLocaleString()}</p>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {isQueriesView && (
          <section className="rc-analytics-wrap" aria-label="RC queries">
            <div className="rc-analytics-card saas-card hover-lift analytics-card">
              <div className="message-tabs">
                <button type="button" className={`message-tab ${activeMessageTab === 'query' ? 'message-tab-active' : ''}`} onClick={() => setActiveMessageTab('query')}>
                  Query to Admin
                </button>
                <button type="button" className={`message-tab ${activeMessageTab === 'announcement' ? 'message-tab-active' : ''}`} onClick={() => setActiveMessageTab('announcement')}>
                  Announcement
                </button>
              </div>

              {activeMessageTab === 'query' ? (
                <form className="apply-pass-form" onSubmit={handleSendReply}>
                  <p className="student-home-subtitle">Send a message to the admin for the shared group.</p>
                  <label htmlFor="replyContent">Reply Message</label>
                  <textarea id="replyContent" className="input" rows="5" placeholder="Type your reply" value={replyContent} onChange={(event) => setReplyContent(event.target.value)} />
                  {replyError && <p className="admin-error-text">{replyError}</p>}
                  <button type="submit" className="btn btn-primary hover-lift" disabled={isReplySending}>{isReplySending ? 'Sending...' : 'Send Reply'}</button>
                </form>
              ) : (
                <div className="announcement-panel">
                  <h3>Admin Announcements</h3>
                  {announcementList.length === 0 ? (
                    <p className="empty-text">No announcements yet.</p>
                  ) : (
                    <ul className="announcement-list">
                      {announcementList.map((message) => (
                        <li key={message._id} className="announcement-item">
                          <p className="announcement-title">{message.subject || 'Announcement'}</p>
                          <p className="announcement-content">{message.content}</p>
                          <p className="admin-users-subtitle">{formatDateTime(message.createdAt)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {isChatboxView && (
          <section className="rc-analytics-wrap" aria-label="RC group chat">
            <div className="rc-analytics-card saas-card hover-lift analytics-card">
              <h3 className="rc-analytics-title">Group Chat</h3>
              <div className="chatbox-shell">
                <div className="chatbox-header-row">
                  <p className="student-home-subtitle">Clear your local view anytime.</p>
                  <button type="button" className="btn btn-outline hover-lift" onClick={clearChatboxForCurrentUser}>
                    Clear Chat
                  </button>
                </div>
                <div className="chatbox-messages">
                  {groupMessages.length === 0 ? (
                    <p className="empty-text">No messages yet.</p>
                  ) : (
                    groupMessages.map((message) => {
                      const senderName = message.senderName || message.senderType || 'Unknown'
                      const isCurrentUser = message.senderEmail === currentRc?.email
                      return (
                        <div key={message._id} className={`chat-bubble ${isCurrentUser ? 'chat-bubble-self' : ''}`}>
                          {!isCurrentUser && <p className="chat-sender">{senderName}</p>}
                          <p className="chat-text">{message.content}</p>
                          <span className="chat-time">{formatDateTime(message.createdAt)}</span>
                        </div>
                      )
                    })
                  )}
                </div>
                <form className="chatbox-input-row" onSubmit={handleSendChatboxMessage}>
                  <textarea className="input" rows="2" placeholder="Type a message" value={chatboxMessageContent} onChange={(event) => setChatboxMessageContent(event.target.value)} />
                  <button type="submit" className="btn btn-primary hover-lift" disabled={isReplySending}>{isReplySending ? 'Sending...' : 'Send'}</button>
                </form>
              </div>
            </div>
          </section>
        )}

        {!isAnalyticsView && !isQueriesView && !isChatboxView && (
          <div className="pass-section">
            <h2>
              {activeView === 'approved'
                ? `Approved Passes (${approvedRequests.length})`
                : activeView === 'rejected'
                ? `Rejected Passes (${rejectedRequests.length})`
                : `Pending Passes (${pendingRequests.length})`}
            </h2>
            {visibleRequests.length === 0 ? (
              <p className="empty-text">
                {activeView === 'approved'
                  ? 'No approved passes for this RC.'
                  : activeView === 'rejected'
                  ? 'No rejected passes for this RC.'
                  : 'No pending pass requests for this RC.'}
              </p>
            ) : (
              <ul className="pass-list">
                {visibleRequests.map((request) => (
                  <li
                    key={request._id}
                    className={`pass-item ${request.status === 'approved' ? 'approved' : request.status === 'rejected' ? 'rejected' : ''}`}
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
                        <div className="rc-pass-detail-cell">
                          <span className="rc-pass-detail-label">Address</span>
                          <span className="rc-pass-detail-value">{request.address}</span>
                        </div>
                        <div className="rc-pass-detail-cell">
                          <span className="rc-pass-detail-label">Reason for Applying</span>
                          <span className="rc-pass-detail-value">{request.reason}</span>
                        </div>
                      </div>
                    </section>
                    <div className="rc-pass-divider" aria-hidden="true" />
                    <section className="rc-pass-section-block" aria-label="Approval details">
                      <p className="rc-pass-section-title">Approval Details</p>
                      <div
                        className={`rc-pass-approval-grid ${
                          request.status === 'approved'
                            ? 'rc-pass-approval-grid-approved'
                            : request.status === 'rejected'
                            ? 'rc-pass-approval-grid-rejected'
                            : 'rc-pass-approval-grid-pending'
                        }`}
                      >
                        <div className="rc-pass-approval-cell">
                          <span className="rc-pass-meta-label">Status</span>
                          <span
                            className={`rc-pass-status ${
                              request.status === 'approved'
                                ? 'rc-pass-status-approved'
                                : request.status === 'rejected'
                                ? 'rc-pass-status-rejected'
                                : 'rc-pass-status-pending'
                            }`}
                          >
                            {request.status === 'approved' && (
                              <span className="rc-pass-status-icon" aria-hidden="true">✔</span>
                            )}
                            {request.status === 'rejected' && (
                              <span className="rc-pass-status-icon" aria-hidden="true">✖</span>
                            )}
                            {request.status === 'approved'
                              ? 'Approved'
                              : request.status === 'rejected'
                              ? 'Rejected'
                              : 'Pending'}
                          </span>
                        </div>
                        {request.status === 'approved' && (
                          <div className="rc-pass-approval-cell rc-pass-approval-cell-right">
                            <span className="rc-pass-meta-label">Approved At</span>
                            <span className="rc-pass-meta-value">{formatDateTime(request.approvedAt)}</span>
                          </div>
                        )}
                        {request.status === 'approved' && (
                          <div className="rc-pass-approval-cell rc-pass-approval-cell-right">
                            <span className="rc-pass-meta-label">Approved By</span>
                            <span className="rc-pass-meta-value">{request.approvedBy || '-'}</span>
                          </div>
                        )}
                        {request.status === 'rejected' && request.rejectedAt && (
                          <div className="rc-pass-approval-cell rc-pass-approval-cell-right">
                            <span className="rc-pass-meta-label">Rejected At</span>
                            <span className="rc-pass-meta-value">{formatDateTime(request.rejectedAt)}</span>
                          </div>
                        )}
                        {request.status === 'rejected' && (
                          <div className="rc-pass-approval-cell rc-pass-approval-cell-right">
                            <span className="rc-pass-meta-label">Rejected By</span>
                            <span className="rc-pass-meta-value">{request.rejectedBy || '-'}</span>
                          </div>
                        )}
                      </div>
                    </section>
                    {request.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="rc-approve-button btn btn-primary hover-lift" type="button" onClick={() => handleApprove(request._id)}>
                          Approve Pass
                        </button>
                        <button className="rc-reject-button btn btn-danger hover-lift" type="button" onClick={() => handleReject(request._id)}>
                          Reject Pass
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </main>
  )
}

export default RCHome
