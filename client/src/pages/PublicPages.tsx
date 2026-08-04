import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useFeedback } from '../components/Feedback'
import { api, type Category, type CollectionType, type MediaAsset, type Offering, type Promotion, type ServiceRequest } from '../lib/api'

const heroBalloons = [
  { color: 'pink', left: 7, top: 38, size: 78, tilt: -8 }, { color: 'lilac', left: 31, top: 11, size: 46, tilt: 9 },
  { color: 'butter', left: 44, top: 76, size: 60, tilt: -5 }, { color: 'mint', left: 62, top: 16, size: 54, tilt: 6 },
  { color: 'berry', left: 71, top: 76, size: 72, tilt: -7 }, { color: 'peach', left: 93, top: 42, size: 50, tilt: 10 },
  { color: 'lilac', left: 18, top: 17, size: 42, tilt: -13 }, { color: 'butter', left: 52, top: 33, size: 48, tilt: 12 },
  { color: 'mint', left: 82, top: 59, size: 43, tilt: -9 }, { color: 'peach', left: 36, top: 56, size: 38, tilt: 7 },
] as const
type BalloonStyle = CSSProperties & Record<'--balloon-left' | '--balloon-top' | '--balloon-size' | '--balloon-tilt', string>
type HeroFlower = { id: number; x: number; y: number; icon: string; color: string; size: number; rotation: number }
const lkrFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 })
const hireDurationOptions = [1, 2, 3, 4, 5, 6, 7, 10, 14, 21, 30]
function formatLkr(amount: number | undefined) { return lkrFormatter.format(typeof amount === 'number' && Number.isFinite(amount) ? amount : 0) }

