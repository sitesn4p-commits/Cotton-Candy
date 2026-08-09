import jwt from 'jsonwebtoken'
import { Resend } from 'resend'
import { env } from '../config.js'

type UnsubscribePayload = { requestId: string; email: string; purpose: 'marketing-unsubscribe' }

type PromotionEmailInput = {
  customerName: string
  email: string
  promotionTitle: string
  promotionDescription: string
  promotionImageUrl: string
  subject: string
  message: string
  requestId: string
}

type ActivationEmailInput = {
  customerName: string
  email: string
  trackingId: string
  offeringName: string
  type: 'service' | 'hire'
  hireDays: number
  totalPrice: number
  eventDate?: Date
}

type CompletionEmailInput = ActivationEmailInput

type TemplateEmailInput = {
  templateId: string
  to: string
  subject: string
  variables: Record<string, string | number>
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] || character)
}

function messageHtml(value: string) {
  return escapeHtml(value).split(/\r?\n/).filter(Boolean).map((paragraph) => `<p style="margin:0 0 16px;">${paragraph}</p>`).join('')
}

function createUnsubscribeToken(requestId: string, email: string) {
  if (!env.jwtSecret) throw new Error('Email delivery is not configured. Add the server JWT secret first.')
  return jwt.sign({ requestId, email, purpose: 'marketing-unsubscribe' satisfies UnsubscribePayload['purpose'] }, env.jwtSecret, { expiresIn: '365d' })
}

export function verifyUnsubscribeToken(token: string): UnsubscribePayload {
  if (!env.jwtSecret) throw new Error('This unsubscribe link is unavailable.')
  const payload = jwt.verify(token, env.jwtSecret) as Partial<UnsubscribePayload>
  if (payload.purpose !== 'marketing-unsubscribe' || !payload.requestId || !payload.email) throw new Error('This unsubscribe link is invalid.')
  return { requestId: payload.requestId, email: payload.email, purpose: 'marketing-unsubscribe' }
}

function configuredResend() {
  if (!env.resendApiKey || !env.emailFrom) throw new Error('Email delivery is not ready. Add RESEND_API_KEY and EMAIL_FROM in Render after verifying the sender domain.')
  return new Resend(env.resendApiKey)
}

async function sendTemplateEmail(resend: Resend, input: TemplateEmailInput) {
  const { data, error } = await resend.emails.send({
    from: env.emailFrom,
    to: [input.to],
    subject: input.subject,
    template: { id: input.templateId, variables: input.variables },
    ...(env.emailReplyTo ? { replyTo: env.emailReplyTo } : {}),
  })
  if (error) throw new Error(error.message || 'Resend could not deliver this template email.')
  return data?.id || ''
}

export async function sendPromotionEmail(input: PromotionEmailInput) {
  const resend = configuredResend()
  const unsubscribeUrl = new URL('/api/marketing/unsubscribe', env.serverUrl)
  unsubscribeUrl.searchParams.set('token', createUnsubscribeToken(input.requestId, input.email))
  const promotionUrl = env.websiteUrl ? `${env.websiteUrl}/promotions` : ''
  const customerName = escapeHtml(input.customerName || 'there')
  const promotionTitle = escapeHtml(input.promotionTitle)
  const promotionDescription = escapeHtml(input.promotionDescription)
  const callToAction = promotionUrl ? `<a href="${promotionUrl}" style="background:#38382f;color:#fff;display:inline-block;font:700 12px Arial,sans-serif;letter-spacing:.5px;padding:14px 20px;text-decoration:none;text-transform:uppercase;">Explore the offer →</a>` : ''
  const image = input.promotionImageUrl ? `<img src="${input.promotionImageUrl}" alt="${promotionTitle}" style="display:block;height:auto;margin:0 0 24px;max-width:100%;width:560px;" />` : ''
  if (env.resendPromotionTemplateId) return sendTemplateEmail(resend, {
    templateId: env.resendPromotionTemplateId,
    to: input.email,
    subject: input.subject,
    variables: {
      customer_name: input.customerName || 'there',
      email_heading: input.promotionTitle,
      email_message: input.message,
      promotion_title: input.promotionTitle,
      promotion_description: input.promotionDescription,
      promotion_image_url: input.promotionImageUrl,
      promotion_url: promotionUrl,
      unsubscribe_url: unsubscribeUrl.toString(),
    },
  })
  const html = `<div style="background:#f4f0ea;color:#38382f;font-family:Arial,sans-serif;padding:32px 16px;"><main style="background:#fffdfa;margin:0 auto;max-width:560px;padding:34px;"><p style="color:#ae6965;font-size:11px;font-weight:700;letter-spacing:1.6px;margin:0 0 16px;text-transform:uppercase;">Cotton Candy Event Deco</p>${image}<h1 style="font-family:Georgia,serif;font-size:34px;font-weight:400;line-height:1.12;margin:0 0 18px;">${promotionTitle}</h1><p style="font-size:16px;line-height:1.65;margin:0 0 18px;">Hi ${customerName},</p>${messageHtml(input.message)}<p style="color:#6f6d63;font-size:15px;line-height:1.6;margin:0 0 22px;">${promotionDescription}</p>${callToAction}<hr style="border:0;border-top:1px solid #e5dfd6;margin:30px 0 16px;" /><p style="color:#6f6d63;font-size:11px;line-height:1.55;margin:0;">You are receiving this because you gave Cotton Candy Event Deco permission to send celebration offers. <a href="${unsubscribeUrl.toString()}" style="color:#ae6965;">Unsubscribe from promotion emails</a>.</p></main></div>`
  const text = `Hi ${input.customerName || 'there'},\n\n${input.message}\n\n${input.promotionTitle}\n${input.promotionDescription}${promotionUrl ? `\n\nExplore the offer: ${promotionUrl}` : ''}\n\nUnsubscribe: ${unsubscribeUrl.toString()}`
  const { data, error } = await resend.emails.send({ from: env.emailFrom, to: [input.email], subject: input.subject, html, text, ...(env.emailReplyTo ? { replyTo: env.emailReplyTo } : {}) })
  if (error) throw new Error(error.message || 'Resend could not deliver this promotion email.')
  return data?.id || ''
}

