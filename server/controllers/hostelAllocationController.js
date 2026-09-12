import HostelAllocation from '../models/HostelAllocation.js'
import HostelRoom from '../models/HostelRoom.js'
import HostelBooking from '../models/HostelBooking.js'
import User from '../models/User.js'

/**
 * Generate room objects for given block configurations.
 */
const generateRoomObjects = (allocationId, blocks) => {
  const roomDocs = []

  for (const blockConfig of blocks) {
    const { blockNumber, floorCount, roomsPerFloor, studentsPerRoom } = blockConfig
    const blockName = `Block ${blockNumber}`

    // 1. RC / Warden Room per block (Special non-bookable room)
    roomDocs.push({
      allocationId,
      blockNumber,
      blockName,
      floorNumber: 0,
      roomNumber: `Block ${blockNumber} RC Room`,
      isRcRoom: true,
      capacity: 0,
      occupiedCount: 0,
      slots: [],
    })

    // 2. Student Rooms
    for (let floorIdx = 0; floorIdx < floorCount; floorIdx++) {
      for (let roomIdx = 1; roomIdx <= roomsPerFloor; roomIdx++) {
        const roomPadded = String(roomIdx).padStart(2, '0')
        const roomNumber = `${blockNumber}${floorIdx}${roomPadded}`

        const slots = []
        for (let slotNumber = 1; slotNumber <= studentsPerRoom; slotNumber++) {
          const letter = String.fromCharCode(64 + slotNumber)
          slots.push({
            slotNumber,
            slotCode: `${roomNumber}-${letter}`,
            isBooked: false,
            bookedBy: null,
          })
        }

        roomDocs.push({
          allocationId,
          blockNumber,
          blockName,
          floorNumber: floorIdx,
          roomNumber,
          isRcRoom: false,
          capacity: studentsPerRoom,
          occupiedCount: 0,
          slots,
        })
      }
    }
  }

  return roomDocs
}

/**
 * Validate block configuration rules.
 */
const validateBlockConfigs = (blocks) => {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    throw new Error('At least one block configuration is required.')
  }

  const blockNumbersSeen = new Set()

  for (const block of blocks) {
    const bNum = Number(block.blockNumber)
    const floors = Number(block.floorCount)
    const rooms = Number(block.roomsPerFloor)
    const cap = Number(block.studentsPerRoom)

    if (!bNum || bNum <= 0 || !Number.isInteger(bNum)) {
      throw new Error('Block number must be a positive integer.')
    }

    if (blockNumbersSeen.has(bNum)) {
      throw new Error(`Duplicate block number detected: Block ${bNum}.`)
    }
    blockNumbersSeen.add(bNum)

    if (!floors || floors <= 0 || !Number.isInteger(floors)) {
      throw new Error(`Block ${bNum}: Floor count must be a positive integer.`)
    }

    if (!rooms || rooms <= 0 || !Number.isInteger(rooms)) {
      throw new Error(`Block ${bNum}: Rooms per floor must be a positive integer.`)
    }

    if (rooms > 99) {
      throw new Error(`Block ${bNum}: Rooms per floor cannot exceed 99 to maintain standard room numbering format.`)
    }

    if (!cap || cap <= 0 || !Number.isInteger(cap)) {
      throw new Error(`Block ${bNum}: Students per room must be a positive integer.`)
    }
  }
}

/* ========================================================================== */
/* ADMIN CONTROLLERS                                                          */
/* ========================================================================== */

/**
 * Preview room structure before creating/publishing.
 */
