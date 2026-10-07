import Broadcast from '../models/Broadcast.js'

/**
 * Helper to sanitize broadcast documents into safe public payload.
 * NEVER leaks createdBy, internal db ids, timestamps other than publish/expire, or admin details.
 */
export const toPublicBroadcastDto = (doc) => ({
  id: doc._id.toString(),
  title: doc.title,
  summary: doc.summary,
  content: doc.content || '',
  type: doc.type,
  priority: doc.priority,
  isPinned: Boolean(doc.isPinned),
  publishAt: doc.publishAt,
  expiresAt: doc.expiresAt,
})

/**
 * Reconcile scheduled broadcasts that have reached publishAt,
 * and published broadcasts that have passed expiresAt.
 * Can be called by background timer or on-demand.
 */
export const reconcileBroadcastLifecycle = async (io = null) => {
  const now = new Date()

  try {
    // 1. Transition SCHEDULED -> PUBLISHED
    const scheduledToPublish = await Broadcast.find({
      status: 'SCHEDULED',
      publishAt: { $lte: now },
    })

    for (const b of scheduledToPublish) {
      // Check if it's already expired even before publishing
      if (b.expiresAt && b.expiresAt <= now) {
        b.status = 'EXPIRED'
      } else {
        b.status = 'PUBLISHED'
        b.publishedAt = now
      }
      await b.save()

      if (io) {
        if (b.status === 'PUBLISHED') {
          io.emit('broadcast:published', toPublicBroadcastDto(b))
        } else if (b.status === 'EXPIRED') {
          io.emit('broadcast:expired', { id: b._id.toString() })
        }
      }
    }

    // 2. Transition PUBLISHED -> EXPIRED if expiresAt is passed
    const publishedToExpire = await Broadcast.find({
      status: 'PUBLISHED',
      expiresAt: { $ne: null, $lte: now },
    })

    for (const b of publishedToExpire) {
      b.status = 'EXPIRED'
      await b.save()

      if (io) {
        io.emit('broadcast:expired', { id: b._id.toString() })
      }
    }
  } catch (error) {
    console.error('❌ Error reconciling broadcast lifecycle:', error.message)
  }
}

/**
 * PUBLIC API: GET /api/broadcasts/public
 * Returns ONLY currently active, published broadcasts safe for before-login home page.
 */
export const getPublicBroadcasts = async (req, res) => {
  try {
    const io = req.app.get('io')
    await reconcileBroadcastLifecycle(io)

    const now = new Date()
    const broadcasts = await Broadcast.find({
      status: 'PUBLISHED',
      publishAt: { $lte: now },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    })
      .sort({ isPinned: -1, publishAt: -1, createdAt: -1 })
      .lean()

    const publicList = broadcasts.map(toPublicBroadcastDto)
    return res.status(200).json({ broadcasts: publicList })
  } catch (error) {
    console.error('Error fetching public broadcasts:', error)
    return res.status(500).json({ message: 'Failed to retrieve public announcements.' })
  }
}

/**
 * ADMIN API: GET /api/broadcasts/admin
 * Returns all broadcasts with summary counts, supports filter & search.
 */
export const getAdminBroadcasts = async (req, res) => {
  try {
    const io = req.app.get('io')
    await reconcileBroadcastLifecycle(io)

    const { status, type, search } = req.query
    const query = {}

    if (status && status !== 'all') {
      query.status = status.toUpperCase()
    }

    if (type && type !== 'all') {
      query.type = type
    }

    if (search && search.trim()) {
      const term = search.trim()
      query.$or = [
        { title: { $regex: term, $options: 'i' } },
        { summary: { $regex: term, $options: 'i' } },
        { content: { $regex: term, $options: 'i' } },
      ]
    }

    const [broadcasts, counts] = await Promise.all([
      Broadcast.find(query).sort({ isPinned: -1, createdAt: -1 }).lean(),
      Broadcast.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ])

    const summary = {
      total: 0,
      published: 0,
      scheduled: 0,
      expired: 0,
      drafts: 0,
      unpublished: 0,
    }

    counts.forEach((item) => {
      summary.total += item.count
      if (item._id === 'PUBLISHED') summary.published = item.count
      if (item._id === 'SCHEDULED') summary.scheduled = item.count
      if (item._id === 'EXPIRED') summary.expired = item.count
      if (item._id === 'DRAFT') summary.drafts = item.count
      if (item._id === 'UNPUBLISHED') summary.unpublished = item.count
    })

    return res.status(200).json({ broadcasts, summary })
  } catch (error) {
    console.error('Error fetching admin broadcasts:', error)
    return res.status(500).json({ message: 'Failed to load broadcasts.' })
  }
}

/**
 * ADMIN API: GET /api/broadcasts/admin/:id
 */
