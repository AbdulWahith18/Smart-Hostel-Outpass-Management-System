import mongoose from 'mongoose'
import Complaint from '../models/Complaint.js'
import User from '../models/User.js'
import HostelBooking from '../models/HostelBooking.js'

const ALLOWED_CATEGORIES = [
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

const ALLOWED_PRIORITIES = ['Low', 'Medium', 'High']
const ALLOWED_STATUSES = ['OPEN', 'IN PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED']

/**
 * Generate unique human-readable Complaint ID e.g. CMP-2026-0001
 */
const generateNextComplaintId = async () => {
  const year = new Date().getFullYear()
  const prefix = `CMP-${year}-`

  const latest = await Complaint.findOne({ complaintId: new RegExp(`^${prefix}`) })
    .sort({ createdAt: -1 })
    .exec()

  let seq = 1
  if (latest && latest.complaintId) {
    const parts = latest.complaintId.split('-')
    const lastSeq = parseInt(parts[parts.length - 1], 10)
    if (!Number.isNaN(lastSeq) && lastSeq > 0) {
      seq = lastSeq + 1
    }
  }

  const paddedSeq = String(seq).padStart(4, '0')
  return `${prefix}${paddedSeq}`
}

/**
 * Create a new complaint (Student or RC)
 */
export const createComplaint = async (req, res) => {
  try {
    const { category, title, description, priority, block, floor, room } = req.body

    const userId = req.user.id || req.user._id
    const userDoc = await User.findById(userId)

    if (!userDoc) {
      return res.status(401).json({ message: 'Authenticated user account not found.' })
    }

    if (userDoc.userType !== 'Student' && userDoc.userType !== 'RC') {
      return res.status(403).json({ message: 'Only Students and RCs can submit complaints.' })
    }

    if (!category || !ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: 'Please select a valid complaint category.' })
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Complaint title is required.' })
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Complaint description is required.' })
    }

    const complaintPriority = ALLOWED_PRIORITIES.includes(priority) ? priority : 'Medium'

    // Auto-detect room booking details if not supplied
    let blockVal = (block || '').trim()
    let floorVal = (floor || '').trim()
    let roomVal = (room || '').trim()

    if ((!blockVal || blockVal === '-') && userDoc.userType === 'Student') {
      const activeBooking = await HostelBooking.findOne({ studentId: userDoc._id, status: 'active' })
      if (activeBooking) {
        blockVal = `Block ${activeBooking.blockNumber}`
        floorVal = `Floor ${activeBooking.floorNumber}`
        roomVal = activeBooking.roomNumber
      }
    }

    const complaintId = await generateNextComplaintId()
    const complainantName = userDoc.username || userDoc.name || userDoc.email
    const complainantEmail = userDoc.email.toLowerCase()

    const newComplaint = await Complaint.create({
      complaintId,
      complainantId: userDoc._id,
      complainantName,
      complainantEmail,
      complainantRole: userDoc.userType,
      category,
      title: title.trim(),
      description: description.trim(),
      priority: complaintPriority,
      block: blockVal || '-',
      floor: floorVal || '-',
      room: roomVal || '-',
      status: 'OPEN',
      statusHistory: [
        {
          status: 'OPEN',
          changedBy: complainantName,
          changedByRole: userDoc.userType,
          note: 'Complaint submitted',
          timestamp: new Date(),
        },
      ],
    })

    const io = req.app.get('io')
    if (io) {
      io.to('admin:all').emit('complaint:created', {
        complaintId: newComplaint.complaintId,
        title: newComplaint.title,
        category: newComplaint.category,
        complainantName: newComplaint.complainantName,
        createdAt: newComplaint.createdAt,
      })
    }

    res.status(201).json({
      message: `Complaint ${newComplaint.complaintId} submitted successfully.`,
      complaint: newComplaint,
    })
  } catch (err) {
    console.error('Create Complaint Error:', err)
    res.status(500).json({ message: err.message || 'Failed to create complaint.' })
  }
}

/**
 * Get complaints created by logged-in Student or RC
 */
