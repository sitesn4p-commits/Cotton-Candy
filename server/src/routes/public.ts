import { Router } from 'express'
import { Category } from '../models/Category.js'
import { ContactMessage } from '../models/ContactMessage.js'
import { MediaAsset } from '../models/MediaAsset.js'
import { NewsletterSubscriber } from '../models/NewsletterSubscriber.js'
import { Offering } from '../models/Offering.js'
import { Promotion } from '../models/Promotion.js'
import { ServiceRequest } from '../models/ServiceRequest.js'
import { SiteSettings } from '../models/SiteSettings.js'
import { verifyUnsubscribeToken } from '../services/email.js'

const router = Router()
const validTypes = new Set(['service', 'hire'])
const validKinds = new Set(['image', 'video'])
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function trackingId() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '')
  return `CC-${date}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}

function roundLkr(value: number) { return Math.round(value) }

router.get('/categories', async (req, res, next) => {
  try {
    const type = String(req.query.type || '')
    const filter = validTypes.has(type) ? { type, active: true } : { active: true }
    return res.json(await Category.find(filter).sort({ name: 1 }))
  } catch (error) { return next(error) }
})

router.get('/offerings', async (req, res, next) => {
  try {
    const type = String(req.query.type || '')
    const category = String(req.query.category || '')
    const filter: Record<string, unknown> = { active: true, availability: { $ne: 'unavailable' } }
    if (validTypes.has(type)) filter.type = type
    if (category) filter.category = category
    return res.json(await Offering.find(filter).populate('category', 'name slug type').sort({ featured: -1, createdAt: -1 }))
  } catch (error) { return next(error) }
})

router.get('/offerings/:offeringId', async (req, res, next) => {
  try {
    const offering = await Offering.findOne({ _id: req.params.offeringId, active: true }).populate('category', 'name slug type')
    if (!offering) return res.status(404).json({ message: 'This item is no longer available.' })
    return res.json(offering)
  } catch (error) { return next(error) }
})

router.post('/service-requests', async (req, res, next) => {
  try {
    const offeringId = String(req.body.offeringId || '')
    const customerName = String(req.body.customerName || '').trim()
    const email = String(req.body.email || '').trim().toLowerCase()
    if (!offeringId || !customerName || !email) return res.status(400).json({ message: 'Please add your name, email address and selected item.' })
    const offering = await Offering.findOne({ _id: offeringId, active: true })
    if (!offering) return res.status(404).json({ message: 'The selected service or hire item is no longer available.' })
    const hireDays = offering.type === 'hire' ? Number(req.body.hireDays || 1) : 1
    if (!Number.isInteger(hireDays) || hireDays < 1 || hireDays > 30) return res.status(400).json({ message: 'Choose a hire period between 1 and 30 days.' })
    const promotionId = String(req.body.promotionId || '').trim()
    const promotion = promotionId ? await Promotion.findOne({ _id: promotionId, enabled: true }) : null
    if (promotionId && !promotion) return res.status(400).json({ message: 'That promotion is no longer available.' })
    if (promotion && promotion.appliesTo !== 'all' && promotion.appliesTo !== offering.type) return res.status(400).json({ message: 'That promotion does not apply to this item.' })
    const unitPrice = roundLkr(offering.price)
    const subtotal = roundLkr(unitPrice * hireDays)
    const discountPercent = promotion?.discountPercent || 0
    const discountAmount = roundLkr(subtotal * discountPercent / 100)
    const totalPrice = Math.max(0, subtotal - discountAmount)
    const marketingConsent = ['true', '1', 'on', 'yes'].includes(String(req.body.marketingConsent || '').toLowerCase())
    let request
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        request = await ServiceRequest.create({
          trackingId: trackingId(),
          type: offering.type,
          offering: offering._id,
          offeringName: offering.name,
          customerName,
          email,
          phone: String(req.body.phone || '').trim(),
          eventType: String(req.body.eventType || '').trim(),
          eventDate: req.body.eventDate || undefined,
          notes: String(req.body.notes || '').trim(),
          hireDays,
          unitPrice,
          subtotal,
          discountPercent,
          discountAmount,
          totalPrice,
          promotion: promotion?._id,
          promotionTitle: promotion?.title || '',
          marketingConsent,
          marketingConsentAt: marketingConsent ? new Date() : undefined,
        })
        break
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('duplicate key')) throw error
      }
    }
    if (!request) return res.status(503).json({ message: 'Please try your request again.' })
    return res.status(201).json({ message: 'Your request has been received.', request })
  } catch (error) { return next(error) }
})

router.get('/service-requests', async (req, res, next) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase()
    if (!email || !email.includes('@')) return res.status(400).json({ message: 'Enter the email address used for the order.' })
    const requests = await ServiceRequest.find({ email }).select('type offeringName eventDate status createdAt hireDays unitPrice subtotal discountPercent discountAmount totalPrice promotionTitle')
      .sort({ createdAt: -1 })
    return res.json(requests)
  } catch (error) { return next(error) }
})

router.get('/marketing/unsubscribe', async (req, res) => {
  try {
    const token = String(req.query.token || '')
    const { email } = verifyUnsubscribeToken(token)
    await ServiceRequest.updateMany({ email: email.toLowerCase() }, { marketingConsent: false, marketingConsentAt: undefined, marketingUnsubscribedAt: new Date() })
    return res.type('html').send('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed | Cotton Candy</title></head><body style="background:#f4f0ea;color:#38382f;font-family:Arial,sans-serif;margin:0;padding:48px 18px;text-align:center"><main style="background:#fffdfa;margin:auto;max-width:480px;padding:42px 30px"><p style="color:#ae6965;font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase">Cotton Candy Event Deco</p><h1 style="font-family:Georgia,serif;font-size:36px;font-weight:normal;margin:16px 0">You’re all set.</h1><p style="color:#6f6d63;line-height:1.6">You will no longer receive promotion emails from us. Order updates are not affected.</p></main></body></html>')
  } catch {
    return res.status(400).type('html').send('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Link unavailable</title></head><body><p>This unsubscribe link is invalid or has expired.</p></body></html>')
  }
})

router.get('/media', async (req, res, next) => {
  try {
    const kind = String(req.query.kind || '')
    const filter = validKinds.has(kind) ? { kind } : {}
    return res.json(await MediaAsset.find(filter).sort({ createdAt: -1 }))
  } catch (error) { return next(error) }
})

router.get('/promotions', async (_req, res, next) => {
  try { return res.json(await Promotion.find({ enabled: true }).sort({ createdAt: -1 })) } catch (error) { return next(error) }
})

router.get('/promotions/featured', async (_req, res, next) => {
  try { return res.json(await Promotion.findOne({ enabled: true, showOnLoad: true }).sort({ updatedAt: -1 })) } catch (error) { return next(error) }
})

router.get('/home-content', async (_req, res, next) => {
  try { return res.json(await SiteSettings.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { new: true, upsert: true })) } catch (error) { return next(error) }
})

router.post('/newsletter-subscribers', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase()
    if (!emailPattern.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' })
    const existing = await NewsletterSubscriber.findOne({ email })
    if (existing) return res.json({ message: 'You are already on the pretty list.' })
    const subscriber = await NewsletterSubscriber.create({ email })
    return res.status(201).json({ message: 'You are on the pretty list!', subscriber })
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate key')) return res.json({ message: 'You are already on the pretty list.' })
    return next(error)
  }
})

router.post('/contact', async (req, res, next) => {
  try {
    const firstName = String(req.body.firstName || '').trim()
    const lastName = String(req.body.lastName || '').trim()
    const email = String(req.body.email || '').trim().toLowerCase()
    const message = String(req.body.message || '').trim()
    if (!firstName || !email || !message) return res.status(400).json({ message: 'Please add your name, email address and message.' })
    await ContactMessage.create({ name: `${firstName} ${lastName}`.trim(), email, phone: String(req.body.phone || '').trim(), eventType: String(req.body.eventType || '').trim(), eventDate: req.body.eventDate || undefined, message })
    return res.status(201).json({ message: 'Your message has been sent successfully.' })
  } catch (error) { return next(error) }
})

export { router as publicRouter }
