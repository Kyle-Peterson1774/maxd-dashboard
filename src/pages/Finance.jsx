import { useState, useMemo, useEffect } from 'react'
import PageHeader from '../components/ui/PageHeader.jsx'
import { dbSet } from '../lib/db.js'
import { useAuth } from '../lib/auth.jsx'
import {
  openPlaidLink,
  syncPlaidTransactions,
  removePlaidItem,
  loadPlaidAccounts,
  loadPlaidItems,
  loadPlaidTransactions,
  accountTypeLabel,
  accountAccent,
} from '../lib/plaid.js'
import AgentPanel from '../components/ui/AgentPanel.jsx'

const STORE_KEY = 'maxd_finance'

const EXPENSE_CATS = ['COGS', 'Marketing', 'Payroll', 'Fulfillment', 'Software', 'Office', 'Legal', 'Travel', 'Banking', 'Other']
const INCOME_CATS  = ['Product Sales', 'Wholesale', 'Affiliate', 'Other Income']
const ALL_CATS     = [...INCOME_CATS, ...EXPENSE_CATS]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const EMPTY_DATA = { months: [], transactions: [], cashOnHand: 0 }

function load() {
  try { const r = localStorage.getItem(STORE_KEY); return r ? JSON.parse(r) : EMPTY_DATA } catch { return EMPTY_DATA }
}
function save(d) { dbSet(STORE_KEY, d) }
function nid() { return `i_${Date.now()}_${Math.random().toString(36).slice(2,5)}` }
function money(n) { return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0 }) }
function pctStr(n) { return (Number(n || 0) * 100).toFixed(1) + '%' }

const inp = {
  display: 'block', width: '100%', marginTop: 4,
  padding: '0.45rem 0.6rem',
  background: 'var(--surface-3)', border: '1px solid var(--border)',
  borderRadius: 6, color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box',
}


// ── Month P&L Modal ──────────────────────────────────────────────────────────
function MonthModal({ month, onClose, onSave, onDelete }) {
  const isNew = !month?.id
  const blank = { month: new Date().toISOString().slice(0,7), revenue: '', cogs: '', marketing: '', payroll: '', fulfillment: '', software: '', office: '', legal: '', misc: '' }
  const [form, setForm] = useState(month || blank)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const totalExp  = ['cogs','marketing','payroll','fulfillment','software','office','legal','misc'].reduce((s,k) => s + Number(form[k]||0), 0)
  const grossProfit = Number(form.revenue||0) - Number(form.cogs||0)
  const netProfit   = Number(form.revenue||0) - totalExp

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }} onClick={onClose}>
      <div style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:12, padding:'1.5rem', width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin:'0 0 1.25rem', color:'var(--text-primary)', fontFamily:'Oswald, sans-serif' }}>{isNew ? 'Add Month' : 'Edit P&L'}</h3>
        <label style={{ fontSize:13, color:'var(--text-secondary)' }}>Month
          <input type="month" value={form.month} onChange={e => set('month', e.target.value)} style={inp} />
        </label>
        <div style={{ margin:'1rem 0 0.5rem', fontSize:12, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:600 }}>Revenue</div>
        <label style={{ fontSize:13, color:'var(--text-secondary)' }}>Total Revenue ($)
          <input type="number" value={form.revenue} onChange={e => set('revenue', e.target.value)} style={inp} />
        </label>
        <div style={{ margin:'1rem 0 0.5rem', fontSize:12, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:600 }}>Expenses</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem' }}>
          {['cogs','marketing','payroll','fulfillment','software','office','legal','misc'].map(k => (
            <label key={k} style={{ fontSize:13, color:'var(--text-secondary)' }}>{k.charAt(0).toUpperCase()+k.slice(1)} ($)
              <input type="number" value={form[k]} onChange={e => set(k, e.target.value)} style={inp} />
            </label>
          ))}
        </div>
        <div style={{ marginTop:'1rem', background:'var(--surface-3)', borderRadius:8, padding:'0.75rem', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.5rem', textAlign:'center' }}>
          <div><div style={{ fontSize:16, fontWeight:700, color:'#22c55e' }}>{money(grossProfit)}</div><div style={{ fontSize:11, color:'var(--text-muted)' }}>Gross Profit</div></div>
          <div><div style={{ fontSize:16, fontWeight:700, color:netProfit >= 0 ? '#22c55e' : 'var(--red)' }}>{money(netProfit)}</div><div style={{ fontSize:11, color:'var(--text-muted)' }}>Net Profit</div></div>
          <div><div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)' }}>{Number(form.revenue) ? pctStr(netProfit/Number(form.revenue)) : '—'}</div><div style={{ fontSize:11, color:'var(--text-muted)' }}>Net Margin</div></div>
        </div>
        <div style={{ display:'flex', gap:'0.5rem', marginTop:'1.25rem' }}>
          <button onClick={() => { onSave({ ...form, id: form.id || nid() }); onClose() }} className="btn btn-primary">Save</button>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          {!isNew && <button onClick={() => { onDelete(form.id); onClose() }} className="btn btn-ghost" style={{ marginLeft:'auto', color:'var(--red)' }}>Delete</button>}
        </div>
      </div>
    </div>
  )
}


