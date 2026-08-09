import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useFeedback } from '../components/Feedback'
import { api, type AdminDashboard, type Category, type CollectionType, type ContactMessage, type HomeContent, type MediaAsset, type NewsletterSubscriber, type Offering, type OrderNotification, type Promotion, type RequestStatus, type ServiceRequest } from '../lib/api'
import { useAuth } from '../lib/useAuth'

const emptyDashboard: AdminDashboard = { totals: { requests: 0, pending: 0, unreadMessages: 0, media: 0 }, requests: [], messages: [], offerings: [], promotions: [] }

function useAdminToken() { const { token } = useAuth(); return token || '' }
function EmptyState({ children }: { children: ReactNode }) { return <p className="empty-state">{children}</p> }
function categoryLabel(category: Offering['category']) { return typeof category === 'string' ? category : category.name }
function formatLkr(amount: number | undefined) { return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(amount || 0) }
function messageFor(reason: unknown, fallback: string) { return reason instanceof Error ? reason.message : fallback }

function ErrorNotice({ error }: { error: string | null }) {
  const { notify } = useFeedback()
  useEffect(() => { if (error) notify({ tone: 'error', title: 'Something needs attention', message: error }) }, [error, notify])
  return error ? <p className="admin-error">{error}</p> : null
}

export function AdminPage() {
  const token = useAdminToken()
  const [dashboard, setDashboard] = useState(emptyDashboard)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { api.dashboard(token).then(setDashboard).catch((reason: unknown) => setError(messageFor(reason, 'Unable to load dashboard.'))) }, [token])

  return <section className="admin-page"><div className="admin-page-heading"><div><p className="eyebrow">Business overview</p><h1>Everything, <em>beautifully organised.</em></h1></div></div><ErrorNotice error={error} /><div className="admin-stat-grid"><Stat label="Total requests" value={dashboard.totals.requests} icon="◫" /><Stat label="Waiting for you" value={dashboard.totals.pending} icon="✦" /><Stat label="Unread messages" value={dashboard.totals.unreadMessages} icon="✉" /><Stat label="Gallery assets" value={dashboard.totals.media} icon="▧" /></div><div className="admin-dashboard-grid"><Panel title="Latest service & hire requests" action="Manage requests" to="/manage-cotton-candy/requests">{dashboard.requests.length ? <div className="admin-list">{dashboard.requests.map((request) => <article key={request._id}><div><strong>{request.customerName || 'Customer'}</strong><p>{request.offeringName} · {formatLkr(request.totalPrice)}</p></div><span className={`request-status ${request.status}`}>{request.status}</span></article>)}</div> : <EmptyState>New service and hire requests will appear here.</EmptyState>}</Panel><Panel title="Latest contact messages" action="View messages" to="/manage-cotton-candy/messages">{dashboard.messages.length ? <div className="admin-list">{dashboard.messages.map((message) => <article key={message._id}><div><strong>{message.name}</strong><p>{message.message}</p></div>{!message.read ? <span className="admin-new">New</span> : null}</article>)}</div> : <EmptyState>Contact form messages will appear here.</EmptyState>}</Panel></div><Panel title="Published promotions" action="Manage promotions" to="/manage-cotton-candy/promotions">{dashboard.promotions.length ? <div className="admin-mini-promotions">{dashboard.promotions.map((promotion) => <article key={promotion._id}><img src={promotion.desktopImageUrl} alt="" /><div><strong>{promotion.title}</strong><p>{promotion.discountPercent ? `${promotion.discountPercent}% off ${promotion.appliesTo === 'all' ? 'all items' : `${promotion.appliesTo} items`}` : promotion.showOnLoad ? 'Shown when visitors open the website' : 'Promotion page only'}</p></div></article>)}</div> : <EmptyState>Create a promotion to feature an offer on your website.</EmptyState>}</Panel></section>
}

function Stat({ label, value, icon }: { label: string; value: number; icon: string }) { return <article><span>{icon}</span><div><p>{label}</p><strong>{value}</strong></div></article> }
function Panel({ title, action, to, children }: { title: string; action?: string; to?: string; children: ReactNode }) { return <section className="admin-card"><header><h2>{title}</h2>{action && to ? <a href={to}>{action} →</a> : null}</header>{children}</section> }

export function AdminCollectionPage({ type }: { type: CollectionType }) {
  const token = useAdminToken()
  const { confirm, notify } = useFeedback()
  const [offerings, setOfferings] = useState<Offering[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [editing, setEditing] = useState<Offering | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => Promise.all([api.adminOfferings(token, type), api.adminCategories(token, type)]).then(([items, nextCategories]) => { setOfferings(items); setCategories(nextCategories); setError(null) }).catch((reason: unknown) => setError(messageFor(reason, 'Unable to load this collection.'))), [token, type])
  const label = type === 'service' ? 'Services' : 'Hire collection'

  useEffect(() => { void load() }, [load])

  const removeOffering = async (offering: Offering) => {
    if (!await confirm({ title: `Remove ${offering.name}?`, message: 'This item will no longer appear on your website or be available for new customer requests.', confirmLabel: 'Remove item' })) return
    try {
      await api.deleteOffering(token, offering._id)
      await load()
      notify({ title: 'Item removed', message: `${offering.name} is no longer published.` })
    } catch (reason) { setError(messageFor(reason, 'Unable to remove item.')) }
  }

  return <section className="admin-page"><div className="admin-page-heading"><div><p className="eyebrow">{type === 'service' ? 'Creative event offerings' : 'Products customers can hire'}</p><h1>{label}, <em>made simple.</em></h1></div><button className="admin-button" type="button" onClick={() => setCreating(true)}>+ Add {type}</button></div><ErrorNotice error={error} />{!categories.length ? <div className="admin-info">Create a {type} category first, then upload your first item.</div> : null}<section className="admin-card admin-table-card"><header><h2>Published {label.toLowerCase()}</h2><span>{offerings.length} items</span></header>{offerings.length ? <div className="admin-offering-list">{offerings.map((offering) => <article key={offering._id}><img src={offering.imageUrl} alt={offering.name} /><div><p>{categoryLabel(offering.category)}</p><h3>{offering.name}</h3><small>{formatLkr(offering.price)}{type === 'hire' ? ' per day' : ''} · {offering.availability}</small></div><div className="admin-row-actions"><button type="button" onClick={() => setEditing(offering)}>Edit</button><button type="button" onClick={() => void removeOffering(offering)}>Remove</button></div></article>)}</div> : <EmptyState>No {label.toLowerCase()} yet. Add your first one when ready.</EmptyState>}</section>{creating ? <OfferingEditor type={type} categories={categories} token={token} onClose={() => setCreating(false)} onSaved={async () => { await load(); setCreating(false) }} /> : null}{editing ? <OfferingEditor type={type} categories={categories} offering={editing} token={token} onClose={() => setEditing(null)} onSaved={async () => { await load(); setEditing(null) }} /> : null}</section>
}

