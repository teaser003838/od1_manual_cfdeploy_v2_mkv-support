# 🚀 OneDrive Media Streaming App - Deployment Guide

## Overview
Deploy your complete OneDrive media streaming application to **Cloudflare** using:
- **Cloudflare Pages** (Frontend hosting)
- **Cloudflare Workers** (Backend API)  
- **Cloudflare D1** (Database)

**Cost: FREE** - Everything runs on Cloudflare's generous free tier.

---

## 📋 Prerequisites

- Cloudflare account (free)
- Your existing Azure credentials (already configured)
- Basic understanding of Cloudflare dashboard

---

## 🎯 What You'll Deploy

### Current Features
- **🔐 OneDrive Authentication** - Microsoft OAuth integration
- **📱 Media Streaming** - Video, audio, photo viewing with seeking
- **🗂️ File Explorer** - Browse OneDrive folders and search files
- **📊 Watch History** - Track user viewing history
- **🎵 Audio Player** - Full-featured music player with controls
- **🎬 Video Player** - Enhanced video player with mobile touch support
- **📸 Photo Viewer** - Image slideshow functionality

### Architecture
- **Frontend**: React app on Cloudflare Pages
- **Backend**: FastAPI converted to Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Authentication**: Microsoft OneDrive OAuth
- **File Storage**: Microsoft OneDrive via Graph API

---

## 🚀 Step-by-Step Deployment

### Step 1: Create D1 Database

1. **Go to Cloudflare Dashboard** → **Workers & Pages** → **D1 SQL Database**
2. **Click "Create database"**
3. **Database name**: `onedrive-media-db`
4. **Click "Create"**

#### Initialize Database Schema
1. **In your D1 database**, click **"Console"**
2. **Copy this SQL** and paste it:

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    name TEXT,
    email TEXT,
    last_login TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Watch history table  
CREATE TABLE IF NOT EXISTS watch_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    name TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_user_id ON watch_history(user_id);
```

3. **Click "Execute"** to create the tables

---

### Step 2: Deploy Backend (Cloudflare Worker)

1. **Go to Cloudflare Dashboard** → **Workers & Pages** → **Workers**
2. **Click "Create application"** → **"Create Worker"**
3. **Worker name**: `onedrive-media-api`
4. **Click "Deploy"**

#### Upload Worker Code
1. **Click "Edit code"** in your worker dashboard
2. **Delete all existing code**
3. **Copy the entire content** from `/app/cloudflare-worker.js`
4. **Paste it** into the worker editor
5. **Click "Save and deploy"**

#### Configure Environment Variables
1. **In worker dashboard**, go to **"Settings"** → **"Variables"**
2. **Add these Environment Variables**:

```
AZURE_CLIENT_ID = 37fb551b-33c1-4dd0-8c16-5ead6f0f2b45
AZURE_CLIENT_SECRET = _IW8Q~l-15ff~RpMif-PfScDyFbV9rn92Hx5Laz5  
AZURE_TENANT_ID = f2c9e08f-779f-4dd6-9f7b-da627fd90983
FRONTEND_URL = https://your-pages-app.pages.dev
```

*(Note: You'll update FRONTEND_URL in Step 3)*

#### Bind D1 Database
1. **In "Settings" → "Variables"** → **"D1 Database Bindings"**
2. **Click "Add binding"**:
   - **Variable name**: `DB`
   - **D1 database**: Select `onedrive-media-db`
3. **Click "Save and deploy"**

---

### Step 3: Deploy Frontend (Cloudflare Pages)

#### Build Your React App
```bash
cd /app/frontend
npm install
npm run build
```

#### Deploy to Pages
1. **Go to Cloudflare Dashboard** → **Workers & Pages** → **Pages**
2. **Click "Create application"** → **"Upload assets"**
3. **Project name**: `onedrive-media-app`
4. **Upload the entire `build` folder** from `/app/frontend/build`
5. **Click "Deploy site"**

#### Set Frontend Environment Variables
1. **In your Pages project**, go to **"Settings"** → **"Environment variables"**
2. **Add this variable**:

```
REACT_APP_BACKEND_URL = https://your-worker-name.your-subdomain.workers.dev
```

*(Replace with your actual Worker URL from Step 2)*

---

### Step 4: Update URLs

#### Update Worker Environment
1. **Go back to your Worker dashboard**
2. **Update FRONTEND_URL** with your actual Pages URL:
```
FRONTEND_URL = https://your-pages-app.pages.dev
```
3. **Click "Save and deploy"**

#### Update Azure OAuth Redirect
1. **Go to Azure Portal** → **App registrations**
2. **Find your app** (Client ID: 37fb551b-33c1-4dd0-8c16-5ead6f0f2b45)
3. **Go to "Authentication"** → **"Platform configurations"**
4. **Add redirect URI**:
```
https://your-pages-app.pages.dev/api/auth/callback
```

---

### Step 5: Test Your Deployment

1. **Visit your Pages URL**: `https://your-pages-app.pages.dev`
2. **Click "Sign in with Microsoft OneDrive"**
3. **Complete OAuth flow**
4. **Test features**:
   - Browse OneDrive files
   - Play videos (MP4, MKV, etc.)
   - Play audio files (MP3, FLAC, etc.)
   - View photos
   - Check watch history

