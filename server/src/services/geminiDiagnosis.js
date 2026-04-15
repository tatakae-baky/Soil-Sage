import { GoogleGenerativeAI } from '@google/generative-ai'
import { env } from '../config/env.js'
import {
  DIAGNOSIS_DISCLAIMER,
  DIAGNOSIS_SYSTEM_PROMPT,
  assertDiagnosisShape,
} from './diagnosisShared.js'

const MAX_GEMINI_ATTEMPTS = 3

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Parse Google's suggested wait from the error string (seconds, decimals allowed).
 *
 * @param {string} msg
 * @returns {number | null} milliseconds, or null if not found
 */
function parseSuggestedRetryMs(msg) {
  const m1 = msg.match(/please retry in ([\d.]+)\s*s\b/i)
  if (m1) {
    const sec = parseFloat(m1[1])
    if (!Number.isNaN(sec) && sec > 0) {
      return Math.min(120000, Math.max(1500, Math.ceil(sec * 1000) + 250))
    }
  }
  const m2 = msg.match(/"retryDelay"\s*:\s*"(\d+)s"/i)
  if (m2) {
    const sec = parseInt(m2[1], 10)
    if (!Number.isNaN(sec) && sec > 0) {
      return Math.min(120000, Math.max(1500, sec * 1000 + 250))
    }
  }
  return null
}

/**
 * Backoff when Gemini returns resource exhaustion / rate limits.
 *
 * @param {unknown} error
 * @param {number} attempt
 */
function retryDelayMs(error, attempt) {
  const msg = String(/** @type {any} */ (error)?.message || '')
  const fromGoogle = parseSuggestedRetryMs(msg)
  if (fromGoogle != null) return fromGoogle
  const base = 1000 * 2 ** attempt
  const jitter = Math.random() * 400
  return Math.min(25000, base + jitter)
}

/**
 * Free tier sometimes reports `limit: 0` for a model — retries will not help until the user
 * switches model, project, or enables billing.
 *
 * @param {string} msg
 */
function isNoFreeTierQuotaForModel(msg) {
  const lower = msg.toLowerCase()
  return lower.includes('limit: 0') && lower.includes('free_tier')
}

/**
 * Model id not served for this API version / key (common after Google retires short names like `gemini-1.5-flash`).
 *
 * @param {string} msg
 */
function isModelNotFoundError(msg) {
  const lower = msg.toLowerCase()
  return (
    lower.includes('is not found for api version') ||
    (lower.includes('[404') && lower.includes('not found') && lower.includes('models/'))
  )
}

/**
 * Map Gemini / GoogleGenerativeAI failures to HTTP-ish fields on `Error`.
 *
 * @param {unknown} e
 */
function normalizeGeminiError(e) {
  const msg = String(/** @type {any} */ (e)?.message || 'Gemini request failed')
  const lower = msg.toLowerCase()
  const err = new Error(msg)
  err.provider = 'gemini'
  err.cause = e

  if (
    lower.includes('api key not valid') ||
    lower.includes('invalid api key') ||
    lower.includes('permission denied')
  ) {
    err.statusCode = 502
    err.message =
      'Gemini API key was rejected. Create a key in Google AI Studio and set GEMINI_API_KEY in server/.env.'
    err.hint = 'https://aistudio.google.com/apikey'
    return err
  }

  if (isModelNotFoundError(msg)) {
    err.statusCode = 502
    err.providerCode = 'gemini_model_not_found'
    err.message =
      'That Gemini model name is not available for your API key (404). Older names like `gemini-1.5-flash` are often retired — use a current vision model.'
    err.hint =
      'Set `GEMINI_MODEL=gemini-2.5-flash` (or `gemini-2.5-flash-lite`, `gemini-flash-latest`) in server/.env, restart, or list models: https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY — see https://ai.google.dev/gemini-api/docs/models/gemini'
    return err
  }

  if (isNoFreeTierQuotaForModel(msg)) {
    err.statusCode = 429
    err.providerCode = 'gemini_free_tier_zero'
    err.message =
      'Gemini free tier shows **no quota (limit: 0)** for this model on your API key/project. Retrying will not fix it until you change something in Google.'
    err.hint =
      'Try another model id (`GEMINI_MODEL=gemini-2.5-flash` or `gemini-2.5-flash-lite`), a different Google Cloud project / API key, or enable pay-as-you-go for Generative Language API. See https://ai.google.dev/gemini-api/docs/rate-limits'
    return err
  }

  if (
    lower.includes('resource has been exhausted') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('billing') ||
    lower.includes('too many requests')
  ) {
    err.statusCode = 429
    err.providerCode = 'quota_or_rate'
    err.message =
      'Gemini quota or rate limit. Wait for the suggested retry time, or set `GEMINI_MODEL` to another vision model (e.g. gemini-2.5-flash-lite) and restart the server.'
    err.hint = 'https://ai.google.dev/gemini-api/docs/rate-limits'
    return err
  }

  err.statusCode = 502
  return err
}