function OfferingEditor({ type, categories, offering, token, onClose, onSaved }: { type: CollectionType; categories: Category[]; offering?: Offering; token: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const { notify } = useFeedback()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const activeCategory = typeof offering?.category === 'string' ? offering.category : offering?.category._id

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    form.set('type', type)
    form.set('featured', String((formElement.elements.namedItem('featured') as HTMLInputElement).checked))
    setSaving(true)
    setError(null)
    try {
      if (offering) await api.updateOffering(token, offering._id, form)
      else await api.createOffering(token, form)
      await onSaved()
      notify({ title: offering ? 'Changes saved' : 'Item published', message: `${offering?.name || String(form.get('name') || 'Your item')} is ready on the website.` })
    } catch (reason) { setError(messageFor(reason, 'Unable to save this item.')) } finally { setSaving(false) }
  }

  return <Dialog title={offering ? `Edit ${offering.name}` : `Add a ${type}`} onClose={onClose}><form className="admin-form-grid" onSubmit={submit}><label>Name<input name="name" defaultValue={offering?.name} required /></label><label>Category<select name="category" defaultValue={activeCategory || ''} required><option value="" disabled>Choose a category</option>{categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label><label>{type === 'hire' ? 'Daily hire price (LKR)' : 'Service price (LKR)'}<input name="price" type="number" min="0" step="1" defaultValue={offering?.price} required /></label><label>Availability<select name="availability" defaultValue={offering?.availability || 'available'}><option value="available">Available</option><option value="limited">Limited</option><option value="unavailable">Unavailable</option></select></label><label className="admin-full">Description<textarea name="description" defaultValue={offering?.description} placeholder="A short description for your website" /></label><label className="file-input admin-full">{offering ? 'Replace image (optional)' : 'Image'}<input name="image" type="file" accept="image/*" required={!offering} /></label><label className="admin-check"><input name="featured" type="checkbox" defaultChecked={offering?.featured} /> Feature this item</label><button className="admin-button admin-full" type="submit" disabled={saving}>{saving ? 'Saving…' : offering ? 'Save changes' : `Publish ${type}`}</button><ErrorNotice error={error} /></form></Dialog>
}

export function AdminCategoriesPage() {
  const token = useAdminToken()
  const { confirm, notify } = useFeedback()
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => api.adminCategories(token).then((items) => { setCategories(items); setError(null) }).catch((reason: unknown) => setError(messageFor(reason, 'Unable to load categories.'))), [token])
  useEffect(() => { void load() }, [load])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    setError(null)
    try {
      const category = await api.createCategory(token, Object.fromEntries(new FormData(form)))
      form.reset()
      await load()
      notify({ title: 'Category created', message: `${category.name} is ready to use for new items.` })
    } catch (reason) { setError(messageFor(reason, 'Unable to create category.')) }
  }

  const removeCategory = async (category: Category) => {
    if (!await confirm({ title: `Delete ${category.name}?`, message: 'This category will be removed. Categories with published items cannot be deleted.', confirmLabel: 'Delete category' })) return
    try {
      await api.deleteCategory(token, category._id)
      await load()
      notify({ title: 'Category deleted', message: `${category.name} has been removed.` })
    } catch (reason) { setError(messageFor(reason, 'Unable to delete category.')) }
  }

  return <section className="admin-page"><div className="admin-page-heading"><div><p className="eyebrow">Organise your collections</p><h1>Service & hire <em>categories.</em></h1></div></div><ErrorNotice error={error} /><div className="admin-split"><Panel title="Create category"><form className="admin-form-grid" onSubmit={submit}><label>Name<input name="name" required placeholder="e.g. Backdrops" /></label><label>Collection<select name="type" defaultValue="service"><option value="service">Services</option><option value="hire">Hire</option></select></label><label className="admin-full">Short description (optional)<textarea name="description" placeholder="Shown only in admin" /></label><button className="admin-button" type="submit">Create category</button></form></Panel><Panel title="Your categories">{categories.length ? <div className="category-list">{categories.map((category) => <article key={category._id}><div><strong>{category.name}</strong><p>{category.type} · /{category.slug}</p></div><button type="button" onClick={() => void removeCategory(category)}>Delete</button></article>)}</div> : <EmptyState>Create categories before adding services and hire items.</EmptyState>}</Panel></div></section>
}

export function AdminRequestsPage() {
  const token = useAdminToken()
  const { confirm, notify } = useFeedback()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null)
  const [activationRequest, setActivationRequest] = useState<ServiceRequest | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => api.adminServiceRequests(token, 'pending').then((items) => { setRequests(items); setError(null) }).catch((reason: unknown) => setError(messageFor(reason, 'Unable to load requests.'))), [token])
  useEffect(() => { void load() }, [load])

  const activateAndSendEmail = async (request: ServiceRequest) => {
    try {
      const result = await api.activateServiceRequest(token, request._id)
      setRequests((current) => current.filter((item) => item._id !== result.request._id))
      setSelectedRequest(null)
      if (result.emailSent) notify({ title: 'Order active & customer notified', message: `An active order notice was sent to ${result.request.email}.` })
      else {
        setError(result.message)
        notify({ tone: 'error', title: 'Order active, email needs attention', message: result.message })
      }
      return true
    } catch (reason) {
      setError(messageFor(reason, 'Unable to activate this order.'))
      return false
    }
  }

  const deleteRequest = async (request: ServiceRequest) => {
    if (!await confirm({ title: 'Delete this customer request?', message: `${request.offeringName} for ${request.customerName} will be permanently deleted. This cannot be undone.`, confirmLabel: 'Delete request' })) return
    try {
      await api.deleteServiceRequest(token, request._id)
      setRequests((current) => current.filter((item) => item._id !== request._id))
      setSelectedRequest((current) => current?._id === request._id ? null : current)
      notify({ title: 'Request deleted', message: `${request.offeringName} has been removed from your order list.` })
    } catch (reason) { setError(messageFor(reason, 'Unable to delete request.')) }
  }
  return <section className="admin-page"><div className="admin-page-heading"><div><p className="eyebrow">Customer orders</p><h1>New service & hire <em>requests.</em></h1></div></div><ErrorNotice error={error} /><section className="admin-card admin-table-card">{requests.length ? <div className="request-admin-list">{requests.map((request) => <article key={request._id}><button className="request-admin-summary" type="button" onClick={() => setSelectedRequest(request)}><strong>{request.customerName}</strong><p>{request.offeringName} · <b>{formatLkr(request.totalPrice)}</b>{request.type === 'hire' ? ` · ${request.hireDays} day${request.hireDays === 1 ? '' : 's'}` : ''}</p><small>{request.email}{request.promotionTitle ? ` · ${request.promotionTitle} (${request.discountPercent}% off)` : ''}{request.eventDate ? ` · ${new Date(request.eventDate).toLocaleDateString()}` : ''}</small><span>View full order →</span></button><div className="request-admin-actions"><button className="admin-button" type="button" onClick={() => setActivationRequest(request)}>Activate order</button><button type="button" onClick={() => void deleteRequest(request)}>Delete</button></div></article>)}</div> : <EmptyState>New customer service and hire requests will appear here.</EmptyState>}</section>{selectedRequest ? <OrderDetailDialog request={selectedRequest} onClose={() => setSelectedRequest(null)} onDelete={deleteRequest} /> : null}{activationRequest ? <ActivationEmailDialog request={activationRequest} onClose={() => setActivationRequest(null)} onActivate={() => activateAndSendEmail(activationRequest)} /> : null}</section>
}

function ActiveOrderDialog({ request, onClose, onAdvancePayment, onComplete }: { request: ServiceRequest; onClose: () => void; onAdvancePayment: () => Promise<void>; onComplete: () => Promise<void> }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventDate = request.eventDate ? new Intl.DateTimeFormat('en-LK', { dateStyle: 'long' }).format(new Date(request.eventDate)) : 'Not provided'
  const recordAdvance = async () => {
    setSaving(true); setError(null)
    try { await onAdvancePayment() } catch (reason) { setError(messageFor(reason, 'Unable to record the advance payment.')) } finally { setSaving(false) }
  }
  const complete = async () => {
    setSaving(true); setError(null)
    try { await onComplete(); onClose() } catch (reason) { setError(messageFor(reason, 'Unable to complete this order.')) } finally { setSaving(false) }
  }
  return <Dialog title="Active order details" onClose={onClose}><div className="order-detail-topline"><div><p className="eyebrow">{request.trackingId || 'Active order'}</p><h3>{request.offeringName}</h3></div><span className="request-status active">active</span></div><div className="order-detail-grid"><section><p className="order-detail-label">Customer</p><strong>{request.customerName || 'Customer'}</strong><a href={`mailto:${request.email}`}>{request.email || 'No email supplied'}</a>{request.phone ? <a href={`tel:${request.phone}`}>{request.phone}</a> : <small>No phone number supplied</small>}</section><section><p className="order-detail-label">Event</p><strong>{request.eventType || 'Celebration details to confirm'}</strong><span>{eventDate}</span><small>{request.type === 'hire' ? `${request.hireDays} hire day${request.hireDays === 1 ? '' : 's'}` : 'Event styling service'}</small></section><section><p className="order-detail-label">Order value</p><strong>{formatLkr(request.totalPrice)}</strong><span>{request.promotionTitle || 'No promotion applied'}</span><small>Reference {request.trackingId || 'not available'}</small></section><section><p className="order-detail-label">Payment progress</p><strong>{request.advancePaymentComplete ? 'Advance payment recorded' : 'Advance payment pending'}</strong><span>{request.advancePaymentCompletedAt ? `Recorded ${new Date(request.advancePaymentCompletedAt).toLocaleDateString()}` : 'Mark this once the advance arrives.'}</span><small>Full payment can be completed after the advance is recorded.</small></section></div>{request.notes ? <section className="order-detail-notes"><p className="order-detail-label">Customer notes</p><p>{request.notes}</p></section> : null}<section className="active-payment-card"><p className="eyebrow">Payment workflow</p><h3>{request.advancePaymentComplete ? 'Ready for final payment.' : 'Waiting for the advance payment.'}</h3><p>{request.advancePaymentComplete ? 'Once the full payment is received, mark this order complete. The customer will receive the completion email automatically.' : 'Mark the advance as received first. This does not send a completion email.'}</p><div className="order-detail-actions">{!request.advancePaymentComplete ? <button className="admin-button" type="button" disabled={saving} onClick={() => void recordAdvance()}>{saving ? 'Saving…' : 'Mark advance payment complete'}</button> : <button className="admin-button" type="button" disabled={saving} onClick={() => void complete()}>{saving ? 'Completing…' : 'Mark full payment & complete order'}</button>}<button className="admin-secondary-button" type="button" onClick={onClose} disabled={saving}>Close</button></div>{error ? <p className="campaign-error">{error}</p> : null}</section></Dialog>
}

