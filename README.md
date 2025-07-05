# 🎬 OneDrive Netflix - Vercel Deployment Ready

A sophisticated OneDrive file explorer and media player with Netflix-style interface, now optimized for Vercel deployment.

## ✨ Features

- 🔐 **Dual Authentication**: Password + Microsoft OAuth
- 📁 **File Explorer**: Browse OneDrive with search and filtering
- 🎬 **Video Player**: Advanced video player with touch/keyboard controls
- 🎵 **Audio Player**: Professional music player interface
- 🖼️ **Photo Viewer**: Slideshow with zoom and navigation
- 📱 **Mobile Optimized**: Touch gestures and responsive design
- ⚡ **Serverless**: Optimized for Vercel's serverless architecture

## 🚀 Quick Deploy to Vercel

### Option 1: One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/your-repo)

### Option 2: CLI Deploy
```bash
# Make script executable and run
chmod +x deploy-vercel.sh
./deploy-vercel.sh
```

### Option 3: Manual Deploy
1. Push code to GitHub
2. Import to Vercel
3. Set environment variables
4. Deploy

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

## 🏗️ Architecture

- **Frontend**: React + TailwindCSS (Static Site)
- **Backend**: FastAPI (Serverless Functions)
- **Database**: PostgreSQL via Neon
- **Authentication**: Azure OAuth + Password
- **Storage**: Microsoft OneDrive via Graph API

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

## 📱 Supported Media Formats

### Video
- MP4, MKV, AVI, WebM, MOV, WMV, FLV, M4V

### Audio  
- MP3, WAV, FLAC, M4A, OGG, AAC, WMA, OPUS

### Images
- JPG, PNG, GIF, WebP, BMP, TIFF, SVG

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