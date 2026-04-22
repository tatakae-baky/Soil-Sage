import mongoose from 'mongoose'

/**
 * Connect to the in-memory database (called in beforeAll).
 * MONGODB_URI is set by globalSetup.js before any test runs.
 */
export async function connect() {
  await mongoose.connect(process.env.MONGODB_URI)
}

/**
 * Clear all collections between tests.
 */
export async function clearDatabase() {
  const collections = mongoose.connection.collections
  await Promise.all(
    Object.values(collections).map((c) => c.deleteMany({}))
  )
}

/**
 * Disconnect and close the mongoose connection (called in afterAll).
 */
export async function disconnect() {
  await mongoose.connection.close()
}
