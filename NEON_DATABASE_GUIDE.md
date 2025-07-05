# 🗄️ Neon Database Setup - Visual Guide

## 🎯 Quick Reference

**Goal**: Get a PostgreSQL database URL that looks like:
```
postgresql://username:password@ep-cool-name-123456.us-east-1.aws.neon.tech/onedrive_netflix?sslmode=require
```

---

## 📋 Step-by-Step Setup

### Step 1: Create Neon Account
1. **Go to**: https://neon.tech
2. **Click "Sign Up"**
3. **Choose sign-up method**:
   - GitHub (recommended - faster)
   - Google 
   - Email + password

### Step 2: Verify Account (if needed)
- Check your email for verification link
- Click to verify your account

### Step 3: Create Your First Project
After logging in, you'll see the dashboard:

1. **Click "Create a project"** (big green button)
2. **Fill in project details**:
   ```
   Project name: onedrive-netflix-db
   Database name: onedrive_netflix
   Region: [Choose closest to your users]
   PostgreSQL version: [Keep default - usually 15 or 16]
   ```
3. **Click "Create project"**

### Step 4: Get Connection String
Once project is created:

1. **You'll see the project dashboard**
2. **Look for "Connection Details" section**
3. **Click "Connection string" tab**
4. **Choose "Parameters" or "Prisma" format**

### Step 5: Copy the Correct URL Format

**✅ CORRECT - Use this format:**
```
postgresql://alex:AbC123dEf@ep-cool-breeze-123456.us-east-1.aws.neon.tech/onedrive_netflix?sslmode=require
```

**❌ WRONG - Don't use these:**
```bash
# Pooled connection (has 'pooler' in URL)
postgresql://alex:AbC123dEf@ep-cool-breeze-123456-pooler.us-east-1.aws.neon.tech/onedrive_netflix

# Missing sslmode
postgresql://alex:AbC123dEf@ep-cool-breeze-123456.us-east-1.aws.neon.tech/onedrive_netflix

# Localhost (for local development only)
postgresql://localhost:5432/onedrive_netflix
```

---

## 🔍 Understanding Your Connection String

Your URL has these parts:
```
postgresql://[username]:[password]@[host]:[port]/[database]?sslmode=require
```

**Example breakdown**:
```
postgresql://alex:AbC123dEf@ep-cool-breeze-123456.us-east-1.aws.neon.tech/onedrive_netflix?sslmode=require
          ────┬──── ─────┬───── ────────────────────┬────────────────────────── ──────┬────────
              │         │                          │                                │
           username   password                    host                         database
```

---

## 🛠️ Neon Dashboard Navigation

### Project Dashboard Sections:

1. **Overview**: 
   - Project status
   - Recent activity
   - Storage usage

2. **Tables**:
   - View database tables (will be empty initially)
   - After deployment, you'll see `users` and `watch_history` tables

3. **Branches**:
   - Database branching (like Git for databases)
   - Main branch is your production database

4. **Settings**:
   - Project settings
   - Connection pooling options
   - Delete project (be careful!)

### Key Features:

- **Auto-pause**: Database pauses when inactive (saves money)
- **Auto-resume**: Wakes up automatically when accessed
- **Branching**: Create separate databases for testing
- **Backups**: Automatic daily backups

---

## 🔐 Security Best Practices

### Connection String Security:
1. **Never commit to Git**: Your connection string contains credentials
2. **Use environment variables**: Store in Vercel environment variables only
3. **Rotate if compromised**: Can regenerate password in Neon dashboard

### Neon Security Features:
- **SSL required**: All connections encrypted
- **IP allowlists**: Restrict access by IP (optional)
- **Role-based access**: Create read-only users if needed

---

## 📊 Database Schema (Auto-Created)

When your app first runs, these tables will be created automatically:

### `users` table:
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,  -- Azure user ID
    name VARCHAR(255),                     -- Display name
    email VARCHAR(255),                    -- Email address  
    last_login TIMESTAMP,                  -- Last login time
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `watch_history` table:
```sql
CREATE TABLE watch_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,        -- Links to users.user_id
    item_id VARCHAR(255) NOT NULL,        -- OneDrive file ID
    name VARCHAR(255) NOT NULL,           -- File name
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

---

## 🧪 Testing Your Database Connection

### Test with psql (if installed):
```bash
psql "postgresql://username:password@host:port/database?sslmode=require"
```

### Test with Python (optional):
```python
import asyncpg
import asyncio

async def test_connection():
    conn = await asyncpg.connect("your-connection-string-here")
    result = await conn.fetchval("SELECT version()")
    print(f"PostgreSQL version: {result}")
    await conn.close()

asyncio.run(test_connection())
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "Could not connect to server"
**Possible causes**:
- Wrong connection string format
- Database is paused (auto-resumes in ~1 second)
- Network connectivity issues

**Solutions**:
```bash
# Verify format includes sslmode=require
postgresql://user:pass@host:port/db?sslmode=require

# Check database status in Neon dashboard
# Wait a moment for auto-resume if paused
```

### Issue 2: "Authentication failed"
**Possible causes**:
- Wrong username/password
- Connection string copied incorrectly

**Solutions**:
- Double-check connection string in Neon dashboard
- Regenerate password if needed
- Ensure no extra spaces or characters

### Issue 3: "Database does not exist"
**Possible causes**:
- Wrong database name in connection string
- Database was deleted

**Solutions**:
- Verify database name in Neon dashboard
- Check if you're using the right project

### Issue 4: "SSL connection required"
**Possible causes**:
- Missing `?sslmode=require` parameter

**Solutions**:
```bash
# Ensure your URL ends with this:
?sslmode=require
```

---

## 📈 Monitoring & Maintenance

### Neon Dashboard Monitoring:
1. **Storage Usage**: Track database size growth
2. **Compute Time**: Monitor active connection time
3. **Connection Count**: See active connections
4. **Query Performance**: Analyze slow queries

### Regular Maintenance:
1. **Check storage usage**: Neon free tier has limits
2. **Monitor connection count**: Avoid hitting connection limits
3. **Review query performance**: Optimize slow queries
4. **Backup verification**: Ensure backups are working

---

## 💰 Neon Pricing (as of 2024)

### Free Tier Includes:
- **Storage**: 0.5 GB
- **Compute**: 100 hours/month
- **Databases**: 10 databases
- **Branches**: 10 branches per database

### If You Exceed Free Tier:
- Upgrade to Pro plan
- Pay-as-you-use pricing
- Higher limits and better performance

**For most personal projects, free tier is sufficient!**

---

## ✅ Final Checklist

Before using your database URL in Vercel:

- [ ] ✅ Connection string includes `?sslmode=require`
- [ ] ✅ Connection string uses direct endpoint (not pooler)
- [ ] ✅ Database name matches what you created
- [ ] ✅ Connection string tested (optional but recommended)
- [ ] ✅ Connection string copied to safe place (password manager)
- [ ] ✅ Ready to paste into Vercel environment variables

**Your DATABASE_URL is ready for Vercel deployment! 🎉**

Next step: Use this URL in the [Manual Deploy Guide](MANUAL_DEPLOY_GUIDE.md) Step 4.1