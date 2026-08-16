import { Router } from 'express'
import { Category } from '../models/Category.js'
import { ContactMessage } from '../models/ContactMessage.js'
import { MediaAsset } from '../models/MediaAsset.js'
import { NewsletterSubscriber } from '../models/NewsletterSubscriber.js'
import { Offering } from '../models/Offering.js'
import { OrderNotification } from '../models/OrderNotification.js'
import { Promotion } from '../models/Promotion.js'
import { PromotionEmail } from '../models/PromotionEmail.js'
import { ServiceRequest } from '../models/ServiceRequest.js'
import { SiteSettings } from '../models/SiteSettings.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import { removeAsset, uploadAsset } from '../services/cloudinary.js'
import { sendActivationEmail, sendCompletionEmail, sendPromotionEmail } from '../services/email.js'

const router = Router()
const validTypes = new Set(['service', 'hire'])
const validKinds = new Set(['image', 'video'])
const validStatuses = new Set(['pending', 'active', 'complete', 'cancel'])
const validPromotionScopes = new Set(['all', 'service', 'hire'])

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function booleanValue(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return fallback
  return ['true', '1', 'on', 'yes'].includes(value.toLowerCase())
}

function campaignContent(body: Record<string, unknown>) {
  const subject = String(body.subject || '').trim()
  const message = String(body.message || '').trim()
  if (!subject || !message) throw new Error('Add both an email subject and message.')
  if (subject.length > 160) throw new Error('Keep the email subject under 160 characters.')
  if (message.length > 5000) throw new Error('Keep the email message under 5,000 characters.')
  return { subject, message }
}

function youtubeEmbedUrl(value: string) {
  if (!value) return undefined
  try {
    const parsed = new URL(value)
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
    let videoId = ''
    if (host === 'youtu.be') videoId = parsed.pathname.split('/').filter(Boolean)[0] || ''
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch') videoId = parsed.searchParams.get('v') || ''
      else {
        const [format, id] = parsed.pathname.split('/').filter(Boolean)
        if (['embed', 'shorts', 'live'].includes(format)) videoId = id || ''
      }
    }
    return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? `https://www.youtube-nocookie.com/embed/${videoId}` : null
  } catch { return null }
}

function uploadedFile(files: Express.Request['files'], field: string) {
  if (!files || Array.isArray(files)) return undefined
  return files[field]?.[0]
}

function uploadedFiles(files: Express.Request['files'], field: string) {
  if (!files || Array.isArray(files)) return []
  return files[field] || []
}

router.use(requireAuth, requireAdmin)

router.get('/dashboard', async (_req, res, next) => {
  try {
    const [requests, messages, offerings, promotions, requestCount, pendingCount, unreadMessages, mediaCount] = await Promise.all([
      ServiceRequest.find().sort({ createdAt: -1 }).limit(6),
      ContactMessage.find().sort({ createdAt: -1 }).limit(6),
      Offering.find().populate('category', 'name').sort({ createdAt: -1 }).limit(6),
      Promotion.find().sort({ createdAt: -1 }).limit(4),
      ServiceRequest.countDocuments(),
      ServiceRequest.countDocuments({ status: 'pending' }),
      ContactMessage.countDocuments({ read: false }),
      MediaAsset.countDocuments(),
    ])
    return res.json({ totals: { requests: requestCount, pending: pendingCount, unreadMessages, media: mediaCount }, requests, messages, offerings, promotions })
  } catch (error) { return next(error) }
})

router.get('/newsletter-subscribers', async (_req, res, next) => {
  try { return res.json(await NewsletterSubscriber.find().sort({ createdAt: -1 })) } catch (error) { return next(error) }
})

router.delete('/newsletter-subscribers/:subscriberId', async (req, res, next) => {
  try {
    const subscriber = await NewsletterSubscriber.findByIdAndDelete(req.params.subscriberId)
    if (!subscriber) return res.status(404).json({ message: 'Subscriber not found.' })
    return res.status(204).send()
  } catch (error) { return next(error) }
})

