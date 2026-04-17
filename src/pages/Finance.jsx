import { useState, useMemo, useEffect } from 'react'
import PageHeader from '../components/ui/PageHeader.jsx'
import { fetchShopifyOrders, shopifyOrdersToTransactions } from '../lib/liveData.js'
import { isConnected } from '../lib/credentials.js'
import { dbSet } from '../lib/db.js'

const STORE_KEY = 'maxd_finance'

const EXPENSE_CATS = ['COGS', 'Marketing', 'Payroll', 'Fulfillment', 'Software', 'Office', 'Legal', 'Misc']
const INCOME_CATS  = ['Product Sales', 'Wholesale', 'Affiliate', 'Other']

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const DEMO = {
  months: [
    { id: 'm1', month: '2026-01', revenue: 28400, cogs: 9800,  marketing: 3200, payroll: 4500, fulfillment: 2100, software: 420, office: 0,   legal: 0,   misc: 350  },
    { id: 'm2', month: '2026-02', revenue: 31200, cogs: 10800, marketing: 3800, payroll: 4500, fulfillment: 2300, software: 420, office: 0,   legal: 800, misc: 210  },
    { id: 'm3', month: '2026-03', revenue: 36800, cogs: 12400, marketing: 4600, payroll: 4500, fulfillment: 2700, software: 420, office: 0,   legal: 0,   misc: 480  },
    { id: 'm4', month: '2026-04', revenue: 14200, cogs: 4800,  marketing: 1630, payroll: 4500, fulfillment: 1040, software: 420, office: 0,   legal: 0,   misc: 120  },
  ],
  transactions: [
    { id: 't1', date: '2026-04-08', description: 'Shopify Orders',       category: 'Product Sales', amount: 4200,  type: 'income'  },
    { id: 't2', date: '2026-04-08', description: 'Meta Ads',             category: 'Marketing',     amount: 840,   type: 'expense' },
    { id: 't3', date: '2026-04-07', description: 'ShipBob Fulfillment',  category: 'Fulfillment',   amount: 388,   type: 'expense' },
    { id: 't4', date: '2026-04-06', description: 'Shopify Orders',       category: 'Product Sales', amount: 3800,  type: 'income'  },
    { id: 't5', date: '2026-04-05', description: 'Google Ads',           category: 'Marketing',     amount: 480,   type: 'expense' },
    { id: 't6', date: '2026-04-04', description: 'Klaviyo Subscription', category: 'Software',      amount: 145,   type: 'expense' },
    { id: 't7', date: '2026-04-03', description: 'Product COGS',         category: 'COGS',          amount: 1800,  type: 'expense' },
    { id: 't8', date: '2026-04-01', description: 'Payroll',              category: 'Payroll',       amount: 4500,  type: 'expense' },
  ],
  cashOnHand: 48200,
}

const EMPTY_DATA = { months: [], transactions: [], cashOnHand: 0 }

function load() {
  try { const r = localStorage.getItem(STORE_KEY); return r ? JSON.parse(r) : EMPTY_DATA } catch { return EMPTY_DATA }
}
function save(d) { dbSet(STORE_KEY, d) }
function nid() { return `i_${Date.now()}_${Math.random().toString(36).slice(2,5)}` }
function money(n) { return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0 }) }
function pctStr(n) { return (Number(n || 0) * 100).toFixed(1) + '%' }

