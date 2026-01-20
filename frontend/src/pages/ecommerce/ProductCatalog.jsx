import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ProductCardMini from '../../components/ecommerce/ProductCardMini'
import Header from '../../components/layout/Header'
import ShoppingCart from '../../components/ecommerce/ShoppingCart'
import EditMode from '../../components/ecommerce/EditMode'
import { useToast } from '../../ui/Toast'
import { trackPageView, trackSearch, trackFilterUsage, trackSortUsage } from '../../utils/analytics'
import { apiGet } from '../../api'
import { detectCountryCode } from '../../utils/geo'
import CategoryFilter from '../../components/ecommerce/CategoryFilter'
import SearchBar from '../../components/ecommerce/SearchBar'
import CountrySelector, { countries } from '../../components/ecommerce/CountrySelector'
import PremiumHeroBanner from '../../components/ecommerce/PremiumHeroBanner'
import MobileBottomNav from '../../components/ecommerce/MobileBottomNav'
import { COUNTRY_LIST } from '../../utils/constants'

// Professional Stats and Categories Section
function StatsAndCategories({ categoryCount = 0, categoryCounts = {}, selectedCategory = 'all', onCategoryClick }) {
  // Category icon components with premium SVG designs
  const getCategoryIcon = (name) => {
    const iconProps = { className: "w-10 h-10 sm:w-12 sm:h-12", strokeWidth: 1.5 }
    const categoryLower = name.toLowerCase()
    
    // Electronics - Smartphone icon
    if (categoryLower.includes('electronic')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
    }
    // Fashion/Clothing - Shopping bag icon
    if (categoryLower.includes('fashion') || categoryLower.includes('clothing') || categoryLower.includes('apparel')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
    }
    // Home/Furniture - House icon
    if (categoryLower.includes('home') || categoryLower.includes('furniture')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
    }
    // Beauty/Cosmetics/Skincare - Sparkle icon
    if (categoryLower.includes('beauty') || categoryLower.includes('cosmetic') || categoryLower.includes('skincare') || categoryLower.includes('skin')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
    }
    // Sports/Fitness - Dumbbell icon  
    if (categoryLower.includes('sport') || categoryLower.includes('fitness') || categoryLower.includes('gym')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10M7 3h10M5 7v10M19 7v10M9 7v10M15 7v10M3 9v6M21 9v6" /><rect x="7" y="7" width="2" height="10" fill="currentColor" opacity="0.3"/><rect x="15" y="7" width="2" height="10" fill="currentColor" opacity="0.3"/></svg>
    }
    // Books/Education - Open book icon
    if (categoryLower.includes('book') || categoryLower.includes('education') || categoryLower.includes('learning')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
    }
    // Toys/Kids - Puzzle piece icon
    if (categoryLower.includes('toy') || categoryLower.includes('kid') || categoryLower.includes('children')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
    }
    // Automotive/Vehicles - Car icon
    if (categoryLower.includes('automotive') || categoryLower.includes('vehicle') || categoryLower.includes('car')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /><circle cx="8" cy="16" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/></svg>
    }
    // Food/Grocery - Shopping cart icon
    if (categoryLower.includes('food') || categoryLower.includes('grocery') || categoryLower.includes('snack')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    }
    // Jewelry/Accessories - Diamond icon
    if (categoryLower.includes('jewelry') || categoryLower.includes('jewellery') || categoryLower.includes('accessori') || categoryLower.includes('watch')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
    }
    // Health/Medical - Heart icon
    if (categoryLower.includes('health') || categoryLower.includes('medical') || categoryLower.includes('wellness')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
    }
    // Office/Stationery - Document icon
    if (categoryLower.includes('office') || categoryLower.includes('stationery') || categoryLower.includes('supplies')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    }
    // Garden/Outdoor - Globe with plant icon
    if (categoryLower.includes('garden') || categoryLower.includes('outdoor') || categoryLower.includes('plant')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    }
    // Pet/Animals - Paw icon
    if (categoryLower.includes('pet') || categoryLower.includes('animal')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v.01M8.5 8.5l-.01-.01m8.01.01l-.01-.01M9.5 13.5a4.5 4.5 0 005 0M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><circle cx="9" cy="9" r="1.5" fill="currentColor"/><circle cx="15" cy="9" r="1.5" fill="currentColor"/></svg>
    }
    // Personal Care - Bath/Soap icon
    if (categoryLower.includes('personal') || categoryLower.includes('care') || categoryLower.includes('hygiene')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
    }
    // Tools/Hardware - Wrench icon
    if (categoryLower.includes('tool') || categoryLower.includes('hardware') || categoryLower.includes('repair')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    }
    // Music/Entertainment - Music note icon
    if (categoryLower.includes('music') || categoryLower.includes('entertainment') || categoryLower.includes('audio')) {
      return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
    }
    // Default/Other - Grid icon (premium)
    return <svg {...iconProps} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
  }

  const getCategoryColor = (name) => {
    const colors = {
      electronics: '#3b82f6',
      fashion: '#8b5cf6',
      clothing: '#8b5cf6',
      apparel: '#8b5cf6',
      home: '#f59e0b',
      furniture: '#84cc16',
      beauty: '#ec4899',
      cosmetics: '#ec4899',
      sports: '#14b8a6',
      fitness: '#14b8a6',
      books: '#6366f1',
      education: '#6366f1',
      toys: '#f97316',
      kids: '#f97316',
      automotive: '#ef4444',
      vehicles: '#ef4444',
      food: '#10b981',
      grocery: '#10b981',
      jewelry: '#a855f7',
      accessories: '#a855f7',
      health: '#ec4899',
      medical: '#ec4899',
      office: '#64748b',
      stationery: '#64748b',
      garden: '#10b981',
      outdoor: '#10b981'
    }
    return colors[name.toLowerCase()] || '#6b7280'
  }

  // Define available categories (removed: Beauty, Sports, Books, Automotive, Food, Garden, Pets, Music)
  const allCategories = [
    'Electronics', 'Fashion', 'Home', 'Toys', 'Jewelry',
    'Health', 'Office', 'Tools', 'Skincare', 'Pet Supplies', 'Personal Care', 'Other'
  ]
  
  // Show all categories (not filtering by product count)
  const availableCategories = allCategories

  return (
    <div className="bg-gradient-to-br from-orange-50 via-white to-blue-50 rounded-2xl shadow-lg overflow-hidden mb-8">
      {/* Stats Section */}
      <div className="p-6 sm:p-8 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left: Headline */}
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              Discover quality products at unbeatable prices
            </h2>
            <p className="text-base sm:text-lg text-gray-600">
              Your trusted marketplace for wholesale and retail shopping across the Gulf region
            </p>
          </div>

          {/* Right: Stats Grid */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent mb-1">
                10,000+
              </div>
              <div className="text-sm sm:text-base text-gray-600 font-medium">Products</div>
            </div>
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent mb-1">
                50,000+
              </div>
              <div className="text-sm sm:text-base text-gray-600 font-medium">Monthly Orders</div>
            </div>
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent mb-1">
                500+
              </div>
              <div className="text-sm sm:text-base text-gray-600 font-medium">Active Brands</div>
            </div>
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent mb-1">
                10+
              </div>
              <div className="text-sm sm:text-base text-gray-600 font-medium">Countries</div>
            </div>
          </div>
        </div>

        {/* Categories Section - Show all categories */}
        {availableCategories.length > 0 && (
          <div className="mt-10">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6 text-center">Shop by Category</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
              {availableCategories.map((categoryName, index) => {
                const color = getCategoryColor(categoryName)
                return (
                  <button
                    key={index}
                    onClick={() => onCategoryClick(categoryName)}
                    className="flex flex-col items-center gap-3 p-3 transition-all duration-200 hover:scale-105 group cursor-pointer"
                  >
                    <div 
                      className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center bg-white shadow-sm group-hover:shadow-md transition-all ${
                        selectedCategory === categoryName 
                          ? 'border-2 border-orange-500 shadow-md' 
                          : 'border border-gray-100'
                      }`}
                      style={{ 
                        color: selectedCategory === categoryName ? '#ea580c' : '#4a5568'
                      }}
                    >
                      {getCategoryIcon(categoryName)}
                    </div>
                    <div className="text-center">
                      <span className={`text-xs sm:text-sm font-medium block leading-tight ${
                        selectedCategory === categoryName ? 'text-orange-600' : 'text-gray-700'
                      }`}>
                        {categoryName}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProductCatalog() {
  const toast = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [categoryCounts, setCategoryCounts] = useState({})
  const [bannerImages, setBannerImages] = useState([])
  
  // Edit mode
  const [editMode, setEditMode] = useState(false)
  const [pageContent, setPageContent] = useState({})
  const [editState, setEditState] = useState({ canSave: false, elementCount: 0, saving: false, handleSave: null })
  
  // Filter states - initialize from URL params
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const sp = new URLSearchParams(window.location.search)
    return sp.get('category') || 'all'
  })
  const [searchQuery, setSearchQuery] = useState(() => {
    const sp = new URLSearchParams(window.location.search)
    return sp.get('search') || ''
  })
  const [sortBy, setSortBy] = useState('name')
  const [showFilters, setShowFilters] = useState(false)
  const [filterType, setFilterType] = useState(() => {
    const sp = new URLSearchParams(window.location.search)
    return sp.get('filter') || ''
  })
  const [selectedCountry, setSelectedCountry] = useState(() => {
    try { return localStorage.getItem('selected_country') || 'SA' } catch { return 'SA' }
  }) // Default to KSA

  // Listen for country changes from header
  useEffect(() => {
    const handleCountryChange = (e) => {
      if (e.detail?.code) {
        setSelectedCountry(e.detail.code)
      }
    }
    window.addEventListener('countryChanged', handleCountryChange)
    return () => window.removeEventListener('countryChanged', handleCountryChange)
  }, [])
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const productsPerPage = 12
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [displayedProducts, setDisplayedProducts] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const loaderRef = useRef(null)

  // Load category usage counts (public)
  useEffect(() => {
    let alive = true
    ;(async()=>{
      try{
        const res = await apiGet('/api/products/public/categories-usage')
        const counts = res?.counts || {}
        if (alive) setCategoryCounts(counts)
      }catch{
        if (alive) setCategoryCounts({})
      }
    })()
    return ()=>{ alive = false }
  }, [])
  
  // Load banners from API (filter by page='catalog')
  useEffect(() => {
    let alive = true
    ;(async()=>{
      try{
        const res = await apiGet('/api/settings/website/banners?page=catalog')
        const banners = res?.banners || []
        if (alive && banners.length > 0) {
          setBannerImages(banners.map(b => b.imageUrl))
        } else {
          // Fallback to default banners if no banners uploaded
          if (alive) setBannerImages(['/banners/banner1.jpg.png','/banners/banner2.jpg.png','/banners/banner3.jpg.png'])
        }
      }catch{
        // Fallback to default banners on error
        if (alive) setBannerImages(['/banners/banner1.jpg.png','/banners/banner2.jpg.png','/banners/banner3.jpg.png'])
      }
    })()
    return ()=>{ alive = false }
  }, [])
  
  // Load page content for edit mode
  useEffect(() => {
    let alive = true
    ;(async()=>{
      try{
        const res = await apiGet('/api/settings/website/content?page=catalog')
        if (alive && res.content && res.content.elements) {
          setPageContent(res.content)
          applyPageContent(res.content.elements)
        }
      }catch(err){
        console.error('Failed to load page content:', err)
      }
    })()
    return ()=>{ alive = false }
  }, [])
  
  // Check URL for edit mode parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('edit') === 'true') {
      setEditMode(true)
    }
  }, [location.search])
  
  function applyPageContent(elements) {
    elements.forEach(el => {
      const domElement = document.getElementById(el.id) || 
                        document.querySelector(`[data-editable-id="${el.id}"]`)
      if (domElement) {
        if (el.text) domElement.innerText = el.text
        if (el.styles) {
          Object.keys(el.styles).forEach(style => {
            domElement.style[style] = el.styles[style]
          })
        }
      }
    })
  }
 // Load products when filters change (NOT on currentPage change - that's for infinite scroll)
  useEffect(() => {
    loadProducts()
    // Track page view
    trackPageView('/products', 'Product Catalog')
  }, [selectedCategory, searchQuery, sortBy, filterType])

  // Read initial category/search/filter from URL (and on URL change)
  useEffect(() => {
    const sp = new URLSearchParams(location.search)
    const cat = sp.get('category') || 'all'
    const q = sp.get('search') || ''
    const filter = sp.get('filter') || ''
    const sort = sp.get('sort') || ''
    if (cat !== selectedCategory) setSelectedCategory(cat)
    if (q !== searchQuery) setSearchQuery(q)
    if (filter !== filterType) setFilterType(filter)
    if (sort && sort !== sortBy) setSortBy(sort)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  // Keep URL in sync when user changes filters
  useEffect(() => {
    const sp = new URLSearchParams(location.search)
    let changed = false
    const currCat = sp.get('category') || 'all'
    const currQ = sp.get('search') || ''
    if ((selectedCategory || 'all') !== currCat){
      if (selectedCategory && selectedCategory !== 'all') sp.set('category', selectedCategory)
      else sp.delete('category')
      changed = true
    }
    if ((searchQuery || '') !== currQ){
      if (searchQuery && searchQuery.trim()) sp.set('search', searchQuery.trim())
      else sp.delete('search')
      changed = true
    }
    if (changed){
      navigate(`/catalog?${sp.toString()}`, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, searchQuery])

  // Persist selected country for use on product detail/cart
  useEffect(() => {
    try { localStorage.setItem('selected_country', selectedCountry) } catch {}
  }, [selectedCountry])

  // On first visit: auto-detect country if none saved
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reset displayed products when filters change
  useEffect(() => {
    setDisplayedProducts([])
    setCurrentPage(1)
    setHasMore(true)
  }, [selectedCategory, searchQuery, sortBy, filterType])

  // Update displayed products when products load
  useEffect(() => {
    if (products.length > 0) {
      const endIndex = currentPage * productsPerPage
      setDisplayedProducts(products.slice(0, endIndex))
      setHasMore(endIndex < products.length)
    } else {
      setDisplayedProducts([])
      setHasMore(false)
    }
  }, [products, currentPage])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          setLoadingMore(true)
          setCurrentPage(prev => prev + 1)
          setTimeout(() => setLoadingMore(false), 300)
        }
      },
      { threshold: 0.1 }
    )
    if (loaderRef.current) observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading])

  const loadProducts = async () => {
    try {
      setLoading(true)
      
      // Build query parameters
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      if (searchQuery.trim()) params.append('search', searchQuery.trim())
      if (sortBy) params.append('sort', sortBy)
      if (filterType) params.append('filter', filterType)
      params.append('page', currentPage.toString())
      params.append('limit', '10000') // Load all products for unlimited scrolling
      
      const response = await apiGet(`/api/products/public?${params.toString()}`)
      if (response?.products) {
        // Show all products - no country filtering, only currency conversion
        let filteredProducts = response.products
        
        // Apply special filters (bestselling, featured)
        if (filterType === 'bestselling') {
          filteredProducts = filteredProducts.filter(p => p.isBestSelling)
        } else if (filterType === 'featured') {
          filteredProducts = filteredProducts.filter(p => p.isFeatured || p.featured)
        } else if (filterType === 'sale') {
          filteredProducts = filteredProducts.filter(p => p.salePrice > 0 && p.salePrice < p.price)
        }
        
        setProducts(filteredProducts)
        // Update pagination to reflect filtered results
        const filteredPagination = {
          ...response.pagination,
          total: filteredProducts.length,
          pages: Math.ceil(filteredProducts.length / 12)
        }
        setPagination(filteredPagination)
      }
    } catch (error) {
      console.error('Failed to load products:', error)
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortProducts = () => {
    let filtered = [...products]

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory)
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.brand?.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
      )
    }

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'name-desc':
          return b.name.localeCompare(a.name)
        case 'price':
          return ((a.salePrice > 0 && a.salePrice < a.price) ? a.salePrice : a.price) - ((b.salePrice > 0 && b.salePrice < b.price) ? b.salePrice : b.price)
        case 'price-desc':
          return ((b.salePrice > 0 && b.salePrice < b.price) ? b.salePrice : b.price) - ((a.salePrice > 0 && a.salePrice < a.price) ? a.salePrice : a.price)
        case 'rating':
          return (b.rating || 0) - (a.rating || 0)
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt)
        case 'featured':
          return (b.featured ? 1 : 0) - (a.featured ? 1 : 0)
        default:
          return 0
      }
    })

    setFilteredProducts(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }

  const getProductCounts = () => categoryCounts

  const handleCategoryChange = (category) => {
    setSelectedCategory(category)
    setCurrentPage(1)
    // Track filter usage
    trackFilterUsage('category', category)
  }

  const handleSearch = (query) => {
    setSearchQuery(query)
    setCurrentPage(1)
    // Track search event
    trackSearch(query, filteredProducts.length)
  }

  const handleAddToCart = (product) => {
    // ProductCard stores item in localStorage; toast shown by ProductCard
    // Don't auto-open cart on mobile
  }

  // Calculate pagination for display
  const totalPages = pagination?.pages || 1
  const totalProducts = pagination?.total || 0

  const paginate = (pageNumber) => setCurrentPage(pageNumber)

  // Trending Products Section with moving animation
  const TrendingSection = ({ products, title, icon, subtitle, gradientFrom, gradientTo }) => {
    const scrollRef = React.useRef(null)
    const [isPaused, setIsPaused] = React.useState(false)
    
    // Auto-scroll animation
    React.useEffect(() => {
      const container = scrollRef.current
      if (!container || products.length <= 4) return
      
      let animationId
      let scrollPos = 0
      const speed = 0.5
      
      const animate = () => {
        if (!isPaused && container) {
          scrollPos += speed
          if (scrollPos >= container.scrollWidth / 2) {
            scrollPos = 0
          }
          container.scrollLeft = scrollPos
        }
        animationId = requestAnimationFrame(animate)
      }
      
      animationId = requestAnimationFrame(animate)
      return () => cancelAnimationFrame(animationId)
    }, [isPaused, products.length])
    
    if (!products || products.length === 0) return null
    
    // Duplicate products for seamless loop
    const displayProducts = products.length > 4 ? [...products, ...products] : products
    
    return (
      <div className="mb-8">
        <div 
          className="rounded-2xl p-6 mb-4"
          style={{ background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)` }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{icon}</span>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                  {title}
                </h2>
                <p className="text-white/80 text-sm">{subtitle}</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white/90 text-sm font-medium">Live</span>
            </div>
          </div>
          
          <div 
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
            style={{ scrollBehavior: 'auto' }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            {displayProducts.map((product, idx) => (
              <div 
                key={`${product._id}-${idx}`}
                className="flex-shrink-0 w-40 sm:w-48"
              >
                <ProductCardMini
                  product={product}
                  selectedCountry={selectedCountry}
                  showVideo={true}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Get trending, deals, and top selling products
  const trendingProducts = React.useMemo(() => {
    return products.filter(p => p.isFeatured || p.featured).slice(0, 10)
  }, [products])
  
  const videoProducts = React.useMemo(() => {
    return products.filter(p => p.video || p.videoUrl || p.videos?.length > 0).slice(0, 10)
  }, [products])

  // Premium skeleton loader component
  const SkeletonCard = () => (
    <div className="skeleton-card bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="skeleton-image aspect-square bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded-full w-3/4 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded-full w-1/2 animate-pulse" />
        <div className="h-6 bg-gray-200 rounded-full w-2/5 animate-pulse mt-2" />
        <div className="h-10 bg-gray-200 rounded-xl w-full animate-pulse mt-4" />
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#f4f4f4' }}>
        <Header onCartClick={() => setIsCartOpen(true)} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Section Skeleton */}
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="h-10 bg-gray-200 rounded-lg w-3/4 animate-pulse" />
                <div className="h-6 bg-gray-200 rounded-lg w-1/2 animate-pulse" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4 animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-20 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-16" />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Categories Skeleton */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="h-6 bg-gray-200 rounded w-40 mx-auto mb-6 animate-pulse" />
              <div className="flex flex-wrap justify-center gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
                    <div className="w-20 h-20 bg-gray-200 rounded-full" />
                    <div className="h-3 bg-gray-200 rounded w-14" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Filters Skeleton */}
          <div className="bg-white rounded-xl shadow-md p-5 mb-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 h-12 bg-gray-200 rounded-lg animate-pulse" />
              <div className="w-full sm:w-56 h-12 bg-gray-200 rounded-lg animate-pulse" />
              <div className="w-full sm:w-56 h-12 bg-gray-200 rounded-lg animate-pulse" />
            </div>
          </div>

          {/* Products Grid Skeleton */}
          <div className="flex gap-8">
            <div className="hidden lg:block w-64 flex-shrink-0">
              <div className="bg-white rounded-xl p-4 space-y-3">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4 animate-pulse" />
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            </div>
            <div className="flex-1">
              <div className="mb-6">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse" />
                <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <ShoppingCart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        
        <style jsx>{`
          .skeleton-image {
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f4f4' }}>
      <EditMode 
        page="catalog" 
        isActive={editMode} 
        onExit={() => setEditMode(false)} 
        onSave={setEditState}
      />
      
      <Header 
        onCartClick={() => setIsCartOpen(true)} 
        editMode={editMode}
        editState={editState}
        onExitEdit={() => setEditMode(false)}
      />
      
      <div className="editable-area">
        <div className="max-w-7xl mx-auto px-1 sm:px-2 lg:px-4 py-4">
        <div>
          {/* Main Content */}
          <div className="min-w-0">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <p className="text-red-700">{error}</p>
                <button
                  onClick={loadProducts}
                  className="mt-2 text-red-600 hover:text-red-800 font-medium"
                >
                  Try Again
                </button>
              </div>
            )}

            <div className="mb-6">
              <SearchBar
                searchQuery={searchQuery}
                onSearchChange={handleSearch}
                sortBy={sortBy}
                onSortChange={(value) => {
                  setSortBy(value)
                  setCurrentPage(1)
                  trackSortUsage(value)
                }}
                showFilters={showFilters}
                onToggleFilters={() => setShowFilters(!showFilters)}
              />
            </div>

            {/* 🎬 Video Products - Ultra Premium with Moving Animation */}
            {videoProducts.length > 0 && (
              <div className="mb-8">
                <div 
                  className="rounded-3xl p-6 sm:p-8 relative overflow-hidden"
                  style={{ 
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%)',
                    boxShadow: '0 20px 60px -15px rgba(249, 115, 22, 0.5)'
                  }}
                >
                  {/* Animated background elements */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl animate-pulse" />
                    <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-white/5 rounded-full blur-3xl" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-yellow-400/20 to-red-500/20 rounded-full blur-3xl animate-spin" style={{ animationDuration: '20s' }} />
                  </div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <span className="text-3xl">🎬</span>
                        </div>
                        <div>
                          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2" style={{ textShadow: '0 4px 8px rgba(0,0,0,0.3)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                            Discover Products
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-yellow-900 animate-bounce">VIDEO</span>
                          </h2>
                          <p className="text-white/80 text-sm sm:text-base">Watch product demos & reviews</p>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-white text-sm font-semibold">Live</span>
                      </div>
                    </div>
                    
                    <TrendingSection 
                      products={videoProducts} 
                      title="" 
                      icon="" 
                      subtitle="" 
                      gradientFrom="transparent" 
                      gradientTo="transparent" 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Premium Results Summary */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div>
                <p className="text-sm text-gray-500 mb-1">All Products</p>
                <p className="text-lg font-semibold text-gray-900">
                  {displayedProducts.length} of {products.length} products
                  {selectedCategory !== 'all' && <span className="text-orange-600 ml-1">in {selectedCategory}</span>}
                  {searchQuery && <span className="text-gray-500 ml-1">matching "{searchQuery}"</span>}
                </p>
              </div>
            </div>

            {/* Products Grid */}
            <div className="product-grid-section" style={{ minHeight: '400px' }}>
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-4 lg:gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-gray-100 rounded-xl animate-pulse aspect-square" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-600">
                  {searchQuery || selectedCategory !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'No products available at the moment'
                  }
                </p>
              </div>
            ) : (
              <>
                <div className="taobao-grid">
                  {displayedProducts.map((product) => (
                    <ProductCardMini
                      key={product._id}
                      product={product}
                      selectedCountry={selectedCountry}
                      showVideo={false}
                    />
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
                    <p className="text-gray-500 text-sm">You've seen all {products.length} products</p>
                  )}
                </div>
              </>
            )}
            </div>
          </div>
        </div>
      </div>
      </div>

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