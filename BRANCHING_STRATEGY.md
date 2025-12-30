# Showly Branching & Deployment Strategy

## Overview

This document outlines the branching strategy and deployment workflow for Showly.

---

## Option A: Two-Branch Strategy (RECOMMENDED)

**Simpler, industry-standard approach**

### Branches

1. **`main`** → Production Environment
   - Protected branch
   - Deploys to: `showly.io` (or `showly.vercel.app`)
   - Firebase: `showly-production`
   - Stripe: Live mode keys
   - Only merge tested, stable code

2. **`staging`** → Staging Environment
   - Testing branch
   - Deploys to: `staging.showly.io` (or `showly-git-staging.vercel.app`)
   - Firebase: `showly-staging`
   - Stripe: Test mode keys
   - Merge features here for testing before production

3. **Feature branches** → Development
   - Created from `staging`
   - Named: `feature/name`, `fix/name`, `hotfix/name`
   - Merged back into `staging` after completion

### Workflow

```bash
# 1. Create feature branch from staging
git checkout staging
git pull origin staging
git checkout -b feature/new-feature

# 2. Work on feature
git add .
git commit -m "Add new feature"

# 3. Merge to staging for testing
git checkout staging
git merge feature/new-feature
git push origin staging
# ✅ Auto-deploys to staging environment

# 4. Test on staging site
# Visit staging.showly.io and test thoroughly

# 5. Deploy to production
git checkout main
git merge staging
git push origin main
# ✅ Auto-deploys to production (showly.io)

# 6. Clean up feature branch
git branch -d feature/new-feature
```

---

## Option B: Three-Branch Strategy

**More complex, complete separation of environments**

### Branches

1. **`main`** → Integration/Development Branch
   - Where all development work merges
   - Most active branch
   - Can be unstable at times
   - Not deployed to any public environment

2. **`staging`** → Staging Environment
   - Deploys to: `staging.showly.io`
   - Firebase: `showly-staging`
   - Stripe: Test mode keys
   - Receives tested features from `main`

3. **`production`** → Production Environment
   - Protected branch (most stable)
   - Deploys to: `showly.io`
   - Firebase: `showly-production`
   - Stripe: Live mode keys
   - Only receives thoroughly tested code from `staging`

4. **Feature branches** → Development
   - Created from `main`
   - Merged back into `main` after completion

### Workflow

```bash
# 1. Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/new-feature

# 2. Work on feature
git add .
git commit -m "Add new feature"

# 3. Merge to main
git checkout main
git merge feature/new-feature
git push origin main
# (main is not deployed anywhere - just integration)

# 4. Deploy to staging for testing
git checkout staging
git merge main
git push origin staging
# ✅ Auto-deploys to staging environment

# 5. Test on staging site
# Visit staging.showly.io and test thoroughly

# 6. Deploy to production
git checkout production
git merge staging
git push origin production
# ✅ Auto-deploys to production (showly.io)

# 7. Clean up feature branch
git branch -d feature/new-feature
```

---

## Branch Protection Rules (GitHub)

### For Both Strategies

**Protected Branches:**
- `main` (or `production` in Option B)
- `staging` (optional but recommended)

**Rules to Enable:**

