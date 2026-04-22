import { app } from './app.js'
import { env } from './config/env.js'
import { connectDatabase } from './config/database.js'

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
