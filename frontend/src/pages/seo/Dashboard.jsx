import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiGet, apiPost } from '../../api'
import { useToast } from '../../ui/Toast'

// Premium Minimalistic Icons
const Icons = {
  overview: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  meta: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
    </svg>
  ),
  pixels: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21.17" y1="8" x2="12" y2="8"/><line x1="3.95" y1="6.06" x2="8.54" y2="14"/><line x1="10.88" y1="21.94" x2="15.46" y2="14"/>
    </svg>
  ),
  analytics: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  globe: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  product: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  schema: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
  settings: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  x: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  search: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  events: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  thankYou: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  tiktok: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  ),
}

// Premium Design Tokens
const theme = {
  colors: {
    bg: '#fafafa',
    card: '#ffffff',
    border: '#f0f0f0',
    borderHover: '#e0e0e0',
    text: '#111111',
    textSecondary: '#666666',
    textMuted: '#999999',
    primary: '#000000',
    primaryHover: '#333333',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    accent: '#6366f1',
  },
  radius: {
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '20px',
  },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.04)',
    md: '0 4px 12px rgba(0,0,0,0.05)',
    lg: '0 8px 30px rgba(0,0,0,0.08)',
  },
}

export default function SEODashboard() {
  const toast = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const getTabFromPath = (pathname) => {
    if (pathname.includes('meta-tags')) return 'meta'
    if (pathname.includes('pixels')) return 'pixels'
    if (pathname.includes('events')) return 'events'
    if (pathname.includes('thank-you')) return 'thankyou'
    if (pathname.includes('analytics')) return 'analytics'
    if (pathname.includes('countries')) return 'countries'
    if (pathname.includes('products')) return 'products'
    if (pathname.includes('schema')) return 'schema'
    if (pathname.includes('advanced')) return 'advanced'
    return 'overview'
  }
  
  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname))
  const [products, setProducts] = useState([])
  const [countries, setCountries] = useState([])
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productSearch, setProductSearch] = useState('')
  const [countrySeo, setCountrySeo] = useState({})
  const [productSeo, setProductSeo] = useState({})
  const [seoStats, setSeoStats] = useState({
    totalProducts: 0,
    productsWithSeo: 0,
    countriesConfigured: 0,
    pixelsActive: 0,
  })
  const [seo, setSeo] = useState({
    siteTitle: '',
    siteDescription: '',
    keywords: '',
    ogImage: '',
    twitterCard: 'summary_large_image',
    googleAnalytics: '',
    googleTagManager: '',
    facebookPixel: '',
    tiktokPixel: '',
    snapchatPixel: '',
    pinterestTag: '',
    twitterPixel: '',
    linkedinTag: '',
    hotjarId: '',
    clarityId: '',
    customHeadCode: '',
    customBodyCode: '',
    robotsTxt: '',
    structuredData: true,
    canonicalUrl: '',
    noIndex: false,
    noFollow: false,
    hreflangTags: [],
    schemaType: 'WebSite',
    localBusiness: {},
    breadcrumbs: true,
    sitemapPriority: '1.0',
    sitemapFrequency: 'daily',
    // TikTok Event Tracking
    tiktokEvents: {
      pageView: true,
      viewContent: true,
      addToCart: true,
      initiateCheckout: true,
      completePayment: true,
      search: true,
      addToWishlist: true,
      contact: false,
      submitForm: false,
      subscribe: false,
    },
    // Thank You Page Settings
    thankYouPage: {
      enabled: true,
      path: '/thank-you',
      trackPurchase: true,
      trackValue: true,
      customTitle: 'Thank You for Your Order!',
      customMessage: 'Your order has been placed successfully.',
      showOrderDetails: true,
      redirectAfter: 0,
      redirectUrl: '',
      conversionPixels: {
        tiktok: true,
        facebook: true,
        snapchat: true,
        pinterest: true,
        google: true,
      },
    },
  })

  // Sync tab with URL path when location changes
  useEffect(() => {
    const tabFromPath = getTabFromPath(location.pathname)
    if (tabFromPath !== activeTab) {
      setActiveTab(tabFromPath)
    }
  }, [location.pathname])

  useEffect(() => {
    loadAllData()
  }, [])

  async function loadAllData() {
    try {
      setLoading(true)
      const [seoRes, productsRes, countriesRes, countrySeoRes] = await Promise.all([
        apiGet('/api/settings/seo'),
        apiGet('/api/products/public?limit=500').catch(() => ({ products: [] })),
        apiGet('/api/settings/countries').catch(() => ({ countries: [] })),
        apiGet('/api/settings/country-seo').catch(() => ({ countrySeo: {} })),
      ])
      
      if (seoRes.seo) {
        setSeo(prev => ({ ...prev, ...seoRes.seo }))
      }
      
      const prods = productsRes.products || []
      setProducts(prods)
      
      const ctrs = countriesRes.countries || [
        'Saudi Arabia', 'UAE', 'Kuwait', 'Qatar', 'Bahrain', 'Oman'
      ]
      setCountries(Array.isArray(ctrs) ? ctrs : Object.keys(ctrs))
      
      if (countrySeoRes.countrySeo) {
        setCountrySeo(countrySeoRes.countrySeo)
      }
      
      // Calculate stats
      const pixelCount = [seoRes.seo?.facebookPixel, seoRes.seo?.tiktokPixel, seoRes.seo?.snapchatPixel, 
        seoRes.seo?.pinterestTag, seoRes.seo?.twitterPixel, seoRes.seo?.linkedinTag,
        seoRes.seo?.googleAnalytics, seoRes.seo?.googleTagManager].filter(Boolean).length
      
      setSeoStats({
        totalProducts: prods.length,
        productsWithSeo: prods.filter(p => p.seoTitle || p.seoDescription).length,
        countriesConfigured: Object.keys(countrySeoRes.countrySeo || {}).length,
        pixelsActive: pixelCount,
      })
    } catch (err) {
      toast.error('Failed to load SEO settings')
    } finally {
      setLoading(false)
    }
  }

  async function loadSEOSettings() {
    try {
      const res = await apiGet('/api/settings/seo')
      if (res.seo) {
        setSeo(prev => ({ ...prev, ...res.seo }))
      }
    } catch (err) {
      toast.error('Failed to load SEO settings')
    }
  }

  async function handleSave() {
    try {
      setSaving(true)
      await apiPost('/api/settings/seo', seo)
      toast.success('SEO settings saved successfully')
    } catch (err) {
      toast.error(err?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Icons.overview },
    { id: 'meta', label: 'Meta Tags', icon: Icons.meta },
    { id: 'countries', label: 'Country SEO', icon: Icons.globe },
    { id: 'events', label: 'Event Tracking', icon: Icons.events },
    { id: 'thankyou', label: 'Thank You', icon: Icons.thankYou },
    { id: 'analytics', label: 'Analytics', icon: Icons.analytics },
    { id: 'products', label: 'Product SEO', icon: Icons.product },
    { id: 'schema', label: 'Schema', icon: Icons.schema },
    { id: 'advanced', label: 'Advanced', icon: Icons.settings },
  ]

  async function saveCountrySeo(country, data) {
    try {
      setSaving(true)
      const updated = { ...countrySeo, [country]: data }
      await apiPost('/api/settings/country-seo', { countrySeo: updated })
      setCountrySeo(updated)
      toast.success(`SEO settings saved for ${country}`)
    } catch (err) {
      toast.error('Failed to save country SEO')
    } finally {
      setSaving(false)
    }
  }

  async function saveProductSeo(productId, data) {
    try {
      setSaving(true)
      await apiPost(`/api/products/${productId}/seo`, data)
      toast.success('Product SEO saved successfully')
      // Update local state
      setProducts(prev => prev.map(p => 
        p._id === productId ? { ...p, ...data } : p
      ))
    } catch (err) {
      toast.error('Failed to save product SEO')
    } finally {
      setSaving(false)
    }
  }

  const filteredProducts = products.filter(p => 
    !productSearch || 
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  )

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    fontSize: '14px',
    fontWeight: 400,
    color: theme.colors.text,
    background: theme.colors.card,
    transition: 'all 0.2s ease',
    outline: 'none',
  }

  const labelStyle = {
    display: 'block',
    marginBottom: '10px',
    fontWeight: 500,
    color: theme.colors.text,
    fontSize: '13px',
    letterSpacing: '-0.01em',
  }

  const helpTextStyle = {
    fontSize: '12px',
    color: theme.colors.textMuted,
    marginTop: '8px',
    lineHeight: 1.5,
  }

  const cardStyle = {
    background: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: '28px',
    border: `1px solid ${theme.colors.border}`,
    marginBottom: '20px',
    boxShadow: theme.shadow.sm,
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: theme.colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: 40, height: 40, 
            border: `2px solid ${theme.colors.border}`,
            borderTopColor: theme.colors.text,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px'
          }}/>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ color: theme.colors.textSecondary, fontSize: 14, fontWeight: 500 }}>Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: theme.colors.bg }}>
      {/* Premium Header */}
      <div style={{ 
        background: theme.colors.card,
        borderBottom: `1px solid ${theme.colors.border}`,
        padding: '32px 40px',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: '28px', 
            fontWeight: 600, 
            color: theme.colors.text,
            letterSpacing: '-0.02em'
          }}>
            SEO Settings
          </h1>
          <p style={{ 
            margin: '8px 0 0', 
            color: theme.colors.textSecondary,
            fontSize: '14px'
          }}>
            Manage meta tags, tracking pixels, and search optimization
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 40px' }}>
        {/* Premium Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '4px', 
          marginBottom: '32px',
          background: theme.colors.card,
          padding: '6px',
          borderRadius: theme.radius.lg,
          border: `1px solid ${theme.colors.border}`,
          overflowX: 'auto',
          boxShadow: theme.shadow.sm,
        }}>
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 18px',
                  border: 'none',
                  borderRadius: theme.radius.md,
                  background: activeTab === tab.id ? theme.colors.text : 'transparent',
                  color: activeTab === tab.id ? '#fff' : theme.colors.textSecondary,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  fontSize: '13px',
                }}
              >
                <Icon />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Premium Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
              {[
                { value: seoStats.pixelsActive, label: 'Active Pixels', color: theme.colors.text },
                { value: seoStats.countriesConfigured, label: 'Countries', color: theme.colors.success },
                { value: `${seoStats.productsWithSeo}/${seoStats.totalProducts}`, label: 'Products with SEO', color: theme.colors.warning },
                { value: seo.structuredData ? '✓' : '—', label: 'Schema', color: theme.colors.accent },
              ].map((stat, i) => (
                <div key={i} style={{
                  ...cardStyle,
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}>
                  <div style={{ 
                    fontSize: '32px', 
                    fontWeight: 600, 
                    color: stat.color,
                    letterSpacing: '-0.02em'
                  }}>{stat.value}</div>
                  <div style={{ 
                    fontSize: '13px',
                    color: theme.colors.textSecondary,
                    fontWeight: 500
                  }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* SEO Health Check */}
            <div style={cardStyle}>
              <h3 style={{ 
                margin: '0 0 24px', 
                color: theme.colors.text, 
                fontSize: '16px', 
                fontWeight: 600,
                letterSpacing: '-0.01em'
              }}>
                Health Check
              </h3>
              <div style={{ display: 'grid', gap: '8px' }}>
                {[
                  { label: 'Site Title', status: seo.siteTitle ? 'configured' : 'missing' },
                  { label: 'Site Description', status: seo.siteDescription ? 'configured' : 'missing' },
                  { label: 'Google Analytics', status: seo.googleAnalytics ? 'configured' : 'missing' },
                  { label: 'Facebook Pixel', status: seo.facebookPixel ? 'configured' : 'optional' },
                  { label: 'TikTok Pixel', status: seo.tiktokPixel ? 'configured' : 'optional' },
                  { label: 'Schema Markup', status: seo.structuredData ? 'configured' : 'warning' },
                ].map((item, i) => (
                  <div key={i} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '14px 18px', 
                    background: theme.colors.bg, 
                    borderRadius: theme.radius.md,
                    border: `1px solid ${theme.colors.border}`
                  }}>
                    <span style={{ fontWeight: 500, fontSize: '14px', color: theme.colors.text }}>{item.label}</span>
                    <span style={{ 
                      padding: '5px 12px', 
                      borderRadius: '20px', 
                      fontSize: '12px', 
                      fontWeight: 500,
                      background: item.status === 'configured' ? '#ecfdf5' : item.status === 'missing' ? '#fef2f2' : '#fffbeb',
                      color: item.status === 'configured' ? '#059669' : item.status === 'missing' ? '#dc2626' : '#d97706',
                    }}>
                      {item.status === 'configured' ? 'Configured' : item.status === 'missing' ? 'Missing' : 'Optional'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ ...cardStyle, marginTop: '20px' }}>
              <h3 style={{ 
                margin: '0 0 24px', 
                color: theme.colors.text, 
                fontSize: '16px', 
                fontWeight: 600,
                letterSpacing: '-0.01em'
              }}>
                Quick Actions
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {[
                  { label: 'Meta Tags', tab: 'meta', icon: Icons.meta },
                  { label: 'Pixels', tab: 'pixels', icon: Icons.pixels },
                  { label: 'Countries', tab: 'countries', icon: Icons.globe },
                  { label: 'Products', tab: 'products', icon: Icons.product },
                ].map((action, i) => {
                  const ActionIcon = action.icon
                  return (
                    <button
                      key={i}
                      onClick={() => setActiveTab(action.tab)}
                      style={{
                        padding: '20px',
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.radius.md,
                        background: theme.colors.card,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = theme.colors.borderHover}
                      onMouseLeave={e => e.currentTarget.style.borderColor = theme.colors.border}
                    >
                      <div style={{ marginBottom: '10px', color: theme.colors.textSecondary }}><ActionIcon /></div>
                      <div style={{ fontWeight: 500, color: theme.colors.text, fontSize: '13px' }}>{action.label}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Meta Tags Tab */}
        {activeTab === 'meta' && (
          <div>
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 24px', color: theme.colors.text, fontSize: '16px', fontWeight: 600, letterSpacing: '-0.01em' }}>
                Basic Meta Tags
              </h3>
              
              <div style={{ display: 'grid', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Site Title</label>
                  <input
                    type="text"
                    value={seo.siteTitle}
                    onChange={e => setSeo({ ...seo, siteTitle: e.target.value })}
                    style={inputStyle}
                    placeholder="Your E-commerce Store"
                  />
                  <p style={helpTextStyle}>This appears in browser tabs and search results</p>
                </div>

                <div>
                  <label style={labelStyle}>Site Description</label>
                  <textarea
                    value={seo.siteDescription}
                    onChange={e => setSeo({ ...seo, siteDescription: e.target.value })}
                    style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
                    placeholder="A brief description of your store for search engines..."
                  />
                  <p style={helpTextStyle}>Keep it under 160 characters for best SEO results</p>
                </div>

                <div>
                  <label style={labelStyle}>Keywords</label>
                  <input
                    type="text"
                    value={seo.keywords}
                    onChange={e => setSeo({ ...seo, keywords: e.target.value })}
                    style={inputStyle}
                    placeholder="skincare, beauty, cosmetics, online shopping"
                  />
                  <p style={helpTextStyle}>Comma-separated keywords relevant to your store</p>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 24px', color: theme.colors.text, fontSize: '16px', fontWeight: 600, letterSpacing: '-0.01em' }}>
                Open Graph / Social Media
              </h3>
              
              <div style={{ display: 'grid', gap: 20 }}>
                <div>
                  <label style={labelStyle}>OG Image URL</label>
                  <input
                    type="url"
                    value={seo.ogImage}
                    onChange={e => setSeo({ ...seo, ogImage: e.target.value })}
                    style={inputStyle}
                    placeholder="https://yourdomain.com/og-image.jpg"
                  />
                  <p style={helpTextStyle}>Image shown when your site is shared on social media (recommended: 1200x630px)</p>
                </div>

                <div>
                  <label style={labelStyle}>Twitter Card Type</label>
                  <select
                    value={seo.twitterCard}
                    onChange={e => setSeo({ ...seo, twitterCard: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="summary">Summary</option>
                    <option value="summary_large_image">Summary Large Image</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Event Tracking Tab */}
        {activeTab === 'events' && (
          <div>
            {/* TikTok Events */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{ 
                  width: 40, height: 40, 
                  borderRadius: theme.radius.md, 
                  background: '#000', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#fff'
                }}>
                  <Icons.tiktok />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: theme.colors.text, fontSize: '16px', fontWeight: 600, letterSpacing: '-0.01em' }}>
                    TikTok Event Tracking
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: theme.colors.textSecondary }}>
                    Configure which events to track for TikTok Pixel
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                {[
                  { key: 'pageView', label: 'Page View', desc: 'Track when users view any page' },
                  { key: 'viewContent', label: 'View Content', desc: 'Track when users view a product' },
                  { key: 'addToCart', label: 'Add to Cart', desc: 'Track when users add items to cart' },
                  { key: 'initiateCheckout', label: 'Initiate Checkout', desc: 'Track when users start checkout' },
                  { key: 'completePayment', label: 'Complete Payment', desc: 'Track successful purchases' },
                  { key: 'search', label: 'Search', desc: 'Track search queries' },
                  { key: 'addToWishlist', label: 'Add to Wishlist', desc: 'Track wishlist additions' },
                  { key: 'contact', label: 'Contact', desc: 'Track contact form submissions' },
                  { key: 'submitForm', label: 'Submit Form', desc: 'Track any form submissions' },
                  { key: 'subscribe', label: 'Subscribe', desc: 'Track newsletter signups' },
                ].map(event => (
                  <label
                    key={event.key}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '16px',
                      background: theme.colors.bg,
                      borderRadius: theme.radius.md,
                      border: `1px solid ${theme.colors.border}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={seo.tiktokEvents?.[event.key] || false}
                      onChange={e => setSeo({
                        ...seo,
                        tiktokEvents: { ...seo.tiktokEvents, [event.key]: e.target.checked }
                      })}
                      style={{ marginTop: '2px', width: 16, height: 16, accentColor: theme.colors.text }}
                    />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '14px', color: theme.colors.text }}>{event.label}</div>
                      <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginTop: '2px' }}>{event.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Event Data Settings */}
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 24px', color: theme.colors.text, fontSize: '16px', fontWeight: 600, letterSpacing: '-0.01em' }}>
                Event Data Configuration
              </h3>
              
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ 
                  padding: '16px', 
                  background: '#ecfdf5', 
                  borderRadius: theme.radius.md,
                  border: '1px solid #a7f3d0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <Icons.check />
                    <span style={{ fontWeight: 600, color: '#065f46', fontSize: '14px' }}>Automatic Data Passing</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#047857', lineHeight: 1.5 }}>
                    Product data (name, price, currency, quantity) is automatically passed with events. 
                    Order value and content IDs are included with purchase events.
                  </p>
                </div>

                <div style={{ 
                  padding: '16px', 
                  background: '#fffbeb', 
                  borderRadius: theme.radius.md,
                  border: '1px solid #fde68a'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    <span style={{ fontWeight: 600, color: '#92400e', fontSize: '14px' }}>TikTok Pixel ID Required</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#a16207', lineHeight: 1.5 }}>
                    Make sure you've added your TikTok Pixel ID in the Pixels tab for events to fire.
                    Current: {seo.tiktokPixel ? <strong>{seo.tiktokPixel}</strong> : <span style={{ color: '#dc2626' }}>Not configured</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Thank You Page Tab */}
        {activeTab === 'thankyou' && (
          <div>
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 24px', color: theme.colors.text, fontSize: '16px', fontWeight: 600, letterSpacing: '-0.01em' }}>
                Thank You Page Settings
              </h3>
              
              <div style={{ display: 'grid', gap: '20px' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '16px',
                  background: theme.colors.bg,
                  borderRadius: theme.radius.md,
                  border: `1px solid ${theme.colors.border}`,
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={seo.thankYouPage?.enabled || false}
                    onChange={e => setSeo({
                      ...seo,
                      thankYouPage: { ...seo.thankYouPage, enabled: e.target.checked }
                    })}
                    style={{ width: 18, height: 18, accentColor: theme.colors.text }}
                  />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '14px', color: theme.colors.text }}>Enable Thank You Page Tracking</div>
                    <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginTop: '2px' }}>Fire conversion pixels when customers reach the thank you page</div>
                  </div>
                </label>

                <div>
                  <label style={labelStyle}>Thank You Page Path</label>
                  <input
                    type="text"
                    value={seo.thankYouPage?.path || '/thank-you'}
                    onChange={e => setSeo({
                      ...seo,
                      thankYouPage: { ...seo.thankYouPage, path: e.target.value }
                    })}
                    style={inputStyle}
                    placeholder="/thank-you"
                  />
                  <p style={helpTextStyle}>URL path where the thank you page is displayed</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={labelStyle}>Custom Title</label>
                    <input
                      type="text"
                      value={seo.thankYouPage?.customTitle || ''}
                      onChange={e => setSeo({
                        ...seo,
                        thankYouPage: { ...seo.thankYouPage, customTitle: e.target.value }
                      })}
                      style={inputStyle}
                      placeholder="Thank You for Your Order!"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Custom Message</label>
                    <input
                      type="text"
                      value={seo.thankYouPage?.customMessage || ''}
                      onChange={e => setSeo({
                        ...seo,
                        thankYouPage: { ...seo.thankYouPage, customMessage: e.target.value }
                      })}
                      style={inputStyle}
                      placeholder="Your order has been placed successfully."
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    padding: '14px',
                    background: theme.colors.bg,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${theme.colors.border}`,
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={seo.thankYouPage?.trackPurchase !== false}
                      onChange={e => setSeo({
                        ...seo,
                        thankYouPage: { ...seo.thankYouPage, trackPurchase: e.target.checked }
                      })}
                      style={{ width: 16, height: 16, accentColor: theme.colors.text }}
                    />
                    <span style={{ fontWeight: 500, fontSize: '14px', color: theme.colors.text }}>Track Purchase Event</span>
                  </label>

                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    padding: '14px',
                    background: theme.colors.bg,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${theme.colors.border}`,
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={seo.thankYouPage?.trackValue !== false}
                      onChange={e => setSeo({
                        ...seo,
                        thankYouPage: { ...seo.thankYouPage, trackValue: e.target.checked }
                      })}
                      style={{ width: 16, height: 16, accentColor: theme.colors.text }}
                    />
                    <span style={{ fontWeight: 500, fontSize: '14px', color: theme.colors.text }}>Include Order Value</span>
                  </label>

                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    padding: '14px',
                    background: theme.colors.bg,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${theme.colors.border}`,
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={seo.thankYouPage?.showOrderDetails !== false}
                      onChange={e => setSeo({
                        ...seo,
                        thankYouPage: { ...seo.thankYouPage, showOrderDetails: e.target.checked }
                      })}
                      style={{ width: 16, height: 16, accentColor: theme.colors.text }}
                    />
                    <span style={{ fontWeight: 500, fontSize: '14px', color: theme.colors.text }}>Show Order Details</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Conversion Pixels */}
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 24px', color: theme.colors.text, fontSize: '16px', fontWeight: 600, letterSpacing: '-0.01em' }}>
                Conversion Pixels
              </h3>
              <p style={{ ...helpTextStyle, marginTop: '-16px', marginBottom: '20px' }}>
                Select which pixels should fire on the thank you page
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { key: 'tiktok', label: 'TikTok Pixel', color: '#000', configured: !!seo.tiktokPixel },
                  { key: 'facebook', label: 'Facebook Pixel', color: '#1877f2', configured: !!seo.facebookPixel },
                  { key: 'snapchat', label: 'Snapchat Pixel', color: '#FFFC00', configured: !!seo.snapchatPixel },
                  { key: 'pinterest', label: 'Pinterest Tag', color: '#E60023', configured: !!seo.pinterestTag },
                  { key: 'google', label: 'Google Analytics', color: '#4285f4', configured: !!seo.googleAnalytics },
                ].map(pixel => (
                  <label
                    key={pixel.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px',
                      background: theme.colors.bg,
                      borderRadius: theme.radius.md,
                      border: `1px solid ${seo.thankYouPage?.conversionPixels?.[pixel.key] ? theme.colors.borderHover : theme.colors.border}`,
                      cursor: 'pointer',
                      opacity: pixel.configured ? 1 : 0.5,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={seo.thankYouPage?.conversionPixels?.[pixel.key] || false}
                      onChange={e => setSeo({
                        ...seo,
                        thankYouPage: {
                          ...seo.thankYouPage,
                          conversionPixels: {
                            ...seo.thankYouPage?.conversionPixels,
                            [pixel.key]: e.target.checked
                          }
                        }
                      })}
                      disabled={!pixel.configured}
                      style={{ width: 16, height: 16, accentColor: pixel.color }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        width: 8, height: 8, 
                        borderRadius: '50%', 
                        background: pixel.color,
                        border: pixel.color === '#FFFC00' ? '1px solid #ccc' : 'none'
                      }}></span>
                      <span style={{ fontWeight: 500, fontSize: '13px', color: theme.colors.text }}>{pixel.label}</span>
                    </div>
                    {!pixel.configured && (
                      <span style={{ fontSize: '11px', color: theme.colors.error, marginLeft: 'auto' }}>Not set</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Redirect Settings */}
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 24px', color: theme.colors.text, fontSize: '16px', fontWeight: 600, letterSpacing: '-0.01em' }}>
                Redirect Settings
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
                <div>
                  <label style={labelStyle}>Redirect After (seconds)</label>
                  <input
                    type="number"
                    value={seo.thankYouPage?.redirectAfter || 0}
                    onChange={e => setSeo({
                      ...seo,
                      thankYouPage: { ...seo.thankYouPage, redirectAfter: parseInt(e.target.value) || 0 }
                    })}
                    style={inputStyle}
                    min="0"
                    placeholder="0"
                  />
                  <p style={helpTextStyle}>0 = No redirect</p>
                </div>
                <div>
                  <label style={labelStyle}>Redirect URL</label>
                  <input
                    type="text"
                    value={seo.thankYouPage?.redirectUrl || ''}
                    onChange={e => setSeo({
                      ...seo,
                      thankYouPage: { ...seo.thankYouPage, redirectUrl: e.target.value }
                    })}
                    style={inputStyle}
                    placeholder="https://example.com/special-offer"
                    disabled={!seo.thankYouPage?.redirectAfter}
                  />
                  <p style={helpTextStyle}>Where to redirect after the specified time</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div>
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 24px', color: theme.colors.text, fontSize: '16px', fontWeight: 600, letterSpacing: '-0.01em' }}>
                Google Analytics & Tag Manager
              </h3>
              
              <div style={{ display: 'grid', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Google Analytics 4 Measurement ID</label>
                  <input
                    type="text"
                    value={seo.googleAnalytics}
                    onChange={e => setSeo({ ...seo, googleAnalytics: e.target.value })}
                    style={inputStyle}
                    placeholder="G-XXXXXXXXXX"
                  />
                  <p style={helpTextStyle}>Find in GA4 Admin → Data Streams → Measurement ID</p>
                </div>

                <div>
                  <label style={labelStyle}>Google Tag Manager Container ID</label>
                  <input
                    type="text"
                    value={seo.googleTagManager}
                    onChange={e => setSeo({ ...seo, googleTagManager: e.target.value })}
                    style={inputStyle}
                    placeholder="GTM-XXXXXXX"
                  />
                  <p style={helpTextStyle}>Use GTM to manage all your tags in one place</p>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 24px', color: theme.colors.text, fontSize: '16px', fontWeight: 600, letterSpacing: '-0.01em' }}>
                Heatmaps & Session Recording
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Hotjar Site ID</label>
                  <input
                    type="text"
                    value={seo.hotjarId}
                    onChange={e => setSeo({ ...seo, hotjarId: e.target.value })}
                    style={inputStyle}
                    placeholder="1234567"
                  />
                  <p style={helpTextStyle}>Find in Hotjar → Sites & Organizations</p>
                </div>

                <div>
                  <label style={labelStyle}>Microsoft Clarity Project ID</label>
                  <input
                    type="text"
                    value={seo.clarityId}
                    onChange={e => setSeo({ ...seo, clarityId: e.target.value })}
                    style={inputStyle}
                    placeholder="xxxxxxxxxx"
                  />
                  <p style={helpTextStyle}>Find in Clarity → Project Settings</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Country SEO Tab */}
        {activeTab === 'countries' && (
          <div>
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 8px', color: theme.colors.text, fontSize: '16px', fontWeight: 600, letterSpacing: '-0.01em' }}>
                Country-Specific SEO & Pixels
              </h3>
              <p style={{ ...helpTextStyle, marginTop: 0, marginBottom: '24px' }}>Configure SEO settings and tracking pixels for each country.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '24px', marginTop: '20px' }}>
                {/* Country List */}
                <div style={{ background: theme.colors.bg, borderRadius: theme.radius.lg, padding: '16px', border: `1px solid ${theme.colors.border}` }}>
                  <div style={{ fontWeight: 500, marginBottom: '12px', color: theme.colors.text, fontSize: '13px' }}>Select Country</div>
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {countries.map(country => (
                      <button
                        key={country}
                        onClick={() => setSelectedCountry(country)}
                        style={{
                          padding: '10px 14px',
                          border: `1px solid ${selectedCountry === country ? theme.colors.text : theme.colors.border}`,
                          borderRadius: theme.radius.md,
                          background: selectedCountry === country ? theme.colors.text : theme.colors.card,
                          color: selectedCountry === country ? '#fff' : theme.colors.text,
                          fontWeight: 500,
                          fontSize: '13px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{country}</span>
                        {countrySeo[country] && <span style={{ fontSize: 11, opacity: 0.7 }}>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Country SEO Form */}
                <div>
                  {selectedCountry ? (
                    <div style={{ display: 'grid', gap: '20px' }}>
                      <div style={{ padding: '16px 20px', background: theme.colors.text, borderRadius: theme.radius.md, color: '#fff' }}>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Settings for {selectedCountry}</h4>
                      </div>

                      {/* Meta Settings */}
                      <div style={{ padding: '20px', background: theme.colors.bg, borderRadius: theme.radius.md, border: `1px solid ${theme.colors.border}` }}>
                        <h5 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: theme.colors.text }}>Meta Tags</h5>
                        <div style={{ display: 'grid', gap: '16px' }}>
                          <div>
                            <label style={labelStyle}>Title Tag</label>
                            <input
                              type="text"
                              value={countrySeo[selectedCountry]?.title || ''}
                              onChange={e => setCountrySeo({ ...countrySeo, [selectedCountry]: { ...countrySeo[selectedCountry], title: e.target.value } })}
                              style={inputStyle}
                              placeholder={`Best Products in ${selectedCountry} | Your Store`}
                            />
                          </div>
                          <div>
                            <label style={labelStyle}>Description</label>
                            <textarea
                              value={countrySeo[selectedCountry]?.description || ''}
                              onChange={e => setCountrySeo({ ...countrySeo, [selectedCountry]: { ...countrySeo[selectedCountry], description: e.target.value } })}
                              style={{ ...inputStyle, minHeight: 70 }}
                              placeholder={`Shop the best products with fast delivery to ${selectedCountry}...`}
                            />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                              <label style={labelStyle}>Keywords</label>
                              <input
                                type="text"
                                value={countrySeo[selectedCountry]?.keywords || ''}
                                onChange={e => setCountrySeo({ ...countrySeo, [selectedCountry]: { ...countrySeo[selectedCountry], keywords: e.target.value } })}
                                style={inputStyle}
                                placeholder="keywords, here"
                              />
                            </div>
                            <div>
                              <label style={labelStyle}>Hreflang Code</label>
                              <input
                                type="text"
                                value={countrySeo[selectedCountry]?.hreflang || ''}
                                onChange={e => setCountrySeo({ ...countrySeo, [selectedCountry]: { ...countrySeo[selectedCountry], hreflang: e.target.value } })}
                                style={inputStyle}
                                placeholder="en-AE, ar-SA"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tracking Pixels */}
                      <div style={{ padding: '20px', background: theme.colors.bg, borderRadius: theme.radius.md, border: `1px solid ${theme.colors.border}` }}>
                        <h5 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: theme.colors.text }}>Tracking Pixels</h5>
                        <div style={{ display: 'grid', gap: '16px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                              <label style={labelStyle}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1877f2' }}></span>
                                  Facebook Pixel
                                </span>
                              </label>
                              <input
                                type="text"
                                value={countrySeo[selectedCountry]?.facebookPixel || ''}
                                onChange={e => setCountrySeo({ ...countrySeo, [selectedCountry]: { ...countrySeo[selectedCountry], facebookPixel: e.target.value } })}
                                style={inputStyle}
                                placeholder="123456789012345"
                              />
                            </div>
                            <div>
                              <label style={labelStyle}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#000' }}></span>
                                  TikTok Pixel
                                </span>
                              </label>
                              <input
                                type="text"
                                value={countrySeo[selectedCountry]?.tiktokPixel || ''}
                                onChange={e => setCountrySeo({ ...countrySeo, [selectedCountry]: { ...countrySeo[selectedCountry], tiktokPixel: e.target.value } })}
                                style={inputStyle}
                                placeholder="D5LMN53C77U4MKNK3QS0"
                              />
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                              <label style={labelStyle}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFFC00', border: '1px solid #ccc' }}></span>
                                  Snapchat Pixel
                                </span>
                              </label>
                              <input
                                type="text"
                                value={countrySeo[selectedCountry]?.snapchatPixel || ''}
                                onChange={e => setCountrySeo({ ...countrySeo, [selectedCountry]: { ...countrySeo[selectedCountry], snapchatPixel: e.target.value } })}
                                style={inputStyle}
                                placeholder="xxxxxxxx-xxxx-xxxx"
                              />
                            </div>
                            <div>
                              <label style={labelStyle}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E60023' }}></span>
                                  Pinterest Tag
                                </span>
                              </label>
                              <input
                                type="text"
                                value={countrySeo[selectedCountry]?.pinterestTag || ''}
                                onChange={e => setCountrySeo({ ...countrySeo, [selectedCountry]: { ...countrySeo[selectedCountry], pinterestTag: e.target.value } })}
                                style={inputStyle}
                                placeholder="123456789012"
                              />
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                              <label style={labelStyle}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#000' }}></span>
                                  Twitter/X Pixel
                                </span>
                              </label>
                              <input
                                type="text"
                                value={countrySeo[selectedCountry]?.twitterPixel || ''}
                                onChange={e => setCountrySeo({ ...countrySeo, [selectedCountry]: { ...countrySeo[selectedCountry], twitterPixel: e.target.value } })}
                                style={inputStyle}
                                placeholder="tw-xxxxx-xxxxx"
                              />
                            </div>
                            <div>
                              <label style={labelStyle}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0A66C2' }}></span>
                                  LinkedIn Tag
                                </span>
                              </label>
                              <input
                                type="text"
                                value={countrySeo[selectedCountry]?.linkedinTag || ''}
                                onChange={e => setCountrySeo({ ...countrySeo, [selectedCountry]: { ...countrySeo[selectedCountry], linkedinTag: e.target.value } })}
                                style={inputStyle}
                                placeholder="1234567"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Analytics */}
                      <div style={{ padding: '20px', background: theme.colors.bg, borderRadius: theme.radius.md, border: `1px solid ${theme.colors.border}` }}>
                        <h5 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: theme.colors.text }}>Analytics</h5>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div>
                            <label style={labelStyle}>Google Analytics</label>
                            <input
                              type="text"
                              value={countrySeo[selectedCountry]?.googleAnalytics || ''}
                              onChange={e => setCountrySeo({ ...countrySeo, [selectedCountry]: { ...countrySeo[selectedCountry], googleAnalytics: e.target.value } })}
                              style={inputStyle}
                              placeholder="G-XXXXXXXXXX"
                            />
                          </div>
                          <div>
                            <label style={labelStyle}>Google Tag Manager</label>
                            <input
                              type="text"
                              value={countrySeo[selectedCountry]?.googleTagManager || ''}
                              onChange={e => setCountrySeo({ ...countrySeo, [selectedCountry]: { ...countrySeo[selectedCountry], googleTagManager: e.target.value } })}
                              style={inputStyle}
                              placeholder="GTM-XXXXXXX"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => saveCountrySeo(selectedCountry, countrySeo[selectedCountry])}
                        disabled={saving}
                        style={{
                          padding: '12px 24px',
                          border: 'none',
                          borderRadius: theme.radius.md,
                          background: theme.colors.text,
                          color: '#fff',
                          fontWeight: 500,
                          fontSize: '14px',
                          cursor: saving ? 'not-allowed' : 'pointer',
                          width: 'fit-content',
                          opacity: saving ? 0.6 : 1,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {saving ? 'Saving...' : `Save ${selectedCountry} Settings`}
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: '60px 40px', textAlign: 'center', color: theme.colors.textMuted, background: theme.colors.bg, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}` }}>
                      <Icons.globe />
                      <p style={{ marginTop: '12px', fontSize: '14px' }}>Select a country to configure settings</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Product SEO Tab */}
        {activeTab === 'products' && (
          <div>
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 24px', color: theme.colors.text, fontSize: '16px', fontWeight: 600, letterSpacing: '-0.01em' }}>
                Product SEO
              </h3>
              
              {/* Search */}
              <div style={{ marginBottom: 20 }}>
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  style={{ ...inputStyle, maxWidth: 400 }}
                  placeholder="Search products by name or SKU..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 24 }}>
                {/* Product List */}
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, maxHeight: 500, overflow: 'auto' }}>
                  <div style={{ fontWeight: 600, marginBottom: 12, color: '#374151' }}>
                    Products ({filteredProducts.length})
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {filteredProducts.slice(0, 50).map(product => (
                      <button
                        key={product._id}
                        onClick={() => {
                          setSelectedProduct(product)
                          setProductSeo({
                            seoTitle: product.seoTitle || product.name || '',
                            seoDescription: product.seoDescription || product.description?.slice(0, 160) || '',
                            seoKeywords: product.seoKeywords || '',
                            slug: product.slug || '',
                            canonicalUrl: product.canonicalUrl || '',
                            noIndex: product.noIndex || false,
                          })
                        }}
                        style={{
                          padding: '12px 16px',
                          border: 'none',
                          borderRadius: 8,
                          background: selectedProduct?._id === product._id ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'white',
                          color: selectedProduct?._id === product._id ? 'white' : '#374151',
                          fontWeight: 500,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{product.name}</div>
                        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                          SKU: {product.sku || 'N/A'} {product.seoTitle && '• SEO ✓'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product SEO Form */}
                <div>
                  {selectedProduct ? (
                    <div style={{ display: 'grid', gap: 20 }}>
                      <div style={{ padding: 16, background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: 12, color: 'white' }}>
                        <h4 style={{ margin: 0 }}>SEO for: {selectedProduct.name}</h4>
                      </div>

                      <div>
                        <label style={labelStyle}>SEO Title (60-70 chars recommended)</label>
                        <input
                          type="text"
                          value={productSeo.seoTitle}
                          onChange={e => setProductSeo({ ...productSeo, seoTitle: e.target.value })}
                          style={inputStyle}
                          placeholder="Product Name | Category | Brand"
                        />
                        <p style={{ ...helpTextStyle, color: productSeo.seoTitle.length > 70 ? '#dc2626' : '#64748b' }}>
                          {productSeo.seoTitle.length}/70 characters
                        </p>
                      </div>

                      <div>
                        <label style={labelStyle}>SEO Description (150-160 chars recommended)</label>
                        <textarea
                          value={productSeo.seoDescription}
                          onChange={e => setProductSeo({ ...productSeo, seoDescription: e.target.value })}
                          style={{ ...inputStyle, minHeight: 80 }}
                          placeholder="Compelling product description for search engines..."
                        />
                        <p style={{ ...helpTextStyle, color: productSeo.seoDescription.length > 160 ? '#dc2626' : '#64748b' }}>
                          {productSeo.seoDescription.length}/160 characters
                        </p>
                      </div>

                      <div>
                        <label style={labelStyle}>SEO Keywords</label>
                        <input
                          type="text"
                          value={productSeo.seoKeywords}
                          onChange={e => setProductSeo({ ...productSeo, seoKeywords: e.target.value })}
                          style={inputStyle}
                          placeholder="product, keywords, separated, by, commas"
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <label style={labelStyle}>URL Slug</label>
                          <input
                            type="text"
                            value={productSeo.slug}
                            onChange={e => setProductSeo({ ...productSeo, slug: e.target.value })}
                            style={inputStyle}
                            placeholder="product-url-slug"
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Canonical URL</label>
                          <input
                            type="text"
                            value={productSeo.canonicalUrl}
                            onChange={e => setProductSeo({ ...productSeo, canonicalUrl: e.target.value })}
                            style={inputStyle}
                            placeholder="https://..."
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                          <input
                            type="checkbox"
                            checked={productSeo.noIndex}
                            onChange={e => setProductSeo({ ...productSeo, noIndex: e.target.checked })}
                            style={{ width: 18, height: 18 }}
                          />
                          No Index (hide from search engines)
                        </label>
                      </div>

                      <button
                        onClick={() => saveProductSeo(selectedProduct._id, productSeo)}
                        disabled={saving}
                        style={{
                          padding: '12px 24px',
                          border: 'none',
                          borderRadius: 8,
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          color: 'white',
                          fontWeight: 600,
                          cursor: saving ? 'not-allowed' : 'pointer',
                          width: 'fit-content',
                        }}
                      >
                        {saving ? 'Saving...' : 'Save Product SEO'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
                      <p>Select a product to optimize its SEO</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Schema Tab */}
        {activeTab === 'schema' && (
          <div>
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 24px', color: theme.colors.text, fontSize: '16px', fontWeight: 600, letterSpacing: '-0.01em' }}>
                Schema Markup
              </h3>
              
              <div style={{ display: 'grid', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Schema Type</label>
                  <select
                    value={seo.schemaType}
                    onChange={e => setSeo({ ...seo, schemaType: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="WebSite">WebSite</option>
                    <option value="Organization">Organization</option>
                    <option value="LocalBusiness">Local Business</option>
                    <option value="Store">Online Store</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Sitemap Priority</label>
                    <select
                      value={seo.sitemapPriority}
                      onChange={e => setSeo({ ...seo, sitemapPriority: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="1.0">1.0 (Highest)</option>
                      <option value="0.8">0.8</option>
                      <option value="0.5">0.5</option>
                      <option value="0.3">0.3 (Lowest)</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Sitemap Frequency</label>
                    <select
                      value={seo.sitemapFrequency}
                      onChange={e => setSeo({ ...seo, sitemapFrequency: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="always">Always</option>
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      type="checkbox"
                      checked={seo.breadcrumbs}
                      onChange={e => setSeo({ ...seo, breadcrumbs: e.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                    Enable Breadcrumb Schema
                  </label>
                  <p style={helpTextStyle}>Adds breadcrumb navigation schema for better search results</p>
                </div>

                <div>
                  <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      type="checkbox"
                      checked={seo.structuredData}
                      onChange={e => setSeo({ ...seo, structuredData: e.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                    Enable Product Schema (JSON-LD)
                  </label>
                  <p style={helpTextStyle}>Adds rich product snippets to search results</p>
                </div>

                <div>
                  <label style={labelStyle}>Canonical URL</label>
                  <input
                    type="url"
                    value={seo.canonicalUrl}
                    onChange={e => setSeo({ ...seo, canonicalUrl: e.target.value })}
                    style={inputStyle}
                    placeholder="https://yourdomain.com"
                  />
                  <p style={helpTextStyle}>Main URL for your site (prevents duplicate content issues)</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input
                        type="checkbox"
                        checked={seo.noIndex}
                        onChange={e => setSeo({ ...seo, noIndex: e.target.checked })}
                        style={{ width: 18, height: 18 }}
                      />
                      No Index (hide site from search)
                    </label>
                  </div>
                  <div>
                    <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input
                        type="checkbox"
                        checked={seo.noFollow}
                        onChange={e => setSeo({ ...seo, noFollow: e.target.checked })}
                        style={{ width: 18, height: 18 }}
                      />
                      No Follow (prevent link following)
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Tab */}
        {activeTab === 'advanced' && (
          <div>
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 24px', color: theme.colors.text, fontSize: '16px', fontWeight: 600, letterSpacing: '-0.01em' }}>
                Custom Code Injection
              </h3>
              
              <div style={{ display: 'grid', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Custom Head Code</label>
                  <textarea
                    value={seo.customHeadCode}
                    onChange={e => setSeo({ ...seo, customHeadCode: e.target.value })}
                    style={{ ...inputStyle, minHeight: 150, fontFamily: 'monospace', fontSize: 13 }}
                    placeholder="<!-- Add custom scripts, styles, or meta tags here -->"
                  />
                  <p style={helpTextStyle}>Code will be injected in the &lt;head&gt; section</p>
                </div>

                <div>
                  <label style={labelStyle}>Custom Body Code</label>
                  <textarea
                    value={seo.customBodyCode}
                    onChange={e => setSeo({ ...seo, customBodyCode: e.target.value })}
                    style={{ ...inputStyle, minHeight: 150, fontFamily: 'monospace', fontSize: 13 }}
                    placeholder="<!-- Add custom scripts here (e.g., chat widgets, noscript tags) -->"
                  />
                  <p style={helpTextStyle}>Code will be injected at the end of &lt;body&gt;</p>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 24px', color: theme.colors.text, fontSize: '16px', fontWeight: 600, letterSpacing: '-0.01em' }}>
                Robots & Crawlers
              </h3>
              
              <div style={{ display: 'grid', gap: 20 }}>
                <div>
                  <label style={labelStyle}>Custom robots.txt Content</label>
                  <textarea
                    value={seo.robotsTxt}
                    onChange={e => setSeo({ ...seo, robotsTxt: e.target.value })}
                    style={{ ...inputStyle, minHeight: 150, fontFamily: 'monospace', fontSize: 13 }}
                    placeholder={`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: https://yourdomain.com/sitemap.xml`}
                  />
                  <p style={helpTextStyle}>Control how search engines crawl your site</p>
                </div>

                <div>
                  <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      type="checkbox"
                      checked={seo.structuredData}
                      onChange={e => setSeo({ ...seo, structuredData: e.target.checked })}
                      style={{ width: 18, height: 18 }}
                    />
                    Enable JSON-LD Structured Data
                  </label>
                  <p style={helpTextStyle}>Adds schema.org structured data for better search results</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Premium Save Button */}
        <div style={{ 
          position: 'sticky', 
          bottom: '24px', 
          background: theme.colors.card, 
          padding: '16px 20px', 
          borderRadius: theme.radius.lg,
          border: `1px solid ${theme.colors.border}`,
          boxShadow: theme.shadow.lg,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
        }}>
          <button
            onClick={loadSEOSettings}
            style={{
              padding: '12px 20px',
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radius.md,
              background: theme.colors.card,
              color: theme.colors.textSecondary,
              fontWeight: 500,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: theme.radius.md,
              background: theme.colors.text,
              color: '#fff',
              fontWeight: 500,
              fontSize: '14px',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            {saving ? (
              <>
                <div style={{ 
                  width: 16, height: 16, 
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }}/>
                Saving...
              </>
            ) : (
              <>
                <Icons.check />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
