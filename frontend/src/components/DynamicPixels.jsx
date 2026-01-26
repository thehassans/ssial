import { useEffect, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { apiGet } from '../api.js'

function normalizeIds(value) {
  const sanitizeOne = (v) => {
    try {
      let s = typeof v === 'string' ? v : ''
      s = String(s || '').trim()
      if (!s) return ''
      s = s.replace(/<[^>]*>/g, ' ').trim()
      const parts = s.match(/[A-Za-z0-9]{6,64}/g) || []
      if (!parts.length) return ''
      parts.sort((a, b) => b.length - a.length)
      const best = String(parts[0] || '').trim()
      if (!best) return ''
      return best
    } catch {
      return ''
    }
  }
  if (Array.isArray(value)) {
    return value
      .map((v) => sanitizeOne(v))
      .filter(Boolean)
  }
  if (typeof value !== 'string') return []
  const raw = value
    .split(/[\n,]+/g)
    .map((v) => sanitizeOne(v))
    .filter(Boolean)
  return Array.from(new Set(raw))
}

function isPageViewEnabled(platformKey) {
  if (typeof window === 'undefined') return true
  const et = window._seoSettings?.eventTracking
  if (!et || typeof et !== 'object') return true
  const platform = et?.[platformKey]
  if (!platform || typeof platform !== 'object') return true
  return platform?.pageView !== false
}

/**
 * DynamicPixels - Injects tracking pixels dynamically based on SEO settings
 * This component loads pixel IDs from the backend and injects the appropriate scripts
 * Also handles route change tracking for SPAs
 */
export default function DynamicPixels() {
  const [loaded, setLoaded] = useState(false)
  const [pixelsReady, setPixelsReady] = useState(false)
  const location = useLocation()
  const isFirstRender = useRef(true)

  // Load pixels on mount
  useEffect(() => {
    if (loaded) return
    
    let alive = true
    ;(async () => {
      try {
        // Load both global SEO settings and country-specific settings
        const [seoRes, countrySeoRes] = await Promise.all([
          apiGet('/api/settings/seo'),
          apiGet('/api/settings/country-seo').catch(() => ({ countrySeo: {} }))
        ])
        
        if (!alive) return
        
        const seo = seoRes?.seo || {}
        const countrySeo = countrySeoRes?.countrySeo || {}
        
        // Store full SEO settings globally for access by analytics
        window._seoSettings = seo
        window._countrySeoSettings = countrySeo

        // Detect user's country from localStorage or default to Saudi Arabia
        const userCountry = localStorage.getItem('selectedCountry') || 'Saudi Arabia'
        const countryPixels = countrySeo[userCountry] || {}

        const pick = (countryValue, globalValue) => {
          const c = normalizeIds(countryValue)
          if (c.length) return c
          return normalizeIds(globalValue)
        }
        
        // Merge global and country-specific settings (country takes priority)
        const pixels = {
          tiktokPixel: pick(countryPixels.tiktokPixel, seo.tiktokPixel),
          facebookPixel: pick(countryPixels.facebookPixel, seo.facebookPixel),
          snapchatPixel: pick(countryPixels.snapchatPixel, seo.snapchatPixel),
          pinterestTag: pick(countryPixels.pinterestTag, seo.pinterestTag),
          twitterPixel: pick(countryPixels.twitterPixel, seo.twitterPixel),
          linkedinTag: pick(countryPixels.linkedinTag, seo.linkedinTag),
          googleAnalytics: pick(countryPixels.googleAnalytics, seo.googleAnalytics),
          googleTagManager: pick(countryPixels.googleTagManager, seo.googleTagManager),
        }

        console.log('Loading pixels for country:', userCountry, pixels)

        // TikTok Pixel
        if (pixels.tiktokPixel.length) {
          // Store pixel IDs and event settings for later use
          window._tiktokPixelIds = pixels.tiktokPixel
          window._tiktokPixelId = pixels.tiktokPixel[0]
          window._tiktokEvents = seo.tiktokEvents || {}
          window._thankYouPageSettings = seo.thankYouPage || {}
          initTikTokPixels(pixels.tiktokPixel)
        }

        // Facebook/Meta Pixel
        if (pixels.facebookPixel.length) {
          initFacebookPixels(pixels.facebookPixel)
        }

        // Snapchat Pixel
        if (pixels.snapchatPixel.length) {
          initSnapchatPixels(pixels.snapchatPixel)
        }

        // Twitter/X Pixel
        if (pixels.twitterPixel.length) {
          initTwitterPixels(pixels.twitterPixel)
        }

        // Pinterest Tag
        if (pixels.pinterestTag.length) {
          initPinterestTags(pixels.pinterestTag)
        }

        // LinkedIn Tag
        if (pixels.linkedinTag.length) {
          initLinkedInTags(pixels.linkedinTag)
        }

        // Google Analytics
        if (pixels.googleAnalytics.length) {
          initGoogleAnalyticsIds(pixels.googleAnalytics)
        }

        // Google Tag Manager
        if (pixels.googleTagManager.length) {
          initGoogleTagManagerIds(pixels.googleTagManager)
        }

        // Hotjar (global only)
        if (seo.hotjarId && seo.hotjarId.trim()) {
          initHotjar(seo.hotjarId.trim())
        }

        // Microsoft Clarity (global only)
        if (seo.clarityId && seo.clarityId.trim()) {
          initClarity(seo.clarityId.trim())
        }

        setLoaded(true)
        setPixelsReady(true)
      } catch (err) {
        console.warn('Failed to load SEO settings for pixels:', err)
      }
    })()

    return () => { alive = false }
  }, [loaded])

  // Track route changes for page views (SPA navigation)
  useEffect(() => {
    // Skip the first render since pixels handle initial page view
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    // Only track if pixels are ready
    if (!pixelsReady) return

    // Track page view on route change
    trackAllPixelsPageView(location.pathname)
  }, [location.pathname, pixelsReady])

  return null // This component doesn't render anything
}

// Track page view across all pixels on route change
function trackAllPixelsPageView(pathname) {
  // TikTok Pixel page view
  if (window.ttq) {
    try {
      const ids = Array.isArray(window._tiktokPixelIds) ? window._tiktokPixelIds : []
      const enabled = (window._tiktokEvents || {}).pageView !== false

      if (!enabled) {
        // no-op
      } else if (ids.length && typeof window.ttq.instance === 'function') {
        ids.forEach((id) => {
          try {
            window.ttq.instance(id).page()
          } catch (e) {
            console.warn('TikTok page tracking error:', e)
          }
        })
      } else {
        window.ttq.page()
      }
    } catch (e) {
      console.warn('TikTok page tracking error:', e)
    }
  }

  // Facebook Pixel page view
  if (window.fbq) {
    if (isPageViewEnabled('facebook')) {
      try {
        window.fbq('track', 'PageView')
      } catch (e) {
        console.warn('Facebook page tracking error:', e)
      }
    }
  }

  // Snapchat Pixel page view
  if (window.snaptr) {
    if (isPageViewEnabled('snapchat')) {
      try {
        window.snaptr('track', 'PAGE_VIEW')
      } catch (e) {
        console.warn('Snapchat page tracking error:', e)
      }
    }
  }

  // Pinterest page view
  if (window.pintrk) {
    if (isPageViewEnabled('pinterest')) {
      try {
        window.pintrk('page')
      } catch (e) {
        console.warn('Pinterest page tracking error:', e)
      }
    }
  }

  // Google Analytics page view (handled automatically by react-router usually)
  if (window.gtag) {
    if (isPageViewEnabled('google')) {
      try {
        window.gtag('event', 'page_view', { page_path: pathname })
      } catch (e) {
        console.warn('Google Analytics page tracking error:', e)
      }
    }
  }
}

// TikTok Pixel initialization
function ensureTikTokBaseLoaded() {
  if (window.ttq) return

  ;(function(w, d, t) {
    w.TiktokAnalyticsObject = t
    var ttq = w[t] = w[t] || []
    ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"]
    ttq.setAndDefer = function(t, e) {
      t[e] = function() {
        t.push([e].concat(Array.prototype.slice.call(arguments, 0)))
      }
    }
    for (var i = 0; i < ttq.methods.length; i++) {
      ttq.setAndDefer(ttq, ttq.methods[i])
    }
    ttq.instance = function(t) {
      for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) {
        ttq.setAndDefer(e, ttq.methods[n])
      }
      return e
    }
    ttq.load = function(e, n) {
      var r = "https://analytics.tiktok.com/i18n/pixel/events.js"
      var o = n && n.partner
      ttq._i = ttq._i || {}
      ttq._i[e] = ttq._i[e] || []
      ttq._i[e]._u = r
      ttq._t = ttq._t || {}
      ttq._t[e] = ttq._t[e] || +new Date()
      ttq._o = ttq._o || {}
      ttq._o[e] = ttq._o[e] || n || {}
      var i = document.createElement("script")
      i.type = "text/javascript"
      i.async = true
      i.src = r + "?sdkid=" + encodeURIComponent(e) + "&lib=" + t
      var a = document.getElementsByTagName("script")[0]
      a.parentNode.insertBefore(i, a)
    }
  })(window, document, 'ttq')
}