router.get('/categories', async (req, res, next) => {
  try {
    const type = String(req.query.type || '')
    return res.json(await Category.find(validTypes.has(type) ? { type } : {}).sort({ type: 1, name: 1 }))
  } catch (error) { return next(error) }
})

router.post('/categories', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim()
    const type = String(req.body.type || '')
    if (!name || !validTypes.has(type)) return res.status(400).json({ message: 'A category name and valid type are required.' })
    const category = await Category.create({ name, type, slug: slugify(String(req.body.slug || name)), description: String(req.body.description || '').trim(), active: booleanValue(req.body.active, true) })
    return res.status(201).json(category)
  } catch (error) { return next(error) }
})

router.patch('/categories/:categoryId', async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.categoryId)
    if (!category) return res.status(404).json({ message: 'Category not found.' })
    const name = String(req.body.name || category.name).trim()
    category.name = name
    category.slug = slugify(String(req.body.slug || name))
    category.description = String(req.body.description ?? category.description).trim()
    category.active = booleanValue(req.body.active, category.active)
    await category.save()
    return res.json(category)
  } catch (error) { return next(error) }
})

router.delete('/categories/:categoryId', async (req, res, next) => {
  try {
    const inUse = await Offering.exists({ category: req.params.categoryId })
    if (inUse) return res.status(409).json({ message: 'Move or remove the items in this category before deleting it.' })
    const category = await Category.findByIdAndDelete(req.params.categoryId)
    if (!category) return res.status(404).json({ message: 'Category not found.' })
    return res.status(204).send()
  } catch (error) { return next(error) }
})

router.get('/offerings', async (req, res, next) => {
  try {
    const type = String(req.query.type || '')
    return res.json(await Offering.find(validTypes.has(type) ? { type } : {}).populate('category', 'name slug type').sort({ createdAt: -1 }))
  } catch (error) { return next(error) }
})

router.post('/offerings', upload.single('image'), async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim()
    const type = String(req.body.type || '')
    const categoryId = String(req.body.category || '')
    const price = Number(req.body.price)
    if (!req.file || !name || !validTypes.has(type) || !categoryId || !Number.isFinite(price) || price < 0) return res.status(400).json({ message: 'Add a name, type, category, price and image.' })
    if (!req.file.mimetype.startsWith('image/')) return res.status(400).json({ message: 'A service or hire item needs an image file.' })
    const category = await Category.findOne({ _id: categoryId, type })
    if (!category) return res.status(400).json({ message: 'Choose a category that belongs to this collection.' })
    const asset = await uploadAsset(req.file, `cotton-candy/${type}s`)
    const offering = await Offering.create({ name, type, category: category._id, price, description: String(req.body.description || '').trim(), availability: req.body.availability || 'available', featured: booleanValue(req.body.featured), active: booleanValue(req.body.active, true), imageUrl: asset.secure_url, imagePublicId: asset.public_id })
    return res.status(201).json(await offering.populate('category', 'name slug type'))
  } catch (error) { return next(error) }
})

router.patch('/offerings/:offeringId', upload.single('image'), async (req, res, next) => {
  try {
    const offering = await Offering.findById(req.params.offeringId)
    if (!offering) return res.status(404).json({ message: 'Service or hire item not found.' })
    const categoryId = String(req.body.category || offering.category)
    const category = await Category.findOne({ _id: categoryId, type: offering.type })
    if (!category) return res.status(400).json({ message: 'Choose a category that belongs to this collection.' })
    const price = req.body.price === undefined || req.body.price === '' ? offering.price : Number(req.body.price)
    if (!Number.isFinite(price) || price < 0) return res.status(400).json({ message: 'Enter a valid price.' })
    offering.name = String(req.body.name || offering.name).trim()
    offering.category = category._id
    offering.description = String(req.body.description ?? offering.description).trim()
    offering.price = price
    offering.availability = req.body.availability || offering.availability
    offering.featured = booleanValue(req.body.featured, offering.featured)
    offering.active = booleanValue(req.body.active, offering.active)
    if (req.file) {
      if (!req.file.mimetype.startsWith('image/')) return res.status(400).json({ message: 'Use an image file for this item.' })
      const asset = await uploadAsset(req.file, `cotton-candy/${offering.type}s`)
      const previousPublicId = offering.imagePublicId
      offering.imageUrl = asset.secure_url
      offering.imagePublicId = asset.public_id
      await removeAsset(previousPublicId)
    }
    await offering.save()
    return res.json(await offering.populate('category', 'name slug type'))
  } catch (error) { return next(error) }
})