function HeroBalloons() {
  const layerRef = useRef<HTMLDivElement>(null)
  const balloonRefs = useRef<Array<HTMLDivElement | null>>([])
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 801px) and (pointer: fine)')
    const layer = layerRef.current
    if (!mediaQuery.matches || !layer) return
    const balloonStates = heroBalloons.flatMap((balloon, index) => {
      const node = balloonRefs.current[index]
      if (!node) return []
      return [{ index, node, width: balloon.size, height: balloon.size * 1.18, left: 0, top: 0, velocityX: (Math.random() - .5) * 24, velocityY: (Math.random() - .5) * 24 }]
    })
    let pointerX = -Infinity
    let pointerY = -Infinity
    let animationFrame = 0
    let lastTimestamp = performance.now()
    const startBounds = layer.getBoundingClientRect()
    balloonStates.forEach((balloon) => {
      balloon.left = Math.max(0, startBounds.width - balloon.width) * heroBalloons[balloon.index].left / 100
      balloon.top = Math.max(0, startBounds.height - balloon.height) * heroBalloons[balloon.index].top / 100
      balloon.node.style.setProperty('--balloon-auto-left', `${balloon.left}px`)
      balloon.node.style.setProperty('--balloon-auto-top', `${balloon.top}px`)
    })
    const tick = (timestamp: number) => {
      const elapsed = Math.min((timestamp - lastTimestamp) / 1000, .035)
      lastTimestamp = timestamp
      const bounds = layer.getBoundingClientRect()
      const pointerIsInside = pointerX >= bounds.left && pointerX <= bounds.right && pointerY >= bounds.top && pointerY <= bounds.bottom
      balloonStates.forEach((balloon) => {
        const centreX = bounds.left + balloon.left + balloon.width / 2
        const centreY = bounds.top + balloon.top + balloon.height / 2
        balloon.velocityX += Math.sin(timestamp / 1300 + balloon.index * 1.9) * 5 * elapsed
        balloon.velocityY += Math.cos(timestamp / 1600 + balloon.index * 2.4) * 5 * elapsed
        if (pointerIsInside) {
          const horizontalDelta = centreX - pointerX
          const verticalDelta = centreY - pointerY
          const rawDistance = Math.hypot(horizontalDelta, verticalDelta)
          const safeDistance = rawDistance || 1
          if (safeDistance < 215) {
            const strength = (1 - safeDistance / 215) ** 2 * 820
            const directionX = rawDistance < 1 ? Math.cos(balloon.index * 2.4) : horizontalDelta / safeDistance
            const directionY = rawDistance < 1 ? Math.sin(balloon.index * 2.4) : verticalDelta / safeDistance
            balloon.velocityX += directionX * strength * elapsed
            balloon.velocityY += directionY * strength * elapsed
          }
        }
        const speed = Math.hypot(balloon.velocityX, balloon.velocityY)
        if (speed > 170) { balloon.velocityX = balloon.velocityX / speed * 170; balloon.velocityY = balloon.velocityY / speed * 170 }
        const drag = Math.pow(.996, elapsed * 60)
        balloon.velocityX *= drag
        balloon.velocityY *= drag
        balloon.left += balloon.velocityX * elapsed
        balloon.top += balloon.velocityY * elapsed
        const maxLeft = Math.max(0, bounds.width - balloon.width)
        const maxTop = Math.max(0, bounds.height - balloon.height)
        if (balloon.left <= 0 || balloon.left >= maxLeft) { balloon.left = Math.min(maxLeft, Math.max(0, balloon.left)); balloon.velocityX = -balloon.velocityX * .83 }
        if (balloon.top <= 0 || balloon.top >= maxTop) { balloon.top = Math.min(maxTop, Math.max(0, balloon.top)); balloon.velocityY = -balloon.velocityY * .83 }
      })
      balloonStates.forEach((firstBalloon, firstIndex) => {
        balloonStates.slice(firstIndex + 1).forEach((secondBalloon, secondOffset) => {
          const secondIndex = firstIndex + secondOffset + 1
          const horizontalDelta = firstBalloon.left + firstBalloon.width / 2 - secondBalloon.left - secondBalloon.width / 2
          const verticalDelta = firstBalloon.top + firstBalloon.height / 2 - secondBalloon.top - secondBalloon.height / 2
          const rawDistance = Math.hypot(horizontalDelta, verticalDelta)
          const minimumDistance = (firstBalloon.width + secondBalloon.width) * .43
          if (rawDistance >= minimumDistance) return
          const safeDistance = rawDistance || 1
          const directionX = rawDistance < 1 ? Math.cos((firstIndex + 1) * (secondIndex + 1)) : horizontalDelta / safeDistance
          const directionY = rawDistance < 1 ? Math.sin((firstIndex + 1) * (secondIndex + 1)) : verticalDelta / safeDistance
          const overlap = (minimumDistance - safeDistance) / 2
          firstBalloon.left += directionX * overlap
          firstBalloon.top += directionY * overlap
          secondBalloon.left -= directionX * overlap
          secondBalloon.top -= directionY * overlap
          const relativeVelocity = (firstBalloon.velocityX - secondBalloon.velocityX) * directionX + (firstBalloon.velocityY - secondBalloon.velocityY) * directionY
          if (relativeVelocity >= 0) return
          const impulse = -relativeVelocity * .84
          firstBalloon.velocityX += directionX * impulse
          firstBalloon.velocityY += directionY * impulse
          secondBalloon.velocityX -= directionX * impulse
          secondBalloon.velocityY -= directionY * impulse
        })
      })
      balloonStates.forEach((balloon) => {
        balloon.node.style.setProperty('--balloon-auto-left', `${balloon.left}px`)
        balloon.node.style.setProperty('--balloon-auto-top', `${balloon.top}px`)
      })
      animationFrame = window.requestAnimationFrame(tick)
    }
    const move = (event: PointerEvent) => {
      pointerX = event.clientX
      pointerY = event.clientY
    }
    window.addEventListener('pointermove', move, { passive: true })
    animationFrame = window.requestAnimationFrame(tick)
    return () => { window.removeEventListener('pointermove', move); window.cancelAnimationFrame(animationFrame) }
  }, [])
  return <div className="hero-balloons" ref={layerRef} aria-hidden="true">{heroBalloons.map((balloon, index) => <div className={`hero-balloon hero-balloon-${balloon.color}`} key={`${balloon.color}-${index}`} ref={(node) => { balloonRefs.current[index] = node }} style={{ '--balloon-left': `${balloon.left}%`, '--balloon-top': `${balloon.top}%`, '--balloon-size': `${balloon.size}px`, '--balloon-tilt': `${balloon.tilt}deg` } as BalloonStyle}><span /></div>)}</div>
}

