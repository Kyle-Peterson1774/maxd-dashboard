#!/bin/bash
# MAXD Dashboard — quick deploy to GitHub Pages
# Run from the project folder: bash deploy.sh
cd "$(dirname "$0")"
git add .
git commit -m "update: $(date '+%b %d %H:%M')" 2>/dev/null || echo "Nothing new to commit."
git push
echo ""
echo "✅ Pushed! GitHub Actions will deploy in ~1 min."
echo "   Live: https://Kyle-Peterson1774.github.io/maxd-dashboard/"
