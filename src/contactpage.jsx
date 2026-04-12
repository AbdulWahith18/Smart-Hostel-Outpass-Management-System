import PublicInfoPage from './publicinfopage'

const CONTACT_SECTIONS = [
  {
    title: 'Official Contact',
    body: 'Use the official university mail for formal communication related to the app, access issues, and institutional updates.',
    points: ['Name: Abdul Wahith M', 'Official Email: 2024503559@student.annauniv.edu'],
  },
  {
    title: 'Personal Contact',
    body: 'For direct communication and quick follow-up regarding project details, you can use the personal email and phone number below.',
    points: ['Personal Email: abdulwahith0818@gmail.com', 'Phone: 8553132883'],
  },
  {
    title: 'Education Details',
    body: 'Current academic information associated with the app creator and contact profile.',
    points: [
      'Pursuing: B.E. CSE',
      'University: Anna University',
      'Campus: Madras Institute of Technology (MIT)',
      'Location: Chennai - 600044',
    ],
  },
]

export default function ContactPage(props) {
  return (
    <PublicInfoPage
      pageKey="contact"
      title="Contact"
      subtitle="Reach out for support, clarifications, and collaboration"
      intro="All contact details are listed below in a clear format for official communication, personal reach, and academic profile verification."
      sections={CONTACT_SECTIONS}
      {...props}
    />
  )
}