router.delete('/offerings/:offeringId', async (req, res, next) => {
  try {
    const offering = await Offering.findByIdAndDelete(req.params.offeringId)
    if (!offering) return res.status(404).json({ message: 'Service or hire item not found.' })
    await removeAsset(offering.imagePublicId)
    return res.status(204).send()
  } catch (error) { return next(error) }
})

router.get('/service-requests', async (req, res, next) => {
  try {
    const status = String(req.query.status || '')
    return res.json(await ServiceRequest.find(validStatuses.has(status) ? { status } : {}).sort({ createdAt: -1 }))
  } catch (error) { return next(error) }
})

router.patch('/service-requests/:requestId/status', async (req, res, next) => {
  try {
    const status = String(req.body.status || '')
    if (!validStatuses.has(status)) return res.status(400).json({ message: 'Choose pending, active, complete or cancel.' })
    if (status === 'active' || status === 'complete') return res.status(400).json({ message: `Use the ${status === 'active' ? 'active order' : 'complete order'} workflow so the customer receives the right update.` })
    const request = await ServiceRequest.findByIdAndUpdate(req.params.requestId, { status }, { new: true })
    if (!request) return res.status(404).json({ message: 'Request not found.' })
    return res.json(request)
  } catch (error) { return next(error) }
})

router.post('/service-requests/:requestId/activate', async (req, res, next) => {
  try {
    const request = await ServiceRequest.findById(req.params.requestId)
    if (!request) return res.status(404).json({ message: 'Request not found.' })
    if (request.status === 'complete' || request.status === 'cancel') return res.status(400).json({ message: 'Completed or cancelled orders cannot be made active.' })
    request.status = 'active'
    await request.save()
    try {
      await sendActivationEmail({ customerName: request.customerName, email: request.email, trackingId: request.trackingId, offeringName: request.offeringName, type: request.type, hireDays: request.hireDays, totalPrice: request.totalPrice, eventDate: request.eventDate || undefined })
      request.activeEmailSentAt = new Date()
      await request.save()
      return res.json({ message: 'Order is active and the customer has been told you will contact them about the advance payment.', request, emailSent: true })
    } catch (error) {
      console.error('Active order email failed', error)
      return res.json({ message: 'Order is active, but the customer email could not be sent yet. Check your email settings and use resend notice.', request, emailSent: false })
    }
  } catch (error) { return next(error) }
})

router.patch('/service-requests/:requestId/advance-payment', async (req, res, next) => {
  try {
    const request = await ServiceRequest.findById(req.params.requestId)
    if (!request) return res.status(404).json({ message: 'Request not found.' })
    if (request.status !== 'active') return res.status(400).json({ message: 'Only active orders can have an advance payment recorded.' })
    const advancePaymentComplete = booleanValue(req.body.advancePaymentComplete, true)
    request.advancePaymentComplete = advancePaymentComplete
    request.advancePaymentCompletedAt = advancePaymentComplete ? new Date() : undefined
    await request.save()
    return res.json(request)
  } catch (error) { return next(error) }
})

router.post('/service-requests/:requestId/complete', async (req, res, next) => {
  try {
    const request = await ServiceRequest.findById(req.params.requestId)
    if (!request) return res.status(404).json({ message: 'Request not found.' })
    if (request.status !== 'active') return res.status(400).json({ message: 'Make this order active before completing it.' })
    if (!request.advancePaymentComplete) return res.status(400).json({ message: 'Record the advance payment before marking the full payment complete.' })
    request.status = 'complete'
    await request.save()
    try {
      await sendCompletionEmail({ customerName: request.customerName, email: request.email, trackingId: request.trackingId, offeringName: request.offeringName, type: request.type, hireDays: request.hireDays, totalPrice: request.totalPrice, eventDate: request.eventDate || undefined })
      request.completedEmailSentAt = new Date()
      await request.save()
      return res.json({ message: 'Order is complete and the customer has been emailed.', request, emailSent: true })
    } catch (error) {
      console.error('Completed order email failed', error)
      return res.json({ message: 'Order is complete, but the completion email could not be sent yet. Check your email settings and resend it after.', request, emailSent: false })
    }
  } catch (error) { return next(error) }
})