function initTikTokPixels(pixelIds) {
  ensureTikTokBaseLoaded()
  if (!window.ttq) return

  const pageViewEnabled = (window._tiktokEvents || {}).pageView !== false

  const safeIds = Array.from(
    new Set(
      (Array.isArray(pixelIds) ? pixelIds : [])
        .map((x) => String(x || '').trim())
        .filter((x) => /^[A-Za-z0-9]{6,64}$/.test(x))
    )
  )

  if (!safeIds.length) return

  safeIds.forEach((id) => {
    try {
      window.ttq.load(id)
      if (pageViewEnabled && typeof window.ttq.instance === 'function') {
        window.ttq.instance(id).page()
      }
    } catch (e) {
      console.warn('TikTok Pixel init error:', e)
    }
  })

  if (pageViewEnabled && typeof window.ttq.instance !== 'function') {
    try {
      window.ttq.page()
    } catch {}
  }

  console.log('TikTok Pixel initialized:', safeIds)
}

// Facebook/Meta Pixel initialization
function ensureFacebookBaseLoaded() {
  if (window.fbq) return

  ;(function(f, b, e, v, n, t, s) {
    if (f.fbq) return
    n = f.fbq = function() {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
    }
    if (!f._fbq) f._fbq = n
    n.push = n
    n.loaded = true
    n.version = '2.0'
    n.queue = []
    t = b.createElement(e)
    t.async = true
    t.src = v
    s = b.getElementsByTagName(e)[0]
    s.parentNode.insertBefore(t, s)
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
}

function initFacebookPixels(pixelIds) {
  ensureFacebookBaseLoaded()
  if (!window.fbq) return

  pixelIds.forEach((id) => {
    try {
      window.fbq('init', id)
    } catch (e) {
      console.warn('Facebook Pixel init error:', e)
    }
  })

  if (isPageViewEnabled('facebook')) {
    try {
      window.fbq('track', 'PageView')
    } catch {}
  }

  console.log('Facebook Pixel initialized:', pixelIds)
}

// Snapchat Pixel initialization
function ensureSnapchatBaseLoaded() {
  if (window.snaptr) return

  ;(function(e, t, n) {
    if (e.snaptr) return
    var a = e.snaptr = function() {
      a.handleRequest ? a.handleRequest.apply(a, arguments) : a.queue.push(arguments)
    }
    a.queue = []
    var s = 'script'
    var r = t.createElement(s)
    r.async = true
    r.src = n
    var u = t.getElementsByTagName(s)[0]
    u.parentNode.insertBefore(r, u)
  })(window, document, 'https://sc-static.net/scevent.min.js')
}

function initSnapchatPixels(pixelIds) {
  ensureSnapchatBaseLoaded()
  if (!window.snaptr) return

  pixelIds.forEach((id) => {
    try {
      window.snaptr('init', id, {})
    } catch (e) {
      console.warn('Snapchat Pixel init error:', e)
    }
  })

  if (isPageViewEnabled('snapchat')) {
    try {
      window.snaptr('track', 'PAGE_VIEW')
    } catch {}
  }

  console.log('Snapchat Pixel initialized:', pixelIds)
}

// Twitter/X Pixel initialization
function ensureTwitterBaseLoaded() {
  if (window.twq) return

  ;(function(e, t, n, s, u, a) {
    e.twq || (s = e.twq = function() {
      s.exe ? s.exe.apply(s, arguments) : s.queue.push(arguments)
    }, s.version = '1.1', s.queue = [], u = t.createElement(n), u.async = true, u.src = 'https://static.ads-twitter.com/uwt.js',
    a = t.getElementsByTagName(n)[0], a.parentNode.insertBefore(u, a))
  })(window, document, 'script')
}

function initTwitterPixels(pixelIds) {
  ensureTwitterBaseLoaded()
  if (!window.twq) return

  pixelIds.forEach((id) => {
    try {
      window.twq('config', id)
    } catch (e) {
      console.warn('Twitter Pixel init error:', e)
    }
  })

  console.log('Twitter Pixel initialized:', pixelIds)
}

// Pinterest Tag initialization
function ensurePinterestBaseLoaded() {
  if (window.pintrk) return

  ;(function(e) {
    if (!window.pintrk) {
      window.pintrk = function() {
        window.pintrk.queue.push(Array.prototype.slice.call(arguments))
      }
      var n = window.pintrk
      n.queue = []
      n.version = '3.0'
      var t = document.createElement('script')
      t.async = true
      t.src = 'https://s.pinimg.com/ct/core.js'
      var r = document.getElementsByTagName('script')[0]
      r.parentNode.insertBefore(t, r)
    }
  })()
}

function initPinterestTags(tagIds) {
  ensurePinterestBaseLoaded()
  if (!window.pintrk) return

  tagIds.forEach((id) => {
    try {
      window.pintrk('load', id)
    } catch (e) {
      console.warn('Pinterest Tag init error:', e)
    }
  })

  if (isPageViewEnabled('pinterest')) {
    try {
      window.pintrk('page')
    } catch {}
  }

  console.log('Pinterest Tag initialized:', tagIds)
}

// LinkedIn Insight Tag initialization
function ensureLinkedInBaseLoaded() {
  if (window._linkedin_insight_tag_loaded) return
  window._linkedin_insight_tag_loaded = true

  ;(function(l) {
    if (!l) {
      window.lintrk = function(a, b) { window.lintrk.q.push([a, b]) }
      window.lintrk.q = []
    }
    var s = document.getElementsByTagName('script')[0]
    var b = document.createElement('script')
    b.type = 'text/javascript'
    b.async = true
    b.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js'
    s.parentNode.insertBefore(b, s)
  })(window.lintrk)
}

function initLinkedInTags(partnerIds) {
  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || []
  partnerIds.forEach((id) => {
    if (!window._linkedin_data_partner_ids.includes(id)) {
      window._linkedin_data_partner_ids.push(id)
    }
  })

  ensureLinkedInBaseLoaded()
  console.log('LinkedIn Tag initialized:', partnerIds)
}

// Google Analytics (GA4) initialization
function ensureGoogleAnalyticsBaseLoaded(primaryMeasurementId) {
  if (window.gtag) return

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${primaryMeasurementId}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  window.gtag = function() { window.dataLayer.push(arguments) }
  window.gtag('js', new Date())
}

function initGoogleAnalyticsIds(measurementIds) {
  if (!measurementIds.length) return
  ensureGoogleAnalyticsBaseLoaded(measurementIds[0])
  if (!window.gtag) return

  measurementIds.forEach((id) => {
    try {
      window.gtag('config', id)
    } catch (e) {
      console.warn('Google Analytics init error:', e)
    }
  })

  console.log('Google Analytics initialized:', measurementIds)
}

// Google Tag Manager initialization
function initGoogleTagManager(containerId) {
  if (window.google_tag_manager && window.google_tag_manager[containerId]) {
    return
  }

  ;(function(w, d, s, l, i) {
    w[l] = w[l] || []
    w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' })
    var f = d.getElementsByTagName(s)[0]
    var j = d.createElement(s)
    var dl = l !== 'dataLayer' ? '&l=' + l : ''
    j.async = true
    j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl
    f.parentNode.insertBefore(j, f)
  })(window, document, 'script', 'dataLayer', containerId)

  console.log('Google Tag Manager initialized:', containerId)
}

function initGoogleTagManagerIds(containerIds) {
  containerIds.forEach((id) => {
    try {
      initGoogleTagManager(id)
    } catch (e) {
      console.warn('Google Tag Manager init error:', e)
    }
  })
}

// Hotjar initialization
function initHotjar(hjid) {
  if (window.hj) {
    console.log('Hotjar already loaded')
    return
  }

  ;(function(h, o, t, j, a, r) {
    h.hj = h.hj || function() { (h.hj.q = h.hj.q || []).push(arguments) }
    h._hjSettings = { hjid: hjid, hjsv: 6 }
    a = o.getElementsByTagName('head')[0]
    r = o.createElement('script')
    r.async = 1
    r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv
    a.appendChild(r)
  })(window, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=')
  
  console.log('Hotjar initialized:', hjid)
}

// Microsoft Clarity initialization
function initClarity(projectId) {
  if (window.clarity) {
    console.log('Clarity already loaded')
    return
  }

  ;(function(c, l, a, r, i, t, y) {
    c[a] = c[a] || function() { (c[a].q = c[a].q || []).push(arguments) }
    t = l.createElement(r)
    t.async = 1
    t.src = "https://www.clarity.ms/tag/" + i
    y = l.getElementsByTagName(r)[0]
    y.parentNode.insertBefore(t, y)
  })(window, document, "clarity", "script", projectId)
  
  console.log('Microsoft Clarity initialized:', projectId)
}