export function AdminActiveOrdersPage() {
  const token = useAdminToken()
  const { confirm, notify } = useFeedback()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => api.adminServiceRequests(token, 'active').then((items) => { setRequests(items); setError(null) }).catch((reason: unknown) => setError(messageFor(reason, 'Unable to load active orders.'))), [token])
  useEffect(() => { void load() }, [load])
  const replaceRequest = (updatedRequest: ServiceRequest) => {
    setRequests((current) => updatedRequest.status === 'active' ? current.map((request) => request._id === updatedRequest._id ? updatedRequest : request) : current.filter((request) => request._id !== updatedRequest._id))
    setSelectedRequest((current) => current?._id === updatedRequest._id && updatedRequest.status === 'active' ? updatedRequest : null)
  }
  const recordAdvance = async (request: ServiceRequest) => {
    if (!await confirm({ title: 'Record advance payment?', message: `Mark the advance payment as received for ${request.customerName || 'this customer'}. No completion email will be sent yet.`, confirmLabel: 'Record advance', tone: 'info' })) return
    const updated = await api.updateAdvancePayment(token, request._id, true)
    replaceRequest(updated)
    notify({ title: 'Advance payment recorded', message: `${request.offeringName} is ready for final payment.` })
  }
  const complete = async (request: ServiceRequest) => {
    if (!await confirm({ title: 'Complete this order?', message: `This records the full payment for ${request.customerName || 'this customer'} and emails them that their order is complete.`, confirmLabel: 'Complete & email', tone: 'info' })) return
    const result = await api.completeServiceRequest(token, request._id)
    replaceRequest(result.request)
    if (result.emailSent) notify({ title: 'Order complete & customer emailed', message: `${result.request.offeringName} is now in order history.` })
    else {
      setError(result.message)
      notify({ tone: 'error', title: 'Order complete, email needs attention', message: result.message })
    }
  }
  return <section className="admin-page"><div className="admin-page-heading"><div><p className="eyebrow">Payment follow-up</p><h1>Active <em>orders.</em></h1></div></div><ErrorNotice error={error} /><section className="admin-card admin-table-card">{requests.length ? <div className="request-admin-list">{requests.map((request) => <article key={request._id}><button className="request-admin-summary" type="button" onClick={() => setSelectedRequest(request)}><strong>{request.customerName}</strong><p>{request.offeringName} · <b>{formatLkr(request.totalPrice)}</b></p><small>{request.email}{request.eventDate ? ` · ${new Date(request.eventDate).toLocaleDateString()}` : ''}</small><span>View payment progress →</span></button><div className="active-order-labels"><span className="request-status active">active</span><small className={request.advancePaymentComplete ? 'payment-complete' : 'payment-pending'}>{request.advancePaymentComplete ? 'Advance paid' : 'Advance pending'}</small></div></article>)}</div> : <EmptyState>Active orders will appear here after you activate a customer request.</EmptyState>}</section>{selectedRequest ? <ActiveOrderDialog request={selectedRequest} onClose={() => setSelectedRequest(null)} onAdvancePayment={() => recordAdvance(selectedRequest)} onComplete={() => complete(selectedRequest)} /> : null}</section>
}

export function AdminOrderNotificationsPage() {
  const token = useAdminToken()
  const { notify } = useFeedback()
  const [notifications, setNotifications] = useState<OrderNotification[]>([])
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => api.adminOrderNotifications(token).then((items) => { setNotifications(items); setError(null) }).catch((reason: unknown) => setError(messageFor(reason, 'Unable to load order notifications.'))), [token])
  useEffect(() => { void load() }, [load])
  const markRead = async (notification: OrderNotification) => {
    try {
      const updated = await api.markOrderNotificationRead(token, notification._id, !notification.read)
      setNotifications((current) => current.map((item) => item._id === updated._id ? updated : item))
      notify({ title: updated.read ? 'Marked as read' : 'Marked unread', message: 'The order notification was updated.' })
    } catch (reason) { setError(messageFor(reason, 'Unable to update this notification.')) }
  }
  return <section className="admin-page"><div className="admin-page-heading"><div><p className="eyebrow">Customer order updates</p><h1>Order <em>notifications.</em></h1></div></div><ErrorNotice error={error} /><section className="admin-card">{notifications.length ? <div className="order-notification-list">{notifications.map((notification) => { const request = typeof notification.request === 'string' ? null : notification.request; return <article className={notification.read ? '' : 'unread'} key={notification._id}><div><span className={`request-status ${notification.type === 'cancelled' ? 'cancel' : 'active'}`}>{notification.type}</span><strong>{notification.message}</strong><p>{notification.details}</p>{request ? <small>{request.trackingId} · {request.customerName || 'Customer'} · {request.offeringName}</small> : <small>The original order is no longer available.</small>}</div><footer><span>{new Date(notification.createdAt).toLocaleString()}</span><button type="button" onClick={() => void markRead(notification)}>{notification.read ? 'Mark unread' : 'Mark read'}</button></footer></article> })}</div> : <EmptyState>Customer booking edits and cancellations will appear here.</EmptyState>}</section></section>
}

type PromotionCampaignActions = { promotions: Promotion[]; onConsentChange: (request: ServiceRequest, marketingConsent: boolean) => Promise<void>; onSend: (request: ServiceRequest, promotionId: string, subject: string, message: string) => Promise<void> }