function HeroTypedHeading({ onPointerDown }: { onPointerDown: (event: ReactPointerEvent<HTMLHeadingElement>) => void }) {
  const firstLine = 'Make your day'
  const secondLine = 'unforgettably beautiful.'
  const [typedCharacters, setTypedCharacters] = useState(0)
  useEffect(() => {
    const totalCharacters = firstLine.length + secondLine.length
    const timer = window.setInterval(() => setTypedCharacters((current) => {
      if (current >= totalCharacters) { window.clearInterval(timer); return current }
      return current + 1
    }), 52)
    return () => window.clearInterval(timer)
  }, [])
  const firstCharacters = Math.min(typedCharacters, firstLine.length)
  const secondCharacters = Math.max(0, typedCharacters - firstLine.length)
  return <h1 className="hero-flower-heading hero-typed-heading" onPointerDown={onPointerDown}>{firstLine.slice(0, firstCharacters)}<br /><em>{secondLine.slice(0, secondCharacters)}</em>{typedCharacters < firstLine.length + secondLine.length ? <span className="hero-typing-caret" aria-hidden="true" /> : null}</h1>
}

function PageHero({ eyebrow, title, children, className }: { eyebrow: string; title: ReactNode; children?: ReactNode; className: string }) {
  return <section className={`page-hero ${className}`}><div className="container"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children}</div></section>
}

function categoryName(category: Offering['category']) { return typeof category === 'string' ? category : category.name }
function categoryId(category: Offering['category']) { return typeof category === 'string' ? category : category._id }

