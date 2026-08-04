import { useEffect, useState, type PointerEvent, type ReactNode } from 'react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { api, type Promotion } from '../lib/api'
import { useAuth } from '../lib/useAuth'

type Bloom = { id: number; x: number; y: number }

export function SiteLayout() {
  const [open, setOpen] = useState(false)
  const [blooms, setBlooms] = useState<Bloom[]>([])
  useEffect(() => { document.body.classList.add('loaded') }, [])
  useEffect(() => { document.body.classList.toggle('menu-open', open); return () => document.body.classList.remove('menu-open') }, [open])
  const closeMenu = () => setOpen(false)
  const bloom = (event: PointerEvent<HTMLDivElement>) => {
    const id = Date.now() + Math.random()
    setBlooms((current) => [...current, { id, x: event.clientX, y: event.clientY }])
    window.setTimeout(() => setBlooms((current) => current.filter((item) => item.id !== id)), 730)
  }
  return <div className="app-root" onPointerDown={bloom}>
    <div className="site-loader" aria-label="Loading Cotton Candy"><div className="loader-orbit loader-orbit-one" /><div className="loader-orbit loader-orbit-two" /><span className="loader-mark">CC</span><p>Making it pretty…</p></div>
    <header className="site-header"><div className="container nav-wrap"><NavLink className="brand" to="/" onClick={closeMenu} aria-label="Cotton Candy home"><span className="brand-mark">C</span><span>Cotton<br /><em>Candy</em></span></NavLink>{open ? <button className="mobile-nav-backdrop" type="button" aria-label="Close navigation" onClick={closeMenu} /> : null}<button className="mobile-menu-button" type="button" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} onClick={() => setOpen((value) => !value)}><span /><span /></button><nav className={`site-nav${open ? ' open' : ''}`} aria-label="Main navigation"><NavLink to="/" end onClick={closeMenu}>Home</NavLink><NavLink to="/about" onClick={closeMenu}>About</NavLink><NavDropdown label="Bookings" to="/services-hire" closeMenu={closeMenu} items={[['/services', 'Services'], ['/hire', 'Hire collection']]} /><NavLink to="/promotions" onClick={closeMenu}>Promotions</NavLink><NavDropdown label="Gallery" to="/gallery/images" closeMenu={closeMenu} items={[['/gallery/images', 'Images'], ['/gallery/videos', 'Videos']]} /><NavLink to="/contact" onClick={closeMenu}>Contact</NavLink></nav></div></header>
    <main className="site-main"><Outlet /></main><SiteMotionEffects /><SiteFooter /><PromotionOverlay /><ScrollTopButton />{blooms.map((item) => <span className="click-bloom" key={item.id} style={{ left: item.x, top: item.y }} aria-hidden="true">✿</span>)}</div>
}

