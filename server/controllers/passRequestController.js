export const rejectPassRequest = async (req, res) => {
  try {
    const { requestId } = req.params
    const rcUsername = req.body.rcUsername?.toString().trim() ?? ''
    const actorName = req.body.actorName?.toString().trim() ?? rcUsername

    if (!actorName) {
      return res.status(400).json({ message: 'RC username is required to reject.' })
    }

    const passRequest = await PassRequest.findById(requestId)

    if (!passRequest) {
      return res.status(404).json({ message: 'Pass request not found.' })
    }

    if (passRequest.authorizedRc !== rcUsername) {
      return res.status(403).json({ message: 'You can only reject students mapped to your RC account.' })
    }

    if (passRequest.status === 'rejected') {
      return res.status(200).json({ message: 'Pass request is already rejected.', passRequest })
    }

    passRequest.status = 'rejected'
    passRequest.approvedAt = ''
    passRequest.approvedBy = ''
    passRequest.rejectedBy = actorName
    passRequest.rejectedAt = new Date().toISOString()
    await passRequest.save()

    const io = req.app.get('io')
    if (io) {
      io.to(`rc:${passRequest.authorizedRc}`).emit('pass:updated', passRequest)
      io.to(`student:${passRequest.studentEmail}`).emit('pass:updated', passRequest)
    }

    return res.status(200).json({ message: 'Pass rejected successfully.', passRequest })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to reject pass request.', error: error.message })
  }
}
import PassRequest from '../models/PassRequest.js'

export const createPassRequest = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      studentEmail: req.body.studentEmail?.trim().toLowerCase() ?? '',
      studentUsername: req.body.studentUsername?.trim() ?? '',
      authorizedRc: req.body.authorizedRc?.trim() ?? '',
      reason: req.body.reason?.trim() ?? '',
      phoneNo: req.body.phoneNo?.trim() ?? '',
      guardianPhoneNo: req.body.guardianPhoneNo?.trim() ?? '',
      status: 'pending',
      approvedAt: '',
      approvedBy: '',
      rejectedBy: '',
      rejectedAt: '',
    }

    if (!payload.studentEmail || !payload.studentUsername || !payload.authorizedRc) {
      return res.status(400).json({ message: 'Student identity and authorized RC are required.' })
    }

    if (!payload.reason) {
      return res.status(400).json({ message: 'Reason is required.' })
    }

    if (!/^[0-9]{10}$/.test(payload.phoneNo) || !/^[0-9]{10}$/.test(payload.guardianPhoneNo)) {
      return res.status(400).json({ message: 'Phone numbers must be exactly 10 digits.' })
    }

    const passRequest = await PassRequest.create(payload)

    const io = req.app.get('io')
    if (io) {
      io.to(`rc:${passRequest.authorizedRc}`).emit('pass:new', passRequest)
      io.to(`student:${passRequest.studentEmail}`).emit('pass:new', passRequest)
    }

    return res.status(201).json({ message: 'Pass application submitted successfully.', passRequest })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to submit pass request.', error: error.message })
  }
}

export const getPassRequestsForRc = async (req, res) => {
  try {
    const { rcUsername } = req.params

    const requests = await PassRequest.find({ authorizedRc: rcUsername.trim() }).sort({ createdAt: -1 })
    return res.status(200).json({ requests })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch pass requests.', error: error.message })
  }
}

export const getPassRequestsForStudent = async (req, res) => {
  try {
    const paramEmail = req.params.studentEmail ?? ''
    const queryEmail = req.query.email?.toString() ?? ''
    const queryUsername = req.query.username?.toString() ?? ''

    const normalizedEmail = (paramEmail || queryEmail).trim().toLowerCase()
    const normalizedUsername = queryUsername.trim()

    if (!normalizedEmail && !normalizedUsername) {
      return res.status(400).json({ message: 'Student email or username is required.' })
    }

    const filter = normalizedEmail
      ? { studentEmail: normalizedEmail }
      : { studentUsername: normalizedUsername }

    const requests = await PassRequest.find(filter).sort({ createdAt: -1 })
    return res.status(200).json({ requests })
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Failed to fetch student pass requests.', error: error.message })
  }
}

export const approvePassRequest = async (req, res) => {
  try {
    const { requestId } = req.params
    const rcUsername = req.body.rcUsername?.toString().trim() ?? ''
    const actorName = req.body.actorName?.toString().trim() ?? rcUsername

    if (!actorName) {
      return res.status(400).json({ message: 'RC username is required to approve.' })
    }

    const passRequest = await PassRequest.findById(requestId)

    if (!passRequest) {
      return res.status(404).json({ message: 'Pass request not found.' })
    }

    if (passRequest.authorizedRc !== rcUsername) {
      return res.status(403).json({ message: 'You can only approve students mapped to your RC account.' })
    }

    if (passRequest.status === 'approved') {
      return res.status(200).json({ message: 'Pass request is already approved.', passRequest })
    }

    passRequest.status = 'approved'
    passRequest.approvedAt = new Date().toISOString()
    passRequest.approvedBy = actorName
    passRequest.rejectedBy = ''
    passRequest.rejectedAt = ''
    await passRequest.save()

    const io = req.app.get('io')
    if (io) {
      io.to(`rc:${passRequest.authorizedRc}`).emit('pass:updated', passRequest)
      io.to(`student:${passRequest.studentEmail}`).emit('pass:updated', passRequest)
    }

    return res.status(200).json({ message: 'Pass approved successfully.', passRequest })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to approve pass request.', error: error.message })
  }
}