router.patch('/service-requests/:requestId/marketing-consent', async (req, res, next) => {
  try {
    const marketingConsent = booleanValue(req.body.marketingConsent)
    const request = await ServiceRequest.findByIdAndUpdate(req.params.requestId, { marketingConsent, marketingConsentAt: marketingConsent ? new Date() : undefined }, { new: true })
    if (!request) return res.status(404).json({ message: 'Request not found.' })
    return res.json(request)
  } catch (error) { return next(error) }
})

router.post('/service-requests/:requestId/activation-email', async (req, res, next) => {
  try {
    const request = await ServiceRequest.findById(req.params.requestId)
    if (!request) return res.status(404).json({ message: 'Request not found.' })
    if (request.status !== 'active') return res.status(400).json({ message: 'Mark this order active before sending the booking email.' })
    const resendEmailId = await sendActivationEmail({ customerName: request.customerName, email: request.email, trackingId: request.trackingId, offeringName: request.offeringName, type: request.type, hireDays: request.hireDays, totalPrice: request.totalPrice, eventDate: request.eventDate || undefined })
    request.activeEmailSentAt = new Date()
    await request.save()
    return res.status(201).json({ message: 'Active order notice sent.', resendEmailId })
  } catch (error) { return next(error) }
})

router.post('/service-requests/:requestId/promotion-email', async (req, res, next) => {
  try {
    const request = await ServiceRequest.findById(req.params.requestId)
    if (!request) return res.status(404).json({ message: 'Request not found.' })
    if (request.status !== 'complete') return res.status(400).json({ message: 'Promotion emails can only be sent from completed orders.' })
    if (!request.marketingConsent || request.marketingUnsubscribedAt) return res.status(400).json({ message: 'This customer has not given permission to receive promotion emails.' })
    const promotion = await Promotion.findOne({ _id: String(req.body.promotionId || ''), enabled: true })
    if (!promotion) return res.status(404).json({ message: 'Choose an active promotion.' })
    const { subject, message } = campaignContent(req.body)
    const resendEmailId = await sendPromotionEmail({ customerName: request.customerName, email: request.email, promotionTitle: promotion.title, promotionDescription: promotion.description, promotionImageUrl: promotion.desktopImageUrl, subject, message, requestId: request._id.toString() })
    await PromotionEmail.create({ request: request._id, promotion: promotion._id, recipientEmail: request.email, subject, message, resendEmailId })
    return res.status(201).json({ message: 'Promotion email sent.', sent: 1 })
  } catch (error) { return next(error) }
})

router.post('/promotion-emails/broadcast', async (req, res, next) => {
  try {
    const promotion = await Promotion.findOne({ _id: String(req.body.promotionId || ''), enabled: true })
    if (!promotion) return res.status(404).json({ message: 'Choose an active promotion.' })
    const { subject, message } = campaignContent(req.body)
    const completedRequests = await ServiceRequest.find({ status: 'complete', marketingConsent: true, marketingUnsubscribedAt: { $exists: false } }).sort({ createdAt: -1 })
    const recipients = [...new Map(completedRequests.map((request) => [request.email, request])).values()]
    const failures: string[] = []
    let sent = 0
    for (const request of recipients) {
      try {
        const resendEmailId = await sendPromotionEmail({ customerName: request.customerName, email: request.email, promotionTitle: promotion.title, promotionDescription: promotion.description, promotionImageUrl: promotion.desktopImageUrl, subject, message, requestId: request._id.toString() })
        await PromotionEmail.create({ request: request._id, promotion: promotion._id, recipientEmail: request.email, subject, message, resendEmailId })
        sent += 1
      } catch (error) {
        failures.push(request.email)
        console.error(`Promotion email failed for ${request.email}`, error)
      }
    }
    return res.json({ message: sent ? `Promotion email sent to ${sent} customer${sent === 1 ? '' : 's'}.` : 'No eligible completed customers were found.', sent, failed: failures.length })
  } catch (error) { return next(error) }
})

