import axios from 'axios'
import { getCredentials } from './credentials.js'

// ============================================
// API LAYER — All external service calls
// Credentials are read from localStorage (set
// via Settings UI) with .env as fallback.
// ============================================

function getCred(service, key, envFallback) {
  const creds = getCredentials(service)
  return creds?.[key] || envFallback || ''
}

// --- SHOPIFY ---
function getShopifyClient() {
  const storeUrl     = getCred('shopify', 'storeUrl',    import.meta.env.VITE_SHOPIFY_STORE_URL)
  const accessToken  = getCred('shopify', 'accessToken', import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN)
  return axios.create({
    baseURL: `https://${storeUrl}/admin/api/2024-01`,
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  })
}

export async function getShopifyOrders(limit = 50) {
  // NOTE: Shopify API requires a backend proxy in production
  // to avoid exposing your access token in the browser.
  // For now this works in dev. Add a serverless function later.
  const res = await getShopifyClient().get(`/orders.json?limit=${limit}&status=any`)
  return res.data.orders
}

export async function getShopifyProducts() {
  const res = await getShopifyClient().get('/products.json')
  return res.data.products
}

export async function getShopifyInventory() {
  const res = await getShopifyClient().get('/inventory_levels.json')
  return res.data.inventory_levels
}

// --- CLAUDE (Anthropic) ---
// IMPORTANT: In production, route this through your own backend
// to keep your API key secret. Never expose sk-ant- in the browser.
export async function generateWithClaude(systemPrompt, userMessage) {
  const apiKey = getCred('anthropic', 'apiKey', import.meta.env.VITE_ANTHROPIC_API_KEY)
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-allow-browser': 'true', // dev only
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

// Pre-built MAXD brand system prompt for Claude
export const MAXD_SYSTEM_PROMPT = `You are an expert brand copywriter for MAXD Wellness.

Brand: Modern sports nutrition brand. Flagship product: Creatine Gummies (U.S.-manufactured, FDA-certified, third-party tested, 100% transparent ingredients).
Mission: Honor the legacy of founder's mother — personal trainer and CrossFit enthusiast who lost her battle with cancer. Empower individuals through clean, transparent supplementation.
Tagline: "Go Beyond Your Limits"
Tone: Trustworthy, Straightforward, Inspiring, Fresh
Target: Jake Thompson — 20-35, tech job, gym 5x/week, skeptical of supplement claims, values convenience and efficiency.
Colors: Navy #141F36, Red #E21B4D, White #FFFFFF
Video framework: Hook (0-3s) → Problem (3-8s) → Value (8-25s) → Product Integration → Payoff (25-35s) → CTA
Copy frameworks available: BAB (Before-After-Bridge), PAS (Problem-Agitate-Solve), 4Ps (Promise-Picture-Proof-Push)
Funnel: TOFU (education/awareness), MOFU (trust/email), BOFU (conversion/urgency)

Always write in MAXD voice. Be direct, confident, and human. Never use generic supplement marketing language.`

// --- KLAVIYO ---
export async function getKlaviyoStats() {
  // Klaviyo requires a backend proxy — placeholder for now
  // TODO: create a Vercel serverless function at /api/klaviyo
  return {
    listSize: 0,
    openRate: 0,
    clickRate: 0,
    growth: 0,
  }
}

// --- MAKE WEBHOOKS ---
export async function triggerMakeWebhook(type, payload) {
  const webhooks = {
    content: getCred('make', 'contentWebhook', import.meta.env.VITE_MAKE_WEBHOOK_CONTENT),
    digest:  getCred('make', 'digestWebhook',  import.meta.env.VITE_MAKE_WEBHOOK_DIGEST),
  }
  if (!webhooks[type]) return
  await fetch(webhooks[type], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