export async function sendActivationEmail(input: ActivationEmailInput) {
  const resend = configuredResend()
  const eventDate = input.eventDate ? new Intl.DateTimeFormat('en-AU', { dateStyle: 'long' }).format(input.eventDate) : 'To be confirmed'
  const bookingType = input.type === 'hire' ? `Hire booking${input.hireDays > 1 ? ` · ${input.hireDays} days` : ''}` : 'Event service booking'
  const totalPrice = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(input.totalPrice)
  const bookingUrl = env.websiteUrl ? `${env.websiteUrl}/services-hire` : ''
  if (env.resendBookingTemplateId) return sendTemplateEmail(resend, {
    templateId: env.resendBookingTemplateId,
    to: input.email,
    subject: 'Your Cotton Candy booking is active',
    variables: {
      customer_name: input.customerName || 'there',
      booking_id: input.trackingId,
      service_name: input.offeringName,
      event_date: eventDate,
      total_amount: totalPrice,
      booking_status: `Active · ${bookingType}`,
      booking_url: bookingUrl,
    },
  })
  const customerName = escapeHtml(input.customerName || 'there')
  const html = `<div style="background:#f4f0ea;color:#38382f;font-family:Arial,sans-serif;padding:32px 16px;"><main style="background:#fffdfa;margin:0 auto;max-width:560px;padding:34px;"><p style="color:#ae6965;font-size:11px;font-weight:700;letter-spacing:1.6px;margin:0 0 16px;text-transform:uppercase;">Cotton Candy Event Deco</p><h1 style="font-family:Georgia,serif;font-size:34px;font-weight:400;line-height:1.12;margin:0 0 18px;">Your booking is active.</h1><p style="font-size:16px;line-height:1.65;margin:0 0 18px;">Hi ${customerName},</p><p style="font-size:16px;line-height:1.65;margin:0 0 18px;">Your Cotton Candy order is now active. Our team will be in touch soon to discuss your advance payment and the next beautiful details for your celebration.</p><div style="background:#f4f0ea;margin:24px 0;padding:18px;"><p style="font-size:12px;line-height:1.6;margin:0 0 8px;"><strong>Reference:</strong> ${escapeHtml(input.trackingId)}</p><p style="font-size:12px;line-height:1.6;margin:0 0 8px;"><strong>Booking:</strong> ${escapeHtml(input.offeringName)}</p><p style="font-size:12px;line-height:1.6;margin:0 0 8px;"><strong>Type:</strong> ${escapeHtml(bookingType)}</p><p style="font-size:12px;line-height:1.6;margin:0 0 8px;"><strong>Event date:</strong> ${escapeHtml(eventDate)}</p><p style="font-size:12px;line-height:1.6;margin:0;"><strong>Order value:</strong> ${escapeHtml(totalPrice)}</p></div>${bookingUrl ? `<a href="${bookingUrl}" style="background:#38382f;color:#fff;display:inline-block;font:700 12px Arial,sans-serif;letter-spacing:.5px;padding:14px 20px;text-decoration:none;text-transform:uppercase;">Track your order →</a>` : ''}</main></div>`
  const text = `Hi ${input.customerName || 'there'},\n\nYour Cotton Candy order is now active. Our team will be in touch soon to discuss your advance payment and the next beautiful details for your celebration.\n\nReference: ${input.trackingId}\nBooking: ${input.offeringName}\nType: ${bookingType}\nEvent date: ${eventDate}\nOrder value: ${totalPrice}`
  const { data, error } = await resend.emails.send({ from: env.emailFrom, to: [input.email], subject: 'Your Cotton Candy booking is active', html, text, ...(env.emailReplyTo ? { replyTo: env.emailReplyTo } : {}) })
  if (error) throw new Error(error.message || 'Resend could not deliver this booking email.')
  return data?.id || ''
}

