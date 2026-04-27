// ============================================================
// CREDENTIALS STORE
//
// Integration API keys (Shopify, Klaviyo, Meta Ads, etc.) are
// held in module-level memory during a session and persisted
// to Supabase org_credentials — never in localStorage.
//
// The Supabase project URL and anon key are the ONLY values
// stored in localStorage, because they are public by design
// (Supabase's anon key is meant to be client-visible; RLS
// policies protect all data) and are needed before login.
//
// Public API (unchanged from before — all callers still work):
//   getCredentials(service)          — synchronous, from memory
//   saveCredentials(service, data)   — saves to memory + cloud
//   clearCredentials(service)        — removes from memory + cloud
//   isConnected(service)             — synchronous, from memory
//   getConnectedCount()              — synchronous, from memory
//   verifyConnection(service, creds) — async, validates key
//   INTEGRATIONS, INTEGRATION_CATEGORIES — integration definitions
// ============================================================

import {
  saveOrgCredential,
  deleteOrgCredential,
} from './supabase.js'

// ── Module-level session state ────────────────────────────────────────────────
// Set by initCredentials() immediately after login. Cleared on logout.

let _store = {}         // { shopify: {...}, klaviyo: {...}, ... }
let _orgId = null
let _accessToken = null

const SUPABASE_LS_KEY = 'maxd_cred_supabase'  // localStorage key for Supabase config only

// Called by auth.jsx after a successful login to hydrate the store
// with credentials loaded from Supabase org_credentials.
export function initCredentials(orgId, accessToken, cloudCreds = {}) {
  _orgId = orgId
  _accessToken = accessToken
  _store = { ...cloudCreds }

  // Always merge in the Supabase config from localStorage (it lives there by design)
  try {
    const raw = localStorage.getItem(SUPABASE_LS_KEY)
    if (raw) _store['supabase'] = JSON.parse(raw)
  } catch {}
}

// Called by auth.jsx on logout
export function clearCredentialStore() {
  _store = {}
  _orgId = null
  _accessToken = null
}


// ── Public API ────────────────────────────────────────────────────────────────

export function getCredentials(service) {
  if (service === 'supabase') {
    // Always read Supabase config from memory (hydrated from localStorage on init)
    // or fall back to localStorage directly (needed before login)
    if (_store.supabase) return _store.supabase
    try {
      const raw = localStorage.getItem(SUPABASE_LS_KEY)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }
  return _store[service] || null
}

export function saveCredentials(service, data) {
  _store[service] = data

  if (service === 'supabase') {
    // Supabase config is intentionally stored in localStorage (public values)
    localStorage.setItem(SUPABASE_LS_KEY, JSON.stringify(data))
    return
  }

  // Everything else: persist to Supabase org_credentials (fire-and-forget)
  if (_orgId && _accessToken) {
    saveOrgCredential(_orgId, service, data, _accessToken).catch(() => {})
  }
}

export function clearCredentials(service) {
  delete _store[service]

  if (service === 'supabase') {
    localStorage.removeItem(SUPABASE_LS_KEY)
    return
  }

  if (_orgId && _accessToken) {
    deleteOrgCredential(_orgId, service, _accessToken).catch(() => {})
  }
}

export function isConnected(service) {
  const creds = _store[service]
  if (!creds) return false
  return Object.values(creds).some(v => v && String(v).trim() !== '')
}

export function getConnectedCount() {
  return Object.keys(INTEGRATIONS).filter(isConnected).length
}


// ── Verification helpers ──────────────────────────────────────────────────────

async function verifyAnthropic(creds) {
  const key = creds.apiKey?.trim()
  if (!key) return { ok: false, error: 'API key is required.' }
  if (!key.startsWith('sk-ant-')) return { ok: false, error: 'Key should start with "sk-ant-". Double-check you copied the full key.' }
  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    })
    if (res.status === 401) return { ok: false, error: 'Invalid API key — authentication failed.' }
    if (res.status === 403) return { ok: false, error: 'API key exists but lacks permission.' }
    return { ok: true }
  } catch {
    return { ok: true, warning: 'Could not verify over the network (CORS), but key format looks correct.' }
  }
}

