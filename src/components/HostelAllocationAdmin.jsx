import { useState, useEffect } from 'react'
import { getAuthToken } from '../utils/authToken'
import { useToast } from './Toast'
import { FaBuilding, FaBed, FaEye, FaTrash, FaPlus, FaTimes, FaFilePdf, FaFileCsv, FaClock, FaStopCircle, FaDownload } from 'react-icons/fa'

export default function HostelAllocationAdmin() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('list') // 'list', 'create', 'occupancy', 'bookings'
  const [allocations, setAllocations] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAllocationId, setSelectedAllocationId] = useState(null)
  const [occupancyData, setOccupancyData] = useState(null)
  const [bookingsData, setBookingsData] = useState([])
  const [bookingSearch, setBookingSearch] = useState('')

  // Form State
  const [name, setName] = useState('2026-27 Hostel Allocation')
  const [academicYear, setAcademicYear] = useState('2026-2027')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [startTimeVal, setStartTimeVal] = useState('10:00')
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    return d.toISOString().slice(0, 10)
  })
  const [endTimeVal, setEndTimeVal] = useState('18:00')

  const [blockCount, setBlockCount] = useState(3)
  const [blocksConfig, setBlocksConfig] = useState([
    { blockNumber: 1, floorCount: 4, roomsPerFloor: 10, studentsPerRoom: 4 },
    { blockNumber: 2, floorCount: 4, roomsPerFloor: 10, studentsPerRoom: 4 },
    { blockNumber: 3, floorCount: 4, roomsPerFloor: 10, studentsPerRoom: 4 },
  ])
  const [previewData, setPreviewData] = useState(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Report & Modal States
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [targetCloseId, setTargetCloseId] = useState(null)
  const [isClosing, setIsClosing] = useState(false)
  const [reportModalData, setReportModalData] = useState(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [isReportLoading, setIsReportLoading] = useState(false)
  const [nowTime, setNowTime] = useState(Date.now())

  // Ticker for live countdown
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchAllocations = async () => {
    setIsLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch('/api/hostel-allocations/admin/list', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        setAllocations(Array.isArray(data.allocations) ? data.allocations : [])
      } else {
        toast.error(data.message || 'Failed to fetch hostel allocations.')
      }
    } catch {
      toast.error('Unable to connect to server.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAllocations()
  }, [])

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

  const getTimeRemaining = (endTimeStr) => {
    if (!endTimeStr) return null
    const end = new Date(endTimeStr).getTime()
    const diff = end - nowTime
    if (diff <= 0) return 'Ended / Expired'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const secs = Math.floor((diff % (1000 * 60)) / 1000)
    return `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`
  }

  const handleBlockCountChange = (count) => {
    const num = Math.max(1, Math.min(10, Number(count) || 1))
    setBlockCount(num)
    setBlocksConfig((prev) => {
      const next = []
      for (let i = 1; i <= num; i++) {
        const existing = prev.find((b) => b.blockNumber === i)
        next.push(
          existing || {
            blockNumber: i,
            floorCount: 4,
            roomsPerFloor: 10,
            studentsPerRoom: 4,
          }
        )
      }
      return next
    })
    setPreviewData(null)
  }

  const handleBlockConfigChange = (index, field, value) => {
    const val = Math.max(1, Number(value) || 1)
    setBlocksConfig((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: val }
      return copy
    })
    setPreviewData(null)
  }

  const handlePreview = async () => {
    const startIso = `${startDate}T${startTimeVal}`
    const endIso = `${endDate}T${endTimeVal}`

    if (new Date(endIso) <= new Date(startIso)) {
      toast.warning('Scheduled End Time must be later than Start Time.')
      return
    }

    setIsPreviewLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch('/api/hostel-allocations/admin/preview', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          academicYear,
          startTime: startIso,
          endTime: endIso,
          blocks: blocksConfig,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error(data.message || 'Validation failed.')
        setPreviewData(null)
        return
      }

      setPreviewData(data)
      toast.success('Allocation structure preview generated successfully.')
    } catch {
      toast.error('Failed to generate preview.')
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const handleCreateAllocation = async (autoPublish = false) => {
    const startIso = `${startDate}T${startTimeVal}`
    const endIso = `${endDate}T${endTimeVal}`

    if (new Date(endIso) <= new Date(startIso)) {
      toast.warning('Scheduled End Time must be later than Start Time.')
      return
    }

    setIsSubmitting(true)
    try {
      const token = getAuthToken()
      const response = await fetch('/api/hostel-allocations/admin', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          academicYear,
          startTime: startIso,
          endTime: endIso,
          blocks: blocksConfig,
          autoPublish,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error(data.message || 'Failed to create allocation.')
        return
      }

      toast.success(data.message)
      setPreviewData(null)
      fetchAllocations()
      setActiveTab('list')
    } catch {
      toast.error('Unable to create hostel allocation.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePublish = async (id) => {
    try {
      const token = getAuthToken()
      const response = await fetch(`/api/hostel-allocations/admin/${id}/publish`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.message || 'Failed to publish allocation.')
        return
      }

      toast.success(data.message)
      fetchAllocations()
    } catch {
      toast.error('Failed to connect to server.')
    }
  }

  const handleConfirmClose = async () => {
    if (!targetCloseId) return
    setIsClosing(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`/api/hostel-allocations/admin/${targetCloseId}/close`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.message || 'Failed to end allocation.')
        return
      }

      toast.success(data.message || 'Hostel allocation ended. Final report generated.')
      setShowCloseModal(false)
      setTargetCloseId(null)
      fetchAllocations()
    } catch {
      toast.error('Failed to connect to server.')
    } finally {
      setIsClosing(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this draft allocation?')) return
    try {
      const token = getAuthToken()
      const response = await fetch(`/api/hostel-allocations/admin/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.message || 'Failed to delete allocation.')
        return
      }

      toast.success(data.message)
      fetchAllocations()
    } catch {
      toast.error('Failed to connect to server.')
    }
  }

  const viewReport = async (id) => {
    setSelectedAllocationId(id)
    setIsReportLoading(true)
    setShowReportModal(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`/api/hostel-allocations/admin/${id}/report`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok && data.reportSnapshot) {
        setReportModalData(data.reportSnapshot)
      } else {
        toast.error(data.message || 'Failed to fetch report data.')
        setShowReportModal(false)
      }
    } catch {
      toast.error('Unable to fetch report data.')
      setShowReportModal(false)
    } finally {
      setIsReportLoading(false)
    }
  }

  const downloadPDF = async (id, name = 'Hostel_Allocation') => {
    if (!id || id === 'null' || id === 'undefined') {
      toast.error('Invalid allocation ID for download.')
      return
    }
    try {
      const token = getAuthToken()
      const response = await fetch(`/api/hostel-allocations/admin/${id}/report/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        let errorMsg = 'Failed to generate PDF report.'
        try {
          const errData = await response.json()
          if (errData.message) errorMsg = errData.message
          console.error('PDF export server error:', response.status, errData)
        } catch {
          console.error('PDF export HTTP status:', response.status)
        }
        toast.error(errorMsg)
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const safeName = (name || 'Allocation').replace(/[^a-zA-Z0-9_-]/g, '_')
      link.download = `HAVENTRA_${safeName}_Report.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Allocation PDF report downloaded successfully.')
    } catch (err) {
      console.error('PDF export error:', err)
      toast.error('Report generation failed. Please try again.')
    }
  }

  const downloadCSV = async (id, name = 'Hostel_Allocation') => {
    if (!id || id === 'null' || id === 'undefined') {
      toast.error('Invalid allocation ID for CSV export.')
      return
    }
    try {
      const token = getAuthToken()
      const response = await fetch(`/api/hostel-allocations/admin/${id}/report/csv`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        let errorMsg = 'Failed to export CSV report.'
        try {
          const errData = await response.json()
          if (errData.message) errorMsg = errData.message
          console.error('CSV export server error:', response.status, errData)
        } catch {
          console.error('CSV export HTTP status:', response.status)
        }
        toast.error(errorMsg)
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const safeName = (name || 'Allocation').replace(/[^a-zA-Z0-9_-]/g, '_')
      link.download = `HAVENTRA_${safeName}_Report.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Allocation CSV export downloaded successfully.')
    } catch (err) {
      console.error('CSV export error:', err)
      toast.error('CSV export failed. Please try again.')
    }
  }

  const fetchOccupancy = async (id) => {
    setSelectedAllocationId(id)
    setActiveTab('occupancy')
    try {
      const token = getAuthToken()
      const response = await fetch(`/api/hostel-allocations/admin/${id}/occupancy`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        setOccupancyData(data)
      } else {
        toast.error(data.message || 'Failed to fetch occupancy stats.')
      }
    } catch {
      toast.error('Unable to load occupancy stats.')
    }
  }

  const fetchBookings = async (id) => {
    setSelectedAllocationId(id)
    setActiveTab('bookings')
    try {
      const token = getAuthToken()
      const response = await fetch(`/api/hostel-allocations/admin/${id}/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        setBookingsData(Array.isArray(data.bookings) ? data.bookings : [])
      } else {
        toast.error(data.message || 'Failed to fetch bookings list.')
      }
    } catch {
      toast.error('Unable to load bookings.')
    }
  }

  const filteredBookings = bookingsData.filter((b) => {
    if (!bookingSearch.trim()) return true
    const q = bookingSearch.toLowerCase()
    return (
      b.studentName?.toLowerCase().includes(q) ||
      b.studentEmail?.toLowerCase().includes(q) ||
      b.registerNo?.toLowerCase().includes(q) ||
      b.roomNumber?.toLowerCase().includes(q) ||
      b.slotCode?.toLowerCase().includes(q)
    )
  })

  return (
    <section className="admin-access-wrap" aria-label="Hostel Allocation System">
      <div className="admin-users-header">
        <div className="admin-users-title-block">
          <h2>Hostel Allocation Lifecycle & Report Management</h2>
          <p className="admin-users-subtitle">Configure scheduled allocations, trigger automatic/force closures, monitor IST countdowns, and export publication-grade reports.</p>
        </div>

        <div className="admin-users-actions">
          <button
            type="button"
            className={`btn ${activeTab === 'create' ? 'btn-primary' : 'btn-outline'} hover-lift`}
            onClick={() => setActiveTab('create')}
          >
            <FaPlus className="inline mr-1" /> Host New Allocation
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'list' ? 'btn-primary' : 'btn-outline'} hover-lift`}
            onClick={() => setActiveTab('list')}
          >
            All Allocations ({allocations.length})
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="admin-user-type-switch mb-6" role="tablist">
        <button
          type="button"
          className={`admin-user-type-btn btn btn-outline hover-lift ${activeTab === 'list' ? 'admin-user-type-btn-active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          Allocations List
        </button>
        <button
          type="button"
          className={`admin-user-type-btn btn btn-outline hover-lift ${activeTab === 'create' ? 'admin-user-type-btn-active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          Host Allocation
        </button>
        {selectedAllocationId && (
          <>
            <button
              type="button"
              className={`admin-user-type-btn btn btn-outline hover-lift ${activeTab === 'occupancy' ? 'admin-user-type-btn-active' : ''}`}
              onClick={() => fetchOccupancy(selectedAllocationId)}
            >
              Occupancy Stats
            </button>
            <button
              type="button"
              className={`admin-user-type-btn btn btn-outline hover-lift ${activeTab === 'bookings' ? 'admin-user-type-btn-active' : ''}`}
              onClick={() => fetchBookings(selectedAllocationId)}
            >
              Booked Students ({bookingsData.length})
            </button>
          </>
        )}
      </div>

      {/* ALLOCATIONS LIST TAB */}
      {activeTab === 'list' && (
        <div>
          {isLoading && <p className="admin-empty-text">Loading allocations...</p>}
          {!isLoading && allocations.length === 0 && (
            <p className="admin-empty-text">No hostel allocations hosted yet. Click &quot;Host New Allocation&quot; to get started.</p>
          )}

          {!isLoading && allocations.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {allocations.map((item) => {
                const isPublished = item.status === 'published'
                const isClosed = item.status === 'closed'
                const isDraft = item.status === 'draft'
                const countdown = isPublished ? getTimeRemaining(item.endTime) : null

                return (
                  <div key={item._id} className="saas-card hover-lift p-6 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isPublished
                              ? 'bg-green-100 text-green-700'
                              : isClosed
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          ● {isPublished ? 'ACTIVE' : isClosed ? 'ENDED / CLOSED' : 'DRAFT'}
                        </span>
                        <span className="text-xs text-gray-500">{item.academicYear}</span>
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 mb-2">{item.name}</h3>

                      {isPublished && (
                        <div className="p-3 mb-4 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-900">
                          <p className="font-bold flex items-center gap-1 text-teal-800">
                            <FaClock className="text-teal-600" /> Time Remaining: {countdown}
                          </p>
                          <p className="mt-1">Starts: {formatIST(item.startTime)}</p>
                          <p>Ends: {formatIST(item.endTime)}</p>
                        </div>
                      )}

                      {isClosed && (
                        <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900">
                          <p className="font-bold text-red-800">
                            Closure: {item.closureType === 'ADMIN_FORCED' ? 'Admin Forced Closure' : 'Automatic — Scheduled End Time'}
                          </p>
                          <p className="mt-1">Closed At: {formatIST(item.closedAt)}</p>
                          <p>Closed By: {item.closedBy || 'System'}</p>
                        </div>
                      )}

                      <div className="text-sm text-gray-600 space-y-1 mb-4">
                        <p><FaBuilding className="inline mr-1 text-teal-600" /> Blocks: <strong>{item.totalBlocks}</strong></p>
                        <p><FaBed className="inline mr-1 text-teal-600" /> Student Rooms: <strong>{item.totalRooms}</strong></p>
                        <p>Total Capacity: <strong>{item.totalCapacity}</strong></p>
                        <p>Occupied Slots: <span className="font-semibold text-teal-700">{item.occupiedCount} / {item.totalCapacity}</span></p>
                        <p>Available Slots: <span className="font-semibold text-green-600">{item.totalCapacity - item.occupiedCount}</span></p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                      {isDraft && (
                        <button type="button" className="btn btn-primary text-xs px-3 py-1.5" onClick={() => handlePublish(item._id)}>
                          Publish
                        </button>
                      )}
                      {isPublished && (
                        <button
                          type="button"
                          className="btn btn-outline text-xs px-3 py-1.5 text-red-600 border-red-300 font-bold"
                          onClick={() => {
                            setTargetCloseId(item._id)
                            setShowCloseModal(true)
                          }}
                        >
                          <FaStopCircle className="inline mr-1" /> END ALLOCATION
                        </button>
                      )}
                      {isClosed && (
                        <>
                          <button type="button" className="btn btn-primary text-xs px-3 py-1.5" onClick={() => viewReport(item._id)}>
                            <FaEye className="inline mr-1" /> View Report
                          </button>
                          <button type="button" className="btn btn-outline text-xs px-3 py-1.5 text-teal-700" onClick={() => downloadPDF(item._id, item.name)}>
                            <FaFilePdf className="inline mr-1 text-red-600" /> PDF
                          </button>
                          <button type="button" className="btn btn-outline text-xs px-3 py-1.5 text-green-700" onClick={() => downloadCSV(item._id, item.name)}>
                            <FaFileCsv className="inline mr-1 text-green-600" /> CSV
                          </button>
                        </>
                      )}
                      <button type="button" className="btn btn-outline text-xs px-3 py-1.5" onClick={() => fetchOccupancy(item._id)}>
                        Stats
                      </button>
                      {isDraft && (
                        <button type="button" className="btn btn-outline text-xs px-2.5 py-1.5 text-red-500" onClick={() => handleDelete(item._id)}>
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE ALLOCATION FORM TAB */}
      {activeTab === 'create' && (
        <div className="saas-card hover-lift p-6 rounded-xl border border-gray-200 bg-white shadow-md max-w-4xl">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Host New Hostel Allocation</h3>
          <p className="text-sm text-gray-600 mb-6">Specify allocation title, academic year, scheduled start & end times (IST), and block configurations.</p>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Allocation Title</label>
                <input
                  type="text"
                  className="input w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. 2026-27 Hostel Allocation"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Academic Year</label>
                <input
                  type="text"
                  className="input w-full"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="e.g. 2026-2027"
                  required
                />
              </div>
            </div>

            {/* SCHEDULED PERIOD */}
            <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 space-y-4">
              <h4 className="font-bold text-teal-900 text-sm flex items-center gap-1.5">
                <FaClock className="text-teal-700" /> Scheduled Period (IST Timezone)
              </h4>

              <div className="grid md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Start Date & Time</label>
                  <div className="flex gap-2">
                    <input type="date" className="input text-xs w-full" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                    <input type="time" className="input text-xs w-32" value={startTimeVal} onChange={(e) => setStartTimeVal(e.target.value)} required />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">End Date & Time</label>
                  <div className="flex gap-2">
                    <input type="date" className="input text-xs w-full" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                    <input type="time" className="input text-xs w-32" value={endTimeVal} onChange={(e) => setEndTimeVal(e.target.value)} required />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Number of Blocks</label>
              <input
                type="number"
                min="1"
                max="10"
                className="input w-32"
                value={blockCount}
                onChange={(e) => handleBlockCountChange(e.target.value)}
                required
              />
            </div>

            <div className="space-y-4">
              <h4 className="text-md font-bold text-gray-800 border-b pb-2">Block Configurations</h4>
              {blocksConfig.map((block, idx) => (
                <div key={block.blockNumber} className="p-4 rounded-lg border border-teal-100 bg-teal-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-teal-800 text-sm">Block {block.blockNumber}</span>
                    <span className="text-xs text-teal-600">Auto-generated RC Room: Block {block.blockNumber} RC Room</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Floors</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        className="input text-sm w-full"
                        value={block.floorCount}
                        onChange={(e) => handleBlockConfigChange(idx, 'floorCount', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Rooms per floor</label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        className="input text-sm w-full"
                        value={block.roomsPerFloor}
                        onChange={(e) => handleBlockConfigChange(idx, 'roomsPerFloor', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Students per room</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        className="input text-sm w-full"
                        value={block.studentsPerRoom}
                        onChange={(e) => handleBlockConfigChange(idx, 'studentsPerRoom', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <button
                type="button"
                className="btn btn-outline hover-lift text-teal-700 border-teal-300"
                onClick={handlePreview}
                disabled={isPreviewLoading}
              >
                {isPreviewLoading ? 'Generating Preview...' : 'Preview Structure'}
              </button>
              <button
                type="button"
                className="btn btn-outline hover-lift"
                onClick={() => handleCreateAllocation(false)}
                disabled={isSubmitting}
              >
                Save as DRAFT
              </button>
              <button
                type="button"
                className="btn btn-primary hover-lift"
                onClick={() => handleCreateAllocation(true)}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Publishing...' : 'Save & Publish Allocation'}
              </button>
            </div>
          </form>

          {/* PREVIEW STEP */}
          {previewData && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-gray-900">Generated Structure Preview</h4>
                <button type="button" className="text-gray-400 hover:text-gray-600" onClick={() => setPreviewData(null)}>
                  <FaTimes />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-4 p-4 rounded-lg bg-teal-50 border border-teal-200 mb-6 text-center text-sm">
                <div>
                  <p className="text-xs text-gray-500">Total Blocks</p>
                  <p className="text-lg font-bold text-teal-800">{previewData.summary.totalBlocks}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Student Rooms</p>
                  <p className="text-lg font-bold text-teal-800">{previewData.summary.totalRooms}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Capacity</p>
                  <p className="text-lg font-bold text-teal-800">{previewData.summary.totalCapacity}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Auto RC Rooms</p>
                  <p className="text-lg font-bold text-teal-800">{previewData.summary.rcRoomsCount}</p>
                </div>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {previewData.blocks.map((b) => (
                  <div key={b.blockNumber} className="p-3 rounded border border-gray-200 bg-gray-50">
                    <h5 className="font-bold text-sm text-gray-800 mb-2">{b.blockName} ({b.totalStudentRooms} rooms, {b.totalStudentCapacity} slots)</h5>
                    <p className="text-xs text-purple-700 font-semibold mb-2">RC Room: Block {b.blockNumber} RC Room (Reserved)</p>
                    <div className="text-xs text-gray-600 flex flex-wrap gap-1">
                      {previewData.previewRooms
                        .filter((r) => r.blockNumber === b.blockNumber && !r.isRcRoom)
                        .slice(0, 15)
                        .map((r) => (
                          <span key={r.roomNumber} className="bg-white border px-1.5 py-0.5 rounded font-mono">
                            {r.roomNumber}
                          </span>
                        ))}
                      {b.totalStudentRooms > 15 && <span className="text-gray-400 font-mono text-xs">+{b.totalStudentRooms - 15} more</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* OCCUPANCY STATS TAB */}
      {activeTab === 'occupancy' && occupancyData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="saas-card p-4 rounded-xl text-center bg-white shadow-sm border">
              <p className="text-xs text-gray-500">Total Blocks</p>
              <p className="text-xl font-bold text-gray-800">{occupancyData.summary.totalBlocks}</p>
            </div>
            <div className="saas-card p-4 rounded-xl text-center bg-white shadow-sm border">
              <p className="text-xs text-gray-500">Total Student Rooms</p>
              <p className="text-xl font-bold text-gray-800">{occupancyData.summary.totalRooms}</p>
            </div>
            <div className="saas-card p-4 rounded-xl text-center bg-white shadow-sm border">
              <p className="text-xs text-gray-500">Total Capacity</p>
              <p className="text-xl font-bold text-gray-800">{occupancyData.summary.totalCapacity}</p>
            </div>
            <div className="saas-card p-4 rounded-xl text-center bg-white shadow-sm border">
              <p className="text-xs text-gray-500">Booked Slots</p>
              <p className="text-xl font-bold text-teal-600">{occupancyData.summary.occupied}</p>
            </div>
            <div className="saas-card p-4 rounded-xl text-center bg-white shadow-sm border">
              <p className="text-xs text-gray-500">Available Slots</p>
              <p className="text-xl font-bold text-green-600">{occupancyData.summary.available}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {occupancyData.blocks.map((block) => (
              <div key={block.blockNumber} className="saas-card p-5 rounded-xl border border-gray-200 bg-white shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="font-bold text-lg text-gray-900">{block.blockName}</h4>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-semibold">{block.rcRoomName}</span>
                </div>

                <div className="text-sm space-y-1 text-gray-700">
                  <p>Capacity: <strong>{block.capacity}</strong> slots</p>
                  <p>Occupied: <strong className="text-teal-600">{block.occupied}</strong></p>
                  <p>Available: <strong className="text-green-600">{block.available}</strong></p>
                </div>

                <div className="pt-2">
                  <p className="text-xs font-bold text-gray-600 mb-2">Floor Breakdown</p>
                  <div className="space-y-1.5">
                    {block.floors.map((f) => (
                      <div key={f.floorNumber} className="flex justify-between items-center text-xs p-2 rounded bg-gray-50 border">
                        <span>{f.floorName} ({f.totalRooms} rooms)</span>
                        <span className="font-semibold text-gray-700">{f.occupied} / {f.capacity} booked</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BOOKINGS DRILLDOWN TAB */}
      {activeTab === 'bookings' && (
        <div className="saas-card p-6 rounded-xl border border-gray-200 bg-white shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-gray-900">Student Booking Audit Records</h4>
            <input
              type="text"
              placeholder="Search student name, register no, room or slot..."
              className="input text-sm w-72"
              value={bookingSearch}
              onChange={(e) => setBookingSearch(e.target.value)}
            />
          </div>

          {filteredBookings.length === 0 ? (
            <p className="admin-empty-text">No student bookings match search criteria.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse admin-user-table">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b">
                    <th className="text-left p-2">Student Name</th>
                    <th className="text-left p-2">Register No</th>
                    <th className="text-left p-2">Department & Year</th>
                    <th className="text-left p-2">Block</th>
                    <th className="text-left p-2">Room</th>
                    <th className="text-left p-2">Slot Code</th>
                    <th className="text-left p-2">Booked On</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((b) => (
                    <tr key={b._id} className="border-b hover:bg-gray-50 transition">
                      <td className="p-2 font-medium">{b.studentName}</td>
                      <td className="p-2">{b.registerNo || '-'}</td>
                      <td className="p-2">{b.department || '-'} ({b.year || '-'})</td>
                      <td className="p-2">Block {b.blockNumber}</td>
                      <td className="p-2 font-mono font-semibold">{b.roomNumber}</td>
                      <td className="p-2 font-mono font-bold text-teal-700">{b.slotCode}</td>
                      <td className="p-2 text-xs text-gray-500">{new Date(b.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ADMIN FORCE CLOSE CONFIRMATION MODAL */}
      {showCloseModal && (
        <div className="forgot-modal-overlay" role="dialog" aria-modal="true">
          <div className="forgot-card saas-card fade-in max-w-md w-full p-6 rounded-2xl bg-white shadow-2xl border" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-red-700 mb-2">End Hostel Allocation?</h3>
            <p className="text-sm text-gray-600 mb-6">
              This will immediately stop all new hostel room bookings. Students will no longer be able to reserve slots. A final immutable allocation report will be generated.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" className="btn btn-outline hover-lift text-gray-700" onClick={() => setShowCloseModal(false)} disabled={isClosing}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary bg-red-600 hover:bg-red-700 hover-lift" onClick={handleConfirmClose} disabled={isClosing}>
                {isClosing ? 'Ending Allocation...' : 'End Allocation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT VIEWER MODAL */}
      {showReportModal && (
        <div className="forgot-modal-overlay" role="dialog" aria-modal="true">
          <div className="forgot-card saas-card fade-in max-w-4xl w-full p-6 rounded-2xl bg-white shadow-2xl border max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div>
                <span className="text-xs font-bold text-red-700 uppercase bg-red-100 px-2.5 py-0.5 rounded-full">CLOSED REPORT SNAPSHOT</span>
                <h3 className="text-xl font-extrabold text-gray-900 mt-1">Hostel Room Allocation Report</h3>
              </div>
              <button type="button" className="text-gray-400 hover:text-gray-600" onClick={() => setShowReportModal(false)}>
                <FaTimes className="text-xl" />
              </button>
            </div>

            {isReportLoading ? (
              <p className="admin-empty-text">Loading report snapshot...</p>
            ) : reportModalData ? (
              <div className="space-y-6 text-sm text-gray-800">
                {/* Header Info */}
                <div className="p-4 rounded-xl bg-gray-50 border grid md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <p><strong>Allocation Name:</strong> {reportModalData.allocationHeader?.name}</p>
                    <p><strong>Academic Year:</strong> {reportModalData.allocationHeader?.academicYear}</p>
                    <p><strong>Scheduled Period:</strong> {reportModalData.allocationHeader?.startTimeIST} to {reportModalData.allocationHeader?.endTimeIST}</p>
                  </div>
                  <div>
                    <p><strong>Closure Type:</strong> <span className="font-bold text-red-700">{reportModalData.allocationHeader?.closureType}</span></p>
                    <p><strong>Closed At:</strong> {reportModalData.allocationHeader?.closedAtIST}</p>
                    <p><strong>Closed By:</strong> {reportModalData.allocationHeader?.closedBy}</p>
                  </div>
                </div>

                {/* Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-teal-50 border rounded-lg">
                    <p className="text-xs text-gray-500">Student Capacity</p>
                    <p className="text-lg font-bold text-teal-900">{reportModalData.summary?.totalStudentCapacity}</p>
                  </div>
                  <div className="p-3 bg-teal-50 border rounded-lg">
                    <p className="text-xs text-gray-500">Occupied Slots</p>
                    <p className="text-lg font-bold text-teal-700">{reportModalData.summary?.occupiedSlots}</p>
                  </div>
                  <div className="p-3 bg-green-50 border rounded-lg">
                    <p className="text-xs text-gray-500">Available Slots</p>
                    <p className="text-lg font-bold text-green-700">{reportModalData.summary?.availableSlots}</p>
                  </div>
                  <div className="p-3 bg-purple-50 border rounded-lg">
                    <p className="text-xs text-gray-500">Occupancy Rate</p>
                    <p className="text-lg font-bold text-purple-700">{reportModalData.summary?.occupancyPercentage}</p>
                  </div>
                </div>

                {/* Block & Room Detailed Breakdown */}
                <div className="space-y-4">
                  {reportModalData.blocks?.map((b) => (
                    <div key={b.blockNumber} className="border rounded-xl p-4 bg-white space-y-3">
                      <div className="flex justify-between border-b pb-2">
                        <h4 className="font-bold text-gray-900">{b.blockName}</h4>
                        <span className="text-xs font-semibold text-gray-500">{b.occupied} / {b.capacity} Occupied ({b.occupancyPercentage})</span>
                      </div>
                      <p className="text-xs text-purple-700 font-semibold">RC Room: {b.rcRoomName} (RESERVED)</p>

                      {b.floors?.map((f) => (
                        <div key={f.floorNumber} className="pl-2 border-l-2 border-teal-500 space-y-2">
                          <h5 className="font-bold text-xs text-teal-800">{f.floorName}</h5>
                          <div className="space-y-2">
                            {f.rooms?.map((r) => (
                              <div key={r.roomNumber} className="p-2 rounded bg-gray-50 border text-xs">
                                <div className="flex justify-between font-bold mb-1">
                                  <span>Room {r.roomNumber} (Cap: {r.capacity})</span>
                                  <span className={r.status === 'FULL' ? 'text-red-600' : r.status === 'EMPTY' ? 'text-gray-400' : 'text-amber-600'}>
                                    Status: {r.status}
                                  </span>
                                </div>
                                <div className="grid md:grid-cols-2 gap-1 text-[11px] text-gray-600">
                                  {r.slots?.map((s) => (
                                    <div key={s.slotCode} className="p-1 rounded bg-white border">
                                      <span className="font-mono font-bold text-teal-800">{s.slotCode}: </span>
                                      {s.isBooked ? `${s.studentName} (${s.registerNo}) - ${s.department}` : '[ UNBOOKED ]'}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" className="btn btn-outline text-teal-700" onClick={() => downloadCSV(selectedAllocationId, reportModalData?.allocationHeader?.name)}>
                    <FaFileCsv className="inline mr-1 text-green-600" /> Export CSV
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => downloadPDF(selectedAllocationId, reportModalData?.allocationHeader?.name)}>
                    <FaDownload className="inline mr-1" /> Download PDF Report
                  </button>
                </div>
              </div>
            ) : (
              <p className="admin-empty-text">No report snapshot available.</p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
