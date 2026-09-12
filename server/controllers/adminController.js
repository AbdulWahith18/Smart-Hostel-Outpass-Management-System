import User from '../models/User.js'
import PassRequest from '../models/PassRequest.js'
import AnalyticsSnapshot from '../models/AnalyticsSnapshot.js'
import {
  answerAdminAnalyticsQuestion,
  generateAnalyticsSummary,
  getSimpleAdminChatResponse,
} from '../services/analyticsService.js'

const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const INACTIVITY_DAYS = 60
const SNAPSHOT_STALE_HOURS = 6

const deactivateInactiveUsers = async () => {
  const cutoffDate = new Date(Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000)

  await User.updateMany(
    {
      userType: { $in: ['Student', 'RC'] },
      status: 'active',
      $or: [
        { lastLogin: { $lt: cutoffDate } },
        { lastLogin: null, createdAt: { $lt: cutoffDate } },
      ],
    },
    {
      $set: { status: 'inactive' },
    }
  )
}

const buildDashboardAnalyticsData = async () => {
  const [users, requests] = await Promise.all([
    User.find({ userType: { $in: ['Student', 'RC'] } }).select('userType').lean(),
    PassRequest.find({}).select('status studentUsername createdAt').lean(),
  ])

  const studentCount = users.filter((user) => user.userType === 'Student').length
  const rcCount = users.filter((user) => user.userType === 'RC').length
  const totalUsers = users.length

  const totalRequests = requests.length
  const approvedCount = requests.filter((request) => request.status === 'approved').length
  const rejectedCount = requests.filter((request) => request.status === 'rejected').length
  const pendingCount = requests.filter((request) => request.status === 'pending').length

  const dayCountsMap = new Map()
  const dateCountsMap = new Map()

  for (const request of requests) {
    const date = new Date(request.createdAt)
    if (Number.isNaN(date.getTime())) {
      continue
    }

    const dayName = weekdayNames[date.getDay()]
    const dateKey = date.toISOString().slice(0, 10)
    dayCountsMap.set(dayName, (dayCountsMap.get(dayName) ?? 0) + 1)
    dateCountsMap.set(dateKey, (dateCountsMap.get(dateKey) ?? 0) + 1)
  }

  const dayCounts = [...dayCountsMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([dayName, count]) => `${dayName}: ${count}`)

  const dateCounts = [...dateCountsMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dateKey, count]) => `${dateKey}: ${count}`)

  const mostFrequentDay = dayCounts[0]?.split(':')[0] ?? 'No requests yet'

  const applicantCounts = new Map()
  for (const request of requests) {
    const username = request.studentUsername?.toString().trim()
    if (!username) {
      continue
    }

    applicantCounts.set(username, (applicantCounts.get(username) ?? 0) + 1)
  }

  const topApplicantsEntries = [...applicantCounts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  const frequentApplicants = topApplicantsEntries.map(([username, count]) => `${username} (${count})`).join(', ') || 'None'

  const analyticsData = {
    totalUsers,
    studentCount,
    rcCount,
    totalRequests,
    approvedCount,
    rejectedCount,
    pendingCount,
    mostFrequentDay,
    frequentApplicants,
  }

  return {
    analyticsData,
    dayCounts,
    dateCounts,
    topApplicants: frequentApplicants,
  }
}

const parseInsights = (summaryText) => {
  const lines = summaryText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const normalizedInsights = lines
    .map((line) => line.replace(/^[-*\u2022]\s*/, '').replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean)

  if (normalizedInsights.length > 0) {
    return normalizedInsights.slice(0, 5)
  }

  return [summaryText.trim()].filter(Boolean)
}

const generateAndStoreAnalyticsSnapshot = async () => {
  const { analyticsData } = await buildDashboardAnalyticsData()
  const summaryText = await generateAnalyticsSummary(analyticsData)
  const insights = parseInsights(summaryText)

  const generatedAt = new Date()
  const snapshotPayload = {
    key: 'global',
    insights,
    summaryText,
    analyticsData,
    generatedAt,
  }

  await AnalyticsSnapshot.findOneAndUpdate({ key: 'global' }, snapshotPayload, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  })

  return {
    insights,
    summaryText,
    analyticsData,
    generatedAt: generatedAt.toISOString(),
  }
}

export const getAllUsers = async (_req, res) => {
  try {
    await deactivateInactiveUsers()

    const users = await User.find({ userType: { $in: ['Student', 'RC'] } })
      .select('username email userType mobileNo status lastLogin createdAt')
      .sort({ createdAt: -1 })

    return res.status(200).json({ users })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch users.', error: error.message })
  }
}

