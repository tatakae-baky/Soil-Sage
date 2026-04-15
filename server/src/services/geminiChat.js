import { GoogleGenerativeAI } from '@google/generative-ai'
import { env } from '../config/env.js'

const CHAT_SYSTEM = `You are Soil Sage, a careful farming assistant for smallholders (including South Asia / Bangladesh when relevant).
Rules:
- Give practical, safe guidance; never replace local laws, product labels, or professional agronomists.
- If inventory data is attached, reference it naturally when relevant (quantities, recent usage).
- Keep answers concise unless the user asks for detail.
- Do not fabricate weather or field conditions not stated by the user.`

/**
 * @param {unknown} e
 */
function normalizeError(e) {
  const msg = String(/** @type {any} */ (e)?.message || 'Gemini request failed')
  const err = new Error(msg)
  err.statusCode = 502
  const lower = msg.toLowerCase()
  if (
    lower.includes('api key not valid') ||
    lower.includes('invalid api key') ||
    lower.includes('permission denied')
  ) {
    err.statusCode = 502
    err.message =
      'Gemini API key was rejected. Set GEMINI_API_KEY in server/.env (Google AI Studio).'
    err.hint = 'https://aistudio.google.com/apikey'
  }
  if (lower.includes('resource exhausted') || lower.includes('429')) {
    err.statusCode = 429
  }
  return err
}

/**
 * Farmer chat turn using Gemini (text). Caller supplies trimmed OpenAI-style history ending with a user message.
 *
 * @param {object} params
 * @param {Array<{ role: 'user' | 'model'; content: string }>} params.messages
 * @param {object} params.inventorySnapshot — JSON-serializable payload (items + recentUsage)
 * @returns {Promise<{ text: string; model: string }>}
 */
export async function runFarmChat({ messages, inventorySnapshot }) {
  if (!env.geminiApiKey) {
    const err = new Error('Gemini is not configured')
    err.statusCode = 503
    err.hint = 'Set GEMINI_API_KEY in server/.env (from https://aistudio.google.com/apikey ).'
    throw err
  }

  const modelName = env.geminiChatModel
  const genAI = new GoogleGenerativeAI(env.geminiApiKey)
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: `${CHAT_SYSTEM}\n\nFarmer inventory snapshot (JSON):\n${JSON.stringify(inventorySnapshot)}`,
    generationConfig: { temperature: 0.45, maxOutputTokens: 1024 },
  })

  const last = messages[messages.length - 1]
  if (!last || last.role !== 'user') {
    const err = new Error('Last message must be from the user')
    err.statusCode = 400
    throw err
  }

  const prior = messages.slice(0, -1)
  /** @type {{ role: string; parts: { text: string }[] }[]} */
  const history = []
  for (const m of prior) {
    history.push({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    })
  }

  try {
    const chat = model.startChat({ history })
    const result = await chat.sendMessage(last.content)
    const text = result.response.text()
    if (!text?.trim()) {
      const err = new Error('Empty model response')
      err.statusCode = 502
      throw err
    }
    return { text: text.trim(), model: modelName }
  } catch (e) {
    throw normalizeError(e)
  }
}

/**
 * Same turn as {@link runFarmChat}, but yields incremental text chunks from Gemini
 * so the HTTP layer can forward them as SSE (progressive UI).
 *
 * @param {object} params
 * @param {Array<{ role: 'user' | 'model'; content: string }>} params.messages
 * @param {object} params.inventorySnapshot
 * @returns {AsyncGenerator<string, void, void>}
 */
export async function* runFarmChatStream({ messages, inventorySnapshot }) {
  if (!env.geminiApiKey) {
    const err = new Error('Gemini is not configured')
    err.statusCode = 503
    err.hint = 'Set GEMINI_API_KEY in server/.env (from https://aistudio.google.com/apikey ).'
    throw err
  }

  const modelName = env.geminiChatModel
  const genAI = new GoogleGenerativeAI(env.geminiApiKey)
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: `${CHAT_SYSTEM}\n\nFarmer inventory snapshot (JSON):\n${JSON.stringify(inventorySnapshot)}`,
    generationConfig: { temperature: 0.45, maxOutputTokens: 1024 },
  })

  const last = messages[messages.length - 1]
  if (!last || last.role !== 'user') {
    const err = new Error('Last message must be from the user')
    err.statusCode = 400
    throw err
  }

  const prior = messages.slice(0, -1)
  /** @type {{ role: string; parts: { text: string }[] }[]} */
  const history = []
  for (const m of prior) {
    history.push({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    })
  }

  try {
    const chat = model.startChat({ history })
    const streamResult = await chat.sendMessageStream(last.content)
    for await (const chunk of streamResult.stream) {
      const piece = typeof chunk.text === 'function' ? chunk.text() : ''
      if (piece) yield piece
    }
  } catch (e) {
    throw normalizeError(e)
  }
}

export { normalizeError as normalizeGeminiChatError }