router.delete('/service-requests/:requestId', async (req, res, next) => {
  try {
    const request = await ServiceRequest.findById(req.params.requestId)
    if (!request) return res.status(404).json({ message: 'Request not found.' })
    await PromotionEmail.deleteMany({ request: request._id })
    await OrderNotification.deleteMany({ request: request._id })
    await request.deleteOne()
    return res.status(204).send()
  } catch (error) { return next(error) }
})

router.get('/order-notifications', async (_req, res, next) => {
  try {
    return res.json(await OrderNotification.find().populate('request', 'trackingId offeringName customerName email status eventDate hireDays totalPrice').sort({ read: 1, createdAt: -1 }))
  } catch (error) { return next(error) }
})

router.patch('/order-notifications/:notificationId/read', async (req, res, next) => {
  try {
    const notification = await OrderNotification.findByIdAndUpdate(req.params.notificationId, { read: booleanValue(req.body.read, true) }, { new: true }).populate('request', 'trackingId offeringName customerName email status eventDate hireDays totalPrice')
    if (!notification) return res.status(404).json({ message: 'Notification not found.' })
    return res.json(notification)
  } catch (error) { return next(error) }
})

router.get('/messages', async (_req, res, next) => {
  try { return res.json(await ContactMessage.find().sort({ createdAt: -1 })) } catch (error) { return next(error) }
})

router.patch('/messages/:messageId/read', async (req, res, next) => {
  try {
    const message = await ContactMessage.findByIdAndUpdate(req.params.messageId, { read: booleanValue(req.body.read, true) }, { new: true })
    if (!message) return res.status(404).json({ message: 'Message not found.' })
    return res.json(message)
  } catch (error) { return next(error) }
})

router.delete('/messages/:messageId', async (req, res, next) => {
  try {
    const message = await ContactMessage.findByIdAndDelete(req.params.messageId)
    if (!message) return res.status(404).json({ message: 'Message not found.' })
    return res.status(204).send()
  } catch (error) { return next(error) }
})

router.get('/media', async (req, res, next) => {
  try {
    const kind = String(req.query.kind || '')
    return res.json(await MediaAsset.find(validKinds.has(kind) ? { kind } : {}).sort({ createdAt: -1 }))
  } catch (error) { return next(error) }
})

router.post('/media', upload.array('media', 12), async (req, res, next) => {
  try {
    const kind = String(req.body.kind || '')
    const title = String(req.body.title || '').trim()
    const suppliedYoutubeUrl = String(req.body.youtubeUrl || '').trim()
    const embedUrl = youtubeEmbedUrl(suppliedYoutubeUrl)
    const category = String(req.body.category || '').replace(/\s+/g, ' ').trim()
    const mediaFiles = Array.isArray(req.files) ? req.files : []
    if (!title || !validKinds.has(kind)) return res.status(400).json({ message: 'Add a title and media type.' })
    if (kind === 'image' && !category) return res.status(400).json({ message: 'Choose an existing gallery category or create a new one.' })
    if (suppliedYoutubeUrl && kind !== 'video') return res.status(400).json({ message: 'YouTube links can only be added to gallery videos.' })
    if (suppliedYoutubeUrl && !embedUrl) return res.status(400).json({ message: 'Add a valid YouTube video link.' })
    if (mediaFiles.length && embedUrl) return res.status(400).json({ message: 'Choose either a video upload or a YouTube link.' })
    if (!mediaFiles.length && !embedUrl) return res.status(400).json({ message: kind === 'video' ? 'Upload a video file or add a YouTube link.' : 'Upload at least one image file.' })
    if (kind === 'video' && mediaFiles.length > 1) return res.status(400).json({ message: 'Upload one video file at a time.' })
    if (mediaFiles.some((file) => !file.mimetype.startsWith(`${kind}/`))) return res.status(400).json({ message: `Please upload ${kind} files only.` })
    if (embedUrl) {
      const media = await MediaAsset.create({ title, kind, category: category || 'celebrations', url: embedUrl, source: 'youtube' })
      return res.status(201).json([media])
    }
    const uploadedAssets = await Promise.all(mediaFiles.map((file) => uploadAsset(file, `cotton-candy/gallery/${kind}s`)))
    const media = await MediaAsset.insertMany(uploadedAssets.map((asset) => ({ title, kind, category: category || 'celebrations', url: asset.secure_url, source: 'upload', publicId: asset.public_id })))
    return res.status(201).json(media)
  } catch (error) { return next(error) }
})

