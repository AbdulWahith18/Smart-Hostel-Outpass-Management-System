import { GoogleGenerativeAI } from '@google/generative-ai'

const ANALYTICS_MODEL_CANDIDATES = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
]

const generateWithFallback = async (prompt) => {
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim()
  if (!geminiApiKey) {
    throw new Error('Gemini API is not configured. Set GEMINI_API_KEY in .env.')
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey)
  let responseText = ''
  let lastModelError = null

  for (const modelName of ANALYTICS_MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent(prompt)
      responseText = result.response.text()?.trim() ?? ''

      if (responseText) {
        break
      }
    } catch (error) {
      lastModelError = error
    }
  }

  if (!responseText) {
    if (lastModelError) {
      throw new Error(lastModelError.message)
    }

    throw new Error('AI returned an empty response.')
  }

  return responseText
}

export const generateAnalyticsSummary = async (data) => {
  const prompt = `You are an AI assistant for a Hostel Outpass Management System admin dashboard.
Analyze the following data and generate 3-5 short insights for the admin.

Data:
Total Requests: ${data.totalRequests}
Approved: ${data.approvedCount}
Rejected: ${data.rejectedCount}
Pending: ${data.pendingCount}
Most frequent request day: ${data.mostFrequentDay}
Frequent applicants: ${data.frequentApplicants}

Return short bullet point insights.`

  return generateWithFallback(prompt)
}

export const answerAdminAnalyticsQuestion = async ({ question, stats, dateCounts, dayCounts, topApplicants }) => {
  const prompt = `You are an AI analytics assistant for a Hostel Outpass Management System.
Answer using only the provided data. Keep answers short and factual.
If exact data for a request is missing, say so briefly.

Question:
${question}

Overall Stats:
- Total Users: ${stats.totalUsers}
- Students: ${stats.studentCount}
- RC Users: ${stats.rcCount}
- Total Pass Requests: ${stats.totalRequests}
- Approved Requests: ${stats.approvedCount}
- Rejected Requests: ${stats.rejectedCount}
- Pending Requests: ${stats.pendingCount}

Pass Requests by Weekday:
${dayCounts || 'No data'}

Pass Requests by Date (YYYY-MM-DD):
${dateCounts || 'No data'}

Top Applicants:
${topApplicants || 'No repeat applicants'}

Return plain text only.`

  return generateWithFallback(prompt)
}