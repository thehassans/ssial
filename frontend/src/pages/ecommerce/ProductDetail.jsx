import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { apiGet, apiPost, API_BASE } from '../../api'
import { detectCountryCode } from '../../utils/geo'
import { useToast } from '../../ui/Toast'
import Header from '../../components/layout/Header'
import ShoppingCart from '../../components/ecommerce/ShoppingCart'
import { trackPageView, trackProductView, trackAddToCart } from '../../utils/analytics'
import { getCurrencyConfig, convert as fxConvert } from '../../util/currency'
import { COUNTRY_TO_CURRENCY } from '../../utils/constants'

const ProductDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('description')
  const [reviews, setReviews] = useState([])
  const [relatedProducts, setRelatedProducts] = useState([])
  const [newReview, setNewReview] = useState({ rating: 5, comment: '', name: '' })
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [ccyCfg, setCcyCfg] = useState(null)
  const [selectedVariants, setSelectedVariants] = useState({})

  // Country selection (persisted from catalog via localStorage)
  const [selectedCountry, setSelectedCountry] = useState(() => {
    try { return localStorage.getItem('selected_country') || 'SA' } catch { return 'SA' }
  })

  useEffect(() => {
    try {
      const s = localStorage.getItem('selected_country')
      if (s) setSelectedCountry(s)
    } catch {}
  }, [])

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

  useEffect(() => {
    getCurrencyConfig().then(cfg => setCcyCfg(cfg)).catch(() => {})
  }, [])

  const COUNTRY_TO_CURRENCY = { AE: 'AED', OM: 'OMR', SA: 'SAR', BH: 'BHD', IN: 'INR', KW: 'KWD', QA: 'QAR', PK: 'PKR', JO: 'JOD', US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD' }
  const getDisplayCurrency = () => COUNTRY_TO_CURRENCY[selectedCountry] || 'SAR'
  const convertPrice = (value, fromCurrency, toCurrency) => fxConvert(value, fromCurrency||'SAR', toCurrency||getDisplayCurrency(), ccyCfg)
  const formatPrice = (price, currency = 'SAR') => new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number(price||0))

  useEffect(() => {
    if (id) {
      loadProduct()
      loadReviews()
    }
  }, [id])

  useEffect(() => {
    if (product) {
      trackPageView(`/product/${id}`, `Product: ${product.name}`)
      trackProductView(product.id, product.name, product.category, product.price)
      
      if (product.variants && typeof product.variants === 'object') {
        const initialVariants = {}
        Object.keys(product.variants).forEach(variantType => {
          if (Array.isArray(product.variants[variantType]) && product.variants[variantType].length > 0) {
            initialVariants[variantType] = product.variants[variantType][0]
          }
        })
        setSelectedVariants(initialVariants)
      }

      // Load related products
      if (product.category) {
        loadRelatedProducts(product.category)
      }
    }
  }, [product, id])

  const loadRelatedProducts = async (category) => {
    try {
      const response = await apiGet(`/api/products/public?category=${encodeURIComponent(category)}&limit=10`)
      if (response?.products) {
        // Show all related products - no country filtering
        const related = response.products
          .filter(p => p._id !== product._id)
          .slice(0, 4)
        setRelatedProducts(related)
      }
    } catch (error) {
      console.error('Error loading related products:', error)
    }
  }

  const loadProduct = async () => {
    try {
      setLoading(true)
      const response = await apiGet(`/api/products/public/${id}`)
      if (response?.product) {
        const enhancedProduct = {
          ...response.product,
          images: response.product.images || [response.product.imagePath || '/placeholder-product.svg']
        }
        setProduct(enhancedProduct)
      } else {
        toast.error('Product not found')
        navigate('/products')
      }
    } catch (error) {
      console.error('Error loading product:', error)
      toast.error('Failed to load product')
      navigate('/products')
    } finally {
      setLoading(false)
    }
  }

  const loadReviews = async () => {
    try {
      const response = await apiGet(`/api/reviews/product/${id}`)
      if (response?.reviews) {
        const formattedReviews = response.reviews.map(r => ({
          id: r._id,
          name: r.customerName,
          rating: r.rating,
          comment: r.comment,
          date: new Date(r.createdAt).toLocaleDateString(),
          verified: r.isVerifiedPurchase
        }))
        setReviews(formattedReviews)
      }
    } catch (error) {
      console.error('Error loading reviews:', error)
    }
  }

  const handleAddToCart = (e) => {
    if (!product) return
    
    try {
      const savedCart = localStorage.getItem('shopping_cart')
      let cartItems = []
      
      if (savedCart) {
        cartItems = JSON.parse(savedCart)
      }
      
      const existingItemIndex = cartItems.findIndex(item => item.id === product._id)
      const max = Number(product?.stockQty || 0)
      const basePriceVal = Number(product?.price) || 0
      const salePriceVal = Number(product?.salePrice) || 0
      const hasSale = salePriceVal > 0 && salePriceVal < basePriceVal
      const unitPrice = hasSale ? salePriceVal : basePriceVal
      const addQty = Math.max(1, Math.floor(Number(quantity) || 1))
      
      const cartItem = {
        id: product._id,
        name: product.name,
        price: unitPrice,
        currency: product.baseCurrency || 'SAR',
        image: (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : (product.imagePath || '')),
        quantity: addQty,
        maxStock: product.stockQty,
        variants: selectedVariants
      }

      if (existingItemIndex >= 0) {
        const current = Number(cartItems[existingItemIndex].quantity || 0)
        const candidate = current + addQty
        if (max > 0 && candidate > max) {
          cartItems[existingItemIndex].quantity = max
        } else {
          cartItems[existingItemIndex].quantity = candidate
        }
        cartItems[existingItemIndex].variants = selectedVariants
      } else {
        cartItems.push(cartItem)
      }
      
      localStorage.setItem('shopping_cart', JSON.stringify(cartItems))
      try { localStorage.setItem('last_added_product', String(product._id)) } catch {}
      
      trackAddToCart(product._id, product.name, product.category, unitPrice, addQty)
      
      window.dispatchEvent(new CustomEvent('cartUpdated'))
      
      toast.success(`Added ${addQty} ${product.name} to cart`)
    } catch (error) {
      console.error('Error adding to cart:', error)
      toast.error('Failed to add item to cart')
    }
  }

  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    toast.info('Reviews can only be submitted after receiving your order. Check your order history to leave a review!')
    setShowReviewForm(false)
  }

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0)
    return (sum / reviews.length).toFixed(1)
  }

  const handleBuyNow = () => {
    handleAddToCart()
    // Small delay to ensure localStorage is written before navigation
    setTimeout(() => {
      navigate('/cart')
    }, 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="bg-gray-100 rounded-xl h-[500px]"></div>
              <div className="space-y-6">
                <div className="h-8 bg-gray-100 rounded w-3/4"></div>
                <div className="h-6 bg-gray-100 rounded w-1/4"></div>
                <div className="h-24 bg-gray-100 rounded w-full"></div>
                <div className="h-12 bg-gray-100 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Product not found</h1>
          <p className="mt-2 text-gray-500">The product you're looking for doesn't exist.</p>
          <Link to="/catalog" className="mt-4 inline-block text-orange-600 hover:underline">Return to Catalog</Link>
        </div>
      </div>
    )
  }

  const resolveImageUrl = (u) => {
    if (!u) return '/placeholder-product.svg'
    if (typeof u !== 'string') return '/placeholder-product.svg'
    if (u.startsWith('http')) return u
    if (u.startsWith('/uploads/')) return `${API_BASE}${u}`
    if (u.startsWith('/')) return u
    return `${API_BASE}/uploads/${u}`
  }
  
  // Get raw images first
  const rawImages = product.images && product.images.length > 0 
    ? product.images 
    : (product.imagePath ? [product.imagePath] : [])
  
  // If no images but has video, we'll handle it specially
  const hasNoImages = rawImages.length === 0
  const images = hasNoImages ? [] : rawImages.map(resolveImageUrl)
  
  // Video URL
  const videoUrl = product.video ? resolveImageUrl(product.video) : null
  
  // Combined media (images + video for gallery)
  const hasVideo = !!videoUrl
  const mediaItems = hasVideo ? [...images, { type: 'video', url: videoUrl }] : images.map(img => ({ type: 'image', url: img }))
  const isVideoSelected = hasVideo && selectedImage === images.length
  
  // Price calculation - use salePrice if it exists and is less than regular price
  const basePrice = Number(product.price) || 0
  const salePrice = Number(product.salePrice) || 0
  const hasActiveSale = salePrice > 0 && salePrice < basePrice
  const displayPrice = hasActiveSale ? salePrice : basePrice
  const originalPrice = hasActiveSale ? basePrice : null
  const discountPercentage = originalPrice && originalPrice > displayPrice 
    ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) 
    : 0

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <Header onCartClick={() => setIsCartOpen(true)} />
      
      {/* Breadcrumb - Single Line */}
      <div className="px-4 py-2">
        <p className="text-[11px] text-gray-400">
          <Link to="/" className="hover:text-orange-500">Home</Link>
          <span className="mx-1">/</span>
          <Link to="/catalog" className="hover:text-orange-500">All Products</Link>
          {product.category && (
            <>
              <span className="mx-1">/</span>
              <span className="capitalize">{product.category}</span>
            </>
          )}
          <span className="mx-1">/</span>
          <span className="text-gray-600">{product.name?.split(' ').slice(0, 2).join(' ')}...</span>
        </p>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          <div className="lg:col-span-7">
            {/* Mobile Swipable Gallery */}
            <div className="lg:hidden relative">
              <div 
                className="overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                onScroll={(e) => {
                  const scrollLeft = e.target.scrollLeft
                  const width = e.target.offsetWidth
                  const totalItems = hasVideo ? Math.max(images.length, 0) + 1 : Math.max(images.length, 1)
                  const newIndex = Math.round(scrollLeft / width)
                  if (newIndex !== selectedImage && newIndex >= 0 && newIndex < totalItems) {
                    setSelectedImage(newIndex)
                  }
                }}
              >
                <div className="flex w-max">
                  {images.length > 0 ? images.map((img, idx) => (
                    <div key={idx} className="w-screen flex-shrink-0 snap-center">
                      <div className="aspect-square bg-white mx-4 rounded-2xl overflow-hidden border border-gray-100">
                        <img 
                          src={img} 
                          alt={`Product ${idx + 1}`} 
                          className="w-full h-full object-contain p-4"
                          onError={(e) => { e.target.src = '/placeholder-product.svg' }}
                        />
                      </div>
                    </div>
                  )) : !hasVideo && (
                    <div className="w-screen flex-shrink-0 snap-center">
                      <div className="aspect-square bg-gray-100 mx-4 rounded-2xl overflow-hidden border border-gray-100 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-6xl mb-2">📦</div>
                          <p className="text-gray-400">No image</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Video slide for mobile */}
                  {hasVideo && (
                    <div className="w-screen flex-shrink-0 snap-center">
                      <div className="aspect-square bg-black mx-4 rounded-2xl overflow-hidden border border-gray-100 flex items-center justify-center">
                        <video 
                          src={videoUrl} 
                          controls 
                          loop
                          playsInline
                          className="w-full h-full object-contain"
                          poster={images.length > 0 ? images[0] : undefined}
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Image/Video Counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                {(isVideoSelected || (hasNoImages && hasVideo)) && <span>🎬</span>}
                {selectedImage + 1} / {hasVideo ? Math.max(images.length, 0) + 1 : Math.max(images.length, 1)}
              </div>
              
              {/* Sale Badge */}
              {hasActiveSale && !isVideoSelected && (
                <div className="absolute top-8 left-8 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded shadow-sm">
                  {discountPercentage}% OFF
                </div>
              )}
            </div>

            {/* Desktop Gallery */}
            <div className="hidden lg:flex flex-col-reverse lg:flex-row gap-4 h-[600px]">
              {/* Vertical Thumbnails */}
              {(images.length > 0 || hasVideo) && (
                <div className="hidden lg:flex flex-col gap-3 w-20 overflow-y-auto scrollbar-hide flex-shrink-0">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`relative w-20 h-24 rounded-lg overflow-hidden border transition-all duration-200 ${
                        selectedImage === idx && !isVideoSelected ? 'border-orange-500 ring-1 ring-orange-500' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img 
                        src={img} 
                        alt={`Product ${idx + 1}`} 
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = '/placeholder-product.svg' }}
                      />
                    </button>
                  ))}
                  {/* Video Thumbnail */}
                  {hasVideo && (
                    <button
                      onClick={() => setSelectedImage(images.length)}
                      className={`relative w-20 h-24 rounded-lg overflow-hidden border transition-all duration-200 bg-gray-900 ${
                        isVideoSelected ? 'border-orange-500 ring-1 ring-orange-500' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                        <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                          <svg className="w-4 h-4 text-orange-500 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        </div>
                      </div>
                      {images.length > 0 ? (
                        <img 
                          src={images[0]} 
                          alt="Video thumbnail" 
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Main Image or Video */}
              <div className="flex-1 relative bg-white rounded-2xl overflow-hidden border border-gray-100 h-full group">
                {isVideoSelected || (hasNoImages && hasVideo) ? (
                  <video 
                    src={videoUrl} 
                    controls 
                    loop
                    playsInline
                    className="w-full h-full object-contain bg-black"
                    poster={images.length > 0 ? images[0] : undefined}
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : images.length > 0 ? (
                  <img 
                    src={images[selectedImage] || images[0]} 
                    alt={product.name} 
                    className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105 cursor-zoom-in"
                    onError={(e) => { e.target.src = '/placeholder-product.svg' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <div className="text-6xl mb-2">📦</div>
                      <p className="text-gray-400">No image available</p>
                    </div>
                  </div>
                )}
                
                {hasActiveSale && !isVideoSelected && (
                  <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded shadow-sm">
                    {discountPercentage}% OFF
                  </div>
                )}
              </div>
            </div>
            
            {/* Product Video Section (shown below gallery if video exists) */}
            {hasVideo && !isVideoSelected && (
              <div className="mt-6 lg:hidden">
                <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                  Product Video
                </h3>
                <div className="rounded-2xl overflow-hidden border border-gray-100 bg-black">
                  <video 
                    src={videoUrl} 
                    controls 
                    className="w-full max-h-[400px]"
                    poster={images[0]}
                    preload="metadata"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col gap-4">
            <div>
              {/* Ultra Minimalist Product Title */}
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-snug mb-4">
                {product.name?.split(' ').slice(0, 6).join(' ')}
              </h1>

              {/* Ultra Premium Minimalist Pricing */}
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl sm:text-3xl font-bold text-orange-500">
                  {formatPrice(
                    convertPrice(displayPrice, product.baseCurrency || 'SAR', getDisplayCurrency()),
                    getDisplayCurrency()
                  )}
                </span>
                {originalPrice && (
                  <span className="text-base text-gray-300 line-through">
                    {formatPrice(
                      convertPrice(originalPrice, product.baseCurrency || 'SAR', getDisplayCurrency()),
                      getDisplayCurrency()
                    )}
                  </span>
                )}
                {hasActiveSale && (
                  <span className="text-xs font-semibold text-white bg-red-500 px-2 py-0.5 rounded">
                    -{discountPercentage}%
                  </span>
                )}
              </div>

              {product.variants && Object.keys(product.variants).length > 0 && (
                <div className="mb-6 space-y-4">
                  {Object.entries(product.variants).map(([name, options]) => (
                    <div key={name}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-900 capitalize">{name}:</span>
                        <span className="text-sm text-gray-500">{selectedVariants[name] || 'Select'}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(options) && options.map((opt, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedVariants(prev => ({ ...prev, [name]: opt }))}
                            className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                              selectedVariants[name] === opt
                                ? 'border-orange-500 bg-orange-50 text-orange-700 font-medium'
                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border border-gray-100 rounded-xl p-4 flex items-start gap-3 bg-gray-50/50 mb-6">
                <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                <div className="text-sm">
                  <p className="font-medium text-gray-700">Buyer Protection</p>
                  <p className="text-gray-500 text-xs mt-0.5">Full refund if you don't receive your order. Refund or keep items not as described.</p>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center gap-4 mb-6">
                <span className="text-sm font-medium text-gray-700">Quantity:</span>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                  </button>
                  <span className="w-12 h-10 flex items-center justify-center font-semibold text-gray-900 border-x border-gray-200">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  </button>
                </div>
                {product.stockQty > 0 && (
                  <span className="text-xs text-gray-400">{product.stockQty} available</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  className="w-full py-3.5 px-6 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                  </svg>
                  Add to Cart
                </button>

                              </div>
            </div>
          </div>
        </div>

        <div className="mt-16">
          {/* Tabs Navigation */}
          <div className="flex border-b border-gray-200 mb-8 overflow-x-auto scrollbar-hide">
            {[
              { id: 'description', label: 'Description' },
              { id: 'reviews', label: `Buyer Review (${reviews.length})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 px-6 font-semibold text-base transition-all relative whitespace-nowrap ${
                  activeTab === tab.id ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900"></span>}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              
              {activeTab === 'description' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
                  
                  {/* Ultra Premium Specs Grid */}
                  {product.descriptionBlocks && product.descriptionBlocks.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {product.descriptionBlocks.map((block, idx) => (
                        <div key={idx} className="group relative bg-white p-4 rounded-xl border border-gray-100 hover:border-orange-200 hover:shadow-md transition-all duration-300">
                          <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300" />
                          <p className="relative text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-1.5">{block.label}</p>
                          <p className="relative text-gray-900 font-semibold text-sm leading-snug">{block.value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Premium Main Description */}
                  {product.description && (
                    <div className="bg-white rounded-xl p-6 border border-gray-100">
                      <p className="text-gray-700 leading-[1.8] text-[15px] whitespace-pre-line">
                        {product.description}
                      </p>
                    </div>
                  )}

                  {/* Premium Overview Section */}
                  {product.overview && (
                    <div className="relative overflow-hidden rounded-xl">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-amber-50/80 to-orange-50/60" />
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-400 to-amber-400" />
                      <div className="relative p-6">
                        <p className="text-gray-800 leading-[1.85] whitespace-pre-line text-[15px]">
                          {product.overview}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Premium Specifications */}
                  {product.specifications && (
                    <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-100">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-5 bg-gradient-to-b from-gray-400 to-gray-300 rounded-full" />
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-[0.15em]">Specifications</p>
                      </div>
                      <p className="text-gray-600 leading-[1.75] whitespace-pre-line text-sm">
                        {product.specifications}
                      </p>
                    </div>
                  )}

                  {/* Empty state */}
                  {!product.description && !product.overview && !product.specifications && (!product.descriptionBlocks || product.descriptionBlocks.length === 0) && (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-gray-400 font-medium">No description available</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-gray-900">Customer Reviews</h3>
                    <button
                      onClick={() => setShowReviewForm(!showReviewForm)}
                      className="text-orange-600 font-semibold hover:underline"
                    >
                      Write a Review
                    </button>
                  </div>
                  
                  {showReviewForm && (
                  <form onSubmit={handleReviewSubmit} className="bg-gray-50 p-6 rounded-xl mb-8 border border-gray-200 animate-in fade-in slide-in-from-top-2">
                    <div className="grid gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Rating:</span>
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                            className={`text-2xl transition-transform hover:scale-110 ${star <= newReview.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                          >★</button>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Your Name"
                        value={newReview.name}
                        onChange={e => setNewReview(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        required
                      />
                      <textarea
                        placeholder="Share your thoughts..."
                        value={newReview.comment}
                        onChange={e => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        rows="4"
                        required
                      />
                      <div className="flex gap-3">
                        <button type="submit" className="bg-orange-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors">Submit</button>
                        <button type="button" onClick={() => setShowReviewForm(false)} className="text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
                      </div>
                    </div>
                  </form>
                  )}

                  <div className="space-y-6">
                    {reviews.length > 0 ? reviews.map(review => (
                      <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{review.name}</span>
                            {review.verified && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Verified</span>}
                          </div>
                          <span className="text-sm text-gray-400">{review.date}</span>
                        </div>
                        <div className="flex items-center mb-2">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <p className="text-gray-600 leading-relaxed">{review.comment}</p>
                      </div>
                    )) : (
                      <div className="text-center py-12 bg-gray-50 rounded-2xl">
                        <p className="text-gray-500 mb-4">No reviews yet. Be the first to share your thoughts!</p>
                        <button onClick={() => setShowReviewForm(true)} className="text-orange-600 font-semibold hover:underline">Write a Review</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
            
            <div className="hidden lg:block space-y-6">
              {relatedProducts.length > 0 && (
                <>
                  <h4 className="font-extrabold text-gray-900 border-b border-gray-100 pb-4 text-lg">You May Also Like</h4>
                  <div className="space-y-4">
                    {relatedProducts.map(p => {
                      const pImg = (p.images && p.images[0]) || p.imagePath || '/placeholder-product.svg'
                      const pImgUrl = pImg.startsWith('http') ? pImg : (pImg.startsWith('/uploads/') ? `${API_BASE}${pImg}` : pImg)
                      const pPrice = (p.salePrice > 0 && p.salePrice < p.price) ? p.salePrice : p.price
                      
                      return (
                        <Link to={`/product/${p._id}`} key={p._id} className="flex gap-4 group cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-colors">
                          <div className="w-20 h-20 bg-white rounded-lg overflow-hidden border border-gray-100 shadow-sm group-hover:shadow-md transition-all">
                            <img 
                              src={pImgUrl} 
                              alt={p.name}
                              className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" 
                            />
                          </div>
                          <div className="flex-1 py-1">
                            <h5 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2 leading-snug mb-1">
                              {p.name}
                            </h5>
                            <p className="text-orange-600 font-bold">
                              {formatPrice(
                                convertPrice(pPrice, p.baseCurrency || 'SAR', getDisplayCurrency()),
                                getDisplayCurrency()
                              )}
                            </p>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Product Images - Vertical List */}
      {images.length > 1 && (
        <div className="md:hidden px-4 pb-6">
          <h3 className="text-base font-bold text-gray-900 mb-3">Product Images</h3>
          <div className="space-y-3">
            {images.map((img, idx) => (
              <div 
                key={idx} 
                className="w-full rounded-xl overflow-hidden bg-gray-50 border border-gray-100"
              >
                <img src={img} alt={`Product ${idx + 1}`} className="w-full h-auto object-contain" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* You May Also Like - Mobile Auto Scroll */}
      {relatedProducts.length > 0 && (
        <div className="md:hidden pb-24">
          <h3 className="text-base font-bold text-gray-900 mb-3 px-4">You May Also Like</h3>
          <div className="overflow-x-auto scrollbar-hide">
            <div 
              className="flex gap-3 px-4 animate-scroll-x"
              style={{ width: 'max-content' }}
            >
              {relatedProducts.map(p => {
                const pImg = (p.images && p.images[0]) || p.imagePath || '/placeholder-product.svg'
                const pImgUrl = pImg.startsWith('http') ? pImg : (pImg.startsWith('/uploads/') ? `${API_BASE}${pImg}` : pImg)
                const pPrice = p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price
                
                return (
                  <Link to={`/product/${p._id}`} key={p._id} className="flex-shrink-0 w-36 bg-white rounded-xl overflow-hidden border border-gray-100">
                    <div className="aspect-square bg-gray-50">
                      <img src={pImgUrl} alt={p.name} className="w-full h-full object-contain p-2" />
                    </div>
                    <div className="p-2">
                      <h5 className="text-xs font-medium text-gray-900 line-clamp-2 mb-1">{p.name?.split(' ').slice(0, 3).join(' ')}</h5>
                      <p className="text-orange-500 font-bold text-xs">
                        {formatPrice(convertPrice(pPrice, p.baseCurrency || 'SAR', getDisplayCurrency()), getDisplayCurrency())}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <ShoppingCart 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
      />

      {/* Ultra Premium Product Bottom Navigation - Mobile Only */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 md:hidden safe-area-bottom">
        <div className="flex items-center h-16 px-2 gap-2">
          {/* Profile Button */}
          <button 
            onClick={() => navigate('/customer')}
            className="flex flex-col items-center justify-center w-14 h-full text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[10px] mt-0.5">Profile</span>
          </button>

          {/* Add to Cart Button */}
          <button 
            onClick={handleAddToCart}
            className="flex-1 h-11 bg-white border-2 border-orange-500 text-orange-500 font-semibold rounded-full flex items-center justify-center gap-1.5 text-sm hover:bg-orange-50 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Add to Cart
          </button>

          {/* Dropship Button */}
          <button 
            onClick={() => navigate('/dropshipper/signup')}
            className="flex flex-col items-center justify-center w-14 h-full text-blue-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-[10px] mt-0.5">Dropship</span>
          </button>
        </div>
      </div>

      {/* Spacer for fixed bottom nav */}
      <div className="h-20 md:hidden" />

      <style jsx>{`
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0);
        }
      `}</style>
      
    </div>
  )
}

export default ProductDetail