function SiteMotionEffects() {
  const { pathname } = useLocation()
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const revealTargets = Array.from(document.querySelectorAll<HTMLElement>('.site-main > section:not(.hero), .site-main .collection-choice > a, .site-main .offering-card, .site-main .value-card, .site-main .promotion-card, .site-main .gallery-item, .site-main .contact-page > *'))
      revealTargets.forEach((target, index) => { target.classList.add('scroll-reveal'); target.style.setProperty('--reveal-delay', `${index % 4 * 75}ms`) })
      const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target) } }), { rootMargin: '0px 0px -9% 0px', threshold: .08 })
      revealTargets.forEach((target) => observer.observe(target))

      const card = document.querySelector<HTMLElement>('.intro-copy')
      if (!card) return () => observer.disconnect()
      card.classList.add('has-balloon-garland')
      const layer = document.createElement('div')
      layer.className = 'intro-balloon-layer'
      layer.setAttribute('aria-hidden', 'true')
      const balloons = [
        ['4%', '-68px', '64px', '#efa0b5', '5.3s', '-1.4s', '7px', '-11px', '-9deg'], ['19%', '-87px', '73px', '#f1d36d', '4.5s', '-.7s', '-6px', '-14px', '8deg'], ['36%', '-63px', '62px', '#9dd4c4', '5.8s', '-2.1s', '8px', '-8px', '-6deg'], ['54%', '-91px', '76px', '#bd9cd5', '4.9s', '-.3s', '-7px', '-13px', '9deg'], ['72%', '-64px', '65px', '#f2a47e', '5.6s', '-1.8s', '7px', '-10px', '-7deg'], ['90%', '-84px', '70px', '#eca0b6', '4.7s', '-1s', '-6px', '-12px', '8deg'], ['-72px', '74px', '70px', '#f1d36d', '5.1s', '-.6s', '-8px', '-7px', '-10deg'], ['-91px', '146px', '64px', '#efa0b5', '4.4s', '-1.9s', '7px', '-11px', '8deg'], ['-72px', '225px', '73px', '#9dd4c4', '5.7s', '-.2s', '-8px', '-10px', '-8deg'], ['-89px', '309px', '65px', '#bd9cd5', '4.8s', '-1.3s', '7px', '-7px', '9deg'], ['-70px', '388px', '68px', '#f2a47e', '5.4s', '-2.2s', '-8px', '-12px', '-7deg'],
      ]
      balloons.forEach(([left, top, size, color, duration, delay, driftX, driftY, rotation]) => {
        const balloon = document.createElement('span')
        balloon.className = 'intro-card-balloon'
        balloon.style.setProperty('--balloon-left', left)
        balloon.style.setProperty('--balloon-top', top)
        balloon.style.setProperty('--balloon-size', size)
        balloon.style.setProperty('--balloon-colour', color)
        balloon.style.setProperty('--balloon-duration', duration)
        balloon.style.setProperty('--balloon-delay', delay)
        balloon.style.setProperty('--balloon-drift-x', driftX)
        balloon.style.setProperty('--balloon-drift-y', driftY)
        balloon.style.setProperty('--balloon-rotation', rotation)
        layer.appendChild(balloon)
      })
      card.appendChild(layer)

      const footerInvitation = document.querySelector<HTMLElement>('.footer-invitation')
      if (footerInvitation && !footerInvitation.querySelector('.footer-balloon-cover')) {
        const cover = document.createElement('div')
        cover.className = 'footer-balloon-cover'
        cover.setAttribute('aria-hidden', 'true')
        const colours = ['#ef9eb5', '#f1d36d', '#9fd5c5', '#bfa0d6', '#f2a57f', '#eea3b8']
        Array.from({ length: 28 }, (_, index) => {
          const column = index % 7
          const row = Math.floor(index / 7)
          const balloon = document.createElement('span')
          balloon.className = 'footer-cover-balloon'
          balloon.style.setProperty('--footer-balloon-x', `${4 + column * 15 + ((index * 7) % 9 - 4)}%`)
          balloon.style.setProperty('--footer-balloon-y', `${5 + row * 25 + ((index * 11) % 8 - 4)}%`)
          balloon.style.setProperty('--footer-balloon-size', `${72 + (index * 9) % 17}px`)
          balloon.style.setProperty('--footer-balloon-colour', colours[index % colours.length])
          balloon.style.setProperty('--footer-balloon-rotate', `${-12 + (index * 13) % 25}deg`)
          balloon.style.setProperty('--footer-balloon-delay', `${-(index % 6) * .23}s`)
          cover.appendChild(balloon)
        })
        const scatter = (event: globalThis.PointerEvent) => {
          const bounds = cover.getBoundingClientRect()
          cover.querySelectorAll<HTMLElement>('.footer-cover-balloon').forEach((balloon) => {
            const x = bounds.left + bounds.width * Number.parseFloat(balloon.style.getPropertyValue('--footer-balloon-x')) / 100
            const y = bounds.top + bounds.height * Number.parseFloat(balloon.style.getPropertyValue('--footer-balloon-y')) / 100
            const distance = Math.hypot(x - event.clientX, y - event.clientY) || 1
            const strength = 120 + Math.max(0, 1 - distance / 430) ** 1.8 * 165
            balloon.style.setProperty('--footer-scatter-x', `${(x - event.clientX) / distance * strength}px`)
            balloon.style.setProperty('--footer-scatter-y', `${(y - event.clientY) / distance * strength}px`)
          })
        }
        const settle = () => cover.querySelectorAll<HTMLElement>('.footer-cover-balloon').forEach((balloon) => { balloon.style.setProperty('--footer-scatter-x', '0px'); balloon.style.setProperty('--footer-scatter-y', '0px') })
        footerInvitation.addEventListener('pointermove', scatter)
        footerInvitation.addEventListener('pointerleave', settle)
        footerInvitation.appendChild(cover)
      }

      const footer = document.querySelector<HTMLElement>('.site-footer')
      if (footer && !footer.dataset.lightTracking && window.matchMedia('(pointer: fine)').matches) {
        footer.dataset.lightTracking = 'true'
        footer.addEventListener('pointermove', (event: globalThis.PointerEvent) => {
          const bounds = footer.getBoundingClientRect()
          footer.style.setProperty('--footer-light-x', `${(event.clientX - bounds.left) / bounds.width * 100}%`)
          footer.style.setProperty('--footer-light-y', `${(event.clientY - bounds.top) / bounds.height * 100}%`)
        })
        footer.addEventListener('pointerleave', () => {
          footer.style.setProperty('--footer-light-x', '50%')
          footer.style.setProperty('--footer-light-y', '50%')
        })
      }
      return () => { observer.disconnect(); layer.remove(); card.classList.remove('has-balloon-garland') }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [pathname])
  return null
}

