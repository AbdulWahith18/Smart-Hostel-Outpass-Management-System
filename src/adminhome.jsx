import { useEffect, useMemo, useState } from 'react'
import './adminhome.css'

const INACTIVITY_DAYS = 60

const getDaysSince = (dateValue) => {
  if (!dateValue) {
    return null
  }

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
}

const formatLastLogin = (dateValue) => {
  if (!dateValue) {
    return 'Never logged in'
  }

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    return 'Invalid date'
  }

  const days = getDaysSince(dateValue)
  if (days === null) {
    return date.toLocaleString()
  }

  if (days === 0) {
    return 'Today'
  }

  if (days === 1) {
    return '1 day ago'
  }

  return `${days} days ago`
}

function AdminHome({ currentUser, activeView = 'view', onViewChange }) {
  const defaultChatHints = [
    'How many users are present now?',
    'How many students applied for outpass this week?',
    'Which day has the highest outpass requests?',
    'Show request count for 2026-03-10.',
  ]

  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [aiInsights, setAiInsights] = useState([])
  const [isAiLoading, setIsAiLoading] = useState(true)
  const [aiErrorMessage, setAiErrorMessage] = useState('')
  const [viewUserType, setViewUserType] = useState('All')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [chatQuestion, setChatQuestion] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [chatContextMeta, setChatContextMeta] = useState(null)
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Ask me about users, pass requests, day-wise trends, or date-wise request counts.',
    },
  ])
  const isAnalyticsView = activeView === 'analytics'
  const chatStorageKey = `admin-ai-chat-${currentUser?.username ?? 'default'}`

  const fetchUsers = async () => {
    setIsLoading(true)

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.message ?? 'Failed to fetch users.')
        setUsers([])
        return
      }

      setErrorMessage('')
      setUsers(data.users ?? [])
    } catch {
      setErrorMessage('Unable to reach server. Please try again.')
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAiInsights = async () => {
    setIsAiLoading(true)

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/admin/ai-analytics', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        setAiErrorMessage(data.error ?? data.message ?? 'Failed to fetch AI analytics summary.')
        setAiInsights([])
        return
      }

      setAiErrorMessage('')
      setAiInsights(Array.isArray(data.insights) ? data.insights : [])
    } catch {
      setAiErrorMessage('Unable to reach AI analytics service. Please try again.')
      setAiInsights([])
    } finally {
      setIsAiLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (activeView !== 'analytics') {
      return
    }

    fetchAiInsights()
  }, [activeView])

  useEffect(() => {
    try {
      const rawChat = localStorage.getItem(chatStorageKey)
      if (!rawChat) {
        return
      }

      const parsedChat = JSON.parse(rawChat)
      if (Array.isArray(parsedChat?.messages) && parsedChat.messages.length > 0) {
        setChatMessages(parsedChat.messages)
      }

      if (parsedChat?.contextMeta) {
        setChatContextMeta(parsedChat.contextMeta)
      }
    } catch {
      localStorage.removeItem(chatStorageKey)
    }
  }, [chatStorageKey])

  useEffect(() => {
    const payload = {
      messages: chatMessages,
      contextMeta: chatContextMeta,
    }

    localStorage.setItem(chatStorageKey, JSON.stringify(payload))
  }, [chatMessages, chatContextMeta, chatStorageKey])

  const studentCount = useMemo(() => users.filter((user) => user.userType === 'Student').length, [users])
  const rcCount = useMemo(() => users.filter((user) => user.userType === 'RC').length, [users])
  const visibleUsers = useMemo(() => {
    const usersByType =
      activeView === 'manage' || viewUserType === 'All'
        ? users
        : users.filter((user) => user.userType === viewUserType)

    if (statusFilter === 'all') {
      return usersByType
    }

    return usersByType.filter((user) => (user.status ?? 'active') === statusFilter)
  }, [activeView, users, viewUserType, statusFilter])

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredUsers = useMemo(() => {
    if (!normalizedSearch) {
      return visibleUsers
    }

    return visibleUsers.filter((user) => {
      const fields = [user.username, user.email, user.userType, user.mobileNo]
      return fields.some((field) => field?.toString().toLowerCase().includes(normalizedSearch))
    })
  }, [normalizedSearch, visibleUsers])

  const sectionTitle = activeView === 'manage' ? 'Manage Users' : 'View Users'
  const sectionSubtitle =
    activeView === 'manage'
      ? 'Review user details and remove users when needed.'
      : `Browse ${viewUserType} accounts and inspect profile details.`

  const handleSummaryNavigate = (view) => {
    if (onViewChange) {
      onViewChange(view)
    }
  }

  const handleUpdateUserStatus = async (userId, nextStatus) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/user-status/${userId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.message ?? 'Failed to update user status.')
        return
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) => (user._id === userId ? { ...user, ...data.user } : user))
      )
    } catch {
      alert('Unable to reach server. Please try again.')
    }
  }

  const sendChatQuestion = async (questionText) => {
    const normalizedQuestion = questionText?.toString().trim() ?? ''
    if (!normalizedQuestion || isChatLoading) {
      return
    }

    setChatMessages((messages) => [
      ...messages,
      { id: `user-${Date.now()}`, role: 'user', text: normalizedQuestion },
    ])
    setChatQuestion('')
    setIsChatLoading(true)

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/admin/ai-chat', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: normalizedQuestion }),
      })

      const data = await response.json()

      if (!response.ok) {
        setChatMessages((messages) => [
          ...messages,
          {
            id: `assistant-error-${Date.now()}`,
            role: 'assistant',
            text: data.error ?? data.message ?? 'I could not answer that right now.',
            isError: true,
          },
        ])
        return
      }

      setChatContextMeta(data.contextMeta ?? null)
      setChatMessages((messages) => [
        ...messages,
        { id: `assistant-${Date.now()}`, role: 'assistant', text: data.answer ?? 'No answer available.' },
      ])
    } catch {
      setChatMessages((messages) => [
        ...messages,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          text: 'Unable to reach the AI chat service at the moment.',
          isError: true,
        },
      ])
    } finally {
      setIsChatLoading(false)
    }
  }

  const clearChat = () => {
    const defaultMessage = {
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      text: 'Ask me about users, pass requests, day-wise trends, or date-wise request counts.',
    }

    setChatMessages([defaultMessage])
    setChatContextMeta(null)
    setChatQuestion('')
    localStorage.removeItem(chatStorageKey)
  }

  const exportChat = () => {
    const lines = []
    lines.push('HOMS Admin AI Chat Export')
    lines.push(`Exported At: ${new Date().toLocaleString()}`)

    if (chatContextMeta) {
      lines.push(
        `Snapshot: Users ${chatContextMeta.totalUsers} (Students ${chatContextMeta.studentCount}, RC ${chatContextMeta.rcCount}), Requests ${chatContextMeta.totalRequests} (Approved ${chatContextMeta.approvedCount}, Pending ${chatContextMeta.pendingCount}, Rejected ${chatContextMeta.rejectedCount}), Dates ${chatContextMeta.dateWindow}`
      )
    }

    lines.push('')
    chatMessages.forEach((message) => {
      const role = message.role === 'user' ? 'Admin' : 'AI'
      lines.push(`${role}: ${message.text}`)
    })

    const fileContent = lines.join('\n')
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' })
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = `homs-admin-ai-chat-${Date.now()}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
  }

  return (
    <main className="admin-home-page">
      <section className="admin-home-card" aria-labelledby="admin-home-title">
        <header className="admin-home-header">
          <h1 id="admin-home-title">Admin Dashboard</h1>
          <p className="admin-subtitle">Logged in as: {currentUser?.username ?? 'Admin'}</p>
        </header>

        <section className="admin-summary-grid" aria-label="User summary">
          <article
            className={`admin-summary-card dashboard-card hover-lift admin-summary-card-clickable ${
              activeView === 'view' ? 'admin-summary-card-active' : ''
            }`}
            role="button"
            tabIndex={0}
            onClick={() => {
              setViewUserType('All')
              handleSummaryNavigate('view')
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setViewUserType('All')
                handleSummaryNavigate('view')
              }
            }}
            aria-label="Open users table"
          >
            <span className="admin-summary-icon" aria-hidden="true">
              👥
            </span>
            <div>
              <p className="admin-summary-label">Total Users</p>
              <p className="admin-summary-value">{users.length}</p>
            </div>
          </article>

          <article
            className={`admin-summary-card dashboard-card hover-lift admin-summary-card-clickable ${
              activeView === 'view' && viewUserType === 'Student' ? 'admin-summary-card-active' : ''
            }`}
            role="button"
            tabIndex={0}
            onClick={() => {
              setViewUserType('Student')
              handleSummaryNavigate('view')
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setViewUserType('Student')
                handleSummaryNavigate('view')
              }
            }}
            aria-label="Open student users"
          >
            <span className="admin-summary-icon" aria-hidden="true">
              🎓
            </span>
            <div>
              <p className="admin-summary-label">Students</p>
              <p className="admin-summary-value">{studentCount}</p>
            </div>
          </article>

          <article
            className={`admin-summary-card dashboard-card hover-lift admin-summary-card-clickable ${
              activeView === 'view' && viewUserType === 'RC' ? 'admin-summary-card-active' : ''
            }`}
            role="button"
            tabIndex={0}
            onClick={() => {
              setViewUserType('RC')
              handleSummaryNavigate('view')
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setViewUserType('RC')
                handleSummaryNavigate('view')
              }
            }}
            aria-label="Open RC users"
          >
            <span className="admin-summary-icon" aria-hidden="true">
              🛡️
            </span>
            <div>
              <p className="admin-summary-label">RC Users</p>
              <p className="admin-summary-value">{rcCount}</p>
            </div>
          </article>
        </section>

        {isAnalyticsView && (
          <section className="admin-analytics-wrap" aria-label="AI analytics summary">
            <p className="admin-analytics-kicker">AI Powered Insights</p>
            <div className="admin-analytics-card saas-card hover-lift analytics-card">
              <div className="admin-analytics-header-row">
                <h3 className="admin-analytics-title">AI Analytics Summary</h3>
                <button type="button" className="admin-analytics-refresh-button btn btn-primary hover-lift" onClick={fetchAiInsights}>
                  Refresh Insights
                </button>
              </div>

              {isAiLoading && <p className="admin-analytics-state">Generating analytics insights...</p>}

              {!isAiLoading && aiErrorMessage && <p className="admin-analytics-state admin-analytics-state-error">{aiErrorMessage}</p>}

              {!isAiLoading && !aiErrorMessage && aiInsights.length === 0 && (
                <p className="admin-analytics-state">No analytics insights available yet.</p>
              )}

              {!isAiLoading && !aiErrorMessage && aiInsights.length > 0 && (
                <ul className="admin-analytics-insights">
                  {aiInsights.map((insight, index) => (
                    <li key={`${insight}-${index}`} className="admin-analytics-insight-item">
                      <span className="admin-analytics-insight-dot" aria-hidden="true" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="admin-chatbot-card" aria-label="AI analytics chatbot">
              <div className="admin-chatbot-top-row">
                <div>
                  <h3 className="admin-chatbot-title">AI Analytics Chatbot</h3>
                  <p className="admin-chatbot-subtitle">Ask direct questions about users and outpass trends.</p>
                </div>
                <div className="admin-chatbot-top-actions">
                  <button type="button" className="admin-chatbot-export btn btn-outline hover-lift" onClick={exportChat}>
                    Export Chat
                  </button>
                  <button type="button" className="admin-chatbot-clear btn btn-outline hover-lift" onClick={clearChat}>
                    Clear Chat
                  </button>
                </div>
              </div>

              <div className="admin-chatbot-hints" aria-label="Suggested questions">
                {defaultChatHints.map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    className="admin-chatbot-hint btn btn-outline hover-lift"
                    onClick={() => sendChatQuestion(hint)}
                    disabled={isChatLoading}
                  >
                    {hint}
                  </button>
                ))}
              </div>

              <div className="admin-chatbot-messages" role="log" aria-live="polite">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`admin-chatbot-message ${
                      message.role === 'user' ? 'admin-chatbot-message-user' : 'admin-chatbot-message-assistant'
                    } ${message.isError ? 'admin-chatbot-message-error' : ''}`}
                  >
                    <p>{message.text}</p>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="admin-chatbot-message admin-chatbot-message-assistant">
                    <p>Thinking...</p>
                  </div>
                )}
              </div>

              <form
                className="admin-chatbot-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  sendChatQuestion(chatQuestion)
                }}
              >
                <input
                  type="text"
                  className="admin-chatbot-input input"
                  value={chatQuestion}
                  onChange={(event) => setChatQuestion(event.target.value)}
                  placeholder="Ask: how many users, which day has most requests, count on a date..."
                />
                <button type="submit" className="admin-chatbot-send btn btn-primary hover-lift" disabled={isChatLoading || !chatQuestion.trim()}>
                  Ask AI
                </button>
              </form>

              {chatContextMeta && (
                <p className="admin-chatbot-context">
                  Data Snapshot: Users {chatContextMeta.totalUsers} (Students {chatContextMeta.studentCount}, RC {chatContextMeta.rcCount}) |
                  Requests {chatContextMeta.totalRequests} (Approved {chatContextMeta.approvedCount}, Pending {chatContextMeta.pendingCount}, Rejected {chatContextMeta.rejectedCount}) |
                  Dates {chatContextMeta.dateWindow} |
                  Updated {new Date(chatContextMeta.generatedAt).toLocaleString()}
                </p>
              )}
            </div>
          </section>
        )}

        {!isAnalyticsView && (
        <section
          className={`admin-users-section ${activeView === 'manage' ? 'admin-users-section-manage' : 'admin-users-section-view'}`}
          aria-label="Registered users"
        >
          <div className="admin-users-header">
            <div className="admin-users-title-block">
              <h2>{sectionTitle}</h2>
              <p className="admin-users-subtitle">{sectionSubtitle}</p>
            </div>

            <div className="admin-users-actions">
              <span className="admin-users-count-pill">{filteredUsers.length} shown</span>
              <span className={`admin-users-mode-pill ${activeView === 'manage' ? 'admin-users-mode-pill-manage' : ''}`}>
                {activeView === 'manage' ? 'Status Controls' : 'Read Only'}
              </span>
            <button type="button" className="admin-refresh-button btn btn-outline hover-lift" onClick={fetchUsers}>
              Refresh
            </button>
            </div>
          </div>

          {activeView === 'view' && (
            <div className="admin-view-tools">
              <div className="admin-filter-group">
                <p className="admin-filter-title">User Type</p>
                <div className="admin-user-type-switch" role="tablist" aria-label="Filter users by type">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewUserType === 'All'}
                    className={`admin-user-type-btn btn btn-outline hover-lift ${viewUserType === 'All' ? 'admin-user-type-btn-active' : ''}`}
                    onClick={() => setViewUserType('All')}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewUserType === 'Student'}
                    className={`admin-user-type-btn btn btn-outline hover-lift ${viewUserType === 'Student' ? 'admin-user-type-btn-active' : ''}`}
                    onClick={() => setViewUserType('Student')}
                  >
                    Students
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewUserType === 'RC'}
                    className={`admin-user-type-btn btn btn-outline hover-lift ${viewUserType === 'RC' ? 'admin-user-type-btn-active' : ''}`}
                    onClick={() => setViewUserType('RC')}
                  >
                    RC Users
                  </button>
                </div>
              </div>

              <div className="admin-filter-group">
                <p className="admin-filter-title">Status</p>
                <div className="admin-user-type-switch" role="tablist" aria-label="Filter users by status">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === 'all'}
                    className={`admin-user-type-btn btn btn-outline hover-lift ${statusFilter === 'all' ? 'admin-user-type-btn-active' : ''}`}
                    onClick={() => setStatusFilter('all')}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === 'active'}
                    className={`admin-user-type-btn btn btn-outline hover-lift ${statusFilter === 'active' ? 'admin-user-type-btn-active' : ''}`}
                    onClick={() => setStatusFilter('active')}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === 'inactive'}
                    className={`admin-user-type-btn btn btn-outline hover-lift ${statusFilter === 'inactive' ? 'admin-user-type-btn-active' : ''}`}
                    onClick={() => setStatusFilter('inactive')}
                  >
                    Inactive
                  </button>
                </div>
              </div>

              <div className="admin-search-wrap">
                <input
                  type="text"
                  className="admin-search-input input"
                  placeholder="Search by username, email, mobile or type"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  aria-label="Search users"
                />
              </div>
            </div>
          )}

          {activeView === 'manage' && (
            <div className="admin-view-tools">
              <div className="admin-filter-group">
                <p className="admin-filter-title">User Type</p>
                <div className="admin-user-type-switch" role="tablist" aria-label="Filter users by type">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewUserType === 'All'}
                    className={`admin-user-type-btn btn btn-outline hover-lift ${viewUserType === 'All' ? 'admin-user-type-btn-active' : ''}`}
                    onClick={() => setViewUserType('All')}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewUserType === 'Student'}
                    className={`admin-user-type-btn btn btn-outline hover-lift ${viewUserType === 'Student' ? 'admin-user-type-btn-active' : ''}`}
                    onClick={() => setViewUserType('Student')}
                  >
                    Students
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewUserType === 'RC'}
                    className={`admin-user-type-btn btn btn-outline hover-lift ${viewUserType === 'RC' ? 'admin-user-type-btn-active' : ''}`}
                    onClick={() => setViewUserType('RC')}
                  >
                    RC Users
                  </button>
                </div>
              </div>

              <div className="admin-filter-group">
                <p className="admin-filter-title">Status</p>
                <div className="admin-user-type-switch" role="tablist" aria-label="Filter users by status">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === 'all'}
                    className={`admin-user-type-btn btn btn-outline hover-lift ${statusFilter === 'all' ? 'admin-user-type-btn-active' : ''}`}
                    onClick={() => setStatusFilter('all')}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === 'active'}
                    className={`admin-user-type-btn btn btn-outline hover-lift ${statusFilter === 'active' ? 'admin-user-type-btn-active' : ''}`}
                    onClick={() => setStatusFilter('active')}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === 'inactive'}
                    className={`admin-user-type-btn btn btn-outline hover-lift ${statusFilter === 'inactive' ? 'admin-user-type-btn-active' : ''}`}
                    onClick={() => setStatusFilter('inactive')}
                  >
                    Inactive
                  </button>
                </div>
              </div>

              <div className="admin-search-wrap admin-search-wrap-manage">
                <input
                  type="text"
                  className="admin-search-input input"
                  placeholder="Search users by username, email, mobile or type"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  aria-label="Search users"
                />
              </div>
            </div>
          )}

          {isLoading && <p className="admin-empty-text">Loading users...</p>}
          {!isLoading && errorMessage && <p className="admin-error-text">{errorMessage}</p>}
          {!isLoading && !errorMessage && filteredUsers.length === 0 && (
            <p className="admin-empty-text">
              {normalizedSearch ? 'No users match your search.' : 'No users found.'}
            </p>
          )}

          {!isLoading && !errorMessage && filteredUsers.length > 0 && (
            <div className="bg-white rounded-xl shadow-md border p-5 mt-6 overflow-x-auto w-full">
              <table className="w-full text-sm border-collapse admin-user-table">
                <thead>
                  <tr>
                    <th className="text-left text-gray-600 border-b pb-2">Name</th>
                    <th className="text-left text-gray-600 border-b pb-2">Email</th>
                    <th className="text-left text-gray-600 border-b pb-2">Role</th>
                    <th className="text-left text-gray-600 border-b pb-2">Status</th>
                    <th className="text-left text-gray-600 border-b pb-2">Last Login</th>
                    {activeView === 'manage' && <th className="text-left text-gray-600 border-b pb-2">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user._id}
                      className={`${activeView === 'manage' ? 'admin-user-row-manage' : 'admin-user-row'} hover:bg-gray-50 transition`}
                    >
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>
                        <span
                          className={`admin-user-type-pill ${
                            user.userType === 'Student' ? 'admin-user-type-pill-student' : 'admin-user-type-pill-rc'
                          }`}
                        >
                          {user.userType}
                        </span>
                      </td>
                      <td>
                        <span
                          className={
                            user.status === 'active'
                              ? 'bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium'
                              : 'bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium'
                          }
                        >
                          {user.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div>
                          <p>{formatLastLogin(user.lastLogin)}</p>
                          {getDaysSince(user.lastLogin) !== null && getDaysSince(user.lastLogin) > INACTIVITY_DAYS && (
                            <p className="text-xs text-orange-500 italic">Inactive for more than 60 days</p>
                          )}
                        </div>
                      </td>
                      {activeView === 'manage' && (
                        <td>
                          {user.status === 'active' ? (
                            <button
                              type="button"
                              className="btn btn-outline hover-lift bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm"
                              onClick={() => handleUpdateUserStatus(user._id, 'inactive')}
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-outline hover-lift bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm"
                              onClick={() => handleUpdateUserStatus(user._id, 'active')}
                            >
                              Activate
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        )}
      </section>
    </main>
  )
}

export default AdminHome