router.patch('/media/group', async (req, res, next) => {
  try {
    const mediaIds = Array.isArray(req.body.mediaIds) ? [...new Set(req.body.mediaIds.map((value: unknown) => String(value).trim()).filter(Boolean))] : []
    const title = String(req.body.title || '').replace(/\s+/g, ' ').trim()
    const category = String(req.body.category || '').replace(/\s+/g, ' ').trim()
    if (!mediaIds.length || !title || !category) return res.status(400).json({ message: 'Add a title, category and at least one image.' })
    const media = await MediaAsset.find({ _id: { $in: mediaIds }, kind: 'image' })
    if (media.length !== mediaIds.length) return res.status(404).json({ message: 'One or more gallery images could not be found.' })
    await MediaAsset.updateMany({ _id: { $in: mediaIds } }, { $set: { title, category } })
    return res.json(await MediaAsset.find({ _id: { $in: mediaIds } }).sort({ createdAt: -1 }))
  } catch (error) { return next(error) }
})

router.delete('/media/:mediaId', async (req, res, next) => {
  try {
    const media = await MediaAsset.findByIdAndDelete(req.params.mediaId)
    if (!media) return res.status(404).json({ message: 'Media item not found.' })
    await removeAsset(media.publicId)
    return res.status(204).send()
  } catch (error) { return next(error) }
})

router.get('/promotions', async (_req, res, next) => {
  try { return res.json(await Promotion.find().sort({ createdAt: -1 })) } catch (error) { return next(error) }
})

router.post('/promotions', upload.fields([{ name: 'desktopImage', maxCount: 1 }, { name: 'mobileImage', maxCount: 1 }]), async (req, res, next) => {
  try {
    const desktopImage = uploadedFile(req.files, 'desktopImage')
    const mobileImage = uploadedFile(req.files, 'mobileImage')
    const title = String(req.body.title || '').trim()
    const description = String(req.body.description || '').trim()
    const discountPercent = Number(req.body.discountPercent || 0)
    const appliesTo = String(req.body.appliesTo || 'all')
    if (!desktopImage || !mobileImage || !title || !description) return res.status(400).json({ message: 'Add a title, description, desktop image and mobile image.' })
    if (!desktopImage.mimetype.startsWith('image/') || !mobileImage.mimetype.startsWith('image/')) return res.status(400).json({ message: 'Promotion artwork must be image files.' })
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) return res.status(400).json({ message: 'Discount must be between 0 and 100 percent.' })
    if (!validPromotionScopes.has(appliesTo)) return res.status(400).json({ message: 'Choose whether this promotion applies to services, hire, or all items.' })
    const [desktop, mobile] = await Promise.all([uploadAsset(desktopImage, 'cotton-candy/promotions'), uploadAsset(mobileImage, 'cotton-candy/promotions')])
    const showOnLoad = booleanValue(req.body.showOnLoad)
    if (showOnLoad) await Promotion.updateMany({}, { showOnLoad: false })
    const promotion = await Promotion.create({ title, description, desktopImageUrl: desktop.secure_url, desktopImagePublicId: desktop.public_id, mobileImageUrl: mobile.secure_url, mobileImagePublicId: mobile.public_id, discountPercent, appliesTo, enabled: booleanValue(req.body.enabled, true), showOnLoad })
    return res.status(201).json(promotion)
  } catch (error) { return next(error) }
})