function OrderDetailDialog({ request, onClose, onStatusChange, onDelete, campaign }: { request: ServiceRequest; onClose: () => void; onStatusChange?: (request: ServiceRequest, status: RequestStatus) => void; onDelete: (request: ServiceRequest) => Promise<void>; campaign?: PromotionCampaignActions }) {
  const eventDate = request.eventDate ? new Intl.DateTimeFormat('en-LK', { dateStyle: 'long' }).format(new Date(request.eventDate)) : 'Not provided'
  const submittedAt = new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(request.createdAt))
  const itemLabel = request.type === 'hire' ? 'Hire item' : 'Service'
  const emailSection = campaign ? <PromotionEmailComposer request={request} campaign={campaign} /> : <ActivationEmailPreview request={request} />

  const allowedStatuses: RequestStatus[] = request.status === 'active' ? ['active', 'cancel'] : request.status === 'pending' ? ['pending', 'cancel'] : [request.status]
  return <Dialog title="Order details" onClose={onClose}><div className="order-detail-topline"><div><p className="eyebrow">{request.trackingId || 'Customer request'}</p><h3>{request.offeringName}</h3></div><span className={`request-status ${request.status}`}>{request.status}</span></div><div className="order-detail-grid"><section><p className="order-detail-label">Customer</p><strong>{request.customerName || 'Customer'}</strong><a href={`mailto:${request.email}`}>{request.email || 'No email supplied'}</a>{request.phone ? <a href={`tel:${request.phone}`}>{request.phone}</a> : <small>No phone number supplied</small>}</section><section><p className="order-detail-label">Event</p><strong>{request.eventType || 'Celebration details to confirm'}</strong><span>{eventDate}</span><small>Submitted {submittedAt}</small></section><section><p className="order-detail-label">Booking</p><strong>{itemLabel}</strong><span>{request.type === 'hire' ? `${request.hireDays} hire day${request.hireDays === 1 ? '' : 's'}` : 'Tailored event service'}</span><small>Price per day/service: {formatLkr(request.unitPrice)}</small></section><section><p className="order-detail-label">Order status</p>{onStatusChange ? <select className={`request-status ${request.status}`} value={request.status} onChange={(event) => onStatusChange(request, event.target.value as RequestStatus)}>{allowedStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select> : <span className={`request-status ${request.status}`}>{request.status}</span>}<small>{request.status === 'complete' ? 'Completed orders stay in history.' : 'Activation and completion use the dedicated order workflow.'}</small></section></div>{request.notes ? <section className="order-detail-notes"><p className="order-detail-label">Customer notes</p><p>{request.notes}</p></section> : null}<section className="order-price-summary"><div><span>Subtotal</span><strong>{formatLkr(request.subtotal)}</strong></div>{request.discountAmount > 0 ? <div><span>{request.promotionTitle || 'Promotion'} {request.discountPercent ? `(${request.discountPercent}% off)` : ''}</span><strong>−{formatLkr(request.discountAmount)}</strong></div> : null}<div className="order-price-total"><span>Total booking value</span><strong>{formatLkr(request.totalPrice)}</strong></div></section>{emailSection}<div className="order-detail-actions"><button className="admin-secondary-button" type="button" onClick={() => void onDelete(request)}>Delete order</button><button className="admin-button" type="button" onClick={onClose}>Done</button></div></Dialog>
}

function ActivationEmailPreview({ request }: { request: ServiceRequest }) {
  const token = useAdminToken()
  const { notify } = useFeedback()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const send = async () => {
    setSending(true); setError(null)
    try {
      await api.sendActivationEmail(token, request._id)
      notify({ title: 'Active order notice sent', message: `An advance payment contact notice was sent to ${request.email}.` })
    } catch (reason) { setError(messageFor(reason, 'Unable to send the activation email.')) } finally { setSending(false) }
  }

  return <section className="order-email-preview"><div><span aria-hidden="true">✉</span><div><p className="order-detail-label">Active order notice</p><h3>{request.status === 'active' ? 'Ready to contact the customer' : 'Sent when this order becomes active'}</h3><p>The customer is told their order is active and that your team will contact them to discuss the advance payment.</p></div></div><button type="button" disabled={request.status !== 'active' || sending} onClick={() => void send()}>{sending ? 'Sending…' : request.status === 'active' ? 'Resend active notice' : 'Set active first'}</button>{error ? <p className="campaign-error">{error}</p> : null}</section>
}

function ActivationEmailDialog({ request, onClose, onActivate }: { request: ServiceRequest; onClose: () => void; onActivate: () => Promise<boolean> }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activate = async () => {
    setSaving(true)
    setError(null)
    try {
      const completed = await onActivate()
      if (completed) onClose()
      else setError('The order could not be made active. Please try again.')
    } finally { setSaving(false) }
  }

  return <Dialog title="Make this order active?" onClose={onClose}><section className="activation-email-dialog"><span aria-hidden="true">✦</span><p>{request.customerName || 'This customer'} will see the booking as active when they search using {request.email || 'their email address'}.</p><div className="activation-email-preview"><p className="order-detail-label">Customer email notice</p><strong>“Your Cotton Candy order is now active.”</strong><small>They will be told that your team will contact them to discuss the advance payment and next steps.</small></div><div className="order-detail-actions"><button className="admin-secondary-button" type="button" onClick={onClose} disabled={saving}>Keep pending</button><button className="admin-button" type="button" onClick={() => void activate()} disabled={saving}>{saving ? 'Activating…' : 'Activate & send notice'}</button></div>{error ? <p className="campaign-error">{error}</p> : null}</section></Dialog>
}

function promotionSubject(promotion: Promotion) { return `${promotion.title} — Cotton Candy Event Deco` }
function promotionMessage(promotion: Promotion) { return `${promotion.description}\n\nWe would love to help make your next celebration beautiful.` }

function PromotionEmailComposer({ request, campaign }: { request: ServiceRequest; campaign: PromotionCampaignActions }) {
  const { confirm, notify } = useFeedback()
  const promotions = campaign.promotions.filter((promotion) => promotion.enabled)
  const [promotionId, setPromotionId] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const selectedPromotion = promotions.find((promotion) => promotion._id === promotionId)

  useEffect(() => {
    if (promotionId || !promotions[0]) return
    setPromotionId(promotions[0]._id)
    setSubject(promotionSubject(promotions[0]))
    setMessage(promotionMessage(promotions[0]))
  }, [promotionId, promotions])

  const choosePromotion = (nextPromotionId: string) => {
    const promotion = promotions.find((item) => item._id === nextPromotionId)
    setPromotionId(nextPromotionId)
    if (promotion) {
      setSubject(promotionSubject(promotion))
      setMessage(promotionMessage(promotion))
    }
  }

  const recordConsent = async () => {
    if (!await confirm({ title: 'Record marketing permission?', message: 'Only continue if this customer clearly agreed to receive Cotton Candy promotion emails. Every promotion email includes an unsubscribe link.', confirmLabel: 'Record permission', tone: 'info' })) return
    setSending(true)
    try {
      await campaign.onConsentChange(request, true)
      notify({ title: 'Permission recorded', message: `${request.customerName || 'This customer'} can now receive promotion emails.` })
    } catch (reason) { setError(messageFor(reason, 'Unable to update permission.')) } finally { setSending(false) }
  }

  const send = async () => {
    if (!selectedPromotion) return setError('Create or activate a promotion before sending an email.')
    setSending(true); setError(null)
    try {
      await campaign.onSend(request, selectedPromotion._id, subject, message)
      notify({ title: 'Promotion email sent', message: `${selectedPromotion.title} was sent to ${request.email}.` })
    } catch (reason) { setError(messageFor(reason, 'Unable to send this promotion email.')) } finally { setSending(false) }
  }

  if (request.marketingUnsubscribedAt) return <section className="promotion-composer blocked"><p className="order-detail-label">Promotion emails</p><h3>Customer unsubscribed</h3><p>This customer asked not to receive promotions, so sending is disabled.</p></section>
  if (!request.marketingConsent) return <section className="promotion-composer blocked"><p className="order-detail-label">Promotion emails</p><h3>Permission needed first</h3><p>Completed orders are not automatically added to marketing emails. Record consent only after the customer agrees.</p><button className="admin-secondary-button" type="button" disabled={sending} onClick={() => void recordConsent()}>{sending ? 'Saving…' : 'Record marketing permission'}</button>{error ? <p className="campaign-error">{error}</p> : null}</section>
  if (!promotions.length) return <section className="promotion-composer blocked"><p className="order-detail-label">Promotion emails</p><h3>No active promotion yet</h3><p>Create or enable a promotion first, then return here to send it to this customer.</p></section>

  return <section className="promotion-composer"><p className="order-detail-label">Promotion email</p><h3>Send a little celebration magic</h3><p>Choose a current offer and personalise the note for {request.customerName || 'this customer'}.</p><label>Active promotion<select value={promotionId} onChange={(event) => choosePromotion(event.target.value)}>{promotions.map((promotion) => <option key={promotion._id} value={promotion._id}>{promotion.title}</option>)}</select></label><label>Email subject<input value={subject} maxLength={160} onChange={(event) => setSubject(event.target.value)} /></label><label>Your message<textarea value={message} maxLength={5000} onChange={(event) => setMessage(event.target.value)} /></label><button className="admin-button" type="button" disabled={sending} onClick={() => void send()}>{sending ? 'Sending…' : 'Send promotion email'}</button>{error ? <p className="campaign-error">{error}</p> : null}</section>
}