function shouldRetryGemini(e) {
  const msg = String(/** @type {any} */ (e)?.message || '')
  if (isNoFreeTierQuotaForModel(msg)) return false
  if (isModelNotFoundError(msg)) return false
  const lower = msg.toLowerCase()
  return (
    lower.includes('resource has been exhausted') ||
    lower.includes('resource_exhausted') ||
    lower.includes('429') ||
    lower.includes('too many requests') ||
    lower.includes('quota exceeded')
  )
}

/**
 * Soil/crop vision diagnosis via Google Gemini (JSON mode).
 *
 * @param {object} params
 * @param {Array<{ buffer: Buffer, mimetype: string }>} params.images
 * @param {string} [params.notes]
 * @param {string} [params.landContext]
 * @returns {Promise<{ result: object, disclaimer: string, model: string }>}
 */
export async function runDiagnosis({ images, notes = '', landContext = '' }) {
  if (!env.geminiApiKey) {
    const err = new Error('Gemini is not configured')
    err.statusCode = 503
    err.hint = 'Set GEMINI_API_KEY in server/.env (from https://aistudio.google.com/apikey ).'
    throw err
  }

  const genAI = new GoogleGenerativeAI(env.geminiApiKey)
  const modelName = env.geminiModel

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: DIAGNOSIS_SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.35,
      /** Ask for strict JSON object matching our Zod schema */
      responseMimeType: 'application/json',
    },
  })

  const intro =
    notes?.trim() || landContext?.trim()
      ? `Farmer notes / context:\n${[notes?.trim(), landContext?.trim()].filter(Boolean).join('\n')}\n\nAnalyze the attached image(s) for soil and/or crop health. Reply with JSON only as instructed in the system rules.`
      : 'Analyze the attached image(s) for soil and/or crop health. Reply with JSON only as instructed in the system rules.'

  /** Multimodal parts: prompt text then each image as inline base64 */
  const parts = [{ text: intro }]
  for (const img of images) {
    const mime = img.mimetype === 'image/jpg' ? 'image/jpeg' : img.mimetype
    parts.push({
      inlineData: {
        mimeType: mime,
        data: img.buffer.toString('base64'),
      },
    })
  }

  let raw = ''
  let lastCatch = null

  for (let attempt = 0; attempt < MAX_GEMINI_ATTEMPTS; attempt++) {
    try {
      const result = await model.generateContent(parts)
      const response = result.response
      raw = response.text()
      lastCatch = null
      break
    } catch (e) {
      lastCatch = e
      if (shouldRetryGemini(e) && attempt < MAX_GEMINI_ATTEMPTS - 1) {
        const wait = retryDelayMs(e, attempt)
        console.warn(
          `[geminiDiagnosis] transient error, retry ${attempt + 2}/${MAX_GEMINI_ATTEMPTS} after ${Math.round(wait)}ms:`,
          /** @type {any} */ (e)?.message
        )
        await sleep(wait)
        continue
      }
      throw normalizeGeminiError(e)
    }
  }

  if (lastCatch && !raw) {
    throw normalizeGeminiError(lastCatch)
  }

  if (!raw || typeof raw !== 'string') {
    const err = new Error('Empty Gemini response')
    err.statusCode = 502
    throw err
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    const err = new Error('Gemini returned invalid JSON')
    err.statusCode = 502
    throw err
  }

  const { result } = assertDiagnosisShape(parsed)

  return {
    result,
    disclaimer: DIAGNOSIS_DISCLAIMER,
    model: modelName,
  }
}