---

## 🔧 Troubleshooting

### Common Issues

**CORS Errors**
- Worker already includes proper CORS headers
- Check that environment variables are set correctly

**OAuth Redirect Errors**  
- Verify redirect URI in Azure portal matches your Pages URL
- Check FRONTEND_URL environment variable in Worker

**Database Connection Issues**
- Verify D1 database binding is set to variable name `DB`
- Check that database schema was properly initialized

**Build Failures**
- Ensure all dependencies are in `package.json`
- Check build logs in Pages dashboard

**Media Streaming Issues**
- Verify OneDrive authentication is working
- Check browser console for errors
- Test with different file formats

---

## 📊 URLs Summary

After deployment, you'll have:

- **Frontend**: `https://your-pages-app.pages.dev`
- **Backend API**: `https://your-worker-name.your-subdomain.workers.dev`  
- **Database**: Managed by Cloudflare D1

### Environment Variables Checklist

**Worker Variables:**
- ✅ `AZURE_CLIENT_ID`
- ✅ `AZURE_CLIENT_SECRET`
- ✅ `AZURE_TENANT_ID`
- ✅ `FRONTEND_URL`
- ✅ `DB` (D1 binding)

**Pages Variables:**
- ✅ `REACT_APP_BACKEND_URL`

**Azure OAuth:**
- ✅ Redirect URI updated with Pages URL

---

## 💰 Cost Breakdown

**100% FREE on Cloudflare:**
- **Pages**: Unlimited static hosting
- **Workers**: 100,000 requests/day
- **D1 Database**: 5GB storage, 25M reads/month

---

## 🎉 Success!

Your OneDrive media streaming app is now live with:
- ✅ Zero-cost hosting on Cloudflare
- ✅ Global edge network performance  
- ✅ Automatic HTTPS and CDN
- ✅ Scalable serverless architecture
- ✅ Full OneDrive integration maintained

**Access your app**: Your Cloudflare Pages URL

**Features working**:
- OneDrive authentication
- File browsing and search
- Video streaming (MP4, MKV, AVI, etc.)
- Audio streaming (MP3, FLAC, WAV, etc.)
- Photo viewing and slideshow
- Watch history tracking
- Mobile-optimized interface

---

## 📞 Need Help?

- **Cloudflare Docs**: [workers.cloudflare.com](https://workers.cloudflare.com)
- **D1 Database**: [developers.cloudflare.com/d1](https://developers.cloudflare.com/d1)
- **Pages Hosting**: [pages.cloudflare.com](https://pages.cloudflare.com)

Your professional OneDrive media streaming application is now deployed! 🚀