// ── Transaction Modal ────────────────────────────────────────────────────────
function TxModal({ tx, onClose, onSave, onDelete }) {
  const isNew = !tx?.id
  const blank = { date: new Date().toISOString().split('T')[0], description: '', category: 'Product Sales', amount: '', type: 'income' }
  const [form, setForm] = useState(tx || blank)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }} onClick={onClose}>
      <div style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:12, padding:'1.5rem', width:'100%', maxWidth:420 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin:'0 0 1.25rem', color:'var(--text-primary)', fontFamily:'Oswald, sans-serif' }}>{isNew ? 'Add Transaction' : 'Edit Transaction'}</h3>
        <div style={{ display:'grid', gap:'0.75rem' }}>
          <label style={{ fontSize:13, color:'var(--text-secondary)' }}>Description
            <input value={form.description} onChange={e => set('description', e.target.value)} style={inp} />
          </label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
            <label style={{ fontSize:13, color:'var(--text-secondary)' }}>Date
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inp} />
            </label>
            <label style={{ fontSize:13, color:'var(--text-secondary)' }}>Amount ($)
              <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} style={inp} />
            </label>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
            <label style={{ fontSize:13, color:'var(--text-secondary)' }}>Type
              <select value={form.type} onChange={e => set('type', e.target.value)} style={inp}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </label>
            <label style={{ fontSize:13, color:'var(--text-secondary)' }}>Category
              <select value={form.category} onChange={e => set('category', e.target.value)} style={inp}>
                {(form.type === 'income' ? INCOME_CATS : EXPENSE_CATS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div style={{ display:'flex', gap:'0.5rem', marginTop:'1.25rem' }}>
          <button onClick={() => { onSave({ ...form, id: form.id || nid() }); onClose() }} className="btn btn-primary">Save</button>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          {!isNew && <button onClick={() => { onDelete(form.id); onClose() }} className="btn btn-ghost" style={{ marginLeft:'auto', color:'var(--red)' }}>Delete</button>}
        </div>
      </div>
    </div>
  )
}


// ── Cash Modal ───────────────────────────────────────────────────────────────
function CashModal({ current, onClose, onSave }) {
  const [val, setVal] = useState(current)
  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:12, padding:'1.5rem', width:320 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin:'0 0 1rem', color:'var(--text-primary)', fontFamily:'Oswald, sans-serif' }}>Update Cash on Hand</h3>
        <input type="number" value={val} onChange={e => setVal(e.target.value)} style={inp} />
        <div style={{ display:'flex', gap:'0.5rem', marginTop:'1rem' }}>
          <button onClick={() => { onSave(Number(val)); onClose() }} className="btn btn-primary">Save</button>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  )
}


