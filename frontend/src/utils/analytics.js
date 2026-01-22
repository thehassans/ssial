// Analytics utility for tracking user behavior and product interactions
class Analytics {
  constructor() {
    this.events = []
    this.sessionId = this.generateSessionId()
    this.userId = this.getUserId()
    this.startTime = Date.now()
    this.lastPageView = null
    this.pageViewDebounceMs = 500 // Debounce page views
  }

  // Check if TikTok event is enabled in settings
  isTikTokEventEnabled(eventKey) {
    const events = window._tiktokEvents || {}
    // Default to true if not configured
    return events[eventKey] !== false
  }

  // TikTok Pixel helper - safely call ttq methods with event checking
  ttqTrack(eventName, params = {}, eventKey = null) {
    if (typeof window !== 'undefined' && window.ttq) {
      // Check if this event type is enabled
      if (eventKey && !this.isTikTokEventEnabled(eventKey)) {
        return // Event disabled in settings
      }
      try {
        const ids = Array.isArray(window._tiktokPixelIds) ? window._tiktokPixelIds : []
        if (ids.length && typeof window.ttq.instance === 'function') {
          ids.forEach((id) => {
            try {
              window.ttq.instance(id).track(eventName, params)
            } catch (e) {
              console.warn('TikTok Pixel tracking error:', e)
            }
          })
        } else {
          window.ttq.track(eventName, params)
        }
      } catch (e) {
        console.warn('TikTok Pixel tracking error:', e)
      }
    }
  }

  // Facebook Pixel helper - safely call fbq methods
  fbqTrack(eventName, params = {}) {
    if (typeof window !== 'undefined' && window.fbq) {
      try {
        window.fbq('track', eventName, params)
      } catch (e) {
        console.warn('Facebook Pixel tracking error:', e)
      }
    }
  }

  // Snapchat Pixel helper
  snaptrTrack(eventName, params = {}) {
    if (typeof window !== 'undefined' && window.snaptr) {
      try {
        window.snaptr('track', eventName, params)
      } catch (e) {
        console.warn('Snapchat Pixel tracking error:', e)
      }
    }
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  getUserId() {
    let userId = localStorage.getItem('analytics_user_id')
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('analytics_user_id', userId)
    }
    return userId
  }

  // Track page views (debounced to prevent spam)
  trackPageView(page, title = '') {
    const now = Date.now()
    const key = `${page}|${title}`
    
    // Skip if same page view within debounce period
    if (this.lastPageView && this.lastPageView.key === key && 
        now - this.lastPageView.time < this.pageViewDebounceMs) {
      return
    }
    
    this.lastPageView = { key, time: now }
    
    this.trackEvent('page_view', {
      page,
      title,
      timestamp: now,
      url: window.location.href
    })
  }

  // Track product views
  trackProductView(productId, productName, category, price) {
    this.trackEvent('product_view', {
      product_id: productId,
      product_name: productName,
      category,
      price,
      timestamp: Date.now()
    })
    
    // TikTok Pixel - ViewContent event (checks if enabled)
    this.ttqTrack('ViewContent', {
      content_id: String(productId),
      content_type: 'product',
      content_name: productName,
      content_category: category,
      price: Number(price) || 0,
      currency: 'SAR'
    }, 'viewContent')

    // Facebook Pixel - ViewContent event
    this.fbqTrack('ViewContent', {
      content_ids: [String(productId)],
      content_type: 'product',
      content_name: productName,
      content_category: category,
      value: Number(price) || 0,
      currency: 'SAR'
    })

    // Snapchat Pixel - VIEW_CONTENT event
    this.snaptrTrack('VIEW_CONTENT', {
      item_ids: [String(productId)],
      item_category: category,
      price: Number(price) || 0,
      currency: 'SAR'
    })
  }

  // Track add to cart events
  trackAddToCart(productId, productName, price, quantity = 1) {
    const totalValue = (Number(price) || 0) * (Number(quantity) || 1)
    
    this.trackEvent('add_to_cart', {
      product_id: productId,
      product_name: productName,
      price,
      quantity,
      timestamp: Date.now()
    })
    
    // TikTok Pixel - AddToCart event (checks if enabled)
    this.ttqTrack('AddToCart', {
      content_id: String(productId),
      content_type: 'product',
      content_name: productName,
      quantity: Number(quantity) || 1,
      price: Number(price) || 0,
      value: totalValue,
      currency: 'SAR'
    }, 'addToCart')

    // Facebook Pixel - AddToCart event
    this.fbqTrack('AddToCart', {
      content_ids: [String(productId)],
      content_type: 'product',
      content_name: productName,
      value: totalValue,
      currency: 'SAR'
    })

    // Snapchat Pixel - ADD_CART event
    this.snaptrTrack('ADD_CART', {
      item_ids: [String(productId)],
      price: totalValue,
      currency: 'SAR'
    })
  }

