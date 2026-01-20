import { useEffect, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { apiGet } from '../api.js'

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
        const res = await apiGet('/api/settings/seo')
        if (!alive || !res?.seo) return
        
        const seo = res.seo

        // TikTok Pixel
        if (seo.tiktokPixel && seo.tiktokPixel.trim()) {
          initTikTokPixel(seo.tiktokPixel.trim())
          // Store pixel ID for later use
          window._tiktokPixelId = seo.tiktokPixel.trim()
        }

        // Facebook/Meta Pixel
        if (seo.facebookPixel && seo.facebookPixel.trim()) {
          initFacebookPixel(seo.facebookPixel.trim())
        }

        // Snapchat Pixel
        if (seo.snapchatPixel && seo.snapchatPixel.trim()) {
          initSnapchatPixel(seo.snapchatPixel.trim())
        }

        // Twitter/X Pixel
        if (seo.twitterPixel && seo.twitterPixel.trim()) {
          initTwitterPixel(seo.twitterPixel.trim())
        }

        // Pinterest Tag
        if (seo.pinterestTag && seo.pinterestTag.trim()) {
          initPinterestTag(seo.pinterestTag.trim())
        }

        // LinkedIn Tag
        if (seo.linkedinTag && seo.linkedinTag.trim()) {
          initLinkedInTag(seo.linkedinTag.trim())
        }

        // Google Analytics
        if (seo.googleAnalytics && seo.googleAnalytics.trim()) {
          initGoogleAnalytics(seo.googleAnalytics.trim())
        }

        // Google Tag Manager
        if (seo.googleTagManager && seo.googleTagManager.trim()) {
          initGoogleTagManager(seo.googleTagManager.trim())
        }

        // Hotjar
        if (seo.hotjarId && seo.hotjarId.trim()) {
          initHotjar(seo.hotjarId.trim())
        }

        // Microsoft Clarity
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
      window.ttq.page()
    } catch (e) {
      console.warn('TikTok page tracking error:', e)
    }
  }

  // Facebook Pixel page view
  if (window.fbq) {
    try {
      window.fbq('track', 'PageView')
    } catch (e) {
      console.warn('Facebook page tracking error:', e)
    }
  }

  // Snapchat Pixel page view
  if (window.snaptr) {
    try {
      window.snaptr('track', 'PAGE_VIEW')
    } catch (e) {
      console.warn('Snapchat page tracking error:', e)
    }
  }

  // Pinterest page view
  if (window.pintrk) {
    try {
      window.pintrk('page')
    } catch (e) {
      console.warn('Pinterest page tracking error:', e)
    }
  }

  // Google Analytics page view (handled automatically by react-router usually)
  if (window.gtag) {
    try {
      window.gtag('event', 'page_view', { page_path: pathname })
    } catch (e) {
      console.warn('Google Analytics page tracking error:', e)
    }
  }
}

// TikTok Pixel initialization
function initTikTokPixel(pixelId) {
  if (window.ttq) {
    console.log('TikTok Pixel already loaded')
    return
  }

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
      ttq._i[e] = []
      ttq._i[e]._u = r
      ttq._t = ttq._t || {}
      ttq._t[e] = +new Date()
      ttq._o = ttq._o || {}
      ttq._o[e] = n || {}
      var i = document.createElement("script")
      i.type = "text/javascript"
      i.async = true
      i.src = r + "?sdkid=" + e + "&lib=" + t
      var a = document.getElementsByTagName("script")[0]
      a.parentNode.insertBefore(i, a)
    }
    ttq.load(pixelId)
    ttq.page()
  })(window, document, 'ttq')
  
  console.log('TikTok Pixel initialized:', pixelId)
}

// Facebook/Meta Pixel initialization
function initFacebookPixel(pixelId) {
  if (window.fbq) {
    console.log('Facebook Pixel already loaded')
    return
  }

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
  
  window.fbq('init', pixelId)
  window.fbq('track', 'PageView')
  
  console.log('Facebook Pixel initialized:', pixelId)
}

// Snapchat Pixel initialization
function initSnapchatPixel(pixelId) {
  if (window.snaptr) {
    console.log('Snapchat Pixel already loaded')
    return
  }

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
  
  window.snaptr('init', pixelId, {})
  window.snaptr('track', 'PAGE_VIEW')
  
  console.log('Snapchat Pixel initialized:', pixelId)
}

// Twitter/X Pixel initialization
function initTwitterPixel(pixelId) {
  if (window.twq) {
    console.log('Twitter Pixel already loaded')
    return
  }

  ;(function(e, t, n, s, u, a) {
    e.twq || (s = e.twq = function() {
      s.exe ? s.exe.apply(s, arguments) : s.queue.push(arguments)
    }, s.version = '1.1', s.queue = [], u = t.createElement(n), u.async = true, u.src = 'https://static.ads-twitter.com/uwt.js',
    a = t.getElementsByTagName(n)[0], a.parentNode.insertBefore(u, a))
  })(window, document, 'script')
  
  window.twq('config', pixelId)
  
  console.log('Twitter Pixel initialized:', pixelId)
}

// Pinterest Tag initialization
function initPinterestTag(tagId) {
  if (window.pintrk) {
    console.log('Pinterest Tag already loaded')
    return
  }

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
  
  window.pintrk('load', tagId)
  window.pintrk('page')
  
  console.log('Pinterest Tag initialized:', tagId)
}

// LinkedIn Insight Tag initialization
function initLinkedInTag(partnerId) {
  if (window._linkedin_data_partner_ids) {
    console.log('LinkedIn Tag already loaded')
    return
  }

  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || []
  window._linkedin_data_partner_ids.push(partnerId)
  
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
  
  console.log('LinkedIn Tag initialized:', partnerId)
}

// Google Analytics (GA4) initialization
function initGoogleAnalytics(measurementId) {
  if (window.gtag) {
    console.log('Google Analytics already loaded')
    return
  }

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  document.head.appendChild(script)
  
  window.dataLayer = window.dataLayer || []
  window.gtag = function() { window.dataLayer.push(arguments) }
  window.gtag('js', new Date())
  window.gtag('config', measurementId)
  
  console.log('Google Analytics initialized:', measurementId)
}

// Google Tag Manager initialization
function initGoogleTagManager(containerId) {
  if (window.google_tag_manager && window.google_tag_manager[containerId]) {
    console.log('Google Tag Manager already loaded')
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