// ── Plaid Account Card ───────────────────────────────────────────────────────
function AccountCard({ account }) {
  const accent   = accountAccent(account.type, account.subtype)
  const isCredit = account.type === 'credit'
  const balance  = isCredit
    ? account.current_balance
    : (account.available_balance ?? account.current_balance)

  return (
    <div style={{
      minWidth: 190, flexShrink: 0,
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderTop: `3px solid ${accent}`,
      borderRadius: 10,
      padding: '0.9rem 1rem',
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 5 }}>
        {account.institution_name} · {accountTypeLabel(account.type, account.subtype)}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-heading)', color: isCredit && balance > 0 ? 'var(--red)' : 'var(--text-primary)', lineHeight: 1 }}>
        {isCredit && balance > 0 ? '-' : ''}{money(Math.abs(balance || 0))}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
        ****{account.mask} &middot; {isCredit ? 'balance owed' : 'available'}
      </div>
    </div>
  )
}

function AddAccountCard({ onClick, loading }) {
  return (
    <div
      onClick={onClick}
      style={{
        minWidth: 160, flexShrink: 0,
        background: 'transparent',
        border: '2px dashed var(--border)',
        borderRadius: 10,
        padding: '0.9rem 1rem',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 6, cursor: 'pointer',
        color: 'var(--text-muted)',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--navy)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'}
    >
      <div style={{ fontSize: 22, lineHeight: 1 }}>{loading ? '⟳' : '+'}</div>
      <div style={{ fontSize: 12, fontWeight: 600 }}>{loading ? 'Connecting…' : 'Connect Account'}</div>
    </div>
  )
}


// ── Main Component ───────────────────────────────────────────────────────────
export default function Finance() {
  const { user } = useAuth()

  const [data, setData]           = useState(load)
  const [plaidAccounts, setPlaidAccounts] = useState([])
  const [plaidItems, setPlaidItems]       = useState([])
  const [plaidTxs, setPlaidTxs]           = useState([])
  const [tab, setTab]             = useState('transactions')
  const [monthModal, setMonthModal] = useState(null)
  const [txModal, setTxModal]     = useState(null)
  const [cashModal, setCashModal] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing]     = useState(false)
  const [banner, setBanner]       = useState(null) // { msg, type: 'ok'|'err' }

  const persist = (next) => { setData(next); save(next) }

  const flash = (msg, type = 'ok') => {
    setBanner({ msg, type })
    setTimeout(() => setBanner(null), 5000)
  }

  // Load manual data from DB
  useEffect(() => {
    import('../lib/db.js').then(({ dbGet }) => {
      dbGet(STORE_KEY).then(d => { if (d) setData(d) })
    })
  }, [])

  // Load Plaid data from Supabase
  useEffect(() => {
    if (!user?.orgId || !user?.accessToken) return
    loadPlaidAccounts(user.orgId, user.accessToken).then(setPlaidAccounts)
    loadPlaidItems(user.orgId, user.accessToken).then(setPlaidItems)
    loadPlaidTransactions(user.orgId, user.accessToken).then(setPlaidTxs)
  }, [user?.orgId])

  const hasBankFeeds = plaidAccounts.length > 0

  // Net cash position across all linked accounts
  const netCash = useMemo(() => {
    if (!hasBankFeeds) return data.cashOnHand
    const deposits = plaidAccounts
      .filter(a => a.type === 'depository')
      .reduce((s, a) => s + (a.current_balance || 0), 0)
    const credit = plaidAccounts
      .filter(a => a.type === 'credit')
      .reduce((s, a) => s + (a.current_balance || 0), 0)
    return deposits - credit
  }, [plaidAccounts, hasBankFeeds, data.cashOnHand])

  // ── Plaid actions ─────────────────────────────────────────────────────────

  const handleConnect = () => {
    if (!user) return
    setConnecting(true)
    openPlaidLink({
      userId: user.email,
      orgId:  user.orgId,
      onSuccess: (result) => {
        setConnecting(false)
        flash(`Connected ${result.institution_name} — ${result.accounts.length} account(s) added`)
        loadPlaidAccounts(user.orgId, user.accessToken).then(setPlaidAccounts)
        loadPlaidItems(user.orgId, user.accessToken).then(setPlaidItems)
      },
      onExit: (err) => {
        setConnecting(false)
        if (err) flash(typeof err === 'string' ? err : 'Connection cancelled', 'err')
      },
    })
  }

  const handleSync = async () => {
    if (!user?.orgId || syncing) return
    setSyncing(true)
    const result = await syncPlaidTransactions(user.orgId)
    setSyncing(false)
    if (result.error) {
      flash(result.error, 'err')
    } else {
      flash(`Synced ${result.synced} new transaction(s)`)
      loadPlaidAccounts(user.orgId, user.accessToken).then(setPlaidAccounts)
      loadPlaidTransactions(user.orgId, user.accessToken).then(setPlaidTxs)
    }
  }

  const handleRemoveItem = async (itemId, name) => {
    if (!confirm(`Disconnect ${name}? This will remove all associated transactions.`)) return
    const result = await removePlaidItem(user.orgId, itemId)
    if (result.error) {
      flash(result.error, 'err')
    } else {
      flash(`${name} disconnected`)
      loadPlaidAccounts(user.orgId, user.accessToken).then(setPlaidAccounts)
      loadPlaidItems(user.orgId, user.accessToken).then(setPlaidItems)
      loadPlaidTransactions(user.orgId, user.accessToken).then(setPlaidTxs)
    }
  }

  // ── Manual data handlers ──────────────────────────────────────────────────

  const saveMonth  = (m) => {
    const list = data.months.find(x => x.id === m.id)
      ? data.months.map(x => x.id === m.id ? m : x)
      : [m, ...data.months]
    persist({ ...data, months: list })
  }
  const deleteMonth = (id) => persist({ ...data, months: data.months.filter(x => x.id !== id) })

  const saveTx = (t) => {
    const list = data.transactions.find(x => x.id === t.id)
      ? data.transactions.map(x => x.id === t.id ? t : x)
      : [t, ...data.transactions]
    persist({ ...data, transactions: list })
  }
  const deleteTx = (id) => persist({ ...data, transactions: data.transactions.filter(x => x.id !== id) })

  // ── Computed values ───────────────────────────────────────────────────────

  // Unified transaction feed: Plaid + manual, sorted newest first
  const allTransactions = useMemo(() => {
    const manual = data.transactions.map(t => ({
      _key:    t.id,
      _source: 'manual',
      _raw:    t,
      date:    t.date,
      name:    t.description,
      // normalise to Plaid sign convention (positive = expense)
      amount:  t.type === 'expense' ? Number(t.amount) : -Number(t.amount),
      category: t.category,
      pending: false,
    }))
    const plaid = plaidTxs.map(t => ({
      _key:    t.transaction_id,
      _source: 'plaid',
      _raw:    t,
      date:    t.date,
      name:    t.merchant_name || t.name,
      amount:  t.amount,
      category: t.category_ai || t.plaid_category?.[0] || '—',
      pending: t.pending,
    }))
    return [...manual, ...plaid].sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [data.transactions, plaidTxs])

  const sortedMonths = useMemo(() =>
    [...data.months].sort((a, b) => b.month.localeCompare(a.month)),
    [data.months]
  )
  const latestMonth = sortedMonths[0]

  const allTimeTotals = useMemo(() => data.months.reduce((acc, m) => {
    acc.revenue  += Number(m.revenue || 0)
    const exp     = ['cogs','marketing','payroll','fulfillment','software','office','legal','misc']
      .reduce((s,k) => s + Number(m[k]||0), 0)
    acc.expenses += exp
    acc.net      += Number(m.revenue||0) - exp
    return acc
  }, { revenue: 0, expenses: 0, net: 0 }), [data.months])

  const latestNetMargin = latestMonth && Number(latestMonth.revenue)
    ? (Number(latestMonth.revenue) - ['cogs','marketing','payroll','fulfillment','software','office','legal','misc']
        .reduce((s,k) => s+Number(latestMonth[k]||0),0)) / Number(latestMonth.revenue)
    : null

  const latestGrossMargin = latestMonth && Number(latestMonth.revenue)
    ? (Number(latestMonth.revenue) - Number(latestMonth.cogs||0)) / Number(latestMonth.revenue)
    : null

  const expBreakdown = useMemo(() => {
    if (!latestMonth) return []
    const cats  = ['cogs','marketing','payroll','fulfillment','software','office','legal','misc']
    const items = cats.map(k => ({ key: k, amount: Number(latestMonth[k]||0) })).filter(x => x.amount > 0)
    const max   = Math.max(...items.map(x => x.amount), 1)
    return items.sort((a, b) => b.amount - a.amount).map(x => ({ ...x, pct: x.amount/max*100 }))
  }, [latestMonth])

  const tabStyle = (t) => ({
    padding: '0.4rem 0.9rem', borderRadius: 6, cursor: 'pointer', fontSize: 13,
    fontWeight: tab === t ? 600 : 400,
    background: tab === t ? 'var(--surface-2)' : 'transparent',
    color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)',
    border: 'none',
    boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
    transition: 'all 0.12s ease',
  })

  const lastSynced = plaidAccounts.length > 0
    ? plaidAccounts.reduce((latest, a) => {
        if (!a.last_synced_at) return latest
        const d = new Date(a.last_synced_at)
        return d > latest ? d : latest
      }, new Date(0))
    : null

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader title="Finance" subtitle="Bank accounts, P&L tracker & transaction log" accent="var(--green)">
        {hasBankFeeds && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn btn-secondary"
            style={{ fontSize: 12 }}
          >
            {syncing ? '⟳ Syncing…' : '↓ Sync Now'}
          </button>
        )}
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="btn btn-primary"
          style={{ fontSize: 12 }}
        >
          {connecting ? 'Connecting…' : '+ Connect Account'}
        </button>
      </PageHeader>

      {/* Banner */}
      {banner && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, fontSize: 13, marginBottom: '1rem',
          background: banner.type === 'err' ? '#FFF7ED' : '#F0FDF4',
          border: `1px solid ${banner.type === 'err' ? '#FED7AA' : '#BBF7D0'}`,
          color: banner.type === 'err' ? '#92400E' : '#15803D',
        }}>
          {banner.msg}
        </div>
      )}

      {/* Connected Accounts Strip */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: 4 }}>
        {plaidAccounts.map(acct => (
          <AccountCard key={acct.account_id} account={acct} />
        ))}
        <AddAccountCard onClick={handleConnect} loading={connecting} />
      </div>

      {/* Net Cash Position (only when bank feeds connected) */}
      {hasBankFeeds && (
        <div style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 3 }}>Net Cash Position</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-heading)', color: netCash >= 0 ? 'var(--text-primary)' : 'var(--red)' }}>
              {money(netCash)}
            </div>
          </div>
          <div style={{ width: 1, height: 40, background: 'var(--border)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 3 }}>Checking & Savings</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {money(plaidAccounts.filter(a => a.type === 'depository').reduce((s,a) => s+(a.current_balance||0), 0))}
            </div>
          </div>
          <div style={{ width: 1, height: 40, background: 'var(--border)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 3 }}>Credit Balance Owed</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: plaidAccounts.filter(a => a.type === 'credit').reduce((s,a) => s+(a.current_balance||0), 0) > 0 ? 'var(--red)' : '#22c55e' }}>
              {money(plaidAccounts.filter(a => a.type === 'credit').reduce((s,a) => s+(a.current_balance||0), 0))}
            </div>
          </div>
          {lastSynced && lastSynced.getTime() > 0 && (
            <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
              Synced {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      )}

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          !hasBankFeeds
            ? { label: 'Cash on Hand', value: money(data.cashOnHand), action: () => setCashModal(true), hint: 'click to update' }
            : null,
          { label: 'YTD Revenue',  value: money(allTimeTotals.revenue)  },
          { label: 'YTD Expenses', value: money(allTimeTotals.expenses) },
          { label: 'YTD Net',      value: money(allTimeTotals.net), color: allTimeTotals.net >= 0 ? '#22c55e' : 'var(--red)' },
          { label: 'Gross Margin', value: latestGrossMargin !== null ? pctStr(latestGrossMargin) : '—' },
          { label: 'Net Margin',   value: latestNetMargin !== null ? pctStr(latestNetMargin) : '—', color: latestNetMargin > 0 ? '#22c55e' : 'var(--red)' },
        ].filter(Boolean).map(({ label, value, color, action, hint }) => (
          <div
            key={label}
            onClick={action}
            style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '1rem', textAlign: 'center',
              cursor: action ? 'pointer' : 'default', transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => action && (e.currentTarget.style.borderColor = 'var(--navy)')}
            onMouseLeave={e => action && (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: color || 'var(--text-primary)', fontFamily: 'Oswald, sans-serif' }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
            {hint && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, opacity: 0.7 }}>{hint}</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 3, background: 'var(--surface-3)', padding: 3, borderRadius: 8 }}>
          <button style={tabStyle('transactions')} onClick={() => setTab('transactions')}>Transactions</button>
          <button style={tabStyle('pl')} onClick={() => setTab('pl')}>P&L by Month</button>
          {hasBankFeeds && (
            <button style={tabStyle('accounts')} onClick={() => setTab('accounts')}>Accounts</button>
          )}
        </div>
        {tab === 'pl' && (
          <button onClick={() => setMonthModal({})} className="btn btn-primary" style={{ marginLeft: 'auto' }}>+ Add Month</button>
        )}
        {tab === 'transactions' && (
          <button onClick={() => setTxModal({})} className="btn btn-primary" style={{ marginLeft: 'auto' }}>+ Add Manual</button>
        )}
      </div>

      {/* ── Transactions Tab ───────────────────────────────────────────────── */}
      {tab === 'transactions' && (
        <>
          {allTransactions.length === 0 ? (
            <div style={{ padding: '2.5rem', borderRadius: 12, border: '2px dashed var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>💳</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>No transactions yet</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto 1.25rem' }}>
                Connect a bank account to automatically import transactions, or add them manually.
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button onClick={handleConnect} style={{ padding: '8px 18px', background: 'var(--navy)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                  + Connect Account
                </button>
                <button onClick={() => setTxModal({})} style={{ padding: '8px 18px', background: 'transparent', color: 'var(--navy)', borderRadius: 8, fontSize: 13, fontWeight: 700, border: '1px solid var(--border)', cursor: 'pointer' }}>
                  + Add Manually
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '96px 2fr 120px 60px 96px', padding: '0.6rem 1rem', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                <span>Date</span>
                <span>Description</span>
                <span>Category</span>
                <span>Source</span>
                <span style={{ textAlign: 'right' }}>Amount</span>
              </div>
              {allTransactions.slice(0, 250).map(t => (
                <div
                  key={t._key}
                  onClick={t._source === 'manual' ? () => setTxModal(data.transactions.find(x => x.id === t._key)) : undefined}
                  style={{ display: 'grid', gridTemplateColumns: '96px 2fr 120px 60px 96px', padding: '0.65rem 1rem', borderBottom: '1px solid var(--border)', cursor: t._source === 'manual' ? 'pointer' : 'default', fontSize: 13.5, alignItems: 'center' }}
                  onMouseEnter={e => t._source === 'manual' && (e.currentTarget.style.background = 'var(--surface-3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.date}</span>
                  <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                    {t.name}
                    {t.pending && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: '#f59e0b', background: '#fef3c7', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>PENDING</span>
                    )}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t.category}</span>
                  <span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                      background: t._source === 'plaid' ? 'rgba(79,110,247,0.10)' : 'rgba(124,58,237,0.10)',
                      color:      t._source === 'plaid' ? 'var(--blue)' : 'var(--purple)',
                    }}>
                      {t._source === 'plaid' ? 'Bank' : 'Manual'}
                    </span>
                  </span>
                  <span style={{ textAlign: 'right', fontWeight: 700, color: t.amount < 0 ? '#22c55e' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {t.amount < 0 ? '+' : '-'}{money(Math.abs(t.amount))}
                  </span>
                </div>
              ))}
              {allTransactions.length > 250 && (
                <div style={{ padding: '0.75rem 1rem', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                  Showing 250 of {allTransactions.length} transactions
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── P&L Tab ────────────────────────────────────────────────────────── */}
      {tab === 'pl' && (
        <>
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
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 1fr 1fr 1fr', padding: '0.6rem 1rem', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              <span>Month</span><span>Revenue</span><span>COGS</span><span>Gross Profit</span><span>Total Exp.</span><span>Net Profit</span>
            </div>
            {sortedMonths.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No months logged. Click "+ Add Month" to start.</div>
            )}
            {sortedMonths.map(m => {
              const totalExp    = ['cogs','marketing','payroll','fulfillment','software','office','legal','misc'].reduce((s,k) => s+Number(m[k]||0),0)
              const grossProfit = Number(m.revenue||0) - Number(m.cogs||0)
              const net         = Number(m.revenue||0) - totalExp
              const [yr, mo]    = m.month.split('-')
              const label       = `${MONTHS[parseInt(mo,10)-1]} ${yr}`
              return (
                <div key={m.id} onClick={() => setMonthModal(m)}
                  style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 1fr 1fr 1fr', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 14 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
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

      {/* ── Accounts Tab ───────────────────────────────────────────────────── */}
      {tab === 'accounts' && hasBankFeeds && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            {plaidAccounts.map(acct => (
              <AccountCard key={acct.account_id} account={acct} />
            ))}
          </div>
          {/* Institution list with disconnect option */}
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: '1rem' }}>
            <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Connected Banks
            </div>
            {plaidItems.map(item => (
              <div key={item.item_id} style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{item.institution_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    Connected {new Date(item.created_at).toLocaleDateString()}
                    {' · '}
                    {plaidAccounts.filter(a => a.item_id === item.item_id).length} account(s)
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveItem(item.item_id, item.institution_name)}
                  style={{ marginLeft: 'auto', padding: '4px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--red)', cursor: 'pointer' }}
                >
                  Disconnect
                </button>
              </div>
            ))}
          </div>
          <button onClick={handleConnect} disabled={connecting} className="btn btn-primary">
            {connecting ? 'Connecting…' : '+ Add Another Bank'}
          </button>
        </div>
      )}

      {/* Modals */}
      {monthModal !== null && (
        <MonthModal
          month={Object.keys(monthModal).length ? monthModal : null}
          onClose={() => setMonthModal(null)}
          onSave={saveMonth}
          onDelete={deleteMonth}
        />
      )}
      {txModal !== null && (
        <TxModal
          tx={Object.keys(txModal).length ? txModal : null}
          onClose={() => setTxModal(null)}
          onSave={saveTx}
          onDelete={deleteTx}
        />
      )}
      {cashModal && (
        <CashModal
          current={data.cashOnHand}
          onClose={() => setCashModal(false)}
          onSave={v => persist({ ...data, cashOnHand: v })}
        />
      )}

      <AgentPanel
        module="finance"
        contextData={{
          linkedAccounts: plaidAccounts.length,
          netCash,
          months: data.months.length,
          transactions: allTransactions.length,
        }}
      />
    </>
  )
}
