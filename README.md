# MAXD Wellness — Business OS Dashboard

A custom React business intelligence dashboard for MAXD Wellness.
Built with React 18, Vite, React Router, and Recharts.

---

## Tech Stack

- **React 18** — UI framework
- **Vite** — build tool and dev server
- **React Router v6** — client-side routing
- **Recharts** — charts and data visualization
- **Axios** — HTTP requests
- **Claude API** — AI content generation (scripts, copy, emails)
- **Shopify Admin API** — orders, revenue, inventory
- **Google Vertex AI** — Imagen 3 (images) + Veo 2 (video) [coming soon]
- **Firebase Auth** — user login and role-based access [coming soon]

---

## Project Structure

```
maxd-dashboard/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.jsx       ← Main wrapper with sidebar
│   │   │   └── Sidebar.jsx      ← Nav with role-based visibility
│   │   └── ui/
│   │       ├── StatCard.jsx     ← Reusable metric card
│   │       └── PageHeader.jsx   ← Page title + subtitle
│   ├── lib/
│   │   ├── auth.jsx             ← Auth context + role permissions
│   │   └── api.js               ← All API calls (Shopify, Claude, etc.)
│   ├── pages/
│   │   ├── Dashboard.jsx        ← Main overview page ✅
│   │   ├── AIStudio.jsx         ← Claude AI content generator ✅
│   │   └── stubs.jsx            ← Placeholder pages (build these out next)
│   ├── App.jsx                  ← Routes + auth wrapper
│   ├── main.jsx                 ← Entry point
│   └── index.css                ← Global styles + MAXD brand tokens
├── .env.example                 ← Copy to .env and fill in your keys
├── .gitignore
├── index.html
├── package.json
└── vite.config.js
```

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
```
Then open `.env` and fill in your API keys (see "Getting API Keys" below).

### 3. Run locally
```bash
npm run dev
```
Open http://localhost:5173

### 4. Build for production
```bash
npm run build
```

---

## Getting API Keys

### Shopify (do this first — you already have a store)
1. Go to your Shopify Admin → Settings → Apps and sales channels
2. Click "Develop apps" → "Create an app" → name it "MAXD Dashboard"
3. Under "Configuration" → set Admin API scopes: `read_orders`, `read_products`, `read_inventory`, `read_customers`
4. Click "Install app" → copy the **Admin API access token** (starts with `shpat_`)
5. Also copy your store URL (e.g. `your-store.myshopify.com`)

### Anthropic / Claude API
1. Go to https://console.anthropic.com
2. Sign up → go to "API Keys" → "Create Key" → name it "MAXD Dashboard"
3. Copy the key (starts with `sk-ant-`)
4. You get $5 free credit to start

### Google Analytics (you already have this)
1. Go to https://analytics.google.com
2. Admin → Data Streams → click your stream
3. Copy the **Measurement ID** (starts with `G-`)

### Google Cloud / Vertex AI (for Imagen + Veo)
1. Go to https://console.cloud.google.com
2. Create a new project called "MAXD"
3. Enable "Vertex AI API"
4. Go to Credentials → Create API Key → copy it

### Firebase (for auth + team access)
1. Go to https://console.firebase.google.com
2. Create project → Add web app → name it "MAXD Dashboard"
3. Enable Authentication → Sign-in method → Google
4. Copy the Firebase config object values into your .env

### Klaviyo
1. Go to https://klaviyo.com → Settings → API Keys
2. Create a Private API Key → copy it

---

## Role-Based Access

Roles are defined in `src/lib/auth.jsx`:

| Role       | Access |
|------------|--------|
| `admin`    | Everything — all 9 pages |
| `content`  | Dashboard, Social, Content, AI Studio |
| `marketing`| Dashboard, Social, Marketing, Sales |
| `ops`      | Dashboard, Operations, Sales |

To add a new team member, add them to `MOCK_USERS` in `auth.jsx` with their role.
When Firebase Auth is set up, this will be driven by the database instead.

---

## Building Out Modules

Each stub page in `stubs.jsx` is ready to be replaced with a full module.
Ask Claude to build each one:

- *"Build me the Sales module — connect to Shopify API, show revenue, orders, AOV, and a monthly chart using MAXD brand colors"*
- *"Build me the Social Growth module — show follower growth for IG and TikTok with charts"*
- *"Build me the Content Pipeline module — kanban board with statuses: Idea, Scripted, To Film, In Edit, Ready to Post, Posted"*
- *"Build me the Finance module — P&L tracker with COGS, gross margin, and monthly net profit chart"*

---

## Deploying to Vercel

1. Push to GitHub (private repo)
2. Go to https://vercel.com → Import your repo
3. Add all `.env` variables in Vercel → Settings → Environment Variables
4. Deploy — your app will be live in ~2 minutes
5. Add your custom domain `dashboard.trymaxd.com` in Vercel → Domains

Every `git push` to `main` auto-deploys. No manual steps needed after setup.

---

## Brand Tokens

MAXD brand is defined in `src/index.css` as CSS variables:

```css
--navy:       #141F36   /* primary background / text */
--navy-light: #1E2D4F   /* sidebar hover states */
--red:        #E21B4D   /* accents / CTAs / highlights */
--white:      #FFFFFF
--font-heading: 'Oswald', sans-serif
--font-body:    'Roboto', sans-serif
```

---

## ⚠️ Security Notes

1. **Never commit `.env`** — it's in `.gitignore` already
2. **API keys in the browser** — the current setup is fine for development but in production you should route Shopify and Anthropic calls through a backend serverless function (Vercel API routes) to keep keys server-side
3. **Add Vercel API routes** before going live — ask Claude: *"Create a Vercel API route to proxy Shopify requests so the access token stays server-side"*
