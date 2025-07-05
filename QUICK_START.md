# 🚀 OneDrive Media Streaming App - Quick Start

## Fast Cloudflare Deployment

Deploy your OneDrive media streaming app to **Cloudflare** in under 10 minutes:

### 1. Create D1 Database
- Go to **Cloudflare Dashboard** → **D1**
- Create database: `onedrive-media-db`
- Run the SQL from `/app/cloudflare-d1-schema.sql`

### 2. Deploy Worker
- Go to **Workers** → **Create Worker**: `onedrive-media-api`
- Copy code from `/app/cloudflare-worker.js`
- Set environment variables (Azure credentials)
- Bind D1 database as `DB`

### 3. Deploy Frontend
- Build: `cd frontend && npm run build`
- Upload `build` folder to **Cloudflare Pages**
- Set `REACT_APP_BACKEND_URL` to your Worker URL

### 4. Update URLs
- Update Worker `FRONTEND_URL` with Pages URL
- Add Pages URL to Azure OAuth redirect URIs

## 🎯 Your App Features
- **OneDrive Authentication** - Microsoft OAuth
- **Media Streaming** - Video, audio, photos
- **File Explorer** - Browse and search OneDrive
- **Watch History** - Track viewing activity
- **Mobile Optimized** - Touch controls and responsive

## 💰 Cost: FREE
- Cloudflare Pages: Unlimited static hosting
- Workers: 100,000 requests/day
- D1 Database: 5GB storage free

## 📁 Key Files
- `cloudflare-worker.js` - Backend code
- `cloudflare-d1-schema.sql` - Database schema
- `CLOUDFLARE_DEPLOYMENT_GUIDE.md` - Detailed guide

**Full deployment guide**: See `DEPLOYMENT_GUIDE.md`