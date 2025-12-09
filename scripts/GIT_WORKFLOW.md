# Git Workflow Guide

## Branch Strategy

- **`main`**: Production-ready code
- **`dev`**: Development branch (default working branch)

## Making Dev Your Default Branch

### Option 1: Change Default Branch on GitHub (Recommended)

This makes `dev` the default branch for everyone and ensures new clones check out `dev`:

1. Go to your repository on GitHub: `https://github.com/assiist-team/budget-estimator`
2. Click **Settings** → **Branches**
3. Under "Default branch", click the switch/edit icon
4. Select `dev` from the dropdown
5. Click **Update** and confirm

After this, new clones will automatically check out `dev`.

### Option 2: Quick Switch Script

Run this anytime to ensure you're on `dev`:
```bash
./scripts/ensure-dev-branch.sh
```

### Option 3: Git Alias (Add to your shell profile)

Add this to your `~/.zshrc` or `~/.bashrc`:
```bash
alias godev='git checkout dev 2>/dev/null || git checkout -b dev && git push -u origin dev'
```

Then just run `godev` anytime to switch to dev.

## Daily Workflow

### Starting Work
```bash
# Make sure you're on dev branch (default)
git checkout dev

# Pull latest changes
git pull origin dev
```

### Making Changes
1. Create feature branches from `dev` if working on larger features:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Or work directly on `dev` for smaller changes:
   ```bash
   git checkout dev
   # Make your changes
   git add .
   git commit -m "Your commit message"
   git push origin dev
   ```

### Merging to Main

When you're ready to merge `dev` into `main`:

**Option 1: Using the merge script (recommended)**
```bash
./scripts/merge-to-main.sh
```

**Option 2: Manual merge**
```bash
# Make sure dev is up to date and committed
git checkout dev
git pull origin dev

# Switch to main
git checkout main
git pull origin main

# Merge dev into main
git merge dev --no-ff -m "Merge dev into main"

# Push to remote
git push origin main

# Switch back to dev
git checkout dev
```

## Best Practices

1. **Always work on `dev` by default** - Only merge to `main` when code is stable and tested
2. **Keep `dev` up to date** - Regularly pull and push to `dev`
3. **Commit often** - Small, frequent commits are better than large ones
4. **Write clear commit messages** - Describe what and why, not just what
5. **Test before merging** - Make sure your changes work before merging to `main`

## Current Branch Status

To check which branch you're on:
```bash
git branch
```

The current branch will be marked with an asterisk (*).