export const previewAllocation = async (req, res) => {
  try {
    const { name, academicYear, blocks } = req.body

    if (!name || !academicYear) {
      return res.status(400).json({ message: 'Allocation name and academic year are required.' })
    }

    validateBlockConfigs(blocks)

    let totalBlocks = 0
    let totalRooms = 0
    let totalCapacity = 0
    const processedBlocks = []

    for (const b of blocks) {
      const bNum = Number(b.blockNumber)
      const floors = Number(b.floorCount)
      const rooms = Number(b.roomsPerFloor)
      const cap = Number(b.studentsPerRoom)

      const blockRooms = floors * rooms
      const blockCapacity = blockRooms * cap

      totalBlocks += 1
      totalRooms += blockRooms
      totalCapacity += blockCapacity

      processedBlocks.push({
        blockNumber: bNum,
        blockName: `Block ${bNum}`,
        floorCount: floors,
        roomsPerFloor: rooms,
        studentsPerRoom: cap,
        totalStudentRooms: blockRooms,
        totalStudentCapacity: blockCapacity,
      })
    }

    // Generate sample preview structure
    const sampleRooms = generateRoomObjects(null, processedBlocks).map((r) => ({
      roomNumber: r.roomNumber,
      blockNumber: r.blockNumber,
      floorNumber: r.floorNumber,
      isRcRoom: r.isRcRoom,
      capacity: r.capacity,
      sampleSlots: r.slots.map((s) => s.slotCode),
    }))

    res.status(200).json({
      name,
      academicYear,
      summary: {
        totalBlocks,
        totalRooms,
        totalCapacity,
        rcRoomsCount: totalBlocks,
      },
      blocks: processedBlocks,
      previewRooms: sampleRooms,
    })
  } catch (err) {
    res.status(400).json({ message: err.message || 'Invalid allocation configuration.' })
  }
}

/**
 * Create a new hostel allocation in DRAFT or PUBLISHED status.
 */
export const createAllocation = async (req, res) => {
  try {
    const { name, academicYear, blocks, autoPublish } = req.body

    if (!name || !academicYear) {
      return res.status(400).json({ message: 'Allocation name and academic year are required.' })
    }

    validateBlockConfigs(blocks)

    if (autoPublish) {
      const existingPublished = await HostelAllocation.findOne({ status: 'published' })
      if (existingPublished) {
        return res.status(409).json({
          message: `Cannot publish allocation while '${existingPublished.name}' is currently active. Close it first or save as DRAFT.`,
        })
      }
    }

    let totalBlocks = 0
    let totalRooms = 0
    let totalCapacity = 0
    const processedBlocks = []

    for (const b of blocks) {
      const bNum = Number(b.blockNumber)
      const floors = Number(b.floorCount)
      const rooms = Number(b.roomsPerFloor)
      const cap = Number(b.studentsPerRoom)

      const blockRooms = floors * rooms
      const blockCapacity = blockRooms * cap

      totalBlocks += 1
      totalRooms += blockRooms
      totalCapacity += blockCapacity

      processedBlocks.push({
        blockNumber: bNum,
        blockName: `Block ${bNum}`,
        floorCount: floors,
        roomsPerFloor: rooms,
        studentsPerRoom: cap,
        totalStudentRooms: blockRooms,
        totalStudentCapacity: blockCapacity,
      })
    }

    const allocationStatus = autoPublish ? 'published' : 'draft'
    const publishedAt = autoPublish ? new Date() : null

    const allocation = await HostelAllocation.create({
      name,
      academicYear,
      status: allocationStatus,
      blocks: processedBlocks,
      totalBlocks,
      totalRooms,
      totalCapacity,
      occupiedCount: 0,
      publishedAt,
      createdBy: req.user.username || req.user.email,
    })

    // Generate and bulk insert room documents
    const roomDocs = generateRoomObjects(allocation._id, processedBlocks)
    await HostelRoom.insertMany(roomDocs)

    res.status(201).json({
      message: `Hostel allocation '${allocation.name}' created successfully as ${allocationStatus.toUpperCase()}.`,
      allocation,
    })
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to create hostel allocation.' })
  }
}

/**
 * List all allocations.
 */
export const getAllocations = async (req, res) => {
  try {
    const allocations = await HostelAllocation.find().sort({ createdAt: -1 })
    res.status(200).json({ allocations })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch allocations.', error: err.message })
  }
}

/**
 * Get single allocation by ID.
 */
export const getAllocationById = async (req, res) => {
  try {
    const allocation = await HostelAllocation.findById(req.params.id)
    if (!allocation) {
      return res.status(404).json({ message: 'Hostel allocation not found.' })
    }

    res.status(200).json({ allocation })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch allocation details.', error: err.message })
  }
}

/**
 * Publish an allocation.
 */
