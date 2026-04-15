import dotenv from 'dotenv'

dotenv.config()

/**
 * Centralized environment reads so the app fails fast on missing required vars in production.
 */
export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/soil-sage',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-in-production',
  /** @type {string[]} */
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  /** Google Gemini — soil/crop diagnosis (from https://aistudio.google.com/apikey ) */
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  /**
   * Gemini model id (must support vision + JSON). Default `gemini-2.5-flash` — older ids like
   * `gemini-1.5-flash` often return **404** (retired / not on v1beta for this key). Override if needed.
   * List names for your key: `GET https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY`
   * @see https://ai.google.dev/gemini-api/docs/models/gemini
   */
  geminiModel: (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim(),
  /**
   * Text-only chat model (inventory-aware assistant). Defaults to same as vision model.
   * @see https://ai.google.dev/gemini-api/docs/models/gemini
   */
  geminiChatModel: (
    process.env.GEMINI_CHAT_MODEL ||
    process.env.GEMINI_MODEL ||
    'gemini-2.5-flash'
  ).trim(),
}
