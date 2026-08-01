import Message from '../models/Message.js'
import User from '../models/User.js'

const normalizeText = (value = '') => value?.toString().trim() ?? ''
const normalizeEmail = (value = '') => normalizeText(value).toLowerCase()

const getSocketIoInstance = (req) => req.app.get('io')

const getRoomNamesForMessage = (message) => {
  const rooms = []
  const isGroupMessage = message.chatScope === 'students-rcs' || message.isBroadcast

  if (isGroupMessage) {
    rooms.push('group:students-rcs')
  }

  if (message.senderType === 'Admin' && message.senderEmail) {
    rooms.push(`admin:${message.senderEmail}`)
  }

  if (message.recipientType === 'Admin') {
    rooms.push('admin:all')
    if (message.recipientEmail) {
      rooms.push(`admin:${message.recipientEmail}`)
    }
  }

  if (!isGroupMessage) {
    if (message.senderType === 'Student' && message.senderEmail) {
      rooms.push(`student:${message.senderEmail}`)
    }

    if (message.senderType === 'RC' && message.senderUsername) {
      rooms.push(`rc:${message.senderUsername}`)
    }

    if (message.recipientType === 'Student' && message.recipientEmail) {
      rooms.push(`student:${message.recipientEmail}`)
    }

    if (message.recipientType === 'RC' && message.recipientUsername) {
      rooms.push(`rc:${message.recipientUsername}`)
    }
  }

  return [...new Set(rooms)]
}

export const getMessagesForUser = async (req, res) => {
  try {
    const { userType = '', email = '' } = req.query
    const normalizedUserType = normalizeText(userType)
    const normalizedEmail = normalizeEmail(email)

    if (!normalizedUserType || !normalizedEmail) {
      return res.status(400).json({ message: 'User type and email are required.' })
    }

    const query =
      normalizedUserType === 'Admin'
        ? {
            $or: [{ chatScope: 'students-rcs' }, { senderEmail: normalizedEmail }, { recipientEmail: normalizedEmail }, { senderType: 'Admin' }, { recipientType: 'Admin' }],
          }
        : {
            $or: [
              { chatScope: 'students-rcs', isBroadcast: false },
              { senderEmail: normalizedEmail },
              { recipientEmail: normalizedEmail },
              { isBroadcast: true, recipientEmail: normalizedEmail },
            ],
          }

    const messages = await Message.find(query).sort({ createdAt: 1 })

    const filteredMessages = messages.filter((message) => {
      if (normalizedUserType === 'Student' || normalizedUserType === 'RC') {
        const senderIsCurrentUser = message.senderEmail === normalizedEmail
        const recipientIsCurrentUser = message.recipientEmail === normalizedEmail
        const isGroupChatMessage = message.chatScope === 'students-rcs' && !message.isBroadcast
        const isBroadcastForCurrentUser = message.isBroadcast && recipientIsCurrentUser
        const isDirectMessageToCurrentUser = message.chatScope !== 'private-admin' && (senderIsCurrentUser || recipientIsCurrentUser)

        return isGroupChatMessage || isBroadcastForCurrentUser || isDirectMessageToCurrentUser
      }

      if (normalizedUserType === 'Admin') {
        return message.recipientType === 'Admin' || message.senderType === 'Admin' || message.chatScope === 'students-rcs'
      }

      return true
    })

    return res.status(200).json({ messages: filteredMessages })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load messages.', error: error.message })
  }
}

export const sendMessage = async (req, res) => {
  try {
    const senderUser = await User.findById(req.user?.id).select('userType username email authorizedRc')

    if (!senderUser) {
      return res.status(404).json({ message: 'Sender account not found.' })
    }

    const {
      content = '',
      subject = '',
      recipientType: requestedRecipientType = '',
      recipientEmail: requestedRecipientEmail = '',
    } = req.body

    const normalizedContent = normalizeText(content)
    const normalizedSubject = normalizeText(subject)
    const normalizedRecipientType = normalizeText(requestedRecipientType)
    const normalizedRecipientEmail = normalizeEmail(requestedRecipientEmail)

    if (!normalizedContent) {
      return res.status(400).json({ message: 'Message content is required.' })
    }

    const isDirectMessageToAdmin = ['Student', 'RC'].includes(senderUser.userType) && normalizedRecipientType === 'Admin'
    const isGroupChatMessage = ['Student', 'RC'].includes(senderUser.userType) && !isDirectMessageToAdmin

    const message = await Message.create({
      senderType: senderUser.userType,
      senderName: senderUser.username,
      senderEmail: senderUser.email,
      senderUsername: senderUser.username,
      recipientType: isDirectMessageToAdmin ? 'Admin' : senderUser.userType === 'Student' ? 'Student' : 'RC',
      recipientName: '',
      recipientEmail: isDirectMessageToAdmin ? normalizedRecipientEmail : '',
      recipientUsername: '',
      subject: normalizedSubject || (isDirectMessageToAdmin ? 'Query to Admin' : 'Group chat message'),
      content: normalizedContent,
      relatedStudentEmail: senderUser.userType === 'Student' ? senderUser.email : '',
      isBroadcast: false,
      chatScope: isGroupChatMessage ? 'students-rcs' : 'private-admin',
    })

    const io = getSocketIoInstance(req)
    const uniqueRooms = getRoomNamesForMessage(message)

    uniqueRooms.forEach((roomName) => {
      io.to(roomName).emit('message:new', message)
    })

    return res.status(201).json({ message: 'Message sent successfully.', data: message })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to send message.', error: error.message })
  }
}

export const broadcastMessage = async (req, res) => {
  try {
    const senderUser = await User.findById(req.user?.id).select('userType username email')

    if (!senderUser || senderUser.userType !== 'Admin') {
      return res.status(403).json({ message: 'Only admins can broadcast messages.' })
    }

    const { content = '', subject = '' } = req.body
    const normalizedContent = normalizeText(content)
    const normalizedSubject = normalizeText(subject)

    if (!normalizedContent) {
      return res.status(400).json({ message: 'Broadcast content is required.' })
    }

    const recipients = await User.find({ userType: { $in: ['Student', 'RC'] } }).select('userType username email')

    const createdMessages = []
    const io = getSocketIoInstance(req)

    for (const recipient of recipients) {
      const createdMessage = await Message.create({
        senderType: 'Admin',
        senderName: senderUser.username,
        senderEmail: senderUser.email,
        senderUsername: senderUser.username,
        recipientType: recipient.userType,
        recipientName: recipient.username,
        recipientEmail: recipient.email,
        recipientUsername: recipient.username,
        subject: normalizedSubject || 'Announcement',
        content: normalizedContent,
        relatedStudentEmail: recipient.userType === 'Student' ? recipient.email : '',
        isBroadcast: true,
      })

      createdMessages.push(createdMessage)

      getRoomNamesForMessage(createdMessage).forEach((roomName) => {
        io.to(roomName).emit('message:new', createdMessage)
        io.to(roomName).emit('announcement:new', createdMessage)
      })
    }

    return res.status(201).json({ message: 'Broadcast sent successfully.', messages: createdMessages })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to broadcast message.', error: error.message })
  }
}