export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params
    const requestedStatus = req.body?.status?.toString().trim().toLowerCase()

    if (!['active', 'inactive'].includes(requestedStatus)) {
      return res.status(400).json({ message: 'Status must be active or inactive.' })
    }

    const user = await User.findOne({ _id: id, userType: { $in: ['Student', 'RC'] } })

    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }

    user.status = requestedStatus
    await user.save()

    return res.status(200).json({
      message: 'User status updated successfully',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        userType: user.userType,
        mobileNo: user.mobileNo,
        status: user.status,
        lastLogin: user.lastLogin,
      },
    })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update user status.', error: error.message })
  }
}

export const deleteUserById = async (req, res) => {
  try {
    const { id } = req.params

    const deletedUser = await User.findOneAndDelete({ _id: id, userType: { $in: ['Student', 'RC'] } })

    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found.' })
    }

    return res.status(200).json({ message: 'User deleted successfully.' })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete user.', error: error.message })
  }
}

export const getAiAnalyticsSummary = async (_req, res) => {
  try {
    const snapshot = await generateAndStoreAnalyticsSnapshot()
    return res.status(200).json(snapshot)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to generate AI analytics.', error: error.message })
  }
}

export const askAiAnalyticsQuestion = async (req, res) => {
  try {
    const question = req.body?.question?.toString().trim() ?? ''

    if (!question) {
      return res.status(400).json({ message: 'Question is required.' })
    }

    const simpleResponse = getSimpleAdminChatResponse(question)
    if (simpleResponse) {
      return res.status(200).json({
        answer: simpleResponse,
        contextMeta: {
          generatedAt: new Date().toISOString(),
          mode: 'simple-response',
        },
      })
    }

    const { analyticsData, dayCounts, dateCounts, topApplicants } = await buildDashboardAnalyticsData()
    const dateCountsLimited = dateCounts.slice(-45).join(', ')
    const dayCountsText = dayCounts.join(', ')

    const answer = await answerAdminAnalyticsQuestion({
      question,
      stats: analyticsData,
      dayCounts: dayCountsText,
      dateCounts: dateCountsLimited,
      topApplicants,
    })

    const firstDate = dateCounts[0]?.split(':')[0] ?? 'N/A'
    const lastDate = dateCounts[dateCounts.length - 1]?.split(':')[0] ?? 'N/A'
    const contextMeta = {
      generatedAt: new Date().toISOString(),
      totalUsers: analyticsData.totalUsers,
      studentCount: analyticsData.studentCount,
      rcCount: analyticsData.rcCount,
      totalRequests: analyticsData.totalRequests,
      approvedCount: analyticsData.approvedCount,
      pendingCount: analyticsData.pendingCount,
      rejectedCount: analyticsData.rejectedCount,
      dateWindow: `${firstDate} to ${lastDate}`,
    }

    return res.status(200).json({ answer, contextMeta })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get AI chat response.', error: error.message })
  }
}

