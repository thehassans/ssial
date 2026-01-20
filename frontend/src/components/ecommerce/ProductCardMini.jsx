import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../../api.js'
import { getCurrencyConfig, convert as fxConvert } from '../../util/currency'

// Taobao-style product card - compact with red prices and sales count
// Wrapped with memo for performance - prevents unnecessary re-renders
const ProductCardMini = memo(function ProductCardMini({ product, selectedCountry = 'SA', showVideo = false }) {
  const navigate = useNavigate()
  const [ccyCfg, setCcyCfg] = useState(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef(null)
  
  useEffect(() => {
    let alive = true
    getCurrencyConfig().then(cfg => { if (alive) setCcyCfg(cfg) }).catch(() => {})
    return () => { alive = false }
  }, [])

  const COUNTRY_TO_CURRENCY = {
    'AE': 'AED', 'OM': 'OMR', 'SA': 'SAR', 'BH': 'BHD', 'IN': 'INR', 'KW': 'KWD', 'QA': 'QAR',
    'PK': 'PKR', 'JO': 'JOD', 'US': 'USD', 'GB': 'GBP', 'CA': 'CAD', 'AU': 'AUD',
  }

  const getDisplayCurrency = () => COUNTRY_TO_CURRENCY[selectedCountry] || 'SAR'
  const convertPrice = (value, fromCurrency, toCurrency) => fxConvert(value, fromCurrency || 'SAR', toCurrency || getDisplayCurrency(), ccyCfg)

  const formatPrice = (price, currency = 'SAR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency, minimumFractionDigits: 2
    }).format(price)
  }

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http')) return imagePath
    let p = String(imagePath).replace(/\\/g, '/')
    if (!p.startsWith('/')) p = '/' + p
    try {
      const base = String(API_BASE || '').trim()
      if (!base) return p
      if (/^https?:\/\//i.test(base)) {
        const u = new URL(base)
        const prefix = u.pathname && u.pathname !== '/' ? u.pathname.replace(/\/$/, '') : ''
        return `${u.origin}${prefix}${p}`
      }
      return `${base.replace(/\/$/, '')}${p}`
    } catch { return p }
  }
  
  // Get the image URL, fallback to imagePath, then to null
  const imageUrl = getImageUrl(product.images?.[0] || product.imagePath)

  const basePrice = Number(product?.price) || 0
  // Apply sale price when salePrice exists and is less than regular price
  const salePriceVal = Number(product?.salePrice) || 0
  const hasActiveSale = salePriceVal > 0 && salePriceVal < basePrice
  const finalPrice = hasActiveSale ? salePriceVal : basePrice
  const displayCurrency = getDisplayCurrency()
  const convertedPrice = convertPrice(finalPrice, product.baseCurrency || 'SAR', displayCurrency)
  const showDiscount = hasActiveSale && basePrice > finalPrice

  const hasVideo = product?.video || product?.videoUrl || product?.videos?.length > 0
  const videoUrl = hasVideo ? getImageUrl(product.video || product.videoUrl || product.videos?.[0]) : null
  const hasNoImages = !imageUrl

  // Handle video play/pause
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying && hasVideo) {
        videoRef.current.play().catch(() => {})
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying, hasVideo])

  // Stop video when mouse leaves
  useEffect(() => {
    if (!isHovered && isPlaying) {
      setIsPlaying(false)
      if (videoRef.current) {
        videoRef.current.currentTime = 0
      }
    }
  }, [isHovered])
  
  // Cleanup: stop video on unmount (prevents audio continuing after navigation)
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.currentTime = 0
      }
    }
  }, [])
  
  // Handle play button click
  const handlePlayClick = (e) => {
    e.stopPropagation()
    setIsPlaying(prev => !prev)
  }
  
  // Handle card click - always navigate to product page
  const handleCardClick = () => {
    navigate(`/product/${product._id}`)
  }

  // Generate a pseudo-random sales count based on product ID for consistency
  const salesCount = useMemo(() => {
    if (product.salesCount) return product.salesCount
    // Generate consistent number from product ID
    let hash = 0
    const id = product._id || ''
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i)
      hash = hash & hash
    }
    return Math.abs(hash % 900) + 100 // 100-999 range
  }, [product._id, product.salesCount])

  // Calculate discount percentage
  const discountPercent = useMemo(() => {
    if (!hasActiveSale || basePrice <= 0) return 0
    return Math.round(((basePrice - finalPrice) / basePrice) * 100)
  }, [hasActiveSale, basePrice, finalPrice])

  return (
    <div 
      className="product-card-taobao"
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="image-container">
        {/* Video element - only render if showVideo prop is true */}
        {showVideo && hasVideo && videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            loop
            muted
            playsInline
            preload="metadata"
            poster={imageUrl || undefined}
            className={`video-player ${isPlaying ? 'visible' : ''}`}
          />
        )}
        
        {/* Image */}
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={product.name}
            loading="lazy"
            className={showVideo && isPlaying && hasVideo ? 'hidden' : ''}
            onError={(e) => {
              e.target.onerror = null
              e.target.src = '/placeholder-product.svg'
            }}
          />
        ) : (
          <div className="no-image-placeholder">
            <div className="placeholder-icon">📦</div>
          </div>
        )}
        
        {/* Play/Pause buttons when showVideo is true */}
        {showVideo && hasVideo && !isPlaying && (
          <button 
            className="video-play-btn"
            onClick={handlePlayClick}
            aria-label="Play video"
          >
            <svg viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
        )}
        {showVideo && hasVideo && isPlaying && (
          <button 
            className="video-pause-btn"
            onClick={handlePlayClick}
            aria-label="Pause video"
          >
            <svg viewBox="0 0 24 24" fill="white">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          </button>
        )}

        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="discount-badge">
            <span>-{discountPercent}%</span>
          </div>
        )}

        {/* Video indicator */}
        {hasVideo && !showVideo && (
          <div className="video-indicator">
            <svg viewBox="0 0 24 24" fill="white" width="14" height="14">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        
        <div className="price-section">
          <div className="price-row">
            <span className="currency-symbol">{displayCurrency}</span>
            <span className="price-main">{convertedPrice.toFixed(2).split('.')[0]}</span>
            <span className="price-decimal">.{convertedPrice.toFixed(2).split('.')[1]}</span>
            {showDiscount && (
              <span className="original-price">
                {convertPrice(basePrice, product.baseCurrency || 'SAR', displayCurrency).toFixed(0)}
              </span>
            )}
          </div>
          <div className="sales-count">
            <span>{salesCount} sold</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .product-card-taobao {
          background: white;
          border-radius: 0;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s ease;
          margin: 2px;
        }

        .product-card-taobao:active {
          transform: scale(0.98);
        }

        .image-container {
          position: relative;
          aspect-ratio: 1;
          background: #f5f5f5;
          overflow: hidden;
        }

        .image-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease, opacity 0.3s ease;
        }

        .image-container img.hidden {
          opacity: 0;
        }

        .video-player {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: 1;
        }

        .video-player.visible {
          opacity: 1;
        }

        .video-play-btn,
        .video-pause-btn {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          background: rgba(0,0,0,0.5);
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
        }

        .video-play-btn svg,
        .video-pause-btn svg {
          width: 18px;
          height: 18px;
          margin-left: 2px;
        }

        .discount-badge {
          position: absolute;
          top: 0;
          left: 0;
          background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%);
          color: white;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 0 0 8px 0;
        }

        .video-indicator {
          position: absolute;
          bottom: 6px;
          right: 6px;
          width: 22px;
          height: 22px;
          background: rgba(0,0,0,0.5);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .video-indicator svg {
          margin-left: 1px;
        }

        .no-image-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f0f0;
        }

        .placeholder-icon {
          font-size: 40px;
          opacity: 0.3;
        }

        .product-info {
          padding: 8px 10px 10px;
        }

        .product-name {
          font-size: 13px;
          font-weight: 400;
          color: #333;
          margin: 0 0 8px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.4;
        }

        .price-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .price-row {
          display: flex;
          align-items: baseline;
          gap: 2px;
          flex-wrap: wrap;
        }

        .currency-symbol {
          font-size: 12px;
          font-weight: 600;
          color: #ff4d4f;
        }

        .price-main {
          font-size: 18px;
          font-weight: 700;
          color: #ff4d4f;
          line-height: 1;
        }

        .price-decimal {
          font-size: 12px;
          font-weight: 600;
          color: #ff4d4f;
        }

        .original-price {
          font-size: 11px;
          color: #999;
          text-decoration: line-through;
          margin-left: 6px;
        }

        .sales-count {
          font-size: 11px;
          color: #999;
        }

        .sales-count span {
          display: inline-flex;
          align-items: center;
        }

        /* Responsive adjustments */
        @media (max-width: 480px) {
          .product-card-taobao {
            margin: 2px;
          }
          
          .product-info {
            padding: 6px 8px 8px;
          }
          
          .product-name {
            font-size: 12px;
          }
          
          .price-main {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  )
})

export default ProductCardMini