function PromotionBroadcastDialog({ promotions, recipients, onClose, onSend }: { promotions: Promotion[]; recipients: number; onClose: () => void; onSend: (promotionId: string, subject: string, message: string) => Promise<void> }) {
  const { confirm, notify } = useFeedback()
  const activePromotions = promotions.filter((promotion) => promotion.enabled)
  const [promotionId, setPromotionId] = useState(activePromotions[0]?._id || '')
  const [subject, setSubject] = useState(activePromotions[0] ? promotionSubject(activePromotions[0]) : '')
  const [message, setMessage] = useState(activePromotions[0] ? promotionMessage(activePromotions[0]) : '')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const choosePromotion = (nextPromotionId: string) => {
    const promotion = activePromotions.find((item) => item._id === nextPromotionId)
    setPromotionId(nextPromotionId)
    if (promotion) {
      setSubject(promotionSubject(promotion))
      setMessage(promotionMessage(promotion))
    }
  }

  const send = async () => {
    if (!promotionId) return setError('Choose an active promotion first.')
    if (!await confirm({ title: `Send to ${recipients} customer${recipients === 1 ? '' : 's'}?`, message: 'This sends the selected promotion only to completed customers who gave permission and have not unsubscribed.', confirmLabel: 'Send promotion', tone: 'info' })) return
    setSending(true); setError(null)
    try {
      await onSend(promotionId, subject, message)
      notify({ title: 'Promotion campaign sent', message: `Your offer was sent to ${recipients} eligible customer${recipients === 1 ? '' : 's'}.` })
      onClose()
    } catch (reason) { setError(messageFor(reason, 'Unable to send this promotion campaign.')) } finally { setSending(false) }
  }

  return <Dialog title="Send a promotion" onClose={onClose}><section className="promotion-composer broadcast"><p>{recipients} completed customer{recipients === 1 ? '' : 's'} with marketing permission will receive this email. Customers who unsubscribed are excluded automatically.</p>{activePromotions.length ? <><label>Active promotion<select value={promotionId} onChange={(event) => choosePromotion(event.target.value)}>{activePromotions.map((promotion) => <option key={promotion._id} value={promotion._id}>{promotion.title}</option>)}</select></label><label>Email subject<input value={subject} maxLength={160} onChange={(event) => setSubject(event.target.value)} /></label><label>Your message<textarea value={message} maxLength={5000} onChange={(event) => setMessage(event.target.value)} /></label><div className="order-detail-actions"><button className="admin-secondary-button" type="button" onClick={onClose}>Cancel</button><button className="admin-button" type="button" disabled={sending || !recipients} onClick={() => void send()}>{sending ? 'Sending…' : `Send to ${recipients} customer${recipients === 1 ? '' : 's'}`}</button></div></> : <p className="campaign-error">Create an active promotion before sending a campaign.</p>}{error ? <p className="campaign-error">{error}</p> : null}</section></Dialog>
}

export function AdminOrderHistoryPage() {
  const token = useAdminToken()
  const { confirm, notify } = useFeedback()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null)
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => Promise.all([api.adminServiceRequests(token, 'complete'), api.adminPromotions(token)]).then(([items, nextPromotions]) => { setRequests(items); setPromotions(nextPromotions); setError(null) }).catch((reason: unknown) => setError(messageFor(reason, 'Unable to load completed orders.'))), [token])
  useEffect(() => { void load() }, [load])
  const eligibleRecipients = useMemo(() => new Set(requests.filter((request) => request.marketingConsent && !request.marketingUnsubscribedAt && request.email).map((request) => request.email)).size, [requests])

  const replaceRequest = (updatedRequest: ServiceRequest) => {
    setRequests((current) => updatedRequest.status === 'complete' ? current.map((item) => item._id === updatedRequest._id ? updatedRequest : item) : current.filter((item) => item._id !== updatedRequest._id))
    setSelectedRequest((current) => current?._id === updatedRequest._id ? (updatedRequest.status === 'complete' ? updatedRequest : null) : current)
  }
  const updateStatus = async (request: ServiceRequest, status: RequestStatus) => {
    try {
      const updatedRequest = await api.updateServiceRequestStatus(token, request._id, status)
      replaceRequest(updatedRequest)
      notify({ title: 'Order status updated', message: `${request.offeringName} is now marked ${status}.` })
    } catch (reason) { setError(messageFor(reason, 'Unable to update order.')) }
  }
  const updateConsent = async (request: ServiceRequest, marketingConsent: boolean) => {
    const updatedRequest = await api.updateMarketingConsent(token, request._id, marketingConsent)
    replaceRequest(updatedRequest)
  }
  const sendOne = async (request: ServiceRequest, promotionId: string, subject: string, message: string) => { await api.sendPromotionEmail(token, request._id, { promotionId, subject, message }) }
  const sendBroadcast = async (promotionId: string, subject: string, message: string) => { await api.sendPromotionBroadcast(token, { promotionId, subject, message }) }
  const deleteRequest = async (request: ServiceRequest) => {
    if (!await confirm({ title: 'Delete this completed order?', message: `${request.offeringName} for ${request.customerName} will be permanently deleted, including its campaign history.`, confirmLabel: 'Delete order' })) return
    try {
      await api.deleteServiceRequest(token, request._id)
      setRequests((current) => current.filter((item) => item._id !== request._id))
      setSelectedRequest(null)
      notify({ title: 'Completed order deleted', message: `${request.offeringName} was removed from history.` })
    } catch (reason) { setError(messageFor(reason, 'Unable to delete order.')) }
  }

  const campaign: PromotionCampaignActions = { promotions, onConsentChange: updateConsent, onSend: sendOne }
  return <section className="admin-page"><div className="admin-page-heading"><div><p className="eyebrow">Completed celebrations</p><h1>Order <em>history.</em></h1></div><button className="admin-button" type="button" disabled={!eligibleRecipients || !promotions.some((promotion) => promotion.enabled)} onClick={() => setShowBroadcast(true)}>Send a promotion</button></div><ErrorNotice error={error} /><div className="admin-history-note"><strong>{eligibleRecipients}</strong> customer{eligibleRecipients === 1 ? '' : 's'} can receive promotion emails. Only customers with recorded permission are included.</div><section className="admin-card admin-table-card">{requests.length ? <div className="request-admin-list">{requests.map((request) => <article key={request._id}><button className="request-admin-summary" type="button" onClick={() => setSelectedRequest(request)}><strong>{request.customerName}</strong><p>{request.offeringName} · <b>{formatLkr(request.totalPrice)}</b></p><small>{request.email}{request.eventDate ? ` · ${new Date(request.eventDate).toLocaleDateString()}` : ''}</small><span>View completed order →</span></button><div className="history-order-labels"><span className="request-status complete">complete</span><small className={request.marketingConsent && !request.marketingUnsubscribedAt ? 'marketing-ready' : ''}>{request.marketingUnsubscribedAt ? 'Unsubscribed' : request.marketingConsent ? 'Promotion ready' : 'No permission'}</small></div></article>)}</div> : <EmptyState>Completed orders will move here automatically when you mark them complete.</EmptyState>}</section>{selectedRequest ? <OrderDetailDialog request={selectedRequest} onClose={() => setSelectedRequest(null)} onStatusChange={(request, status) => void updateStatus(request, status)} onDelete={deleteRequest} campaign={campaign} /> : null}{showBroadcast ? <PromotionBroadcastDialog promotions={promotions} recipients={eligibleRecipients} onClose={() => setShowBroadcast(false)} onSend={sendBroadcast} /> : null}</section>
}

