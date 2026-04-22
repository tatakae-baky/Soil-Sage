import { MongoMemoryServer } from 'mongodb-memory-server'

export default async function globalSetup() {
  const mongod = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongod.getUri()
  process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests'
  process.env.NODE_ENV = 'test'
  // Store instance URI so globalTeardown can clean up
  global.__MONGOD__ = mongod
}
