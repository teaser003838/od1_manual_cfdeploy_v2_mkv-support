-- Cloudflare D1 Database Schema
-- Copy and paste each CREATE statement individually into D1 console

-- Step 1: Create Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    name TEXT,
    email TEXT,
    last_login TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Create Watch history table
CREATE TABLE IF NOT EXISTS watch_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    name TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Create User preferences table (optional)
CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    theme TEXT DEFAULT 'dark',
    quality TEXT DEFAULT 'auto',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Step 4: Create indexes (run these one by one)
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);

CREATE INDEX IF NOT EXISTS idx_watch_history_user_id ON watch_history(user_id);

CREATE INDEX IF NOT EXISTS idx_watch_history_timestamp ON watch_history(timestamp);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);