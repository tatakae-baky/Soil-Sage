/**
 * One-time: create an admin user from env ADMIN_EMAIL / ADMIN_PASSWORD.
 * Run from server directory: npm run seed:admin
 */
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { User } from '../models/User.js'

dotenv.config()

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/soil-sage'
const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD
const name = process.env.ADMIN_NAME || 'System Admin'

async function main() {
  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env')
    process.exit(1)
  }
  await mongoose.connect(uri)
  const exists = await User.findOne({ email: email.toLowerCase() })
  if (exists) {
    console.log('User with that email already exists')
    await mongoose.disconnect()
    process.exit(0)
  }
  const passwordHash = await bcrypt.hash(password, 12)
  await User.create({
    name,
    email: email.toLowerCase(),
    phone: '',
    passwordHash,
    roles: ['admin', 'farmer'],
    landOwnerApproval: 'not_applicable',
    specialistApproval: 'not_applicable',
  })
  console.log('Admin user created:', email)
  await mongoose.disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
