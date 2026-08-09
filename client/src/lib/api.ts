const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

type ApiOptions = Omit<RequestInit, 'body'> & { body?: BodyInit | Record<string, unknown>; token?: string }

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token, body, headers, ...init } = options
  const isFormData = body instanceof FormData
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    body: body && !isFormData ? JSON.stringify(body) : body,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })
  if (response.status === 204) return undefined as T
  const payload = await response.json().catch(() => ({ message: 'The server returned an unexpected response.' })) as T & { message?: string }
  if (!response.ok) throw new Error(payload.message || 'Something went wrong. Please try again.')
  return payload
}

export type CollectionType = 'service' | 'hire'
export type RequestStatus = 'pending' | 'active' | 'complete' | 'cancel'
export type Category = { _id: string; name: string; slug: string; type: CollectionType; description?: string; active: boolean }
export type Offering = { _id: string; name: string; type: CollectionType; category: Category | string; description: string; price: number; availability: 'available' | 'limited' | 'unavailable'; imageUrl: string; featured: boolean; active: boolean }
export type ServiceRequest = { _id: string; trackingId?: string; type: CollectionType; offeringName: string; customerName?: string; email?: string; phone?: string; eventType?: string; eventDate?: string; notes?: string; status: RequestStatus; hireDays: number; unitPrice: number; subtotal: number; discountPercent: number; discountAmount: number; totalPrice: number; promotionTitle?: string; advancePaymentComplete?: boolean; advancePaymentCompletedAt?: string; activeEmailSentAt?: string; completedEmailSentAt?: string; marketingConsent?: boolean; marketingUnsubscribedAt?: string; createdAt: string; updatedAt?: string }
export type ContactMessage = { _id: string; name: string; email: string; phone?: string; eventType?: string; eventDate?: string; message: string; createdAt: string; read: boolean }
export type MediaAsset = { _id: string; title: string; kind: 'image' | 'video'; category: string; url: string; source?: 'upload' | 'youtube'; createdAt: string }
export type Promotion = { _id: string; title: string; description: string; desktopImageUrl: string; mobileImageUrl: string; discountPercent: number; appliesTo: 'all' | CollectionType; enabled: boolean; showOnLoad: boolean; createdAt: string }
export type HeroSlide = { url: string; publicId?: string }
export type HomeContent = { _id: string; heroMainUrl: string; heroSmallUrl: string; heroSlides?: HeroSlide[]; introMainUrl: string; introSmallUrl: string; aboutHeroUrl: string; aboutStoryUrl: string; aboutFinishingUrl: string; bookingsHeroUrl: string }
export type AdminDashboard = { totals: { requests: number; pending: number; unreadMessages: number; media: number }; requests: ServiceRequest[]; messages: ContactMessage[]; offerings: Offering[]; promotions: Promotion[] }
export type AuthUser = { id: string; name: string; email: string; role: 'admin' }
export type AuthResponse = { token: string; user: AuthUser }
export type PromotionEmailResult = { message: string; sent: number; failed?: number }
export type NewsletterSubscriber = { _id: string; email: string; createdAt: string }
export type OrderNotification = { _id: string; request?: Pick<ServiceRequest, '_id' | 'trackingId' | 'offeringName' | 'customerName' | 'email' | 'status' | 'eventDate' | 'hireDays' | 'totalPrice'> | string | null; type: 'updated' | 'cancelled'; message: string; details?: string; read: boolean; createdAt: string }
export type OrderWorkflowResult = { message: string; request: ServiceRequest; emailSent: boolean }

