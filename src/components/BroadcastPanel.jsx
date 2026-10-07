import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import {
  FaBullhorn,
  FaChevronDown,
  FaChevronUp,
  FaChevronLeft,
  FaChevronRight,
  FaThumbtack,
  FaBuilding,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaWrench,
  FaInfoCircle,
  FaLayerGroup,
  FaExpandAlt,
  FaCompressAlt,
} from 'react-icons/fa'

const TYPE_ICONS = {
  'General': <FaInfoCircle className="text-teal-300" />,
  'Hostel Allocation': <FaBuilding className="text-emerald-300" />,
  'Important': <FaExclamationTriangle className="text-amber-300" />,
  'Deadline': <FaCalendarAlt className="text-rose-300" />,
  'Maintenance': <FaWrench className="text-orange-300" />,
  'Event': <FaBullhorn className="text-purple-300" />,
  'Academic': <FaLayerGroup className="text-indigo-300" />,
  'Other': <FaInfoCircle className="text-teal-300" />,
}

const PRIORITY_BADGES = {
  'Urgent': 'bg-red-500/90 text-white font-bold ring-1 ring-red-400',
  'Important': 'bg-amber-500/90 text-amber-950 font-bold',
  'Normal': 'bg-teal-500/30 text-teal-200 border border-teal-400/30',
}

