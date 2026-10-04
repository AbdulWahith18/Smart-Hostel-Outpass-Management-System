import PDFDocument from 'pdfkit'
import HostelAllocation from '../models/HostelAllocation.js'
import HostelRoom from '../models/HostelRoom.js'
import HostelBooking from '../models/HostelBooking.js'

/**
 * Format a UTC Date object or string into India Standard Time (Asia/Kolkata) string.
 * Example: 18 September 2026, 06:00 PM
 */
export const formatIST = (dateInput) => {
  if (!dateInput) return '-'
  const d = new Date(dateInput)
  if (Number.isNaN(d.getTime())) return '-'

  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Generate an immutable final allocation report snapshot and save it to DB.
 */
export const generateAllocationReportSnapshot = async (allocationId) => {
  const allocation = await HostelAllocation.findById(allocationId)
  if (!allocation) {
    throw new Error('Hostel allocation not found.')
  }

  const rooms = await HostelRoom.find({ allocationId }).sort({ blockNumber: 1, floorNumber: 1, roomNumber: 1 })
  const bookings = await HostelBooking.find({ allocationId, status: 'active' }).sort({ blockNumber: 1, floorNumber: 1, roomNumber: 1, slotNumber: 1 })

  let totalStudentRooms = 0
  let totalStudentCapacity = 0
  let occupiedSlots = 0
  let rcRoomsCount = 0

  const blockReports = allocation.blocks.map((block) => {
    const bRooms = rooms.filter((r) => r.blockNumber === block.blockNumber)
    const studentRooms = bRooms.filter((r) => !r.isRcRoom)
    const rcRoomDoc = bRooms.find((r) => r.isRcRoom)
    if (rcRoomDoc) rcRoomsCount += 1

    let bOccupied = 0
    let bCapacity = 0

    studentRooms.forEach((r) => {
      bOccupied += r.occupiedCount
      bCapacity += r.capacity
    })

    totalStudentRooms += studentRooms.length
    totalStudentCapacity += bCapacity
    occupiedSlots += bOccupied

    const floorReports = []
    for (let f = 0; f < block.floorCount; f++) {
      const fRooms = studentRooms.filter((r) => r.floorNumber === f)
      let fOccupied = 0
      let fCapacity = 0

      const roomDetails = fRooms.map((r) => {
        fOccupied += r.occupiedCount
        fCapacity += r.capacity

        const roomBookings = bookings.filter((b) => b.roomId.toString() === r._id.toString())
        const isFull = r.occupiedCount >= r.capacity
        const isEmpty = r.occupiedCount === 0
        const roomStatus = isFull ? 'FULL' : isEmpty ? 'EMPTY' : 'PARTIAL'

        const slotsList = r.slots.map((s) => {
          const b = roomBookings.find((bk) => bk.slotNumber === s.slotNumber)
          return {
            slotNumber: s.slotNumber,
            slotCode: s.slotCode,
            isBooked: s.isBooked,
            studentName: b ? b.studentName : '-',
            registerNo: b ? b.registerNo : '-',
            department: b ? b.department : '-',
            year: b ? b.year : '-',
            bookedAtIST: b ? formatIST(b.createdAt) : '-',
          }
        })

        return {
          roomId: r._id,
          roomNumber: r.roomNumber,
          capacity: r.capacity,
          occupied: r.occupiedCount,
          available: r.capacity - r.occupiedCount,
          status: roomStatus,
          slots: slotsList,
        }
      })

      floorReports.push({
        floorNumber: f,
        floorName: f === 0 ? 'Ground Floor' : `Floor ${f}`,
        totalRooms: fRooms.length,
        capacity: fCapacity,
        occupied: fOccupied,
        available: fCapacity - fOccupied,
        rooms: roomDetails,
      })
    }

    const bAvailable = bCapacity - bOccupied
    const bOccupancyPct = bCapacity > 0 ? ((bOccupied / bCapacity) * 100).toFixed(2) : '0.00'

    return {
      blockNumber: block.blockNumber,
      blockName: block.blockName,
      totalRooms: studentRooms.length,
      capacity: bCapacity,
      occupied: bOccupied,
      available: bAvailable,
      occupancyPercentage: `${bOccupancyPct}%`,
      rcRoomName: rcRoomDoc ? rcRoomDoc.roomNumber : `Block ${block.blockNumber} RC Room`,
      floors: floorReports,
    }
  })

  const availableSlots = totalStudentCapacity - occupiedSlots
  const overallOccupancyPct = totalStudentCapacity > 0 ? ((occupiedSlots / totalStudentCapacity) * 100).toFixed(2) : '0.00'

  const startTimeVal = allocation.startTime || allocation.createdAt || new Date()
  const endTimeVal = allocation.endTime || allocation.closedAt || new Date()

  const snapshot = {
    generatedAt: new Date(),
    generatedAtIST: formatIST(new Date()),
    allocationHeader: {
      name: allocation.name,
      academicYear: allocation.academicYear || '2026-2027',
      startTimeIST: formatIST(startTimeVal),
      endTimeIST: formatIST(endTimeVal),
      status: allocation.status,
      closureType:
        allocation.closureType === 'ADMIN_FORCED'
          ? 'Admin Forced Closure'
          : allocation.closureType === 'AUTOMATIC'
          ? 'Automatic — Scheduled End Time'
          : '-',
      closedAtIST: formatIST(allocation.closedAt),
      closedBy: allocation.closedBy || 'System Scheduler',
    },
    summary: {
      totalBlocks: allocation.totalBlocks,
      totalFloors: allocation.blocks.reduce((acc, b) => acc + b.floorCount, 0),
      totalStudentRooms,
      totalStudentCapacity,
      occupiedSlots,
      availableSlots,
      unallocatedCapacity: availableSlots,
      occupancyPercentage: `${overallOccupancyPct}%`,
      rcRoomsCount,
    },
    blocks: blockReports,
  }

  await HostelAllocation.updateOne(
    { _id: allocationId },
    {
      $set: {
        reportSnapshot: snapshot,
        reportGenerated: true,
        startTime: startTimeVal,
        endTime: endTimeVal,
      },
    }
  )

  return snapshot
}

/**
 * Concurrency-Safe Atomic Closure of an Allocation.
 */
export const closeAllocationTransaction = async (allocationId, closureType = 'AUTOMATIC', closedBy = 'SYSTEM', io = null) => {
  // 1. ATOMIC STATE TRANSITION
  const updatedAllocation = await HostelAllocation.findOneAndUpdate(
    { _id: allocationId, status: 'published' },
    {
      $set: {
        status: 'closed',
        closedAt: new Date(),
        closedBy,
        closureType,
      },
    },
    { new: true }
  )

  // If null, it means allocation was ALREADY closed concurrently by Admin or Scheduler
  if (!updatedAllocation) {
    return null
  }

  // 2. Generate Report Snapshot
  try {
    await generateAllocationReportSnapshot(updatedAllocation._id)
  } catch (snapshotErr) {
    console.error(`❌ Report snapshot generation failed for allocation ${allocationId}:`, snapshotErr.message)
  }

  // 3. Emit Real-time Socket.IO event
  if (io) {
    io.emit('hostel:allocation_closed', {
      allocationId: updatedAllocation._id,
      name: updatedAllocation.name,
      status: 'closed',
      closedAt: updatedAllocation.closedAt,
      closureType: updatedAllocation.closureType,
      closedBy: updatedAllocation.closedBy,
    })
  }

  return updatedAllocation
}

/**
 * Reconcile & close expired active allocations automatically.
 */
export const checkAndCloseExpiredAllocations = async (io = null) => {
  try {
    const expiredAllocations = await HostelAllocation.find({
      status: 'published',
      endTime: { $lte: new Date() },
    })

    for (const alloc of expiredAllocations) {
      console.log(`⏰ Automatic closure triggered for expired allocation: '${alloc.name}' (${alloc._id})`)
      await closeAllocationTransaction(alloc._id, 'AUTOMATIC', 'SYSTEM Scheduler', io)
    }
  } catch (err) {
    console.error('❌ Scheduler error checking expired allocations:', err.message)
  }
}

/**
 * Start background timer scheduler for automatic allocation closure.
 */
let schedulerInterval = null

export const startAllocationScheduler = (io) => {
  // Run startup reconciliation
  checkAndCloseExpiredAllocations(io)

  if (!schedulerInterval) {
    // Check every 15 seconds
    schedulerInterval = setInterval(() => {
      checkAndCloseExpiredAllocations(io)
    }, 15000)
  }
}

/**
 * PDF Generator: Build professional, human-readable printable allocation report stream.
 */
export const buildAllocationPDFStream = async (allocationId, res) => {
  const allocation = await HostelAllocation.findById(allocationId)
  if (!allocation) {
    throw new Error('Allocation not found.')
  }

  let snapshot = allocation.reportSnapshot
  if (!snapshot) {
    snapshot = await generateAllocationReportSnapshot(allocationId)
  }

  const doc = new PDFDocument({ margin: 36, size: 'A4', bufferPages: true })

  const academicYearStr = (allocation.academicYear || '2026-27').replace(/\s+/g, '_')
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="HOMS-Hostel-Allocation-Report-${academicYearStr}.pdf"`
  )

  doc.pipe(res)

  // Title / Header
  doc.fillColor('#0f766e').fontSize(20).font('Helvetica-Bold').text('HOSTEL OUTPASS MANAGEMENT SYSTEM (HOMS)', { align: 'center' })
  doc.fillColor('#334155').fontSize(14).font('Helvetica-Bold').text('HOSTEL ROOM ALLOCATION REPORT', { align: 'center' })
  doc.moveDown(0.5)

  // Subheader Line
  doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(36, doc.y).lineTo(559, doc.y).stroke()
  doc.moveDown(0.5)

  // Allocation Info Grid
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b').text(`Allocation Name: `, { continued: true }).font('Helvetica').text(snapshot.allocationHeader.name)
  doc.font('Helvetica-Bold').text(`Academic Year: `, { continued: true }).font('Helvetica').text(snapshot.allocationHeader.academicYear)
  doc.font('Helvetica-Bold').text(`Allocation Period: `, { continued: true }).font('Helvetica').text(`${snapshot.allocationHeader.startTimeIST}  TO  ${snapshot.allocationHeader.endTimeIST}`)
  doc.font('Helvetica-Bold').text(`Status: `, { continued: true }).fillColor('#b91c1c').text(snapshot.allocationHeader.status.toUpperCase(), { continued: true }).fillColor('#1e293b').text(`  |  Closure Type: `, { continued: true }).font('Helvetica').text(snapshot.allocationHeader.closureType)
  doc.font('Helvetica-Bold').text(`Closed At: `, { continued: true }).font('Helvetica').text(snapshot.allocationHeader.closedAtIST, { continued: true }).font('Helvetica-Bold').text(`  |  Closed By: `, { continued: true }).font('Helvetica').text(snapshot.allocationHeader.closedBy)
  doc.font('Helvetica-Bold').text(`Report Generated On: `, { continued: true }).font('Helvetica').text(snapshot.generatedAtIST)

  doc.moveDown(0.8)
  doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(36, doc.y).lineTo(559, doc.y).stroke()
  doc.moveDown(0.8)

  // Executive Summary Box
  doc.fillColor('#0f766e').fontSize(12).font('Helvetica-Bold').text('EXECUTIVE SUMMARY', { underline: true })
  doc.moveDown(0.4)

  const sum = snapshot.summary
  doc.fontSize(9).font('Helvetica').fillColor('#1e293b')
  doc.text(`Total Blocks: ${sum.totalBlocks}     Total Floors: ${sum.totalFloors}     Total Student Rooms: ${sum.totalStudentRooms}`)
  doc.text(`Total Student Capacity: ${sum.totalStudentCapacity} slots     Occupied Slots: ${sum.occupiedSlots}     Available Slots: ${sum.availableSlots}`)
  doc.text(`Occupancy Rate: ${sum.occupancyPercentage}     Unallocated Capacity: ${sum.unallocatedCapacity}     RC/Warden Rooms: ${sum.rcRoomsCount}`)

  doc.moveDown(1)

  // Detailed Block Breakdown
  snapshot.blocks.forEach((block) => {
    if (doc.y > 680) doc.addPage()

    doc.fillColor('#1e293b').fontSize(11).font('Helvetica-Bold').text(`${block.blockName} Summary`)
    doc.fontSize(9).font('Helvetica').fillColor('#475569')
    doc.text(`Student Rooms: ${block.totalRooms} | Capacity: ${block.capacity} | Occupied: ${block.occupied} | Available: ${block.available} | Occupancy: ${block.occupancyPercentage}`)
    doc.fillColor('#6b21a8').font('Helvetica-Bold').text(`RC / Warden Room: ${block.rcRoomName} (RESERVED - Non-Student)`)
    doc.moveDown(0.5)

    block.floors.forEach((floor) => {
      if (doc.y > 700) doc.addPage()

      doc.fillColor('#0f766e').fontSize(10).font('Helvetica-Bold').text(`--- ${floor.floorName} (${floor.occupied}/${floor.capacity} Booked) ---`)
      doc.moveDown(0.3)

      floor.rooms.forEach((room) => {
        if (doc.y > 720) doc.addPage()

        doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text(
          `Room ${room.roomNumber} [Capacity: ${room.capacity} | Occupied: ${room.occupied} | Status: ${room.status}]`
        )

        if (room.slots && room.slots.length > 0) {
          room.slots.forEach((s) => {
            if (s.isBooked) {
              doc.fillColor('#334155').fontSize(8).font('Helvetica').text(
                `   Slot ${s.slotCode}: ${s.studentName} | Reg: ${s.registerNo} | Dept: ${s.department} (${s.year}) | Booked: ${s.bookedAtIST}`
              )
            } else {
              doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(`   Slot ${s.slotCode}: [ AVAILABLE / UNBOOKED ]`)
            }
          })
        }
        doc.moveDown(0.3)
      })
      doc.moveDown(0.4)
    })
    doc.moveDown(0.6)
  })

  // Footer Page Numbering & Stamp
  const pages = doc.bufferedPageRange()
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i)
    doc.fillColor('#94a3b8').fontSize(8).text(
      `HOMS Official Allocation Report  |  Page ${i + 1} of ${pages.count}  |  Generated by HOMS System`,
      36,
      760,
      { align: 'center', width: 523 }
    )
  }

  doc.end()
}