export const getMyComplaints = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id
    const { status, category, priority, search } = req.query

    const filter = { complainantId: userId }

    if (status && status !== 'ALL') {
      filter.status = status
    }
    if (category && category !== 'ALL') {
      filter.category = category
    }
    if (priority && priority !== 'ALL') {
      filter.priority = priority
    }

    let complaints = await Complaint.find(filter).sort({ createdAt: -1 })

    if (search && search.trim()) {
      const q = search.trim().toLowerCase()
      complaints = complaints.filter(
        (c) =>
          c.complaintId.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.room.toLowerCase().includes(q)
      )
    }

    res.status(200).json({ count: complaints.length, complaints })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch your complaints.', error: err.message })
  }
}

/**
 * Get single complaint by ID (MongoDB _id or complaintId string)
 */
export const getComplaintById = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id || req.user._id
    const userRole = req.user.userType

    let complaint = null
    if (mongoose.Types.ObjectId.isValid(id)) {
      complaint = await Complaint.findById(id)
    }
    if (!complaint) {
      complaint = await Complaint.findOne({ complaintId: id })
    }

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' })
    }

    if (userRole !== 'Admin' && complaint.complainantId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You are not authorized to view this complaint.' })
    }

    res.status(200).json({ complaint })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch complaint details.', error: err.message })
  }
}

/**
 * Reopen a resolved or closed complaint (Student / RC / Admin)
 */
export const reopenComplaint = async (req, res) => {
  try {
    const { id } = req.params
    const { note } = req.body
    const userId = req.user.id || req.user._id
    const userRole = req.user.userType

    let complaint = null
    if (mongoose.Types.ObjectId.isValid(id)) {
      complaint = await Complaint.findById(id)
    }
    if (!complaint) {
      complaint = await Complaint.findOne({ complaintId: id })
    }

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' })
    }

    if (userRole !== 'Admin' && complaint.complainantId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You are not authorized to modify this complaint.' })
    }

    if (complaint.status !== 'RESOLVED' && complaint.status !== 'CLOSED') {
      return res.status(400).json({ message: `Only RESOLVED or CLOSED complaints can be reopened. Current status is ${complaint.status}.` })
    }

    complaint.status = 'REOPENED'
    complaint.statusHistory.push({
      status: 'REOPENED',
      changedBy: req.user.username || req.user.email,
      changedByRole: userRole,
      note: note?.trim() || 'Issue reported still unresolved by user.',
      timestamp: new Date(),
    })

    await complaint.save()

    const io = req.app.get('io')
    if (io) {
      const roomKey = complaint.complainantRole === 'Student' ? `student:${complaint.complainantEmail.toLowerCase()}` : `rc:${complaint.complainantName.trim()}`
      const payload = {
        complaintId: complaint.complaintId,
        status: 'REOPENED',
        updatedBy: req.user.username || req.user.email,
        complaint,
      }
      io.to(roomKey).emit('complaint:status_updated', payload)
      if (complaint.complainantRole === 'RC') {
        io.to(`rc:${complaint.complainantEmail.toLowerCase()}`).emit('complaint:status_updated', payload)
      }
      io.to('admin:all').emit('complaint:status_updated', payload)
    }

    res.status(200).json({
      message: `Complaint ${complaint.complaintId} has been REOPENED.`,
      complaint,
    })
  } catch (err) {
    res.status(500).json({ message: 'Failed to reopen complaint.', error: err.message })
  }
}

/**
 * Admin: Get all complaints across students & RCs with summary metrics
 */
export const getAllComplaintsAdmin = async (req, res) => {
  try {
    const { status, category, priority, role, search } = req.query

    const filter = {}
    if (status && status !== 'ALL') filter.status = status
    if (category && category !== 'ALL') filter.category = category
    if (priority && priority !== 'ALL') filter.priority = priority
    if (role && role !== 'ALL') filter.complainantRole = role

    let complaints = await Complaint.find(filter).sort({ createdAt: -1 })

    if (search && search.trim()) {
      const q = search.trim().toLowerCase()
      complaints = complaints.filter(
        (c) =>
          c.complaintId.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.complainantName.toLowerCase().includes(q) ||
          c.complainantEmail.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.room.toLowerCase().includes(q) ||
          c.block.toLowerCase().includes(q)
      )
    }

    const allDocs = await Complaint.find()
    const summary = {
      total: allDocs.length,
      open: allDocs.filter((c) => c.status === 'OPEN').length,
      inProgress: allDocs.filter((c) => c.status === 'IN PROGRESS').length,
      resolved: allDocs.filter((c) => c.status === 'RESOLVED').length,
      closed: allDocs.filter((c) => c.status === 'CLOSED').length,
      reopened: allDocs.filter((c) => c.status === 'REOPENED').length,
      highPriority: allDocs.filter((c) => c.priority === 'High' && c.status !== 'RESOLVED' && c.status !== 'CLOSED').length,
    }

    res.status(200).json({ summary, count: complaints.length, complaints })
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch complaints list.', error: err.message })
  }
}

