import { useState, useEffect, useMemo } from 'react'
import { getAuthToken } from '../utils/authToken'
import { useToast } from './Toast'
import {
  FaBullhorn,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaThumbtack,
  FaEye,
  FaSearch,
  FaFilter,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaBuilding,
  FaWrench,
  FaInfoCircle,
  FaCheck,
  FaTimes,
  FaLayerGroup,
} from 'react-icons/fa'

const ANNOUNCEMENT_TYPES = [
  'General',
  'Hostel Allocation',
  'Important',
  'Deadline',
  'Maintenance',
  'Event',
  'Academic',
  'Other',
]

const TYPE_ICONS = {
  'General': <FaInfoCircle className="text-teal-600" />,
  'Hostel Allocation': <FaBuilding className="text-emerald-600" />,
  'Important': <FaExclamationTriangle className="text-amber-500" />,
  'Deadline': <FaCalendarAlt className="text-rose-500" />,
  'Maintenance': <FaWrench className="text-orange-500" />,
  'Event': <FaBullhorn className="text-purple-500" />,
  'Academic': <FaLayerGroup className="text-indigo-500" />,
  'Other': <FaInfoCircle className="text-slate-500" />,
}

const TYPE_BADGE_CLASSES = {
  'General': 'bg-teal-50 text-teal-700 border-teal-200',
  'Hostel Allocation': 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
  'Important': 'bg-amber-50 text-amber-800 border-amber-200',
  'Deadline': 'bg-rose-50 text-rose-800 border-rose-200',
  'Maintenance': 'bg-orange-50 text-orange-800 border-orange-200',
  'Event': 'bg-purple-50 text-purple-800 border-purple-200',
  'Academic': 'bg-indigo-50 text-indigo-800 border-indigo-200',
  'Other': 'bg-gray-50 text-gray-700 border-gray-200',
}

const PRIORITY_BADGE_CLASSES = {
  'Normal': 'bg-slate-100 text-slate-700 border-slate-200',
  'Important': 'bg-amber-100 text-amber-800 border-amber-300 font-medium',
  'Urgent': 'bg-red-100 text-red-800 border-red-300 font-bold animate-pulse',
}