router.patch('/promotions/:promotionId', upload.fields([{ name: 'desktopImage', maxCount: 1 }, { name: 'mobileImage', maxCount: 1 }]), async (req, res, next) => {
  try {
    const promotion = await Promotion.findById(req.params.promotionId)
    if (!promotion) return res.status(404).json({ message: 'Promotion not found.' })
    const desktopImage = uploadedFile(req.files, 'desktopImage')
    const mobileImage = uploadedFile(req.files, 'mobileImage')
    promotion.title = String(req.body.title || promotion.title).trim()
    promotion.description = String(req.body.description ?? promotion.description).trim()
    const discountPercent = req.body.discountPercent === undefined ? promotion.discountPercent : Number(req.body.discountPercent)
    const appliesTo = String(req.body.appliesTo || promotion.appliesTo)
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) return res.status(400).json({ message: 'Discount must be between 0 and 100 percent.' })
    if (!validPromotionScopes.has(appliesTo)) return res.status(400).json({ message: 'Choose whether this promotion applies to services, hire, or all items.' })
    promotion.discountPercent = discountPercent
    promotion.appliesTo = appliesTo as 'all' | 'service' | 'hire'
    promotion.enabled = booleanValue(req.body.enabled, promotion.enabled)
    const showOnLoad = booleanValue(req.body.showOnLoad, promotion.showOnLoad)
    if (showOnLoad) await Promotion.updateMany({ _id: { $ne: promotion._id } }, { showOnLoad: false })
    promotion.showOnLoad = showOnLoad
    if (desktopImage) {
      const asset = await uploadAsset(desktopImage, 'cotton-candy/promotions')
      const previousPublicId = promotion.desktopImagePublicId
      promotion.desktopImageUrl = asset.secure_url
      promotion.desktopImagePublicId = asset.public_id
      await removeAsset(previousPublicId)
    }
    if (mobileImage) {
      const asset = await uploadAsset(mobileImage, 'cotton-candy/promotions')
      const previousPublicId = promotion.mobileImagePublicId
      promotion.mobileImageUrl = asset.secure_url
      promotion.mobileImagePublicId = asset.public_id
      await removeAsset(previousPublicId)
    }
    await promotion.save()
    return res.json(promotion)
  } catch (error) { return next(error) }
})

router.delete('/promotions/:promotionId', async (req, res, next) => {
  try {
    const promotion = await Promotion.findByIdAndDelete(req.params.promotionId)
    if (!promotion) return res.status(404).json({ message: 'Promotion not found.' })
    await Promise.all([removeAsset(promotion.desktopImagePublicId), removeAsset(promotion.mobileImagePublicId)])
    return res.status(204).send()
  } catch (error) { return next(error) }
})

router.get('/home-content', async (_req, res, next) => {
  try { return res.json(await SiteSettings.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { new: true, upsert: true })) } catch (error) { return next(error) }
})

