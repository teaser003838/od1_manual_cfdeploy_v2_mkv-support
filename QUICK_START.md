# ⚡ Quick Start Guide - Vercel Deployment

## 🚀 Deploy in 5 Minutes

### Prerequisites
- Vercel account
- Your Azure API credentials

### Option 1: One-Click Deploy (Fastest)

1. **Click Deploy Button** (will be generated after pushing to GitHub):
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=YOUR_GITHUB_REPO_URL)

2. **Set Environment Variables** during deployment:
   ```
   AZURE_CLIENT_ID=37fb551b-33c1-4dd0-8c16-5ead6f0f2b45
   AZURE_CLIENT_SECRET=_IW8Q~l-15ff~RpMif-PfScDyFbV9rn92Hx5Laz5
   AZURE_TENANT_ID=f2c9e08f-779f-4dd6-9f7b-da627fd90983
   ```

3. **Add Neon Database**: Enable Neon integration during setup

### Option 2: CLI Deploy

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Run deployment script**:
   ```bash
   chmod +x deploy-vercel.sh
   ./deploy-vercel.sh
   ```

3. **Follow prompts** and set environment variables

### Option 3: Manual Deploy

📋 **[Complete Manual Deploy Guide](MANUAL_DEPLOY_GUIDE.md)**
🗄️ **[Neon Database Setup Guide](NEON_DATABASE_GUIDE.md)**

1. **Push to GitHub**
2. **Set up Neon Database** → Get DATABASE_URL
3. **Import in Vercel**: vercel.com/new
4. **Add environment variables**
5. **Deploy and test**

## 🔧 Environment Variables (Required)

### Azure/Microsoft:
```env
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret  
AZURE_TENANT_ID=your_tenant_id
```

### Database (Auto-set with Neon integration):
```env
DATABASE_URL=postgresql://username:password@host:port/database
```

### URLs (Auto-set by Vercel):
```env
REDIRECT_URI=https://your-app.vercel.app/api/auth/callback
FRONTEND_URL=https://your-app.vercel.app
REACT_APP_BACKEND_URL=https://your-app.vercel.app
```

## ✅ Post-Deployment Checklist

1. **Test App**: Visit your Vercel URL
2. **Update Azure**: Add new redirect URI in Azure portal
3. **Test Auth**: Try password login (66244?BOy.) and OAuth
4. **Test Features**: Browse files, play media

## 🆘 Need Help?

- **Full Guide**: See `DEPLOYMENT_GUIDE.md`
- **Architecture**: See `ARCHITECTURE_CHANGES.md`
- **Issues**: Check Vercel dashboard logs

## 🎉 Success!

Your app should now be live at: `https://your-app-name.vercel.app`

**Test login**: Password is `66244?BOy.`