export async function sendCompletionEmail(input: CompletionEmailInput) {
  const resend = configuredResend()
  const eventDate = input.eventDate ? new Intl.DateTimeFormat('en-AU', { dateStyle: 'long' }).format(input.eventDate) : 'To be confirmed'
  const bookingType = input.type === 'hire' ? `Hire booking${input.hireDays > 1 ? ` · ${input.hireDays} days` : ''}` : 'Event service booking'
  const totalPrice = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(input.totalPrice)
  const bookingUrl = env.websiteUrl ? `${env.websiteUrl}/services-hire` : ''

  if (env.resendCompletionTemplateId) {
    return sendTemplateEmail(resend, {
      templateId: env.resendCompletionTemplateId,
      to: input.email,
      subject: 'Your Cotton Candy order is complete',
      variables: {
        customer_name: input.customerName || 'there',
        booking_id: input.trackingId,
        service_name: input.offeringName,
        event_date: eventDate,
        total_amount: totalPrice,
        booking_status: `Complete · ${bookingType}`,
        booking_url: bookingUrl,
        email_heading: 'Your order is complete',
        email_message: 'Your full payment has been received and your Cotton Candy order is now complete. Thank you for celebrating with us.',
      },
    })
  }

  const customerName = escapeHtml(input.customerName || 'there')
  const html = `<div style="background:#f4f0ea;color:#38382f;font-family:Arial,sans-serif;padding:32px 16px;"><main style="background:#fffdfa;margin:0 auto;max-width:560px;padding:34px;"><p style="color:#ae6965;font-size:11px;font-weight:700;letter-spacing:1.6px;margin:0 0 16px;text-transform:uppercase;">Cotton Candy Event Deco</p><h1 style="font-family:Georgia,serif;font-size:34px;font-weight:400;line-height:1.12;margin:0 0 18px;">Your order is complete.</h1><p style="font-size:16px;line-height:1.65;margin:0 0 18px;">Hi ${customerName},</p><p style="font-size:16px;line-height:1.65;margin:0 0 18px;">Your full payment has been received and your Cotton Candy order is now complete. Thank you for trusting us with your celebration.</p><div style="background:#f4f0ea;margin:24px 0;padding:18px;"><p style="font-size:12px;line-height:1.6;margin:0 0 8px;"><strong>Reference:</strong> ${escapeHtml(input.trackingId)}</p><p style="font-size:12px;line-height:1.6;margin:0 0 8px;"><strong>Booking:</strong> ${escapeHtml(input.offeringName)}</p><p style="font-size:12px;line-height:1.6;margin:0;"><strong>Event date:</strong> ${escapeHtml(eventDate)}</p></div>${bookingUrl ? `<a href="${bookingUrl}" style="background:#38382f;color:#fff;display:inline-block;font:700 12px Arial,sans-serif;letter-spacing:.5px;padding:14px 20px;text-decoration:none;text-transform:uppercase;">View your order →</a>` : ''}</main></div>`
  const text = `Hi ${input.customerName || 'there'},\n\nYour full payment has been received and your Cotton Candy order is now complete. Thank you for trusting us with your celebration.\n\nReference: ${input.trackingId}\nBooking: ${input.offeringName}\nEvent date: ${eventDate}`
  const { data, error } = await resend.emails.send({ from: env.emailFrom, to: [input.email], subject: 'Your Cotton Candy order is complete', html, text, ...(env.emailReplyTo ? { replyTo: env.emailReplyTo } : {}) })
  if (error) throw new Error(error.message || 'Resend could not deliver this completed order email.')
  return data?.id || ''
}
