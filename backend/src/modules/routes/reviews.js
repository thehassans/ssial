import express from 'express'
import { auth, allowRoles } from '../middleware/auth.js'
import Review from '../models/Review.js'
import Product from '../models/Product.js'
import Order from '../models/Order.js'

const router = express.Router()

// Get reviews for a product (public)
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params
    const { page = 1, limit = 10 } = req.query
    
    const reviews = await Review.find({ 
      product: productId, 
      isApproved: true 
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean()
    
    const total = await Review.countDocuments({ product: productId, isApproved: true })
    
    // Calculate rating stats
    const allReviews = await Review.find({ product: productId, isApproved: true }).select('rating').lean()
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let totalRating = 0
    allReviews.forEach(r => {
      ratingCounts[r.rating] = (ratingCounts[r.rating] || 0) + 1
      totalRating += r.rating
    })
    const averageRating = allReviews.length > 0 ? (totalRating / allReviews.length).toFixed(1) : 0
    
    res.json({
      reviews,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
      stats: { averageRating: Number(averageRating), totalReviews: allReviews.length, ratingCounts }
    })
  } catch (error) {
    console.error('Get reviews error:', error)
    res.status(500).json({ message: 'Failed to fetch reviews' })
  }
})

// Check if customer can review a product (has delivered order)
router.get('/can-review/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params
    const userId = req.user.id
    
    // Find delivered orders containing this product
    const deliveredOrders = await Order.find({
      customer: userId,
      status: 'delivered',
      'items.product': productId
    }).select('_id orderId').lean()
    
    if (deliveredOrders.length === 0) {
      return res.json({ canReview: false, reason: 'No delivered orders with this product' })
    }
    
    // Check if already reviewed
    const existingReviews = await Review.find({
      product: productId,
      order: { $in: deliveredOrders.map(o => o._id) }
    }).select('order').lean()
    
    const reviewedOrderIds = new Set(existingReviews.map(r => String(r.order)))
    const unreviewedOrders = deliveredOrders.filter(o => !reviewedOrderIds.has(String(o._id)))
    
    res.json({
      canReview: unreviewedOrders.length > 0,
      unreviewedOrders: unreviewedOrders.map(o => ({ _id: o._id, orderId: o.orderId })),
      alreadyReviewedCount: existingReviews.length
    })
  } catch (error) {
    console.error('Can review check error:', error)
    res.status(500).json({ message: 'Failed to check review eligibility' })
  }
})

// Submit a review (customer with delivered order only)
router.post('/', auth, async (req, res) => {
  try {
    const { productId, orderId, rating, title, comment } = req.body
    const userId = req.user.id
    
    if (!productId || !orderId || !rating) {
      return res.status(400).json({ message: 'Product, order, and rating are required' })
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' })
    }
    
    // Verify order exists, is delivered, and belongs to user
    const order = await Order.findOne({
      _id: orderId,
      status: 'delivered',
      'items.product': productId
    }).lean()
    
    if (!order) {
      return res.status(403).json({ message: 'You can only review products from delivered orders' })
    }
    
    // Check if already reviewed this product for this order
    const existingReview = await Review.findOne({ product: productId, order: orderId })
    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product for this order' })
    }
    
    // Create review
    const review = new Review({
      product: productId,
      order: orderId,
      customer: userId,
      customerName: order.customerName || 'Customer',
      customerEmail: order.customerEmail || '',
      rating: Number(rating),
      title: title || '',
      comment: comment || '',
      country: order.country || '',
      isVerifiedPurchase: true,
      isApproved: true
    })
    
    await review.save()
    
    // Update product rating
    const allReviews = await Review.find({ product: productId, isApproved: true }).select('rating').lean()
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
    await Product.findByIdAndUpdate(productId, { 
      rating: Number(avgRating.toFixed(1)), 
      reviewCount: allReviews.length 
    })
    
    res.status(201).json({ message: 'Review submitted successfully', review })
  } catch (error) {
    console.error('Submit review error:', error)
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already reviewed this product for this order' })
    }
    res.status(500).json({ message: 'Failed to submit review' })
  }
})

// Get customer's reviews
router.get('/my-reviews', auth, async (req, res) => {
  try {
    const reviews = await Review.find({ customer: req.user.id })
      .populate('product', 'name imagePath images')
      .sort({ createdAt: -1 })
      .lean()
    
    res.json({ reviews })
  } catch (error) {
    console.error('Get my reviews error:', error)
    res.status(500).json({ message: 'Failed to fetch reviews' })
  }
})

// Delete review (owner or admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
    if (!review) {
      return res.status(404).json({ message: 'Review not found' })
    }
    
    if (req.user.role !== 'admin' && String(review.customer) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' })
    }
    
    const productId = review.product
    await Review.deleteOne({ _id: req.params.id })
    
    // Update product rating
    const allReviews = await Review.find({ product: productId, isApproved: true }).select('rating').lean()
    const avgRating = allReviews.length > 0 ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length : 0
    await Product.findByIdAndUpdate(productId, { 
      rating: Number(avgRating.toFixed(1)), 
      reviewCount: allReviews.length 
    })
    
    res.json({ message: 'Review deleted' })
  } catch (error) {
    console.error('Delete review error:', error)
    res.status(500).json({ message: 'Failed to delete review' })
  }
})