export function AdminMessagesPage() {
  const token = useAdminToken()
  const { notify } = useFeedback()
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => api.adminMessages(token).then((items) => { setMessages(items); setError(null) }).catch((reason: unknown) => setError(messageFor(reason, 'Unable to load messages.'))), [token])
  useEffect(() => { void load() }, [load])
  const updateReadState = async (message: ContactMessage) => {
    try {
      await api.markMessageRead(token, message._id, !message.read)
      await load()
      notify({ title: message.read ? 'Marked unread' : 'Marked as read', message: `Message from ${message.name} has been updated.` })
    } catch (reason) { setError(messageFor(reason, 'Unable to update message.')) }
  }
  return <section className="admin-page"><div className="admin-page-heading"><div><p className="eyebrow">Website contact form</p><h1>Customer <em>messages.</em></h1></div></div><ErrorNotice error={error} /><section className="admin-card">{messages.length ? <div className="message-list">{messages.map((message) => <article className={message.read ? '' : 'unread'} key={message._id}><div><strong>{message.name}</strong><p>{message.email}{message.phone ? ` · ${message.phone}` : ''}</p></div><p>{message.message}</p><footer><span>{new Date(message.createdAt).toLocaleString()}</span><button type="button" onClick={() => void updateReadState(message)}>{message.read ? 'Mark unread' : 'Mark read'}</button></footer></article>)}</div> : <EmptyState>New contact form messages will appear here.</EmptyState>}</section></section>
}

export function AdminNewsletterSubscribersPage() {
  const token = useAdminToken()
  const { confirm, notify } = useFeedback()
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([])
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => api.adminNewsletterSubscribers(token).then((items) => { setSubscribers(items); setError(null) }).catch((reason: unknown) => setError(messageFor(reason, 'Unable to load newsletter subscribers.'))), [token])
  useEffect(() => { void load() }, [load])
  const removeSubscriber = async (subscriber: NewsletterSubscriber) => {
    if (!await confirm({ title: `Remove ${subscriber.email}?`, message: 'This email address will be removed from the newsletter list.', confirmLabel: 'Remove subscriber' })) return
    try {
      await api.deleteNewsletterSubscriber(token, subscriber._id)
      await load()
      notify({ title: 'Subscriber removed', message: `${subscriber.email} has been removed from the newsletter list.` })
    } catch (reason) { setError(messageFor(reason, 'Unable to remove this subscriber.')) }
  }
  return <section className="admin-page"><div className="admin-page-heading"><div><p className="eyebrow">Footer newsletter</p><h1>Pretty list <em>subscribers.</em></h1></div></div><ErrorNotice error={error} /><div className="admin-history-note"><strong>{subscribers.length}</strong> visitor{subscribers.length === 1 ? '' : 's'} joined through the website newsletter form.</div><section className="admin-card admin-table-card"><header><h2>Subscriber emails</h2><span>{subscribers.length} total</span></header>{subscribers.length ? <div className="subscriber-list">{subscribers.map((subscriber) => <article key={subscriber._id}><div><a href={`mailto:${subscriber.email}`}>{subscriber.email}</a><small>Joined {new Date(subscriber.createdAt).toLocaleString()}</small></div><button type="button" onClick={() => void removeSubscriber(subscriber)}>Remove</button></article>)}</div> : <EmptyState>Newsletter sign-ups from the footer will appear here.</EmptyState>}</section></section>
}

function MediaPreview({ item }: { item: MediaAsset }) {
  if (item.kind === 'video' && item.source === 'youtube') return <iframe src={item.url} title={item.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />
  if (item.kind === 'video') return <video src={item.url} controls />
  return <img src={item.url} alt={item.title} />
}

export function AdminMediaPage({ kind }: { kind: 'image' | 'video' }) {
  const token = useAdminToken()
  const { confirm, notify } = useFeedback()
  const [media, setMedia] = useState<MediaAsset[]>([])
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => api.adminMedia(token, kind).then((items) => { setMedia(items); setError(null) }).catch((reason: unknown) => setError(messageFor(reason, 'Unable to load gallery assets.'))), [kind, token])
  useEffect(() => { void load() }, [load])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    form.set('kind', kind)
    setError(null)
    try {
      const created = await api.createMedia(token, form)
      formElement.reset()
      await load()
      notify({ title: created.source === 'youtube' ? 'YouTube video added' : 'Gallery item uploaded', message: `Your ${kind} is now visible in the gallery.` })
    } catch (reason) { setError(messageFor(reason, 'Unable to upload gallery item.')) }
  }

  const removeMedia = async (item: MediaAsset) => {
    if (!await confirm({ title: `Remove ${item.title}?`, message: 'This gallery item will be permanently removed from the website.', confirmLabel: 'Remove item' })) return
    try {
      await api.deleteMedia(token, item._id)
      await load()
      notify({ title: 'Gallery item removed', message: `${item.title} is no longer visible.` })
    } catch (reason) { setError(messageFor(reason, 'Unable to remove media.')) }
  }

  return <section className="admin-page"><div className="admin-page-heading"><div><p className="eyebrow">{kind === 'video' ? 'Gallery video upload or YouTube link' : 'Cloudinary gallery upload'}</p><h1>Gallery <em>{kind}s.</em></h1></div></div><ErrorNotice error={error} /><div className="admin-split"><Panel title={`Add ${kind}`}><form className="admin-form-grid" onSubmit={submit}><label>Title<input name="title" required placeholder="e.g. Sarah’s baby shower" /></label><label>Category<input name="category" placeholder="e.g. Birthdays" /></label>{kind === 'video' ? <><label className="file-input admin-full">Upload video file (optional)<input name="media" type="file" accept="video/*" /></label><p className="admin-help admin-full">Or add a YouTube link instead. Use one option only.</p><label className="admin-full">YouTube video URL<input name="youtubeUrl" type="url" placeholder="https://www.youtube.com/watch?v=..." /></label></> : <label className="file-input admin-full">Image file<input name="media" type="file" accept="image/*" required /></label>}<button className="admin-button" type="submit">Add {kind}</button></form></Panel><Panel title={`Published ${kind}s`}>{media.length ? <div className="admin-media-grid">{media.map((item) => <article key={item._id}><MediaPreview item={item} /><div><strong>{item.title}</strong><button type="button" onClick={() => void removeMedia(item)}>Remove</button></div></article>)}</div> : <EmptyState>Upload your first gallery {kind}.</EmptyState>}</Panel></div></section>
}

export function AdminGalleryImagesPage() {
  const token = useAdminToken()
  const { confirm, notify } = useFeedback()
  const [media, setMedia] = useState<MediaAsset[]>([])
  const [error, setError] = useState<string | null>(null)
  const [categoryMode, setCategoryMode] = useState<'new' | 'existing'>('new')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const galleryCategories = useMemo(() => [...new Set(media.map((item) => item.category.trim()).filter(Boolean))].sort((first, second) => first.localeCompare(second)), [media])
  const load = useCallback(() => api.adminMedia(token, 'image').then((items) => { setMedia(items); setError(null) }).catch((reason: unknown) => setError(messageFor(reason, 'Unable to load gallery images.'))), [token])

  useEffect(() => { void load() }, [load])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const category = (categoryMode === 'existing' ? selectedCategory : newCategory).trim()
    if (!category) { setError('Choose an existing gallery category or enter a new category name.'); return }
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    form.set('kind', 'image')
    form.set('category', category)
    setError(null)
    try {
      await api.createMedia(token, form)
      formElement.reset()
      setSelectedCategory(category)
      setNewCategory('')
      setCategoryMode('existing')
      await load()
      notify({ title: 'Gallery image uploaded', message: `${category} is now available as a gallery filter on the website.` })
    } catch (reason) { setError(messageFor(reason, 'Unable to upload gallery image.')) }
  }

  const removeMedia = async (item: MediaAsset) => {
    if (!await confirm({ title: `Remove ${item.title}?`, message: 'This image will be permanently removed from the website gallery.', confirmLabel: 'Remove image' })) return
    try {
      await api.deleteMedia(token, item._id)
      await load()
      notify({ title: 'Gallery image removed', message: `${item.title} is no longer visible.` })
    } catch (reason) { setError(messageFor(reason, 'Unable to remove gallery image.')) }
  }

  return <section className="admin-page"><div className="admin-page-heading"><div><p className="eyebrow">Cloudinary gallery upload</p><h1>Gallery <em>images.</em></h1></div></div><ErrorNotice error={error} /><div className="admin-split"><Panel title="Add image"><form className="admin-form-grid" onSubmit={submit}><label>Title<input name="title" required placeholder="e.g. Sarah’s baby shower" /></label><label>Category option<select value={categoryMode} onChange={(event) => setCategoryMode(event.target.value as 'new' | 'existing')}><option value="new">Create a new category</option><option disabled={!galleryCategories.length} value="existing">Use an existing category</option></select></label>{categoryMode === 'existing' ? <label className="admin-full">Existing gallery category<select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} required><option value="">Select a category</option>{galleryCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label> : <label className="admin-full">New gallery category<input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="e.g. Weddings" required /></label>}<p className="admin-help admin-full">Each category you use becomes a filter on the public Gallery Images page.</p><label className="file-input admin-full">Image file<input name="media" type="file" accept="image/*" required /></label><button className="admin-button" type="submit">Add image</button></form></Panel><Panel title="Published images">{media.length ? <div className="admin-media-grid">{media.map((item) => <article key={item._id}><MediaPreview item={item} /><div><span className="admin-media-category">{item.category}</span><strong>{item.title}</strong><button type="button" onClick={() => void removeMedia(item)}>Remove</button></div></article>)}</div> : <EmptyState>Upload your first gallery image.</EmptyState>}</Panel></div></section>
}

