const cloudinaryUploadMarker = '/image/upload/'

export function optimizedImageUrl(source: string, width: number) {
  if (!source.includes(cloudinaryUploadMarker)) return source
  return source.replace(cloudinaryUploadMarker, `${cloudinaryUploadMarker}f_auto,q_auto,c_limit,w_${width}/`)
}

export function responsiveImageSrcSet(source: string, widths: number[]) {
  if (!source.includes(cloudinaryUploadMarker)) return undefined
  return widths.map((width) => `${optimizedImageUrl(source, width)} ${width}w`).join(', ')
}

export function heroImageWidth() {
  const mobile = window.matchMedia('(max-width: 800px)').matches
  return mobile ? 640 : 1200
}
