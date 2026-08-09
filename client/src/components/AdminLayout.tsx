import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/useAuth'
import { AdminAppInstall } from './AdminAppInstall'
import { AdminPushRegistration, storedAdminPushToken } from './AdminPushRegistration'

const adminLinks = [
  ['', 'Overview', '⌂'], ['services', 'Services', '✦'], ['hire', 'Hire collection', '◇'], ['categories', 'Categories', '▦'],
  ['requests', 'Service requests', '◫'], ['active-orders', 'Active orders', '◉'], ['order-history', 'Order history', '◷'], ['order-notifications', 'Order notifications', '◌'], ['messages', 'Contact messages', '✉'], ['newsletter-subscribers', 'Newsletter subscribers', '✧'], ['gallery/images', 'Gallery images', '▧'],
  ['gallery/videos', 'Gallery videos', '▶'], ['promotions', 'Promotions', '♡'], ['home-content', 'Home content', '◌'], ['page-artwork', 'Page artwork', '✦'],
] as const

const websiteUrl = import.meta.env.VITE_WEBSITE_URL || 'https://cottoncandydeco.com.au'

export function AdminLayout() {
  const [open, setOpen] = useState(false)
  const { signOut, token } = useAuth()
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.body.classList.toggle('admin-menu-open', open)
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.classList.remove('admin-menu-open')
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const handleSignOut = () => {
    const deviceToken = storedAdminPushToken()
    if (token && deviceToken) void api.unregisterAdminPushDevice(token, deviceToken)
    localStorage.removeItem('cotton-candy-admin-push-token-v1')
    signOut()
  }

  return <div className="admin-workspace">
    <AdminPushRegistration />
    {open ? <button className="admin-menu-backdrop" type="button" aria-label="Close admin menu" onClick={() => setOpen(false)} /> : null}
    <aside className={`admin-sidebar admin-sidebar-new${open ? ' open' : ''}`}>
      <button className="admin-menu-close" type="button" onClick={() => setOpen(false)}>Close</button>
      <Link className="brand" to="/manage-cotton-candy"><span className="brand-mark">C</span><span>Cotton<br /><em>Candy</em><b>CONTENT STUDIO</b></span></Link>
      <nav id="admin-navigation" className="admin-nav admin-nav-new">
        {adminLinks.map(([path, label, icon]) => <NavLink end={!path} key={path || 'overview'} to={path ? `/manage-cotton-candy/${path}` : '/manage-cotton-candy'} onClick={() => setOpen(false)}><span>{icon}</span>{label}</NavLink>)}
      </nav>
      <div className="admin-sidebar-bottom"><AdminAppInstall /><a href={websiteUrl} target="_blank" rel="noreferrer">↗ View website</a><button type="button" onClick={handleSignOut}>Log out</button></div>
    </aside>
    <main className="admin-main admin-main-new"><header className="admin-topbar"><button type="button" className="admin-menu-toggle" aria-controls="admin-navigation" aria-expanded={open} aria-label={open ? 'Close admin menu' : 'Open admin menu'} onClick={() => setOpen((value) => !value)}>☰</button><div><p>Private management space</p><strong>Cotton Candy Event Deco</strong></div><a href={websiteUrl} target="_blank" rel="noreferrer">View website ↗</a></header><Outlet /></main>
  </div>
}