function NavDropdown({ label, to, closeMenu, items }: { label: string; to: string; closeMenu: () => void; items: Array<[string, string]> }) {
  const [isOpen, setIsOpen] = useState(false)
  const { pathname } = useLocation()
  const closeDropdown = () => { setIsOpen(false); closeMenu() }

  useEffect(() => { setIsOpen(false) }, [pathname])

  return <div className={`nav-dropdown${isOpen ? ' is-open' : ''}`} onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)} onFocus={() => setIsOpen(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsOpen(false) }}><NavLink to={to} onClick={closeDropdown}>{label} <span className="dropdown-mark">⌄</span></NavLink><div className="nav-submenu">{items.map(([path, name]) => <NavLink key={path} to={path} onClick={closeDropdown}>{name}<span>→</span></NavLink>)}</div></div>
}

function PromotionOverlay() {
  const [promotion, setPromotion] = useState<Promotion | null>(null)
  const [closed, setClosed] = useState(false)
  useEffect(() => { let live = true; api.featuredPromotion().then((item) => { if (live) setPromotion(item) }).catch(() => undefined); return () => { live = false } }, [])
  if (!promotion || closed) return null
  return <aside className="promotion-overlay" role="dialog" aria-modal="true" aria-label="Current promotion"><button className="promotion-close" type="button" onClick={() => setClosed(true)} aria-label="Close promotion">×</button><picture><source media="(max-width: 700px)" srcSet={promotion.mobileImageUrl} /><img src={promotion.desktopImageUrl} alt={promotion.title} /></picture><div className="promotion-overlay-copy"><p className="eyebrow">Special promotion</p><h2>{promotion.title}</h2><p>{promotion.description}</p></div></aside>
}

function ScrollTopButton() {
  const [visible, setVisible] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => { const update = () => setVisible(window.scrollY > 440); window.addEventListener('scroll', update, { passive: true }); update(); return () => window.removeEventListener('scroll', update) }, [])
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }) }, [pathname])
  if (!visible) return null
  return <button className="scroll-top" type="button" aria-label="Scroll to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑</button>
}

