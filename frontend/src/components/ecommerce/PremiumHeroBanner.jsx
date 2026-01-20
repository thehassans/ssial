import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'

export default function PremiumHeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [imagesLoaded, setImagesLoaded] = useState([false, false, false])
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const cacheBuster = 'v4'
  // Use absolute URL for Capacitor mobile app
  const isCapacitor = typeof window !== 'undefined' && typeof window.Capacitor !== 'undefined'
  const baseUrl = isCapacitor ? 'https://buysial.com/' : (import.meta.env.BASE_URL || '/')
  
  const slides = [
    {
      bgImage: `${baseUrl}banners/banner1.jpg?${cacheBuster}`,
      fallbackGradient: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%)',
    },
    {
      bgImage: `${baseUrl}banners/banner2.jpg?${cacheBuster}`,
      fallbackGradient: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 50%, #e1f5fe 100%)',
    },
    {
      bgImage: `${baseUrl}banners/banner3.jpg?${cacheBuster}`,
      fallbackGradient: 'linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 50%, #e8eef4 100%)',
    },
  ]

  // Preload images
  useEffect(() => {
    slides.forEach((slide, idx) => {
      const img = new Image()
      img.onload = () => {
        setImagesLoaded(prev => {
          const next = [...prev]
          next[idx] = true
          return next
        })
      }
      img.src = slide.bgImage
    })
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [slides.length])

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setCurrentSlide((prev) => (prev + 1) % slides.length)
      } else {
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
      }
    }
  }

  return (
    <div 
      className="premium-hero-banner"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Slides */}
      <div className="hero-slides">
        {slides.map((slide, idx) => (
          <div 
            key={idx}
            className={`hero-slide ${idx === currentSlide ? 'active' : ''}`}
            style={{ 
              backgroundImage: imagesLoaded[idx] ? `url(${slide.bgImage})` : 'none',
              backgroundColor: !imagesLoaded[idx] ? '#f8fafc' : 'transparent'
            }}
          >
            {!imagesLoaded[idx] && (
              <div className="slide-fallback" style={{ background: slide.fallbackGradient }}></div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button 
        className="slide-nav prev" 
        onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
        aria-label="Previous slide"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button 
        className="slide-nav next" 
        onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
        aria-label="Next slide"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      
      {/* Dropshipping CTA - Desktop Only */}
      <div className="dropship-cta">
        <Link to="/dropshipper/signup" className="dropship-link">
          <span className="dropship-text">Want to do dropshipping?</span>
          <span className="dropship-action">Create Free Account →</span>
        </Link>
      </div>

      <style jsx>{`
        .premium-hero-banner {
          position: relative;
          width: 100%;
          height: 280px;
          overflow: hidden;
          background: #f8fafc;
        }

        .hero-slides {
          position: absolute;
          inset: 0;
        }

        .hero-slide {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 0;
          transition: opacity 0.8s ease-in-out;
        }

        @media (min-width: 640px) {
          .premium-hero-banner {
            height: 350px;
          }
        }

        @media (min-width: 768px) {
          .premium-hero-banner {
            height: 400px;
          }
        }

        @media (min-width: 1024px) {
          .premium-hero-banner {
            height: 450px;
          }
        }

        @media (min-width: 1280px) {
          .premium-hero-banner {
            height: 500px;
          }
        }

        .hero-slide.active {
          opacity: 1;
        }

        .slide-fallback {
          position: absolute;
          inset: 0;
        }

        /* Navigation Arrows */
        .slide-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 20;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.9);
          border: none;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.3s ease;
          color: #1e293b;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .slide-nav:hover {
          background: #f97316;
          color: white;
          transform: translateY(-50%) scale(1.1);
        }

        .slide-nav svg {
          width: 20px;
          height: 20px;
        }

        .slide-nav.prev { left: 16px; }
        .slide-nav.next { right: 16px; }

        /* Slide Indicators */
        .slide-indicators {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
          z-index: 15;
        }

        .indicator {
          width: 32px;
          height: 4px;
          background: rgba(255,255,255,0.5);
          border: none;
          border-radius: 2px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .indicator.active {
          background: #f97316;
          width: 48px;
        }

        .indicator:hover {
          background: rgba(255,255,255,0.8);
        }

        /* Dropshipping CTA - Desktop Only */
        .dropship-cta {
          position: absolute;
          bottom: 50px;
          right: 16px;
          z-index: 15;
        }

        .dropship-link {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          text-decoration: none;
          padding: 10px 14px;
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(8px);
          border-radius: 10px;
          border: 1px solid rgba(0,0,0,0.06);
          transition: all 0.2s ease;
        }

        .dropship-link:hover {
          background: rgba(255,255,255,0.95);
          transform: translateY(-2px);
        }

        .dropship-text {
          font-size: 11px;
          font-weight: 400;
          color: #6b7280;
          margin-bottom: 2px;
        }

        .dropship-action {
          font-size: 13px;
          font-weight: 600;
          color: #f97316;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .premium-hero-banner {
            aspect-ratio: 16/8;
            max-height: none;
            height: auto;
          }

          .hero-slide {
            background-position: center;
            background-size: cover;
          }

          .slide-nav {
            width: 28px;
            height: 28px;
            display: none;
          }

          .slide-nav.prev { left: 4px; }
          .slide-nav.next { right: 4px; }

          .slide-indicators {
            bottom: 8px;
          }

          .indicator {
            width: 16px;
            height: 3px;
          }

          .indicator.active {
            width: 24px;
          }

          .dropship-cta {
            bottom: 35px;
            right: 8px;
          }

          .dropship-link {
            padding: 6px 10px;
          }

          .dropship-text {
            font-size: 9px;
          }

          .dropship-action {
            font-size: 11px;
          }
        }

        @media (max-width: 480px) {
          .premium-hero-banner {
            aspect-ratio: 16/8;
            max-height: none;
            height: auto;
            min-height: 180px;
          }

          .hero-slide {
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
          }

          .slide-indicators {
            bottom: 6px;
          }

          .indicator {
            width: 14px;
            height: 2px;
          }

          .indicator.active {
            width: 20px;
          }

        }
      `}</style>
    </div>
  )
}