router.patch('/home-content', upload.fields([{ name: 'heroSlides', maxCount: 10 }, { name: 'introMain', maxCount: 1 }, { name: 'introSmall', maxCount: 1 }]), async (req, res, next) => {
  try {
    const settings = await SiteSettings.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { new: true, upsert: true })
    const heroSlideFiles = uploadedFiles(req.files, 'heroSlides')
    const introMain = uploadedFile(req.files, 'introMain')
    const introSmall = uploadedFile(req.files, 'introSmall')
    const removeHeroSlideUrl = String(req.body.removeHeroSlideUrl || '').trim()
    const existingSlides = settings.heroSlides.length
      ? settings.heroSlides.map((slide) => ({ url: slide.url, publicId: slide.publicId }))
      : [
          { url: settings.heroMainUrl, publicId: settings.heroMainPublicId },
          { url: settings.heroSmallUrl, publicId: settings.heroSmallPublicId },
        ].filter((slide) => Boolean(slide.url))
    let heroSlidesChanged = false

    if (removeHeroSlideUrl) {
      const slideToRemove = existingSlides.find((slide) => slide.url === removeHeroSlideUrl)
      if (!slideToRemove) return res.status(404).json({ message: 'Hero slider image not found.' })
      await removeAsset(slideToRemove.publicId)
      existingSlides.splice(existingSlides.indexOf(slideToRemove), 1)
      heroSlidesChanged = true
    }

    if (heroSlideFiles.length) {
      if (existingSlides.length + heroSlideFiles.length > 10) return res.status(400).json({ message: 'Keep the hero slider to 10 images or fewer.' })
      for (const file of heroSlideFiles) {
        if (!file.mimetype.startsWith('image/')) return res.status(400).json({ message: 'Hero slider files must be images.' })
      }
      const assets = await Promise.all(heroSlideFiles.map((file) => uploadAsset(file, 'cotton-candy/home-slider')))
      existingSlides.push(...assets.map((asset) => ({ url: asset.secure_url, publicId: asset.public_id })))
      heroSlidesChanged = true
    }

    if (heroSlidesChanged) {
      settings.set('heroSlides', existingSlides)
      settings.heroMainUrl = ''
      settings.heroMainPublicId = ''
      settings.heroSmallUrl = ''
      settings.heroSmallPublicId = ''
    }
    if (introMain) {
      if (!introMain.mimetype.startsWith('image/')) return res.status(400).json({ message: 'Home story images must be image files.' })
      const asset = await uploadAsset(introMain, 'cotton-candy/home')
      const previousPublicId = settings.introMainPublicId
      settings.introMainUrl = asset.secure_url
      settings.introMainPublicId = asset.public_id
      await removeAsset(previousPublicId)
    }
    if (introSmall) {
      if (!introSmall.mimetype.startsWith('image/')) return res.status(400).json({ message: 'Home story images must be image files.' })
      const asset = await uploadAsset(introSmall, 'cotton-candy/home')
      const previousPublicId = settings.introSmallPublicId
      settings.introSmallUrl = asset.secure_url
      settings.introSmallPublicId = asset.public_id
      await removeAsset(previousPublicId)
    }
    if (!heroSlidesChanged && !introMain && !introSmall) return res.status(400).json({ message: 'Choose at least one image to update.' })
    await settings.save()
    return res.json(settings)
  } catch (error) { return next(error) }
})

router.get('/page-artwork', async (_req, res, next) => {
  try { return res.json(await SiteSettings.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { new: true, upsert: true })) } catch (error) { return next(error) }
})

router.patch('/page-artwork', upload.fields([{ name: 'aboutHero', maxCount: 1 }, { name: 'aboutStory', maxCount: 1 }, { name: 'aboutFinishing', maxCount: 1 }, { name: 'galleryHero', maxCount: 1 }, { name: 'bookingsHero', maxCount: 1 }]), async (req, res, next) => {
  try {
    const settings = await SiteSettings.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { new: true, upsert: true })
    const artwork = [
      ['aboutHero', 'aboutHeroUrl', 'aboutHeroPublicId', 'About page hero image'],
      ['aboutStory', 'aboutStoryUrl', 'aboutStoryPublicId', 'About page story image'],
      ['aboutFinishing', 'aboutFinishingUrl', 'aboutFinishingPublicId', 'About page finishing touches image'],
      ['galleryHero', 'galleryHeroUrl', 'galleryHeroPublicId', 'Gallery page hero image'],
      ['bookingsHero', 'bookingsHeroUrl', 'bookingsHeroPublicId', 'Bookings, Services and Hire hero image'],
    ] as const
    let changed = false
    for (const [field, urlField, publicIdField, label] of artwork) {
      const file = uploadedFile(req.files, field)
      if (!file) continue
      if (!file.mimetype.startsWith('image/')) return res.status(400).json({ message: `${label} must be an image file.` })
      const asset = await uploadAsset(file, 'cotton-candy/page-artwork')
      const previousPublicId = settings.get(publicIdField) as string
      settings.set(urlField, asset.secure_url)
      settings.set(publicIdField, asset.public_id)
      await removeAsset(previousPublicId)
      changed = true
    }
    if (!changed) return res.status(400).json({ message: 'Choose at least one image to update.' })
    await settings.save()
    return res.json(settings)
  } catch (error) { return next(error) }
})

export { router as adminRouter }
