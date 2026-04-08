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
}
