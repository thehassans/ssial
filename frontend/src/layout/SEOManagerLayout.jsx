import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'

export default function SEOManagerLayout() {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('me')
    navigate('/login')
  }

  const navItems = [
    { path: '/seo', label: 'Dashboard', icon: '📊', exact: true },
    { path: '/seo/meta-tags', label: 'Meta Tags', icon: '🏷️' },
    { path: '/seo/pixels', label: 'Tracking Pixels', icon: '🎯' },
    { path: '/seo/analytics', label: 'Analytics', icon: '📈' },
    { path: '/seo/countries', label: 'Country SEO', icon: '🌍' },
    { path: '/seo/products', label: 'Product SEO', icon: '📦' },
    { path: '/seo/schema', label: 'Schema', icon: '🔗' },
    { path: '/seo/advanced', label: 'Advanced', icon: '⚙️' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 64 : 240,
        background: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)',
        transition: 'width 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? 16 : 20,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>🎯</span>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>SEO Panel</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 8,
              padding: 8,
              cursor: 'pointer',
              color: 'white',
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"} />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 8px' }}>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: collapsed ? '12px' : '12px 16px',
                marginBottom: 4,
                borderRadius: 8,
                textDecoration: 'none',
                color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.2s',
                justifyContent: collapsed ? 'center' : 'flex-start',
              })}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              {!collapsed && <span style={{ fontWeight: 500 }}>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: collapsed ? '12px' : '12px 16px',
              borderRadius: 8,
              border: 'none',
              background: 'rgba(239,68,68,0.2)',
              color: '#fca5a5',
              cursor: 'pointer',
              justifyContent: collapsed ? 'center' : 'flex-start',
              fontWeight: 500,
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
