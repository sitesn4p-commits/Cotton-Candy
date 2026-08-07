import { Schema, model } from 'mongoose'

const newsletterSubscriberSchema = new Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
}, { timestamps: true })

export const NewsletterSubscriber = model('NewsletterSubscriber', newsletterSubscriberSchema)