export const api = {
  categories: (type?: CollectionType) => request<Category[]>(`/categories${type ? `?type=${type}` : ''}`),
  offerings: (type?: CollectionType, category?: string) => request<Offering[]>(`/offerings?${new URLSearchParams({ ...(type ? { type } : {}), ...(category ? { category } : {}) })}`),
  offering: (offeringId: string) => request<Offering>(`/offerings/${offeringId}`),
  createServiceRequest: (body: Record<string, unknown>) => request<{ message: string; request: ServiceRequest }>('/service-requests', { method: 'POST', body }),
  ordersByEmail: (email: string) => request<ServiceRequest[]>(`/service-requests?email=${encodeURIComponent(email)}`),
  updateCustomerOrder: (trackingId: string, body: Record<string, unknown>) => request<{ message: string; request: ServiceRequest }>(`/service-requests/${encodeURIComponent(trackingId)}/customer`, { method: 'PATCH', body }),
  media: (kind?: 'image' | 'video') => request<MediaAsset[]>(`/media${kind ? `?kind=${kind}` : ''}`),
  promotions: () => request<Promotion[]>('/promotions'),
  featuredPromotion: () => request<Promotion | null>('/promotions/featured'),
  homeContent: () => request<HomeContent>('/home-content'),
  subscribeNewsletter: (email: string) => request<{ message: string }>('/newsletter-subscribers', { method: 'POST', body: { email } }),
  sendEnquiry: (body: Record<string, unknown>) => request<{ message: string }>('/contact', { method: 'POST', body }),
  signInAsAdmin: (email: string, password: string) => request<AuthResponse>('/auth/admin-login', { method: 'POST', body: { email, password } }),
  dashboard: (token: string) => request<AdminDashboard>('/admin/dashboard', { token }),
  adminNewsletterSubscribers: (token: string) => request<NewsletterSubscriber[]>('/admin/newsletter-subscribers', { token }),
  deleteNewsletterSubscriber: (token: string, subscriberId: string) => request<void>(`/admin/newsletter-subscribers/${subscriberId}`, { method: 'DELETE', token }),
  adminCategories: (token: string, type?: CollectionType) => request<Category[]>(`/admin/categories${type ? `?type=${type}` : ''}`, { token }),
  createCategory: (token: string, body: Record<string, unknown>) => request<Category>('/admin/categories', { method: 'POST', body, token }),
  updateCategory: (token: string, categoryId: string, body: Record<string, unknown>) => request<Category>(`/admin/categories/${categoryId}`, { method: 'PATCH', body, token }),
  deleteCategory: (token: string, categoryId: string) => request<void>(`/admin/categories/${categoryId}`, { method: 'DELETE', token }),
  adminOfferings: (token: string, type?: CollectionType) => request<Offering[]>(`/admin/offerings${type ? `?type=${type}` : ''}`, { token }),
  createOffering: (token: string, form: FormData) => request<Offering>('/admin/offerings', { method: 'POST', body: form, token }),
  updateOffering: (token: string, offeringId: string, form: FormData) => request<Offering>(`/admin/offerings/${offeringId}`, { method: 'PATCH', body: form, token }),
  deleteOffering: (token: string, offeringId: string) => request<void>(`/admin/offerings/${offeringId}`, { method: 'DELETE', token }),
  adminServiceRequests: (token: string, status?: RequestStatus) => request<ServiceRequest[]>(`/admin/service-requests${status ? `?status=${status}` : ''}`, { token }),
  updateServiceRequestStatus: (token: string, requestId: string, status: RequestStatus) => request<ServiceRequest>(`/admin/service-requests/${requestId}/status`, { method: 'PATCH', body: { status }, token }),
  activateServiceRequest: (token: string, requestId: string) => request<OrderWorkflowResult>(`/admin/service-requests/${requestId}/activate`, { method: 'POST', token }),
  updateAdvancePayment: (token: string, requestId: string, advancePaymentComplete: boolean) => request<ServiceRequest>(`/admin/service-requests/${requestId}/advance-payment`, { method: 'PATCH', body: { advancePaymentComplete }, token }),
  completeServiceRequest: (token: string, requestId: string) => request<OrderWorkflowResult>(`/admin/service-requests/${requestId}/complete`, { method: 'POST', token }),
  sendActivationEmail: (token: string, requestId: string) => request<{ message: string }>(`/admin/service-requests/${requestId}/activation-email`, { method: 'POST', token }),
  updateMarketingConsent: (token: string, requestId: string, marketingConsent: boolean) => request<ServiceRequest>(`/admin/service-requests/${requestId}/marketing-consent`, { method: 'PATCH', body: { marketingConsent }, token }),
  sendPromotionEmail: (token: string, requestId: string, body: { promotionId: string; subject: string; message: string }) => request<PromotionEmailResult>(`/admin/service-requests/${requestId}/promotion-email`, { method: 'POST', body, token }),
  sendPromotionBroadcast: (token: string, body: { promotionId: string; subject: string; message: string }) => request<PromotionEmailResult>('/admin/promotion-emails/broadcast', { method: 'POST', body, token }),
  deleteServiceRequest: (token: string, requestId: string) => request<void>(`/admin/service-requests/${requestId}`, { method: 'DELETE', token }),
  adminOrderNotifications: (token: string) => request<OrderNotification[]>('/admin/order-notifications', { token }),
  markOrderNotificationRead: (token: string, notificationId: string, read: boolean) => request<OrderNotification>(`/admin/order-notifications/${notificationId}/read`, { method: 'PATCH', body: { read }, token }),
  adminMessages: (token: string) => request<ContactMessage[]>('/admin/messages', { token }),
  markMessageRead: (token: string, messageId: string, read: boolean) => request<ContactMessage>(`/admin/messages/${messageId}/read`, { method: 'PATCH', body: { read }, token }),
  adminMedia: (token: string, kind?: 'image' | 'video') => request<MediaAsset[]>(`/admin/media${kind ? `?kind=${kind}` : ''}`, { token }),
  createMedia: (token: string, form: FormData) => request<MediaAsset>('/admin/media', { method: 'POST', body: form, token }),
  deleteMedia: (token: string, mediaId: string) => request<void>(`/admin/media/${mediaId}`, { method: 'DELETE', token }),
  adminPromotions: (token: string) => request<Promotion[]>('/admin/promotions', { token }),
  createPromotion: (token: string, form: FormData) => request<Promotion>('/admin/promotions', { method: 'POST', body: form, token }),
  updatePromotion: (token: string, promotionId: string, form: FormData) => request<Promotion>(`/admin/promotions/${promotionId}`, { method: 'PATCH', body: form, token }),
  deletePromotion: (token: string, promotionId: string) => request<void>(`/admin/promotions/${promotionId}`, { method: 'DELETE', token }),
  adminHomeContent: (token: string) => request<HomeContent>('/admin/home-content', { token }),
  updateHomeContent: (token: string, form: FormData) => request<HomeContent>('/admin/home-content', { method: 'PATCH', body: form, token }),
  adminPageArtwork: (token: string) => request<HomeContent>('/admin/page-artwork', { token }),
  updatePageArtwork: (token: string, form: FormData) => request<HomeContent>('/admin/page-artwork', { method: 'PATCH', body: form, token }),
}