  // Track remove from cart events
  trackRemoveFromCart(productId, productName, quantity = 1) {
    this.trackEvent('remove_from_cart', {
      product_id: productId,
      product_name: productName,
      quantity,
      timestamp: Date.now()
    })
  }

  // Track search events
  trackSearch(query, resultsCount = 0) {
    this.trackEvent('search', {
      query,
      results_count: resultsCount,
      timestamp: Date.now()
    })

    // TikTok Pixel - Search event (checks if enabled)
    this.ttqTrack('Search', {
      query: query,
      content_type: 'product'
    }, 'search')

    // Facebook Pixel - Search event
    this.fbqTrack('Search', {
      search_string: query,
      content_type: 'product'
    })

    // Snapchat Pixel - SEARCH event
    this.snaptrTrack('SEARCH', {
      search_string: query
    })
  }

  // Track checkout events
  trackCheckoutStart(cartValue, itemCount) {
    const value = Number(cartValue) || 0
    const quantity = Number(itemCount) || 1

    this.trackEvent('checkout_start', {
      cart_value: value,
      item_count: quantity,
      timestamp: Date.now()
    })
    
    // TikTok Pixel - InitiateCheckout event (checks if enabled)
    this.ttqTrack('InitiateCheckout', {
      content_type: 'product',
      quantity: quantity,
      value: value,
      currency: 'SAR'
    }, 'initiateCheckout')

    // Facebook Pixel - InitiateCheckout event
    this.fbqTrack('InitiateCheckout', {
      content_type: 'product',
      num_items: quantity,
      value: value,
      currency: 'SAR'
    })

    // Snapchat Pixel - START_CHECKOUT event
    this.snaptrTrack('START_CHECKOUT', {
      price: value,
      currency: 'SAR',
      number_items: quantity
    })
  }

  trackCheckoutComplete(orderId, cartValue, itemCount, paymentMethod) {
    const value = Number(cartValue) || 0
    const quantity = Number(itemCount) || 1

    this.trackEvent('checkout_complete', {
      order_id: orderId,
      cart_value: value,
      item_count: quantity,
      payment_method: paymentMethod,
      timestamp: Date.now()
    })
    
    // TikTok Pixel - CompletePayment event (checks if enabled)
    this.ttqTrack('CompletePayment', {
      content_type: 'product',
      quantity: quantity,
      value: value,
      currency: 'SAR'
    }, 'completePayment')

    // Facebook Pixel - Purchase event
    this.fbqTrack('Purchase', {
      content_type: 'product',
      num_items: quantity,
      value: value,
      currency: 'SAR'
    })

    // Snapchat Pixel - PURCHASE event
    this.snaptrTrack('PURCHASE', {
      price: value,
      currency: 'SAR',
      transaction_id: String(orderId),
      number_items: quantity
    })
  }

  // Track filter usage
  trackFilterUsage(filterType, filterValue) {
    this.trackEvent('filter_usage', {
      filter_type: filterType,
      filter_value: filterValue,
      timestamp: Date.now()
    })
  }

  // Track sort usage
  trackSortUsage(sortBy) {
    this.trackEvent('sort_usage', {
      sort_by: sortBy,
      timestamp: Date.now()
    })
  }