export function AdminPromotionsPage() {
  const token = useAdminToken()
  const { confirm, notify } = useFeedback()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => api.adminPromotions(token).then((items) => { setPromotions(items); setError(null) }).catch((reason: unknown) => setError(messageFor(reason, 'Unable to load promotions.'))), [token])
  useEffect(() => { void load() }, [load])
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    setError(null)
    try {
      await api.createPromotion(token, new FormData(form))
      form.reset()
      await load()
      notify({ title: 'Promotion published', message: 'Your offer is ready for visitors to see.' })
    } catch (reason) { setError(messageFor(reason, 'Unable to create promotion.')) }
  }
  const showOnLoad = async (promotion: Promotion) => {
    const form = new FormData()
    form.set('title', promotion.title)
    form.set('description', promotion.description)
    form.set('discountPercent', String(promotion.discountPercent))
    form.set('appliesTo', promotion.appliesTo)
    form.set('enabled', String(promotion.enabled))
    form.set('showOnLoad', 'true')
    try {
      await api.updatePromotion(token, promotion._id, form)
      await load()
      notify({ title: 'Opening promotion selected', message: `${promotion.title} will appear when visitors open the website.` })
    } catch (reason) { setError(messageFor(reason, 'Unable to select promotion.')) }
  }
  const removePromotion = async (promotion: Promotion) => {
    if (!await confirm({ title: `Remove ${promotion.title}?`, message: 'This promotion and its images will be removed from the website.', confirmLabel: 'Remove promotion' })) return
    try {
      await api.deletePromotion(token, promotion._id)
      await load()
      notify({ title: 'Promotion removed', message: `${promotion.title} is no longer published.` })
    } catch (reason) { setError(messageFor(reason, 'Unable to remove promotion.')) }
  }
  return <section className="admin-page"><div className="admin-page-heading"><div><p className="eyebrow">Website launch promotion</p><h1>Make an offer <em>shine.</em></h1></div></div><ErrorNotice error={error} /><div className="admin-split"><Panel title="Create promotion"><form className="admin-form-grid" onSubmit={submit}><label>Title<input name="title" required placeholder="e.g. Winter party package" /></label><label>Discount (%)<input name="discountPercent" type="number" min="0" max="100" step="1" defaultValue="0" required /></label><label>Applies to<select name="appliesTo" defaultValue="all"><option value="all">All services & hire</option><option value="service">Services only</option><option value="hire">Hire only</option></select></label><label className="admin-full">Description<textarea name="description" required placeholder="Tell visitors about the offer" /></label><label className="file-input">Desktop artwork<input name="desktopImage" type="file" accept="image/*" required /></label><label className="file-input">Mobile artwork<input name="mobileImage" type="file" accept="image/*" required /></label><label className="admin-check admin-full"><input name="showOnLoad" type="checkbox" /> Show this full-screen when the website opens</label><button className="admin-button" type="submit">Publish promotion</button></form></Panel><Panel title="Your promotions">{promotions.length ? <div className="admin-promotion-list">{promotions.map((promotion) => <article key={promotion._id}><img src={promotion.desktopImageUrl} alt={promotion.title} /><div><strong>{promotion.title}</strong><p>{promotion.description}</p><span>{promotion.discountPercent ? `${promotion.discountPercent}% off ${promotion.appliesTo === 'all' ? 'all items' : `${promotion.appliesTo} items`}` : 'Display-only promotion'} · {promotion.showOnLoad ? 'Opening promotion' : 'Promotion page only'}</span></div><div className="admin-row-actions">{!promotion.showOnLoad ? <button type="button" onClick={() => void showOnLoad(promotion)}>Show on open</button> : null}<button type="button" onClick={() => void removePromotion(promotion)}>Remove</button></div></article>)}</div> : <EmptyState>Upload a promotion for your public promotions page.</EmptyState>}</Panel></div></section>
}

export function LegacyAdminHomeContentPage() {
  const token = useAdminToken()
  const { notify } = useFeedback()
  const [content, setContent] = useState<HomeContent | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { api.adminHomeContent(token).then((nextContent) => { setContent(nextContent); setError(null) }).catch((reason: unknown) => setError(messageFor(reason, 'Unable to load home content.'))) }, [token])
  const submit = async (event: FormEvent<HTMLFormElement>, successMessage: string) => {
    event.preventDefault()
    const form = event.currentTarget
    setError(null)
    try {
      setContent(await api.updateHomeContent(token, new FormData(form)))
      form.reset()
      notify({ title: 'Home page updated', message: successMessage })
    } catch (reason) { setError(messageFor(reason, 'Unable to update home page images.')) }
  }
  return <section className="admin-page"><div className="admin-page-heading"><div><p className="eyebrow">Home page content</p><h1>Your first <em>beautiful impression.</em></h1></div></div><ErrorNotice error={error} /><div className="admin-split"><Panel title="Update hero images"><form className="admin-form-grid" onSubmit={(event) => void submit(event, 'Your new hero artwork is now live on the website.')}><label className="file-input admin-full">Main image — right of “Make your day”<input name="heroMain" type="file" accept="image/*" /></label><label className="file-input admin-full">Small overlay image<input name="heroSmall" type="file" accept="image/*" /></label><p className="admin-help admin-full">Choose one or both images. The existing image remains if no replacement is selected.</p><button className="admin-button" type="submit">Update hero images</button></form></Panel><Panel title="Current hero artwork"><div className="hero-admin-preview"><img src={content?.heroMainUrl || 'https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?auto=format&fit=crop&w=800&q=85'} alt="Current main hero" /><img src={content?.heroSmallUrl || 'https://images.unsplash.com/photo-1533294455009-a77b7557d2d1?auto=format&fit=crop&w=500&q=85'} alt="Current small hero" /></div></Panel></div><div className="admin-split"><Panel title="Update home story images"><form className="admin-form-grid" onSubmit={(event) => void submit(event, 'Your new home story images are now live on the website.')}><label className="file-input admin-full">Large image — event venue photo<input name="introMain" type="file" accept="image/*" /></label><label className="file-input admin-full">Small overlay image — detail photo<input name="introSmall" type="file" accept="image/*" /></label><p className="admin-help admin-full">These are the two overlapping images below the home page introduction. Choose one or both images to replace.</p><button className="admin-button" type="submit">Update home story images</button></form></Panel><Panel title="Current home story artwork"><div className="hero-admin-preview"><img src={content?.introMainUrl || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=850&q=85'} alt="Current home story main" /><img src={content?.introSmallUrl || 'https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=450&q=85'} alt="Current home story small" /></div></Panel></div></section>
}

