# Deployment Configuration Guide

## Your Current Configuration

This guide shows your current configuration for independent deployment.

## Your Deployment URLs

- **Cloudflare Pages**: `https://onedrive-media-app.pages.dev`
- **Cloudflare Worker**: `https://onedrive-media-api.hul1hu.workers.dev`

## Required Environment Variables

### Cloudflare Pages Environment Variables

Set these in your Cloudflare Pages dashboard:
```
REACT_APP_BACKEND_URL=https://onedrive-media-api.hul1hu.workers.dev
```

### Cloudflare Worker Environment Variables

Set these in your Cloudflare Worker dashboard:
```
AZURE_CLIENT_ID=37fb551b-33c1-4dd0-8c16-5ead6f0f2b45
AZURE_CLIENT_SECRET=_IW8Q~l-15ff~RpMif-PfScDyFbV9rn92Hx5Laz5
AZURE_TENANT_ID=f2c9e08f-779f-4dd6-9f7b-da627fd90983
FRONTEND_URL=https://onedrive-media-app.pages.dev
REDIRECT_URI=https://onedrive-media-api.hul1hu.workers.dev/api/auth/callback
```

## Azure OAuth Configuration

In your Azure Portal → App registrations → Authentication:

**Required Redirect URIs:**
- `https://onedrive-media-api.hul1hu.workers.dev/api/auth/callback`

**CRITICAL**: Make sure the redirect URI points to your **Worker URL**, not your Pages URL!

## OAuth Flow Explanation

The correct OAuth flow should be:
1. User clicks login → Frontend calls Worker `/api/auth/login`
2. Worker generates Microsoft auth URL and returns it
3. User is redirected to Microsoft
4. Microsoft redirects to Worker `/api/auth/callback`
5. Worker handles callback and redirects to Pages with access token

## Troubleshooting

If you're getting a white page at the callback URL, it means:
1. The OAuth redirect URI is pointing to Pages instead of Worker
2. Check your Azure App Registration redirect URIs
3. Ensure Cloudflare Worker environment variables are set correctly

## Testing Your Deployment

1. Visit `https://onedrive-media-app.pages.dev`
2. Click "Sign in with Microsoft OneDrive"
3. You should be redirected to Microsoft OAuth
4. After authentication, you should return to your Pages URL with the file explorer loaded

Your application is now completely independent from the Emergent platform!