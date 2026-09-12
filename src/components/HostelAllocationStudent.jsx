import { useState, useEffect } from 'react'
import { getAuthToken } from '../utils/authToken'
import { useToast } from './Toast'
import { io } from 'socket.io-client'
import { FaBuilding, FaBed, FaCheckCircle, FaUser, FaIdCard, FaGraduationCap, FaShieldAlt, FaTimes } from 'react-icons/fa'

export default function HostelAllocationStudent({ currentUser }) {
  const toast = useToast()
  const [activeAllocation, setActiveAllocation] = useState(null)
  const [myBooking, setMyBooking] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Selection states
  const [selectedBlockNumber, setSelectedBlockNumber] = useState(null)
  const [selectedFloorNumber, setSelectedFloorNumber] = useState(0)
  const [roomsList, setRoomsList] = useState([])
  const [isRoomsLoading, setIsRoomsLoading] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [selectedSlotNumber, setSelectedSlotNumber] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // Form prefill
  const [registerNo, setRegisterNo] = useState(currentUser?.mobileNo || '')
  const [department, setDepartment] = useState('CSE')
  const [year, setYear] = useState('3rd Year')
  const [isBooking, setIsBooking] = useState(false)

  const fetchActiveAllocationAndBooking = async () => {
    setIsLoading(true)
    try {
      const token = getAuthToken()
      const [allocRes, bookingRes] = await Promise.all([
        fetch('/api/hostel-allocations/active', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/hostel-allocations/my-booking', { headers: { Authorization: `Bearer ${token}` } }),
      ])

      const allocData = await allocRes.json()
      const bookingData = await bookingRes.json()

      if (bookingData?.booking) {
        setMyBooking(bookingData.booking)
      } else {
        setMyBooking(null)
      }

      if (allocData?.allocation) {
        setActiveAllocation(allocData.allocation)
        if (allocData.allocation.blocks?.length > 0) {
          setSelectedBlockNumber(allocData.allocation.blocks[0].blockNumber)
        }
      } else {
        setActiveAllocation(null)
      }
    } catch {
      toast.error('Unable to fetch hostel allocation data.')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRoomsForFloor = async (allocationId, blockNum, floorNum) => {
    if (!allocationId || blockNum === null || floorNum === null) return
    setIsRoomsLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch(
        `/api/hostel-allocations/${allocationId}/rooms?block=${blockNum}&floor=${floorNum}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await response.json()
      if (response.ok) {
        setRoomsList(Array.isArray(data.rooms) ? data.rooms : [])
      } else {
        toast.error(data.message || 'Failed to load rooms.')
      }
    } catch {
      toast.error('Unable to load rooms for selected floor.')
    } finally {
      setIsRoomsLoading(false)
    }
  }

  useEffect(() => {
    fetchActiveAllocationAndBooking()
  }, [])

  useEffect(() => {
    if (activeAllocation && selectedBlockNumber !== null && selectedFloorNumber !== null) {
      fetchRoomsForFloor(activeAllocation._id, selectedBlockNumber, selectedFloorNumber)
    }
  }, [activeAllocation, selectedBlockNumber, selectedFloorNumber])

  // REAL-TIME SOCKET.IO LISTENER
  useEffect(() => {
    if (!activeAllocation?._id) return

    const socket = io('/', { transports: ['websocket', 'polling'] })

    socket.on('hostel:slot_booked', (eventData) => {
      if (eventData.allocationId === activeAllocation._id) {
        // Refresh room grid if current student is looking at affected block/floor
        if (eventData.blockNumber === selectedBlockNumber && eventData.floorNumber === selectedFloorNumber) {
          fetchRoomsForFloor(activeAllocation._id, selectedBlockNumber, selectedFloorNumber)
        }

        // If current student has open room modal for affected room, update its slots live!
        if (selectedRoom && selectedRoom._id === eventData.roomId) {
          fetchRoomDetails(selectedRoom._id)
        }
      }
    })

    return () => {
      socket.off('hostel:slot_booked')
      socket.disconnect()
    }
  }, [activeAllocation?._id, selectedBlockNumber, selectedFloorNumber, selectedRoom?._id])

  const fetchRoomDetails = async (roomId) => {
    try {
      const token = getAuthToken()
      const response = await fetch(`/api/hostel-allocations/${activeAllocation._id}/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok && data.room) {
        setSelectedRoom(data.room)
      }
    } catch {
      // silent refresh fail
    }
  }

  const handleSelectRoom = async (roomSummary) => {
    if (roomSummary.isRcRoom) {
      toast.info('RC / Warden rooms are reserved and cannot be booked by students.')
      return
    }

    try {
      const token = getAuthToken()
      const response = await fetch(`/api/hostel-allocations/${activeAllocation._id}/rooms/${roomSummary._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.message || 'Failed to load room details.')
        return
      }

      setSelectedRoom(data.room)
      setSelectedSlotNumber(null)
    } catch {
      toast.error('Unable to fetch room details.')
    }
  }

  const handleConfirmBooking = async (e) => {
    e.preventDefault()
    if (!selectedRoom || !selectedSlotNumber) return

    setIsBooking(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`/api/hostel-allocations/${activeAllocation._id}/book`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: selectedRoom._id,
          slotNumber: selectedSlotNumber,
          registerNo,
          department,
          year,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        toast.error(data.message || 'Booking failed.')
        // Refresh room details if concurrency error occurred
        fetchRoomDetails(selectedRoom._id)
        return
      }

      toast.success(data.message || 'Hostel slot booked successfully!')
      setShowConfirmModal(false)
      setSelectedRoom(null)
      fetchActiveAllocationAndBooking()
    } catch {
      toast.error('Unable to complete booking request.')
    } finally {
      setIsBooking(false)
    }
  }

  if (isLoading) {
    return <p className="admin-empty-text">Loading hostel allocation data...</p>
  }

  // CASE 1: STUDENT HAS AN ACTIVE CONFIRMED BOOKING
  if (myBooking) {
    return (
      <section className="admin-access-wrap max-w-3xl mx-auto" aria-label="My Hostel Allocation">
        <div className="saas-card hover-lift p-8 rounded-2xl border-2 border-teal-500 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b pb-4 mb-6">
            <div>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1">
                <FaCheckCircle /> Confirmed Allocation
              </span>
              <h2 className="text-2xl font-extrabold text-gray-900 mt-2">MY HOSTEL ALLOCATION</h2>
              <p className="text-sm text-gray-500">{myBooking.allocationId?.name || 'Academic Year Allocation'}</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-teal-700 font-mono">{myBooking.slotCode}</span>
              <p className="text-xs text-gray-500 font-semibold mt-1">Assigned Slot</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-700 mb-6">
            <div className="space-y-3 bg-teal-50/60 p-4 rounded-xl border border-teal-100">
              <h3 className="font-bold text-teal-900 border-b pb-1 text-base flex items-center gap-2">
                <FaBuilding className="text-teal-600" /> Room & Location Details
              </h3>
              <p><strong className="text-gray-900">Block:</strong> Block {myBooking.blockNumber}</p>
              <p><strong className="text-gray-900">Floor:</strong> {myBooking.floorNumber === 0 ? 'Ground Floor' : `Floor ${myBooking.floorNumber}`}</p>
              <p><strong className="text-gray-900">Room Number:</strong> <span className="font-mono font-bold text-teal-800">{myBooking.roomNumber}</span></p>
              <p><strong className="text-gray-900">Slot Code:</strong> <span className="font-mono font-bold text-teal-800">{myBooking.slotCode}</span></p>
            </div>

            <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <h3 className="font-bold text-gray-900 border-b pb-1 text-base flex items-center gap-2">
                <FaUser className="text-gray-600" /> Student Profile Info
              </h3>
              <p><strong className="text-gray-900">Student Name:</strong> {myBooking.studentName}</p>
              <p><strong className="text-gray-900">Email:</strong> {myBooking.studentEmail}</p>
              <p><strong className="text-gray-900">Register No:</strong> {myBooking.registerNo || '-'}</p>
              <p><strong className="text-gray-900">Department:</strong> {myBooking.department || '-'}</p>
              <p><strong className="text-gray-900">Year:</strong> {myBooking.year || '-'}</p>
            </div>
          </div>

          <div className="text-xs text-gray-400 text-center border-t pt-4">
            Booking Record Reference: {myBooking._id} • Confirmed on {new Date(myBooking.createdAt).toLocaleString()}
          </div>
        </div>
      </section>
    )
  }

  // CASE 2: NO PUBLISHED ALLOCATION AVAILABLE
  if (!activeAllocation) {
    return (
      <section className="admin-access-wrap text-center py-12" aria-label="No Allocation">
        <div className="saas-card p-8 rounded-2xl bg-white border max-w-lg mx-auto shadow-sm">
          <FaBuilding className="text-4xl text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-800 mb-1">No Active Hostel Allocation</h3>
          <p className="text-sm text-gray-500">Hostel room allocation is currently closed or not yet published by the administrator. Please check back later.</p>
        </div>
      </section>
    )
  }

  const currentBlockConfig = activeAllocation.blocks.find((b) => b.blockNumber === selectedBlockNumber)

  return (
    <section className="admin-access-wrap max-w-6xl mx-auto" aria-label="Hostel Room Booking">
      <div className="admin-users-header mb-6">
        <div className="admin-users-title-block">
          <span className="bg-teal-100 text-teal-800 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
            {activeAllocation.academicYear} Published Allocation
          </span>
          <h2 className="text-2xl font-bold text-gray-900 mt-1">{activeAllocation.name}</h2>
          <p className="admin-users-subtitle">Select a block, pick your floor, and choose an available room slot visually.</p>
        </div>
      </div>

      {/* BLOCK SELECTOR TABS */}
      <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2">
        <span className="text-sm font-bold text-gray-700 whitespace-nowrap">Select Block:</span>
        {activeAllocation.blocks.map((block) => (
          <button
            key={block.blockNumber}
            type="button"
            className={`btn hover-lift text-sm font-bold px-4 py-2 rounded-xl transition ${
              selectedBlockNumber === block.blockNumber
                ? 'bg-teal-700 text-white shadow-md'
                : 'bg-white text-gray-700 border hover:bg-gray-50'
            }`}
            onClick={() => {
              setSelectedBlockNumber(block.blockNumber)
              setSelectedFloorNumber(0)
              setSelectedRoom(null)
            }}
          >
            Block {block.blockNumber}
          </button>
        ))}
      </div>

      {/* FLOOR SELECTOR TABS */}
      {currentBlockConfig && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Floor:</span>
          {Array.from({ length: currentBlockConfig.floorCount }).map((_, fIdx) => (
            <button
              key={fIdx}
              type="button"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedFloorNumber === fIdx
                  ? 'bg-teal-100 text-teal-800 border-2 border-teal-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => {
                setSelectedFloorNumber(fIdx)
                setSelectedRoom(null)
              }}
            >
              {fIdx === 0 ? 'Ground Floor' : `Floor ${fIdx}`}
            </button>
          ))}
        </div>
      )}

      {/* LEGEND BAR */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border mb-6 text-xs text-gray-600 shadow-sm flex-wrap gap-2">
        <span className="font-bold text-gray-800">Room Status Legend:</span>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Partially Occupied
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Full
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-600 inline-block" /> RC / Warden Room
          </span>
        </div>
      </div>

      {/* ROOMS GRID */}
      {isRoomsLoading ? (
        <p className="admin-empty-text">Loading floor room map...</p>
      ) : roomsList.length === 0 ? (
        <p className="admin-empty-text">No rooms configured for this floor.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          {roomsList.map((room) => {
            const isRc = room.isRcRoom
            const isFull = room.isFull
            const isPartial = !isRc && room.occupiedCount > 0 && !isFull
            const isAvail = !isRc && room.occupiedCount === 0

            return (
              <div
                key={room._id}
                role="button"
                tabIndex={isRc ? -1 : 0}
                onClick={() => handleSelectRoom(room)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleSelectRoom(room)
                }}
                className={`saas-card p-4 rounded-xl border text-center transition cursor-pointer hover:shadow-lg ${
                  isRc
                    ? 'bg-purple-50 border-purple-300 text-purple-900 cursor-not-allowed'
                    : isFull
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : isPartial
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-white border-teal-200 hover:border-teal-500'
                }`}
              >
                <div className="text-xs font-bold uppercase tracking-wider mb-1">
                  {isRc ? 'Warden Room' : `Room`}
                </div>
                <div className="text-lg font-black font-mono mb-2">
                  {room.roomNumber}
                </div>
                {isRc ? (
                  <span className="text-[11px] font-bold bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full inline-block">
                    RC Room
                  </span>
                ) : (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-block ${
                      isFull
                        ? 'bg-red-200 text-red-800'
                        : isPartial
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {room.occupiedCount} / {room.capacity} Booked
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* SELECTED ROOM SLOTS VIEW (CINEMA / MOVIE-TICKET STYLE) */}
      {selectedRoom && (
        <div className="saas-card p-6 rounded-2xl border-2 border-teal-500 bg-white shadow-xl mb-8">
          <div className="flex items-center justify-between border-b pb-4 mb-6">
            <div>
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Room Seat Selection</span>
              <h3 className="text-xl font-black text-gray-900 font-mono">ROOM {selectedRoom.roomNumber}</h3>
              <p className="text-xs text-gray-500">Click an available slot seat to reserve your place.</p>
            </div>

            <button type="button" className="text-gray-400 hover:text-gray-600" onClick={() => setSelectedRoom(null)}>
              <FaTimes className="text-lg" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {selectedRoom.slots.map((slot) => {
              const isTaken = slot.isBooked
              const isSelected = selectedSlotNumber === slot.slotNumber

              return (
                <div
                  key={slot.slotNumber}
                  role="button"
                  tabIndex={isTaken ? -1 : 0}
                  onClick={() => {
                    if (isTaken) return
                    setSelectedSlotNumber(slot.slotNumber)
                  }}
                  onKeyDown={(e) => {
                    if (!isTaken && (e.key === 'Enter' || e.key === ' ')) setSelectedSlotNumber(slot.slotNumber)
                  }}
                  className={`p-4 rounded-xl border-2 text-center transition flex flex-col justify-between items-center h-32 ${
                    isTaken
                      ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed opacity-75'
                      : isSelected
                      ? 'bg-teal-600 border-teal-700 text-white shadow-lg scale-105'
                      : 'bg-white border-teal-300 text-gray-800 hover:bg-teal-50 hover:border-teal-500 cursor-pointer'
                  }`}
                >
                  <span className="text-xs font-bold uppercase">{slot.slotCode}</span>
                  <FaBed className={`text-2xl ${isSelected ? 'text-white' : isTaken ? 'text-gray-300' : 'text-teal-600'}`} />
                  <span className={`text-[11px] font-extrabold uppercase px-2 py-0.5 rounded ${
                    isTaken
                      ? 'bg-gray-200 text-gray-600'
                      : isSelected
                      ? 'bg-white text-teal-800'
                      : 'bg-teal-100 text-teal-800'
                  }`}>
                    {isTaken ? 'OCCUPIED' : isSelected ? 'SELECTED' : 'AVAILABLE'}
                  </span>
                </div>
              )
            })}
          </div>

          {selectedSlotNumber && (
            <div className="pt-4 border-t flex justify-end">
              <button
                type="button"
                className="btn btn-primary hover-lift text-sm px-6 py-2.5 font-bold"
                onClick={() => setShowConfirmModal(true)}
              >
                Proceed to Book Slot {selectedRoom.roomNumber}-{String.fromCharCode(64 + selectedSlotNumber)}
              </button>
            </div>
          )}
        </div>
      )}

      {/* BOOKING CONFIRMATION MODAL */}
      {showConfirmModal && selectedRoom && selectedSlotNumber && (
        <div className="forgot-modal-overlay" role="dialog" aria-modal="true">
          <div className="forgot-card saas-card fade-in max-w-md w-full p-6 rounded-2xl bg-white shadow-2xl border" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-gray-900 mb-2">Confirm Room Booking</h3>
            <p className="text-xs text-gray-500 mb-4">
              You are reserving Slot <strong className="text-teal-700 font-mono">{selectedRoom.roomNumber}-{String.fromCharCode(64 + selectedSlotNumber)}</strong> in Block {selectedRoom.blockNumber}.
            </p>

            <form onSubmit={handleConfirmBooking} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Student Name</label>
                <input type="text" className="input w-full bg-gray-100" value={currentUser?.username || ''} readOnly />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                <input type="text" className="input w-full bg-gray-100" value={currentUser?.email || ''} readOnly />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Register / Mobile Number</label>
                <input
                  type="text"
                  className="input w-full"
                  value={registerNo}
                  onChange={(e) => setRegisterNo(e.target.value)}
                  placeholder="e.g. 2024503001"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    className="input w-full"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. CSE"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Year</label>
                  <select className="input w-full" value={year} onChange={(e) => setYear(e.target.value)} required>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  className="btn btn-outline hover-lift"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isBooking}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary hover-lift" disabled={isBooking}>
                  {isBooking ? 'Confirming...' : 'Confirm & Book Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
