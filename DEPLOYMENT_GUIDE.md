# 🚀 Vercel Deployment Guide for OneDrive Netflix App

This comprehensive guide will help you deploy your OneDrive Netflix-style application to Vercel with PostgreSQL (Neon) database integration.

## 📋 Prerequisites

Before starting deployment, ensure you have:
- A Vercel account (https://vercel.com)
- Your Azure/Microsoft Graph API credentials
- Access to your GitHub repository (optional but recommended)

## 🏗️ Architecture Overview

**Frontend**: React app deployed as static site
**Backend**: FastAPI converted to Vercel serverless functions
**Database**: PostgreSQL via Neon (Vercel integration)
**Authentication**: Azure OAuth + Password authentication
**File Storage**: Microsoft OneDrive via Graph API

## 📦 Database Migration (MongoDB → PostgreSQL)

Your original app used MongoDB, but we've converted it to PostgreSQL for better Vercel integration. The new schema includes:

### Tables Created:
- `users`: Stores user information from Azure OAuth
- `watch_history`: Tracks user media viewing history

### Key Changes:
- User data now stored in PostgreSQL instead of MongoDB
- Optimized for serverless architecture
- Better performance for Vercel deployment

## 🚀 Step 1: Prepare Your Repository

1. **Ensure your code structure matches:**
   ```
   /app/
   ├── api/                 # Backend serverless functions
   │   ├── index.py        # Main FastAPI app converted for Vercel
   │   └── requirements.txt # Python dependencies
   ├── frontend/           # React frontend
   ├── vercel.json         # Vercel configuration
   ├── package.json        # Root package.json for build
   └── .env.example        # Environment variables template
   ```

2. **Commit and push your changes to GitHub** (recommended)

## 🚀 Step 2: Set Up Neon Database

1. **Go to Vercel Dashboard** → Your Project → Integrations
2. **Search for "Neon"** and click "Add Integration"
3. **Follow the setup wizard** to create a PostgreSQL database
4. **Copy the connection string** - you'll need it for environment variables

**Alternative Manual Setup:**
1. Visit https://neon.tech
2. Create a free account
3. Create a new database
4. Copy the connection string

## 🚀 Step 3: Deploy to Vercel

### Option A: GitHub Integration (Recommended)

1. **Go to Vercel Dashboard** → "Add New" → "Project"
2. **Import your Git Repository**
3. **Configure Project Settings:**
   - Framework Preset: `Other`
   - Root Directory: `/` (leave empty)
   - Build Command: `yarn vercel-build`
   - Output Directory: `frontend/build`

### Option B: Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy from your project root:**
   ```bash
   vercel
   ```

## 🚀 Step 4: Configure Environment Variables

In your Vercel Dashboard → Project → Settings → Environment Variables, add:

### Azure/Microsoft Graph API:
```
AZURE_CLIENT_ID=37fb551b-33c1-4dd0-8c16-5ead6f0f2b45
AZURE_CLIENT_SECRET=_IW8Q~l-15ff~RpMif-PfScDyFbV9rn92Hx5Laz5
AZURE_TENANT_ID=f2c9e08f-779f-4dd6-9f7b-da627fd90983
```

### Database:
```
DATABASE_URL=postgresql://username:password@host:port/database
```
*(Use your Neon connection string)*

### Application URLs:
```
REDIRECT_URI=https://your-app-name.vercel.app/api/auth/callback
FRONTEND_URL=https://your-app-name.vercel.app
REACT_APP_BACKEND_URL=https://your-app-name.vercel.app
```
*(Replace 'your-app-name' with your actual Vercel app name)*

## 🚀 Step 5: Update Azure App Registration

1. **Go to Azure Portal** → App Registrations → Your App
2. **Update Redirect URIs:**
   - Remove: `https://073c81bb-40d2-4392-b0c7-11856ca419e1.preview.emergentagent.com/api/auth/callback`
   - Add: `https://your-app-name.vercel.app/api/auth/callback`

3. **Update CORS settings if needed**

## 🚀 Step 6: Verify Deployment

1. **Check Build Logs** in Vercel Dashboard
2. **Test the Application:**
   - Visit your Vercel URL
   - Test password authentication (password: `66244?BOy.`)
   - Test OneDrive OAuth login
   - Test file browsing and media playback

## 🔧 Troubleshooting Common Issues

### Build Failures:

**Python Dependencies Issue:**
```bash
# Check api/requirements.txt is properly formatted
# Ensure all dependencies are compatible with Vercel
```

**React Build Issue:**
```bash
# Check frontend/package.json
# Ensure all dependencies are installed
```

### Runtime Issues:

**Database Connection:**
- Verify DATABASE_URL is correct
- Check Neon database is running
- Ensure connection string includes all required parameters

**Azure OAuth Issues:**
- Verify REDIRECT_URI matches Azure app registration
- Check all Azure environment variables are set
- Ensure tenant ID and client ID are correct

**CORS Issues:**
- Check FRONTEND_URL environment variable
- Verify CORS settings in Azure if needed

### Performance Optimization:

**Serverless Function Timeout:**
- Large file streaming might hit Vercel's 10-second limit
- Consider implementing chunked streaming
- Use CDN for large media files if needed

**Cold Start Issues:**
- Database connection pooling is implemented
- Consider keeping functions warm with periodic health checks

## 📊 Monitoring and Maintenance

### Vercel Analytics:
1. Enable Vercel Analytics in your dashboard
2. Monitor function execution times
3. Track errors and performance

### Database Monitoring:
1. Monitor Neon dashboard for connection usage
2. Set up alerts for database issues
3. Regular backup verification

### Logs and Debugging:
```bash
# View Vercel function logs
vercel logs your-app-name

# Real-time logs
vercel logs your-app-name --follow
```

## 🎯 Production Checklist

- [ ] All environment variables set correctly
- [ ] Azure app registration updated with new URLs
- [ ] Database connection working
- [ ] Authentication flow working (password + OAuth)
- [ ] File browsing functional
- [ ] Media streaming working (video, audio, photos)
- [ ] Error handling working properly
- [ ] Performance monitoring enabled

## 🔒 Security Considerations

1. **Environment Variables**: All sensitive data in Vercel environment variables
2. **HTTPS**: Enforced by Vercel by default
3. **CORS**: Properly configured for your domain
4. **Database**: Neon provides built-in security features
5. **Authentication**: Multi-layer (password + OAuth)

## 🚀 Going Live

1. **Custom Domain** (Optional):
   - Add your domain in Vercel Dashboard → Domains
   - Update environment variables with your custom domain
   - Update Azure app registration

2. **Performance Monitoring**:
   - Set up Vercel Analytics
   - Monitor function performance
   - Track user usage patterns

3. **Backup Strategy**:
   - Neon handles automated backups
   - Export important data regularly
   - Document recovery procedures

## 📞 Support and Resources

### Vercel Resources:
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Python Functions](https://vercel.com/docs/functions/serverless-functions/runtimes/python)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

### Neon Resources:
- [Neon Documentation](https://neon.tech/docs)
- [PostgreSQL Migration Guide](https://neon.tech/docs/migration/migrate-from-postgres)

### Azure Resources:
- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/)
- [Azure App Registration](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)

## 🎉 Congratulations!

Your OneDrive Netflix app is now deployed on Vercel with:
- ✅ Production-ready serverless architecture
- ✅ PostgreSQL database with automatic scaling
- ✅ Optimized for performance and reliability
- ✅ Professional deployment with monitoring

Your app is now accessible at: `https://your-app-name.vercel.app`

---

**Need Help?** Check the troubleshooting section above or refer to the Vercel documentation for additional support.