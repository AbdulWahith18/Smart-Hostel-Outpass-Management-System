import { GoogleGenerativeAI } from '@google/generative-ai'

const ANALYSIS_MODEL_CANDIDATES = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
]

export const analyzeReason = async (reason) => {
  const normalizedReason = reason?.toString().trim() ?? ''

  if (!normalizedReason) {
    throw new Error('Reason is required for AI analysis.')
  }

  const geminiApiKey = process.env.GEMINI_API_KEY?.trim()
  if (!geminiApiKey) {
    throw new Error('Gemini API is not configured. Set GEMINI_API_KEY in .env.')
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey)

  const prompt = `You are an assistant for a Hostel Outpass Management System.
Analyze the following reason and return exactly in this format:
Category: <Family | Medical | Personal | Other>
Priority: <Low | Medium | High>
Suggestion: <A short approval suggestion>

Reason: ${normalizedReason}`

  let aiText = ''
  let lastModelError = null

  for (const modelName of ANALYSIS_MODEL_CANDIDATES) {
    try {
      const analysisModel = genAI.getGenerativeModel({ model: modelName })
      const result = await analysisModel.generateContent(prompt)
      aiText = result.response.text()?.trim() ?? ''
      if (aiText) {
        break
      }
    } catch (error) {
      lastModelError = error
    }
  }

  if (!aiText) {
    if (lastModelError) {
      throw new Error(lastModelError.message)
    }

    throw new Error('AI returned an empty analysis.')
  }

  return aiText
}