export const publishAllocation = async (req, res) => {
  try {
    const allocation = await HostelAllocation.findById(req.params.id)
    if (!allocation) {
      return res.status(404).json({ message: 'Hostel allocation not found.' })
    }

    if (allocation.status === 'published') {
      return res.status(400).json({ message: 'Allocation is already published.' })
    }

    if (allocation.status === 'closed') {
      return res.status(400).json({ message: 'Closed allocations cannot be republished.' })
    }

    // Check if another published allocation exists
    const activePublished = await HostelAllocation.findOne({ status: 'published', _id: { $ne: allocation._id } })
    if (activePublished) {
      return res.status(409).json({
        message: `An active allocation ('${activePublished.name}') is currently published. Please close it first.`,
      })
    }

    allocation.status = 'published'
    allocation.publishedAt = new Date()
    await allocation.save()

    const io = req.app.get('io')
    if (io) {
      io.emit('hostel:allocation_published', { allocationId: allocation._id, name: allocation.name })
    }

    res.status(200).json({ message: `Hostel allocation '${allocation.name}' is now PUBLISHED.`, allocation })
  } catch (err) {
    res.status(500).json({ message: 'Failed to publish allocation.', error: err.message })
  }
}

/**
 * Close an allocation.
 */
export const closeAllocation = async (req, res) => {
  try {
    const allocation = await HostelAllocation.findById(req.params.id)
    if (!allocation) {
      return res.status(404).json({ message: 'Hostel allocation not found.' })
    }

    if (allocation.status === 'closed') {
      return res.status(400).json({ message: 'Allocation is already closed.' })
    }

    allocation.status = 'closed'
    allocation.closedAt = new Date()
    await allocation.save()

    const io = req.app.get('io')
    if (io) {
      io.emit('hostel:allocation_closed', { allocationId: allocation._id, name: allocation.name })
    }

    res.status(200).json({ message: `Hostel allocation '${allocation.name}' is now CLOSED.`, allocation })
  } catch (err) {
    res.status(500).json({ message: 'Failed to close allocation.', error: err.message })
  }
}

/**
 * Delete a draft allocation.
 */