/**
 * Admin: Update complaint status
 */
export const updateComplaintStatusAdmin = async (req, res) => {
  try {
    const { id } = req.params
    const { status, note } = req.body

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}` })
    }

    let complaint = null
    if (mongoose.Types.ObjectId.isValid(id)) {
      complaint = await Complaint.findById(id)
    }
    if (!complaint) {
      complaint = await Complaint.findOne({ complaintId: id })
    }

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' })
    }

    const previousStatus = complaint.status
    complaint.status = status

    if (status === 'RESOLVED') {
      complaint.resolvedAt = new Date()
    }
    if (status === 'CLOSED') {
      complaint.closedAt = new Date()
    }

    complaint.statusHistory.push({
      status,
      changedBy: req.user.username || req.user.email || 'Admin',
      changedByRole: 'Admin',
      note: note?.trim() || `Status updated from ${previousStatus} to ${status}`,
      timestamp: new Date(),
    })

    await complaint.save()

    const io = req.app.get('io')
    if (io) {
      const roomKey = complaint.complainantRole === 'Student' ? `student:${complaint.complainantEmail.toLowerCase()}` : `rc:${complaint.complainantName.trim()}`
      const payload = {
        complaintId: complaint.complaintId,
        status: complaint.status,
        updatedBy: req.user.username || req.user.email || 'Admin',
        complaint,
      }
      io.to(roomKey).emit('complaint:status_updated', payload)
      if (complaint.complainantRole === 'RC') {
        io.to(`rc:${complaint.complainantEmail.toLowerCase()}`).emit('complaint:status_updated', payload)
      }
      io.to('admin:all').emit('complaint:status_updated', payload)
    }

    res.status(200).json({
      message: `Complaint ${complaint.complaintId} status updated to '${status}'.`,
      complaint,
    })
  } catch (err) {
    res.status(500).json({ message: 'Failed to update complaint status.', error: err.message })
  }
}

/**
 * Admin: Add response / resolution note to complaint
 */
export const addAdminResponse = async (req, res) => {
  try {
    const { id } = req.params
    const { adminResponse } = req.body

    if (!adminResponse || !adminResponse.trim()) {
      return res.status(400).json({ message: 'Admin response note cannot be empty.' })
    }

    let complaint = null
    if (mongoose.Types.ObjectId.isValid(id)) {
      complaint = await Complaint.findById(id)
    }
    if (!complaint) {
      complaint = await Complaint.findOne({ complaintId: id })
    }

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' })
    }

    const adminName = req.user.username || req.user.email || 'Admin'
    complaint.adminResponse = adminResponse.trim()
    complaint.adminRespondedBy = adminName
    complaint.adminRespondedAt = new Date()

    // Automatically advance OPEN complaint to IN PROGRESS when Admin responds
    if (complaint.status === 'OPEN') {
      complaint.status = 'IN PROGRESS'
    }

    complaint.statusHistory.push({
      status: complaint.status,
      changedBy: adminName,
      changedByRole: 'Admin',
      note: `Admin Response Added: ${adminResponse.trim()}`,
      timestamp: new Date(),
    })

    await complaint.save()

    const io = req.app.get('io')
    if (io) {
      const roomKey = complaint.complainantRole === 'Student' ? `student:${complaint.complainantEmail.toLowerCase()}` : `rc:${complaint.complainantName.trim()}`
      const payload = {
        complaintId: complaint.complaintId,
        adminResponse: complaint.adminResponse,
        adminRespondedBy: adminName,
        status: complaint.status,
        complaint,
      }
      io.to(roomKey).emit('complaint:response_added', payload)
      if (complaint.complainantRole === 'RC') {
        io.to(`rc:${complaint.complainantEmail.toLowerCase()}`).emit('complaint:response_added', payload)
      }
      io.to('admin:all').emit('complaint:response_added', payload)
    }

    res.status(200).json({
      message: `Response added to Complaint ${complaint.complaintId}.`,
      complaint,
    })
  } catch (err) {
    res.status(500).json({ message: 'Failed to add admin response.', error: err.message })
  }
}