export const getAiAnalyticsSnapshot = async (_req, res) => {
  try {
    const currentSnapshot = await AnalyticsSnapshot.findOne({ key: 'global' }).lean()

    if (!currentSnapshot) {
      const generatedSnapshot = await generateAndStoreAnalyticsSnapshot()
      return res.status(200).json(generatedSnapshot)
    }

    const snapshotAgeMs = Date.now() - new Date(currentSnapshot.generatedAt).getTime()
    const snapshotAgeHours = snapshotAgeMs / (1000 * 60 * 60)

    if (snapshotAgeHours > SNAPSHOT_STALE_HOURS) {
      const refreshedSnapshot = await generateAndStoreAnalyticsSnapshot()
      return res.status(200).json(refreshedSnapshot)
    }

    return res.status(200).json({
      insights: currentSnapshot.insights ?? [],
      summaryText: currentSnapshot.summaryText ?? '',
      analyticsData: currentSnapshot.analyticsData ?? {},
      generatedAt: currentSnapshot.generatedAt,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch AI analytics snapshot.', error: error.message })
  }
}

export const getAdminAccessModeData = async (_req, res) => {
  try {
    const [requests, rcUsers] = await Promise.all([
      PassRequest.find({})
        .select(
          'studentUsername name registerNo authorizedRc status reason leaveDateTime returnDateTime approvedAt approvedBy rejectedAt rejectedBy createdAt'
        )
        .sort({ createdAt: -1 })
        .lean(),
      User.find({ userType: 'RC' }).select('username').lean(),
    ])

    const rcSummaryMap = new Map()
    const rcNameLookup = new Map()

    for (const rcUser of rcUsers) {
      const rcName = rcUser.username?.toString().trim()
      if (!rcName) {
        continue
      }

      rcSummaryMap.set(rcName, {
        rcName,
        total: 0,
        approved: 0,
        rejected: 0,
        pending: 0,
        approvalRate: 0,
      })
      rcNameLookup.set(rcName.toLowerCase(), rcName)
    }

    for (const request of requests) {
      const requestRcName = request.authorizedRc?.toString().trim() || 'Unassigned'
      const normalizedRcName = requestRcName.toLowerCase()
      const rcName = rcNameLookup.get(normalizedRcName) ?? requestRcName

      if (!rcSummaryMap.has(rcName)) {
        rcSummaryMap.set(rcName, {
          rcName,
          total: 0,
          approved: 0,
          rejected: 0,
          pending: 0,
          approvalRate: 0,
        })
      }

      const summary = rcSummaryMap.get(rcName)
      summary.total += 1

      if (request.status === 'approved') {
        summary.approved += 1
      } else if (request.status === 'rejected') {
        summary.rejected += 1
      } else {
        summary.pending += 1
      }
    }

    const rcStatus = [...rcSummaryMap.values()]
      .map((summary) => ({
        ...summary,
        approvalRate: summary.total > 0 ? Math.round((summary.approved / summary.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)

    return res.status(200).json({ requests, rcStatus })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch access mode data.', error: error.message })
  }
}

const resolveDecisionActorName = async (req) => {
  const requestActorName = req.body?.actorName?.toString().trim() ?? ''
  if (requestActorName) {
    return requestActorName
  }

  if (!req.user?.id) {
    return ''
  }

  const authenticatedUser = await User.findById(req.user.id).select('username').lean()
  return authenticatedUser?.username?.toString().trim() ?? ''
}

const applyAdminPassDecision = async (req, res, nextStatus) => {
  try {
    const { requestId } = req.params
    const actorName = await resolveDecisionActorName(req)

    if (!actorName) {
      return res.status(400).json({ message: 'Admin username is required to update pass status.' })
    }

    const passRequest = await PassRequest.findById(requestId)

    if (!passRequest) {
      return res.status(404).json({ message: 'Pass request not found.' })
    }

    passRequest.status = nextStatus

    if (nextStatus === 'approved') {
      passRequest.approvedAt = new Date().toISOString()
      passRequest.approvedBy = actorName
      passRequest.rejectedAt = ''
      passRequest.rejectedBy = ''
    } else {
      passRequest.rejectedAt = new Date().toISOString()
      passRequest.rejectedBy = actorName
      passRequest.approvedAt = ''
      passRequest.approvedBy = ''
    }

    await passRequest.save()

    const io = req.app.get('io')
    if (io) {
      io.to(`rc:${passRequest.authorizedRc}`).emit('pass:updated', passRequest)
      io.to(`student:${passRequest.studentEmail}`).emit('pass:updated', passRequest)
    }

    return res.status(200).json({
      message: nextStatus === 'approved' ? 'Pass approved successfully.' : 'Pass rejected successfully.',
      passRequest,
    })
  } catch (error) {
    return res
      .status(500)
      .json({ message: `Failed to ${nextStatus === 'approved' ? 'approve' : 'reject'} pass request.`, error: error.message })
  }
}

export const approvePassRequestInAccessMode = async (req, res) => applyAdminPassDecision(req, res, 'approved')

export const rejectPassRequestInAccessMode = async (req, res) => applyAdminPassDecision(req, res, 'rejected')

export const getPendingRcRegistrations = async (_req, res) => {
  try {
    const pendingRcs = await User.find({ userType: 'RC', status: 'pending' })
      .select('username email userType mobileNo status createdAt')
      .sort({ createdAt: -1 })
    return res.status(200).json({ pendingRcs })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch pending RC registrations.', error: error.message })
  }
}

export const approveRcRegistration = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findOne({ _id: id, userType: 'RC' })

    if (!user) {
      return res.status(404).json({ message: 'RC user registration not found.' })
    }

    user.status = 'active'
    await user.save()

    const io = req.app.get('io')
    if (io) {
      io.to('admin:all').emit('rc:status_updated', user)
    }

    return res.status(200).json({
      message: 'RC registration approved successfully.',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        userType: user.userType,
        status: user.status,
      },
    })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to approve RC registration.', error: error.message })
  }
}

export const rejectRcRegistration = async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findOne({ _id: id, userType: 'RC' })

    if (!user) {
      return res.status(404).json({ message: 'RC user registration not found.' })
    }

    user.status = 'rejected'
    await user.save()

    const io = req.app.get('io')
    if (io) {
      io.to('admin:all').emit('rc:status_updated', user)
    }

    return res.status(200).json({
      message: 'RC registration rejected.',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        userType: user.userType,
        status: user.status,
      },
    })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to reject RC registration.', error: error.message })
  }
}