export const getAdminBroadcastById = async (req, res) => {
  try {
    const { id } = req.params
    const broadcast = await Broadcast.findById(id).lean()
    if (!broadcast) {
      return res.status(404).json({ message: 'Broadcast not found.' })
    }
    return res.status(200).json({ broadcast })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch broadcast.' })
  }
}

/**
 * ADMIN API: POST /api/broadcasts
 */
export const createBroadcast = async (req, res) => {
  try {
    const {
      title,
      summary,
      content,
      type = 'General',
      priority = 'Normal',
      publishMode = 'now', // 'now', 'schedule', 'draft'
      publishAt,
      expiresAt,
      isPinned = false,
    } = req.body

    const cleanTitle = title?.toString().trim()
    const cleanSummary = summary?.toString().trim()
    const cleanContent = content?.toString().trim() || ''

    if (!cleanTitle) {
      return res.status(400).json({ message: 'Broadcast title is required.' })
    }
    if (!cleanSummary) {
      return res.status(400).json({ message: 'Broadcast short summary is required.' })
    }

    const validTypes = [
      'General',
      'Hostel Allocation',
      'Important',
      'Deadline',
      'Maintenance',
      'Event',
      'Academic',
      'Other',
    ]
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid announcement type.' })
    }

    const validPriorities = ['Normal', 'Important', 'Urgent']
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority level.' })
    }

    const now = new Date()
    let finalStatus = 'DRAFT'
    let finalPublishAt = now
    let finalExpiresAt = null

    if (expiresAt) {
      const expDate = new Date(expiresAt)
      if (Number.isNaN(expDate.getTime())) {
        return res.status(400).json({ message: 'Invalid expiry date.' })
      }
      finalExpiresAt = expDate
    }

    if (publishMode === 'draft') {
      finalStatus = 'DRAFT'
      finalPublishAt = publishAt ? new Date(publishAt) : now
    } else if (publishMode === 'schedule') {
      if (!publishAt) {
        return res.status(400).json({ message: 'Scheduled date and time is required.' })
      }
      const schedDate = new Date(publishAt)
      if (Number.isNaN(schedDate.getTime())) {
        return res.status(400).json({ message: 'Invalid scheduled publish date.' })
      }
      finalPublishAt = schedDate
      if (finalPublishAt <= now) {
        finalStatus = 'PUBLISHED'
      } else {
        finalStatus = 'SCHEDULED'
      }
    } else {
      // Publish now
      finalStatus = 'PUBLISHED'
      finalPublishAt = now
    }

    if (finalExpiresAt && finalExpiresAt <= finalPublishAt) {
      return res.status(400).json({ message: 'Expiry date/time must be strictly after publish date/time.' })
    }

    const createdBy = req.user?.username || req.user?.email || 'Admin'

    const broadcast = new Broadcast({
      title: cleanTitle,
      summary: cleanSummary,
      content: cleanContent,
      type,
      priority,
      isPinned: Boolean(isPinned),
      status: finalStatus,
      publishAt: finalPublishAt,
      expiresAt: finalExpiresAt,
      publishedAt: finalStatus === 'PUBLISHED' ? now : null,
      createdBy,
    })

    await broadcast.save()

    // Socket.IO real-time notification to public landing page if published immediately
    const io = req.app.get('io')
    if (io && finalStatus === 'PUBLISHED') {
      io.emit('broadcast:published', toPublicBroadcastDto(broadcast))
    }

    return res.status(201).json({
      message:
        finalStatus === 'PUBLISHED'
          ? 'Broadcast published successfully!'
          : finalStatus === 'SCHEDULED'
          ? 'Broadcast scheduled successfully!'
          : 'Broadcast draft saved successfully!',
      broadcast,
    })
  } catch (error) {
    console.error('Error creating broadcast:', error)
    return res.status(500).json({ message: error.message || 'Failed to create broadcast.' })
  }
}

/**
 * ADMIN API: PATCH /api/broadcasts/admin/:id
 */