export const deleteAllocation = async (req, res) => {
  try {
    const allocation = await HostelAllocation.findById(req.params.id)
    if (!allocation) {
      return res.status(404).json({ message: 'Hostel allocation not found.' })
    }

    if (allocation.status !== 'draft') {
      return res.status(400).json({ message: 'Only DRAFT allocations can be deleted.' })
    }

    await HostelRoom.deleteMany({ allocationId: allocation._id })
    await HostelAllocation.findByIdAndDelete(allocation._id)

    res.status(200).json({ message: 'Draft allocation deleted successfully.' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete allocation.', error: err.message })
  }
}

/**
 * Get detailed block-wise & floor-wise occupancy statistics for an allocation.
 */
export const getAllocationOccupancy = async (req, res) => {
  try {
    const allocation = await HostelAllocation.findById(req.params.id)
    if (!allocation) {
      return res.status(404).json({ message: 'Hostel allocation not found.' })
    }

    const rooms = await HostelRoom.find({ allocationId: allocation._id })

    const blockStats = allocation.blocks.map((block) => {
      const bRooms = rooms.filter((r) => r.blockNumber === block.blockNumber)
      const studentRooms = bRooms.filter((r) => !r.isRcRoom)
      const rcRoom = bRooms.find((r) => r.isRcRoom)

      let blockOccupied = 0
      studentRooms.forEach((r) => {
        blockOccupied += r.occupiedCount
      })

      const floorStats = []
      for (let f = 0; f < block.floorCount; f++) {
        const fRooms = studentRooms.filter((r) => r.floorNumber === f)
        let fOccupied = 0
        let fCapacity = 0
        fRooms.forEach((r) => {
          fOccupied += r.occupiedCount
          fCapacity += r.capacity
        })
        floorStats.push({
          floorNumber: f,
          floorName: f === 0 ? 'Ground Floor' : `Floor ${f}`,
          totalRooms: fRooms.length,
          capacity: fCapacity,
          occupied: fOccupied,
          available: fCapacity - fOccupied,
        })
      }

      return {
        blockNumber: block.blockNumber,
        blockName: block.blockName,
        totalRooms: block.totalStudentRooms,
        capacity: block.totalStudentCapacity,
        occupied: blockOccupied,
        available: block.totalStudentCapacity - blockOccupied,
        rcRoomName: rcRoom ? rcRoom.roomNumber : `Block ${block.blockNumber} RC Room`,
        floors: floorStats,
      }
    })

    res.status(200).json({
      allocationId: allocation._id,
      name: allocation.name,
      status: allocation.status,
      summary: {
        totalBlocks: allocation.totalBlocks,
        totalRooms: allocation.totalRooms,
        totalCapacity: allocation.totalCapacity,
        occupied: allocation.occupiedCount,
        available: allocation.totalCapacity - allocation.occupiedCount,
      },
      blocks: blockStats,
    })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch occupancy stats.', error: err.message })
  }
}

/**
 * Get student bookings for an allocation.
 */
export const getAllocationBookings = async (req, res) => {
  try {
    const { id } = req.params
    const { block, room, search } = req.query

    const filter = { allocationId: id, status: 'active' }
    if (block) filter.blockNumber = Number(block)
    if (room) filter.roomNumber = room.toString().trim()

    let bookings = await HostelBooking.find(filter).sort({ createdAt: -1 })

    if (search && search.trim()) {
      const q = search.trim().toLowerCase()
      bookings = bookings.filter((b) => {
        const text = `${b.studentName} ${b.studentEmail} ${b.registerNo} ${b.roomNumber} ${b.slotCode}`.toLowerCase()
        return text.includes(q)
      })
    }

    res.status(200).json({ count: bookings.length, bookings })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch bookings.', error: err.message })
  }
}

/* ========================================================================== */
/* STUDENT CONTROLLERS                                                        */
/* ========================================================================== */

/**
 * Get active published allocation.
 */
export const getActiveAllocation = async (req, res) => {
  try {
    const activeAllocation = await HostelAllocation.findOne({ status: 'published' })
    if (!activeAllocation) {
      return res.status(200).json({ allocation: null, message: 'No hostel allocation is currently active.' })
    }

    res.status(200).json({ allocation: activeAllocation })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch active allocation.', error: err.message })
  }
}

/**
 * Get student's current active booking.
 */
export const getMyBooking = async (req, res) => {
  try {
    const userIdFromToken = req.user.id || req.user._id
    const userDoc = await User.findById(userIdFromToken)
    if (!userDoc) {
      return res.status(200).json({ booking: null })
    }

    const studentId = userDoc._id

    const booking = await HostelBooking.findOne({ studentId, status: 'active' })
      .populate('allocationId', 'name academicYear status')
      .populate('roomId', 'roomNumber blockNumber floorNumber isRcRoom')

    if (!booking) {
      return res.status(200).json({ booking: null })
    }

    res.status(200).json({ booking })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch student booking.', error: err.message })
  }
}

/**
 * Get rooms for a block & floor.
 */
export const getRooms = async (req, res) => {
  try {
    const { id } = req.params
    const { block, floor } = req.query

    if (block === undefined || floor === undefined) {
      return res.status(400).json({ message: 'Both block and floor query parameters are required.' })
    }

    const rooms = await HostelRoom.find({
      allocationId: id,
      blockNumber: Number(block),
      floorNumber: Number(floor),
    }).sort({ isRcRoom: -1, roomNumber: 1 })

    const roomSummaries = rooms.map((r) => ({
      _id: r._id,
      roomNumber: r.roomNumber,
      blockNumber: r.blockNumber,
      floorNumber: r.floorNumber,
      isRcRoom: r.isRcRoom,
      capacity: r.capacity,
      occupiedCount: r.occupiedCount,
      availableCount: r.isRcRoom ? 0 : r.capacity - r.occupiedCount,
      isFull: r.isRcRoom ? false : r.occupiedCount >= r.capacity,
    }))

    res.status(200).json({ rooms: roomSummaries })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch rooms.', error: err.message })
  }
}

/**
 * Get individual room details & slots.
 */
export const getRoomById = async (req, res) => {
  try {
    const room = await HostelRoom.findById(req.params.roomId)
    if (!room) {
      return res.status(404).json({ message: 'Room not found.' })
    }

    res.status(200).json({ room })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch room slots.', error: err.message })
  }
}

/**
 * Book a slot (Atomic & Concurrency-Safe).
 */
export const bookSlot = async (req, res) => {
  try {
    const { id } = req.params // allocationId
    const { roomId, slotNumber, registerNo, department, year } = req.body

    const userIdFromToken = req.user.id || req.user._id
    const userDoc = await User.findById(userIdFromToken)

    if (!userDoc) {
      return res.status(401).json({ message: 'Authenticated user account not found.' })
    }

    if (userDoc.userType !== 'Student') {
      return res.status(403).json({ message: 'Only authenticated students can book hostel slots.' })
    }

    const studentId = userDoc._id
    const studentName = userDoc.username
    const studentEmail = userDoc.email

    if (!roomId || !slotNumber) {
      return res.status(400).json({ message: 'Room ID and slot number are required.' })
    }

    const slotNum = Number(slotNumber)

    // 1. Verify Allocation is PUBLISHED
    const allocation = await HostelAllocation.findById(id)
    if (!allocation) {
      return res.status(404).json({ message: 'Hostel allocation not found.' })
    }

    if (allocation.status !== 'published') {
      return res.status(400).json({ message: 'Hostel allocation is not currently open for booking.' })
    }

    // 2. Check if student ALREADY has an active booking in this allocation
    const existingBooking = await HostelBooking.findOne({ allocationId: id, studentId, status: 'active' })
    if (existingBooking) {
      return res.status(409).json({
        message: 'You already have a hostel allocation for this academic year.',
      })
    }

    // 3. Verify target room exists & is NOT an RC room
    const targetRoom = await HostelRoom.findById(roomId)
    if (!targetRoom || targetRoom.allocationId.toString() !== id) {
      return res.status(404).json({ message: 'Invalid room specified for this allocation.' })
    }

    if (targetRoom.isRcRoom) {
      return res.status(403).json({ message: 'RC/Warden rooms cannot be booked by students.' })
    }

    if (slotNum < 1 || slotNum > targetRoom.capacity) {
      return res.status(400).json({ message: `Slot number must be between 1 and ${targetRoom.capacity}.` })
    }

    // 4. ATOMIC CONCURRENCY BOOKING UPDATE ON MONGOOSE
    // Atomically find the room with the specific unbooked slot and update it
    const updatedRoom = await HostelRoom.findOneAndUpdate(
      {
        _id: roomId,
        allocationId: id,
        isRcRoom: false,
        slots: {
          $elemMatch: {
            slotNumber: slotNum,
            isBooked: false,
          },
        },
      },
      {
        $set: {
          'slots.$.isBooked': true,
          'slots.$.bookedBy': {
            studentId,
            studentName,
            studentEmail,
            registerNo: registerNo || userDoc.mobileNo || '',
            department: department || '',
            year: year || '',
            bookedAt: new Date(),
          },
        },
        $inc: { occupiedCount: 1 },
      },
      { new: true }
    )

    if (!updatedRoom) {
      return res.status(409).json({
        message: 'Sorry, this slot was just booked by another student.',
      })
    }

    const slotCode = `${targetRoom.roomNumber}-${String.fromCharCode(64 + slotNum)}`

    // 5. Create Booking Document (guarded by compound unique index)
    try {
      const booking = await HostelBooking.create({
        allocationId: id,
        roomId: targetRoom._id,
        roomNumber: targetRoom.roomNumber,
        blockNumber: targetRoom.blockNumber,
        floorNumber: targetRoom.floorNumber,
        slotNumber: slotNum,
        slotCode,
        studentId,
        studentName,
        studentEmail,
        registerNo: registerNo || '',
        department: department || '',
        year: year || '',
        status: 'active',
      })

      // Increment overall allocation occupiedCount
      const updatedAllocation = await HostelAllocation.findByIdAndUpdate(
        id,
        { $inc: { occupiedCount: 1 } },
        { new: true }
      )

      // Emitting Real-Time Socket.IO Event to subscribers
      const io = req.app.get('io')
      if (io) {
        io.emit('hostel:slot_booked', {
          allocationId: id,
          roomId: targetRoom._id,
          roomNumber: targetRoom.roomNumber,
          blockNumber: targetRoom.blockNumber,
          floorNumber: targetRoom.floorNumber,
          slotNumber: slotNum,
          slotCode,
          occupiedCount: updatedRoom.occupiedCount,
          totalOccupied: updatedAllocation.occupiedCount,
        })
      }

      return res.status(201).json({
        message: 'Hostel slot booked successfully.',
        booking,
      })
    } catch (createErr) {
      // Revert slot reservation if booking creation failed due to duplicate student index
      await HostelRoom.updateOne(
        { _id: roomId, 'slots.slotNumber': slotNum },
        {
          $set: {
            'slots.$.isBooked': false,
            'slots.$.bookedBy': null,
          },
          $inc: { occupiedCount: -1 },
        }
      )

      if (createErr.code === 11000) {
        return res.status(409).json({
          message: 'You already have a hostel allocation for this academic year.',
        })
      }

      throw createErr
    }
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to book slot.' })
  }
}