export default function BroadcastManagement() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('list') // 'list', 'create'
  const [broadcasts, setBroadcasts] = useState([])
  const [summary, setSummary] = useState({
    total: 0,
    published: 0,
    scheduled: 0,
    expired: 0,
    drafts: 0,
    unpublished: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'PUBLISHED', 'SCHEDULED', 'DRAFT', 'EXPIRED'
  const [typeFilter, setTypeFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Form State
  const [editingId, setEditingId] = useState(null)
  const [title, setTitle] = useState('')
  const [summaryText, setSummaryText] = useState('')
  const [content, setContent] = useState('')
  const [type, setType] = useState('General')
  const [priority, setPriority] = useState('Normal')
  const [publishMode, setPublishMode] = useState('now') // 'now', 'schedule', 'draft'
  const [publishDate, setPublishDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [publishTime, setPublishTime] = useState('10:00')
  const [hasExpiry, setHasExpiry] = useState(false)
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  })
  const [expiryTime, setExpiryTime] = useState('18:00')
  const [isPinned, setIsPinned] = useState(false)

  // Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewItem, setPreviewItem] = useState(null)

  // Delete Confirm Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)

  const fetchBroadcasts = async () => {
    setIsLoading(true)
    try {
      const token = getAuthToken()
      const queryParams = new URLSearchParams()
      if (statusFilter !== 'all') queryParams.append('status', statusFilter)
      if (typeFilter !== 'all') queryParams.append('type', typeFilter)
      if (searchQuery.trim()) queryParams.append('search', searchQuery.trim())

      const res = await fetch(`/api/broadcasts/admin?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setBroadcasts(Array.isArray(data.broadcasts) ? data.broadcasts : [])
        if (data.summary) {
          setSummary(data.summary)
        }
      } else {
        toast.error(data.message || 'Failed to load broadcasts.')
      }
    } catch {
      toast.error('Unable to connect to server.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBroadcasts()
  }, [statusFilter, typeFilter, searchQuery])

  const resetForm = () => {
    setEditingId(null)
    setTitle('')
    setSummaryText('')
    setContent('')
    setType('General')
    setPriority('Normal')
    setPublishMode('now')
    setPublishDate(new Date().toISOString().slice(0, 10))
    setPublishTime('10:00')
    setHasExpiry(false)
    const d = new Date()
    d.setDate(d.getDate() + 7)
    setExpiryDate(d.toISOString().slice(0, 10))
    setExpiryTime('18:00')
    setIsPinned(false)
  }

  const handleOpenCreate = () => {
    resetForm()
    setActiveTab('create')
  }

  const handleOpenEdit = (item) => {
    setEditingId(item._id)
    setTitle(item.title)
    setSummaryText(item.summary)
    setContent(item.content || '')
    setType(item.type)
    setPriority(item.priority)
    setIsPinned(Boolean(item.isPinned))

    if (item.status === 'DRAFT') {
      setPublishMode('draft')
    } else if (item.status === 'SCHEDULED') {
      setPublishMode('schedule')
    } else {
      setPublishMode('now')
    }

    if (item.publishAt) {
      const p = new Date(item.publishAt)
      if (!Number.isNaN(p.getTime())) {
        setPublishDate(p.toISOString().slice(0, 10))
        setPublishTime(p.toTimeString().slice(0, 5))
      }
    }

    if (item.expiresAt) {
      setHasExpiry(true)
      const e = new Date(item.expiresAt)
      if (!Number.isNaN(e.getTime())) {
        setExpiryDate(e.toISOString().slice(0, 10))
        setExpiryTime(e.toTimeString().slice(0, 5))
      }
    } else {
      setHasExpiry(false)
    }

    setActiveTab('create')
  }

  // Pre-fill helper for Hostel Allocation announcements
  const handlePrefillHostelAllocation = () => {
    setTitle('Hostel Room Allocation is Now Open')
    setSummaryText('Students can now log in to HAVENTRA and choose their preferred room slots.')
    setContent(
      'The official hostel room allocation process for the upcoming academic session has begun. Please log in to your HAVENTRA student account, navigate to Hostel Allocation, review available blocks/floors, and select your slot before the deadline.'
    )
    setType('Hostel Allocation')
    setPriority('Important')
    setIsPinned(true)
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()

    const trimmedTitle = title.trim()
    const trimmedSummary = summaryText.trim()
    const trimmedContent = content.trim()

    if (!trimmedTitle) {
      toast.warning('Title is required.')
      return
    }
    if (!trimmedSummary) {
      toast.warning('Short summary is required.')
      return
    }

    let publishIso = null
    if (publishMode === 'schedule') {
      if (!publishDate || !publishTime) {
        toast.warning('Please specify both schedule date and time.')
        return
      }
      publishIso = `${publishDate}T${publishTime}`
      if (Number.isNaN(new Date(publishIso).getTime())) {
        toast.warning('Invalid schedule publish date or time.')
        return
      }
    }

    let expiresIso = null
    if (hasExpiry) {
      if (!expiryDate || !expiryTime) {
        toast.warning('Please specify both expiry date and time.')
        return
      }
      expiresIso = `${expiryDate}T${expiryTime}`
      const expDate = new Date(expiresIso)
      if (Number.isNaN(expDate.getTime())) {
        toast.warning('Invalid expiry date or time.')
        return
      }

      const effectivePublishDate =
        publishMode === 'schedule' && publishIso ? new Date(publishIso) : new Date()

      if (expDate <= effectivePublishDate) {
        toast.warning('Expiry date/time must be strictly after the publication date/time.')
        return
      }
    }

    const payload = {
      title: trimmedTitle,
      summary: trimmedSummary,
      content: trimmedContent,
      type,
      priority,
      publishMode,
      publishAt: publishIso,
      expiresAt: expiresIso,
      isPinned,
    }

    setIsSubmitting(true)
    try {
      const token = getAuthToken()
      const url = editingId ? `/api/broadcasts/admin/${editingId}` : '/api/broadcasts/admin'
      const method = editingId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || (editingId ? 'Broadcast updated!' : 'Broadcast created!'))
        resetForm()
        setActiveTab('list')
        fetchBroadcasts()
      } else {
        toast.error(data.message || 'Failed to save broadcast.')
      }
    } catch {
      toast.error('Unable to connect to server.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePublish = async (id) => {
    try {
      const token = getAuthToken()
      const res = await fetch(`/api/broadcasts/admin/${id}/publish`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Broadcast published!')
        fetchBroadcasts()
      } else {
        toast.error(data.message || 'Failed to publish.')
      }
    } catch {
      toast.error('Unable to connect to server.')
    }
  }

  const handleUnpublish = async (id) => {
    try {
      const token = getAuthToken()
      const res = await fetch(`/api/broadcasts/admin/${id}/unpublish`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Broadcast unpublished.')
        fetchBroadcasts()
      } else {
        toast.error(data.message || 'Failed to unpublish.')
      }
    } catch {
      toast.error('Unable to connect to server.')
    }
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return
    try {
      const token = getAuthToken()
      const res = await fetch(`/api/broadcasts/admin/${itemToDelete._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Broadcast deleted.')
        setShowDeleteModal(false)
        setItemToDelete(null)
        fetchBroadcasts()
      } else {
        toast.error(data.message || 'Failed to delete.')
      }
    } catch {
      toast.error('Unable to connect to server.')
    }
  }

  const formatIST = (dateVal) => {
    if (!dateVal) return '-'
    const d = new Date(dateVal)
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
    <div className="broadcast-management-wrap">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaBullhorn className="text-teal-600" /> Public Broadcast Announcements
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Publish non-confidential announcements to the HAVENTRA Home landing page before login.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'list' ? (
            <button
              type="button"
              className="btn btn-primary flex items-center gap-2 px-4 py-2 text-sm shadow-sm hover-lift"
              onClick={handleOpenCreate}
            >
              <FaPlus /> Create Announcement
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-outline flex items-center gap-2 px-4 py-2 text-sm"
              onClick={() => {
                resetForm()
                setActiveTab('list')
              }}
            >
              Back to List
            </button>
          )}
        </div>
      </div>

      {/* SUMMARY STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <div
          className={`p-4 rounded-xl border bg-white shadow-sm cursor-pointer transition hover:border-teal-400 ${
            statusFilter === 'all' ? 'ring-2 ring-teal-500 border-teal-500' : 'border-gray-200'
          }`}
          onClick={() => setStatusFilter('all')}
        >
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Announcements</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{summary.total}</p>
        </div>

        <div
          className={`p-4 rounded-xl border bg-white shadow-sm cursor-pointer transition hover:border-green-400 ${
            statusFilter === 'PUBLISHED' ? 'ring-2 ring-green-500 border-green-500' : 'border-gray-200'
          }`}
          onClick={() => setStatusFilter('PUBLISHED')}
        >
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Published
          </p>
          <p className="text-2xl font-bold text-green-700 mt-1">{summary.published}</p>
        </div>

        <div
          className={`p-4 rounded-xl border bg-white shadow-sm cursor-pointer transition hover:border-blue-400 ${
            statusFilter === 'SCHEDULED' ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'
          }`}
          onClick={() => setStatusFilter('SCHEDULED')}
        >
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Scheduled
          </p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{summary.scheduled}</p>
        </div>

        <div
          className={`p-4 rounded-xl border bg-white shadow-sm cursor-pointer transition hover:border-amber-400 ${
            statusFilter === 'DRAFT' ? 'ring-2 ring-amber-500 border-amber-500' : 'border-gray-200'
          }`}
          onClick={() => setStatusFilter('DRAFT')}
        >
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Drafts
          </p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{summary.drafts}</p>
        </div>

        <div
          className={`p-4 rounded-xl border bg-white shadow-sm cursor-pointer transition hover:border-rose-400 ${
            statusFilter === 'EXPIRED' ? 'ring-2 ring-rose-500 border-rose-500' : 'border-gray-200'
          }`}
          onClick={() => setStatusFilter('EXPIRED')}
        >
          <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Expired
          </p>
          <p className="text-2xl font-bold text-rose-700 mt-1">{summary.expired}</p>
        </div>
      </div>

      {/* CREATE / EDIT FORM */}
      {activeTab === 'create' && (
        <div className="saas-card bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6 fade-in">
          <div className="flex items-center justify-between border-b pb-4 mb-5">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              {editingId ? <FaEdit className="text-teal-600" /> : <FaPlus className="text-teal-600" />}
              {editingId ? 'Edit Announcement' : 'Create New Announcement'}
            </h3>
            <button
              type="button"
              className="text-xs text-teal-700 hover:text-teal-800 font-semibold underline"
              onClick={handlePrefillHostelAllocation}
            >
              + Template: Hostel Allocation Announcement
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Announcement Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input w-full"
                placeholder="e.g. Hostel Allocation is Now Open"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
              />
            </div>

            {/* Short Summary */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Short Summary <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="input w-full"
                placeholder="Brief sentence visible on cards, e.g. Students can now select room slots in HAVENTRA."
                value={summaryText}
                onChange={(e) => setSummaryText(e.target.value)}
                maxLength={500}
                required
              />
            </div>

            {/* Full Content */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Full Content <span className="text-xs text-gray-400 font-normal">(Optional detailed announcement)</span>
              </label>
              <textarea
                className="input w-full"
                rows={4}
                placeholder="Detailed instructions or additional guidelines for students..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            {/* Type, Priority, Pinned Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Announcement Type</label>
                <select className="input w-full" value={type} onChange={(e) => setType(e.target.value)}>
                  {ANNOUNCEMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
                <select className="input w-full" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="Normal">Normal</option>
                  <option value="Important">Important</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Highlight</label>
                <label className="flex items-center gap-2 mt-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                  />
                  <span className="text-sm font-medium text-gray-800 flex items-center gap-1">
                    <FaThumbtack className={isPinned ? 'text-amber-500' : 'text-gray-400'} /> Pin to Top
                  </span>
                </label>
              </div>
            </div>

            {/* Publish Mode */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <label className="block text-sm font-semibold text-gray-800 mb-2">Publishing Mode</label>
              <div className="flex flex-wrap gap-4 mb-3">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="publishMode"
                    value="now"
                    checked={publishMode === 'now'}
                    onChange={() => setPublishMode('now')}
                  />
                  Publish Immediately
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="publishMode"
                    value="schedule"
                    checked={publishMode === 'schedule'}
                    onChange={() => setPublishMode('schedule')}
                  />
                  Schedule for Later
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="publishMode"
                    value="draft"
                    checked={publishMode === 'draft'}
                    onChange={() => setPublishMode('draft')}
                  />
                  Save as Draft
                </label>
              </div>

              {publishMode === 'schedule' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Publish Date</label>
                    <input
                      type="date"
                      className="input w-full text-sm"
                      value={publishDate}
                      onChange={(e) => setPublishDate(e.target.value)}
                      required={publishMode === 'schedule'}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Publish Time</label>
                    <input
                      type="time"
                      className="input w-full text-sm"
                      value={publishTime}
                      onChange={(e) => setPublishTime(e.target.value)}
                      required={publishMode === 'schedule'}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Expiry Settings */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    checked={hasExpiry}
                    onChange={(e) => setHasExpiry(e.target.checked)}
                  />
                  Set Expiry Date &amp; Time
                </label>
                <span className="text-xs text-gray-500">Automatically hides announcement after this date</span>
              </div>

              {hasExpiry && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      className="input w-full text-sm"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      required={hasExpiry}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Expiry Time</label>
                    <input
                      type="time"
                      className="input w-full text-sm"
                      value={expiryTime}
                      onChange={(e) => setExpiryTime(e.target.value)}
                      required={hasExpiry}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                className="btn btn-outline text-sm px-4 py-2"
                onClick={() => {
                  setPreviewItem({
                    title: title || 'Announcement Title Preview',
                    summary: summaryText || 'Short announcement summary will appear here.',
                    content,
                    type,
                    priority,
                    isPinned,
                    publishAt: publishMode === 'schedule' ? `${publishDate}T${publishTime}` : new Date().toISOString(),
                    expiresAt: hasExpiry ? `${expiryDate}T${expiryTime}` : null,
                  })
                  setShowPreviewModal(true)
                }}
              >
                <FaEye className="inline mr-1.5" /> Preview on Home Card
              </button>

              <button
                type="button"
                className="btn btn-outline text-sm px-4 py-2"
                onClick={() => {
                  resetForm()
                  setActiveTab('list')
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-primary text-sm px-6 py-2 hover-lift font-bold"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Saving...'
                  : editingId
                  ? 'Update Announcement'
                  : publishMode === 'draft'
                  ? 'Save as Draft'
                  : publishMode === 'schedule'
                  ? 'Schedule Announcement'
                  : 'Publish Announcement'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SEARCH AND FILTERS */}
      {activeTab === 'list' && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 bg-white p-3 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              <input
                type="text"
                placeholder="Search title or content..."
                className="input w-full pl-8 py-1.5 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="input py-1.5 text-xs text-gray-700"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              {ANNOUNCEMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              className="input py-1.5 text-xs text-gray-700"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="DRAFT">Draft</option>
              <option value="EXPIRED">Expired</option>
              <option value="UNPUBLISHED">Unpublished</option>
            </select>
          </div>

          <div className="text-xs text-gray-500 text-right">
            Showing <strong>{broadcasts.length}</strong> announcements
          </div>
        </div>
      )}

      {/* BROADCAST TABLE LIST */}
      {activeTab === 'list' && (
        <div className="saas-card bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {isLoading && <p className="p-8 text-center text-sm text-gray-500">Loading announcements...</p>}

          {!isLoading && broadcasts.length === 0 && (
            <div className="p-12 text-center">
              <FaBullhorn className="mx-auto text-4xl text-gray-300 mb-3" />
              <p className="text-base font-semibold text-gray-700">No broadcasts found</p>
              <p className="text-xs text-gray-400 mt-1">
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'No announcements match the selected filter criteria.'
                  : 'Start by creating a public broadcast announcement.'}
              </p>
              <button
                type="button"
                className="btn btn-primary text-xs px-4 py-2 mt-4 hover-lift"
                onClick={handleOpenCreate}
              >
                <FaPlus className="inline mr-1" /> Create First Announcement
              </button>
            </div>
          )}

          {!isLoading && broadcasts.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Title &amp; Summary</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Publish Time</th>
                    <th className="py-3 px-3">Expiry Time</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {broadcasts.map((item) => {
                    const isPub = item.status === 'PUBLISHED'
                    const isSched = item.status === 'SCHEDULED'
                    const isDraft = item.status === 'DRAFT'
                    const isExp = item.status === 'EXPIRED'
                    const isUnpub = item.status === 'UNPUBLISHED'

                    return (
                      <tr key={item._id} className="hover:bg-gray-50 transition">
                        {/* Title & Summary */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="flex items-center gap-1.5 font-bold text-gray-900">
                            {item.isPinned && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 border border-amber-300 font-bold"
                                title="Pinned to top"
                              >
                                <FaThumbtack className="text-[9px]" /> PINNED
                              </span>
                            )}
                            <span className="truncate">{item.title}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.summary}</p>
                        </td>

                        {/* Type */}
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border ${
                              TYPE_BADGE_CLASSES[item.type] || 'bg-gray-50 text-gray-700'
                            }`}
                          >
                            {TYPE_ICONS[item.type]}
                            {item.type}
                          </span>
                        </td>

                        {/* Priority */}
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[11px] border ${
                              PRIORITY_BADGE_CLASSES[item.priority] || 'bg-gray-50 text-gray-700'
                            }`}
                          >
                            {item.priority}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isPub
                                ? 'bg-green-100 text-green-700'
                                : isSched
                                ? 'bg-blue-100 text-blue-700'
                                : isDraft
                                ? 'bg-amber-100 text-amber-700'
                                : isExp
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            ● {item.status}
                          </span>
                        </td>

                        {/* Publish Time */}
                        <td className="py-3 px-3 text-xs text-gray-600 whitespace-nowrap">
                          {formatIST(item.publishAt)}
                        </td>

                        {/* Expiry Time */}
                        <td className="py-3 px-3 text-xs text-gray-600 whitespace-nowrap">
                          {item.expiresAt ? formatIST(item.expiresAt) : <span className="text-gray-400">None</span>}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                          {/* Preview */}
                          <button
                            type="button"
                            className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded"
                            title="Preview"
                            onClick={() => {
                              setPreviewItem(item)
                              setShowPreviewModal(true)
                            }}
                          >
                            <FaEye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                            onClick={() => handleOpenEdit(item)}
                          >
                            <FaEdit className="w-3.5 h-3.5" />
                          </button>

                          {/* Publish / Unpublish */}
                          {isPub ? (
                            <button
                              type="button"
                              className="px-2 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded"
                              title="Unpublish from Home page"
                              onClick={() => handleUnpublish(item._id)}
                            >
                              Unpublish
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="px-2 py-1 text-[11px] font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-300 rounded"
                              title="Publish immediately"
                              onClick={() => handlePublish(item._id)}
                            >
                              Publish
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            type="button"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                            onClick={() => {
                              setItemToDelete(item)
                              setShowDeleteModal(true)
                            }}
                          >
                            <FaTrash className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PREVIEW MODAL */}
      {showPreviewModal && previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative">
            <button
              type="button"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
              onClick={() => setShowPreviewModal(false)}
            >
              <FaTimes className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-teal-700 text-xs font-bold uppercase tracking-wider mb-2">
              <FaBullhorn /> Home Landing Page Preview
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-1">{previewItem.title}</h4>
            <p className="text-xs text-gray-500 mb-4">How this announcement appears to visitors on the public Home page</p>

            {/* Mocked Home Card */}
            <div className="p-4 rounded-xl border border-teal-200 bg-gradient-to-br from-teal-900/90 to-emerald-950 text-white shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-teal-100 backdrop-blur-sm">
                  {TYPE_ICONS[previewItem.type]} {previewItem.type}
                </span>

                <div className="flex items-center gap-1.5">
                  {previewItem.isPinned && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-amber-950">
                      <FaThumbtack className="text-[9px]" /> PINNED
                    </span>
                  )}
                  {previewItem.priority !== 'Normal' && (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        previewItem.priority === 'Urgent' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                      }`}
                    >
                      {previewItem.priority.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              <h5 className="text-base font-bold text-white mb-1.5">{previewItem.title}</h5>
              <p className="text-xs text-teal-100/90 leading-relaxed mb-3">{previewItem.summary}</p>

              {previewItem.content && (
                <div className="p-2.5 rounded-lg bg-white/10 text-xs text-teal-50 border border-white/10 mb-3 whitespace-pre-wrap">
                  {previewItem.content}
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-teal-200/80 pt-2 border-t border-white/10">
                <span>Published: {formatIST(previewItem.publishAt)}</span>
                {previewItem.expiresAt && <span>Ends: {formatIST(previewItem.expiresAt)}</span>}
              </div>
            </div>

            <div className="mt-5 text-right">
              <button
                type="button"
                className="btn btn-primary text-xs px-5 py-2 font-semibold"
                onClick={() => setShowPreviewModal(false)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h4 className="text-lg font-bold text-gray-900 mb-2">Delete Broadcast Announcement?</h4>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete &quot;<strong>{itemToDelete.title}</strong>&quot;? This action cannot be
              undone and will remove it immediately from public view.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="btn btn-outline text-xs px-4 py-2"
                onClick={() => {
                  setShowDeleteModal(false)
                  setItemToDelete(null)
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary bg-red-600 hover:bg-red-700 text-white text-xs px-4 py-2 font-bold"
                onClick={confirmDelete}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
