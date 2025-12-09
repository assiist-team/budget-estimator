#!/bin/bash

# Script to ensure you're on the dev branch
# Can be run manually or added to your shell profile

current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "❌ Not in a Git repository"
    exit 1
fi

if [ "$current_branch" != "dev" ]; then
    if git show-ref --verify --quiet refs/heads/dev; then
        echo "🔄 Switching to dev branch (currently on $current_branch)..."
        git checkout dev
    else
        echo "⚠️  Dev branch doesn't exist. Creating it..."
        git checkout -b dev
        git push -u origin dev
    fi
else
    echo "✅ Already on dev branch"
fi

