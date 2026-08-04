import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useFeedback } from '../components/Feedback'
import { api, type AdminDashboard, type Category, type CollectionType, type ContactMessage, type MediaAsset, type Offering, type Promotion, type RequestStatus, type ServiceRequest } from '../lib/api'
import { useAuth } from '../lib/useAuth'

const emptyDashboard: AdminDashboard = { totals: { requests: 0, pending: 0, unreadMessages: 0, media: 0 }, requests: [], messages: [], offerings: [], promotions: [] }
const statusOptions: RequestStatus[] = ['pending', 'active', 'complete', 'cancel']

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
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => api.adminServiceRequests(token).then((items) => { setRequests(items); setError(null) }).catch((reason: unknown) => setError(messageFor(reason, 'Unable to load requests.'))), [token])
  useEffect(() => { void load() }, [load])
  const changeStatus = async (request: ServiceRequest, status: RequestStatus) => {
    try {
      await api.updateServiceRequestStatus(token, request._id, status)
      await load()
      notify({ title: 'Order status updated', message: `${request.offeringName} is now marked ${status}.` })
    } catch (reason) { setError(messageFor(reason, 'Unable to update request.')) }
  }
  const deleteRequest = async (request: ServiceRequest) => {
    if (!await confirm({ title: 'Delete this customer request?', message: `${request.offeringName} for ${request.customerName} will be permanently deleted. This cannot be undone.`, confirmLabel: 'Delete request' })) return
    try {
      await api.deleteServiceRequest(token, request._id)
      await load()
      notify({ title: 'Request deleted', message: `${request.offeringName} has been removed from your order list.` })
    } catch (reason) { setError(messageFor(reason, 'Unable to delete request.')) }
  }
  return <section className="admin-page"><div className="admin-page-heading"><div><p className="eyebrow">Customer orders</p><h1>Service & hire <em>requests.</em></h1></div></div><ErrorNotice error={error} /><section className="admin-card admin-table-card">{requests.length ? <div className="request-admin-list">{requests.map((request) => <article key={request._id}><div><strong>{request.customerName}</strong><p>{request.offeringName} · <b>{formatLkr(request.totalPrice)}</b>{request.type === 'hire' ? ` · ${request.hireDays} day${request.hireDays === 1 ? '' : 's'}` : ''}</p><small>{request.email}{request.promotionTitle ? ` · ${request.promotionTitle} (${request.discountPercent}% off)` : ''}{request.eventDate ? ` · ${new Date(request.eventDate).toLocaleDateString()}` : ''}</small></div><div className="request-admin-actions"><select className={`request-status ${request.status}`} value={request.status} onChange={(event) => void changeStatus(request, event.target.value as RequestStatus)}>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select><button type="button" onClick={() => void deleteRequest(request)}>Delete</button></div></article>)}</div> : <EmptyState>Customer service and hire requests will appear here.</EmptyState>}</section></section>
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

export function AdminHomeContentPage() {
  const token = useAdminToken()
  const { notify } = useFeedback()
  const [content, setContent] = useState<{ heroMainUrl: string; heroSmallUrl: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { api.adminHomeContent(token).then((nextContent) => { setContent(nextContent); setError(null) }).catch((reason: unknown) => setError(messageFor(reason, 'Unable to load home content.'))) }, [token])
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    setError(null)
    try {
      setContent(await api.updateHomeContent(token, new FormData(form)))
      form.reset()
      notify({ title: 'Home page updated', message: 'Your new hero artwork is now live on the website.' })
    } catch (reason) { setError(messageFor(reason, 'Unable to update hero images.')) }
  }
  return <section className="admin-page"><div className="admin-page-heading"><div><p className="eyebrow">Home page hero</p><h1>Your first <em>beautiful impression.</em></h1></div></div><ErrorNotice error={error} /><div className="admin-split"><Panel title="Update hero images"><form className="admin-form-grid" onSubmit={submit}><label className="file-input admin-full">Main image — right of “Make your day”<input name="heroMain" type="file" accept="image/*" /></label><label className="file-input admin-full">Small overlay image<input name="heroSmall" type="file" accept="image/*" /></label><p className="admin-help admin-full">Choose one or both images. The existing image remains if no replacement is selected.</p><button className="admin-button" type="submit">Update home page</button></form></Panel><Panel title="Current hero artwork"><div className="hero-admin-preview"><img src={content?.heroMainUrl || 'https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?auto=format&fit=crop&w=800&q=85'} alt="Current main hero" /><img src={content?.heroSmallUrl || 'https://images.unsplash.com/photo-1533294455009-a77b7557d2d1?auto=format&fit=crop&w=500&q=85'} alt="Current small hero" /></div></Panel></div></section>
}

function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) { return <div className="admin-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="admin-dialog" role="dialog" aria-modal="true" aria-label={title}><button type="button" aria-label="Close" onClick={onClose}>×</button><p className="eyebrow">Cotton Candy collection</p><h2>{title}</h2>{children}</section></div> }