async function verifyNotion(creds) {
  const key = creds.apiKey?.trim()
  if (!key) return { ok: false, error: 'Integration token is required.' }
  if (!key.startsWith('secret_') && !key.startsWith('ntn_')) return { ok: false, error: 'Token should start with "secret_" or "ntn_".' }
  try {
    const res = await fetch('https://api.notion.com/v1/users/me', {
      headers: { Authorization: `Bearer ${key}`, 'Notion-Version': '2022-06-28' },
    })
    if (res.status === 401) return { ok: false, error: 'Invalid token — authentication failed.' }
    return { ok: true }
  } catch {
    return { ok: true, warning: 'Network check blocked, but token format looks correct.' }
  }
}

function verifyShopify(creds) {
  const url = creds.storeUrl?.trim()
  if (!url) return { ok: false, error: 'Store URL is required.' }
  if (!url.includes('.myshopify.com') && !url.includes('.shopify.com')) {
    return { ok: false, error: 'URL should end in ".myshopify.com" — e.g. your-store.myshopify.com' }
  }
  return { ok: true }
}

function verifyUrl(creds, keys = ['webhookUrl', 'contentWebhook', 'digestWebhook']) {
  const vals = keys.map(k => creds[k]?.trim()).filter(Boolean)
  if (!vals.length) return { ok: false, error: 'At least one webhook URL is required.' }
  const bad = vals.find(v => !v.startsWith('https://'))
  if (bad) return { ok: false, error: `URL must start with "https://" — got: ${bad.slice(0, 40)}` }
  return { ok: true }
}

function verifyFormat(creds, field, prefix, example) {
  const val = creds[field]?.trim()
  if (!val) return { ok: false, error: `${field} is required.` }
  if (prefix && !val.startsWith(prefix)) return { ok: false, error: `Expected format: ${example || prefix + '...'}` }
  return { ok: true }
}

function verifyNonEmpty(creds, fields) {
  for (const f of fields) {
    if (!creds[f]?.trim()) return { ok: false, error: `"${f}" is required — fill in all fields.` }
  }
  return { ok: true }
}


// ── Integration definitions ───────────────────────────────────────────────────

