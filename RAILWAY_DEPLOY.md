# 🚀 Railway Deployment Guide for OneDrive Explorer

## 📋 Quick Deploy Steps

### 1. Connect to Railway
1. Visit [railway.app](https://railway.app)
2. Sign up/login with GitHub
3. Click "Start a New Project"
4. Select "Deploy from GitHub repo"
5. Choose this repository

### 2. Configure Services

Railway will automatically detect:
- ✅ **Backend**: Python (FastAPI)
- ✅ **Frontend**: Node.js (React)
- ✅ **Database**: MongoDB (add separately)

### 3. Required Environment Variables

Set these in Railway's environment variables section:

#### Backend Service:
```bash
# MongoDB (Railway will provide this)
MONGO_URL=mongodb://your-railway-mongo-url

# Azure OAuth (use your existing values)
AZURE_CLIENT_ID=37fb551b-33c1-4dd0-8c16-5ead6f0f2b45
AZURE_CLIENT_SECRET=_IW8Q~l-15ff~RpMif-PfScDyFbV9rn92Hx5Laz5
AZURE_TENANT_ID=f2c9e08f-779f-4dd6-9f7b-da627fd90983

# URLs (Railway will provide the domain)
REDIRECT_URI=https://your-app.railway.app/api/auth/callback
FRONTEND_URL=https://your-app.railway.app

# Database name
DB_NAME=onedrive_explorer
```

#### Frontend Service:
```bash
# Backend URL (Railway will provide this)
REACT_APP_BACKEND_URL=https://your-app.railway.app
```

### 4. Add MongoDB Database
1. In Railway dashboard, click "Add Service"
2. Select "Database" → "MongoDB"
3. Railway will automatically set MONGO_URL

### 5. Deploy
- Railway auto-deploys on every Git push
- First deployment takes ~5-10 minutes
- You'll get a `*.railway.app` domain

## 🔧 Project Structure (Railway-Ready)

```
/app/
├── Dockerfile              # Railway deployment config
├── Procfile                # Service startup command
├── railway.json            # Railway configuration
├── requirements.txt        # Python dependencies (root)
├── package.json           # Node.js configuration (root)
├── start.sh               # Startup script
├── .railwayignore         # Files to exclude
├── backend/               # FastAPI backend
│   ├── server.py          # Updated for dynamic port
│   └── requirements.txt   # Backend dependencies
└── frontend/              # React frontend
    ├── package.json       # Frontend dependencies
    └── build/             # Built static files
```

## 🚀 Features

✅ **Full-Stack Support**: Backend + Frontend in one project
✅ **Database Included**: MongoDB automatically configured
✅ **Auto-Scaling**: Handles traffic spikes
✅ **Environment Variables**: Seamless configuration
✅ **Custom Domains**: Add your own domain
✅ **SSL/HTTPS**: Automatic SSL certificates
✅ **Git Integration**: Auto-deploy on push

## 💰 Cost

- **Free Tier**: $5/month credit (covers most development)
- **Usage-Based**: Only pay for what you use
- **No Build Time Limits**: Unlike Vercel

## 🔄 Migration Benefits

**From Vercel to Railway:**
- ❌ No more build configuration issues
- ❌ No more framework detection problems
- ❌ No more serverless function limitations
- ✅ Full backend support
- ✅ Real databases
- ✅ Persistent storage
- ✅ WebSocket support

## 📞 Support

Railway has excellent documentation and community support:
- [Railway Docs](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Railway Examples](https://github.com/railwayapp/examples)