import React, { useEffect, useState, useRef, memo, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../../api'
import ProductCardMini from './ProductCardMini'

// Simple in-memory cache for API responses
const apiCache = new Map()
const CACHE_TTL = 60000 // 1 minute cache

const cachedApiGet = async (endpoint) => {
  const cached = apiCache.get(endpoint)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  const data = await apiGet(endpoint)
  apiCache.set(endpoint, { data, timestamp: Date.now() })
  return data
}

export default memo(function HorizontalProductSection({ 
  title, 
  filter, // 'trending', 'superDeals', 'topSelling'
  apiEndpoint, // custom endpoint if needed
  bgGradient = 'from-orange-400 to-orange-500',
  selectedCountry,
  limit = 10,
  showVideo = false,
  autoScroll = true // Enable auto-scrolling by default
}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const qs = new URLSearchParams()
        qs.set('page', '1')
        qs.set('limit', String(limit))
        if (filter) qs.set('filter', filter)
        
        const endpoint = apiEndpoint || `/api/products/public?${qs.toString()}`
        const res = await cachedApiGet(endpoint)
        let list = Array.isArray(res?.products) ? res.products : []
        
        // Filter for video products if showVideo is true
        if (showVideo) {
          list = list.filter(p => p.video || p.videoUrl || p.videos?.length > 0)
        }
        
        // Remix products so same category not back to back
        if (list.length > 2) {
          const remixed = []
          const byCategory = {}
          list.forEach(p => {
            const cat = p.category || 'Other'
            if (!byCategory[cat]) byCategory[cat] = []
            byCategory[cat].push(p)
          })
          const categories = Object.keys(byCategory)
          let catIndex = 0
          while (remixed.length < list.length) {
            const cat = categories[catIndex % categories.length]
            if (byCategory[cat].length > 0) {
              remixed.push(byCategory[cat].shift())
            }
            catIndex++
            // Prevent infinite loop if one category is empty
            if (categories.every(c => byCategory[c].length === 0)) break
          }
          list = remixed
        }
        
        if (alive) setProducts(list)
      } catch {
        if (alive) setProducts([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [filter, limit, apiEndpoint, showVideo])

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setCanScrollLeft(scrollLeft > 10)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (el) {
      el.addEventListener('scroll', checkScroll)
      return () => el.removeEventListener('scroll', checkScroll)
    }
  }, [products])

  // Auto-scroll effect
  useEffect(() => {
    if (!autoScroll || loading || products.length === 0 || isPaused) return
    
    const el = scrollRef.current
    if (!el) return

    const scrollSpeed = 1 // pixels per frame
    let animationId

    const animate = () => {
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth) {
        el.scrollLeft = 0 // Reset to start
      } else {
        el.scrollLeft += scrollSpeed
      }
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
    }
  }, [autoScroll, loading, products.length, isPaused])

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 300
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  if (products.length === 0 && !loading) return null

  return (
    <section className="horizontal-product-section">
      {/* Ultra Premium Header */}
      <div className={`section-header bg-gradient-to-r ${bgGradient}`}>
        <div className="header-content">
          <div className="title-wrapper">
            <span className="title-icon">
              {title === 'Trending Products' && '🔥'}
              {title === 'Super Deals' && '⚡'}
              {title === 'Top Selling' && '🏆'}
            </span>
            <h2 className="section-title">{title}</h2>
          </div>
          <p className="section-subtitle">
            {title === 'Trending Products' && 'Hot items everyone loves'}
            {title === 'Super Deals' && 'Limited time offers'}
            {title === 'Top Selling' && 'Best sellers this week'}
          </p>
        </div>
        <button 
          className="scroll-arrow right-arrow"
          onClick={() => scroll('right')}
          style={{ opacity: canScrollRight ? 1 : 0.3 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Products Container */}
      <div 
        className="products-wrapper"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setTimeout(() => setIsPaused(false), 2000)}
      >
        {/* Left Arrow */}
        {canScrollLeft && (
          <button className="nav-arrow left" onClick={() => scroll('left')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Products Scroll */}
        <div className="products-scroll" ref={scrollRef}>
          {loading ? (
            <div className="loading-state">
              {[1,2,3,4].map(i => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton-image"></div>
                  <div className="skeleton-text"></div>
                  <div className="skeleton-price"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="products-row">
              {products.map(p => (
                <div key={p._id} className="product-item">
                  <ProductCardMini 
                    product={p} 
                    selectedCountry={selectedCountry}
                    showVideo={showVideo}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Arrow */}
        {canScrollRight && !loading && (
          <button className="nav-arrow right" onClick={() => scroll('right')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      <style jsx>{`
        .horizontal-product-section {
          margin: 4px 0;
          background: #f4f4f4;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: none;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          color: white;
          border-radius: 16px 16px 0 0;
        }

        .header-content {
          flex: 1;
        }

        .title-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .title-icon {
          font-size: 20px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }

        .section-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
          text-shadow: 0 2px 4px rgba(0,0,0,0.15);
          letter-spacing: -0.3px;
        }

        .section-subtitle {
          font-size: 12px;
          margin: 4px 0 0 0;
          opacity: 0.9;
          font-weight: 400;
        }

        .scroll-arrow {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255,255,255,0.25);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .scroll-arrow:hover {
          background: rgba(255,255,255,0.4);
        }

        .scroll-arrow svg {
          width: 18px;
          height: 18px;
          color: white;
        }

        .products-wrapper {
          position: relative;
          padding: 8px 0;
        }

        .nav-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: white;
          border: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
          transition: all 0.2s;
        }

        .nav-arrow:hover {
          transform: translateY(-50%) scale(1.1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .nav-arrow.left {
          left: 8px;
        }

        .nav-arrow.right {
          right: 8px;
        }

        .nav-arrow svg {
          width: 20px;
          height: 20px;
          color: #f97316;
        }

        .products-scroll {
          overflow-x: auto;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .products-scroll::-webkit-scrollbar {
          display: none;
        }

        .products-row {
          display: flex;
          gap: 6px;
          padding: 0 8px;
        }

        .product-item {
          flex: 0 0 140px;
          min-width: 140px;
        }

        .loading-state {
          display: flex;
          gap: 6px;
          padding: 0 8px;
        }

        .skeleton-card {
          flex: 0 0 140px;
          background: #f8fafc;
          border-radius: 12px;
          overflow: hidden;
        }

        .skeleton-image {
          height: 140px;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        .skeleton-text {
          height: 12px;
          margin: 10px 10px 6px;
          background: #e2e8f0;
          border-radius: 4px;
        }

        .skeleton-price {
          height: 14px;
          width: 60%;
          margin: 0 10px 10px;
          background: #e2e8f0;
          border-radius: 4px;
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        @media (min-width: 768px) {
          .product-item {
            flex: 0 0 180px;
            min-width: 180px;
          }

          .section-title {
            font-size: 18px;
          }
        }
      `}</style>
    </section>
  )
})
