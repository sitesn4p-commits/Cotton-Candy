import { Router } from 'express'
import { timingSafeEqual } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { env } from '../config.js'

const router = Router()

function createSessionToken(user: { id: string; email: string; role: 'customer' | 'admin' }) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, env.jwtSecret, { expiresIn: '7d' })
}

function credentialsMatch(email: string, password: string) {
  if (!env.adminEmail || !env.adminPassword) return false
  const expectedEmail = Buffer.from(env.adminEmail)
  const receivedEmail = Buffer.from(email)
  const expectedPassword = Buffer.from(env.adminPassword)
  const receivedPassword = Buffer.from(password)
  return expectedEmail.length === receivedEmail.length
    && expectedPassword.length === receivedPassword.length
    && timingSafeEqual(expectedEmail, receivedEmail)
    && timingSafeEqual(expectedPassword, receivedPassword)
}

router.post('/admin-login', (req, res) => {
  if (!env.jwtSecret) return res.status(503).json({ message: 'Admin sign-in is not configured yet.' })
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  const password = typeof req.body.password === 'string' ? req.body.password : ''
  if (!credentialsMatch(email, password)) return res.status(401).json({ message: 'Incorrect email address or password.' })
  const user = { id: `local-admin:${email}`, name: 'Cotton Candy Admin', email, role: 'admin' as const }
  return res.json({ token: createSessionToken(user), user })
})

export { router as authRouter }