function FilterButtons({ current, onChange, options }: { current: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return <div className="filter-pills">{options.map(([value, label]) => <button className={current === value ? 'active' : ''} key={value} type="button" onClick={() => onChange(value)}>{label}</button>)}</div>
}

export function HomePage() {
  const [hero, setHero] = useState({ heroMainUrl: '', heroSmallUrl: '' })
  const [heroFlowers, setHeroFlowers] = useState<HeroFlower[]>([])
  useEffect(() => { api.homeContent().then(setHero).catch(() => undefined) }, [])
  const heroMain = hero.heroMainUrl || 'https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?auto=format&fit=crop&w=1100&q=85'
  const heroSmall = hero.heroSmallUrl || 'https://images.unsplash.com/photo-1533294455009-a77b7557d2d1?auto=format&fit=crop&w=600&q=85'
  const bloomHeroHeading = (event: ReactPointerEvent<HTMLHeadingElement>) => {
    event.stopPropagation()
    const seed = Date.now()
    const icons = ['✿', '❀', '✦', '✾', '✿', '❀']
    const colors = ['#d46f95', '#eea4b5', '#b991c6', '#e7b76d', '#d982a0', '#e88fa7']
    const flowers = icons.map((icon, index) => {
      const angle = Math.PI * 2 * index / icons.length + Math.random() * .42
      const distance = 30 + Math.random() * 62
      return { id: seed + index / 10, x: event.clientX + Math.cos(angle) * distance, y: event.clientY + Math.sin(angle) * distance, icon, color: colors[index], size: 22 + Math.round(Math.random() * 13), rotation: -38 + Math.round(Math.random() * 76) }
    })
    setHeroFlowers((current) => [...current, ...flowers])
    window.setTimeout(() => setHeroFlowers((current) => current.filter((flower) => flower.id < seed || flower.id >= seed + 1)), 880)
  }
  return <><section className="hero"><div className="hero-glow hero-glow-one" /><div className="hero-glow hero-glow-two" /><HeroBalloons /><div className="hero-content container"><p className="eyebrow">Melbourne event styling & hire</p><HeroTypedHeading onPointerDown={bloomHeroHeading} /><p className="hero-copy">Thoughtful, luxe styling for the moments that deserve a little magic.</p><div className="hero-actions"><Link className="button button-dark" to="/services">Explore our services <span>↗</span></Link><Link className="text-link" to="/gallery/images">See the magic <span>→</span></Link></div></div><div className="hero-photo hero-photo-main"><img src={heroMain} alt="Cotton Candy event styling" /></div><div className="hero-photo hero-photo-small"><img src={heroSmall} alt="Cotton Candy event detail" /></div><div className="hero-note">Celebrations, but make them<br /><strong>extra special</strong> <span>♡</span></div></section>{heroFlowers.map((flower) => <span className="hero-heading-flower" key={flower.id} style={{ color: flower.color, fontSize: flower.size, left: flower.x, top: flower.y, '--flower-rotation': `${flower.rotation}deg` } as CSSProperties & Record<'--flower-rotation', string>} aria-hidden="true">{flower.icon}</span>)}<section className="trust-bar container"><p>Styling the sweetest celebrations across Melbourne</p><div><span>Weddings</span><i /><span>Birthdays</span><i /><span>Baby showers</span><i /><span>Corporate events</span></div></section><section className="intro-section container section-grid"><div className="intro-images"><img className="intro-main" src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=850&q=85" alt="Beautifully decorated event table" /><div className="intro-sticker">Dream.<br />Celebrate.<br /><em>Repeat.</em></div><img className="intro-small" src="https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=450&q=85" alt="Pink floral event details" /></div><div className="intro-copy"><p className="eyebrow">A little about us</p><h2>We bring your <em>dream celebration</em> to life.</h2><p>From show-stopping balloon garlands to luxe backdrops and every tiny detail in between, Cotton Candy Event Deco turns your vision into an experience your guests will never forget.</p><Link className="text-link" to="/about">Get to know us <span>→</span></Link></div></section><section className="services-preview pink-wash"><div className="container"><div className="section-heading"><div><p className="eyebrow">How we make magic</p><h2>Everything you need<br />for a <em>beautiful event.</em></h2></div><Link className="button button-light" to="/services-hire">Explore collections <span>↗</span></Link></div><div className="service-cards"><Link className="service-card" to="/services"><span className="service-number">01</span><div className="service-icon">✦</div><h3>Event services</h3><p>Thoughtfully styled spaces with your story at the centre.</p><span className="arrow-circle">↗</span></Link><Link className="service-card" to="/services"><span className="service-number">02</span><div className="service-icon">◌</div><h3>Balloon artistry</h3><p>Dreamy garlands, installations and organic balloon moments.</p><span className="arrow-circle">↗</span></Link><Link className="service-card" to="/hire"><span className="service-number">03</span><div className="service-icon">⌇</div><h3>Hire collection</h3><p>Beautiful pieces to make your own vision come to life.</p><span className="arrow-circle">↗</span></Link></div></div></section><section className="featured-section container"><div className="featured-photo"><img src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=85" alt="Wedding reception with flowers" /><div className="photo-label">Designed with love<br /><em>in every detail</em></div></div><div className="featured-copy"><p className="eyebrow">Something sweet</p><h2>See our current <em>celebration offers.</em></h2><Link className="text-link" to="/promotions">View promotions <span>→</span></Link></div></section><section className="cta-section"><div className="cta-image"><img src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1300&q=85" alt="Celebration with pink flowers" /></div><div className="cta-content"><p className="eyebrow">Let’s make it magical</p><h2>Ready to plan<br />something <em>beautiful?</em></h2><p>Tell us a little about your dream day and we’ll take care of the pretty details.</p><Link className="button button-dark" to="/contact">Start your enquiry <span>↗</span></Link></div></section></>
}

export function AboutPage() { return <><PageHero eyebrow="Our story" className="page-hero-about" title={<>We believe every<br />celebration deserves<br /><em>a little magic.</em></>} /><section className="about-story container section-grid"><div className="about-copy"><p className="eyebrow">About Cotton Candy Event Deco</p><h2>Luxury in the details. <em>Joy in every moment.</em></h2><p>Welcome to Cotton Candy Event Deco, your premier destination for luxurious event styling in Melbourne. We specialise in creating unforgettable experiences with exquisite balloon garlands, stunning backdrops, and elegant decor tailored for every occasion.</p><p>Our mission is to enhance your celebrations—whether it’s a wedding, birthday or baby shower—by providing unique, stylish decorations that reflect your vision. Let us transform your special day into a magical memory.</p></div><div className="about-image-stack"><img className="about-image-large" src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=800&q=85" alt="Elegant wedding styling" /><div className="established-badge">Made with<br /><em>love</em><br />in Melbourne</div></div></section><section className="values-section pink-wash"><div className="container"><div className="section-heading"><div><p className="eyebrow">What matters to us</p><h2>The <em>Cotton Candy</em> difference.</h2></div></div><div className="values-grid"><Value number="01" title="Intentional styling" copy="Every colour, curve and tiny detail is chosen to tell your story beautifully." /><Value number="02" title="Made for you" copy="Your celebration is one of a kind. Your decor should feel exactly the same." /><Value number="03" title="Stress-free magic" copy="We make the whole process feel simple, seamless and a little bit fun." /></div></div></section><section className="finishing-section container section-grid"><div className="finishing-photo"><img src="https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=850&q=85" alt="Pastel flower arrangement" /></div><div className="finishing-copy"><p className="eyebrow">The finishing touches</p><h2>It’s the little things that make a <em>big impact.</em></h2><p>From welcome signs to bespoke flower arrangements, our team pays attention to every element of your event decor. We offer customisable packages, ensuring each event is as unique as our clients.</p><Link className="button button-dark" to="/contact">Create something beautiful <span>↗</span></Link></div></section></> }
function Value({ number, title, copy }: { number: string; title: string; copy: string }) { return <article className="value-card"><span>{number}</span><h3>{title}</h3><p>{copy}</p></article> }

export function ServicesHirePage() { return <><PageHero eyebrow="Services & hire" className="page-hero-services" title={<>Your celebration,<br /><em>beautifully covered.</em></>}><p>Choose a service, hire a beautiful piece, or find existing orders with your email address.</p></PageHero><section className="collection-choice container"><Link to="/services"><span>01</span><p className="eyebrow">Creative support</p><h2>Explore our <em>services.</em></h2><p>Balloon styling, full event design and bespoke finishing touches.</p><b>View services →</b></Link><Link to="/hire"><span>02</span><p className="eyebrow">Beautiful pieces</p><h2>Explore our <em>hire.</em></h2><p>Curated backdrops, plinths and event pieces ready for your day.</p><b>View hire collection →</b></Link></section><RequestTracker /></> }

export function ServicesCollectionPage() { return <CollectionPage type="service" /> }
export function HireCollectionPage() { return <CollectionPage type="hire" /> }

function CollectionPage({ type }: { type: CollectionType }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [offerings, setOfferings] = useState<Offering[]>([])
  const [category, setCategory] = useState('all')
  useEffect(() => { Promise.all([api.categories(type), api.offerings(type)]).then(([nextCategories, nextOfferings]) => { setCategories(nextCategories); setOfferings(nextOfferings) }).catch(() => undefined) }, [type])
  const visible = useMemo(() => offerings.filter((item) => category === 'all' || categoryId(item.category) === category), [category, offerings])
  const descriptor = type === 'service' ? 'creative event services' : 'beautiful pieces for hire'
  return <><PageHero eyebrow={type === 'service' ? 'Event services' : 'The hire collection'} className="page-hero-services" title={type === 'service' ? <>The <em>pretty</em> part<br />made easy.</> : <>Beautiful pieces,<br /><em>ready to celebrate.</em></>}><p>Browse our {descriptor}, then send a request for your date.</p></PageHero><section className="collection-page container"><div className="collection-toolbar"><div><p className="eyebrow">{type === 'service' ? 'Choose your magic' : 'Choose your pieces'}</p><h2>{visible.length} ways to make it <em>memorable.</em></h2></div><FilterButtons current={category} onChange={setCategory} options={[['all', 'All'], ...categories.map((item) => [item._id, item.name] as [string, string])]} /></div><div className="offering-grid">{visible.map((offering) => <OfferingCard offering={offering} key={offering._id} />)}</div>{visible.length === 0 ? <p className="empty-state">New items are coming soon. Please check back shortly.</p> : null}</section><RequestTracker /></>
}

function OfferingCard({ offering }: { offering: Offering }) { return <article className="offering-card"><Link to={`/${offering.type === 'service' ? 'services' : 'hire'}/${offering._id}`}><div className="offering-image"><img src={offering.imageUrl} alt={offering.name} />{offering.featured ? <span>Most loved</span> : null}</div><div className="offering-copy"><p className="product-type">{categoryName(offering.category)}</p><h3>{offering.name}</h3><p>{offering.description}</p><strong>From {formatLkr(offering.price)}{offering.type === 'hire' ? ' / day' : ''}</strong><span className="store-view-link">View details →</span></div></Link></article> }

export function OfferingDetailsPage({ type }: { type: CollectionType }) {
  const { offeringId } = useParams()
  const [offering, setOffering] = useState<Offering | null>(null)
  const [loading, setLoading] = useState(Boolean(offeringId))
  useEffect(() => { if (!offeringId) return; api.offering(offeringId).then((item) => { if (item.type === type) setOffering(item) }).catch(() => undefined).finally(() => setLoading(false)) }, [offeringId, type])
  if (loading) return <p className="loading-message">Loading something beautiful…</p>
  if (!offering) return <section className="container product-not-found"><p className="eyebrow">Cotton Candy</p><h1>That item is no longer <em>available.</em></h1><Link className="button button-dark" to={`/${type === 'service' ? 'services' : 'hire'}`}>Back to collection <span>←</span></Link></section>
  return <><section className="product-detail container"><div className="product-detail-image"><img src={offering.imageUrl} alt={offering.name} /></div><div className="product-detail-copy"><Link className="back-link" to={`/${type === 'service' ? 'services' : 'hire'}`}>← Back to {type === 'service' ? 'services' : 'hire collection'}</Link><p className="eyebrow">{categoryName(offering.category)}</p><h1>{offering.name}</h1><p className="detail-price">From {formatLkr(offering.price)} <span>{type === 'hire' ? '/ day' : '/ package'}</span></p><p>{offering.description || 'We will confirm availability and tailor the finishing touches for your celebration.'}</p><div className="detail-divider" /><div className="product-facts"><div><span>Availability</span><strong className={offering.availability}>{offering.availability}</strong></div><div><span>Collection</span><strong>Cotton Candy {type}</strong></div></div></div></section><ServiceRequestForm offering={offering} /></>
}

function ServiceRequestForm({ offering }: { offering: Offering }) {
  const { notify } = useFeedback()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [success, setSuccess] = useState<ServiceRequest | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [hireDays, setHireDays] = useState(1)
  const [promotionId, setPromotionId] = useState('')
  useEffect(() => { api.promotions().then(setPromotions).catch(() => undefined) }, [])
  const applicablePromotions = promotions.filter((promotion) => promotion.discountPercent > 0 && (promotion.appliesTo === 'all' || promotion.appliesTo === offering.type))
  const selectedPromotion = applicablePromotions.find((promotion) => promotion._id === promotionId)
  const unitPrice = offering.price
  const subtotal = unitPrice * (offering.type === 'hire' ? hireDays : 1)
  const discountAmount = Math.round(subtotal * (selectedPromotion?.discountPercent || 0) / 100)
  const totalPrice = Math.max(0, subtotal - discountAmount)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSubmitting(true); setError(null); setSuccess(null)
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form))
    try { const response = await api.createServiceRequest({ ...values, offeringId: offering._id, hireDays, promotionId }); setSuccess(response.request); form.reset(); setHireDays(1); setPromotionId(''); notify({ title: 'Your request is on its way!', message: `We received your ${offering.name} request. Check its status anytime using your email address.` }) } catch (requestError) { const message = requestError instanceof Error ? requestError.message : 'Unable to send your request.'; setError(message); notify({ tone: 'error', title: 'Your request was not sent', message }) } finally { setSubmitting(false) }
  }
  return <section className="request-section pink-wash"><div className="container request-layout"><div><p className="eyebrow">Request this {offering.type}</p><h2>Let’s make it <em>happen.</em></h2><p>Send your details, choose any available offer and we’ll create your request. You can check every order later using your email address.</p></div><form className="request-form" onSubmit={submit}><label>Your name<input name="customerName" required placeholder="Your full name" /></label><label>Email address<input name="email" type="email" required placeholder="you@example.com" /></label><label>Phone number<input name="phone" type="tel" placeholder="Your best contact number" /></label><div className="field-row"><label>Event type<input name="eventType" placeholder="Birthday, wedding…" /></label><label>Event date<input name="eventDate" type="date" /></label></div>{offering.type === 'hire' ? <label>Hire duration<select name="hireDays" value={hireDays} onChange={(event) => setHireDays(Number(event.target.value))}>{hireDurationOptions.map((days) => <option key={days} value={days}>{days} day{days === 1 ? '' : 's'}</option>)}</select></label> : null}{applicablePromotions.length ? <label>Apply a special offer<select name="promotionId" value={promotionId} onChange={(event) => setPromotionId(event.target.value)}><option value="">No promotion</option>{applicablePromotions.map((promotion) => <option key={promotion._id} value={promotion._id}>{promotion.title} — save {promotion.discountPercent}%</option>)}</select></label> : null}<div className="price-summary"><div><span>{offering.type === 'hire' ? `Daily price × ${hireDays} day${hireDays === 1 ? '' : 's'}` : 'Service price'}</span><strong>{formatLkr(subtotal)}</strong></div>{selectedPromotion ? <div className="discount"><span>{selectedPromotion.title} ({selectedPromotion.discountPercent}% off)</span><strong>−{formatLkr(discountAmount)}</strong></div> : null}<div className="total"><span>Estimated total</span><strong>{formatLkr(totalPrice)}</strong></div></div><label>Anything we should know?<textarea name="notes" placeholder="Tell us about your celebration" /></label><label className="marketing-consent"><input name="marketingConsent" type="checkbox" /> <span>Yes, I’d like Cotton Candy Event Deco to email me occasional promotions and celebration offers. I can unsubscribe anytime.</span></label><button className="button button-dark" type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Send request'} <span>↗</span></button>{success ? <div className="tracking-success"><span>Request received</span><strong>{formatLkr(success.totalPrice)}</strong><p>Your order is pending. Use your email address in the order lookup below to view its details and status.</p></div> : null}{error ? <p className="form-error">{error}</p> : null}</form></div></section>
}

