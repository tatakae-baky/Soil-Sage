/**
 * Dev seed: sample agronomic providers near Dhaka (run once against local Mongo).
 *
 * Usage: `node server/src/scripts/seedProviders.js` from repo root (or cd server && node src/scripts/seedProviders.js`).
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import { connectDatabase } from '../config/database.js'
import { SolutionProvider } from '../models/SolutionProvider.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../../.env') })

const SAMPLES = [
  {
    name: 'Green Field Agro Supplies',
    description: 'Seeds, fertilizer, and basic tools.',
    phone: '+880-000-0000001',
    categories: ['seeds', 'fertilizer', 'tools'],
    lat: 23.8103,
    lng: 90.4125,
  },
  {
    name: 'Delta Crop Care Center',
    description: 'Pesticides and soil advice.',
    phone: '+880-000-0000002',
    categories: ['pesticide', 'fertilizer', 'extension'],
    lat: 23.785,
    lng: 90.415,
  },
  {
    name: 'Farmers Co-op Extension Desk',
    description: 'Government-aligned extension information point.',
    phone: '+880-000-0000003',
    categories: ['extension', 'general'],
    lat: 23.825,
    lng: 90.38,
  },
]

async function main() {
  await connectDatabase()
  const existing = await SolutionProvider.countDocuments()
  if (existing > 0) {
    console.log(`Skip: ${existing} provider(s) already in database.`)
    await mongoose.disconnect()
    return
  }
  for (const s of SAMPLES) {
    await SolutionProvider.create({
      name: s.name,
      description: s.description,
      phone: s.phone,
      website: '',
      categories: s.categories,
      location: { type: 'Point', coordinates: [s.lng, s.lat] },
      isActive: true,
    })
    console.log('Seeded provider:', s.name)
  }
  await mongoose.disconnect()
  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
