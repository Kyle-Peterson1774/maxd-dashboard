#!/bin/bash
# =============================================================
# MAXD Dashboard — GitHub Setup Script
# Run this ONCE from your Terminal inside the project folder:
#   cd ~/Documents/MAXD\ Wellness/maxd-dashboard
#   bash setup-github.sh
# =============================================================

set -e

echo "🚀 Setting up MAXD Dashboard on GitHub..."

# 1. Create .gitignore if it doesn't exist
if [ ! -f .gitignore ]; then
  echo "Creating .gitignore..."
  cat > .gitignore << 'EOF'
# Dependencies
node_modules/

# Build output
dist/
dist-ssr/

# Environment files — NEVER commit these
.env
.env.local
.env.*.local

# Editor directories
.DS_Store
.vscode/
*.swp
*.swo

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
EOF
  echo "✅ .gitignore created"
fi

# 2. Initialize git repo only if not already initialized
if [ ! -d .git ]; then
  echo "Initializing git repo..."
  git init
  git branch -M main
else
  echo "Git repo already initialized."
  # Make sure we're on main
  git checkout -B main 2>/dev/null || true
fi

# 3. Stage all files
git add .

# 4. Check if there's anything to commit
if git diff --cached --quiet; then
  echo "No changes to commit — repo may already be set up."
else
  git commit -m "Initial commit: MAXD Dashboard React/Vite app"
  echo "✅ Initial commit created"
fi

# 5. Create the GitHub repo (public — required for free GitHub Pages)
#    Requires GitHub CLI (gh) to be installed and authenticated.
#    Install: brew install gh && gh auth login
echo ""
echo "Creating GitHub repo..."
gh repo create maxd-dashboard \
  --public \
  --description "MAXD Wellness internal dashboard" \
  --source=. \
  --remote=origin \
  --push

echo ""
echo "✅ Code pushed to GitHub!"
echo ""

# 6. Enable GitHub Pages via API (using GitHub Actions workflow)
GITHUB_USER=$(gh api user --jq '.login')
echo "Enabling GitHub Pages for $GITHUB_USER/maxd-dashboard..."

gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  /repos/$GITHUB_USER/maxd-dashboard/pages \
  -f build_type=workflow 2>/dev/null || echo "(Pages may already be enabled or will activate after first workflow run)"

echo ""
echo "=============================================="
echo "✅ ALL DONE!"
echo ""
echo "  GitHub repo:  https://github.com/$GITHUB_USER/maxd-dashboard"
echo "  Live URL:     https://$GITHUB_USER.github.io/maxd-dashboard/"
echo ""
echo "  GitHub Actions is building & deploying now."
echo "  Your live URL will be ready in ~2 minutes."
echo "  Watch it: https://github.com/$GITHUB_USER/maxd-dashboard/actions"
echo "=============================================="
