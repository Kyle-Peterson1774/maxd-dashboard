import { useState, useMemo, useEffect } from 'react'
import PageHeader from '../components/ui/PageHeader.jsx'
import { fetchShopifyOrders, fetchShopifyProducts, shopifyProductsToInventory, shopifyOrdersToOpsOrders } from '../lib/liveData.js'
import { isConnected } from '../lib/credentials.js'
import { dbSet, dbGet } from '../lib/db.js'
import AgentPanel from '../components/ui/AgentPanel.jsx'

const STORE_KEY = 'maxd_operations'

const SUPPLIERS = ['In-House', 'Supplier A', 'Supplier B', 'Supplier C', 'Contract Mfg']
const FULFILLMENT_PARTNERS = ['ShipBob', 'ShipStation', 'In-House', 'Amazon FBA', '3PL Partner']
const BATCH_STATUSES = ['planned', 'in-production', 'qc', 'completed', 'on-hold']
const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

const DEMO = {
  inventory: [
    { id: 'i1', sku: 'MAXD-GUMMY-30',   name: 'Recovery Gummies 30ct',     category: 'Gummies',     stock: 840,  reorderPoint: 200, unitCost: 4.20, supplier: 'Supplier A' },
    { id: 'i2', sku: 'MAXD-GUMMY-60',   name: 'Recovery Gummies 60ct',     category: 'Gummies',     stock: 420,  reorderPoint: 150, unitCost: 7.80, supplier: 'Supplier A' },
    { id: 'i3', sku: 'MAXD-CREAT-250',  name: 'Creatine Monohydrate 250g', category: 'Powder',      stock: 312,  reorderPoint: 100, unitCost: 5.40, supplier: 'Supplier B' },
    { id: 'i4', sku: 'MAXD-CREAT-500',  name: 'Creatine Monohydrate 500g', category: 'Powder',      stock: 88,   reorderPoint: 100, unitCost: 9.80, supplier: 'Supplier B' },
    { id: 'i5', sku: 'MAXD-BUNDLE-01',  name: 'Spring Bundle',             category: 'Bundle',      stock: 145,  reorderPoint: 50,  unitCost: 18.60, supplier: 'In-House' },
    { id: 'i6', sku: 'MAXD-SHAKER-BLK', name: 'MAXD Shaker — Black',       category: 'Accessories', stock: 220,  reorderPoint: 75,  unitCost: 3.50, supplier: 'Supplier C' },
  ],
  batches: [
    { id: 'b1', batchNo: 'B-2026-04-01', product: 'Recovery Gummies 30ct', sku: 'MAXD-GUMMY-30',   qty: 2000, status: 'completed',     startDate: '2026-03-20', endDate: '2026-04-02', notes: 'Q1 restock run' },
    { id: 'b2', batchNo: 'B-2026-04-02', product: 'Creatine Mono 500g',    sku: 'MAXD-CREAT-500',  qty: 500,  status: 'in-production', startDate: '2026-04-05', endDate: '2026-04-18', notes: 'Low stock reorder' },
    { id: 'b3', batchNo: 'B-2026-04-03', product: 'Recovery Gummies 60ct', sku: 'MAXD-GUMMY-60',   qty: 1000, status: 'planned',       startDate: '2026-04-20', endDate: '2026-05-05', notes: 'Q2 launch prep' },
  ],
  orders: [
    { id: 'o1', orderNo: 'ORD-10401', customer: 'Shopify',    sku: 'MAXD-GUMMY-30',   qty: 12, status: 'shipped',    date: '2026-04-08', fulfillment: 'ShipBob', trackingNo: '1Z999AA10123456784' },
    { id: 'o2', orderNo: 'ORD-10402', customer: 'Shopify',    sku: 'MAXD-CREAT-250',  qty: 6,  status: 'processing', date: '2026-04-08', fulfillment: 'ShipBob', trackingNo: '' },
    { id: 'o3', orderNo: 'ORD-10399', customer: 'Wholesale',  sku: 'MAXD-BUNDLE-01',  qty: 24, status: 'delivered',  date: '2026-04-06', fulfillment: 'In-House', trackingNo: '1Z999AA10123456001' },
    { id: 'o4', orderNo: 'ORD-10398', customer: 'Shopify',    sku: 'MAXD-GUMMY-60',   qty: 8,  status: 'pending',    date: '2026-04-09', fulfillment: 'ShipBob', trackingNo: '' },
  ],
}

const EMPTY_DATA = { inventory: [], batches: [], orders: [] }

