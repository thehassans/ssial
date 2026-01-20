import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Header from '../../components/layout/Header'
import { apiGet } from '../../api'
import ProductCardMini from '../../components/ecommerce/ProductCardMini'
import ShoppingCart from '../../components/ecommerce/ShoppingCart'
import { categories } from '../../components/ecommerce/CategoryFilter'
import { detectCountryCode } from '../../utils/geo'
import { countries } from '../../components/ecommerce/CountrySelector'
import PremiumHeroBanner from '../../components/ecommerce/PremiumHeroBanner'
import CategoriesSection from '../../components/ecommerce/CategoriesSection'
import MobileBottomNav from '../../components/ecommerce/MobileBottomNav'
import QuickCategories from '../../components/ecommerce/QuickCategories'
import HorizontalProductSection from '../../components/ecommerce/HorizontalProductSection'

export default function Home(){
  const [featured, setFeatured] = useState([])
  const [loading, setLoading] = useState(true)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [categoryCounts, setCategoryCounts] = useState({})
  const [selectedCountry, setSelectedCountry] = useState(() => {
    try { return localStorage.getItem('selected_country') || 'SA' } catch { return 'SA' }
  })
  const [allProducts, setAllProducts] = useState([])
  const [displayedProducts, setDisplayedProducts] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const productsPerPage = 12
  const loaderRef = useRef(null)

  // Infinite scroll observer
  const loadMoreProducts = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    setTimeout(() => {
      setDisplayedProducts(prev => {
        const nextProducts = allProducts.slice(0, prev.length + productsPerPage)
        setHasMore(nextProducts.length < allProducts.length)
        return nextProducts
      })
      setLoadingMore(false)
    }, 200)
  }, [loadingMore, hasMore, allProducts])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreProducts()
        }
      },
      { threshold: 0.1 }
    )
    if (loaderRef.current) observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loadMoreProducts])

  useEffect(()=>{
    let alive = true
    ;(async()=>{
      try{
        setLoading(true)
        // Fetch products for home page
        const qs = new URLSearchParams()
        qs.set('page','1'); qs.set('limit','10000'); qs.set('sort','newest')
        const res = await apiGet(`/api/products/public?${qs.toString()}`)
        let list = Array.isArray(res?.products)? res.products: []
        if (alive) {
          setFeatured(list.slice(0,8))
          setAllProducts(list)
          setDisplayedProducts(list.slice(0, productsPerPage))
          setHasMore(list.length > productsPerPage)
        }
      }catch{
        if (alive) {
          setFeatured([])
          setAllProducts([])
          setDisplayedProducts([])
        }
      }finally{ if (alive) setLoading(false) }
    })()
    return ()=>{ alive = false }
  },[])

  // Persist selected country
  useEffect(()=>{
    try { localStorage.setItem('selected_country', selectedCountry) } catch {}
  },[selectedCountry])

  // Listen for country changes from Header
  useEffect(() => {
    const handleCountryChange = (e) => {
      if (e.detail?.code) {
        setSelectedCountry(e.detail.code)
      }
    }
    window.addEventListener('countryChanged', handleCountryChange)
    return () => window.removeEventListener('countryChanged', handleCountryChange)
  }, [])

  // On first visit, auto-detect country if none saved
  useEffect(() => {
    (async () => {
      try {
        const saved = localStorage.getItem('selected_country')
        if (!saved) {
          const code = await detectCountryCode()
          setSelectedCountry(code)
          try { localStorage.setItem('selected_country', code) } catch {}
        }
      } catch {}
    })()
  }, [])

  // Load category usage counts for hiding empty categories
  useEffect(() => {
    let alive = true
    ;(async()=>{
      try{
        const res = await apiGet('/api/products/public/categories-usage')
        if (alive) setCategoryCounts(res?.counts || {})
      }catch{
        if (alive) setCategoryCounts({})
      }
    })()
    return ()=>{ alive = false }
  }, [])

  const topCategories = categories
    .filter(c => c.id !== 'all')
    .filter(c => (categoryCounts?.[c.id] || 0) > 0)
    .slice(0, 8)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f4f4' }}>
      <Header onCartClick={() => setIsCartOpen(true)} />

      {/* Hero Banner */}
      <PremiumHeroBanner />

      {/* Quick Categories - Mobile Style */}
      <QuickCategories />

      {/* Trending Products - Products with Videos */}
      <div className="px-1 sm:px-2 lg:px-4 max-w-7xl mx-auto">
        <HorizontalProductSection 
          title="Trending Products"
          filter="trending"
          bgGradient="from-orange-400 to-orange-500"
          selectedCountry={selectedCountry}
          limit={20}
          showVideo={true}
        />
      </div>

      {/* Categories Section */}
      <CategoriesSection />

      {/* Super Deals Section */}
      <div className="px-1 sm:px-2 lg:px-4 max-w-7xl mx-auto">
        <HorizontalProductSection 
          title="Super Deals"
          filter="superDeals"
          bgGradient="from-red-500 to-pink-500"
          selectedCountry={selectedCountry}
          limit={20}
        />
      </div>

      {/* 🎬 Discover Products - Video Products */}
      <div className="px-1 sm:px-2 lg:px-4 max-w-7xl mx-auto">
        <HorizontalProductSection 
          title="🎬 Discover Products"
          bgGradient="from-orange-500 to-red-500"
          selectedCountry={selectedCountry}
          limit={50}
          showVideo={true}
        />
      </div>

      {/* Stats Section - Hidden on mobile */}
      <section className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {[
            { number: '10,000+', label: 'Products', icon: '📦', color: 'from-orange-500 to-orange-600' },
            { number: '50,000+', label: 'Monthly Orders', icon: '🛒', color: 'from-blue-500 to-blue-600' },
            { number: '500+', label: 'Active Brands', icon: '⭐', color: 'from-purple-500 to-purple-600' },
            { number: '10+', label: 'Countries', icon: '🌍', color: 'from-green-500 to-green-600' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-all hover:-translate-y-1 border border-gray-100">
              <div className="text-4xl mb-3">{stat.icon}</div>
              <div className={`text-3xl sm:text-4xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-1`}>
                {stat.number}
              </div>
              <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>


      {/* All Products with Pagination */}
      <section className="py-8 md:py-16" style={{ backgroundColor: '#f4f4f4' }}>
        <div className="max-w-7xl mx-auto px-1 sm:px-2 lg:px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl md:text-3xl font-bold text-gray-900">All Products</h2>
              <p className="text-sm md:text-base text-gray-500 mt-1">Browse our complete collection</p>
            </div>
            <Link 
              to="/catalog" 
              className="text-orange-500 text-sm font-medium flex items-center gap-1 hover:text-orange-600"
            >
              View All
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📦</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No products available</h3>
              <p className="text-gray-600">Check back soon for new arrivals!</p>
            </div>
          ) : (
            <>
              <div className="taobao-grid">
                {displayedProducts.map((p) => (
                  <ProductCardMini key={p._id} product={p} selectedCountry={selectedCountry} showVideo={true} />
                ))}
              </div>
              <style jsx>{`
                .taobao-grid {
                  display: grid;
                  grid-template-columns: repeat(2, 1fr);
                  gap: 4px;
                  padding: 0;
                  background: #f4f4f4;
                }
                @media (min-width: 640px) {
                  .taobao-grid {
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                  }
                }
                @media (min-width: 1024px) {
                  .taobao-grid {
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px;
                  }
                }
                @media (min-width: 1280px) {
                  .taobao-grid {
                    grid-template-columns: repeat(5, 1fr);
                  }
                }
              `}</style>
              
              {/* Infinite Scroll Loader */}
              <div ref={loaderRef} className="flex justify-center py-8">
                {loadingMore && hasMore && (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-600">Loading more products...</span>
                  </div>
                )}
                {!hasMore && displayedProducts.length > 0 && (
                  <div className="text-center">
                    <p className="text-gray-500 text-sm mb-4">You've seen all {allProducts.length} products</p>
                    <Link 
                      to="/catalog" 
                      className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg border-2 border-orange-500 text-orange-500 font-semibold hover:bg-orange-50 transition-all"
                    >
                      Browse Catalog
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Shopping Cart Sidebar */}
      <ShoppingCart 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onCartClick={() => setIsCartOpen(true)} />
    </div>
  )
}
