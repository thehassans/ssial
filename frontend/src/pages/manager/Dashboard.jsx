import React, { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { apiGet } from '../../api'

export default function ManagerDashboard(){
  const [isMobile, setIsMobile] = useState(()=> (typeof window!=='undefined' ? window.innerWidth <= 768 : false))
  const [me, setMe] = useState(()=>{
    try{ return JSON.parse(localStorage.getItem('me')||'null') }catch{ return null }
  })
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState(null) // assigned-order scoped metrics from backend

  useEffect(()=>{
    function onResize(){ setIsMobile(window.innerWidth <= 768) }
    window.addEventListener('resize', onResize)
    return ()=> window.removeEventListener('resize', onResize)
  },[])

  useEffect(()=>{
    let alive = true
    ;(async ()=>{ 
      try{ 
        const { user } = await apiGet('/api/users/me'); 
        if (!alive) return
        setMe(user||null)
        try{ localStorage.setItem('me', JSON.stringify(user||{})) }catch{}
      }catch{ 
        // keep local me fallback
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return ()=>{ alive = false }
  },[])

  const canCreateAgents = !!(me && me.managerPermissions && me.managerPermissions.canCreateAgents)
  const canManageProducts = !!(me && me.managerPermissions && me.managerPermissions.canManageProducts)
  const canCreateOrders = !!(me && me.managerPermissions && me.managerPermissions.canCreateOrders)
  const canCreateDrivers = !!(me && me.managerPermissions && me.managerPermissions.canCreateDrivers)

  function fmtNum(n){ try{ return Number(n||0).toLocaleString() }catch{ return String(n||0) } }
  function fmtAmt(n){ try{ return Number(n||0).toLocaleString(undefined, { maximumFractionDigits: 2 }) }catch{ return String(n||0) } }

  // Responsive sizing and shared colors (match Agent/Driver)
  const minTile = isMobile ? 200 : 240
  const tileGap = isMobile ? 8 : 12
  const valueFontSize = isMobile ? 24 : 28
  const COLORS = {
    primary: '#3b82f6', // blue
    primaryLight: '#0ea5e9',
    success: '#10b981',
    successDeep: '#16a34a',
    warning: '#f59e0b',
    secondary: '#64748b',
    transit: '#0284c7',
    ofd: '#f97316',
    danger: '#ef4444',
    dangerDeep: '#b91c1c',
    neutral: '#737373',
  }
  const STATUS_COLORS = {
    assigned_all: COLORS.primaryLight,
    assigned: COLORS.primary,
    picked: COLORS.warning,
    transit: COLORS.transit,
    ofd: COLORS.ofd,
    delivered: COLORS.success,
    no_resp: COLORS.danger,
    returned: COLORS.neutral,
    cancelled: COLORS.dangerDeep,
    collected: COLORS.success,
    deliv_co: COLORS.successDeep,
    pending_co: COLORS.warning,
  }

  // Load manager metrics (assigned-order scoped by backend)
  useEffect(()=>{
    (async()=>{
      try{ setMetrics(await apiGet('/api/reports/manager-metrics')) }catch{ setMetrics(null) }
    })()
  },[])

  const countries = useMemo(()=>{
    const base = metrics?.countries || {}
    const keys = Object.keys(base)
    return keys.filter(k => base[k] && Number(base[k]?.orders||0) > 0)
  }, [metrics])

  return (
    <div className="section">
      <div className="page-header">
        <div>
          <div className="page-title gradient heading-blue">Manager</div>
          <div className="page-subtitle">Dashboard overview for orders assigned to you</div>
        </div>
      </div>

      <div style={{display:'grid', gap:12}}>
      {/* Orders Summary (Access Countries) */}
      <div className="card" style={{padding:16}}>
        {(function(){
          const st = metrics?.statusTotals || {}
          const totalOrdersCount = Number(st.total||0)
          const deliveredCount = Number(st.delivered||0)
          const pendingCount = Number(st.pending||0)
          function Chips({ keyName, isAmount }){
            return (
              <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
                {(countries||[]).map(c=>{
                  const m = (metrics?.countries||{})[c] || {}
                  const val = isAmount ? Number(m[keyName]||0) : Number((keyName==='orders'?m.orders:m[keyName])||0)
                  if (!(val>0)) return null
                  return (
                    <span key={c} className="chip" style={{background:'var(--panel)', border:'1px solid var(--border)'}}>
                      <strong>{c}</strong>
                      <span style={{marginLeft:6}}>{isAmount ? fmtAmt(val) : fmtNum(val)}</span>
                    </span>
                  )
                })}
              </div>
            )
          }
          function Tile({ title, valueEl, chipsEl, color }){
            return (
              <div className="tile" style={{display:'grid', gap:6, padding:16, textAlign:'left', border:'1px solid var(--border)', background:'var(--panel)', borderRadius:12, minHeight:100}}>
                <div className="helper">{title}</div>
                <div style={{fontSize:valueFontSize, fontWeight:800, color: color || 'inherit'}}>{valueEl}</div>
                <div>{chipsEl}</div>
              </div>
            )
          }
          return (
            <div className="section" style={{display:'grid', gap:12}}>
              <div style={{fontWeight:800,fontSize:16}}>Orders Summary (Assigned to You)</div>
              <div className="grid" style={{gridTemplateColumns:`repeat(auto-fit, minmax(${minTile}px, 1fr))`, gap: tileGap}}>
                <Tile title="Total Orders" valueEl={fmtNum(totalOrdersCount)} color={COLORS.primaryLight} chipsEl={<Chips keyName="orders" />} />
                <Tile title="Orders Delivered" valueEl={fmtNum(deliveredCount)} color={COLORS.successDeep} chipsEl={<Chips keyName="delivered" />} />
                <Tile title="Open Orders" valueEl={fmtNum(pendingCount)} color={COLORS.warning} chipsEl={<Chips keyName="pending" />} />
              </div>
            </div>
          )
        })()}
      </div>

      {/* Status Summary (Assigned to You) */}
      <div className="card" style={{padding:16}}>
        {(function(){
          const st = metrics?.statusTotals || {}
          function Tile({ title, value, to, color }){
            return (
              <div className="tile" style={{display:'grid', gap:6, padding:16, textAlign:'left', border:'1px solid var(--border)', background:'var(--panel)', borderRadius:12, minHeight:100}}>
                <div className="helper">{title}</div>
                <div style={{fontSize:valueFontSize, fontWeight:800, color: color || 'inherit'}}>{to ? (<NavLink className="link" to={to}>{fmtNum(value||0)}</NavLink>) : fmtNum(value||0)}</div>
              </div>
            )
          }
          return (
            <div className="section" style={{display:'grid', gap:12}}>
              <div style={{fontWeight:800,fontSize:16}}>Status Summary (Assigned to You)</div>
              <div className="grid" style={{gridTemplateColumns:`repeat(auto-fit, minmax(${minTile}px, 1fr))`, gap: tileGap}}>
                <Tile title="Total Orders" value={st.total} to={'/manager/orders'} color={COLORS.primaryLight} />
                <Tile title="Pending" value={st.pending} to={'/manager/orders?ship=pending'} color={COLORS.warning} />
                <Tile title="Assigned" value={st.assigned} to={'/manager/orders?ship=assigned'} color={COLORS.primary} />
                <Tile title="Picked Up" value={st.picked_up} to={'/manager/orders?ship=picked_up'} color={COLORS.warning} />
                <Tile title="In Transit" value={st.in_transit} to={'/manager/orders?ship=in_transit'} color={COLORS.transit} />
                <Tile title="Out for Delivery" value={st.out_for_delivery} to={'/manager/orders?ship=out_for_delivery'} color={COLORS.ofd} />
                <Tile title="Delivered" value={st.delivered} to={'/manager/orders?ship=delivered'} color={COLORS.success} />
                <Tile title="No Response" value={st.no_response} to={'/manager/orders?ship=no_response'} color={COLORS.danger} />
                <Tile title="Returned" value={st.returned} to={'/manager/orders?ship=returned'} color={COLORS.neutral} />
                <Tile title="Cancelled" value={st.cancelled} to={'/manager/orders?ship=cancelled'} color={COLORS.dangerDeep} />
              </div>
            </div>
          )
        })()}
      </div>
      </div>

      {/* Quick actions moved to bottom on mobile */}

      {/* Assigned Orders by Country */}
      <div className="card" style={{padding:16}}>
        <div style={{fontWeight:800,fontSize:16, marginBottom:6}}>Assigned Orders by Country</div>
        <div className="helper" style={{marginBottom:12}}>These stats reflect only orders assigned to you.</div>
        <div className="section" style={{display:'grid', gap:10}}>
          {(countries||[]).length === 0 ? (
            <div className="helper">No assigned orders yet</div>
          ) : (
            <div className="grid" style={{gridTemplateColumns:`repeat(auto-fit, minmax(${minTile}px, 1fr))`, gap: tileGap}}>
              {(countries||[]).map(c => {
                const m = (metrics?.countries||{})[c] || {}
                const qs = encodeURIComponent(String(c||''))
                return (
                  <div key={c} className="tile" style={{display:'grid', gap:6, padding:16, textAlign:'left', border:'1px solid var(--border)', background:'var(--panel)', borderRadius:12, minHeight:100}}>
                    <div className="helper">{c}</div>
                    <div style={{fontSize:valueFontSize, fontWeight:800}}>{fmtNum(m.orders||0)}</div>
                    <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                      <NavLink className="chip" to={`/manager/orders?country=${qs}`}>View</NavLink>
                      <NavLink className="chip" to={`/manager/orders?country=${qs}&ship=pending`}>Open</NavLink>
                      <NavLink className="chip" to={`/manager/orders?country=${qs}&ship=delivered`}>Delivered</NavLink>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
