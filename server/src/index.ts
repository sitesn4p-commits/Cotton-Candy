import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config.js'
import { connectDatabase } from './database.js'
import { adminRouter } from './routes/admin.js'
import { authRouter } from './routes/auth.js'
import { publicRouter } from './routes/public.js'

const app = express()
const clientOrigins = [...new Set([
  ...env.clientUrls,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost',
  'https://localhost',
  'capacitor://localhost',
  'tauri://localhost',
  'https://tauri.localhost',
])]

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({ origin: clientOrigins, methods: ['GET', 'POST', 'PATCH', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }))
app.use(express.json({ limit: '1mb' }))
app.use(morgan('dev'))
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
app.use('/api/auth', authRouter)
app.use('/api/admin', adminRouter)
app.use('/api', publicRouter)
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error)
  if (error instanceof Error && error.message.includes('Cast to ObjectId failed')) return res.status(404).json({ message: 'The requested item was not found.' })
  if (error instanceof Error && error.message.includes('bufferCommands')) return res.status(503).json({ message: 'MongoDB is currently unavailable. Check the Atlas network and DNS connection, then refresh the dashboard.' })
  return res.status(500).json({ message: 'Something went wrong on the server.' })
})

app.listen(env.port, () => {
  console.info(`Cotton Candy API listening on ${env.serverUrl}`)
  void connectDatabase().catch((error: unknown) => console.error('MongoDB connection failed; the API will remain available while it reconnects.', error))
})
