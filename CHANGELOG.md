# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-07-05

### 🔧 Critical Bug Fixes

#### **Deployment Issues Fixed**
- **Fixed Node.js version compatibility error**
  - **Issue**: Vercel deployment failing with `react-router-dom@7.5.1: The engine "node" is incompatible with this module. Expected version ">=20.0.0". Got "18.20.6"`
  - **Fix**: Updated Node.js version requirement from `18.x` to `20.x` in `package.json`
  - **Impact**: Resolves Vercel build failures and enables successful deployment

#### **Authentication System Fixed**
- **Fixed password authentication failure**
  - **Issue**: Password `66244?BOy.` failing with "Invalid password" error
  - **Root Cause**: Invalid bcrypt hash format causing `hash could not be identified` errors
  - **Fix**: Generated new proper bcrypt hash: `$2b$12$/T4PlT81dyzgHY4wte6pxuquCgU9TRkIYWi.LqKd7TN8BEcSF8OG.`
  - **Files Updated**: 
    - `/backend/server.py`
    - `/api/index.py`
  - **Impact**: Password authentication now works correctly in both local and production environments

#### **Database Configuration Fixed**
- **Fixed API backend database mismatch**
  - **Issue**: `/api/index.py` using PostgreSQL (asyncpg, psycopg2-binary) while main app uses MongoDB
  - **Error**: `pg_config executable not found` during Vercel deployment
  - **Fix**: 
    - Updated `/api/requirements.txt` to use MongoDB dependencies (motor)
    - Converted `/api/index.py` from PostgreSQL to MongoDB implementation
    - Aligned API backend with main backend architecture
  - **Impact**: Eliminates PostgreSQL dependency conflicts and ensures consistent database usage

#### **Vercel Deployment Configuration**
- **Fixed backend URL configuration for production**
  - **Issue**: Frontend using absolute URLs causing API call failures in Vercel
  - **Fix**: Updated frontend to use relative URLs in production environment
  - **Files Updated**:
    - `/frontend/src/App.js`
    - `/frontend/src/FileExplorer.js` 
    - `/frontend/src/PhotoSlideshow.js`
  - **Logic**: `process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8001'`
  - **Impact**: Proper API routing in Vercel deployment

### 🚀 Technical Improvements

#### **Dependency Management**
- **Synchronized API and Backend Dependencies**
  - Removed conflicting PostgreSQL packages: `psycopg2-binary==2.9.7`, `asyncpg==0.28.0`
  - Added consistent MongoDB packages: `motor==3.3.2`
  - Standardized FastAPI and authentication dependencies

#### **Code Architecture**
- **Unified Database Layer**
  - Converted API endpoints to use MongoDB with Motor (async)
  - Maintained same API interface while fixing backend implementation
  - Ensured consistent user data and watch history storage

### 📋 Files Modified

#### Configuration Files
- `package.json` - Node.js version update
- `api/requirements.txt` - Database dependencies fix

#### Backend Files  
- `backend/server.py` - Password hash fix
- `api/index.py` - Complete MongoDB conversion and password fix

#### Frontend Files
- `frontend/src/App.js` - Backend URL configuration
- `frontend/src/FileExplorer.js` - Backend URL configuration  
- `frontend/src/PhotoSlideshow.js` - Backend URL configuration

### ✅ Verification Status

- [x] **Local Environment**: All fixes tested and verified working
- [x] **Password Authentication**: `66244?BOy.` works correctly
- [x] **Dependencies**: Clean installation without conflicts
- [x] **Services**: All services (frontend, backend, mongodb) running properly
- [ ] **Vercel Deployment**: Requires redeployment to apply fixes

### 🎯 Expected Impact

#### **For Users**
- ✅ Password authentication will work correctly
- ✅ Faster and more reliable deployment process
- ✅ No more "Invalid password" errors
- ✅ Consistent application behavior across environments

#### **For Developers**
- ✅ Clean dependency tree without conflicts
- ✅ Consistent database architecture (MongoDB throughout)
- ✅ Modern Node.js support (v20.x)
- ✅ Proper production/development environment handling

### 🔄 Migration Notes

#### **For Existing Deployments**
1. **Redeploy to Vercel** to get all fixes
2. **Clear browser cache** if authentication issues persist
3. **Use exact password**: `66244?BOy.` (case-sensitive, includes special characters)

#### **For New Deployments**
- All fixes included automatically
- No additional configuration required
- Standard deployment process applies

---

## [1.0.0] - Previous Version

### Features (Pre-existing)
- OneDrive Netflix-style file explorer
- Video streaming with range request support
- Audio player with multiple format support
- Photo slideshow functionality
- Microsoft OAuth authentication
- Mobile-optimized touch controls
- Keyboard shortcuts for media controls
- Watch history tracking
- Folder navigation with breadcrumbs
- Support for multiple media formats (MP4, MKV, MP3, WAV, FLAC, etc.)

---

### Legend
- 🔧 Bug Fixes
- 🚀 Improvements  
- 📋 Documentation
- ✅ Verified
- 🎯 Impact
- 🔄 Migration