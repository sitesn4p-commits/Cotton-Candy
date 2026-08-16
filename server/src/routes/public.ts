import { Router } from 'express'
import { Category } from '../models/Category.js'
import { ContactMessage } from '../models/ContactMessage.js'
import { MediaAsset } from '../models/MediaAsset.js'
import { NewsletterSubscriber } from '../models/NewsletterSubscriber.js'
import { Offering } from '../models/Offering.js'
import { OrderNotification } from '../models/OrderNotification.js'
import { Promotion } from '../models/Promotion.js'
import { ServiceRequest } from '../models/ServiceRequest.js'
import { SiteSettings } from '../models/SiteSettings.js'
import { sendAdminActivityEmail, verifyUnsubscribeToken } from '../services/email.js'

const router = Router()
const validTypes = new Set(['service', 'hire'])
const validKinds = new Set(['image', 'video'])
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function trackingId() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '')
  return `CC-${date}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}

function roundAud(value: number) { return Math.round(value * 100) / 100 }
function formatAud(value: number) { return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 2 }).format(value) }
const changeCutoffMs = 10 * 24 * 60 * 60 * 1000

function hasTenDayLeadTime(value: Date) {
  return value.getTime() - Date.now() >= changeCutoffMs
}

function dateValue(value: unknown) {
  const date = new Date(String(value || ''))
  return Number.isNaN(date.getTime()) ? null : date
}

function customerVisibleRequest(request: { toObject?: () => Record<string, unknown> } | Record<string, unknown>) {
  const document = request as { toObject?: () => Record<string, unknown> }
  const data: Record<string, unknown> = typeof document.toObject === 'function' ? document.toObject() : request as Record<string, unknown>
  const { trackingId: _trackingId, ...visibleRequest } = data
  return visibleRequest
}

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
    const unitPrice = roundAud(offering.price)
    const subtotal = roundAud(unitPrice * hireDays)
    const discountPercent = promotion?.discountPercent || 0
    const discountAmount = roundAud(subtotal * discountPercent / 100)
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
    void sendAdminActivityEmail({
      title: `New ${request.type === 'hire' ? 'hire' : 'booking'} request`,
      subject: `New Cotton Candy ${request.type === 'hire' ? 'hire' : 'booking'} request`,
      customerName: request.customerName,
      customerEmail: request.email,
      details: [
        { label: 'Reference', value: request.trackingId },
        { label: 'Selected item', value: request.offeringName },
        { label: 'Event / hire date', value: request.eventDate?.toISOString().slice(0, 10) },
        { label: 'Hire duration', value: request.type === 'hire' ? `${request.hireDays} day${request.hireDays === 1 ? '' : 's'}` : undefined },
        { label: 'Phone', value: request.phone },
        { label: 'Event type', value: request.eventType },
        { label: 'Total', value: formatAud(request.totalPrice) },
        { label: 'Notes', value: request.notes },
      ],
    }).catch((error) => console.error('Could not send new booking email.', error))
    return res.status(201).json({ message: 'Your request has been received.', request })
  } catch (error) { return next(error) }
})

router.get('/service-requests', async (req, res, next) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase()
    if (!email || !email.includes('@')) return res.status(400).json({ message: 'Enter the email address used for the order.' })
    const requests = await ServiceRequest.find({ email }).select('type offeringName customerName email phone eventType eventDate notes status createdAt updatedAt hireDays unitPrice subtotal discountPercent discountAmount totalPrice promotionTitle advancePaymentComplete')
      .sort({ createdAt: -1 }).lean()
    return res.json(requests)
  } catch (error) { return next(error) }
})

router.patch('/service-requests/customer', async (req, res, next) => {
  try {
    const referenceId = String(req.body.referenceId || '').trim().toUpperCase()
    const email = String(req.body.email || '').trim().toLowerCase()
    const action = String(req.body.action || 'update').trim().toLowerCase()
    if (!referenceId || !email) return res.status(400).json({ message: 'Enter both your email address and order reference ID.' })
    if (!['update', 'cancel'].includes(action)) return res.status(400).json({ message: 'Choose a valid order action.' })

    const request = await ServiceRequest.findOne({ trackingId: referenceId, email })
    if (!request) return res.status(404).json({ message: 'We could not confirm that order with this email and reference ID.' })
    if (request.status === 'complete' || request.status === 'cancel') return res.status(400).json({ message: 'Completed or cancelled orders can no longer be changed online.' })
    if (!request.eventDate || !hasTenDayLeadTime(request.eventDate)) return res.status(400).json({ message: 'Online changes close 10 days before your event or hire start date. Please contact us for help.' })

    if (action === 'cancel') {
      request.status = 'cancel'
      await request.save()
      await OrderNotification.create({ request: request._id, type: 'cancelled', message: 'Customer cancelled this order online.', details: `${request.customerName} cancelled ${request.offeringName}.` })
      void sendAdminActivityEmail({
        title: 'Customer cancelled an order',
        subject: 'Cotton Candy order cancelled by customer',
        customerName: request.customerName,
        customerEmail: request.email,
        details: [
          { label: 'Reference', value: request.trackingId },
          { label: 'Selected item', value: request.offeringName },
          { label: 'Event / hire date', value: request.eventDate?.toISOString().slice(0, 10) },
          { label: 'Phone', value: request.phone },
        ],
      }).catch((error) => console.error('Could not send cancellation email.', error))
      return res.json({ message: 'Your order has been cancelled and our team has been notified.', request: customerVisibleRequest(request) })
    }

    const eventDateInput = String(req.body.eventDate || '').trim()
    const nextEventDate = eventDateInput ? dateValue(eventDateInput) : request.eventDate
    if (!nextEventDate) return res.status(400).json({ message: 'Add a valid event or hire start date before saving changes.' })
    if (!hasTenDayLeadTime(nextEventDate)) return res.status(400).json({ message: 'Your updated event or hire start date must be at least 10 days away.' })

    const changed: string[] = []
    const updateString = (key: 'customerName' | 'phone' | 'eventType' | 'notes', label: string) => {
      if (typeof req.body[key] !== 'string') return
      const value = String(req.body[key]).trim()
      if (request[key] !== value) {
        request[key] = value
        changed.push(label)
      }
    }
    updateString('customerName', 'customer name')
    updateString('phone', 'phone number')
    updateString('eventType', 'event type')
    updateString('notes', 'notes')
    if (request.eventDate.getTime() !== nextEventDate.getTime()) {
      request.eventDate = nextEventDate
      changed.push('event date')
    }
    if (request.type === 'hire') {
      const hireDays = Number(req.body.hireDays || request.hireDays)
      if (!Number.isInteger(hireDays) || hireDays < 1 || hireDays > 30) return res.status(400).json({ message: 'Choose a hire period between 1 and 30 days.' })
      if (request.hireDays !== hireDays) {
        request.hireDays = hireDays
        request.subtotal = roundAud(request.unitPrice * hireDays)
        request.discountAmount = roundAud(request.subtotal * request.discountPercent / 100)
        request.totalPrice = Math.max(0, request.subtotal - request.discountAmount)
        changed.push('hire duration and price')
      }
    }

    await request.save()
    await OrderNotification.create({ request: request._id, type: 'updated', message: 'Customer updated this order online.', details: changed.length ? `Updated: ${changed.join(', ')}.` : 'Customer saved their order without changing any details.' })
    void sendAdminActivityEmail({
      title: 'Customer updated an order',
      subject: 'Cotton Candy order updated by customer',
      customerName: request.customerName,
      customerEmail: request.email,
      details: [
        { label: 'Reference', value: request.trackingId },
        { label: 'Selected item', value: request.offeringName },
        { label: 'Updated fields', value: changed.length ? changed.join(', ') : 'No fields were changed' },
        { label: 'Event / hire date', value: request.eventDate?.toISOString().slice(0, 10) },
        { label: 'Hire duration', value: request.type === 'hire' ? `${request.hireDays} day${request.hireDays === 1 ? '' : 's'}` : undefined },
        { label: 'Total', value: formatAud(request.totalPrice) },
        { label: 'Notes', value: request.notes },
      ],
    }).catch((error) => console.error('Could not send order update email.', error))
    return res.json({ message: 'Your changes have been saved and our team has been notified.', request: customerVisibleRequest(request) })
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
  try {
    let settings = await SiteSettings.findOne({ key: 'main' }).lean()
    if (!settings) {
      await SiteSettings.updateOne({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { upsert: true })
      settings = await SiteSettings.findOne({ key: 'main' }).lean()
    }
    return res.json(settings)
  } catch (error) { return next(error) }
})

router.post('/newsletter-subscribers', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase()
    if (!emailPattern.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' })
    const existing = await NewsletterSubscriber.findOne({ email })
    if (existing) return res.json({ message: 'You are already on the pretty list.' })
    const subscriber = await NewsletterSubscriber.create({ email })
    void sendAdminActivityEmail({
      title: 'New newsletter subscriber',
      subject: 'New Cotton Candy newsletter subscriber',
      customerEmail: email,
      details: [{ label: 'Email address', value: email }],
    }).catch((error) => console.error('Could not send subscriber email.', error))
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
    const contactMessage = await ContactMessage.create({ name: `${firstName} ${lastName}`.trim(), email, phone: String(req.body.phone || '').trim(), eventType: String(req.body.eventType || '').trim(), eventDate: req.body.eventDate || undefined, message })
    void sendAdminActivityEmail({
      title: 'New website enquiry',
      subject: 'New Cotton Candy contact message',
      customerName: contactMessage.name,
      customerEmail: contactMessage.email,
      details: [
        { label: 'Phone', value: contactMessage.phone },
        { label: 'Event type', value: contactMessage.eventType },
        { label: 'Event date', value: contactMessage.eventDate?.toISOString().slice(0, 10) },
        { label: 'Message', value: contactMessage.message },
      ],
    }).catch((error) => console.error('Could not send contact email.', error))
    return res.status(201).json({ message: 'Your message has been sent successfully.' })
  } catch (error) { return next(error) }
})

export { router as publicRouter }
