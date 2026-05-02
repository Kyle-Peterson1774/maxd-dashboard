// ============================================
// LIVE DATA LAYER
// Fetches real data from connected integrations.
// All functions check credentials first and
// return null gracefully on any error.
// ============================================

import { getCredentials, isConnected } from './credentials.js'

// ── Shopify ────────────────────────────────────────────────────────────────────
// NOTE: Shopify Admin API allows browser requests when the access token is an
// Admin API access token from a custom/private app. CORS is supported.
// Storefront tokens are read-only and work for products only.

async function shopifyFetch(path) {
  const creds = getCredentials('shopify')
  if (!creds?.storeUrl) return null
  const url = creds.storeUrl.includes('://') ? creds.storeUrl : `https://${creds.storeUrl}`
  try {
    const res = await fetch(`${url}/admin/api/2024-01${path}`, {
      headers: {
        'X-Shopify-Access-Token': creds.apiKey || '',
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

/** Returns array of Shopify orders or null if not connected / CORS blocked */
export async function fetchShopifyOrders(daysBack = 60) {
  if (!isConnected('shopify')) return null
  const since = new Date(Date.now() - daysBack * 86400000).toISOString()
  const data = await shopifyFetch(`/orders.json?status=any&created_at_min=${since}&limit=250`)
  return data?.orders ?? null
}

/** Returns array of Shopify products or null */
export async function fetchShopifyProducts() {
  if (!isConnected('shopify')) return null
  const data = await shopifyFetch('/products.json?limit=250')
  return data?.products ?? null
}

/** Returns inventory levels for all locations or null */
export async function fetchShopifyInventory() {
  if (!isConnected('shopify')) return null
  const data = await shopifyFetch('/inventory_levels.json?limit=250')
  return data?.inventory_levels ?? null
}

/**
 * Derives a Finance-compatible transactions array from Shopify orders.
 * Each order becomes an income transaction. Returns [] if no orders.
 */
export function shopifyOrdersToTransactions(orders = []) {
  return orders.map(o => ({
    id: `sh_${o.id}`,
    date: o.created_at?.slice(0, 10) ?? '',
    description: `Shopify Order #${o.order_number}`,
    category: 'Product Sales',
    amount: parseFloat(o.total_price ?? 0),
    type: 'income',
    _source: 'shopify',
  }))
}

/**
 * Derives an Operations-compatible inventory array from Shopify products.
 * Each variant becomes an inventory row.
 */
export function shopifyProductsToInventory(products = []) {
  const rows = []
  products.forEach(p => {
    p.variants?.forEach(v => {
      rows.push({
        id: `sh_${v.id}`,
        sku: v.sku || `${p.id}-${v.id}`,
        name: p.variants.length > 1 ? `${p.title} — ${v.title}` : p.title,
        category: p.product_type || 'Product',
        stock: v.inventory_quantity ?? 0,
        reorderPoint: 50,
        unitCost: parseFloat(v.price ?? 0),
        supplier: 'Shopify',
        _source: 'shopify',
      })
    })
  })
  return rows
}

/**
 * Derives an Operations-compatible orders array from Shopify orders.
 */
export function shopifyOrdersToOpsOrders(orders = []) {
  return orders.slice(0, 100).map(o => ({
    id: `sh_${o.id}`,
    orderNo: `#${o.order_number}`,
    customer: o.billing_address?.name || o.email || 'Shopify Customer',
    sku: o.line_items?.[0]?.sku || '—',
    qty: o.line_items?.reduce((s, i) => s + i.quantity, 0) ?? 1,
    status: shopifyFulfillmentStatus(o),
    date: o.created_at?.slice(0, 10) ?? '',
    fulfillment: o.fulfillments?.[0]?.tracking_company || 'Shopify',
    trackingNo: o.fulfillments?.[0]?.tracking_number || '',
    _source: 'shopify',
  }))
}

function shopifyFulfillmentStatus(order) {
  const s = order.fulfillment_status
  if (s === 'fulfilled') return 'delivered'
  if (s === 'partial') return 'shipped'
  if (order.financial_status === 'paid') return 'processing'
  return 'pending'
}

// ── Instagram Graph API ────────────────────────────────────────────────────────
// Works from browser with a long-lived access token.

export async function fetchInstagramAccount() {
  const creds = getCredentials('instagram')
  if (!creds?.accessToken || !creds?.userId) return null
  try {
    const res = await fetch(
      `https://graph.instagram.com/${creds.userId}?fields=id,username,followers_count,media_count&access_token=${creds.accessToken}`
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.error) return null
    return data   // { id, username, followers_count, media_count }
  } catch { return null }
}

export async function fetchInstagramMedia(limit = 20) {
  const creds = getCredentials('instagram')
  if (!creds?.accessToken || !creds?.userId) return null
  try {
    const res = await fetch(
      `https://graph.instagram.com/${creds.userId}/media?fields=id,caption,media_type,timestamp,like_count,comments_count,permalink&limit=${limit}&access_token=${creds.accessToken}`
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.error) return null
    return data.data ?? []   // array of media objects
  } catch { return null }
}

// ── YouTube Data API v3 ────────────────────────────────────────────────────────
// Designed for browser use with an API key.

export async function fetchYouTubeChannel() {
  const creds = getCredentials('youtube')
  if (!creds?.apiKey || !creds?.channelId) return null
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${creds.channelId}&key=${creds.apiKey}`
    )
    if (!res.ok) return null
    const data = await res.json()
    const channel = data.items?.[0]
    if (!channel) return null
    return {
      id: channel.id,
      title: channel.snippet?.title,
      subscribers: parseInt(channel.statistics?.subscriberCount ?? 0),
      views: parseInt(channel.statistics?.viewCount ?? 0),
      videoCount: parseInt(channel.statistics?.videoCount ?? 0),
    }
  } catch { return null }
}

export async function fetchYouTubeVideos(limit = 10) {
  const creds = getCredentials('youtube')
  if (!creds?.apiKey || !creds?.channelId) return null
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${creds.channelId}&order=date&maxResults=${limit}&type=video&key=${creds.apiKey}`
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.items ?? []
  } catch { return null }
}

// ── Facebook Graph API ─────────────────────────────────────────────────────────
// Works from browser with a page access token.

export async function fetchFacebookPage() {
  const creds = getCredentials('facebook')
  if (!creds?.pageAccessToken || !creds?.pageId) return null
  try {
    const res = await fetch(
      `https://graph.facebook.com/${creds.pageId}?fields=fan_count,followers_count,name&access_token=${creds.pageAccessToken}`
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.error) return null
    return data   // { fan_count, followers_count, name }
  } catch { return null }
}

// ── Helper: build a Social "snapshot" from live platform data ─────────────────
/**
 * Fetches current follower counts from all connected social platforms
 * and returns a snapshot object ready to be logged in the Social page.
 * Returns null if nothing is connected.
 */
export async function fetchLiveFollowerSnapshot() {
  const [ig, yt, fb] = await Promise.all([
    fetchInstagramAccount(),
    fetchYouTubeChannel(),
    fetchFacebookPage(),
  ])

  const snapshot = {
    date: new Date().toISOString().split('T')[0],
    instagram: ig?.followers_count ?? null,
    tiktok: null,         // TikTok API requires backend proxy
    youtube: yt?.subscribers ?? null,
    facebook: fb?.fan_count ?? fb?.followers_count ?? null,
  }

  const hasAny = Object.values(snapshot).some((v, i) => i > 0 && v !== null)
  return hasAny ? snapshot : null
}

// ── Meta Ads (Marketing API) ───────────────────────────────────────────────────
// Works client-side — Meta Graph API supports CORS with access_token as query param.

export async function fetchMetaAdCampaigns() {
  const creds = getCredentials('metaAds')
  if (!creds?.accessToken || !creds?.adAccountId) return null
  const accountId = creds.adAccountId.startsWith('act_') ? creds.adAccountId : `act_${creds.adAccountId}`
  const token = creds.accessToken
  try {
    const [campaignsRes, insightsRes] = await Promise.all([
      fetch(`https://graph.facebook.com/v18.0/${accountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time&limit=50&access_token=${token}`),
      fetch(`https://graph.facebook.com/v18.0/${accountId}/insights?fields=campaign_id,spend,impressions,clicks,actions&level=campaign&date_preset=last_30d&access_token=${token}`),
    ])
    if (!campaignsRes.ok) return null
    const campaigns = await campaignsRes.json()
    if (campaigns.error) return null

    let insightsMap = {}
    if (insightsRes.ok) {
      const insights = await insightsRes.json()
      if (!insights.error) {
        for (const row of (insights.data || [])) {
          insightsMap[row.campaign_id] = row
        }
      }
    }

    return (campaigns.data || []).map(c => {
      const ins = insightsMap[c.id] || {}
      const purchases = (ins.actions || []).find(a => a.action_type === 'purchase')
      return {
        id: `meta_${c.id}`,
        name: c.name,
        platform: 'meta',
        status: c.status === 'ACTIVE' ? 'active' : c.status === 'PAUSED' ? 'paused' : 'completed',
        startDate: c.start_time?.slice(0, 10) || '',
        endDate:   c.stop_time?.slice(0, 10)  || '',
        budget: Math.round(parseFloat(c.daily_budget || c.lifetime_budget || 0) / 100),
        spend:       parseFloat(ins.spend || 0),
        revenue:     parseFloat(purchases?.value || 0),
        clicks:      parseInt(ins.clicks || 0),
        impressions: parseInt(ins.impressions || 0),
        conversions: parseInt(purchases?.value || 0),
        _source: 'meta',
      }
    })
  } catch { return null }
}

// ── Klaviyo (via proxy) ────────────────────────────────────────────────────────

export async function fetchKlaviyoCampaigns() {
  const creds = getCredentials('klaviyo')
  if (!creds?.apiKey) return null
  try {
    const res = await fetch('/api/klaviyo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: creds.apiKey,
        endpoint: `campaigns/?filter=equals(messages.channel,'email')&sort=-created_at&page[size]=50`,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.errors) return null
    return data.data ?? null
  } catch { return null }
}

/**
 * Maps Klaviyo campaign objects → Marketing page email format.
 * Note: open/click rates require additional metrics calls — set to 0 initially.
 */
export function klaviyoCampaignsToMarketing(campaigns = []) {
  return campaigns
    .filter(c => ['sent', 'scheduled', 'sending'].includes(c.attributes?.status))
    .map(c => {
      const attr = c.attributes || {}
      const sendTime = attr.send_time || attr.scheduled_at || attr.created_at || ''
      return {
        id: `kl_${c.id}`,
        date: sendTime.slice(0, 10),
        subject: attr.name || 'Klaviyo Email',
        platform: 'klaviyo',
        sent: 0,       // requires additional metrics call
        opened: 0,
        clicked: 0,
        revenue: 0,
        _source: 'klaviyo',
      }
    })
}

// ── Instagram media → Analytics entries ───────────────────────────────────────

/**
 * Transforms Instagram media objects into Analytics-compatible entry objects.
 * Call fetchInstagramMedia() first, then pass results here.
 */
export function instagramMediaToAnalytics(media = []) {
  return media.map(m => {
    const caption = m.caption || ''
    const firstLine = caption.split('\n')[0].replace(/#\w+/g, '').trim().slice(0, 100)
    const postType = m.media_type === 'CAROUSEL_ALBUM' ? 'Carousel'
      : m.media_type === 'VIDEO' ? 'Reel'
      : m.media_type === 'IMAGE' ? 'Post'
      : 'Post'
    return {
      id: `ig_${m.id}`,
      title:    firstLine || 'Instagram post',
      platform: 'Instagram',
      postType,
      postDate: m.timestamp?.slice(0, 10) || '',
      postUrl:  m.permalink || '',
      views:    m.video_view_count ?? '',
      likes:    m.like_count ?? '',
      comments: m.comments_count ?? '',
      shares:   '',
      saves:    '',
      reach:    '',
      clicks:   '',
      notes:    caption.length > 100 ? caption.slice(0, 200) + '…' : caption,
      createdAt: new Date().toISOString(),
      _source: 'instagram',
    }
  })
}

/**
 * Transforms YouTube video objects → Analytics-compatible entry objects.
 * Call fetchYouTubeVideos() first, then pass results here.
 */
export function youtubeVideosToAnalytics(videos = []) {
  return videos.map(v => {
    const snippet = v.snippet || {}
    return {
      id: `yt_${v.id?.videoId || v.id}`,
      title:    snippet.title || 'YouTube video',
      platform: 'YouTube',
      postType: 'Video',
      postDate: snippet.publishedAt?.slice(0, 10) || '',
      postUrl:  `https://youtube.com/watch?v=${v.id?.videoId || v.id}`,
      views: '', likes: '', comments: '', shares: '', saves: '', reach: '', clicks: '',
      notes: snippet.description?.slice(0, 200) || '',
      createdAt: new Date().toISOString(),
      _source: 'youtube',
    }
  })
}
