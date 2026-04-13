import { useState, useEffect, useRef } from 'react'
import PageHeader from '../components/ui/PageHeader.jsx'

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORE_KEY = 'maxd_products'

function loadProducts()  { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]') } catch { return [] } }
function saveProducts(d) { localStorage.setItem(STORE_KEY, JSON.stringify(d)) }
function uid()           { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

function EMPTY_PRODUCT() {
  return {
    id: uid(),
    name: '',
    variant: '',
    sku: '',
    status: 'active',
    price: '',
    launchDate: '',
    description: '',
    benefits: [],        // string[]
    ingredients: [],     // { name, amount, note }[]
    talkingPoints: [],   // string[]  — for scripts & ads
    tags: [],
    imageUrl: '',
    notionUrl: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

const DEMO_PRODUCTS = [
  {
    id: 'prod1',
    name: 'MAXD Creatine Gummies',
    variant: 'Original (Mixed Berry)',
    sku: 'MAXD-CG-001',
    status: 'active',
    price: '39.99',
    launchDate: '2025-12-01',
    description: 'The world\'s most convenient creatine supplement — 3g of pure Creatine Monohydrate per serving in a delicious, chewable gummy format. No mixing, no powder, no compromise.',
    benefits: [
      'Increases muscle strength and power output',
      'Improves high-intensity exercise performance',
      'Supports lean muscle mass development',
      'Enhances cognitive function and brain health',
      'No bloating or GI discomfort (vs. powder)',
    ],
    ingredients: [
      { name: 'Creatine Monohydrate', amount: '3g',   note: 'Clinically studied dose per serving' },
      { name: 'Pectin',               amount: '1.5g',  note: 'Plant-based gummy base' },
      { name: 'Citric Acid',          amount: '0.5g',  note: 'Natural flavor enhancer' },
      { name: 'Natural Flavors',      amount: 'trace', note: 'Mixed berry' },
    ],
    talkingPoints: [
      'Same creatine as powder — just easier',
      'Third-party tested for purity and potency',
      'US manufactured in an FDA-registered facility',
      'No artificial sweeteners, colors, or dyes',
      'Perfect for athletes who hate powders',
      'Research-backed 3g dose per serving',
    ],
    tags: ['creatine', 'gummies', 'performance', 'muscle'],
    imageUrl: '',
    notionUrl: '',
    createdAt: '2025-11-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

function initProducts() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw !== null) {
      const stored = JSON.parse(raw)
      if (Array.isArray(stored)) return stored   // return even if empty — respect intentional clears
    }
  } catch {}
  saveProducts(DEMO_PRODUCTS)
  return DEMO_PRODUCTS
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_META = {
  active:       { label: 'Active',       bg: 'var(--green-bg)',  text: 'var(--green-text)' },
  coming_soon:  { label: 'Coming Soon',  bg: 'var(--amber-bg)',  text: 'var(--amber-text)' },
  discontinued: { label: 'Discontinued', bg: 'var(--surface-3)', text: 'var(--text-muted)' },
}

// ─── ProductCard ──────────────────────────────────────────────────────────────
function ProductCard({ product, onSelect }) {
  const sm = STATUS_META[product.status] || STATUS_META.active
  return (
    <div
      className="card"
      onClick={() => onSelect(product)}
      style={{ cursor: 'pointer', border: '1px solid var(--border)', transition: 'all 0.15s', boxShadow: 'var(--shadow-sm)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        {/* Icon placeholder */}
        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
          📦
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{product.name || 'Untitled Product'}</div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{product.variant || 'No variant'}</div>
        </div>
        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', background: sm.bg, color: sm.text, whiteSpace: 'nowrap' }}>
          {sm.label}
        </span>
      </div>

      {product.description && (
        <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 10, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {product.description}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--gray-500)' }}>
        {product.price && <span>💰 ${product.price}</span>}
        {product.sku && <span>SKU: {product.sku}</span>}
        <span>✦ {product.talkingPoints?.length || 0} talking points</span>
        <span>🧪 {product.ingredients?.length || 0} ingredients</span>
      </div>
    </div>
  )
}

// ─── ListEditor — for string arrays (benefits, talking points) ────────────────
function ListEditor({ items, onChange, placeholder, addLabel }) {
  function updateItem(idx, val) { const next = [...items]; next[idx] = val; onChange(next) }
  function removeItem(idx)      { onChange(items.filter((_, i) => i !== idx)) }
  function addItem()            { onChange([...items, '']) }

  return (
    <div>
      {items.map((item, idx) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
          <input
            value={item}
            onChange={e => updateItem(idx, e.target.value)}
            placeholder={placeholder}
            style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border-mid)', borderRadius: 7, padding: '7px 10px', fontSize: 13, color: 'var(--text-primary)', outline: 'none' }}
          />
          <button
            onClick={() => removeItem(idx)}
            style={{ background: 'none', border: 'none', color: 'var(--gray-600)', cursor: 'pointer', fontSize: 14, padding: '2px 4px', flexShrink: 0 }}
          >✕</button>
        </div>
      ))}
      <button
        onClick={addItem}
        style={{ background: 'none', border: '1px dashed var(--border-mid)', borderRadius: 8, color: 'var(--text-muted)', padding: '7px 12px', fontSize: 12, cursor: 'pointer', width: '100%', marginTop: 2, fontFamily: 'var(--font-body)' }}
      >
        {addLabel}
      </button>
    </div>
  )
}

// ─── IngredientEditor ─────────────────────────────────────────────────────────
function IngredientEditor({ ingredients, onChange }) {
  function updateRow(idx, key, val) { const next = [...ingredients]; next[idx] = { ...next[idx], [key]: val }; onChange(next) }
  function removeRow(idx)           { onChange(ingredients.filter((_, i) => i !== idx)) }
  function addRow()                 { onChange([...ingredients, { name: '', amount: '', note: '' }]) }

  return (
    <div>
      {ingredients.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr 28px', gap: 4, marginBottom: 6 }}>
          {['Ingredient', 'Amount', 'Note', ''].map((h, i) => (
            <div key={i} style={{ fontSize: 10, color: 'var(--gray-500)', padding: '0 4px' }}>{h}</div>
          ))}
        </div>
      )}
      {ingredients.map((row, idx) => (
        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr 28px', gap: 4, marginBottom: 4 }}>
          {['name', 'amount', 'note'].map(k => (
            <input
              key={k}
              value={row[k] || ''}
              onChange={e => updateRow(idx, k, e.target.value)}
              placeholder={k.charAt(0).toUpperCase() + k.slice(1)}
              style={{ background: 'var(--surface)', border: '1px solid var(--border-mid)', borderRadius: 7, padding: '7px 8px', fontSize: 12, color: 'var(--text-primary)', outline: 'none' }}
            />
          ))}
          <button
            onClick={() => removeRow(idx)}
            style={{ background: 'none', border: 'none', color: 'var(--gray-600)', cursor: 'pointer', fontSize: 14 }}
          >✕</button>
        </div>
      ))}
      <button
        onClick={addRow}
        style={{ background: 'none', border: '1px dashed var(--border-mid)', borderRadius: 8, color: 'var(--text-muted)', padding: '7px 12px', fontSize: 12, cursor: 'pointer', width: '100%', marginTop: 2, fontFamily: 'var(--font-body)' }}
      >
        + Add Ingredient
      </button>
    </div>
  )
}

// ─── ProductEditor ────────────────────────────────────────────────────────────
function ProductEditor({ product, onSave, onBack, onDelete }) {
  const [draft, setDraft] = useState({ ...product })
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))

  // Auto-save to localStorage whenever draft changes (skip initial render)
  const skipFirst = useRef(true)
  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return }
    if (!draft.id) return
    const t = setTimeout(() => {
      try {
        const list = JSON.parse(localStorage.getItem(STORE_KEY) || '[]')
        const next = list.map(p => p.id === draft.id ? { ...draft, updatedAt: new Date().toISOString() } : p)
        if (next.some(p => p.id === draft.id)) saveProducts(next)
      } catch {}
    }, 600)
    return () => clearTimeout(t)
  }, [draft])

  const fieldStyle = {
    width: '100%', background: 'var(--surface)', border: '1px solid var(--border-mid)',
    borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text-primary)', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'var(--font-body)',
  }

  const sm = STATUS_META[draft.status] || STATUS_META.active

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
        <button onClick={onBack} style={{ background: 'var(--surface-3)', border: '1px solid var(--border-mid)', borderRadius: 8, color: 'var(--text-secondary)', padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          ← Back
        </button>
        <input
          value={draft.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Product name…"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--navy)', letterSpacing: '0.04em', textTransform: 'uppercase' }}
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: sm.bg, color: sm.text }}>
            {sm.label}
          </span>
          {onDelete && (
            <button onClick={onDelete} style={{ background: 'transparent', border: '1px solid var(--border-mid)', borderRadius: 8, color: 'var(--text-muted)', padding: '7px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              Delete
            </button>
          )}
          <button
            onClick={() => onSave({ ...draft, updatedAt: new Date().toISOString() })}
            style={{ background: 'var(--red)', border: 'none', borderRadius: 8, color: 'var(--white)', padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Save
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Description */}
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Description</div>
            <textarea
              value={draft.description}
              onChange={e => set('description', e.target.value)}
              rows={4}
              placeholder="What is this product? What makes it unique?"
              style={{ ...fieldStyle, resize: 'vertical' }}
            />
          </div>

          {/* Benefits */}
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Benefits</div>
            <ListEditor
              items={draft.benefits}
              onChange={v => set('benefits', v)}
              placeholder="e.g. Increases strength and power output"
              addLabel="+ Add Benefit"
            />
          </div>

          {/* Talking Points */}
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Talking Points</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 10 }}>Used in scripts, ads, and content to keep messaging consistent.</div>
            <ListEditor
              items={draft.talkingPoints}
              onChange={v => set('talkingPoints', v)}
              placeholder="e.g. Third-party tested for purity"
              addLabel="+ Add Talking Point"
            />
          </div>

          {/* Ingredients */}
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Supplement Facts</div>
            <IngredientEditor
              ingredients={draft.ingredients}
              onChange={v => set('ingredients', v)}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Product Info</div>

            <label style={{ fontSize: 10, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>VARIANT / FLAVOR</label>
            <input value={draft.variant} onChange={e => set('variant', e.target.value)} placeholder="e.g. Mixed Berry" style={{ ...fieldStyle, marginBottom: 10 }} />

            <label style={{ fontSize: 10, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>SKU</label>
            <input value={draft.sku} onChange={e => set('sku', e.target.value)} placeholder="e.g. MAXD-CG-001" style={{ ...fieldStyle, marginBottom: 10 }} />

            <label style={{ fontSize: 10, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>STATUS</label>
            <select value={draft.status} onChange={e => set('status', e.target.value)} style={{ ...fieldStyle, marginBottom: 10 }}>
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>

            <label style={{ fontSize: 10, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>PRICE (USD)</label>
            <input type="number" value={draft.price} onChange={e => set('price', e.target.value)} placeholder="0.00" step="0.01" style={{ ...fieldStyle, marginBottom: 10 }} />

            <label style={{ fontSize: 10, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>LAUNCH DATE</label>
            <input type="date" value={draft.launchDate} onChange={e => set('launchDate', e.target.value)} style={{ ...fieldStyle, marginBottom: 10, colorScheme: 'dark' }} />

            <label style={{ fontSize: 10, color: 'var(--gray-500)', display: 'block', marginBottom: 4 }}>NOTION URL</label>
            <input value={draft.notionUrl} onChange={e => set('notionUrl', e.target.value)} placeholder="https://notion.so/…" style={fieldStyle} />
          </div>

          {/* Tags */}
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {draft.tags.map((t, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {t}
                  <button onClick={() => set('tags', draft.tags.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--gray-500)', cursor: 'pointer', fontSize: 12, padding: 0 }}>✕</button>
                </span>
              ))}
            </div>
            <input
              placeholder="Add tag + Enter"
              onKeyDown={e => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  set('tags', [...draft.tags, e.target.value.trim()])
                  e.target.value = ''
                }
              }}
              style={{ ...fieldStyle }}
            />
          </div>

          {/* Quick stats */}
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Content Summary</div>
            {[
              ['Benefits',       draft.benefits.length],
              ['Ingredients',    draft.ingredients.length],
              ['Talking Points', draft.talkingPoints.length],
              ['Tags',           draft.tags.length],
            ].map(([label, count]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                <span style={{ color: 'var(--gray-400)' }}>{label}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Products() {
  const [products, setProducts] = useState([])
  const [selected, setSelected] = useState(null)
  const [filter,   setFilter]   = useState('all')

  useEffect(() => { setProducts(initProducts()) }, [])

  function handleSave(updated) {
    const next = products.some(p => p.id === updated.id)
      ? products.map(p => p.id === updated.id ? updated : p)
      : [...products, updated]
    saveProducts(next)
    setProducts(next)
    setSelected(updated)
  }

  function handleDelete(id) {
    if (!confirm('Delete this product?')) return
    const next = products.filter(p => p.id !== id)
    saveProducts(next)
    setProducts(next)
    setSelected(null)
  }

  const filtered = filter === 'all' ? products : products.filter(p => p.status === filter)

  if (selected) {
    return (
      <div>
        <PageHeader title="Products" subtitle="SKU catalog and product content library" />
        <ProductEditor
          product={selected}
          onSave={handleSave}
          onBack={() => setSelected(null)}
          onDelete={products.some(p => p.id === selected.id) ? () => handleDelete(selected.id) : null}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="SKU catalog and product content library"
        actions={
          <button
            onClick={() => setSelected(EMPTY_PRODUCT())}
            style={{ background: 'var(--red)', border: 'none', borderRadius: 8, color: 'var(--white)', padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            + New Product
          </button>
        }
      />

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[['all', 'All'], ['active', 'Active'], ['coming_soon', 'Coming Soon'], ['discontinued', 'Discontinued']].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            style={{
              background: filter === k ? 'var(--navy)' : 'var(--surface-2)',
              border: '1px solid ' + (filter === k ? 'var(--navy)' : 'var(--border-mid)'),
              borderRadius: 8, color: filter === k ? '#fff' : 'var(--text-secondary)',
              padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            {label} {k === 'all' ? `(${products.length})` : ''}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--navy)', marginBottom: 6, fontFamily: 'var(--font-heading)', letterSpacing: '0.04em' }}>No Products Yet</div>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 16 }}>Add your SKUs with benefits, ingredients, and talking points to power your scripts and ads.</div>
          <button
            onClick={() => setSelected(EMPTY_PRODUCT())}
            style={{ background: 'var(--red)', border: 'none', borderRadius: 8, color: 'var(--white)', padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Add Your First Product
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {filtered.map(p => <ProductCard key={p.id} product={p} onSelect={setSelected} />)}
        </div>
      )}
    </div>
  )
}
