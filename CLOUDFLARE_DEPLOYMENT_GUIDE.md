# Cloudflare Deployment Guide

## Overview
This guide will help you deploy your OneDrive media streaming application to Cloudflare using:
- **Cloudflare Pages** for the React frontend
- **Cloudflare Workers** for the API backend
- **Cloudflare D1** for the database

## Prerequisites
- Cloudflare account (free tier is sufficient)
- Your existing Azure credentials for OneDrive integration

## Step 1: Create D1 Database

1. Go to **Cloudflare Dashboard** → **Workers & Pages** → **D1**
2. Click **"Create database"**
3. Name your database: `onedrive-media-db`
4. Click **"Create"**

### Initialize Database Schema
1. In your D1 database dashboard, click **"Console"**
2. Copy and paste the SQL from `cloudflare-d1-schema.sql`
3. Click **"Execute"** to create the tables

## Step 2: Deploy Backend (Cloudflare Workers)

1. Go to **Cloudflare Dashboard** → **Workers & Pages** → **Workers**
2. Click **"Create application"** → **"Create Worker"**
3. Name your worker: `onedrive-media-api`
4. Click **"Deploy"**

### Configure Worker Code
1. Click **"Edit code"** in your worker dashboard
2. Replace the default code with the content from `cloudflare-worker.js`
3. Click **"Save and deploy"**

### Set Environment Variables
1. In your worker dashboard, go to **"Settings"** → **"Variables"**
2. Add these **Environment Variables**:
   ```
   AZURE_CLIENT_ID=37fb551b-33c1-4dd0-8c16-5ead6f0f2b45
   AZURE_CLIENT_SECRET=_IW8Q~l-15ff~RpMif-PfScDyFbV9rn92Hx5Laz5
   AZURE_TENANT_ID=f2c9e08f-779f-4dd6-9f7b-da627fd90983
   FRONTEND_URL=https://your-pages-app.pages.dev
   ```
   (Replace `your-pages-app.pages.dev` with your actual Pages URL from Step 3)

### Bind D1 Database
1. In **"Settings"** → **"Variables"** → **"D1 Database Bindings"**
2. Add binding:
   - **Variable name**: `DB`
   - **D1 database**: Select `onedrive-media-db`
3. Click **"Save"**

## Step 3: Deploy Frontend (Cloudflare Pages)

### Option A: Direct Upload
1. Go to **Cloudflare Dashboard** → **Workers & Pages** → **Pages**
2. Click **"Create application"** → **"Upload assets"**
3. Build your React app locally:
   ```bash
   cd /app/frontend
   npm run build
   ```
4. Upload the entire `build` folder
5. Name your project: `onedrive-media-app`
6. Click **"Deploy site"**

### Option B: Git Integration (Recommended)
1. Push your code to GitHub/GitLab
2. Go to **Cloudflare Dashboard** → **Workers & Pages** → **Pages**
3. Click **"Connect to Git"**
4. Select your repository
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `build`
   - **Root directory**: `frontend`

### Set Frontend Environment Variables
1. In your Pages project dashboard, go to **"Settings"** → **"Environment variables"**
2. Add these variables:
   ```
   REACT_APP_BACKEND_URL=https://your-worker-name.your-subdomain.workers.dev
   ```
   (Replace with your actual Worker URL from Step 2)

## Step 4: Update OAuth Redirect URLs

### Update Azure App Registration
1. Go to **Azure Portal** → **App registrations**
2. Find your app registration (Client ID: 37fb551b-33c1-4dd0-8c16-5ead6f0f2b45)
3. Go to **"Authentication"** → **"Platform configurations"**
4. Update redirect URIs:
   - Add: `https://your-pages-app.pages.dev/api/auth/callback`
   - Add: `https://your-worker-name.your-subdomain.workers.dev/api/auth/callback`

### Update Worker Environment Variables
1. Go back to your Worker dashboard
2. Update the **FRONTEND_URL** variable with your actual Pages URL
3. Click **"Save and deploy"**

## Step 5: Test Your Deployment

1. Visit your Pages URL: `https://your-pages-app.pages.dev`
2. Click **"Sign in with Microsoft OneDrive"**
3. Complete the OAuth flow
4. Test file browsing and media streaming

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Make sure your Worker includes proper CORS headers (already included in the code)

2. **OAuth Redirect Errors**: 
   - Verify redirect URIs in Azure portal match your deployed URLs
   - Check FRONTEND_URL environment variable in Worker

3. **Database Connection Issues**:
   - Verify D1 database binding is correctly set to `DB`
   - Check that database schema was properly initialized

4. **Build Failures**:
   - Ensure all dependencies are listed in `package.json`
   - Check build logs in Pages dashboard

### Environment Variables Summary:

**Worker Environment Variables:**
- `AZURE_CLIENT_ID`: Your Azure app client ID
- `AZURE_CLIENT_SECRET`: Your Azure app client secret  
- `AZURE_TENANT_ID`: Your Azure tenant ID
- `FRONTEND_URL`: Your Cloudflare Pages URL

**Pages Environment Variables:**
- `REACT_APP_BACKEND_URL`: Your Cloudflare Worker URL

**D1 Database Binding:**
- Variable name: `DB`
- Database: `onedrive-media-db`

## Notes:
- Both services will be available on Cloudflare's free tier
- D1 database includes generous free limits
- Worker includes 100,000 free requests per day
- Pages includes unlimited static requests

Your application will be accessible at your Cloudflare Pages URL with full OneDrive integration and media streaming capabilities!