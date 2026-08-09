import { Schema, model } from 'mongoose'

const siteSettingsSchema = new Schema({
  key: { type: String, required: true, unique: true, default: 'main' },
  heroMainUrl: { type: String, default: '' },
  heroMainPublicId: { type: String, default: '' },
  heroSmallUrl: { type: String, default: '' },
  heroSmallPublicId: { type: String, default: '' },
  heroSlides: [{
    url: { type: String, required: true },
    publicId: { type: String, default: '' },
  }],
  introMainUrl: { type: String, default: '' },
  introMainPublicId: { type: String, default: '' },
  introSmallUrl: { type: String, default: '' },
  introSmallPublicId: { type: String, default: '' },
  aboutHeroUrl: { type: String, default: '' },
  aboutHeroPublicId: { type: String, default: '' },
  aboutStoryUrl: { type: String, default: '' },
  aboutStoryPublicId: { type: String, default: '' },
  aboutFinishingUrl: { type: String, default: '' },
  aboutFinishingPublicId: { type: String, default: '' },
  bookingsHeroUrl: { type: String, default: '' },
  bookingsHeroPublicId: { type: String, default: '' },
}, { timestamps: true })

export const SiteSettings = model('SiteSettings', siteSettingsSchema)
