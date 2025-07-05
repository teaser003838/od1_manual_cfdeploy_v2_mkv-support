# 🚀 OneDrive Media Streaming App

## Complete OneDrive Media Platform

A full-featured media streaming application that connects to your OneDrive account, allowing you to browse, stream, and enjoy your personal media collection from anywhere.

### ✨ Features

- **🔐 OneDrive Authentication** - Secure Microsoft OAuth integration
- **📱 Media Streaming** - Stream videos, audio, and view photos
- **🗂️ File Explorer** - Browse OneDrive folders with breadcrumb navigation
- **🔍 Smart Search** - Find files across your entire OneDrive
- **🎬 Enhanced Video Player** - Supports MP4, MKV, AVI, WebM with seeking
- **🎵 Professional Audio Player** - Full music player with controls for MP3, FLAC, WAV, M4A
- **📸 Photo Slideshow** - Beautiful image viewer for your photos
- **📊 Watch History** - Track your viewing activity
- **📱 Mobile Optimized** - Touch controls and responsive design

### 🚀 Deployment

Deploy to **Cloudflare** for FREE:

1. **Read**: `DEPLOYMENT_GUIDE.md` for complete instructions
2. **Quick Start**: `QUICK_START.md` for fast deployment
3. **Files**: All deployment files included

**Cost**: $0 - Everything runs on Cloudflare's free tier

### 📁 Key Files

- `cloudflare-worker.js` - Backend API code
- `cloudflare-d1-schema.sql` - Database schema
- `frontend/` - React application
- `DEPLOYMENT_GUIDE.md` - Complete deployment guide

## 📋 Environment Variables Required

```env
# Azure/Microsoft Graph API
AZURE_CLIENT_ID=your_client_id_here
AZURE_CLIENT_SECRET=your_client_secret_here
AZURE_TENANT_ID=your_tenant_id_here

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://username:password@host:port/database

# Application URLs (auto-set by Vercel)
REDIRECT_URI=https://your-app.vercel.app/api/auth/callback
FRONTEND_URL=https://your-app.vercel.app
REACT_APP_BACKEND_URL=https://your-app.vercel.app
```

### 🏗️ Architecture

- **Frontend**: React with Tailwind CSS
- **Backend**: Cloudflare Workers (originally FastAPI)
- **Database**: Cloudflare D1 (SQLite)
- **Authentication**: Microsoft OneDrive OAuth
- **Storage**: Microsoft OneDrive via Graph API
- **Hosting**: Cloudflare Pages + Workers

## 📚 Documentation

- **[🚀 QUICK_START.md](QUICK_START.md)** - Deploy in 5 minutes
- **[📖 DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Complete deployment guide
- **[🔄 ARCHITECTURE_CHANGES.md](ARCHITECTURE_CHANGES.md)** - Technical changes for Vercel

## 🔧 Local Development

```bash
# Frontend
cd frontend
yarn install
yarn start

# Backend (original)
cd backend
pip install -r requirements.txt
uvicorn server:app --reload
```

## 🎯 Production Features

- ✅ **Auto-scaling**: Serverless functions scale automatically
- ✅ **Global CDN**: Vercel Edge Network for worldwide performance
- ✅ **Database**: PostgreSQL with connection pooling
- ✅ **Security**: HTTPS, environment isolation, secure secrets
- ✅ **Monitoring**: Built-in logging and analytics
- ✅ **Cost Efficient**: Pay only for usage

## 🔒 Security

- 🔐 Multi-layer authentication (Password + OAuth)
- 🛡️ All secrets in environment variables
- 🌐 HTTPS enforced by default
- 🔄 Secure database connections
- 🚫 No hardcoded credentials

### 🎯 Supported Media Formats

**Video**: MP4, MKV, AVI, WebM, MOV, WMV, FLV, M4V, 3GP, OGV
**Audio**: MP3, WAV, FLAC, M4A, OGG, AAC, WMA, OPUS, AIFF, ALAC
**Photos**: JPG, PNG, GIF, WebP, BMP, TIFF, SVG

## 🎮 Controls

### Video Player
- **Space/K**: Play/Pause
- **←/→**: Seek backward/forward
- **↑/↓**: Volume control
- **F**: Fullscreen
- **M**: Mute/Unmute
- **Touch**: Tap zones for mobile

### Audio Player
- **Space**: Play/Pause
- **←/→**: Skip 10s
- **R**: Repeat mode
- **S**: Shuffle

## 🆘 Support

### Troubleshooting
1. Check environment variables in Vercel Dashboard
2. Verify Azure app registration redirect URIs
3. Test database connection
4. Check Vercel function logs

### Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/)
- [Neon Database](https://neon.tech/docs)

## 📄 License

MIT License - feel free to use for personal or commercial projects.

## 🎉 Success!

Once deployed, your app will be available at:
`https://your-app-name.vercel.app`

**Default password**: `66244?BOy.`

---

**Made with ❤️ for seamless OneDrive media streaming**