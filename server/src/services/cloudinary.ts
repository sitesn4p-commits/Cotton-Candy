import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary'
import { env } from '../config.js'

if (env.cloudinaryUrl) cloudinary.config({ cloudinary_url: env.cloudinaryUrl })

export async function uploadAsset(file: Express.Multer.File, folder: string): Promise<UploadApiResponse> {
  if (!env.cloudinaryUrl) throw new Error('Cloudinary is not configured. Add CLOUDINARY_URL to server/.env.')
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: 'auto' }, (error, result) => {
      if (error || !result) return reject(error || new Error('Cloudinary did not return an upload result.'))
      return resolve(result)
    })
    stream.end(file.buffer)
  })
}

export async function removeAsset(publicId?: string) {
  if (!publicId || !env.cloudinaryUrl) return
  const imageResult = await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true })
  if (imageResult.result === 'not found') await cloudinary.uploader.destroy(publicId, { resource_type: 'video', invalidate: true })
}