function SiteFooter() {
  return <footer className="site-footer"><section className="footer-invitation"><div className="footer-spark footer-spark-one">✦</div><div className="footer-spark footer-spark-two">✦</div><div className="footer-invitation-inner container"><p className="eyebrow">Your sweetest celebration starts here</p><h2>Let’s make your next<br /><em>moment unforgettable.</em></h2><NavLink className="button button-dark" to="/contact">Start your enquiry <span>↗</span></NavLink></div></section><div className="footer-top container"><div className="footer-brand"><NavLink className="brand" to="/"><span className="brand-mark">C</span><span>Cotton<br /><em>Candy</em></span></NavLink><p>Creating sweet, considered celebrations across Melbourne.</p><div className="social-links" aria-label="Follow Cotton Candy Event Deco"><a href="https://www.youtube.com/@cottoncandyeventdeco" target="_blank" rel="noreferrer" aria-label="YouTube"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.4 7.2a2.8 2.8 0 0 0-2-2C17.7 4.8 12 4.8 12 4.8s-5.7 0-7.4.4a2.8 2.8 0 0 0-2 2C2.2 9 2.2 12 2.2 12s0 3 .4 4.8a2.8 2.8 0 0 0 2 2c1.7.4 7.4.4 7.4.4s5.7 0 7.4-.4a2.8 2.8 0 0 0 2-2c.4-1.8.4-4.8.4-4.8s0-3-.4-4.8ZM9.7 15.1V8.9l5.3 3.1-5.3 3.1Z" /></svg></a><a href="https://www.tiktok.com/@cotton_candy_deco" target="_blank" rel="noreferrer" aria-label="TikTok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.2 3c.3 2.2 1.5 3.7 3.7 4v3.1a7.2 7.2 0 0 1-3.7-1.2v6.6a5.6 5.6 0 1 1-4.8-5.5v3.1a2.5 2.5 0 1 0 1.7 2.4V3h3.1Z" /></svg></a><a href="https://www.facebook.com/CottonCandyEventDeco/" target="_blank" rel="noreferrer" aria-label="Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.8 21v-8h2.7l.4-3.1h-3.1V8c0-.9.3-1.5 1.6-1.5H17V3.7c-.4-.1-1.3-.2-2.4-.2-2.4 0-4.1 1.5-4.1 4.2v2.2H7.8V13h2.7v8h3.3Z" /></svg></a><a href="https://www.instagram.com/cottoncandy_event_deco/" target="_blank" rel="noreferrer" aria-label="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.5" /><circle cx="12" cy="12" r="4" /><circle cx="17.4" cy="6.7" r="1" className="social-dot" /></svg></a></div></div><div><p className="footer-heading">Explore</p><NavLink to="/about">About us</NavLink><NavLink to="/services">Services</NavLink><NavLink to="/hire">Hire collection</NavLink><NavLink to="/promotions">Promotions</NavLink></div><div><p className="footer-heading">More magic</p><NavLink to="/gallery/images">Gallery images</NavLink><NavLink to="/gallery/videos">Gallery videos</NavLink><NavLink to="/services-hire">Track a request</NavLink><NavLink to="/contact">Make an enquiry</NavLink></div><div className="footer-newsletter"><p className="footer-heading">A little bit of pretty</p><p>Occasional inspiration, new pieces and sweet event ideas.</p><NewsletterForm /></div></div><div className="footer-bottom container"><p>© 2026 Cotton Candy Event Deco</p><div><a href="/">Privacy</a><a href="/">Terms</a></div><p>Developed by <a href="https://sites-nap.vercel.app/" target="_blank" rel="noreferrer">Sitesnap</a></p></div></footer>
}

function NewsletterForm() { const [complete, setComplete] = useState(false); return <form className="newsletter-form" onSubmit={(event) => { event.preventDefault(); setComplete(true) }}><input type="email" aria-label="Email address" placeholder={complete ? 'You’re on the pretty list!' : 'Your email address'} required /><button aria-label="Subscribe" type="submit">→</button></form> }

export function ProtectedAdmin({ children }: { children: ReactNode }) { const { user } = useAuth(); if (!user || user.role !== 'admin') return <Navigate to="/manage-cotton-candy/sign-in" replace />; return <>{children}</> }
