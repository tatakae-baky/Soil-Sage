import mongoose from 'mongoose'
import { env } from './env.js'

/**
 * Connects to MongoDB once per process; reuses connection in dev watch mode.
 */
export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return
  await mongoose.connect(env.mongoUri)
}
