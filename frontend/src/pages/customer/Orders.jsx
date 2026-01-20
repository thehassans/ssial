import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../../api'

export default function CustomerOrders() {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('')

  useEffect(() => {
    async function load() {
      try {
        let url = '/api/ecommerce/customer/orders?limit=50'
        if (filter) url += `&status=${filter}`
        const res = await apiGet(url)
        setOrders(res.orders || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [filter])

  const statusColors = {
    new: '#3b82f6',
    processing: '#f59e0b',
    done: '#10b981',
    cancelled: '#ef4444',
    delivered: '#10b981',
    pending: '#6b7280',
    assigned: '#8b5cf6',
    in_transit: '#0ea5e9',
    picked_up: '#06b6d4',
    returned: '#dc2626'
  }

  const statusFilters = [
    { value: '', label: 'All Orders' },
    { value: 'new', label: 'New' },
    { value: 'processing', label: 'Processing' },
    { value: 'done', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>My Orders</h1>
        <p style={{ color: '#64748b', fontSize: 15 }}>Track and manage your orders</p>
      </div>

      {/* Filters */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        marginBottom: 24,
        overflowX: 'auto',
        paddingBottom: 8
      }}>
        {statusFilters.map(f => (
          <button
            key={f.value}
            onClick={() => { setLoading(true); setFilter(f.value) }}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: filter === f.value ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'var(--panel)',
              color: filter === f.value ? 'white' : 'inherit',
              boxShadow: filter === f.value ? '0 4px 12px rgba(249, 115, 22, 0.3)' : 'none'
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}>
          <div className="spinner" style={{ width: 32, height: 32 }}></div>
        </div>
      ) : orders.length === 0 ? (
        <div style={{ 
          background: 'var(--panel)', 
          borderRadius: 12, 
          padding: 60, 
          textAlign: 'center',
          border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#64748b' }}>
            No orders found
          </div>
          <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 20 }}>
            {filter ? 'No orders match this filter' : 'Start shopping to see your orders here!'}
          </p>
          <Link 
            to="/catalog" 
            style={{ 
              display: 'inline-block',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              color: 'white',
              padding: '12px 28px',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 14
            }}
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {orders.map((order) => (
            <Link
              key={order._id}
              to={`/customer/orders/${order._id}`}
              style={{
                display: 'block',
                background: 'var(--panel)',
                borderRadius: 12,
                padding: 20,
                border: '1px solid var(--border)',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
                e.currentTarget.style.borderColor = '#f97316'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = ''
                e.currentTarget.style.borderColor = 'var(--border)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    Order #{order._id?.slice(-8).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                <div style={{
                  padding: '6px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  background: `${statusColors[order.shipmentStatus || order.status] || '#6b7280'}15`,
                  color: statusColors[order.shipmentStatus || order.status] || '#6b7280'
                }}>
                  {(order.shipmentStatus || order.status)?.replace(/_/g, ' ').toUpperCase()}
                </div>
              </div>

              {/* Order Items */}
              <div style={{ marginBottom: 12 }}>
                {order.items?.slice(0, 3).map((item, idx) => (
                  <div key={idx} style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>
                    • {item.name} x{item.quantity}
                  </div>
                ))}
                {order.items?.length > 3 && (
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    +{order.items.length - 3} more items
                  </div>
                )}
              </div>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                paddingTop: 12,
                borderTop: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  📍 {order.city}, {order.orderCountry}
                </div>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#f97316' }}>
                  {order.currency || 'SAR'} {order.total?.toFixed(2) || '0.00'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