function RequestTracker() {
  const [email, setEmail] = useState('')
  const [orders, setOrders] = useState<ServiceRequest[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setError(null); setOrders([]); setSearched(false); try { setOrders(await api.ordersByEmail(email.trim())); setSearched(true) } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to find orders for this email address.') } }
  return <section className="request-tracker"><div className="container tracker-layout"><div><p className="eyebrow">Already requested something?</p><h2>Find your <em>orders.</em></h2><p>Enter the email address used for your service or hire request to see all order details and the latest status.</p></div><div><form className="tracker-form" onSubmit={submit}><label htmlFor="order-email">Email address</label><div><input id="order-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@example.com" /><button type="submit">Find orders</button></div></form>{searched && !orders.length ? <p className="order-empty">No orders were found for this email address yet.</p> : null}{orders.length ? <div className="order-results">{orders.map((order) => <article className="tracked-request" key={order._id}><span className={`request-status ${order.status}`}>{order.status}</span><div><strong>{order.offeringName}</strong><p>{order.type === 'hire' ? `${order.hireDays} day${order.hireDays === 1 ? '' : 's'} · ` : ''}{formatLkr(order.totalPrice)}{order.eventDate ? ` · ${new Date(order.eventDate).toLocaleDateString()}` : ''}</p>{order.promotionTitle ? <small>{order.promotionTitle} · saved {formatLkr(order.discountAmount)}</small> : null}</div></article>)}</div> : null}{error ? <p className="form-error">{error}</p> : null}</div></div></section>
}

export function PromotionsPage() { const [promotions, setPromotions] = useState<Promotion[]>([]); useEffect(() => { api.promotions().then(setPromotions).catch(() => undefined) }, []); return <><PageHero eyebrow="Cotton Candy offers" className="page-hero-promotions" title={<>A little extra<br /><em>to celebrate.</em></>} /><section className="promotions-page container">{promotions.length ? promotions.map((promotion) => <article className="promotion-card" key={promotion._id}><picture><source media="(max-width: 700px)" srcSet={promotion.mobileImageUrl} /><img src={promotion.desktopImageUrl} alt={promotion.title} /></picture><div><p className="eyebrow">{promotion.discountPercent ? `Save ${promotion.discountPercent}% on ${promotion.appliesTo === 'all' ? 'services & hire' : `${promotion.appliesTo} items`}` : 'Special promotion'}</p><h2>{promotion.title}</h2><p>{promotion.description}</p><Link className="button button-dark" to="/services-hire">Choose this offer <span>↗</span></Link></div></article>) : <div className="empty-state">There are no current promotions. Follow along for the next sweet offer.</div>}</section></> }

function GalleryVideo({ asset }: { asset: MediaAsset }) {
  if (asset.source === 'youtube') return <iframe src={asset.url} title={asset.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />
  return <video controls preload="metadata" src={asset.url} aria-label={asset.title} />
}

export function GalleryPage({ kind }: { kind: 'image' | 'video' }) {
  const [media, setMedia] = useState<MediaAsset[]>([])
  useEffect(() => { api.media(kind).then(setMedia).catch(() => undefined) }, [kind])
  return <><PageHero eyebrow="Our little world of pretty" className="page-hero-gallery" title={kind === 'image' ? <>Moments made to<br /><em>be remembered.</em></> : <>See the <em>magic</em><br />come to life.</>} /><section className="gallery-page container"><div className="gallery-switch"><Link className={kind === 'image' ? 'active' : ''} to="/gallery/images">Images</Link><Link className={kind === 'video' ? 'active' : ''} to="/gallery/videos">Videos</Link></div>{media.length ? <div className={`masonry-gallery ${kind === 'video' ? 'video-gallery' : ''}`}>{media.map((asset, index) => <figure className={`gallery-item${kind === 'image' && index % 3 === 0 ? ' tall' : ''}`} key={asset._id}>{kind === 'video' ? <GalleryVideo asset={asset} /> : <img src={asset.url} alt={asset.title} />}<figcaption>{asset.title}</figcaption></figure>)}</div> : <p className="empty-state">Our celebration videos are coming soon.</p>}</section></>
}

export function ContactPage() { const [status, setStatus] = useState<string | null>(null); const [error, setError] = useState<string | null>(null); const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setStatus(null); setError(null); const values = Object.fromEntries(new FormData(event.currentTarget)); try { await api.sendEnquiry(values); event.currentTarget.reset(); setStatus('Thank you! Your message has been sent to our team.') } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to send your message.') } }; return <><section className="contact-page container"><div className="contact-intro"><p className="eyebrow">Let’s make magic</p><h1>Tell us what<br />you’re <em>celebrating.</em></h1><p>We cannot wait to hear your ideas. Fill out the form and our team will be in touch within 2–3 business days.</p><div className="contact-details"><a href="mailto:hello@cottoncandyeventdeco.com">hello@cottoncandyeventdeco.com</a><p>Melbourne, Victoria<br />Available across the greater Melbourne area</p></div></div><form className="enquiry-form" onSubmit={submit}><div className="field-row"><label>First name<input name="firstName" required placeholder="Your first name" /></label><label>Last name<input name="lastName" required placeholder="Your last name" /></label></div><label>Email address<input type="email" name="email" required placeholder="you@example.com" /></label><label>Phone number<input type="tel" name="phone" placeholder="Your best contact number" /></label><div className="field-row"><label>Event type<select name="eventType" defaultValue=""><option value="">Select an event</option><option>Wedding</option><option>Birthday</option><option>Baby shower</option><option>Corporate event</option><option>Other celebration</option></select></label><label>Event date<input type="date" name="eventDate" /></label></div><label>How can we help?<textarea name="message" required placeholder="Tell us a little about your event, style, guest count and the magic you have in mind." /></label><button className="button button-dark" type="submit">Send my enquiry <span>↗</span></button>{status ? <p className="form-success">{status}</p> : null}{error ? <p className="form-error">{error}</p> : null}</form></section><section className="contact-bottom pink-wash"><div className="container"><p className="eyebrow">Already have your date?</p><h2>It starts with a <em>hello.</em></h2><p>For styling and custom balloon work, we suggest enquiring early to secure your date.</p></div></section></> }
