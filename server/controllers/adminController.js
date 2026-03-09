import User from '../models/User.js'

export const getAllUsers = async (_req, res) => {
  try {
    const users = await User.find({ userType: { $in: ['Student', 'RC'] } })
      .select('username email userType mobileNo createdAt')
      .sort({ createdAt: -1 })

    return res.status(200).json({ users })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch users.', error: error.message })
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
