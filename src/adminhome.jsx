import { useEffect, useMemo, useState } from 'react'
import './adminhome.css'

function AdminHome({ currentUser, activeView = 'view', onViewChange }) {
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [deletingUserId, setDeletingUserId] = useState('')
  const [viewUserType, setViewUserType] = useState('Student')
  const [searchTerm, setSearchTerm] = useState('')

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

  useEffect(() => {
    fetchUsers()
  }, [])

  const studentCount = useMemo(() => users.filter((user) => user.userType === 'Student').length, [users])
  const rcCount = useMemo(() => users.filter((user) => user.userType === 'RC').length, [users])
  const visibleUsers = useMemo(() => {
    if (activeView === 'manage') {
      return users
    }

    return users.filter((user) => user.userType === viewUserType)
  }, [activeView, users, viewUserType])

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

  const handleDeleteUser = async (userId, username) => {
    const shouldDelete = window.confirm(`Delete user ${username}? This action cannot be undone.`)

    if (!shouldDelete) {
      return
    }

    setDeletingUserId(userId)

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.message ?? 'Failed to delete user.')
        return
      }

      setUsers((currentUsers) => currentUsers.filter((user) => user._id !== userId))
      alert(data.message ?? 'User deleted successfully.')
    } catch {
      alert('Unable to reach server. Please try again.')
    } finally {
      setDeletingUserId('')
    }
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
            className={`admin-summary-card admin-summary-card-clickable ${
              activeView === 'view' ? 'admin-summary-card-active' : ''
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
            className={`admin-summary-card admin-summary-card-clickable ${
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
            className={`admin-summary-card admin-summary-card-clickable ${
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
                {activeView === 'manage' ? 'Delete Enabled' : 'Read Only'}
              </span>
            <button type="button" className="admin-refresh-button" onClick={fetchUsers}>
              Refresh
            </button>
            </div>
          </div>

          {activeView === 'view' && (
            <div className="admin-view-tools">
              <div className="admin-user-type-switch" role="tablist" aria-label="Filter users by type">
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewUserType === 'Student'}
                  className={`admin-user-type-btn ${viewUserType === 'Student' ? 'admin-user-type-btn-active' : ''}`}
                  onClick={() => setViewUserType('Student')}
                >
                  Students
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewUserType === 'RC'}
                  className={`admin-user-type-btn ${viewUserType === 'RC' ? 'admin-user-type-btn-active' : ''}`}
                  onClick={() => setViewUserType('RC')}
                >
                  RC Users
                </button>
              </div>

              <div className="admin-search-wrap">
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Search by username, email, mobile or type"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  aria-label="Search users"
                />
              </div>
            </div>
          )}

          {activeView === 'manage' && (
            <div className="admin-search-wrap admin-search-wrap-manage">
              <input
                type="text"
                className="admin-search-input"
                placeholder="Search users by username, email, mobile or type"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                aria-label="Search users"
              />
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
            <div className="admin-table-wrap">
              <table className="admin-user-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>User Type</th>
                    <th>Mobile No</th>
                    {activeView === 'manage' && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className={activeView === 'manage' ? 'admin-user-row-manage' : 'admin-user-row'}>
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
                      <td>{user.mobileNo}</td>
                      {activeView === 'manage' && (
                        <td>
                          <button
                            type="button"
                            className="admin-delete-button"
                            onClick={() => handleDeleteUser(user._id, user.username)}
                            disabled={deletingUserId === user._id}
                          >
                            {deletingUserId === user._id ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

export default AdminHome
