import PublicInfoPage from './publicinfopage'

const TERMS_SECTIONS = [
  {
    title: 'Account and Email Access Policy',
    body: 'Only registered users with valid credentials can access role-based features. Official or registered email is used for account actions such as login recovery and notifications.',
    points: [
      'Users must provide accurate email during registration.',
      'OTP and password reset communication is sent to registered email only.',
      'Sharing credentials with others is not allowed.',
    ],
  },
  {
    title: 'Outpass Request Policy',
    body: 'Students must submit outpass requests with valid reason, destination, and timings. Incorrect or incomplete entries can be rejected by RC.',
    points: [
      'Requests are subject to RC review and approval.',
      'Hostel rules apply for permitted outing times.',
      'Repeated misuse can lead to restricted access.',
    ],
  },
  {
    title: 'Pass Holding and Verification Policy',
    body: 'When a request is approved, students should keep pass details available until they return. Pass details may be verified by authorized hostel staff whenever required.',
    points: [
      'Students must present approved pass details during checks.',
      'Pass data should match submitted request information.',
      'Expired or invalid pass records cannot be used for exit.',
    ],
  },
  {
    title: 'Data and Usage Policy',
    body: 'The system stores required account and request data to process outpass workflows, maintain audit records, and support hostel administration.',
    points: [
      'Data is used only for operational and security needs of HOMS.',
      'Admins and authorized roles may view relevant records.',
      'Users should keep personal profile and request information accurate.',
    ],
  },
  {
    title: 'Compliance and Conduct',
    body: 'Using HOMS means agreeing to follow hostel conduct standards and institutional regulations. Violations may lead to account review, pass cancellation, or disciplinary action.',
    points: [
      'Do not submit false reasons or manipulated timings.',
      'Do not attempt unauthorized access to other accounts.',
      'Follow directions issued by hostel management and RC.',
    ],
  },
]

export default function TermsPolicyPage(props) {
  return (
    <PublicInfoPage
      pageKey="terms"
      title="Terms and Policy"
      subtitle="Rules and policies for using the Hostel Outpass Management System"
      intro="These terms define acceptable use, data handling, pass verification expectations, and account responsibilities for all users of this app."
      sections={TERMS_SECTIONS}
      backActionLabel={props.onBackToRegister ? 'Back to Registration' : undefined}
      onBackAction={props.onBackToRegister}
      {...props}
    />
  )
}
