#!/bin/bash

# Script to merge dev branch into main
# Usage: ./scripts/merge-to-main.sh

set -e

echo "🔄 Merging dev into main..."

# Ensure we're on dev branch
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "dev" ]; then
    echo "⚠️  Warning: You're not on the dev branch. Current branch: $current_branch"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  You have uncommitted changes. Please commit or stash them first."
    exit 1
fi

# Fetch latest changes
echo "📥 Fetching latest changes..."
git fetch origin

# Switch to main
echo "🔀 Switching to main branch..."
git checkout main

# Pull latest main
echo "⬇️  Pulling latest main..."
git pull origin main

# Merge dev into main
echo "🔀 Merging dev into main..."
git merge dev --no-ff -m "Merge dev into main"

# Push to remote
echo "⬆️  Pushing to origin/main..."
git push origin main

# Switch back to dev
echo "🔀 Switching back to dev branch..."
git checkout dev

echo "✅ Successfully merged dev into main!"
echo ""
echo "📝 Next steps:"
echo "   - Your changes are now in main"
echo "   - You're back on the dev branch for continued development"

