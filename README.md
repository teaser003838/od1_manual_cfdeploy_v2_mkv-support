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



### 🏗️ Architecture

- **Frontend**: React with Tailwind CSS
- **Backend**: Cloudflare Workers (originally FastAPI)
- **Database**: Cloudflare D1 (SQLite)
- **Authentication**: Microsoft OneDrive OAuth
- **Storage**: Microsoft OneDrive via Graph API
- **Hosting**: Cloudflare Pages + Workers



### 🔧 Local Development

```bash
# Frontend
cd frontend
npm install
npm start

# Backend (original FastAPI version)
cd backend
pip install -r requirements.txt
python server.py
```

### 📞 Support

- **Deployment**: See `DEPLOYMENT_GUIDE.md`
- **Issues**: Check Cloudflare dashboard logs
- **Features**: All major streaming features included

**Your personal OneDrive media streaming platform - deploy it for free!** 🚀