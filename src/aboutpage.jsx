import PublicInfoPage from './publicinfopage'

const ABOUT_SECTIONS = [
  {
    title: 'What This App Does',
    body: 'HAVENTRA is a digital platform for managing student outpass requests and room allocations in hostels. It removes manual slips and lets students, RCs, and admins work in one connected workflow.',
    points: [
      'Students can apply quickly with outing details.',
      'RC can review and approve or reject requests instantly.',
      'Status updates are visible in real time.',
    ],
  },
  {
    title: 'How To Use It',
    body: 'Use your registered account to log in and access role-based actions. Submit complete and correct information to avoid delays in approval.',
    points: [
      'Student: Fill destination, date, and return time carefully.',
      'RC: Verify request reason and timing before decision.',
      'Admin: Monitor users, records, and system analytics.',
    ],
  },
  {
    title: 'Usage Guidelines',
    body: 'For smooth operation and safety compliance, every user must follow hostel rules and provide truthful information in every request.',
    points: [
      'Do not submit duplicate or misleading requests.',
      'Keep your login credentials private.',
      'Track your request status before leaving hostel premises.',
      'Carry approved pass details while outside campus.',
    ],
  },
]

export default function AboutPage(props) {
  return (
    <PublicInfoPage
      pageKey="about"
      title="About HAVENTRA"
      subtitle="A secure and paperless smart hostel management system"
      intro="HAVENTRA simplifies hostel management with clear steps, transparent approvals, and faster communication between students and hostel authorities."
      sections={ABOUT_SECTIONS}
      {...props}
    />
  )
}