const inp = { display: 'block', width: '100%', marginTop: 4, padding: '0.45rem 0.6rem', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }
const btnPrimary = { background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.1rem', fontSize: 14, cursor: 'pointer', fontWeight: 600 }
const btnGhost = { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem 1rem', fontSize: 14, cursor: 'pointer' }

// ── Month P&L Modal ─────────────────────────────────────────────────────────
function MonthModal({ month, onClose, onSave, onDelete }) {
  const isNew = !month?.id
  const blank = { month: new Date().toISOString().slice(0,7), revenue: '', cogs: '', marketing: '', payroll: '', fulfillment: '', software: '', office: '', legal: '', misc: '' }
  const [form, setForm] = useState(month || blank)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const totalExp = ['cogs','marketing','payroll','fulfillment','software','office','legal','misc'].reduce((s,k) => s + Number(form[k]||0), 0)
  const grossProfit = Number(form.revenue||0) - Number(form.cogs||0)
  const netProfit = Number(form.revenue||0) - totalExp

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1.25rem', color: 'var(--text-primary)', fontFamily: 'Oswald, sans-serif' }}>{isNew ? 'Add Month' : 'Edit P&L'}</h3>
        <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Month
          <input type="month" value={form.month} onChange={e => set('month', e.target.value)} style={inp} />
        </label>
        <div style={{ margin: '1rem 0 0.5rem', fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Revenue</div>
        <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total Revenue ($)
          <input type="number" value={form.revenue} onChange={e => set('revenue', e.target.value)} style={inp} />
        </label>
        <div style={{ margin: '1rem 0 0.5rem', fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Expenses</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {['cogs','marketing','payroll','fulfillment','software','office','legal','misc'].map(k => (
            <label key={k} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{k.charAt(0).toUpperCase()+k.slice(1)} ($)
              <input type="number" value={form[k]} onChange={e => set(k, e.target.value)} style={inp} />
            </label>
          ))}
        </div>
        {/* Live preview */}
        <div style={{ marginTop: '1rem', background: 'var(--surface-3)', borderRadius: 8, padding: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
          <div><div style={{ fontSize: 16, fontWeight: 700, color: '#22c55e' }}>{money(grossProfit)}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Gross Profit</div></div>
          <div><div style={{ fontSize: 16, fontWeight: 700, color: netProfit >= 0 ? '#22c55e' : 'var(--red)' }}>{money(netProfit)}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Net Profit</div></div>
          <div><div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{Number(form.revenue) ? pctStr(netProfit/Number(form.revenue)) : '—'}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Net Margin</div></div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
          <button onClick={() => { onSave({ ...form, id: form.id || nid() }); onClose() }} style={btnPrimary}>Save</button>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          {!isNew && <button onClick={() => { onDelete(form.id); onClose() }} style={{ ...btnGhost, marginLeft: 'auto', color: 'var(--red)' }}>Delete</button>}
        </div>
      </div>
    </div>
  )
}

// ── Transaction Modal ───────────────────────────────────────────────────────
function TxModal({ tx, onClose, onSave, onDelete }) {
  const isNew = !tx?.id
  const blank = { date: new Date().toISOString().split('T')[0], description: '', category: 'Product Sales', amount: '', type: 'income' }
  const [form, setForm] = useState(tx || blank)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1.25rem', color: 'var(--text-primary)', fontFamily: 'Oswald, sans-serif' }}>{isNew ? 'Add Transaction' : 'Edit Transaction'}</h3>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Description
            <input value={form.description} onChange={e => set('description', e.target.value)} style={inp} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Date
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inp} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Amount ($)
              <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} style={inp} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Type
              <select value={form.type} onChange={e => set('type', e.target.value)} style={inp}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Category
              <select value={form.category} onChange={e => set('category', e.target.value)} style={inp}>
                {(form.type === 'income' ? INCOME_CATS : EXPENSE_CATS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
          <button onClick={() => { onSave({ ...form, id: form.id || nid() }); onClose() }} style={btnPrimary}>Save</button>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          {!isNew && <button onClick={() => { onDelete(form.id); onClose() }} style={{ ...btnGhost, marginLeft: 'auto', color: 'var(--red)' }}>Delete</button>}
        </div>
      </div>
    </div>
  )
}

// ── Cash On Hand Modal ──────────────────────────────────────────────────────
function CashModal({ current, onClose, onSave }) {
  const [val, setVal] = useState(current)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', width: 320 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 1rem', color: 'var(--text-primary)', fontFamily: 'Oswald, sans-serif' }}>Update Cash on Hand</h3>
        <input type="number" value={val} onChange={e => setVal(e.target.value)} style={inp} />
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button onClick={() => { onSave(Number(val)); onClose() }} style={btnPrimary}>Save</button>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function Finance() {
  const [data, setData]         = useState(load)
  const [tab, setTab]           = useState('pl')
  const [monthModal, setMonthModal] = useState(null)
  const [txModal, setTxModal]   = useState(null)
  const [cashModal, setCashModal] = useState(false)
  const [syncing, setSyncing]   = useState(false)
  const [syncStatus, setSyncStatus] = useState(null) // 'ok' | 'error' | null

  const persist = (next) => { setData(next); save(next) }

  // Refresh from Supabase when page opens
  useEffect(() => {
    import('../lib/db.js').then(({ dbGet }) => {
      dbGet(STORE_KEY).then(d => { if (d) setData(d) })
    })
  }, [])

  // Auto-fetch Shopify orders and merge as transactions when Shopify is connected
  useEffect(() => {
    if (!isConnected('shopify')) return
    setSyncing(true)
    fetchShopifyOrders(90).then(orders => {
      setSyncing(false)
      if (!orders) { setSyncStatus('error'); return }
      setSyncStatus('ok')
      setData(prev => {
        // Merge: keep all manual transactions, add Shopify ones not already present
        const shopifyTxs = shopifyOrdersToTransactions(orders)
        const existingIds = new Set(prev.transactions.map(t => t.id))
        const newTxs = shopifyTxs.filter(t => !existingIds.has(t.id))
        if (newTxs.length === 0) return prev
        const next = { ...prev, transactions: [...newTxs, ...prev.transactions] }
        save(next)
        return next
      })
    })
  }, []) // eslint-disable-line

  const saveMonth = (m) => {
    const list = data.months.find(x => x.id === m.id) ? data.months.map(x => x.id === m.id ? m : x) : [m, ...data.months]
    persist({ ...data, months: list })
  }
  const deleteMonth = (id) => persist({ ...data, months: data.months.filter(x => x.id !== id) })

  const saveTx = (t) => {
    const list = data.transactions.find(x => x.id === t.id) ? data.transactions.map(x => x.id === t.id ? t : x) : [t, ...data.transactions]
    persist({ ...data, transactions: list })
  }
  const deleteTx = (id) => persist({ ...data, transactions: data.transactions.filter(x => x.id !== id) })

  // ── Sorted months ──────────────────────────────────────────────────────────
  const sortedMonths = useMemo(() => [...data.months].sort((a, b) => b.month.localeCompare(a.month)), [data.months])

  const latestMonth = sortedMonths[0]

  const allTimeTotals = useMemo(() => {
    return data.months.reduce((acc, m) => {
      acc.revenue += Number(m.revenue || 0)
      const exp = ['cogs','marketing','payroll','fulfillment','software','office','legal','misc'].reduce((s,k) => s+Number(m[k]||0),0)
      acc.expenses += exp
      acc.net += Number(m.revenue||0) - exp
      return acc
    }, { revenue: 0, expenses: 0, net: 0 })
  }, [data.months])

  // ── Expense breakdown for latest month ────────────────────────────────────
  const expBreakdown = useMemo(() => {
    if (!latestMonth) return []
    const cats = ['cogs','marketing','payroll','fulfillment','software','office','legal','misc']
    const items = cats.map(k => ({ key: k, amount: Number(latestMonth[k]||0) })).filter(x => x.amount > 0)
    const max = Math.max(...items.map(x => x.amount), 1)
    return items.sort((a, b) => b.amount - a.amount).map(x => ({ ...x, pct: x.amount/max*100 }))
  }, [latestMonth])

  const sortedTx = useMemo(() => [...data.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)), [data.transactions])

  const tabStyle = (t) => ({
    padding: '0.45rem 1rem', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500,
    background: tab === t ? 'var(--navy)' : 'transparent',
    color: tab === t ? '#fff' : 'var(--text-secondary)',
    border: tab === t ? 'none' : '1px solid var(--border)',
  })

  const latestNetMargin = latestMonth && Number(latestMonth.revenue)
    ? (Number(latestMonth.revenue) - ['cogs','marketing','payroll','fulfillment','software','office','legal','misc'].reduce((s,k) => s+Number(latestMonth[k]||0),0)) / Number(latestMonth.revenue)
    : null

  const latestGrossMargin = latestMonth && Number(latestMonth.revenue)
    ? (Number(latestMonth.revenue) - Number(latestMonth.cogs||0)) / Number(latestMonth.revenue)
    : null

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader title="Finance" subtitle="P&L tracker, expense breakdown & transaction log" />

      {/* Shopify sync status */}
      {syncing && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', fontSize: 13, marginBottom: '1rem' }}>
          ⟳ Syncing transactions from Shopify…
        </div>
      )}
      {!syncing && syncStatus === 'ok' && isConnected('shopify') && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D', fontSize: 13, marginBottom: '1rem' }}>
          ✓ Shopify orders synced — transactions above include live order data
        </div>
      )}
      {!syncing && syncStatus === 'error' && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: '#FFF7ED', border: '1px solid #FED7AA', color: '#92400E', fontSize: 13, marginBottom: '1rem' }}>
          ⚠ Could not reach Shopify API — check your credentials in Settings or try again later
        </div>
      )}
      {!isConnected('shopify') && data.transactions.length === 0 && data.months.length === 0 && (
        <div style={{ padding: '2rem', borderRadius: 12, border: '2px dashed var(--border)', textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>💳</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>No financial data yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 380, margin: '0 auto 16px' }}>
            Connect Shopify in Settings to auto-sync orders, or add months and transactions manually below.
          </div>
          <a href="/settings" style={{ display: 'inline-block', padding: '8px 18px', background: 'var(--navy)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Go to Settings →
          </a>
        </div>
      )}

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Cash on Hand', value: money(data.cashOnHand), action: () => setCashModal(true), hint: 'click to update' },
          { label: 'YTD Revenue',  value: money(allTimeTotals.revenue)  },
          { label: 'YTD Expenses', value: money(allTimeTotals.expenses) },
          { label: 'YTD Net',      value: money(allTimeTotals.net), color: allTimeTotals.net >= 0 ? '#22c55e' : 'var(--red)' },
          { label: 'Gross Margin', value: latestGrossMargin !== null ? pctStr(latestGrossMargin) : '—' },
          { label: 'Net Margin',   value: latestNetMargin !== null ? pctStr(latestNetMargin) : '—', color: latestNetMargin > 0 ? '#22c55e' : 'var(--red)' },
        ].map(({ label, value, color, action, hint }) => (
          <div key={label} onClick={action} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem', textAlign: 'center', cursor: action ? 'pointer' : 'default', transition: 'border-color 0.15s' }}
            onMouseEnter={e => action && (e.currentTarget.style.borderColor = 'var(--navy)')}
            onMouseLeave={e => action && (e.currentTarget.style.borderColor = 'var(--border)')}>
            <div style={{ fontSize: 22, fontWeight: 700, color: color || 'var(--text-primary)', fontFamily: 'Oswald, sans-serif' }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
            {hint && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, opacity: 0.7 }}>{hint}</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button style={tabStyle('pl')} onClick={() => setTab('pl')}>P&L by Month</button>
        <button style={tabStyle('transactions')} onClick={() => setTab('transactions')}>Transactions</button>
        <button onClick={() => tab === 'pl' ? setMonthModal({}) : setTxModal({})} style={{ marginLeft: 'auto', ...btnPrimary }}>+ {tab === 'pl' ? 'Add Month' : 'Add Transaction'}</button>
      </div>

      {/* P&L Tab */}
      {tab === 'pl' && (
        <>
          {/* Expense breakdown chart for latest month */}
          {expBreakdown.length > 0 && (
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Expense Breakdown — {latestMonth?.month}
              </div>
              {expBreakdown.map(({ key, amount, pct: p }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 8 }}>
                  <div style={{ width: 90, fontSize: 13, color: 'var(--text-secondary)' }}>{key.charAt(0).toUpperCase()+key.slice(1)}</div>
                  <div style={{ flex: 1, height: 10, background: 'var(--surface-3)', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${p}%`, background: 'var(--navy)', borderRadius: 5, opacity: key === 'cogs' ? 1 : 0.65 }} />
                  </div>
                  <div style={{ width: 70, fontSize: 13, color: 'var(--text-primary)', textAlign: 'right', fontWeight: 600 }}>{money(amount)}</div>
                </div>
              ))}
            </div>
          )}

          {/* P&L Table */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 1fr 1fr 1fr', padding: '0.6rem 1rem', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              <span>Month</span><span>Revenue</span><span>COGS</span><span>Gross Profit</span><span>Total Exp.</span><span>Net Profit</span>
            </div>
            {sortedMonths.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No months logged. Click "Add Month" to start.</div>
            )}
            {sortedMonths.map(m => {
              const totalExp = ['cogs','marketing','payroll','fulfillment','software','office','legal','misc'].reduce((s,k) => s+Number(m[k]||0),0)
              const grossProfit = Number(m.revenue||0) - Number(m.cogs||0)
              const net = Number(m.revenue||0) - totalExp
              const [yr, mo] = m.month.split('-')
              const label = `${MONTHS[parseInt(mo,10)-1]} ${yr}`
              return (
                <div key={m.id} onClick={() => setMonthModal(m)} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 1fr 1fr 1fr', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 14 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{money(m.revenue)}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{money(m.cogs)}</span>
                  <span style={{ color: '#22c55e', fontWeight: 600 }}>{money(grossProfit)}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{money(totalExp)}</span>
                  <span style={{ color: net >= 0 ? '#22c55e' : 'var(--red)', fontWeight: 700 }}>{money(net)}</span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Transactions Tab */}
      {tab === 'transactions' && (
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '100px 2fr 130px 90px', padding: '0.6rem 1rem', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            <span>Date</span><span>Description</span><span>Category</span><span style={{ textAlign: 'right' }}>Amount</span>
          </div>
          {sortedTx.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions. Click "Add Transaction" to start.</div>
          )}
          {sortedTx.map(t => (
            <div key={t.id} onClick={() => setTxModal(t)} style={{ display: 'grid', gridTemplateColumns: '100px 2fr 130px 90px', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 14 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ color: 'var(--text-muted)' }}>{t.date}</span>
              <span style={{ color: 'var(--text-primary)' }}>{t.description}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{t.category}</span>
              <span style={{ textAlign: 'right', fontWeight: 700, color: t.type === 'income' ? '#22c55e' : 'var(--red)' }}>
                {t.type === 'income' ? '+' : '-'}{money(t.amount)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {monthModal !== null && <MonthModal month={Object.keys(monthModal).length ? monthModal : null} onClose={() => setMonthModal(null)} onSave={saveMonth} onDelete={deleteMonth} />}
      {txModal !== null && <TxModal tx={Object.keys(txModal).length ? txModal : null} onClose={() => setTxModal(null)} onSave={saveTx} onDelete={deleteTx} />}
      {cashModal && <CashModal current={data.cashOnHand} onClose={() => setCashModal(false)} onSave={v => persist({ ...data, cashOnHand: v })} />}
    </div>
  )
}
