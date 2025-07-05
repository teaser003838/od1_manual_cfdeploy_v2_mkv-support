# Deployment Configuration Guide

## Making Your App Independent from Emergent

This guide will help you configure your application to work with your own domain instead of the Emergent platform.

## Quick Setup for Cloudflare Deployment

### 1. Update Environment Variables

After deploying to Cloudflare, update these environment variables:

#### Frontend (.env in /frontend folder):
```
REACT_APP_BACKEND_URL=https://your-worker-name.your-subdomain.workers.dev
WDS_SOCKET_PORT=443
```

#### Backend (.env in /backend folder - only needed for local development):
```
MONGO_URL=mongodb://localhost:27017
AZURE_CLIENT_ID=37fb551b-33c1-4dd0-8c16-5ead6f0f2b45
AZURE_CLIENT_SECRET=_IW8Q~l-15ff~RpMif-PfScDyFbV9rn92Hx5Laz5
AZURE_TENANT_ID=f2c9e08f-779f-4dd6-9f7b-da627fd90983
DB_NAME="test_database"
REDIRECT_URI=https://your-pages-app.pages.dev/api/auth/callback
FRONTEND_URL=https://your-pages-app.pages.dev
```

### 2. Cloudflare Pages Environment Variables

In your Cloudflare Pages dashboard, set:
```
REACT_APP_BACKEND_URL=https://your-worker-name.your-subdomain.workers.dev
```

### 3. Cloudflare Worker Environment Variables

In your Cloudflare Worker dashboard, set:
```
AZURE_CLIENT_ID=37fb551b-33c1-4dd0-8c16-5ead6f0f2b45
AZURE_CLIENT_SECRET=_IW8Q~l-15ff~RpMif-PfScDyFbV9rn92Hx5Laz5
AZURE_TENANT_ID=f2c9e08f-779f-4dd6-9f7b-da627fd90983
FRONTEND_URL=https://your-pages-app.pages.dev
```

### 4. Update Azure OAuth Redirect URLs

1. Go to Azure Portal → App registrations
2. Find your app (Client ID: 37fb551b-33c1-4dd0-8c16-5ead6f0f2b45)
3. Go to Authentication → Platform configurations
4. Update redirect URIs to:
   - `https://your-pages-app.pages.dev/api/auth/callback`
   - `https://your-worker-name.your-subdomain.workers.dev/api/auth/callback`

### 5. Replace Placeholder URLs

Replace these placeholder URLs with your actual Cloudflare URLs:

- `your-worker-name.your-subdomain.workers.dev` → Your Cloudflare Worker URL
- `your-pages-app.pages.dev` → Your Cloudflare Pages URL

## Example Configuration

If your deployments are:
- Worker: `https://onedrive-api.myusername.workers.dev`
- Pages: `https://onedrive-app.pages.dev`

Then your configuration would be:

**Frontend (.env):**
```
REACT_APP_BACKEND_URL=https://onedrive-api.myusername.workers.dev
WDS_SOCKET_PORT=443
```

**Cloudflare Pages Environment Variables:**
```
REACT_APP_BACKEND_URL=https://onedrive-api.myusername.workers.dev
```

**Cloudflare Worker Environment Variables:**
```
AZURE_CLIENT_ID=37fb551b-33c1-4dd0-8c16-5ead6f0f2b45
AZURE_CLIENT_SECRET=_IW8Q~l-15ff~RpMif-PfScDyFbV9rn92Hx5Laz5
AZURE_TENANT_ID=f2c9e08f-779f-4dd6-9f7b-da627fd90983
FRONTEND_URL=https://onedrive-app.pages.dev
```

**Azure OAuth Redirect URLs:**
- `https://onedrive-app.pages.dev/api/auth/callback`
- `https://onedrive-api.myusername.workers.dev/api/auth/callback`

## Troubleshooting OAuth Issues

If OAuth still redirects to emergent:

1. **Check Azure App Registration**: Ensure redirect URIs are updated to your domain
2. **Clear Browser Cache**: OAuth URLs might be cached
3. **Verify Environment Variables**: Make sure FRONTEND_URL in Worker matches your Pages URL
4. **Check Worker Logs**: Look for OAuth redirect issues in Cloudflare Worker logs

## Testing Your Independent Deployment

1. Visit your Cloudflare Pages URL
2. Click "Sign in with Microsoft OneDrive"
3. Verify it redirects to Microsoft OAuth (not emergent)
4. After authentication, verify you're redirected back to your domain
5. Test file browsing and video streaming functionality

Your application should now be completely independent from the Emergent platform!