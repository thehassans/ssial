import React, { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { apiGet } from '../../api'

export default function MyStock() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [me, setMe] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('me') || '{}')
    } catch {
      return {}
    }
  })

  async function load() {
    setLoading(true)
    try {
      const r = await apiGet('/api/manager-stock/me')
      setRows(Array.isArray(r?.rows) ? r.rows : [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { user } = await apiGet('/api/users/me')
        if (!alive) return
        setMe(user || {})
        try {
          localStorage.setItem('me', JSON.stringify(user || {}))
        } catch {}
      } catch {
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const canAccessProductDetail = !!(me && me.managerPermissions && me.managerPermissions.canAccessProductDetail)

  const items = useMemo(() => {
    const map = new Map()
    for (const row of rows || []) {
      const p = row?.productId
      const pid = String(p?._id || row?.productId || '')
      if (!pid) continue
      const name = p?.name || row?.productName || 'Product'
      const country = String(row?.country || '').trim()
      const qty = Number(row?.qty || 0)
      if (!map.has(pid)) {
        map.set(pid, { productId: pid, name, countries: {}, total: 0 })
      }
      const it = map.get(pid)
      it.countries[country] = (it.countries[country] || 0) + qty
      it.total += qty
    }
    let arr = Array.from(map.values())
    const query = String(q || '').trim().toLowerCase()
    if (query) {
      arr = arr.filter((it) => {
        if (String(it.name || '').toLowerCase().includes(query)) return true
        for (const c of Object.keys(it.countries || {})) {
          if (String(c).toLowerCase().includes(query)) return true
        }
        return false
      })
    }
    arr.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
    return arr
  }, [rows, q])

  return (
    <div className="section">
      <div className="page-header">
        <div>
          <div className="page-title gradient heading-blue">My Stock</div>
          <div className="page-subtitle">Your allocated product stock</div>
        </div>
      </div>

      <div className="card" style={{ padding: 16, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search product or country"
            style={{ minWidth: 220, flex: 1 }}
          />
          <button className="btn" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="helper">Loading...</div>
        ) : items.length === 0 ? (
          <div className="helper">No allocated stock</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, opacity: 0.7 }}>Product</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, opacity: 0.7 }}>Countries</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, opacity: 0.7 }}>Total</th>
                  <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, opacity: 0.7 }}>Link</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const countries = Object.entries(it.countries || {})
                    .filter(([, v]) => Number(v || 0) > 0)
                    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))

                  return (
                    <tr key={it.productId} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.12)' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 700 }}>{it.name}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {countries.map(([c, v]) => (
                            <span
                              key={c}
                              className="chip"
                              style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
                            >
                              <strong>{c}</strong>
                              <span style={{ marginLeft: 6 }}>{Number(v || 0)}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800 }}>{Number(it.total || 0)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                        {canAccessProductDetail ? (
                          <NavLink className="link" to={`/manager/products/${it.productId}`}>
                            View
                          </NavLink>
                        ) : (
                          <span className="helper">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
