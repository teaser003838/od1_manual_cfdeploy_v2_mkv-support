# 🚀 OneDrive Media Streaming App - Cloudflare Deployment

## Deploy to Cloudflare in 3 Steps

### Step 1: Database (2 minutes)
1. **Cloudflare Dashboard** → **D1** → **Create database**: `onedrive-media-db`
2. **Console** → Execute SQL from `/app/cloudflare-d1-schema.sql`

### Step 2: Backend (3 minutes)  
1. **Workers** → **Create Worker**: `onedrive-media-api`
2. **Copy code** from `/app/cloudflare-worker.js`
3. **Set environment variables**:
   ```
   AZURE_CLIENT_ID=37fb551b-33c1-4dd0-8c16-5ead6f0f2b45
   AZURE_CLIENT_SECRET=_IW8Q~l-15ff~RpMif-PfScDyFbV9rn92Hx5Laz5
   AZURE_TENANT_ID=f2c9e08f-779f-4dd6-9f7b-da627fd90983
   FRONTEND_URL=https://your-pages-app.pages.dev
   ```
4. **Bind D1 database** as `DB`

### Step 3: Frontend (3 minutes)
1. **Build**: `cd frontend && npm run build`  
2. **Pages** → **Upload** `build` folder → Name: `onedrive-media-app`
3. **Set environment**: `REACT_APP_BACKEND_URL=https://your-worker.workers.dev`

### Final: Update URLs (1 minute)
1. **Update Worker** `FRONTEND_URL` with actual Pages URL
2. **Azure Portal** → Add Pages URL to OAuth redirects

## ✅ Your App Features
- OneDrive file browsing and search
- Video streaming (MP4, MKV, AVI, WebM, etc.)
- Audio streaming (MP3, FLAC, WAV, M4A, etc.) 
- Photo viewing and slideshow
- Watch history tracking
- Mobile-optimized interface

## 💰 100% FREE on Cloudflare
- Pages: Unlimited static hosting
- Workers: 100,000 requests/day
- D1: 5GB storage, 25M reads/month

**Detailed guide**: `DEPLOYMENT_GUIDE.md`