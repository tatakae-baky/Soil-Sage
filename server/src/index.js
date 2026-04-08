import express from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import { connectDatabase } from './config/database.js'

import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import landRoutes from './routes/lands.js'
import rentalRoutes from './routes/rentals.js'
import notificationRoutes from './routes/notifications.js'

const app = express()

app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
  })
)
app.use(express.json({ limit: '2mb' }))

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'soil-sage-api' })
})

const v1 = express.Router()
v1.use('/auth', authRoutes)
v1.use('/users', userRoutes)
v1.use('/lands', landRoutes)
v1.use('/rentals', rentalRoutes)
v1.use('/notifications', notificationRoutes)

app.use('/api/v1', v1)

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

async function start() {
  await connectDatabase()
  app.listen(env.port, () => {
    console.log(`Soil Sage API listening on http://localhost:${env.port}`)
  })
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
