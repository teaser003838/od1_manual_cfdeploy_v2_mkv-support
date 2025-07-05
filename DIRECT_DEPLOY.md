# 🚀 DIRECT VERCEL DEPLOYMENT - NO GIT NEEDED

## Skip All Git Issues - Deploy Directly

### Option 1: Vercel CLI (Fastest - No Git Required)

1. **Install Vercel CLI**:
```bash
npm i -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Deploy directly from this folder**:
```bash
cd /app
vercel --prod
```

4. **Follow prompts**:
   - Project name: `onedrive-netflix`
   - Framework: `Other`
   - Build command: `yarn vercel-build`
   - Output directory: `frontend/build`

### Option 2: Upload ZIP to Vercel

1. **Create ZIP of this project**:
```bash
cd /app
zip -r onedrive-netflix.zip . -x "node_modules/*" "backend/*" "*.git*" "*.log"
```

2. **Go to Vercel Dashboard**: https://vercel.com/new
3. **Click "Browse" and upload the ZIP file**
4. **Set build settings**:
   - Build command: `yarn vercel-build`
   - Output directory: `frontend/build`

## 🔧 Required Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

```
AZURE_CLIENT_ID=37fb551b-33c1-4dd0-8c16-5ead6f0f2b45
AZURE_CLIENT_SECRET=_IW8Q~l-15ff~RpMif-PfScDyFbV9rn92Hx5Laz5
AZURE_TENANT_ID=f2c9e08f-779f-4dd6-9f7b-da627fd90983
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
REDIRECT_URI=https://your-app.vercel.app/api/auth/callback
FRONTEND_URL=https://your-app.vercel.app
REACT_APP_BACKEND_URL=https://your-app.vercel.app
```

## 🗄️ Database Setup (2 minutes)

1. **Go to**: https://neon.tech
2. **Sign up** and create project
3. **Copy connection string** that looks like:
```
postgresql://username:password@ep-something-123456.us-east-1.aws.neon.tech/onedrive_netflix?sslmode=require
```
4. **Use this as your DATABASE_URL**

## ✅ That's It!

No git, no commits, no author issues. Just direct deployment.

**Your app will be live at**: `https://your-app-name.vercel.app`
**Password**: `66244?BOy.`