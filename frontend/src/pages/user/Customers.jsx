import React, { useEffect, useState } from 'react'
import { apiGet } from '../../api'

export default function Customers() {
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerOrders, setCustomerOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await apiGet(`/api/users/customers?limit=100${search ? `&q=${encodeURIComponent(search)}` : ''}`)
      setCustomers(res.customers || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function viewCustomerOrders(customer) {
    setSelectedCustomer(customer)
    setLoadingOrders(true)
    try {
      const res = await apiGet(`/api/users/customers/${customer._id}`)
      setCustomerOrders(res.orders || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingOrders(false)
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    load()
  }

  const statusColors = {
    new: '#3b82f6',
    processing: '#f59e0b',
    done: '#10b981',
    cancelled: '#ef4444',
    delivered: '#10b981',
    pending: '#6b7280'
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="gradient" style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Customers</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Manage customers who signed up on your website
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, maxWidth: 500 }}>
          <input
            className="input"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn primary">Search</button>
        </div>
      </form>

      {/* Stats Summary */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: 16, 
        marginBottom: 24 
      }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
            Total Customers
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#3b82f6' }}>
            {customers.length}
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
            Total Orders
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981' }}>
            {customers.reduce((sum, c) => sum + (c.orderStats?.totalOrders || 0), 0)}
          </div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
            Total Revenue
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f97316' }}>
            {customers.reduce((sum, c) => sum + (c.orderStats?.totalSpent || 0), 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Customers Grid */}
      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}>
          <div className="spinner" style={{ width: 32, height: 32 }}></div>
        </div>
      ) : customers.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No customers found</div>
          <p style={{ color: 'var(--text-secondary)' }}>
            Customers will appear here when they register on your website
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
          {customers.map((customer) => (
            <div 
              key={customer._id}
              className="card"
              style={{ 
                padding: 20,
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: selectedCustomer?._id === customer._id ? '2px solid #f97316' : '1px solid var(--border)'
              }}
              onClick={() => viewCustomerOrders(customer)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 16,
                  flexShrink: 0
                }}>
                  {customer.firstName?.[0] || 'C'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {customer.firstName} {customer.lastName}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                    📧 {customer.email}
                  </div>
                  {customer.phone && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                      📞 {customer.phone}
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    🛒 {customer.orderStats?.totalOrders || 0} orders
                  </span>
                  <span style={{ fontWeight: 700, color: '#10b981' }}>
                    {customer.orderStats?.totalSpent?.toFixed(2) || '0.00'} spent
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
                  Joined: {new Date(customer.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customer Orders Modal */}
      {selectedCustomer && (
        <div 
          className="modal-overlay" 
          onClick={() => setSelectedCustomer(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
            padding: 24
          }}
        >
          <div 
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--panel)',
              borderRadius: 16,
              maxWidth: 600,
              width: '100%',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </h2>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {selectedCustomer.email}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--panel-2)',
                    cursor: 'pointer',
                    fontSize: 16
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Order History</h3>
              
              {loadingOrders ? (
                <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}>
                  <div className="spinner"></div>
                </div>
              ) : customerOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                  No orders yet
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {customerOrders.map((order) => (
                    <div 
                      key={order._id}
                      style={{
                        padding: 16,
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        background: 'var(--panel-2)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>
                          #{order._id?.slice(-8).toUpperCase()}
                        </span>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 12,
                          fontSize: 10,
                          fontWeight: 600,
                          background: `${statusColors[order.shipmentStatus || order.status] || '#6b7280'}20`,
                          color: statusColors[order.shipmentStatus || order.status] || '#6b7280'
                        }}>
                          {(order.shipmentStatus || order.status)?.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {order.items?.length || 0} items
                        </span>
                        <span style={{ fontWeight: 700, color: '#f97316' }}>
                          {order.currency || 'SAR'} {order.total?.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
