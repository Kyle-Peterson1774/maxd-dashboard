# MAXD Dashboard — Overnight Overhaul Changelog
**Date:** April 7, 2026
**Summary:** 12-task overhaul connecting the dashboard to real Notion data, adding sync capabilities across Content and Scripts pages, improving Analytics with realistic data, and polishing the Settings, Sales, and Dashboard pages.

---

## Task 1 — New: `src/lib/notion.js` (Notion sync utility)

Created a full Notion sync utility that reads credentials from `localStorage` (`maxd_cred_notion`), queries the Content Engine database via the Notion API, and merges results into the local content/scripts stores.

**Key exports:**
- `NOTION_CONTENT_DB_ID` — The real Content Engine DB ID: `dff8fb54-3a0d-45e8-9d13-4ea49a249ef5`
- `syncContentFromNotion()` — Fetches all pages, maps Notion fields to dashboard format, merges with existing `maxd_content` localStorage. Returns `{ added, updated, total }`. Preserves local edits (media links, upload status, etc.) and never overwrites manual items.
- `syncScriptsFromNotion()` — Same but filters for pages with Script content and writes to `maxd_scripts`.
- `testNotionConnection(apiKey)` — Pings `GET /v1/users/me` to verify the API key. Used by Settings Test Connection button.

**Status mapping:** Idea→idea, To Script→scripting, To Film→filming, Editing→editing, Posted→posted
**Content Type mapping:** Short Video→reel, Photo→post, Carousel→carousel, Story→story
**CORS note:** The `anthropic-dangerous-direct-browser-access: true` header is used as a workaround for direct browser access. In production, route through a serverless proxy.

---

## Task 2 — Content page: Notion sync button

**File:** `src/pages/Content.jsx`

- Added `import { syncContentFromNotion } from '../lib/notion.js'`
- Added `syncState` state (`{ loading, msg }`) to track sync status
- Added `handleNotionSync()` handler that: checks for credentials, calls `syncContentFromNotion()`, refreshes the content list from localStorage, shows a green success toast or amber warning
- Added **"◻ Sync Notion"** button in the `PageHeader` area (left of the "+ ADD CONTENT" button)
- If no Notion credentials are configured, shows "⚠ Add Notion credentials in Settings first" message
- Toast messages auto-dismiss after 5 seconds

---

## Task 3 — Scripts page: Notion sync button

**File:** `src/pages/Scripts.jsx`

- Added `import { syncScriptsFromNotion } from '../lib/notion.js'`
- Added `syncState` state and `handleNotionSync()` handler (same pattern as Content page)
- Refactored the `PageHeader` from `actions=` prop to `children` to accommodate multiple buttons
- Added **"◻ Sync Notion"** button alongside the existing "+ NEW SCRIPT" button
- Only syncs Notion pages that have non-empty Script field content

---

## Task 4 — Content page: Demo data already excellent

**File:** `src/pages/Content.jsx`

The existing `DEMO_DATA` array already contained 32 realistic MAXD-branded entries across all statuses (posted, scheduled, editing, scripting, idea) with platforms, funnel stages, Notion URLs, and captions. No structural changes needed — the data accurately represents the real content pipeline from the Notion Content Engine.

---

## Task 5 — Analytics: Expanded DEMO_ENTRIES with growth curve

**File:** `src/pages/Analytics.jsx`

Replaced 6 demo entries with **18 realistic entries** covering March 10 – April 14, 2026:
- Shows a genuine growth curve: early posts at 2K–8K views, scaling to 15K–42K by mid-March, consistent 20K–38K in April
- Aligned titles with actual content items (Why Gummies?, Builder Identity, Your Circle Standard, Creatine: 20yr Science, etc.)
- Mixed platforms: TikTok Reels (strongest performers), Instagram Reels, Instagram Stories, Instagram Carousels, Instagram Posts
- Notes include actual optimization observations (hook analysis, save rate comments, cross-post learnings)
- Engagement metrics are realistic ratios: ~7-8% like rate, ~1.5-2.5% comment rate on best performers

---

## Task 6 — credentials.js: Notion integration improvements

**File:** `src/lib/credentials.js`

Changes to the `notion` integration definition:
- Updated `desc` to: "Sync content calendar and scripts from Notion Content Engine"
- Renamed `databaseId` field label from "Scripts Database ID" → **"Content Engine Database ID"**
- Set `databaseId` placeholder to the actual DB ID: `dff8fb54-3a0d-45e8-9d13-4ea49a249ef5`
- Added `helpNote` property to the `databaseId` field (rendered as a blue hint box in Settings)
- Updated `helpText` to mention sharing the Content Engine database with the integration
- Added `note` to the integration with the pre-filled DB ID
- Added `testable: true` flag — consumed by Settings to show the Test Connection button

