# HOMS — Hostel Outpass Management System

A real-time digital outpass application for hostels — students submit outing requests, wardens approve or reject them instantly, and admins manage the system with the help of an AI assistant.

---

## ✨ Overview

HOMS replaces manual paper outpass slips with a streamlined digital workflow:

- **Students** submit outing requests with a live form preview and get their reason checked by AI before submitting.
- **RC Wardens** approve or reject passes in real time via Socket.IO — no page refresh needed.
- **Admins** manage user accounts, override pass decisions, and query system stats using a conversational AI assistant powered by Google Gemini.

---

## 🚀 Features

### 🎓 Student Portal
- Live card preview that updates as the form is filled out
- AI-powered reason analyzer (category, priority, and approval suggestion)
- Real-time status tracking (Pending → Approved / Rejected)
- Automatic assignment to the student's authorized warden

### 🛡️ RC Warden Control Center
- Instant real-time notifications for new pass requests
- One-click Approve / Reject actions
- AI-generated analytics snapshot of outing trends

### ⚙️ Admin Dashboard
- User directory with search and role/status filters
- Automatic deactivation of accounts inactive for 60+ days
- Access Mode: override any pass decision, monitor warden approval rates
- Conversational AI chatbot for natural-language queries on system data (with chat export)

### 🎨 Design
- Modern SaaS-style interface (Linear / Vercel / Raycast inspired)
- 8-point spatial grid, glassmorphism, and dual typography (Inter + Outfit)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router, Tailwind CSS + custom CSS design tokens |
| Backend | Node.js, Express 5 |
| Database | MongoDB with Mongoose |
| Real-time | Socket.IO |
| AI | Google Gemini API (`@google/generative-ai`) |
| Auth | JSON Web Tokens (JWT), bcryptjs |
| Email | Nodemailer (SMTP OTP delivery) |

---

## 🏗️ Architecture

```
React 19 Frontend (Vite)
   Student Portal | RC Warden Portal | Admin Panel
            |                    ^
       REST API          Socket.IO live events
            v                    |
Express 5 Backend API
   Routes → Middleware (Auth/Role guards) → Controllers → Services → Models
            |                              |
      MongoDB (Mongoose)             Nodemailer (SMTP)
```

- **Routes** define endpoints and attach auth/role guards
- **Controllers** handle request logic
- **Services** wrap external calls (Gemini AI, analytics aggregation)
- **Models** define MongoDB schemas
- **Socket.IO rooms** keep updates scoped per user: `student:<email>`, `rc:<username>`, `admin:<email>`, `admin:all`

**Resiliency built in:**
- Graceful `503` responses on database connection issues instead of crashes
- AI requests automatically fall back across 5 Gemini models if one fails or is rate-limited
- Cached analytics snapshots (valid for 6 hours) reduce redundant AI calls
- Simple greetings in the admin chatbot are answered instantly without hitting the AI API

---

## 🤖 AI Features

| Feature | Description |
|---|---|
| Reason Analyzer | Reads a student's outpass reason and returns a category, priority level, and approval suggestion |
| Analytics Generator | Summarizes pass request trends (approval ratios, peak days, repeat applicants) into a few key insights |
| Admin Chatbot | Answers natural-language questions about system usage using live database data |

---

## 🔒 Security

- JWT-based authentication (7-day expiry)
- Passwords hashed with bcrypt (10 salt rounds)
- Role-based access control (Student / RC / Admin)
- Deactivated accounts blocked at login
- Two-step OTP verification for password resets (10-minute expiry)
- Regex-based input validation (mobile numbers, strong password rules)
- Protection against regex injection in search queries

---

## 📡 API Endpoints

### Auth — `/api/auth`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/register` | Register a new Student or RC Warden |
| POST | `/login` | Authenticate and get a JWT |
| GET | `/rc-users` | List available RC wardens for registration |
| POST | `/forgot-password/send-otp` | Send password reset OTP |
| POST | `/forgot-password/verify-otp` | Verify OTP |
| POST | `/forgot-password/reset` | Reset password |

