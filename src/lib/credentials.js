// ============================================
// CREDENTIALS STORE
// Saves API keys to localStorage so users can
// connect integrations via the Settings UI.
// Keys are never sent anywhere except the
// specific service they belong to.
// ============================================

const PREFIX = 'maxd_cred_'

// Integration definitions — drives the Settings UI
// category: groups cards in the Settings Integrations section
export const INTEGRATIONS = {
  // ── E-Commerce ───────────────────────────
  shopify: {
    label: 'Shopify',
    category: 'ecommerce',
    color: '#639922',
    desc: 'Open your Shopify admin directly',
    icon: '🛍',
    quickLink: true,
    fields: [
      { key: 'storeUrl', label: 'Store URL', placeholder: 'your-store.myshopify.com', type: 'text' },
    ],
    helpUrl: 'https://admin.shopify.com',
    helpText: 'Enter your store URL to get a direct link to your Shopify admin',
  },

  // ── Marketing & Email ─────────────────────
  klaviyo: {
    label: 'Klaviyo',
    category: 'marketing',
    color: '#D4537E',
    desc: 'Email list, open rates, campaigns',
    icon: '📧',
    fields: [
      { key: 'apiKey', label: 'Private API Key', placeholder: 'pk_...', type: 'password' },
    ],
    helpUrl: 'https://help.klaviyo.com/hc/en-us/articles/115005062267',
    helpText: 'Klaviyo → Settings → API Keys → Create Private API Key',
  },
  metaAds: {
    label: 'Meta Ads',
    category: 'marketing',
    color: '#1877F2',
    desc: 'Instagram & Facebook ad spend, ROAS',
    icon: '◎',
    fields: [
      { key: 'accessToken',  label: 'Access Token',  placeholder: 'EAAx...',       type: 'password' },
      { key: 'adAccountId', label: 'Ad Account ID', placeholder: 'act_123456789', type: 'text'     },
    ],
    helpUrl: 'https://developers.facebook.com/docs/marketing-api/get-started',
    helpText: 'Meta Business Suite → Settings → Business Assets → Ad Accounts',
  },

  // ── Analytics ────────────────────────────
  googleAnalytics: {
    label: 'Google Analytics',
    category: 'analytics',
    color: '#D85A30',
    desc: 'Website traffic and conversions',
    icon: '◈',
    fields: [
      { key: 'propertyId', label: 'Measurement ID', placeholder: 'G-XXXXXXXXXX', type: 'text'     },
      { key: 'apiSecret',  label: 'API Secret',     placeholder: 'xxxxxx',        type: 'password' },
    ],
    helpUrl: 'https://support.google.com/analytics/answer/9304153',
    helpText: 'GA4 → Admin → Data Streams → your stream → Measurement Protocol API secrets',
  },

  // ── AI & Automation ───────────────────────
  anthropic: {
    label: 'Anthropic (Claude)',
    category: 'ai',
    color: '#378ADD',
    desc: 'AI content generation in AI Studio',
    icon: '✦',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'sk-ant-...', type: 'password' },
    ],
    helpUrl: 'https://console.anthropic.com/settings/keys',
    helpText: 'console.anthropic.com → API Keys → Create Key',
  },
  make: {
    label: 'Make',
    category: 'ai',
    color: '#7F77DD',
    desc: 'Automation webhooks for content & digests',
    icon: '⟁',
    fields: [
      { key: 'contentWebhook', label: 'Content Webhook URL', placeholder: 'https://hook.eu1.make.com/...', type: 'text' },
      { key: 'digestWebhook',  label: 'Digest Webhook URL',  placeholder: 'https://hook.eu1.make.com/...', type: 'text' },
    ],
    helpUrl: 'https://www.make.com/en/help/tools/webhooks',
    helpText: 'Make → Scenarios → Add webhook trigger → Copy URL',
  },

  // ── Workspace & Scheduling ────────────────
  googleCalendar: {
    label: 'Google Calendar',
    category: 'workspace',
    color: '#1A73E8',
    desc: 'Shoot scheduling & team calendar sync',
    icon: '📅',
    fields: [
      { key: 'calendarId', label: 'Calendar ID', placeholder: 'your@gmail.com or calendar ID', type: 'text' },
    ],
    helpUrl: 'https://support.google.com/calendar/answer/37082',
    helpText: 'Google Calendar → Settings → Integrate calendar → Calendar ID',
    note: 'Calendar is connected via your Google Workspace. Use the Calendar ID to set which calendar receives shoot events.',
  },
  notion: {
    label: 'Notion',
    category: 'workspace',
    color: '#1A1A1A',
    desc: 'Sync content calendar and scripts from Notion Content Engine',
    icon: '◻',
    fields: [
      { key: 'apiKey',     label: 'Integration Token',          placeholder: 'secret_...',                            type: 'password' },
      { key: 'databaseId', label: 'Content Engine Database ID', placeholder: 'dff8fb54-3a0d-45e8-9d13-4ea49a249ef5', type: 'text',
        helpNote: 'Your Content Engine database ID: dff8fb54-3a0d-45e8-9d13-4ea49a249ef5' },
    ],
    helpUrl: 'https://developers.notion.com/docs/create-a-notion-integration',
    helpText: 'Notion → Settings → Integrations → New Integration → Copy token. Share your Content Engine database with the integration.',
    note: 'Content Engine DB ID: dff8fb54-3a0d-45e8-9d13-4ea49a249ef5 — paste this into the field below to connect your database.',
    testable: true,
  },
}

// Category metadata — order and labels for the grouped UI
export const INTEGRATION_CATEGORIES = {
  ecommerce: { label: 'E-Commerce',           icon: '🛍' },
  marketing:  { label: 'Marketing & Email',    icon: '📣' },
  analytics:  { label: 'Analytics',            icon: '📊' },
  ai:         { label: 'AI & Automation',      icon: '✦'  },
  workspace:  { label: 'Workspace & Calendar', icon: '🗂' },
}

export function getCredentials(service) {
  try {
    const raw = localStorage.getItem(PREFIX + service)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveCredentials(service, data) {
  localStorage.setItem(PREFIX + service, JSON.stringify(data))
}

export function clearCredentials(service) {
  localStorage.removeItem(PREFIX + service)
}

export function isConnected(service) {
  const creds = getCredentials(service)
  if (!creds) return false
  return Object.values(creds).some(v => v && String(v).trim() !== '')
}

export function getConnectedCount() {
  return Object.keys(INTEGRATIONS).filter(isConnected).length
}