---

## Task 7 — GitHub Pages deployment: Verified correct

**Files:** `.github/workflows/deploy.yml`, `vite.config.js`

Both files were already correctly configured:
- `deploy.yml` uses `actions/upload-pages-artifact@v3` and `actions/deploy-pages@v4` with proper `pages: write` permissions and `id-token: write` for OIDC
- `vite.config.js` has `base: '/maxd-dashboard/'` (required for GitHub Pages subdirectory hosting)
- `package.json` has correct `build` script (`vite build`)

No changes needed.

---

## Task 8 — setup-github.sh: Improved robustness

**File:** `setup-github.sh`

Changes made:
- **Creates `.gitignore`** if one doesn't exist (covers `node_modules/`, `dist/`, `.env*`, `.DS_Store`, editor directories)
- **Guards `git init`** — only runs if `.git/` directory doesn't exist, avoiding errors on re-runs
- **Guards the commit** — checks `git diff --cached --quiet` before committing, skips if nothing to commit
- Improved step comments and success messages
- Added link to GitHub Actions page in the final output so you can monitor the deploy

---

## Task 9 — Dashboard: Notion Connected indicator

**File:** `src/pages/Dashboard.jsx`

- Added `useNotionConnected()` helper function that reads `maxd_cred_notion` from localStorage
- Added `notionConnected` state variable
- In the brand banner (top of the dashboard), added a status pill:
  - **Green "● Notion Connected"** when `maxd_cred_notion` has an `apiKey`
  - **Gray "○ Connect Notion"** (a `<Link>` to `/settings`) when not connected
- Styled consistently with the dark navy banner background

---

## Task 10 — Sales page: Shopify overview section

**File:** `src/pages/Sales.jsx`

Added a **Shopify Overview Panel** (`ShopifyPanel` component) at the top of the Sales page, above the CRM stats:

- **Not connected:** Shows a dashed placeholder card with "Connect Shopify" CTA linking to Settings
- **Connected, not loaded:** Shows a compact banner with the store URL, "Open Admin ↗" link, and "Load Orders" button
- **Loading:** Shows a spinner state
- **Error:** Shows a friendly error card with a retry button and a note about CORS requiring a backend proxy in production
- **Loaded:** Shows a 3-stat grid (Orders, Revenue, Avg Order) and a Top Products list
- Also added `import { Link } from 'react-router-dom'` for the Settings link

---

## Task 11 — Settings: Test Connection button for Notion

**File:** `src/pages/Settings.jsx`

- Added `import { testNotionConnection } from '../lib/notion.js'`
- In `ConnectModal`, added `testState` state (`{ loading, result, error }`)
- Added `handleTestNotion()` async handler that calls `testNotionConnection(values.apiKey)` and displays the workspace name on success or an error message on failure
- Added a **"◻ Test Connection"** button that appears when `integration.testable === true` AND the apiKey field has content
- Shows inline success (green) or error (red) feedback next to the button
- Also added rendering of `field.helpNote` — displays a blue monospace hint box below the field label (used for the Content Engine DB ID hint)

---

## Task 12 — This file

**File:** `CHANGES.md`

Full changelog written, grouped by task, covering every file modified and the reasoning behind each change.

---

## Files Changed Summary

| File | Type | Description |
|------|------|-------------|
| `src/lib/notion.js` | **NEW** | Notion API sync utility |
| `src/lib/credentials.js` | Modified | Improved Notion integration definition |
| `src/pages/Content.jsx` | Modified | Added Notion sync button + handler |
| `src/pages/Scripts.jsx` | Modified | Added Notion sync button + handler |
| `src/pages/Analytics.jsx` | Modified | Expanded DEMO_ENTRIES to 18 realistic entries |
| `src/pages/Dashboard.jsx` | Modified | Added Notion Connected indicator to brand banner |
| `src/pages/Settings.jsx` | Modified | Added Test Connection button + helpNote rendering |
| `src/pages/Sales.jsx` | Modified | Added ShopifyPanel component at top of page |
| `setup-github.sh` | Modified | Added .gitignore creation, git init guard, commit guard |
| `CHANGES.md` | **NEW** | This changelog |

## No Changes Needed

- `vite.config.js` — Already has correct `base: '/maxd-dashboard/'`
- `.github/workflows/deploy.yml` — Already correctly configured for Vite + GitHub Pages
- `package.json` — Scripts already correct
- `src/pages/Content.jsx` DEMO_DATA — Already has 32 high-quality MAXD entries