  // Generic event tracking
  trackEvent(eventName, properties = {}) {
    const event = {
      event_name: eventName,
      session_id: this.sessionId,
      user_id: this.userId,
      timestamp: Date.now(),
      properties: {
        ...properties,
        user_agent: navigator.userAgent,
        screen_resolution: `${screen.width}x${screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        referrer: document.referrer,
        language: navigator.language
      }
    }

    this.events.push(event)
    
    // Store events in localStorage for persistence
    this.saveEventsToStorage()
    
    // Send to analytics service (if configured)
    this.sendToAnalyticsService(event)
    
    // console.log('Analytics Event:', event) // Disabled to reduce console spam
  }

  // Save events to localStorage
  saveEventsToStorage() {
    try {
      const existingEvents = JSON.parse(localStorage.getItem('analytics_events') || '[]')
      const allEvents = [...existingEvents, ...this.events]
      
      // Keep only last 1000 events to prevent storage overflow
      const recentEvents = allEvents.slice(-1000)
      
      localStorage.setItem('analytics_events', JSON.stringify(recentEvents))
      this.events = [] // Clear current events after saving
    } catch (error) {
      console.error('Error saving analytics events:', error)
    }
  }

  // Send events to analytics service (placeholder for future integration)
  sendToAnalyticsService(event) {
    // This is where you would send events to your analytics service
    // Examples: Google Analytics, Mixpanel, Amplitude, etc.
    
    // For now, we'll just log to console
    // In production, you might want to batch events and send them periodically
    
    if (window.gtag) {
      // Google Analytics 4 example
      window.gtag('event', event.event_name, event.properties)
    }
    
    // You could also send to your own analytics endpoint
    // fetch('/api/analytics', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(event)
    // }).catch(console.error)
  }

  // Get all stored events
  getAllEvents() {
    try {
      return JSON.parse(localStorage.getItem('analytics_events') || '[]')
    } catch (error) {
      console.error('Error retrieving analytics events:', error)
      return []
    }
  }

  // Clear all stored events
  clearEvents() {
    localStorage.removeItem('analytics_events')
    this.events = []
  }

  // Get session summary
  getSessionSummary() {
    const events = this.getAllEvents()
    const sessionEvents = events.filter(event => event.session_id === this.sessionId)
    
    return {
      session_id: this.sessionId,
      user_id: this.userId,
      start_time: this.startTime,
      duration: Date.now() - this.startTime,
      event_count: sessionEvents.length,
      page_views: sessionEvents.filter(e => e.event_name === 'page_view').length,
      product_views: sessionEvents.filter(e => e.event_name === 'product_view').length,
      add_to_cart_events: sessionEvents.filter(e => e.event_name === 'add_to_cart').length,
      searches: sessionEvents.filter(e => e.event_name === 'search').length
    }
  }

  // Track Thank You page conversion
  trackThankYouPageConversion(orderId, orderValue, itemCount, items = []) {
    const settings = window._thankYouPageSettings || {}
    const conversionPixels = settings.conversionPixels || {}
    const value = Number(orderValue) || 0
    const quantity = Number(itemCount) || 1

    // Only track if enabled
    if (!settings.enabled) return

    // TikTok Pixel - CompletePayment for thank you page
    if (conversionPixels.tiktok && window.ttq) {
      try {
        const params = {
          content_type: 'product',
          content_ids: items.map(i => String(i.id || i.productId)),
          quantity: quantity,
          value: value,
          currency: 'SAR'
        }

        const ids = Array.isArray(window._tiktokPixelIds) ? window._tiktokPixelIds : []
        if (ids.length && typeof window.ttq.instance === 'function') {
          ids.forEach((id) => {
            try {
              window.ttq.instance(id).track('CompletePayment', params)
            } catch (e) {
              console.warn('TikTok thank you page tracking error:', e)
            }
          })
        } else {
          window.ttq.track('CompletePayment', params)
        }
      } catch (e) {
        console.warn('TikTok thank you page tracking error:', e)
      }
    }

    // Facebook Pixel - Purchase for thank you page
    if (conversionPixels.facebook && window.fbq) {
      try {
        window.fbq('track', 'Purchase', {
          content_type: 'product',
          content_ids: items.map(i => String(i.id || i.productId)),
          num_items: quantity,
          value: value,
          currency: 'SAR'
        })
      } catch (e) {
        console.warn('Facebook thank you page tracking error:', e)
      }
    }

    // Snapchat Pixel - PURCHASE for thank you page
    if (conversionPixels.snapchat && window.snaptr) {
      try {
        window.snaptr('track', 'PURCHASE', {
          item_ids: items.map(i => String(i.id || i.productId)),
          price: value,
          currency: 'SAR',
          number_items: quantity,
          transaction_id: orderId
        })
      } catch (e) {
        console.warn('Snapchat thank you page tracking error:', e)
      }
    }

    // Pinterest Tag - Checkout for thank you page
    if (conversionPixels.pinterest && window.pintrk) {
      try {
        window.pintrk('track', 'checkout', {
          order_id: orderId,
          value: value,
          order_quantity: quantity,
          currency: 'SAR'
        })
      } catch (e) {
        console.warn('Pinterest thank you page tracking error:', e)
      }
    }

    // Google Analytics - Purchase for thank you page
    if (conversionPixels.google && window.gtag) {
      try {
        window.gtag('event', 'purchase', {
          transaction_id: orderId,
          value: value,
          currency: 'SAR',
          items: items.map(i => ({
            item_id: String(i.id || i.productId),
            item_name: i.name,
            price: i.price,
            quantity: i.quantity || 1
          }))
        })
      } catch (e) {
        console.warn('Google Analytics thank you page tracking error:', e)
      }
    }

    // Log conversion
    this.trackEvent('thank_you_page_conversion', {
      order_id: orderId,
      order_value: value,
      item_count: quantity,
      pixels_fired: Object.keys(conversionPixels).filter(k => conversionPixels[k]),
      timestamp: Date.now()
    })
  }

  // Track wishlist additions
  trackAddToWishlist(productId, productName, price) {
    this.trackEvent('add_to_wishlist', {
      product_id: productId,
      product_name: productName,
      price,
      timestamp: Date.now()
    })

    // TikTok Pixel - AddToWishlist (checks if enabled)
    this.ttqTrack('AddToWishlist', {
      content_id: String(productId),
      content_type: 'product',
      content_name: productName,
      price: Number(price) || 0,
      currency: 'SAR'
    }, 'addToWishlist')

    // Facebook Pixel - AddToWishlist
    this.fbqTrack('AddToWishlist', {
      content_ids: [String(productId)],
      content_type: 'product',
      content_name: productName,
      value: Number(price) || 0,
      currency: 'SAR'
    })
  }

  // Track contact/form submissions
  trackContact(formType = 'contact') {
    this.trackEvent('contact', {
      form_type: formType,
      timestamp: Date.now()
    })

    // TikTok Pixel - Contact (checks if enabled)
    this.ttqTrack('Contact', {}, 'contact')

    // Facebook Pixel - Contact
    this.fbqTrack('Contact')
  }

  // Track form submissions
  trackFormSubmit(formName) {
    this.trackEvent('form_submit', {
      form_name: formName,
      timestamp: Date.now()
    })

    // TikTok Pixel - SubmitForm (checks if enabled)
    this.ttqTrack('SubmitForm', {
      form_name: formName
    }, 'submitForm')

    // Facebook Pixel - Lead
    this.fbqTrack('Lead', {
      content_name: formName
    })
  }

  // Track newsletter subscription
  trackSubscribe(email = '') {
    this.trackEvent('subscribe', {
      timestamp: Date.now()
    })

    // TikTok Pixel - Subscribe (checks if enabled)
    this.ttqTrack('Subscribe', {}, 'subscribe')

    // Facebook Pixel - Subscribe
    this.fbqTrack('Subscribe')
  }
}

// Create and export a singleton instance
const analytics = new Analytics()

export default analytics

// Export individual tracking functions for convenience
export const trackPageView = (page, title) => analytics.trackPageView(page, title)
export const trackProductView = (productId, productName, category, price) => 
  analytics.trackProductView(productId, productName, category, price)
export const trackAddToCart = (productId, productName, price, quantity) => 
  analytics.trackAddToCart(productId, productName, price, quantity)
export const trackRemoveFromCart = (productId, productName, quantity) => 
  analytics.trackRemoveFromCart(productId, productName, quantity)
export const trackSearch = (query, resultsCount) => analytics.trackSearch(query, resultsCount)
export const trackCheckoutStart = (cartValue, itemCount) => analytics.trackCheckoutStart(cartValue, itemCount)
export const trackCheckoutComplete = (orderId, cartValue, itemCount, paymentMethod) => 
  analytics.trackCheckoutComplete(orderId, cartValue, itemCount, paymentMethod)
export const trackFilterUsage = (filterType, filterValue) => analytics.trackFilterUsage(filterType, filterValue)
export const trackSortUsage = (sortBy) => analytics.trackSortUsage(sortBy)
export const trackThankYouPageConversion = (orderId, orderValue, itemCount, items) =>
  analytics.trackThankYouPageConversion(orderId, orderValue, itemCount, items)
export const trackAddToWishlist = (productId, productName, price) =>
  analytics.trackAddToWishlist(productId, productName, price)
export const trackContact = (formType) => analytics.trackContact(formType)
export const trackFormSubmit = (formName) => analytics.trackFormSubmit(formName)
export const trackSubscribe = (email) => analytics.trackSubscribe(email)