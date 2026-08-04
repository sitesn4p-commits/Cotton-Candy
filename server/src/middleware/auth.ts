import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config.js'

export type AuthPayload = { sub: string; email: string; role: 'customer' | 'admin' }
export type AuthenticatedRequest = Request & { auth?: AuthPayload }

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token || !env.jwtSecret) return res.status(401).json({ message: 'Sign in is required.' })
  try {
    ;(req as AuthenticatedRequest).auth = jwt.verify(token, env.jwtSecret) as AuthPayload
    return next()
  } catch {
    return res.status(401).json({ message: 'Your session has expired. Please sign in again.' })
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = (req as AuthenticatedRequest).auth
  if (auth?.role !== 'admin') return res.status(403).json({ message: 'Administrator access is required.' })
  return next()
}
