import { useState, useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'
import { getAuthToken } from '../utils/authToken'
import { useToast } from './Toast'
import {
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaTimes,
  FaSearch,
  FaFilter,
  FaBuilding,
  FaUser,
  FaCommentDots,
  FaHistory,
  FaCheck,
  FaFolderOpen,
  FaSpinner,
} from 'react-icons/fa'

const CATEGORIES = [
  'Food / Mess',
  'Cleaning / Hygiene',
  'Room Maintenance',
  'Fan / Electrical',
  'Plumbing / Water',
  'Furniture',
  'Washroom',
  'Wi-Fi / Network',
  'Hostel Infrastructure',
  'Security',
  'Common Area',
  'Other',
]

export default function AdminComplaintView({ currentUser }) {
  const toast = useToast()
  const [complaints, setComplaints] = useState([])
  const [summary, setSummary] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    reopened: 0,
    highPriority: 0,
  })
  const [isLoading, setIsLoading] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Detail Modal & Action Form
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [adminResponseNote, setAdminResponseNote] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isAddingResponse, setIsAddingResponse] = useState(false)

  const fetchAdminComplaints = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = getAuthToken()
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter)
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter)
      if (roleFilter !== 'ALL') params.append('role', roleFilter)
      if (searchQuery.trim()) params.append('search', searchQuery.trim())

      const response = await fetch(`/api/complaints/admin/all?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        setComplaints(Array.isArray(data.complaints) ? data.complaints : [])
        if (data.summary) {
          setSummary(data.summary)
        }
      } else {
        toast.error(data.message || 'Failed to fetch complaints list.')
      }
    } catch {
      toast.error('Unable to connect to server.')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, categoryFilter, priorityFilter, roleFilter, searchQuery, toast])

  useEffect(() => {
    fetchAdminComplaints()
  }, [fetchAdminComplaints])

  useEffect(() => {
    const socket = io()
    const adminEmail = currentUser?.email?.trim().toLowerCase() || 'admin@gmail.com'

    socket.emit('admin:join', { adminEmail })

    const handleComplaintCreated = (data) => {
      if (data && data.complaintId) {
        toast.info(`New complaint ${data.complaintId} submitted by ${data.complainantName || 'a user'}.`)
        fetchAdminComplaints()
      }
    }

    const handleStatusUpdated = (data) => {
      if (data && data.complaintId) {
        fetchAdminComplaints()
        setSelectedComplaint((prev) => {
          if (prev && (prev.complaintId === data.complaintId || prev._id === data.complaintId)) {
            return data.complaint ? data.complaint : { ...prev, status: data.status }
          }
          return prev
        })
      }
    }

    const handleResponseAdded = (data) => {
      if (data && data.complaintId) {
        fetchAdminComplaints()
        setSelectedComplaint((prev) => {
          if (prev && (prev.complaintId === data.complaintId || prev._id === data.complaintId)) {
            return data.complaint ? data.complaint : { ...prev, adminResponse: data.adminResponse, adminRespondedBy: data.adminRespondedBy }
          }
          return prev
        })
      }
    }

    socket.on('complaint:created', handleComplaintCreated)
    socket.on('complaint:status_updated', handleStatusUpdated)
    socket.on('complaint:response_added', handleResponseAdded)

    return () => {
      socket.emit('admin:leave', { adminEmail })
      socket.off('complaint:created', handleComplaintCreated)
      socket.off('complaint:status_updated', handleStatusUpdated)
      socket.off('complaint:response_added', handleResponseAdded)
      socket.disconnect()
    }
  }, [currentUser, fetchAdminComplaints, toast])

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedComplaint) return

    setIsUpdatingStatus(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`/api/complaints/admin/${selectedComplaint._id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          note: statusNote.trim() || `Status changed to ${newStatus}`,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error(data.message || 'Failed to update status.')
        return
      }

      toast.success(data.message || `Status updated to ${newStatus}`)
      setSelectedComplaint(data.complaint)
      setStatusNote('')
      fetchAdminComplaints()
    } catch {
      toast.error('Failed to update status. Check your connection.')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleSaveResponseNote = async (e) => {
    e.preventDefault()
    if (!selectedComplaint) return

    if (!adminResponseNote.trim()) {
      toast.warning('Please enter a response/resolution note.')
      return
    }

    setIsAddingResponse(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`/api/complaints/admin/${selectedComplaint._id}/response`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminResponse: adminResponseNote.trim() }),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error(data.message || 'Failed to add response.')
        return
      }

      toast.success(data.message || 'Admin response saved successfully.')
      setSelectedComplaint(data.complaint)
      setAdminResponseNote('')
      fetchAdminComplaints()
    } catch {
      toast.error('Failed to save response note.')
    } finally {
      setIsAddingResponse(false)
    }
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'OPEN':
        return 'bg-amber-100 text-amber-800 border-amber-300'
      case 'IN PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300'
      case 'CLOSED':
        return 'bg-gray-100 text-gray-700 border-gray-300'
      case 'REOPENED':
        return 'bg-purple-100 text-purple-800 border-purple-300'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getPriorityBadgeClass = (p) => {
    switch (p) {
      case 'High':
        return 'bg-red-100 text-red-700 font-bold border-red-200'
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 font-semibold border-yellow-200'
      case 'Low':
        return 'bg-slate-100 text-slate-700 border-slate-200'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const formatIST = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return '-'
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  return (
    <section className="admin-access-wrap space-y-6" aria-label="Admin Complaint Management">
      {/* TITLE BLOCK */}
      <div className="admin-users-header">
        <div className="admin-users-title-block">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FaExclamationTriangle className="text-amber-600" /> Complaint Management Dashboard
          </h2>
          <p className="admin-users-subtitle">Inspect, process, assign resolution notes, and track student &amp; RC reported hostel issues.</p>
        </div>
      </div>

      {/* SUMMARY STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="saas-card p-4 rounded-xl text-center bg-white shadow-xs border">
          <p className="text-xs text-gray-500 font-semibold">Total Complaints</p>
          <p className="text-xl font-extrabold text-gray-800 mt-1">{summary.total}</p>
        </div>

        <div className="saas-card p-4 rounded-xl text-center bg-amber-50/70 border border-amber-200">
          <p className="text-xs text-amber-800 font-semibold">Open (Pending)</p>
          <p className="text-xl font-extrabold text-amber-900 mt-1">{summary.open}</p>
        </div>

        <div className="saas-card p-4 rounded-xl text-center bg-blue-50/70 border border-blue-200">
          <p className="text-xs text-blue-800 font-semibold">In Progress</p>
          <p className="text-xl font-extrabold text-blue-900 mt-1">{summary.inProgress}</p>
        </div>

        <div className="saas-card p-4 rounded-xl text-center bg-emerald-50/70 border border-emerald-200">
          <p className="text-xs text-emerald-800 font-semibold">Resolved</p>
          <p className="text-xl font-extrabold text-emerald-900 mt-1">{summary.resolved}</p>
        </div>

        <div className="saas-card p-4 rounded-xl text-center bg-red-50/70 border border-red-200">
          <p className="text-xs text-red-800 font-semibold">High Priority</p>
          <p className="text-xl font-extrabold text-red-900 mt-1">{summary.highPriority}</p>
        </div>
      </div>

      {/* FILTERS & SEARCH TOOLBAR */}
      <div className="saas-card p-4 rounded-xl border border-gray-200 bg-white shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <FaSearch className="absolute left-3 top-3 text-gray-400 text-xs" />
            <input
              type="text"
              placeholder="Search Complaint ID, title, complainant, room..."
              className="input text-xs pl-8 pr-3 py-2 w-full rounded-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <select
              className="input text-xs py-1.5 px-2.5 rounded-lg bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="IN PROGRESS">IN PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
              <option value="REOPENED">REOPENED</option>
            </select>

            <select
              className="input text-xs py-1.5 px-2.5 rounded-lg bg-white"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              className="input text-xs py-1.5 px-2.5 rounded-lg bg-white"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="ALL">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              className="input text-xs py-1.5 px-2.5 rounded-lg bg-white"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="ALL">All Roles</option>
              <option value="Student">Student</option>
              <option value="RC">RC</option>
            </select>
          </div>
        </div>
      </div>

      {/* COMPLAINTS TABLE */}
      <div className="saas-card p-6 rounded-xl border border-gray-200 bg-white shadow-xs">
        {isLoading ? (
          <p className="admin-empty-text text-sm py-8 text-center">Loading complaints...</p>
        ) : complaints.length === 0 ? (
          <p className="admin-empty-text text-sm py-8 text-center">No complaints match search &amp; filter criteria.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse admin-user-table">
              <thead>
                <tr className="bg-gray-50 text-gray-700 border-b">
                  <th className="text-left p-3">Complaint ID</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Title</th>
                  <th className="text-left p-3">Raised By</th>
                  <th className="text-left p-3">Location</th>
                  <th className="text-left p-3">Priority</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Date</th>
                  <th className="text-right p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((item) => (
                  <tr key={item._id} className="border-b hover:bg-gray-50/80 transition">
                    <td className="p-3 font-mono font-bold text-teal-800">{item.complaintId}</td>
                    <td className="p-3 font-semibold text-gray-800">{item.category}</td>
                    <td className="p-3 font-medium text-gray-900 max-w-xs truncate">{item.title}</td>
                    <td className="p-3">
                      <p className="font-semibold text-gray-800">{item.complainantName}</p>
                      <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{item.complainantRole}</span>
                    </td>
                    <td className="p-3 text-gray-600">
                      {item.block !== '-' ? item.block : ''} {item.room !== '-' ? `Rm ${item.room}` : '-'}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] border ${getPriorityBadgeClass(item.priority)}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500">{formatIST(item.createdAt)}</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        className="btn btn-primary text-xs px-3 py-1 bg-teal-700 text-white hover:bg-teal-800 rounded font-semibold"
                        onClick={() => {
                          setSelectedComplaint(item)
                          setShowDetailModal(true)
                          setAdminResponseNote(item.adminResponse || '')
                        }}
                      >
                        Process
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL & ACTION DRAWER / MODAL */}
      {showDetailModal && selectedComplaint && (
        <div className="forgot-modal-overlay" role="dialog" aria-modal="true">
          <div
            className="forgot-card saas-card fade-in max-w-2xl w-full p-6 rounded-2xl bg-white shadow-2xl border max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
                  {selectedComplaint.complaintId}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-1">{selectedComplaint.title}</h3>
              </div>
              <button type="button" className="text-gray-400 hover:text-gray-600" onClick={() => setShowDetailModal(false)}>
                <FaTimes className="text-xl" />
              </button>
            </div>

            <div className="space-y-5 text-xs text-gray-800">
              {/* Complainant & Location Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 bg-gray-50 rounded-xl border">
                <div>
                  <p className="text-gray-500">Complainant</p>
                  <p className="font-bold text-gray-900">{selectedComplaint.complainantName}</p>
                  <p className="text-[10px] text-gray-500">{selectedComplaint.complainantEmail}</p>
                </div>

                <div>
                  <p className="text-gray-500">Role</p>
                  <p className="font-bold text-teal-800">{selectedComplaint.complainantRole}</p>
                </div>

                <div>
                  <p className="text-gray-500">Location</p>
                  <p className="font-bold text-gray-900">
                    {selectedComplaint.block !== '-' ? selectedComplaint.block : 'N/A'} {selectedComplaint.room !== '-' ? `• Rm ${selectedComplaint.room}` : ''}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Current Status</p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${getStatusBadgeClass(selectedComplaint.status)}`}>
                    {selectedComplaint.status}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="font-bold text-gray-800 mb-1">Issue Description</p>
                <div className="p-3.5 bg-white border rounded-xl leading-relaxed whitespace-pre-wrap text-gray-900 font-normal">
                  {selectedComplaint.description}
                </div>
              </div>

              {/* ADMIN ACTION PANEL */}
              <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl space-y-4">
                <h4 className="font-bold text-teal-900 text-sm flex items-center gap-1.5">
                  <FaCommentDots className="text-teal-700" /> Admin Action &amp; Status Control
                </h4>

                {/* Status Quick Buttons */}
                <div>
                  <p className="font-semibold text-gray-700 mb-1.5">Change Status to:</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`btn text-xs px-3 py-1.5 font-bold rounded ${selectedComplaint.status === 'IN PROGRESS' ? 'bg-blue-700 text-white' : 'btn-outline text-blue-700 border-blue-300'}`}
                      onClick={() => handleUpdateStatus('IN PROGRESS')}
                      disabled={isUpdatingStatus}
                    >
                      In Progress
                    </button>

                    <button
                      type="button"
                      className={`btn text-xs px-3 py-1.5 font-bold rounded ${selectedComplaint.status === 'RESOLVED' ? 'bg-emerald-700 text-white' : 'btn-outline text-emerald-700 border-emerald-300'}`}
                      onClick={() => handleUpdateStatus('RESOLVED')}
                      disabled={isUpdatingStatus}
                    >
                      Mark Resolved
                    </button>

                    <button
                      type="button"
                      className={`btn text-xs px-3 py-1.5 font-bold rounded ${selectedComplaint.status === 'CLOSED' ? 'bg-gray-700 text-white' : 'btn-outline text-gray-700 border-gray-300'}`}
                      onClick={() => handleUpdateStatus('CLOSED')}
                      disabled={isUpdatingStatus}
                    >
                      Close Complaint
                    </button>

                    <button
                      type="button"
                      className={`btn text-xs px-3 py-1.5 font-bold rounded ${selectedComplaint.status === 'REOPENED' ? 'bg-purple-700 text-white' : 'btn-outline text-purple-700 border-purple-300'}`}
                      onClick={() => handleUpdateStatus('REOPENED')}
                      disabled={isUpdatingStatus}
                    >
                      Reopen
                    </button>
                  </div>
                </div>

                {/* Optional Status Change Note */}
                <div>
                  <input
                    type="text"
                    className="input text-xs w-full"
                    placeholder="Optional status transition note for audit log..."
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                  />
                </div>

                {/* Response / Resolution Note Form */}
                <form onSubmit={handleSaveResponseNote} className="space-y-2 pt-2 border-t border-teal-200">
                  <label className="block font-semibold text-teal-950">Resolution Note for User</label>
                  <textarea
                    className="input text-xs w-full"
                    rows={3}
                    placeholder="Enter resolution notes (e.g. Electrician inspected fan and replaced capacitor)..."
                    value={adminResponseNote}
                    onChange={(e) => setAdminResponseNote(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="btn btn-primary bg-teal-800 hover:bg-teal-900 text-white text-xs px-4 py-1.5 font-bold rounded"
                      disabled={isAddingResponse}
                    >
                      {isAddingResponse ? 'Saving...' : 'Save Resolution Note'}
                    </button>
                  </div>
                </form>
              </div>

              {/* AUDIT LOG TIMELINE */}
              <div>
                <p className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                  <FaHistory className="text-teal-700" /> Audit Log &amp; Status Timeline
                </p>
                <div className="space-y-2 pl-3 border-l-2 border-teal-500">
                  {selectedComplaint.statusHistory?.map((h, idx) => (
                    <div key={idx} className="bg-gray-50 p-2.5 rounded-lg border text-[11px] space-y-0.5">
                      <div className="flex justify-between font-bold text-gray-900">
                        <span>● Status: {h.status}</span>
                        <span className="text-[10px] text-gray-500">{formatIST(h.timestamp)}</span>
                      </div>
                      <p className="text-gray-600">Action by {h.changedBy} ({h.changedByRole})</p>
                      {h.note && <p className="text-gray-500 italic">&quot;{h.note}&quot;</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t">
                <button type="button" className="btn btn-outline text-xs px-4 py-1.5" onClick={() => setShowDetailModal(false)}>
                  Close Window
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