1. **Require pull request reviews before merging**
   - ✅ Require 1 approval (or 0 if you're solo)
   - ✅ Dismiss stale reviews when new commits are pushed

2. **Require status checks to pass**
   - ✅ Require Vercel build to succeed
   - ✅ Require branches to be up to date before merging

3. **Require conversation resolution**
   - ✅ All conversations must be resolved

4. **Do not allow bypassing the above settings**

5. **Restrict who can push** (optional)
   - Only specific team members can push directly

### Setting Up in GitHub

1. Go to: `https://github.com/ByteThreads/Showly/settings/branches`
2. Click "Add branch protection rule"
3. Branch name pattern: `main` (or `production`)
4. Enable the checkboxes above
5. Click "Create"
6. Repeat for `staging` if desired

---

## Vercel Deployment Configuration

### Environment Variables by Branch

| Environment | Branch | Vercel Environment | Firebase Project | Stripe Keys |
|-------------|--------|-------------------|------------------|-------------|
| **Production** | `main` (or `production`) | Production | `showly-production` | Live mode |
| **Staging** | `staging` | Preview | `showly-staging` | Test mode |
| **Development** | Feature branches | Preview | `showly-staging` | Test mode |

### Vercel Settings

1. **Production Branch:**
   - Set in: Vercel Dashboard → Settings → Git
   - Production Branch: `main` (or `production` if using Option B)

2. **Preview Deployments:**
   - Enable preview deployments for all branches
   - Each branch gets a unique URL

---

## Emergency Hotfix Process

### For Critical Production Bugs

**Option A (Two-Branch):**

```bash
# 1. Create hotfix from main (production)
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# 2. Fix the bug
git add .
git commit -m "Hotfix: Fix critical bug"

# 3. Deploy to production immediately
git checkout main
git merge hotfix/critical-bug
git push origin main
# ✅ Deploys to production

# 4. Backport to staging
git checkout staging
git merge main
git push origin staging

# 5. Clean up
git branch -d hotfix/critical-bug
```

**Option B (Three-Branch):**

```bash
# 1. Create hotfix from production
git checkout production
git pull origin production
git checkout -b hotfix/critical-bug

# 2. Fix the bug
git add .
git commit -m "Hotfix: Fix critical bug"

# 3. Deploy to production immediately
git checkout production
git merge hotfix/critical-bug
git push origin production
# ✅ Deploys to production

# 4. Backport to staging and main
git checkout staging
git merge production
git push origin staging

git checkout main
git merge production
git push origin main

# 5. Clean up
git branch -d hotfix/critical-bug
```

---

## Custom Domain Setup

### Production Domain

1. **Buy Domain:** `showly.io` (if not already owned)

2. **Add to Vercel:**
   - Vercel Dashboard → Your Project → Settings → Domains
   - Click "Add"
   - Enter: `showly.io` and `www.showly.io`
   - Click "Add"

3. **Update DNS:**
   - Go to your domain registrar
   - Add these records:

   ```
   Type    Name    Value
   A       @       76.76.21.21
   CNAME   www     cname.vercel-dns.com
   ```

4. **Wait for SSL:**
   - Vercel automatically provisions SSL certificate
   - Takes 5-30 minutes

### Staging Subdomain

1. **Add to Vercel:**
   - Vercel Dashboard → Your Project → Settings → Domains
   - Click "Add"
   - Enter: `staging.showly.io`
   - Git Branch: `staging`

2. **Update DNS:**
   ```
   Type    Name       Value
   CNAME   staging    cname.vercel-dns.com
   ```

---

## Recommended Approach for Showly

**Use Option A (Two-Branch Strategy)**

**Why:**
- Simpler to manage
- Industry standard
- Sufficient for a solo developer or small team
- Easy to understand for new contributors
- Less mental overhead

**Switch to Option B only if:**
- You have a larger team
- You need complete separation of integration and staging
- You want main branch to be unstable/experimental

---

## Quick Reference

### Current Setup

**Branches:**
- ✅ `main` - exists, pushed to GitHub
- ✅ `staging` - exists, pushed to GitHub

**Recommended Next Steps:**

1. **Choose Option A (Two-Branch)**
2. **Configure Vercel:**
   - Set `main` as Production Branch
   - Set `staging` for Preview deployments
3. **Add Branch Protection** to `main`
4. **Add Custom Domains:**
   - `showly.io` → `main`
   - `staging.showly.io` → `staging`

---

## Commands Cheat Sheet

```bash
# Switch branches
git checkout main
git checkout staging

# Update branch from remote
git pull origin main
git pull origin staging

# Create feature branch
git checkout staging
git checkout -b feature/name

# Merge feature to staging
git checkout staging
git merge feature/name
git push origin staging

# Deploy to production (from staging)
git checkout main
git merge staging
git push origin main

# Check current branch
git branch

# See all branches
git branch -a

# Delete local branch
git branch -d feature/name

# Delete remote branch
git push origin --delete feature/name
```

---

## Contact

For questions about this branching strategy, contact the development team.

**Last Updated:** December 29, 2025