function load() {
  try { const r = localStorage.getItem(STORE_KEY); return r ? JSON.parse(r) : EMPTY_DATA } catch { return EMPTY_DATA }
}
function save(d) { dbSet(STORE_KEY, d) }
function nid() { return `i_${Date.now()}_${Math.random().toString(36).slice(2,5)}` }
function money(n) { return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

const inp = { display: 'block', width: '100%', marginTop: 4, padding: '0.45rem 0.6rem', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }

const BATCH_COLORS = { planned: '#64748b', 'in-production': '#f59e0b', qc: '#8b5cf6', completed: '#22c55e', 'on-hold': '#ef4444' }
const ORDER_COLORS = { pending: '#64748b', processing: '#f59e0b', shipped: '#3b82f6', delivered: '#22c55e', cancelled: '#ef4444' }

// ── Inventory Modal ──────────────────────────────────────────────────────────
function InventoryModal({ item, onClose, onSave, onDelete }) {
  const isNew = !item?.id
  const blank = { sku: '', name: '', category: '', stock: '', reorderPoint: '', unitCost: '', supplier: 'Supplier A' }
  const [form, setForm] = useState(item || blank)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1.25rem', color: 'var(--text-primary)', fontFamily: 'Oswald, sans-serif' }}>{isNew ? 'Add SKU' : 'Edit Inventory'}</h3>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>SKU
              <input value={form.sku} onChange={e => set('sku', e.target.value)} style={inp} placeholder="MAXD-PROD-001" />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Category
              <input value={form.category} onChange={e => set('category', e.target.value)} style={inp} />
            </label>
          </div>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Product Name
            <input value={form.name} onChange={e => set('name', e.target.value)} style={inp} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Stock (units)
              <input type="number" value={form.stock} onChange={e => set('stock', e.target.value)} style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Reorder Point
              <input type="number" value={form.reorderPoint} onChange={e => set('reorderPoint', e.target.value)} style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Unit Cost ($)
              <input type="number" step="0.01" value={form.unitCost} onChange={e => set('unitCost', e.target.value)} style={inp} />
            </label>
          </div>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Supplier
            <select value={form.supplier} onChange={e => set('supplier', e.target.value)} style={inp}>
              {SUPPLIERS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
          <button onClick={() => { onSave({ ...form, id: form.id || nid() }); onClose() }} className="btn btn-primary">Save</button>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          {!isNew && <button onClick={() => { onDelete(form.id); onClose() }} className="btn btn-ghost" style={{ marginLeft: 'auto', color: 'var(--red)' }}>Delete</button>}
        </div>
      </div>
    </div>
  )
}

// ── Batch Modal ──────────────────────────────────────────────────────────────
function BatchModal({ batch, onClose, onSave, onDelete }) {
  const isNew = !batch?.id
  const blank = { batchNo: `B-${new Date().toISOString().slice(0,10).replace(/-/g,'-')}-01`, product: '', sku: '', qty: '', status: 'planned', startDate: new Date().toISOString().split('T')[0], endDate: '', notes: '' }
  const [form, setForm] = useState(batch || blank)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1.25rem', color: 'var(--text-primary)', fontFamily: 'Oswald, sans-serif' }}>{isNew ? 'Create Batch' : 'Edit Batch'}</h3>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Batch #
              <input value={form.batchNo} onChange={e => set('batchNo', e.target.value)} style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Status
              <select value={form.status} onChange={e => set('status', e.target.value)} style={inp}>
                {BATCH_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1).replace('-',' ')}</option>)}
              </select>
            </label>
          </div>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Product
            <input value={form.product} onChange={e => set('product', e.target.value)} style={inp} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>SKU
              <input value={form.sku} onChange={e => set('sku', e.target.value)} style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Quantity (units)
              <input type="number" value={form.qty} onChange={e => set('qty', e.target.value)} style={inp} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Start Date
              <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>End Date
              <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} style={inp} />
            </label>
          </div>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Notes
            <input value={form.notes} onChange={e => set('notes', e.target.value)} style={inp} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
          <button onClick={() => { onSave({ ...form, id: form.id || nid() }); onClose() }} className="btn btn-primary">Save</button>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          {!isNew && <button onClick={() => { onDelete(form.id); onClose() }} className="btn btn-ghost" style={{ marginLeft: 'auto', color: 'var(--red)' }}>Delete</button>}
        </div>
      </div>
    </div>
  )
}

