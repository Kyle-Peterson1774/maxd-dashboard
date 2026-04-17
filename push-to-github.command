#!/bin/bash
# MAXD Dashboard — Push to GitHub
cd "$(dirname "$0")"
echo ""
echo "🚀 MAXD Dashboard — Pushing to GitHub..."
echo ""

# Remove stale git lock files if present
rm -f .git/index.lock .git/HEAD.lock 2>/dev/null

# Stage all changes
git add -A

# Check if there's anything to commit
if git diff --cached --quiet; then
  echo "✅ Nothing to commit — everything is already up to date!"
else
  git commit -m "feat: Action Queue, AI agents, Supabase sync, auth lockdown, mobile layout

- Add Action Queue page with approval workflow for AI-generated content
- Wire Queue into routing and sidebar nav with live pending-item badge
- Add 5 AI Studio agents (Content Repurposer, Sales Sequence, Weekly Ideas, etc.)
- Add real Supabase auth with approved-email access control and role system
- Add cloud sync layer with localStorage fallback
- Add mobile-responsive layout with hamburger menu
- Build out Sales CRM, Marketing, Finance, Operations, Analytics pages
- Add Settings access control panel and backup/restore

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

  echo ""
  echo "📦 Committed. Pushing to GitHub..."
  git push

  echo ""
  echo "✅ Done! Your site will be live in ~60 seconds at:"
  echo "   https://kyle-peterson1774.github.io/maxd-dashboard/"
fi

echo ""
read -p "Press Enter to close this window..."