export function AdminHomeContentPage() {
  const token = useAdminToken()
  const { confirm, notify } = useFeedback()
  const [content, setContent] = useState<HomeContent | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.adminHomeContent(token)
      .then((nextContent) => { setContent(nextContent); setError(null) })
      .catch((reason: unknown) => setError(messageFor(reason, 'Unable to load home content.')))
  }, [token])

  const updateContent = async (event: FormEvent<HTMLFormElement>, successMessage: string) => {
    event.preventDefault()
    const form = event.currentTarget
    setError(null)
    try {
      setContent(await api.updateHomeContent(token, new FormData(form)))
      form.reset()
      notify({ title: 'Home page updated', message: successMessage })
    } catch (reason) {
      setError(messageFor(reason, 'Unable to update home page images.'))
    }
  }

  const configuredHeroSlides = (content?.heroSlides || []).filter((slide) => Boolean(slide.url))
  const legacyHeroSlides = [
    content?.heroMainUrl ? { url: content.heroMainUrl, publicId: '' } : null,
    content?.heroSmallUrl ? { url: content.heroSmallUrl, publicId: '' } : null,
  ].filter((slide): slide is { url: string; publicId: string } => Boolean(slide))
  const storedHeroSlides = configuredHeroSlides.length ? configuredHeroSlides : legacyHeroSlides
  const previewHeroSlides = storedHeroSlides.length ? storedHeroSlides : [
    { url: 'https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?auto=format&fit=crop&w=800&q=85', publicId: '' },
    { url: 'https://images.unsplash.com/photo-1533294455009-a77b7557d2d1?auto=format&fit=crop&w=500&q=85', publicId: '' },
  ]

  const removeHeroSlide = async (slideUrl: string) => {
    if (!await confirm({ title: 'Remove this slider image?', message: 'This image will be removed from the home page hero slider.', confirmLabel: 'Remove image', tone: 'error' })) return
    setError(null)
    try {
      const form = new FormData()
      form.append('removeHeroSlideUrl', slideUrl)
      setContent(await api.updateHomeContent(token, form))
      notify({ title: 'Slider image removed', message: 'The home page hero slider has been updated.' })
    } catch (reason) {
      setError(messageFor(reason, 'Unable to remove the slider image.'))
    }
  }

  return <section className="admin-page"><div className="admin-page-heading"><div><p className="eyebrow">Home page content</p><h1>Your first <em>beautiful impression.</em></h1></div></div><ErrorNotice error={error} /><div className="admin-split"><Panel title="Add hero slider images"><form className="admin-form-grid" onSubmit={(event) => void updateContent(event, 'Your new images are now part of the home page hero slider.')}><label className="file-input admin-full">Select slider images<input name="heroSlides" type="file" accept="image/*" multiple /></label><p className="admin-help admin-full">Choose one or more images to add to the hero slider. The existing slides stay in place, and you can keep up to 10 images.</p><button className="admin-button" type="submit">Add to hero slider</button></form></Panel><Panel title={`Hero slider images (${previewHeroSlides.length})`}><div className="hero-slider-admin-grid">{previewHeroSlides.map((slide, index) => <article key={slide.url}><img src={slide.url} alt={`Hero slider slide ${index + 1}`} /><footer><span>Slide {String(index + 1).padStart(2, '0')}</span>{storedHeroSlides.length ? <button type="button" onClick={() => void removeHeroSlide(slide.url)}>Remove</button> : <small>Default image</small>}</footer></article>)}</div></Panel></div><div className="admin-split"><Panel title="Update home story images"><form className="admin-form-grid" onSubmit={(event) => void updateContent(event, 'Your new home story images are now live on the website.')}><label className="file-input admin-full">Large image — event venue photo<input name="introMain" type="file" accept="image/*" /></label><label className="file-input admin-full">Small overlay image — detail photo<input name="introSmall" type="file" accept="image/*" /></label><p className="admin-help admin-full">These are the two overlapping images below the home page introduction. Choose one or both images to replace.</p><button className="admin-button" type="submit">Update home story images</button></form></Panel><Panel title="Current home story artwork"><div className="hero-admin-preview"><img src={content?.introMainUrl || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=850&q=85'} alt="Current home story main" /><img src={content?.introSmallUrl || 'https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=450&q=85'} alt="Current home story small" /></div></Panel></div></section>
}

export function AdminPageArtworkPage() {
  const token = useAdminToken()
  const { notify } = useFeedback()
  const [content, setContent] = useState<HomeContent | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { api.adminPageArtwork(token).then((nextContent) => { setContent(nextContent); setError(null) }).catch((reason: unknown) => setError(messageFor(reason, 'Unable to load page artwork.'))) }, [token])
  const submit = async (event: FormEvent<HTMLFormElement>, message: string) => {
    event.preventDefault()
    const form = event.currentTarget
    setError(null)
    try {
      setContent(await api.updatePageArtwork(token, new FormData(form)))
      form.reset()
      notify({ title: 'Page artwork updated', message })
    } catch (reason) { setError(messageFor(reason, 'Unable to update page artwork.')) }
  }
  if (content) return <section className="admin-page"><div className="admin-page-heading"><div><p className="eyebrow">Public page images</p><h1>Keep every page <em>beautiful.</em></h1></div></div><ErrorNotice error={error} /><div className="admin-split"><Panel title="About page section images"><form className="admin-form-grid" onSubmit={(event) => void submit(event, 'Your About page section images are now live.')}><label className="file-input admin-full">About Cotton Candy Event Deco image<input name="aboutStory" type="file" accept="image/*" /></label><label className="file-input admin-full">The finishing touches image<input name="aboutFinishing" type="file" accept="image/*" /></label><p className="admin-help admin-full">Upload either image on its own or replace both together. Each image appears in its matching About page section.</p><button className="admin-button" type="submit">Update About section images</button></form></Panel><Panel title="Current About section artwork"><div className="about-artwork-preview"><figure><img src={content.aboutStoryUrl || 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=800&q=85'} alt="Current About Cotton Candy Event Deco artwork" /><figcaption>About Cotton Candy Event Deco</figcaption></figure><figure><img src={content.aboutFinishingUrl || 'https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=850&q=85'} alt="Current finishing touches artwork" /><figcaption>The finishing touches</figcaption></figure></div></Panel></div><div className="admin-split"><Panel title="About page cover image"><form className="admin-form-grid" onSubmit={(event) => void submit(event, 'Your About page cover image is now live.')}><label className="file-input admin-full">Cover image behind the About heading<input name="aboutHero" type="file" accept="image/*" /></label><p className="admin-help admin-full">This separate image appears behind the About page heading.</p><button className="admin-button" type="submit">Update About cover image</button></form></Panel><Panel title="Current About cover"><div className="page-artwork-single"><img src={content.aboutHeroUrl || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=85'} alt="Current About cover" /></div></Panel></div><div className="admin-split"><Panel title="Bookings page hero"><form className="admin-form-grid" onSubmit={(event) => void submit(event, 'Your Bookings page hero image is now live.')}><label className="file-input admin-full">Bookings hero image<input name="bookingsHero" type="file" accept="image/*" /></label><p className="admin-help admin-full">This image appears behind the Bookings page heading. Leave it empty to keep the current image.</p><button className="admin-button" type="submit">Update Bookings image</button></form></Panel><Panel title="Current Bookings artwork"><div className="page-artwork-single"><img src={content.bookingsHeroUrl || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=85'} alt="Current Bookings hero" /></div></Panel></div></section>
  return <section className="admin-page"><div className="admin-page-heading"><div><p className="eyebrow">Public page images</p><h1>Preparing your <em>artwork.</em></h1></div></div><ErrorNotice error={error} />{error ? null : <div className="admin-info">Loading your current page images…</div>}</section>
}

function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) { return <div className="admin-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="admin-dialog" role="dialog" aria-modal="true" aria-label={title}><button type="button" aria-label="Close" onClick={onClose}>×</button><p className="eyebrow">Cotton Candy collection</p><h2>{title}</h2>{children}</section></div> }
