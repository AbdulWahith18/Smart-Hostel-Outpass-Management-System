import nodemailer from "nodemailer"

let transporter = null

const buildTransporter = () => {
  if (transporter) return transporter

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("Missing SMTP_USER or SMTP_PASS in .env")
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  transporter.verify((error) => {
    if (error) {
      console.error("❌ SMTP connection failed:", error.message)
    } else {
      console.log("✅ Gmail SMTP ready")
    }
  })

  return transporter
}

export const sendMail = async (to, subject, text) => {
  try {
    const mailer = buildTransporter()

    const info = await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
    })

    console.log("📧 Email sent:", info.response)
  } catch (error) {
    console.error("❌ EMAIL ERROR:", error.message)
    throw error
  }
}