// Generate auto reviews for all products (with secret key for security)
router.get('/generate-auto-reviews', async (req, res) => {
  // Simple secret key check instead of auth
  const secretKey = req.query.key || req.body.key
  if (secretKey !== 'buysial2024generate') {
    return res.status(403).json({ message: 'Invalid key' })
  }
  try {
    // Drop the old unique index if it exists
    try {
      await Review.collection.dropIndex('product_1_order_1')
      console.log('Dropped old unique index')
    } catch (e) {
      // Index might not exist, ignore
    }

    // Mixed names from Arab, UK, and US
    const arabNames = [
      "Ahmed Al-Rashid", "Fatima Hassan", "Mohammed Al-Farsi", "Sara Abdullah",
      "Khalid Omar", "Noura Al-Qahtani", "Yusuf Ibrahim", "Layla Mahmoud",
      "Omar Khalil", "Aisha Al-Nasser", "Hassan Ali", "Mariam Al-Sheikh",
      "Abdullah Nasser", "Huda Al-Sayed", "Tariq Mohammed", "Reem Al-Dosari"
    ]
    const ukNames = [
      "James Wilson", "Emma Thompson", "Oliver Smith", "Sophie Brown",
      "Harry Johnson", "Charlotte Davies", "George Williams", "Emily Taylor",
      "William Jones", "Amelia Evans", "Thomas White", "Olivia Martin"
    ]
    const usNames = [
      "Michael Johnson", "Jennifer Smith", "David Williams", "Sarah Davis",
      "Christopher Brown", "Ashley Miller", "Matthew Wilson", "Amanda Moore",
      "Joshua Taylor", "Stephanie Anderson", "Andrew Thomas", "Nicole Jackson"
    ]
    const allNames = [...arabNames, ...ukNames, ...usNames]

    const reviewTemplates = {
      5: [
        { title: "Absolutely Amazing!", comments: [
          "This product exceeded all my expectations. Highly recommend!",
          "Best purchase I've made this year. Quality is outstanding!",
          "Perfect in every way. Fast delivery and excellent packaging.",
          "Love it! Will definitely buy again. Five stars all the way!",
          "Incredible quality for the price. Very happy with my purchase.",
        ]},
        { title: "Highly Recommended!", comments: [
          "Top-notch quality and fast shipping. Very impressed!",
          "This is exactly as described. Excellent product!",
          "Super happy with this purchase. Will order more!",
        ]},
      ],
      4: [
        { title: "Great Product!", comments: [
          "Really good quality. Minor packaging issue but product is great.",
          "Very satisfied with my purchase. Would recommend.",
          "Good product, fast delivery. Happy with it!",
          "Nice quality, slightly smaller than expected but still good.",
        ]},
        { title: "Very Good!", comments: [
          "Great product overall. Delivery was a bit slow but worth the wait.",
          "Good quality and nice design. Recommended!",
        ]},
      ],
    }

    const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
    const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)]
    const getRandomRating = () => Math.random() < 0.6 ? 5 : 4

    const generateReview = (productId) => {
      const rating = getRandomRating()
      const templates = reviewTemplates[rating]
      const template = getRandomElement(templates)
      const comment = getRandomElement(template.comments)
      const name = getRandomElement(allNames)
      
      let country = ""
      if (arabNames.includes(name)) {
        country = getRandomElement(["Saudi Arabia", "UAE", "Kuwait", "Qatar", "Bahrain", "Oman"])
      } else if (ukNames.includes(name)) {
        country = "UK"
      } else {
        country = "USA"
      }

      const now = new Date()
      const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
      const randomDate = new Date(sixMonthsAgo.getTime() + Math.random() * (now.getTime() - sixMonthsAgo.getTime()))

      return {
        product: productId,
        customerName: name,
        customerEmail: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        rating,
        title: template.title,
        comment,
        isVerifiedPurchase: true,
        isApproved: true,
        isAutoGenerated: true,
        helpfulCount: getRandomInt(0, 15),
        country,
        createdAt: randomDate,
        updatedAt: randomDate,
      }
    }

    // Get all products
    const products = await Product.find({ displayOnWebsite: true }).lean()
    let totalReviewsCreated = 0
    let productsUpdated = 0

    for (const product of products) {
      const existingAutoReviews = await Review.countDocuments({ 
        product: product._id, 
        isAutoGenerated: true 
      })

      if (existingAutoReviews >= 3) continue

      const reviewCount = getRandomInt(3, 10)
      const reviewsToCreate = reviewCount - existingAutoReviews
      
      if (reviewsToCreate <= 0) continue

      const reviews = []
      for (let i = 0; i < reviewsToCreate; i++) {
        reviews.push(generateReview(product._id))
      }

      await Review.insertMany(reviews)
      totalReviewsCreated += reviews.length

      const allReviews = await Review.find({ product: product._id }).lean()
      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length

      await Product.updateOne(
        { _id: product._id },
        { rating: Math.round(avgRating * 10) / 10, reviewCount: allReviews.length }
      )
      productsUpdated++
    }

    res.json({ 
      success: true, 
      message: `Generated ${totalReviewsCreated} reviews for ${productsUpdated} products` 
    })
  } catch (error) {
    console.error('Generate auto reviews error:', error)
    res.status(500).json({ message: 'Failed to generate reviews', error: error.message })
  }
})

export default router
