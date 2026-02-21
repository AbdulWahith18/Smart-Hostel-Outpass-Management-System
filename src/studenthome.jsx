import { useMemo } from 'react'
import './studenthome.css'

const PASS_REQUESTS_KEY = 'passRequests'

function StudentHome({ currentUser }) {
  const appliedDateTime = useMemo(() => {
    const now = new Date()
    const offset = now.getTimezoneOffset()
    const localNow = new Date(now.getTime() - offset * 60 * 1000)
    return localNow.toISOString().slice(0, 16)
  }, [])

  const handleSubmit = (event) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const passRequest = {
      id: crypto.randomUUID(),
      studentEmail: currentUser?.email ?? '',
      studentUsername: currentUser?.username ?? '',
      authorizedRc: currentUser?.authorizedRc ?? '',
      name: formData.get('name')?.toString() ?? '',
      registerNo: formData.get('registerNo')?.toString() ?? '',
      year: formData.get('year')?.toString() ?? '',
      department: formData.get('department')?.toString() ?? '',
      hostelBlockNo: formData.get('hostelBlockNo')?.toString() ?? '',
      roomNo: formData.get('roomNo')?.toString() ?? '',
      appliedOn: formData.get('appliedOn')?.toString() ?? '',
      address: formData.get('address')?.toString() ?? '',
      leaveDateTime: formData.get('leaveDateTime')?.toString() ?? '',
      returnDateTime: formData.get('returnDateTime')?.toString() ?? '',
      phoneNo: formData.get('phoneNo')?.toString() ?? '',
      guardianPhoneNo: formData.get('guardianPhoneNo')?.toString() ?? '',
      status: 'pending',
      approvedAt: '',
    }

    const existingRequests = JSON.parse(localStorage.getItem(PASS_REQUESTS_KEY) ?? '[]')
    localStorage.setItem(PASS_REQUESTS_KEY, JSON.stringify([...existingRequests, passRequest]))

    alert('Pass application submitted successfully!')
    event.currentTarget.reset()
  }

  return (
    <main className="student-home-page">
      <section className="student-home-card" aria-labelledby="apply-pass-title">
        <h1 id="apply-pass-title">Apply PASS</h1>

        <form className="apply-pass-form" onSubmit={handleSubmit}>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" type="text" placeholder="Enter your name" required />

          <label htmlFor="registerNo">Register No</label>
          <input id="registerNo" name="registerNo" type="text" placeholder="Enter register number" required />

          <label htmlFor="year">Year</label>
          <input id="year" name="year" type="text" placeholder="Enter year" required />

          <label htmlFor="department">Department</label>
          <input id="department" name="department" type="text" placeholder="Enter department" required />

          <label htmlFor="hostelBlockNo">Hostel Block No</label>
          <input id="hostelBlockNo" name="hostelBlockNo" type="text" placeholder="Enter hostel block no" required />

          <label htmlFor="roomNo">Room No</label>
          <input id="roomNo" name="roomNo" type="text" placeholder="Enter room no" required />

          <label htmlFor="appliedOn">Date and Time of Apply</label>
          <input id="appliedOn" name="appliedOn" type="datetime-local" value={appliedDateTime} readOnly />

          <label htmlFor="address">Address</label>
          <textarea id="address" name="address" placeholder="Enter address" rows={3} required />

          <label htmlFor="leaveDateTime">Date and Time of Leaving the Hostel</label>
          <input id="leaveDateTime" name="leaveDateTime" type="datetime-local" required />

          <label htmlFor="returnDateTime">Date and Time of Coming to Hostel</label>
          <input id="returnDateTime" name="returnDateTime" type="datetime-local" required />

          <label htmlFor="phoneNo">Phone No</label>
          <input
            id="phoneNo"
            name="phoneNo"
            type="tel"
            placeholder="Enter phone number"
            maxLength={10}
            inputMode="numeric"
            required
          />

          <label htmlFor="guardianPhoneNo">Parent/Guardian Phone No</label>
          <input
            id="guardianPhoneNo"
            name="guardianPhoneNo"
            type="tel"
            placeholder="Enter parent/guardian phone number"
            maxLength={10}
            inputMode="numeric"
            required
          />

          <button type="submit">Submit PASS Application</button>
        </form>
      </section>
    </main>
  )
}

export default StudentHome