export const INTEGRATIONS = {

  // ── E-Commerce ───────────────────────────────────────────────────────────────
  shopify: {
    label: 'Shopify',       category: 'ecommerce', color: '#639922',
    desc: 'Orders, products, revenue sync', icon: '🛍', quickLink: true,
    fields: [
      { key: 'storeUrl', label: 'Store URL',                          placeholder: 'your-store.myshopify.com', type: 'text'     },
      { key: 'apiKey',   label: 'Admin API Access Token (optional)',   placeholder: 'shpat_...',                type: 'password' },
    ],
    helpUrl: 'https://shopify.dev/docs/api/admin-rest',
    helpText: 'Enter your store URL. For data sync, add an Admin API access token from Shopify Admin → Settings → Apps → Develop apps.',
    verify: verifyShopify,
  },
  woocommerce: {
    label: 'WooCommerce',   category: 'ecommerce', color: '#7F54B3',
    desc: 'WordPress / WooCommerce store data', icon: '🛒',
    fields: [
      { key: 'siteUrl',        label: 'Site URL',        placeholder: 'https://yourstore.com', type: 'text'     },
      { key: 'consumerKey',    label: 'Consumer Key',    placeholder: 'ck_...',                type: 'password' },
      { key: 'consumerSecret', label: 'Consumer Secret', placeholder: 'cs_...',                type: 'password' },
    ],
    helpUrl: 'https://woocommerce.com/document/woocommerce-rest-api/',
    helpText: 'WooCommerce → Settings → Advanced → REST API → Add key',
    verify: (c) => verifyNonEmpty(c, ['siteUrl', 'consumerKey', 'consumerSecret']),
  },
  bigcommerce: {
    label: 'BigCommerce',   category: 'ecommerce', color: '#34313F',
    desc: 'BigCommerce store orders & products', icon: '🏪',
    fields: [
      { key: 'storeHash',   label: 'Store Hash',   placeholder: 'abc123xyz',   type: 'text'     },
      { key: 'accessToken', label: 'Access Token', placeholder: 'xxxxxxxxxxx', type: 'password' },
    ],
    helpUrl: 'https://developer.bigcommerce.com/docs/rest-authentication',
    helpText: 'BigCommerce → Settings → API Accounts → Create API Account',
    verify: (c) => verifyNonEmpty(c, ['storeHash', 'accessToken']),
  },
  squarespace: {
    label: 'Squarespace',   category: 'ecommerce', color: '#000000',
    desc: 'Squarespace Commerce orders & inventory', icon: '◼',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', type: 'password' },
    ],
    helpUrl: 'https://developers.squarespace.com/commerce-apis/authentication',
    helpText: 'Squarespace → Settings → Advanced → Developer API Keys → Generate Key',
    verify: (c) => verifyNonEmpty(c, ['apiKey']),
  },
  amazon: {
    label: 'Amazon Seller', category: 'ecommerce', color: '#FF9900',
    desc: 'Amazon seller orders & performance', icon: '📦',
    fields: [
      { key: 'sellerId',    label: 'Seller ID',        placeholder: 'AXXXXXXXXXXXX',       type: 'text'     },
      { key: 'accessKey',   label: 'LWA Access Token', placeholder: 'Atza|...',            type: 'password' },
      { key: 'marketplace', label: 'Marketplace ID',   placeholder: 'ATVPDKIKX0DER (US)', type: 'text'     },
    ],
    helpUrl: 'https://developer-docs.amazon.com/sp-api/docs',
    helpText: 'Seller Central → Settings → User Permissions → Grant developer access → Login with Amazon credentials',
    verify: (c) => verifyNonEmpty(c, ['sellerId', 'accessKey']),
  },
  etsy: {
    label: 'Etsy',          category: 'ecommerce', color: '#F56400',
    desc: 'Etsy shop orders and listings', icon: '🧶',
    fields: [
      { key: 'apiKey',      label: 'API Key',      placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxx', type: 'password' },
      { key: 'accessToken', label: 'Access Token', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxx', type: 'password' },
    ],
    helpUrl: 'https://developers.etsy.com/documentation',
    helpText: 'Etsy Developer Portal → Create App → Copy API Key and generate Access Token',
    verify: (c) => verifyNonEmpty(c, ['apiKey', 'accessToken']),
  },
  square: {
    label: 'Square',        category: 'ecommerce', color: '#3E4348',
    desc: 'Square POS and online store', icon: '⬛',
    fields: [
      { key: 'accessToken', label: 'Access Token', placeholder: 'EAAAl...',           type: 'password' },
      { key: 'locationId',  label: 'Location ID',  placeholder: 'LXXXXXXXXXXXXXXXX',  type: 'text'     },
    ],
    helpUrl: 'https://developer.squareup.com/docs/get-started',
    helpText: 'Square Developer Portal → Applications → your app → Credentials → Access Token',
    verify: (c) => verifyNonEmpty(c, ['accessToken']),
  },

  // ── Marketing & Email ─────────────────────────────────────────────────────────
  klaviyo: {
    label: 'Klaviyo',       category: 'marketing', color: '#D4537E',
    desc: 'Email/SMS lists, open rates, campaigns', icon: '📧',
    fields: [
      { key: 'apiKey', label: 'Private API Key', placeholder: 'pk_...', type: 'password' },
    ],
    helpUrl: 'https://help.klaviyo.com/hc/en-us/articles/115005062267',
    helpText: 'Klaviyo → Settings → API Keys → Create Private API Key',
    verify: (c) => verifyFormat(c, 'apiKey', null, 'pk_xxxxx... or API key from Klaviyo'),
  },
  mailchimp: {
    label: 'Mailchimp',     category: 'marketing', color: '#FFE01B',
    desc: 'Email campaigns, audience & open rates', icon: '🐒',
    fields: [
      { key: 'apiKey',  label: 'API Key',     placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-us1', type: 'password' },
      { key: 'listId',  label: 'Audience ID', placeholder: 'abc12345',                             type: 'text'     },
    ],
    helpUrl: 'https://mailchimp.com/help/about-api-keys/',
    helpText: 'Mailchimp → Profile → Extras → API Keys → Create A Key',
    verify: (c) => verifyNonEmpty(c, ['apiKey']),
  },
  activecampaign: {
    label: 'ActiveCampaign', category: 'marketing', color: '#356AE6',
    desc: 'Email automation and CRM', icon: '⚡',
    fields: [
      { key: 'apiUrl', label: 'Account URL', placeholder: 'https://youracccount.api-us1.com', type: 'text'     },
      { key: 'apiKey', label: 'API Key',     placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',  type: 'password' },
    ],
    helpUrl: 'https://help.activecampaign.com/hc/en-us/articles/207317590',
    helpText: 'ActiveCampaign → Settings → Developer → API URL and Key',
    verify: (c) => verifyNonEmpty(c, ['apiUrl', 'apiKey']),
  },
  convertkit: {
    label: 'Kit (ConvertKit)', category: 'marketing', color: '#FB6970',
    desc: 'Creator email lists and sequences', icon: '✉️',
    fields: [
      { key: 'apiKey',    label: 'API Key',    placeholder: 'xxxxxxxxxxxxxxxxxxx', type: 'password' },
      { key: 'apiSecret', label: 'API Secret', placeholder: 'xxxxxxxxxxxxxxxxxxx', type: 'password' },
    ],
    helpUrl: 'https://developers.kit.com/docs',
    helpText: 'Kit → Settings → Advanced → API Key',
    verify: (c) => verifyNonEmpty(c, ['apiKey']),
  },
  hubspot: {
    label: 'HubSpot',       category: 'marketing', color: '#FF7A59',
    desc: 'CRM, contacts, deals & marketing hub', icon: '🧡',
    fields: [
      { key: 'apiKey', label: 'Private App Access Token', placeholder: 'pat-na1-...', type: 'password' },
    ],
    helpUrl: 'https://developers.hubspot.com/docs/api/private-apps',
    helpText: 'HubSpot → Settings → Integrations → Private Apps → Create private app → Copy token',
    verify: (c) => verifyNonEmpty(c, ['apiKey']),
  },
  metaAds: {
    label: 'Meta Ads',      category: 'marketing', color: '#1877F2',
    desc: 'Instagram & Facebook ad spend, ROAS', icon: '◎',
    fields: [
      { key: 'accessToken', label: 'Access Token',  placeholder: 'EAAx...',       type: 'password' },
      { key: 'adAccountId', label: 'Ad Account ID', placeholder: 'act_123456789', type: 'text'     },
    ],
    helpUrl: 'https://developers.facebook.com/docs/marketing-api/get-started',
    helpText: 'Meta Business Suite → Settings → Business Assets → Ad Accounts',
    verify: (c) => verifyNonEmpty(c, ['accessToken', 'adAccountId']),
  },
  googleAds: {
    label: 'Google Ads',    category: 'marketing', color: '#4285F4',
    desc: 'Google Ads campaigns, spend & ROAS', icon: '🎯',
    fields: [
      { key: 'customerId',     label: 'Customer ID',        placeholder: '123-456-7890',      type: 'text'     },
      { key: 'developerToken', label: 'Developer Token',    placeholder: 'xxxxxxxxxxxxxxxxx', type: 'password' },
      { key: 'accessToken',    label: 'OAuth Access Token', placeholder: 'ya29...',           type: 'password' },
    ],
    helpUrl: 'https://developers.google.com/google-ads/api/docs/get-started/introduction',
    helpText: 'Google Ads → Tools & Settings → API Center → Developer Token',
    verify: (c) => verifyNonEmpty(c, ['customerId', 'developerToken']),
  },
  tiktokAds: {
    label: 'TikTok Ads',    category: 'marketing', color: '#010101',
    desc: 'TikTok paid campaigns and spend', icon: '🎵',
    fields: [
      { key: 'accessToken',  label: 'Access Token',  placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'password' },
      { key: 'advertiserId', label: 'Advertiser ID', placeholder: '1234567890123',                    type: 'text'     },
    ],
    helpUrl: 'https://ads.tiktok.com/marketing_api/docs?id=1738855099573250',
    helpText: 'TikTok Ads Manager → Tools → API → Create App → Get Access Token',
    verify: (c) => verifyNonEmpty(c, ['accessToken', 'advertiserId']),
  },
  pinterestAds: {
    label: 'Pinterest Ads', category: 'marketing', color: '#E60023',
    desc: 'Pinterest ad campaigns and analytics', icon: '📌',
    fields: [
      { key: 'accessToken', label: 'Access Token',  placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'password' },
      { key: 'adAccountId', label: 'Ad Account ID', placeholder: '549755813599',                     type: 'text'     },
    ],
    helpUrl: 'https://developers.pinterest.com/docs/getting-started/authentication/',
    helpText: 'Pinterest Developers → Apps → Generate Token → Ad Accounts',
    verify: (c) => verifyNonEmpty(c, ['accessToken']),
  },
  snapchatAds: {
    label: 'Snapchat Ads',  category: 'marketing', color: '#FFFC00',
    desc: 'Snapchat ad spend and performance', icon: '👻',
    fields: [
      { key: 'accessToken', label: 'Access Token',  placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',      type: 'password' },
      { key: 'adAccountId', label: 'Ad Account ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', type: 'text'     },
    ],
    helpUrl: 'https://marketingapi.snapchat.com/docs/',
    helpText: 'Snap Business Manager → Business Details → Snap API',
    verify: (c) => verifyNonEmpty(c, ['accessToken', 'adAccountId']),
  },

  // ── Analytics ─────────────────────────────────────────────────────────────────
  googleAnalytics: {
    label: 'Google Analytics', category: 'analytics', color: '#D85A30',
    desc: 'Website traffic, conversions & events', icon: '◈',
    fields: [
      { key: 'propertyId', label: 'Measurement ID', placeholder: 'G-XXXXXXXXXX', type: 'text'     },
      { key: 'apiSecret',  label: 'API Secret',     placeholder: 'xxxxxx',        type: 'password' },
    ],
    helpUrl: 'https://support.google.com/analytics/answer/9304153',
    helpText: 'GA4 → Admin → Data Streams → your stream → Measurement Protocol API secrets',
    verify: (c) => {
      const id = c.propertyId?.trim()
      if (!id) return { ok: false, error: 'Measurement ID is required.' }
      if (!id.match(/^G-[A-Z0-9]+$/)) return { ok: false, error: 'Measurement ID should be in format "G-XXXXXXXXXX".' }
      return { ok: true }
    },
  },
  tripleWhale: {
    label: 'Triple Whale',   category: 'analytics', color: '#3B82F6',
    desc: 'DTC attribution, blended ROAS & LTV', icon: '🐳',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'tw_...', type: 'password' },
    ],
    helpUrl: 'https://developers.triplewhale.com/',
    helpText: 'Triple Whale → Settings → Integrations → API → Generate Key',
    verify: (c) => verifyNonEmpty(c, ['apiKey']),
  },
  northbeam: {
    label: 'Northbeam',      category: 'analytics', color: '#6366F1',
    desc: 'Multi-touch attribution and forecasting', icon: '🔭',
    fields: [
      { key: 'apiKey',    label: 'API Key',    placeholder: 'nb_...',      type: 'password' },
      { key: 'accountId', label: 'Account ID', placeholder: 'your-brand',  type: 'text'     },
    ],
    helpUrl: 'https://help.northbeam.io/',
    helpText: 'Northbeam → Settings → API Access → Generate Key',
    verify: (c) => verifyNonEmpty(c, ['apiKey']),
  },
  mixpanel: {
    label: 'Mixpanel',       category: 'analytics', color: '#7856FF',
    desc: 'Product analytics and funnel tracking', icon: '📐',
    fields: [
      { key: 'projectToken', label: 'Project Token', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'password' },
      { key: 'apiSecret',    label: 'API Secret',    placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'password' },
    ],
    helpUrl: 'https://developer.mixpanel.com/reference/authentication',
    helpText: 'Mixpanel → Project Settings → Access Keys',
    verify: (c) => verifyNonEmpty(c, ['projectToken']),
  },
  hotjar: {
    label: 'Hotjar',         category: 'analytics', color: '#FF3C00',
    desc: 'Heatmaps, session recordings & surveys', icon: '🔥',
    fields: [
      { key: 'siteId', label: 'Site ID', placeholder: '1234567',    type: 'text'     },
      { key: 'apiKey', label: 'API Key', placeholder: 'xxxxxxxxxx', type: 'password' },
    ],
    helpUrl: 'https://help.hotjar.com/hc/en-us/articles/115011640428',
    helpText: 'Hotjar → Settings → Tracking Code → Site ID',
    verify: (c) => verifyNonEmpty(c, ['siteId']),
  },

  // ── Social Media ──────────────────────────────────────────────────────────────
  instagram: {
    label: 'Instagram',      category: 'social', color: '#E1306C',
    desc: 'Instagram posts, reels, stories & insights', icon: '📸',
    fields: [
      { key: 'accessToken', label: 'Long-Lived Access Token', placeholder: 'EAA...',               type: 'password' },
      { key: 'userId',      label: 'Instagram User ID',       placeholder: '17841400000000000',    type: 'text'     },
    ],
    helpUrl: 'https://developers.facebook.com/docs/instagram-basic-display-api',
    helpText: 'Meta for Developers → Instagram Basic Display → Generate Token for your account',
    verify: (c) => verifyNonEmpty(c, ['accessToken']),
  },
  tiktok: {
    label: 'TikTok',         category: 'social', color: '#010101',
    desc: 'TikTok organic content stats & account', icon: '🎵',
    fields: [
      { key: 'accessToken', label: 'Access Token', placeholder: 'act.xxxxxxxxxxxxxxxx', type: 'password' },
    ],
    helpUrl: 'https://developers.tiktok.com/doc/tiktok-api-v2-introduction/',
    helpText: 'TikTok Developer Portal → Your Apps → Auth code flow → Access Token',
    verify: (c) => verifyNonEmpty(c, ['accessToken']),
  },
  youtube: {
    label: 'YouTube',        category: 'social', color: '#FF0000',
    desc: 'YouTube channel analytics, views & subs', icon: '▶',
    fields: [
      { key: 'apiKey',    label: 'API Key',    placeholder: 'AIza...',                     type: 'password' },
      { key: 'channelId', label: 'Channel ID', placeholder: 'UCxxxxxxxxxxxxxxxxxxxxxxxx',  type: 'text'     },
    ],
    helpUrl: 'https://developers.google.com/youtube/v3/getting-started',
    helpText: 'Google Cloud Console → Credentials → Create API Key → Restrict to YouTube Data API v3',
    verify: (c) => {
      if (!c.apiKey?.trim()) return { ok: false, error: 'API Key is required.' }
      if (!c.apiKey.startsWith('AIza')) return { ok: false, error: 'API Key should start with "AIza".' }
      return { ok: true }
    },
  },
  facebook: {
    label: 'Facebook Pages',  category: 'social', color: '#1877F2',
    desc: 'Facebook Page posts and page insights', icon: '👍',
    fields: [
      { key: 'pageAccessToken', label: 'Page Access Token', placeholder: 'EAA...',            type: 'password' },
      { key: 'pageId',          label: 'Page ID',           placeholder: '123456789012345',   type: 'text'     },
    ],
    helpUrl: 'https://developers.facebook.com/docs/pages',
    helpText: 'Meta for Developers → Graph API Explorer → Generate Page Access Token',
    verify: (c) => verifyNonEmpty(c, ['pageAccessToken', 'pageId']),
  },
  linkedin: {
    label: 'LinkedIn',        category: 'social', color: '#0A66C2',
    desc: 'LinkedIn company page analytics', icon: '💼',
    fields: [
      { key: 'accessToken',   label: 'Access Token',    placeholder: 'AQV...',                        type: 'password' },
      { key: 'organizationId',label: 'Organization ID', placeholder: 'urn:li:organization:12345',     type: 'text'     },
    ],
    helpUrl: 'https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow',
    helpText: 'LinkedIn Developer Portal → Your App → Auth → OAuth 2.0 → Request Access Token',
    verify: (c) => verifyNonEmpty(c, ['accessToken']),
  },

  // ── AI & Automation ───────────────────────────────────────────────────────────
  anthropic: {
    label: 'Anthropic (Claude)', category: 'ai', color: '#378ADD',
    desc: 'AI content generation in AI Studio', icon: '✦',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'sk-ant-...', type: 'password' },
    ],
    helpUrl: 'https://console.anthropic.com/settings/keys',
    helpText: 'console.anthropic.com → API Keys → Create Key',
    verify: verifyAnthropic,
  },
  openai: {
    label: 'OpenAI',          category: 'ai', color: '#10A37F',
    desc: 'GPT models for content & automation', icon: '◎',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'sk-...', type: 'password' },
    ],
    helpUrl: 'https://platform.openai.com/api-keys',
    helpText: 'platform.openai.com → API keys → Create new secret key',
    verify: (c) => {
      const key = c.apiKey?.trim()
      if (!key) return { ok: false, error: 'API Key is required.' }
      if (!key.startsWith('sk-')) return { ok: false, error: 'OpenAI key should start with "sk-".' }
      return { ok: true }
    },
  },
  make: {
    label: 'Make',            category: 'ai', color: '#7F77DD',
    desc: 'Automation webhooks for content & digests', icon: '⟁',
    fields: [
      { key: 'contentWebhook', label: 'Content Webhook URL', placeholder: 'https://hook.eu1.make.com/...', type: 'text' },
      { key: 'digestWebhook',  label: 'Digest Webhook URL',  placeholder: 'https://hook.eu1.make.com/...', type: 'text' },
    ],
    helpUrl: 'https://www.make.com/en/help/tools/webhooks',
    helpText: 'Make → Scenarios → Add webhook trigger → Copy URL',
    verify: (c) => verifyUrl(c, ['contentWebhook', 'digestWebhook']),
  },
  zapier: {
    label: 'Zapier',          category: 'ai', color: '#FF4A00',
    desc: 'Zapier webhook automations', icon: '⚡',
    fields: [
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://hooks.zapier.com/hooks/catch/...', type: 'text' },
    ],
    helpUrl: 'https://help.zapier.com/hc/en-us/articles/8496288690829',
    helpText: 'Zapier → Create Zap → Trigger: Webhooks by Zapier → Catch Hook → Copy URL',
    verify: (c) => verifyUrl(c, ['webhookUrl']),
  },
  n8n: {
    label: 'n8n',             category: 'ai', color: '#EA4B71',
    desc: 'Self-hosted workflow automation', icon: '🔄',
    fields: [
      { key: 'webhookUrl', label: 'Webhook URL',          placeholder: 'https://your-n8n.com/webhook/...', type: 'text'     },
      { key: 'apiKey',     label: 'API Key (optional)',   placeholder: 'xxxxxxxxxx',                       type: 'password' },
    ],
    helpUrl: 'https://docs.n8n.io/integrations/core-nodes/n8n-nodes-base.webhook/',
    helpText: 'n8n → Workflows → Add Webhook node → Copy production URL',
    verify: (c) => verifyUrl(c, ['webhookUrl']),
  },

  // ── Workspace & Calendar ──────────────────────────────────────────────────────
  notion: {
    label: 'Notion',          category: 'workspace', color: '#1A1A1A',
    desc: 'Sync content calendar & scripts from Notion', icon: '◻',
    fields: [
      { key: 'apiKey',     label: 'Integration Token',          placeholder: 'secret_...',                            type: 'password' },
      { key: 'databaseId', label: 'Content Engine Database ID', placeholder: 'dff8fb54-3a0d-45e8-9d13-4ea49a249ef5', type: 'text',
        helpNote: 'Your Content Engine database ID: dff8fb54-3a0d-45e8-9d13-4ea49a249ef5' },
    ],
    helpUrl: 'https://developers.notion.com/docs/create-a-notion-integration',
    helpText: 'Notion → Settings → Integrations → New Integration → Copy token. Share your Content Engine database with the integration.',
    note: 'Content Engine DB ID: dff8fb54-3a0d-45e8-9d13-4ea49a249ef5',
    verify: verifyNotion,
    testable: true,
  },
  googleCalendar: {
    label: 'Google Calendar',  category: 'workspace', color: '#1A73E8',
    desc: 'Shoot scheduling & team calendar sync', icon: '📅',
    fields: [
      { key: 'calendarId', label: 'Calendar ID', placeholder: 'your@gmail.com or calendar ID', type: 'text' },
    ],
    helpUrl: 'https://support.google.com/calendar/answer/37082',
    helpText: 'Google Calendar → Settings → Integrate calendar → Calendar ID',
    note: 'Calendar is connected via your Google Workspace. Use the Calendar ID to set which calendar receives shoot events.',
    verify: (c) => verifyNonEmpty(c, ['calendarId']),
  },
  airtable: {
    label: 'Airtable',         category: 'workspace', color: '#2D7FF9',
    desc: 'Airtable bases for ops and tracking', icon: '📋',
    fields: [
      { key: 'apiKey', label: 'Personal Access Token', placeholder: 'patXXXXXXXXXXXXXX.xxxx...', type: 'password' },
      { key: 'baseId', label: 'Base ID',               placeholder: 'appXXXXXXXXXXXXXX',         type: 'text'     },
    ],
    helpUrl: 'https://airtable.com/developers/web/guides/personal-access-tokens',
    helpText: 'Airtable → Account → Developer hub → Personal access tokens → Create token',
    verify: (c) => {
      if (!c.apiKey?.trim()) return { ok: false, error: 'Personal Access Token is required.' }
      if (!c.apiKey.startsWith('pat')) return { ok: false, error: 'Token should start with "pat". Make sure you\'re using a Personal Access Token, not a legacy API key.' }
      return { ok: true }
    },
  },
  monday: {
    label: 'Monday.com',       category: 'workspace', color: '#FF3D57',
    desc: 'Monday boards for project management', icon: '📅',
    fields: [
      { key: 'apiKey', label: 'API Token', placeholder: 'eyJhbGciOiJIUzI1Ni...', type: 'password' },
    ],
    helpUrl: 'https://developer.monday.com/api-reference/docs/authentication',
    helpText: 'Monday.com → Profile → Developers → My Access Tokens → Copy',
    verify: (c) => verifyNonEmpty(c, ['apiKey']),
  },
  clickup: {
    label: 'ClickUp',          category: 'workspace', color: '#7B68EE',
    desc: 'ClickUp tasks and project tracking', icon: '✅',
    fields: [
      { key: 'apiKey', label: 'Personal API Key', placeholder: 'pk_XXXXXXXXXXXXXXXXXXXXXXXXXX', type: 'password' },
    ],
    helpUrl: 'https://clickup.com/api/developer-portal/authentication/',
    helpText: 'ClickUp → Profile → Apps → Personal API Token → Generate',
    verify: (c) => verifyFormat(c, 'apiKey', 'pk_', 'pk_XXXXXXXXXX'),
  },
  slack: {
    label: 'Slack',            category: 'workspace', color: '#4A154B',
    desc: 'Team notifications and alerts', icon: '💬',
    fields: [
      { key: 'webhookUrl', label: 'Incoming Webhook URL', placeholder: 'https://hooks.slack.com/services/T.../B.../...', type: 'text' },
    ],
    helpUrl: 'https://api.slack.com/messaging/webhooks',
    helpText: 'Slack → Apps → Incoming Webhooks → Add to Slack → Copy Webhook URL',
    verify: (c) => {
      const url = c.webhookUrl?.trim()
      if (!url) return { ok: false, error: 'Webhook URL is required.' }
      if (!url.startsWith('https://hooks.slack.com/')) return { ok: false, error: 'URL should start with "https://hooks.slack.com/".' }
      return { ok: true }
    },
  },

  // ── Cloud Sync ────────────────────────────────────────────────────────────────
  supabase: {
    label: 'Supabase',
    category: 'sync',
    color: '#3ECF8E',
    fields: [
      { key: 'projectUrl', label: 'Project URL',     placeholder: 'https://xxxxxxxxxxxx.supabase.co',         type: 'text'     },
      { key: 'anonKey',    label: 'Anon Public Key', placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', type: 'password' },
    ],
    helpText: 'Found in your Supabase project → Settings → API. The anon key is a public value — enabling Supabase stores all your data and credentials securely in the cloud.',
    helpUrl: 'https://supabase.com/dashboard',
    verify: (c) => {
      if (!c.projectUrl?.trim()) return { ok: false, error: 'Project URL is required.' }
      if (!c.projectUrl.includes('supabase.co')) return { ok: false, error: 'URL should end with .supabase.co' }
      if (!c.anonKey?.trim()) return { ok: false, error: 'Anon public key is required.' }
      return { ok: true }
    },
  },
}


// ── Category metadata ─────────────────────────────────────────────────────────

export const INTEGRATION_CATEGORIES = {
  sync:      { label: 'Cloud Sync',          icon: '☁️'  },
  ecommerce: { label: 'E-Commerce',           icon: '🛍'  },
  marketing: { label: 'Marketing & Email',    icon: '📣'  },
  analytics: { label: 'Analytics',            icon: '📊'  },
  social:    { label: 'Social Media',         icon: '📱'  },
  ai:        { label: 'AI & Automation',      icon: '✦'   },
  workspace: { label: 'Workspace & Calendar', icon: '🗂'  },
}


// ── Verify a connection ───────────────────────────────────────────────────────

export async function verifyConnection(serviceKey, creds) {
  const integration = INTEGRATIONS[serviceKey]
  if (!integration?.verify) return { ok: true }
  try {
    return await integration.verify(creds)
  } catch (err) {
    return { ok: false, error: `Unexpected error during verification: ${err.message}` }
  }
}