### Pass Requests — `/api/pass-requests`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/` | Submit a new outpass request |
| GET | `/rc/:rcUsername` | Get requests assigned to a warden |
| GET | `/student?email=` | Get a student's requests |
| PATCH | `/:requestId/approve` | Approve a request |
| PATCH | `/:requestId/reject` | Reject a request |

### AI & Analytics — `/api/ai`, `/api/admin`
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/ai/analyze` | Analyze an outpass reason | — |
| POST | `/api/admin/ai-analytics` | Generate a fresh analytics summary | Admin |
| GET | `/api/admin/ai-analytics/rc` | Get cached/fresh analytics snapshot | Admin/RC |
| POST | `/api/admin/ai-chat` | Query the admin AI assistant | Admin |

### Admin Management — `/api/admin`
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/users` | List registered users | Admin |
| PATCH | `/user-status/:id` | Activate/deactivate a user | Admin |
| DELETE | `/users/:id` | Delete a user | Admin |
| GET | `/access-mode` | Get requests & warden approval rates | Admin |
| PATCH | `/access-mode/:requestId/approve` | Override-approve a request | Admin |
| PATCH | `/access-mode/:requestId/reject` | Override-reject a request | Admin |

### Utility
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/test-email` | Test SMTP email configuration |

---

## 🗄️ Database Models

- **User** — account details, role (Student/RC/Admin), assigned warden, status, OTP fields
- **PassRequest** — outing details, schedule, contacts, status, approval/rejection metadata
- **AnalyticsSnapshot** — cached AI-generated insights and summary data
- **Message** — internal messaging between students, wardens, and admins

---

## 📁 Project Structure

```
MINE/
├── index.js                  # Express server & Socket.IO setup
├── server/
│   ├── controllers/          # Request handlers
│   ├── middleware/           # Auth & role guards
│   ├── models/                # MongoDB schemas
│   ├── routes/                # API route definitions
│   ├── services/               # Gemini AI & analytics logic
│   └── utils/                 # Email utility
└── src/
    ├── App.jsx                # Main app controller
    ├── studenthome.jsx        # Student portal
    ├── rchome.jsx              # RC warden portal
    ├── adminhome.jsx           # Admin panel
    ├── topbar.jsx              # Navigation header
    └── styles/                # Shared UI styles
```

---

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```env
# Server
PORT=5000
CLIENT_ORIGIN=http://localhost:5173

# Database
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>

# Security
JWT_SECRET=your_super_secret_jwt_key_here

# Google Gemini AI
GEMINI_API_KEY=your_google_gemini_api_key_here

# SMTP (for OTP emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
```

---

## 🧰 Prerequisites

- Node.js v18 or higher
- npm v9 or higher
- A MongoDB instance (local or Atlas)
- A Google Gemini API key

---

## ▶️ Getting Started

**1. Clone the repository**
```bash
git clone https://github.com/AbdulWahith18/MINE.git
cd MINE
```

**2. Install dependencies**
```bash
npm install
```

**3. Set up environment variables**
```bash
cp .env.example .env
```
Fill in `MONGO_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, and `SMTP_*` values.

**4. Run the app**

Run both server and client together:
```bash
npm run dev:full
```

Or run them separately in two terminals:
```bash
npm run server   # Terminal 1 — backend
npm run client   # Terminal 2 — frontend
```

Then open **http://localhost:5173** in your browser.

---

## ⚠️ Known Limitations

- Socket.IO currently uses the default in-memory adapter — scaling across multiple server instances would require the Redis adapter.
- Password reset emails depend directly on SMTP credentials; misconfiguration causes OTP delivery to fail (fails gracefully, but requires retry).
- If WebSocket connections are blocked by strict firewalls, the frontend falls back to 5-second HTTP polling.

---

## ✅ Verified

- Production build passes with `npm run build` (Vite) — 0 errors
- SMTP email delivery tested via `/api/test-email`
- Health check available at `/api/health`
- Input validation tested for mobile numbers, password rules, and unique email constraints

---

## 🏷️ Suggested Repo Topics

`hostel-management` `react19` `nodejs` `express5` `mongodb` `socket-io` `google-gemini-ai` `tailwindcss` `vite` `saas-ui`