export const updateBroadcast = async (req, res) => {
  try {
    const { id } = req.params
    const broadcast = await Broadcast.findById(id)
    if (!broadcast) {
      return res.status(404).json({ message: 'Broadcast not found.' })
    }

    const {
      title,
      summary,
      content,
      type,
      priority,
      publishMode,
      publishAt,
      expiresAt,
      isPinned,
    } = req.body

    if (title !== undefined) {
      const cleanTitle = title.toString().trim()
      if (!cleanTitle) return res.status(400).json({ message: 'Title cannot be empty.' })
      broadcast.title = cleanTitle
    }

    if (summary !== undefined) {
      const cleanSummary = summary.toString().trim()
      if (!cleanSummary) return res.status(400).json({ message: 'Summary cannot be empty.' })
      broadcast.summary = cleanSummary
    }

    if (content !== undefined) {
      broadcast.content = content.toString().trim()
    }

    if (type !== undefined) {
      broadcast.type = type
    }

    if (priority !== undefined) {
      broadcast.priority = priority
    }

    if (isPinned !== undefined) {
      broadcast.isPinned = Boolean(isPinned)
    }

    const now = new Date()

    if (expiresAt !== undefined) {
      if (expiresAt === null || expiresAt === '') {
        broadcast.expiresAt = null
      } else {
        const expDate = new Date(expiresAt)
        if (Number.isNaN(expDate.getTime())) {
          return res.status(400).json({ message: 'Invalid expiry date.' })
        }
        broadcast.expiresAt = expDate
      }
    }

    if (publishMode) {
      if (publishMode === 'draft') {
        broadcast.status = 'DRAFT'
      } else if (publishMode === 'schedule') {
        if (!publishAt) {
          return res.status(400).json({ message: 'Scheduled date/time is required.' })
        }
        const schedDate = new Date(publishAt)
        if (Number.isNaN(schedDate.getTime())) {
          return res.status(400).json({ message: 'Invalid scheduled publish date.' })
        }
        broadcast.publishAt = schedDate
        broadcast.status = schedDate <= now ? 'PUBLISHED' : 'SCHEDULED'
        if (broadcast.status === 'PUBLISHED' && !broadcast.publishedAt) {
          broadcast.publishedAt = now
        }
      } else if (publishMode === 'now') {
        broadcast.status = 'PUBLISHED'
        broadcast.publishAt = now
        broadcast.publishedAt = now
      }
    } else if (publishAt !== undefined && publishAt) {
      const schedDate = new Date(publishAt)
      if (!Number.isNaN(schedDate.getTime())) {
        broadcast.publishAt = schedDate
        if (broadcast.status === 'SCHEDULED' && schedDate <= now) {
          broadcast.status = 'PUBLISHED'
          broadcast.publishedAt = now
        }
      }
    }

    if (broadcast.expiresAt && broadcast.expiresAt <= broadcast.publishAt) {
      return res.status(400).json({ message: 'Expiry date/time must be strictly after publish date/time.' })
    }

    await broadcast.save()

    const io = req.app.get('io')
    if (io) {
      if (broadcast.status === 'PUBLISHED') {
        io.emit('broadcast:updated', toPublicBroadcastDto(broadcast))
      } else {
        // If it was changed to draft or scheduled, remove from public home
        io.emit('broadcast:unpublished', { id: broadcast._id.toString() })
      }
    }

    return res.status(200).json({ message: 'Broadcast updated successfully.', broadcast })
  } catch (error) {
    console.error('Error updating broadcast:', error)
    return res.status(500).json({ message: error.message || 'Failed to update broadcast.' })
  }
}

/**
 * ADMIN API: PATCH /api/broadcasts/admin/:id/publish
 */
export const publishBroadcast = async (req, res) => {
  try {
    const { id } = req.params
    const broadcast = await Broadcast.findById(id)
    if (!broadcast) {
      return res.status(404).json({ message: 'Broadcast not found.' })
    }

    const now = new Date()
    broadcast.status = 'PUBLISHED'
    broadcast.publishAt = now
    broadcast.publishedAt = now

    // Check if expired
    if (broadcast.expiresAt && broadcast.expiresAt <= now) {
      return res.status(400).json({ message: 'Cannot publish a broadcast whose expiry date has already passed. Update expiry first.' })
    }

    await broadcast.save()

    const io = req.app.get('io')
    if (io) {
      io.emit('broadcast:published', toPublicBroadcastDto(broadcast))
    }

    return res.status(200).json({ message: 'Broadcast published successfully!', broadcast })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to publish broadcast.' })
  }
}

/**
 * ADMIN API: PATCH /api/broadcasts/admin/:id/unpublish
 */
export const unpublishBroadcast = async (req, res) => {
  try {
    const { id } = req.params
    const broadcast = await Broadcast.findById(id)
    if (!broadcast) {
      return res.status(404).json({ message: 'Broadcast not found.' })
    }

    broadcast.status = 'UNPUBLISHED'
    await broadcast.save()

    const io = req.app.get('io')
    if (io) {
      io.emit('broadcast:unpublished', { id: broadcast._id.toString() })
    }

    return res.status(200).json({ message: 'Broadcast unpublished.', broadcast })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to unpublish broadcast.' })
  }
}

/**
 * ADMIN API: DELETE /api/broadcasts/admin/:id
 */
export const deleteBroadcast = async (req, res) => {
  try {
    const { id } = req.params
    const broadcast = await Broadcast.findByIdAndDelete(id)
    if (!broadcast) {
      return res.status(404).json({ message: 'Broadcast not found.' })
    }

    const io = req.app.get('io')
    if (io) {
      io.emit('broadcast:deleted', { id: broadcast._id.toString() })
    }

    return res.status(200).json({ message: 'Broadcast deleted successfully.' })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete broadcast.' })
  }
}
