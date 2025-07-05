# Quick Setup Commands

## For Local Testing (Before Deployment)

### Build Frontend
```bash
cd frontend
npm install
npm run build
```

### Test Build Locally
```bash
# Install serve globally if you haven't
npm install -g serve

# Serve the build directory
serve -s build -l 3000
```

## Cloudflare Deployment URLs

After deployment, your URLs will be:
- **Frontend**: `https://your-pages-app.pages.dev`
- **Backend**: `https://your-worker-name.your-subdomain.workers.dev`

## Update These URLs in Your Configuration

1. **Update Worker Environment Variables**:
   ```
   FRONTEND_URL=https://your-pages-app.pages.dev
   ```

2. **Update Pages Environment Variables**:
   ```
   REACT_APP_BACKEND_URL=https://your-worker-name.your-subdomain.workers.dev
   ```

3. **Update Azure OAuth Redirect URIs**:
   - `https://your-pages-app.pages.dev/api/auth/callback`
   - `https://your-worker-name.your-subdomain.workers.dev/api/auth/callback`

## Testing Checklist

After deployment, test these features:
- [ ] Homepage loads correctly
- [ ] OneDrive login works
- [ ] File browsing works
- [ ] Video streaming works
- [ ] Audio streaming works
- [ ] Photo viewing works
- [ ] Search functionality works
- [ ] Watch history saves correctly

## Common Issues and Solutions

1. **Build Errors**: Check package.json dependencies
2. **CORS Errors**: Verify Worker CORS headers
3. **OAuth Errors**: Check Azure redirect URIs
4. **Database Errors**: Verify D1 binding and schema

## Files Created for Deployment

- `cloudflare-worker.js` - Backend Worker code
- `cloudflare-d1-schema.sql` - Database schema
- `frontend/_headers` - Security headers
- `frontend/_redirects` - Client-side routing
- `CLOUDFLARE_DEPLOYMENT_GUIDE.md` - Detailed deployment guide

Follow the deployment guide step by step for successful deployment!