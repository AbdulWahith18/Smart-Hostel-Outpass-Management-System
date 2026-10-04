import { useState, useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'
import { getAuthToken } from '../utils/authToken'
import { useToast } from './Toast'
import {
  FaPlus,
  FaExclamationTriangle,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaRedo,
  FaTimes,
  FaSearch,
  FaFilter,
  FaBuilding,
  FaBed,
  FaUser,
  FaCommentDots,
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

const PRIORITIES = ['Low', 'Medium', 'High']

export default function StudentComplaintView({ currentUser }) {
  const toast = useToast()
  const [complaints, setComplaints] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeStatusTab, setActiveStatusTab] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')

  // Form State
  const [showFormModal, setShowFormModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [category, setCategory] = useState('Room Maintenance')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [block, setBlock] = useState('')
  const [floor, setFloor] = useState('')
  const [room, setRoom] = useState('')

  // Detail & Reopen Modal
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showReopenModal, setShowReopenModal] = useState(false)
  const [reopenNote, setReopenNote] = useState('')
  const [isReopening, setIsReopening] = useState(false)

  const fetchMyComplaints = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch('/api/complaints/my', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        setComplaints(Array.isArray(data.complaints) ? data.complaints : [])
      } else {
        toast.error(data.message || 'Failed to fetch complaints.')
      }
    } catch {
      toast.error('Unable to connect to server.')
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchMyComplaints()
  }, [fetchMyComplaints])

  useEffect(() => {
    if (!currentUser) return

    const socket = io()
    const isStudent = currentUser.userType === 'Student'
    const studentEmail = currentUser.email?.trim().toLowerCase()
    const rcUsername = currentUser.username || currentUser.name || currentUser.email

    if (isStudent && studentEmail) {
      socket.emit('student:join', { studentEmail })
    } else if (!isStudent && rcUsername) {
      socket.emit('rc:join', { rcUsername })
    }

    const handleStatusUpdated = (data) => {
      if (data && data.complaintId) {
        toast.info(`Complaint ${data.complaintId} status updated to '${data.status}' by ${data.updatedBy || 'Admin'}.`)
        fetchMyComplaints()
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
        toast.info(`New admin response added to Complaint ${data.complaintId}.`)
        fetchMyComplaints()
        setSelectedComplaint((prev) => {
          if (prev && (prev.complaintId === data.complaintId || prev._id === data.complaintId)) {
            return data.complaint ? data.complaint : { ...prev, adminResponse: data.adminResponse, adminRespondedBy: data.adminRespondedBy }
          }
          return prev
        })
      }
    }

    socket.on('complaint:status_updated', handleStatusUpdated)
    socket.on('complaint:response_added', handleResponseAdded)

    return () => {
      if (isStudent && studentEmail) {
        socket.emit('student:leave', { studentEmail })
      } else if (!isStudent && rcUsername) {
        socket.emit('rc:leave', { rcUsername })
      }
      socket.off('complaint:status_updated', handleStatusUpdated)
      socket.off('complaint:response_added', handleResponseAdded)
      socket.disconnect()
    }
  }, [currentUser, fetchMyComplaints, toast])

  const handleCreateComplaint = async (e) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.warning('Please enter a complaint title.')
      return
    }

    if (!description.trim()) {
      toast.warning('Please enter a complaint description.')
      return
    }

    setIsSubmitting(true)
    try {
      const token = getAuthToken()
      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          title: title.trim(),
          description: description.trim(),
          priority,
          block: block.trim(),
          floor: floor.trim(),
          room: room.trim(),
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error(data.message || 'Failed to submit complaint.')
        return
      }

      toast.success(data.message || 'Complaint submitted successfully.')
      setShowFormModal(false)
      setTitle('')
      setDescription('')
      setCategory('Room Maintenance')
      setPriority('Medium')
      setBlock('')
      setFloor('')
      setRoom('')
      fetchMyComplaints()
    } catch {
      toast.error('Unable to submit complaint. Please check your connection.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReopenComplaint = async (e) => {
    e.preventDefault()
    if (!selectedComplaint) return

    setIsReopening(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`/api/complaints/${selectedComplaint._id}/reopen`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note: reopenNote.trim() }),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error(data.message || 'Failed to reopen complaint.')
        return
      }

      toast.success(data.message || 'Complaint reopened successfully.')
      setShowReopenModal(false)
      setReopenNote('')
      setShowDetailModal(false)
      fetchMyComplaints()
    } catch {
      toast.error('Unable to connect to server.')
    } finally {
      setIsReopening(false)
    }
  }

  const filteredComplaints = complaints.filter((item) => {
    if (activeStatusTab !== 'ALL' && item.status !== activeStatusTab) return false
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchId = item.complaintId?.toLowerCase().includes(q)
      const matchTitle = item.title?.toLowerCase().includes(q)
      const matchDesc = item.description?.toLowerCase().includes(q)
      const matchRoom = item.room?.toLowerCase().includes(q)
      return matchId || matchTitle || matchDesc || matchRoom
    }

    return true
  })

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
    <section className="applied-pass-section" aria-label="Complaint Management">
      {/* HEADER & HELPER BOX */}
      <div className="student-pass-content space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-red-100 text-red-700 rounded-lg">
                <FaExclamationTriangle className="text-xl" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Hostel Complaints Portal</h2>
                <p className="text-xs text-gray-500">Report problems regarding food, room maintenance, hygiene, plumbing, electricals, and hostel facilities.</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary hover-lift flex items-center gap-2 font-bold px-4 py-2 text-sm bg-teal-700 hover:bg-teal-800 text-white rounded-lg shadow-sm"
            onClick={() => setShowFormModal(true)}
          >
            <FaPlus /> Raise Complaint
          </button>
        </div>

        {/* DISTINCTION CALLOUT BANNER */}
        <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-3 shadow-xs">
          <FaExclamationTriangle className="text-amber-600 text-base shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-950">Complaints vs. Queries</p>
            <p className="mt-0.5 text-amber-800">
              Use <strong>Complaints</strong> to formally report physical hostel maintenance problems, mess food issues, broken fixtures, or cleaning. For general questions to Admin, use the <strong>Queries</strong> tab.
            </p>
          </div>
        </div>

        {/* STATUS COUNTERS / FILTER TABS */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap gap-1.5" role="tablist">
            {['ALL', 'OPEN', 'IN PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED'].map((st) => {
              const count = st === 'ALL' ? complaints.length : complaints.filter((c) => c.status === st).length
              return (
                <button
                  key={st}
                  type="button"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    activeStatusTab === st
                      ? 'bg-teal-800 text-white border-teal-800 shadow-xs'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveStatusTab(st)}
                >
                  {st} ({count})
                </button>
              )
            })}
          </div>

          {/* SEARCH & CATEGORY FILTER */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-56">
              <FaSearch className="absolute left-3 top-2.5 text-gray-400 text-xs" />
              <input
                type="text"
                placeholder="Search complaint ID or keyword..."
                className="input text-xs pl-8 pr-3 py-1.5 w-full rounded-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="input text-xs py-1.5 px-2 rounded-lg bg-white"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* COMPLAINTS LIST */}
        {isLoading ? (
          <p className="admin-empty-text text-sm py-8 text-center text-gray-500">Loading your complaints...</p>
        ) : filteredComplaints.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <div className="inline-flex p-3 bg-gray-100 rounded-full text-gray-400">
              <FaExclamationTriangle className="text-2xl" />
            </div>
            <p className="text-sm font-semibold text-gray-700">No complaints found.</p>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {searchQuery || activeStatusTab !== 'ALL' || selectedCategory !== 'ALL'
                ? 'Try adjusting your search query or filter settings.'
                : 'Have a problem with food, lights, plumbing, or room maintenance? Click "+ Raise Complaint" above.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredComplaints.map((item) => (
              <div
                key={item._id}
                className="saas-card hover-lift p-5 rounded-xl border border-gray-200 bg-white shadow-xs flex flex-col justify-between space-y-3 transition-all"
              >
                <div>
                  {/* Top Bar: ID + Status + Priority */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {item.complaintId}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadgeClass(item.status)}`}>
                        ● {item.status}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getPriorityBadgeClass(item.priority)}`}>
                      {item.priority} Priority
                    </span>
                  </div>

                  {/* Title & Category */}
                  <h3 className="font-bold text-gray-900 text-base leading-snug">{item.title}</h3>
                  <p className="text-xs font-semibold text-teal-700 mt-0.5">{item.category}</p>

                  {/* Description Excerpt */}
                  <p className="text-xs text-gray-600 mt-2 line-clamp-2">{item.description}</p>

                  {/* Location Info */}
                  {(item.block !== '-' || item.room !== '-') && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border">
                      <FaBuilding className="text-teal-600" />
                      <span>
                        {item.block !== '-' ? item.block : ''} {item.floor !== '-' ? `• ${item.floor}` : ''} {item.room !== '-' ? `• Room ${item.room}` : ''}
                      </span>
                    </div>
                  )}

                  {/* ADMIN RESPONSE HIGHLIGHT BOX */}
                  {item.adminResponse && (
                    <div className="mt-3 p-3 rounded-lg bg-teal-50/90 border border-teal-200 text-xs space-y-1">
                      <p className="font-bold text-teal-900 flex items-center gap-1.5">
                        <FaCommentDots className="text-teal-700" /> Admin Resolution Note:
                      </p>
                      <p className="text-teal-950 font-medium">{item.adminResponse}</p>
                      <p className="text-[10px] text-teal-700 pt-0.5">By {item.adminRespondedBy} • {formatIST(item.adminRespondedAt)}</p>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions & Timeline Stepper */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>Submitted: {formatIST(item.createdAt)}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline text-xs px-2.5 py-1 text-teal-700 border-teal-300 font-semibold"
                      onClick={() => {
                        setSelectedComplaint(item)
                        setShowDetailModal(true)
                      }}
                    >
                      View Details
                    </button>
                    {(item.status === 'RESOLVED' || item.status === 'CLOSED') && (
                      <button
                        type="button"
                        className="btn btn-outline text-xs px-2.5 py-1 text-purple-700 border-purple-300 font-semibold flex items-center gap-1"
                        onClick={() => {
                          setSelectedComplaint(item)
                          setShowReopenModal(true)
                        }}
                      >
                        <FaRedo className="text-[10px]" /> Reopen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE COMPLAINT MODAL */}
      {showFormModal && (
        <div className="forgot-modal-overlay" role="dialog" aria-modal="true">
          <div className="forgot-card saas-card fade-in max-w-lg w-full p-6 rounded-2xl bg-white shadow-2xl border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FaExclamationTriangle className="text-amber-600" /> Raise New Complaint
              </h3>
              <button type="button" className="text-gray-400 hover:text-gray-600" onClick={() => setShowFormModal(false)}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleCreateComplaint} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Category</label>
                <select className="input text-xs w-full" value={category} onChange={(e) => setCategory(e.target.value)} required>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Complaint Title</label>
                <input
                  type="text"
                  className="input text-xs w-full"
                  placeholder="e.g. Fan not working properly in room"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Detailed Description</label>
                <textarea
                  className="input text-xs w-full"
                  rows={4}
                  placeholder="Provide complete details about the problem (e.g. stopping after 5 mins, making noise)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Priority</label>
                  <select className="input text-xs w-full" value={priority} onChange={(e) => setPriority(e.target.value)}>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p} Priority
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Room Number (Optional)</label>
                  <input
                    type="text"
                    className="input text-xs w-full"
                    placeholder="e.g. 101"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Block (Optional)</label>
                  <input
                    type="text"
                    className="input text-xs w-full"
                    placeholder="e.g. Block 1"
                    value={block}
                    onChange={(e) => setBlock(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Floor (Optional)</label>
                  <input
                    type="text"
                    className="input text-xs w-full"
                    placeholder="e.g. Floor 1"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" className="btn btn-outline text-xs px-4 py-2" onClick={() => setShowFormModal(false)} disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary hover-lift text-xs px-5 py-2 font-bold bg-teal-700 text-white" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL VIEW MODAL */}
      {showDetailModal && selectedComplaint && (
        <div className="forgot-modal-overlay" role="dialog" aria-modal="true">
          <div className="forgot-card saas-card fade-in max-w-xl w-full p-6 rounded-2xl bg-white shadow-2xl border max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {selectedComplaint.complaintId}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-1">{selectedComplaint.title}</h3>
              </div>
              <button type="button" className="text-gray-400 hover:text-gray-600" onClick={() => setShowDetailModal(false)}>
                <FaTimes className="text-xl" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-gray-800">
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border">
                <div>
                  <p className="text-gray-500">Category</p>
                  <p className="font-bold text-gray-900">{selectedComplaint.category}</p>
                </div>
                <div>
                  <p className="text-gray-500">Priority</p>
                  <p className="font-bold text-gray-900">{selectedComplaint.priority}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border mt-0.5 ${getStatusBadgeClass(selectedComplaint.status)}`}>
                    {selectedComplaint.status}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500">Submitted On</p>
                  <p className="font-semibold text-gray-800">{formatIST(selectedComplaint.createdAt)}</p>
                </div>
              </div>

              <div>
                <p className="font-semibold text-gray-700 mb-1">Description</p>
                <div className="p-3 bg-white border rounded-xl whitespace-pre-wrap leading-relaxed text-gray-800">
                  {selectedComplaint.description}
                </div>
              </div>

              {selectedComplaint.adminResponse && (
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-1">
                  <p className="font-bold text-teal-900 flex items-center gap-1.5">
                    <FaCommentDots className="text-teal-700" /> Admin Resolution Note:
                  </p>
                  <p className="text-teal-950 font-medium">{selectedComplaint.adminResponse}</p>
                  <p className="text-[10px] text-teal-700 pt-1">Responded by {selectedComplaint.adminRespondedBy} • {formatIST(selectedComplaint.adminRespondedAt)}</p>
                </div>
              )}

              {/* AUDIT TIMELINE */}
              <div>
                <p className="font-semibold text-gray-700 mb-2">Audit History Timeline</p>
                <div className="space-y-2 pl-2 border-l-2 border-teal-500">
                  {selectedComplaint.statusHistory?.map((h, idx) => (
                    <div key={idx} className="text-[11px] bg-gray-50 p-2 rounded border space-y-0.5">
                      <div className="flex justify-between font-bold text-gray-800">
                        <span>● Status: {h.status}</span>
                        <span className="text-[10px] text-gray-500">{formatIST(h.timestamp)}</span>
                      </div>
                      <p className="text-gray-600">By {h.changedBy} ({h.changedByRole})</p>
                      {h.note && <p className="text-gray-500 italic">&quot;{h.note}&quot;</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                {(selectedComplaint.status === 'RESOLVED' || selectedComplaint.status === 'CLOSED') && (
                  <button
                    type="button"
                    className="btn btn-outline text-purple-700 border-purple-300 font-semibold"
                    onClick={() => {
                      setShowDetailModal(false)
                      setShowReopenModal(true)
                    }}
                  >
                    Reopen Issue
                  </button>
                )}
                <button type="button" className="btn btn-primary" onClick={() => setShowDetailModal(false)}>
                  Close Window
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REOPEN MODAL */}
      {showReopenModal && selectedComplaint && (
        <div className="forgot-modal-overlay" role="dialog" aria-modal="true">
          <div className="forgot-card saas-card fade-in max-w-md w-full p-6 rounded-2xl bg-white shadow-2xl border" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-purple-800 mb-2 flex items-center gap-2">
              <FaRedo /> Reopen Complaint {selectedComplaint.complaintId}?
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              If the problem still persists after Admin marked it resolved, explain why below so the Admin team can re-inspect.
            </p>

            <form onSubmit={handleReopenComplaint} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Reason for Reopening</label>
                <textarea
                  className="input text-xs w-full"
                  rows={3}
                  placeholder="e.g. The fan worked for 1 day but started stopping again today..."
                  value={reopenNote}
                  onChange={(e) => setReopenNote(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button type="button" className="btn btn-outline text-xs px-3 py-1.5" onClick={() => setShowReopenModal(false)} disabled={isReopening}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary bg-purple-700 text-white hover:bg-purple-800 text-xs px-4 py-1.5 font-bold" disabled={isReopening}>
                  {isReopening ? 'Reopening...' : 'Confirm Reopen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