// ── Order Modal ──────────────────────────────────────────────────────────────
function OrderModal({ order, onClose, onSave, onDelete }) {
  const isNew = !order?.id
  const blank = { orderNo: '', customer: 'Shopify', sku: '', qty: '', status: 'pending', date: new Date().toISOString().split('T')[0], fulfillment: 'ShipBob', trackingNo: '' }
  const [form, setForm] = useState(order || blank)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1.25rem', color: 'var(--text-primary)', fontFamily: 'Oswald, sans-serif' }}>{isNew ? 'Add Order' : 'Edit Order'}</h3>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Order #
              <input value={form.orderNo} onChange={e => set('orderNo', e.target.value)} style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Date
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inp} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Customer / Channel
              <input value={form.customer} onChange={e => set('customer', e.target.value)} style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Status
              <select value={form.status} onChange={e => set('status', e.target.value)} style={inp}>
                {ORDER_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>SKU
              <input value={form.sku} onChange={e => set('sku', e.target.value)} style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Qty
              <input type="number" value={form.qty} onChange={e => set('qty', e.target.value)} style={inp} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Fulfillment Partner
              <select value={form.fulfillment} onChange={e => set('fulfillment', e.target.value)} style={inp}>
                {FULFILLMENT_PARTNERS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Tracking #
              <input value={form.trackingNo} onChange={e => set('trackingNo', e.target.value)} style={inp} />
            </label>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
          <button onClick={() => { onSave({ ...form, id: form.id || nid() }); onClose() }} className="btn btn-primary">Save</button>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          {!isNew && <button onClick={() => { onDelete(form.id); onClose() }} className="btn btn-ghost" style={{ marginLeft: 'auto', color: 'var(--red)' }}>Delete</button>}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function Operations() {
  const [data, setData]         = useState(load)
  const [tab, setTab]           = useState('inventory')
  const [invModal, setInvModal] = useState(null)
  const [batchModal, setBatchModal] = useState(null)
  const [orderModal, setOrderModal] = useState(null)
  const [searchQ, setSearchQ]   = useState('')
  const [syncing, setSyncing]   = useState(false)

  // Refresh from Supabase when page opens
  useEffect(() => {
    dbGet(STORE_KEY).then(d => { if (d) setData(d) })
  }, [])
  const [syncStatus, setSyncStatus] = useState(null)

  const persist = (next) => { setData(next); save(next) }

  // Auto-fetch Shopify products (inventory) and orders when Shopify is connected
  useEffect(() => {
    if (!isConnected('shopify')) return
    setSyncing(true)
    Promise.all([fetchShopifyProducts(), fetchShopifyOrders(60)]).then(([products, orders]) => {
      setSyncing(false)
      if (!products && !orders) { setSyncStatus('error'); return }
      setSyncStatus('ok')
      setData(prev => {
        const existingIds = new Set(prev.inventory.map(i => i.id))
        const newInv = products ? shopifyProductsToInventory(products).filter(i => !existingIds.has(i.id)) : []
        const existingOrderIds = new Set(prev.orders.map(o => o.id))
        const newOrders = orders ? shopifyOrdersToOpsOrders(orders).filter(o => !existingOrderIds.has(o.id)) : []
        if (newInv.length === 0 && newOrders.length === 0) return prev
        const next = {
          ...prev,
          inventory: [...newInv, ...prev.inventory],
          orders: [...newOrders, ...prev.orders],
        }
        save(next)
        return next
      })
    })
  }, []) // eslint-disable-line

  const saveInv = (item) => {
    const list = data.inventory.find(x => x.id === item.id) ? data.inventory.map(x => x.id === item.id ? item : x) : [item, ...data.inventory]
    persist({ ...data, inventory: list })
  }
  const deleteInv = (id) => persist({ ...data, inventory: data.inventory.filter(x => x.id !== id) })

  const saveBatch = (b) => {
    const list = data.batches.find(x => x.id === b.id) ? data.batches.map(x => x.id === b.id ? b : x) : [b, ...data.batches]
    persist({ ...data, batches: list })
  }
  const deleteBatch = (id) => persist({ ...data, batches: data.batches.filter(x => x.id !== id) })

  const saveOrder = (o) => {
    const list = data.orders.find(x => x.id === o.id) ? data.orders.map(x => x.id === o.id ? o : x) : [o, ...data.orders]
    persist({ ...data, orders: list })
  }
  const deleteOrder = (id) => persist({ ...data, orders: data.orders.filter(x => x.id !== id) })

  // ── Inventory stats ────────────────────────────────────────────────────────
  const invStats = useMemo(() => {
    const lowStock = data.inventory.filter(i => Number(i.stock) <= Number(i.reorderPoint))
    const totalUnits = data.inventory.reduce((s, i) => s + Number(i.stock || 0), 0)
    const totalValue = data.inventory.reduce((s, i) => s + Number(i.stock || 0) * Number(i.unitCost || 0), 0)
    return { lowStock: lowStock.length, totalUnits, totalValue }
  }, [data.inventory])

  const filteredInv = useMemo(() => {
    const q = searchQ.toLowerCase()
    return data.inventory.filter(i => !q || i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
  }, [data.inventory, searchQ])

  const sortedBatches = useMemo(() => [...data.batches].sort((a, b) => new Date(b.startDate) - new Date(a.startDate)), [data.batches])
  const sortedOrders = useMemo(() => [...data.orders].sort((a, b) => new Date(b.date) - new Date(a.date)), [data.orders])

  const tabStyle = (t) => ({
    padding: '0.4rem 0.9rem', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 600 : 400,
    background: tab === t ? 'var(--surface-2)' : 'transparent',
    color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)',
    border: 'none',
    boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
    transition: 'all 0.12s ease',
  })

  const addAction = () => {
    if (tab === 'inventory') setInvModal({})
    else if (tab === 'batches') setBatchModal({})
    else setOrderModal({})
  }

  const addLabel = tab === 'inventory' ? 'Add SKU' : tab === 'batches' ? 'Create Batch' : 'Add Order'

  return (
    <>
      <PageHeader title="Operations" subtitle="Inventory, production batches & fulfillment tracking" />

      {/* Shopify sync status */}
      {syncing && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', fontSize: 13, marginBottom: '1rem' }}>
          ⟳ Syncing inventory and orders from Shopify…
        </div>
      )}
      {!syncing && syncStatus === 'ok' && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D', fontSize: 13, marginBottom: '1rem' }}>
          ✓ Shopify synced — inventory and orders include live data
        </div>
      )}
      {!syncing && syncStatus === 'error' && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: '#FFF7ED', border: '1px solid #FED7AA', color: '#92400E', fontSize: 13, marginBottom: '1rem' }}>
          ⚠ Could not reach Shopify — check your credentials in Settings
        </div>
      )}
      {!isConnected('shopify') && data.inventory.length === 0 && data.orders.length === 0 && (
        <div style={{ padding: '2rem', borderRadius: 12, border: '2px dashed var(--border)', textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>No inventory data yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 380, margin: '0 auto 16px' }}>
            Connect Shopify in Settings to auto-sync your products and orders, or add SKUs manually below.
          </div>
          <a href="/settings" style={{ display: 'inline-block', padding: '8px 18px', background: 'var(--navy)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Go to Settings →
          </a>
        </div>
      )}

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total SKUs',      value: data.inventory.length },
          { label: 'Total Units',     value: invStats.totalUnits.toLocaleString() },
          { label: 'Inventory Value', value: '$' + invStats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 0 }) },
          { label: 'Low Stock Alerts', value: invStats.lowStock, color: invStats.lowStock > 0 ? 'var(--red)' : '#22c55e' },
          { label: 'Active Batches',  value: data.batches.filter(b => b.status === 'in-production').length },
          { label: 'Open Orders',     value: data.orders.filter(o => ['pending','processing','shipped'].includes(o.status)).length },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: color || 'var(--text-primary)', fontFamily: 'Oswald, sans-serif' }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Low stock warning banner */}
      {invStats.lowStock > 0 && (
        <div style={{ background: '#fef3c722', border: '1px solid #f59e0b44', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontSize: 14 }}>
          <span>⚠️</span>
          <span>{invStats.lowStock} SKU{invStats.lowStock > 1 ? 's are' : ' is'} at or below reorder point. Check inventory below.</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 3, background: 'var(--surface-3)', padding: 3, borderRadius: 8 }}>
          <button style={tabStyle('inventory')} onClick={() => setTab('inventory')}>Inventory</button>
          <button style={tabStyle('batches')} onClick={() => setTab('batches')}>Production Batches</button>
          <button style={tabStyle('orders')} onClick={() => setTab('orders')}>Orders</button>
        </div>
        {tab === 'inventory' && (
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search SKUs…" style={{ padding: '0.4rem 0.7rem', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, width: 180 }} />
        )}
        <button onClick={addAction} className="btn btn-primary" style={{ marginLeft: 'auto' }}>+ {addLabel}</button>
      </div>

      {/* Inventory Tab */}
      {tab === 'inventory' && (
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '130px 2fr 100px 80px 80px 90px 100px', padding: '0.6rem 1rem', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            <span>SKU</span><span>Product</span><span>Category</span><span>Stock</span><span>Reorder</span><span>Unit Cost</span><span>Status</span>
          </div>
          {filteredInv.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No inventory found.</div>
          )}
          {filteredInv.map(item => {
            const isLow = Number(item.stock) <= Number(item.reorderPoint)
            return (
              <div key={item.id} onClick={() => setInvModal(item)} style={{ display: 'grid', gridTemplateColumns: '130px 2fr 100px 80px 80px 90px 100px', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 14 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'monospace' }}>{item.sku}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.name}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{item.category}</span>
                <span style={{ color: isLow ? '#ef4444' : 'var(--text-primary)', fontWeight: isLow ? 700 : 400 }}>{Number(item.stock).toLocaleString()}</span>
                <span style={{ color: 'var(--text-muted)' }}>{Number(item.reorderPoint).toLocaleString()}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{money(item.unitCost)}</span>
                <span>
                  {isLow
                    ? <span style={{ background: '#ef444422', color: '#ef4444', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>⚠️ Reorder</span>
                    : <span style={{ background: '#22c55e22', color: '#22c55e', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>In Stock</span>
                  }
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Production Batches Tab */}
      {tab === 'batches' && (
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '150px 2fr 100px 90px 100px 100px', padding: '0.6rem 1rem', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            <span>Batch #</span><span>Product</span><span>Status</span><span>Qty</span><span>Start</span><span>Est. Done</span>
          </div>
          {sortedBatches.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No batches yet. Click "Create Batch" to add one.</div>
          )}
          {sortedBatches.map(b => (
            <div key={b.id} onClick={() => setBatchModal(b)} style={{ display: 'grid', gridTemplateColumns: '150px 2fr 100px 90px 100px 100px', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 14 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'monospace' }}>{b.batchNo}</span>
              <div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{b.product}</div>
                {b.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{b.notes}</div>}
              </div>
              <span>
                <span style={{ background: (BATCH_COLORS[b.status] || '#64748b') + '22', color: BATCH_COLORS[b.status] || '#64748b', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                  {b.status.charAt(0).toUpperCase() + b.status.slice(1).replace('-',' ')}
                </span>
              </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{Number(b.qty).toLocaleString()}</span>
              <span style={{ color: 'var(--text-muted)' }}>{b.startDate}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{b.endDate || '—'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Orders Tab */}
      {tab === 'orders' && (
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '110px 120px 130px 80px 90px 100px 1fr', padding: '0.6rem 1rem', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            <span>Order #</span><span>Date</span><span>Channel</span><span>Qty</span><span>Status</span><span>Fulfillment</span><span>Tracking</span>
          </div>
          {sortedOrders.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No orders yet.</div>
          )}
          {sortedOrders.map(o => (
            <div key={o.id} onClick={() => setOrderModal(o)} style={{ display: 'grid', gridTemplateColumns: '110px 120px 130px 80px 90px 100px 1fr', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 14 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'monospace' }}>{o.orderNo}</span>
              <span style={{ color: 'var(--text-muted)' }}>{o.date}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{o.customer}</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{o.qty}</span>
              <span>
                <span style={{ background: (ORDER_COLORS[o.status] || '#64748b') + '22', color: ORDER_COLORS[o.status] || '#64748b', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                  {o.status.charAt(0).toUpperCase()+o.status.slice(1)}
                </span>
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>{o.fulfillment}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.trackingNo || '—'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {invModal !== null && <InventoryModal item={Object.keys(invModal).length ? invModal : null} onClose={() => setInvModal(null)} onSave={saveInv} onDelete={deleteInv} />}
      {batchModal !== null && <BatchModal batch={Object.keys(batchModal).length ? batchModal : null} onClose={() => setBatchModal(null)} onSave={saveBatch} onDelete={deleteBatch} />}
      <AgentPanel
        module="operations"
        contextData={{
          inventory: data.inventory.length,
          openOrders: data.orders.filter(o => ['pending','processing','shipped'].includes(o.status)).length,
          lowStock: data.inventory.filter(i => Number(i.stock) <= Number(i.reorderPoint || 0)).length,
        }}
      />
      {orderModal !== null && <OrderModal order={Object.keys(orderModal).length ? orderModal : null} onClose={() => setOrderModal(null)} onSave={saveOrder} onDelete={deleteOrder} />}
    </>
  )
}