export default function BroadcastPanel() {
  const [broadcasts, setBroadcasts] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isMinimized, setIsMinimized] = useState(false)
  const [showFullModal, setShowFullModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const timerRef = useRef(null)

  const fetchPublicBroadcasts = async () => {
    try {
      const res = await fetch('/api/broadcasts/public')
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data.broadcasts) ? data.broadcasts : []
        setBroadcasts(items)
      }
    } catch {
      // Graceful fallback: silently continue if offline
    } finally {
      setIsLoading(false)
    }
  }

  // Socket.IO real-time synchronization
  useEffect(() => {
    fetchPublicBroadcasts()

    // Connect to same host as application
    const socket = io('/', {
      transports: ['websocket', 'polling'],
    })

    socket.on('broadcast:published', (newBroadcast) => {
      setBroadcasts((prev) => {
        const filtered = prev.filter((item) => item.id !== newBroadcast.id)
        const updated = [newBroadcast, ...filtered]
        // Sort: pinned first, then publishAt descending
        return updated.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1
          if (!a.isPinned && b.isPinned) return 1
          return new Date(b.publishAt) - new Date(a.publishAt)
        })
      })
    })

    socket.on('broadcast:updated', (updatedBroadcast) => {
      setBroadcasts((prev) => {
        const index = prev.findIndex((item) => item.id === updatedBroadcast.id)
        if (index === -1) {
          return [updatedBroadcast, ...prev]
        }
        const updated = [...prev]
        updated[index] = updatedBroadcast
        return updated.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1
          if (!a.isPinned && b.isPinned) return 1
          return new Date(b.publishAt) - new Date(a.publishAt)
        })
      })
    })

    socket.on('broadcast:unpublished', ({ id }) => {
      setBroadcasts((prev) => prev.filter((item) => item.id !== id))
    })

    socket.on('broadcast:deleted', ({ id }) => {
      setBroadcasts((prev) => prev.filter((item) => item.id !== id))
    })

    socket.on('broadcast:expired', ({ id }) => {
      setBroadcasts((prev) => prev.filter((item) => item.id !== id))
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  // Slow, subtle auto-rotation if multiple announcements exist and panel is not minimized
  useEffect(() => {
    if (broadcasts.length <= 1 || isMinimized || showFullModal) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % broadcasts.length)
    }, 9000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [broadcasts.length, isMinimized, showFullModal])

  // Reset index bounds safely if list changes
  useEffect(() => {
    if (currentIndex >= broadcasts.length && broadcasts.length > 0) {
      setCurrentIndex(0)
    }
  }, [broadcasts.length, currentIndex])

  const formatDisplayDate = (dateVal) => {
    if (!dateVal) return ''
    const d = new Date(dateVal)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  // If loading or empty, don't show a broken box
  if (isLoading) {
    return null
  }

  if (broadcasts.length === 0) {
    return null
  }

  const current = broadcasts[currentIndex] || broadcasts[0]

  return (
    <>
      <aside
        className={`haventra-broadcast-widget ${isMinimized ? 'is-minimized' : 'is-expanded'}`}
        aria-label="HAVENTRA official hostel updates"
      >
        {isMinimized ? (
          /* MINIMIZED STATE: Compact, elegant pill */
          <button
            type="button"
            className="broadcast-pill-btn"
            onClick={() => setIsMinimized(false)}
            title="Expand HAVENTRA hostel updates"
          >
            <span className="broadcast-pill-icon-wrap">
              <FaBullhorn className="broadcast-pill-icon" />
              <span className="broadcast-pulse-dot" />
            </span>
            <span className="broadcast-pill-text">
              <strong>{broadcasts.length}</strong> Official {broadcasts.length === 1 ? 'Notice' : 'Notices'}
            </span>
            <FaChevronUp className="broadcast-pill-arrow" />
          </button>
        ) : (
          /* EXPANDED STATE: Contained floating glass panel */
          <div className="broadcast-panel-card">
            {/* Top Bar / Header */}
            <div className="broadcast-card-topbar">
              <div className="broadcast-header-left">
                <span className="broadcast-header-icon-wrap">
                  <FaBullhorn className="broadcast-header-icon" />
                </span>
                <span className="broadcast-header-title">HAVENTRA UPDATES</span>
                <span className="broadcast-badge-count">
                  {currentIndex + 1}/{broadcasts.length}
                </span>
              </div>

              <div className="broadcast-header-controls">
                <button
                  type="button"
                  className="broadcast-ctrl-btn"
                  onClick={() => setIsMinimized(true)}
                  title="Minimize"
                  aria-label="Minimize announcement panel"
                >
                  <FaChevronDown />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="broadcast-card-body">
              {/* Type, Priority, Pinned Row */}
              <div className="broadcast-meta-row">
                <span className="broadcast-type-pill">
                  {TYPE_ICONS[current.type] || <FaInfoCircle />}
                  <span>{current.type}</span>
                </span>

                <div className="broadcast-meta-right">
                  {current.isPinned && (
                    <span className="broadcast-pinned-badge">
                      <FaThumbtack /> PINNED
                    </span>
                  )}
                  {current.priority !== 'Normal' && (
                    <span className={`broadcast-priority-badge ${PRIORITY_BADGES[current.priority]}`}>
                      {current.priority.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Title */}
              <h3 className="broadcast-item-title">{current.title}</h3>

              {/* Short Summary */}
              <p className="broadcast-item-summary">{current.summary}</p>

              {/* Footer Meta & Read Details Button */}
              <div className="broadcast-item-footer">
                <div className="broadcast-date-info">
                  <span className="broadcast-date-pub">
                    Posted: {formatDisplayDate(current.publishAt)}
                  </span>
                  {current.expiresAt && (
                    <span className="broadcast-date-exp">
                      · Ends: {formatDisplayDate(current.expiresAt)}
                    </span>
                  )}
                </div>

                {current.content && (
                  <button
                    type="button"
                    className="broadcast-view-details-btn"
                    onClick={() => setShowFullModal(true)}
                  >
                    View Details
                  </button>
                )}
              </div>
            </div>

            {/* Navigation Row / Dots */}
            {broadcasts.length > 1 && (
              <div className="broadcast-card-nav">
                <button
                  type="button"
                  className="broadcast-nav-arrow"
                  onClick={() =>
                    setCurrentIndex((prev) => (prev === 0 ? broadcasts.length - 1 : prev - 1))
                  }
                  aria-label="Previous announcement"
                >
                  <FaChevronLeft />
                </button>

                <div className="broadcast-dots-wrap">
                  {broadcasts.map((b, idx) => (
                    <button
                      key={b.id || idx}
                      type="button"
                      className={`broadcast-dot ${idx === currentIndex ? 'active' : ''}`}
                      onClick={() => setCurrentIndex(idx)}
                      aria-label={`Go to announcement ${idx + 1}`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  className="broadcast-nav-arrow"
                  onClick={() =>
                    setCurrentIndex((prev) => (prev + 1) % broadcasts.length)
                  }
                  aria-label="Next announcement"
                >
                  <FaChevronRight />
                </button>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* DETAILED CONTENT MODAL */}
      {showFullModal && (
        <div className="broadcast-modal-backdrop" onClick={() => setShowFullModal(false)}>
          <div className="broadcast-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="broadcast-modal-header">
              <div className="flex items-center gap-2">
                <span className="broadcast-type-pill">
                  {TYPE_ICONS[current.type] || <FaInfoCircle />}
                  <span>{current.type}</span>
                </span>
                {current.isPinned && (
                  <span className="broadcast-pinned-badge">
                    <FaThumbtack /> PINNED
                  </span>
                )}
                {current.priority !== 'Normal' && (
                  <span className={`broadcast-priority-badge ${PRIORITY_BADGES[current.priority]}`}>
                    {current.priority.toUpperCase()}
                  </span>
                )}
              </div>

              <button
                type="button"
                className="broadcast-modal-close"
                onClick={() => setShowFullModal(false)}
                aria-label="Close announcement details"
              >
                &times;
              </button>
            </div>

            <h2 className="broadcast-modal-title">{current.title}</h2>
            <p className="broadcast-modal-summary">{current.summary}</p>

            <div className="broadcast-modal-content">
              {current.content}
            </div>

            <div className="broadcast-modal-footer">
              <div className="text-xs text-slate-400">
                Published: {formatDisplayDate(current.publishAt)}
                {current.expiresAt && ` · Ends: ${formatDisplayDate(current.expiresAt)}`}
              </div>
              <button
                type="button"
                className="broadcast-modal-close-btn"
                onClick={() => setShowFullModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
