import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/useAuth'

const adminLinks = [
  ['', 'Overview', '⌂'], ['services', 'Services', '✦'], ['hire', 'Hire collection', '◇'], ['categories', 'Categories', '▦'],
  ['requests', 'Service requests', '◫'], ['order-history', 'Order history', '◷'], ['messages', 'Contact messages', '✉'], ['gallery/images', 'Gallery images', '▧'],
  ['gallery/videos', 'Gallery videos', '▶'], ['promotions', 'Promotions', '♡'], ['home-content', 'Home content', '◌'],
] as const

export function AdminLayout() {
  const [open, setOpen] = useState(false)
  const { signOut } = useAuth()
  useEffect(() => { document.body.classList.toggle('admin-menu-open', open); return () => document.body.classList.remove('admin-menu-open') }, [open])
  return <div className="admin-workspace"><aside className={`admin-sidebar admin-sidebar-new${open ? ' open' : ''}`}><Link className="brand" to="/manage-cotton-candy"><span className="brand-mark">C</span><span>Cotton<br /><em>Candy</em><b>CONTENT STUDIO</b></span></Link><nav className="admin-nav admin-nav-new">{adminLinks.map(([path, label, icon]) => <NavLink end={!path} key={path || 'overview'} to={path ? `/manage-cotton-candy/${path}` : '/manage-cotton-candy'} onClick={() => setOpen(false)}><span>{icon}</span>{label}</NavLink>)}</nav><div className="admin-sidebar-bottom"><Link to="/" target="_blank">↗ View website</Link><button type="button" onClick={signOut}>→ Log out</button></div></aside><main className="admin-main admin-main-new"><header className="admin-topbar"><button type="button" className="admin-menu-toggle" aria-label="Open admin menu" onClick={() => setOpen((value) => !value)}>☰</button><div><p>Private management space</p><strong>Cotton Candy Event Deco</strong></div><Link to="/" target="_blank">View website ↗</Link></header><Outlet /></main></div>
}
