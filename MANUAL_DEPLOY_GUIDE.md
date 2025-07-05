# 📋 Manual Vercel Deployment Guide with Neon Database

## 🎯 Overview
This guide walks you through manually deploying your OneDrive Netflix app to Vercel using the Vercel Dashboard, with detailed Neon PostgreSQL database setup.

## 📚 Table of Contents
1. [Prepare Your Repository](#1-prepare-your-repository)
2. [Set Up Neon Database](#2-set-up-neon-database)
3. [Deploy to Vercel](#3-deploy-to-vercel)
4. [Configure Environment Variables](#4-configure-environment-variables)
5. [Update Azure Settings](#5-update-azure-settings)
6. [Test Your Deployment](#6-test-your-deployment)

---

## 1. 📁 Prepare Your Repository

### Step 1.1: Push to GitHub (Recommended)
```bash
# If not already done, initialize Git and push to GitHub
git init
git add .
git commit -m "Ready for Vercel deployment"
git branch -M main
git remote add origin https://github.com/yourusername/your-repo-name.git
git push -u origin main
```

### Step 1.2: Verify Required Files
Ensure these files exist in your repository:
- ✅ `vercel.json`
- ✅ `package.json` (root level)
- ✅ `api/index.py`
- ✅ `api/requirements.txt`
- ✅ `frontend/package.json`

---

## 2. 🗄️ Set Up Neon Database

### Step 2.1: Create Neon Account
1. **Visit**: https://neon.tech
2. **Sign Up**: Use GitHub, Google, or email
3. **Verify** your email if required

### Step 2.2: Create Database Project
1. **Click "Create Project"**
2. **Configure Project**:
   - **Project Name**: `onedrive-netflix-db`
   - **Database Name**: `onedrive_netflix`
   - **Region**: Choose closest to your users
   - **PostgreSQL Version**: Keep default (latest)

### Step 2.3: Get Database Connection String
1. **After project creation**, you'll see the dashboard
2. **Click "Connection Details"** or "Connect"
3. **Copy the connection string** that looks like:
   ```
   postgresql://username:password@ep-cool-name-123456.us-east-1.aws.neon.tech/onedrive_netflix?sslmode=require
   ```

### Step 2.4: Database Connection String Formats
Neon provides different formats. **Use the "Prisma" or "Direct" format**:

**✅ Correct Format (Use This):**
```
postgresql://username:password@ep-cool-name-123456.us-east-1.aws.neon.tech/onedrive_netflix?sslmode=require
```

**❌ Don't Use These Formats:**
- Connection pooling URLs (contains `pooler`)
- URLs without `sslmode=require`

### Step 2.5: Test Database Connection (Optional)
You can test the connection using any PostgreSQL client:
```bash
# Using psql (if installed)
psql "postgresql://username:password@ep-cool-name-123456.us-east-1.aws.neon.tech/onedrive_netflix?sslmode=require"
```

---

## 3. 🚀 Deploy to Vercel

### Step 3.1: Access Vercel Dashboard
1. **Visit**: https://vercel.com
2. **Sign in** with GitHub, GitLab, or Bitbucket
3. **Click "Add New..." → "Project"**

### Step 3.2: Import Repository
1. **Import Git Repository**:
   - If using GitHub: Select your repository
   - If not using Git: Choose "Import Third-Party Git Repository"

2. **Configure Import**:
   - **Project Name**: `onedrive-netflix` (or your preferred name)
   - **Framework Preset**: `Other`
   - **Root Directory**: `.` (leave empty - use root)

### Step 3.3: Configure Build Settings
**🚨 IMPORTANT**: Set these exact settings:

- **Build Command**: `yarn vercel-build`
- **Output Directory**: `frontend/build`
- **Install Command**: `yarn install` (leave empty to auto-detect)

### Step 3.4: Don't Deploy Yet
**Click "Environment Variables"** first - we need to set these before the first deployment.

---

## 4. 🔧 Configure Environment Variables

### Step 4.1: Add Environment Variables in Vercel
In the Vercel deployment screen, click **"Environment Variables"** and add:

#### Azure/Microsoft Graph API Variables:
```
Name: AZURE_CLIENT_ID
Value: 37fb551b-33c1-4dd0-8c16-5ead6f0f2b45
Environment: Production, Preview, Development
```

```
Name: AZURE_CLIENT_SECRET  
Value: _IW8Q~l-15ff~RpMif-PfScDyFbV9rn92Hx5Laz5
Environment: Production, Preview, Development
```

```
Name: AZURE_TENANT_ID
Value: f2c9e08f-779f-4dd6-9f7b-da627fd90983
Environment: Production, Preview, Development
```

#### Database Variable:
```
Name: DATABASE_URL
Value: postgresql://username:password@ep-cool-name-123456.us-east-1.aws.neon.tech/onedrive_netflix?sslmode=require
Environment: Production, Preview, Development
```
**⚠️ Replace with your actual Neon connection string from Step 2.3**

#### Application URL Variables:
**🚨 Important**: You'll need to update these after deployment with your actual domain.

```
Name: REDIRECT_URI
Value: https://your-app-name.vercel.app/api/auth/callback
Environment: Production, Preview, Development
```

```
Name: FRONTEND_URL
Value: https://your-app-name.vercel.app
Environment: Production, Preview, Development
```

```
Name: REACT_APP_BACKEND_URL
Value: https://your-app-name.vercel.app
Environment: Production, Preview, Development
```

### Step 4.2: Deploy
**Click "Deploy"** after setting all environment variables.

### Step 4.3: Get Your Actual Domain
1. **Wait for deployment** to complete (2-5 minutes)
2. **Get your domain** from Vercel dashboard (e.g., `onedrive-netflix-abc123.vercel.app`)
3. **Update URL environment variables** with your actual domain:
   - Go to **Project Settings → Environment Variables**
   - **Edit** the three URL variables with your real domain
   - **Redeploy** the project

---

## 5. 🔄 Update Azure Settings

### Step 5.1: Update Azure App Registration
1. **Go to**: https://portal.azure.com
2. **Navigate to**: Azure Active Directory → App registrations
3. **Find your app**: Search for your OneDrive app
4. **Click "Authentication"**

### Step 5.2: Update Redirect URIs
1. **In "Web" platform section**:
   - **Remove old URI**: `https://032a33f8-1388-410c-9398-586fd3a92898.preview.emergentagent.com/api/auth/callback`
   - **Add new URI**: `https://your-actual-vercel-domain.vercel.app/api/auth/callback`

2. **Click "Save"**

### Step 5.3: Verify Other Settings
- **Supported account types**: Should be appropriate for your use case
- **Implicit grant and hybrid flows**: Ensure ID tokens are enabled if needed
- **API permissions**: Verify `Files.ReadWrite.All` and `User.Read` are granted

---

## 6. ✅ Test Your Deployment

### Step 6.1: Access Your App
1. **Visit**: `https://your-app-name.vercel.app`
2. **Should see**: OneDrive Explorer login screen

### Step 6.2: Test Password Authentication
1. **Enter password**: `66244?BOy.`
2. **Should proceed**: To OneDrive OAuth screen

### Step 6.3: Test OneDrive OAuth
1. **Click**: "Sign in with Microsoft OneDrive"
2. **Should redirect**: To Microsoft login
3. **After login**: Should return to your app with file explorer

### Step 6.4: Test Core Features
1. **File Browsing**: Navigate through OneDrive folders
2. **Search**: Try searching for files
3. **Media Playback**: Test video, audio, and photo viewing
4. **Authentication Flow**: Logout and login again

### Step 6.5: Check Database Tables
Your database should automatically create these tables on first run:
- `users` - Store user information
- `watch_history` - Track viewing history

---

## 🔧 Troubleshooting

### Common Issues and Solutions:

#### 1. Build Failures
**Error**: "Build failed"
**Solution**: 
- Check Vercel build logs
- Ensure `yarn vercel-build` command works locally
- Verify all dependencies in `package.json`

#### 2. Database Connection Issues
**Error**: "Database connection failed"
**Solutions**:
```bash
# Verify DATABASE_URL format
postgresql://username:password@host:port/database?sslmode=require

# Check these common issues:
- Ensure sslmode=require is included
- Verify username/password are correct
- Check if Neon database is active (not paused)
- Confirm database name exists
```

#### 3. Azure OAuth Issues
**Error**: "Authentication failed" or redirect issues
**Solutions**:
- Verify REDIRECT_URI exactly matches Azure app registration
- Check AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID
- Ensure Azure app has correct permissions granted

#### 4. Environment Variables Not Working
**Error**: Variables undefined in app
**Solutions**:
- Redeploy after setting environment variables
- Check variable names are exact (case-sensitive)
- Ensure variables are set for correct environments

#### 5. Function Timeout Issues
**Error**: "Function execution timed out"
**Solutions**:
- Large file streaming might hit Vercel's 10-second limit
- Check if files are too large for serverless streaming
- Monitor function execution time in Vercel dashboard

### Getting Help:
1. **Vercel Logs**: Check function logs in Vercel dashboard
2. **Neon Dashboard**: Monitor database connections and queries
3. **Azure Portal**: Verify app registration settings
4. **Browser Console**: Check for frontend errors

---

## 🎉 Success Checklist

Once everything works, you should have:

- ✅ **App accessible** at your Vercel domain
- ✅ **Password login** working (`66244?BOy.`)
- ✅ **OneDrive OAuth** redirecting correctly
- ✅ **File explorer** showing OneDrive contents
- ✅ **Media playback** working for videos/audio/photos
- ✅ **Database** storing user data and watch history
- ✅ **Search functionality** working
- ✅ **Mobile responsiveness** functioning

## 📊 Monitoring Your App

### Vercel Dashboard:
- **Functions**: Monitor execution time and errors
- **Analytics**: Track usage and performance
- **Logs**: Real-time function logs

### Neon Dashboard:
- **Connections**: Monitor database connection usage
- **Queries**: Track database performance
- **Storage**: Monitor database size

### Azure Portal:
- **Sign-ins**: Monitor OAuth authentication usage
- **API Permissions**: Verify Graph API usage

---

## 🎯 Production Optimization Tips

1. **Custom Domain**: Add your own domain in Vercel settings
2. **Analytics**: Enable Vercel Analytics for user insights
3. **Monitoring**: Set up alerts for function errors
4. **Backup**: Export important data regularly from Neon
5. **Performance**: Monitor function execution times
6. **Security**: Regularly rotate Azure credentials if needed

**Congratulations! Your OneDrive Netflix app is now live on Vercel! 🎉**

**Your app URL**: `https://your-app-name.vercel.app`