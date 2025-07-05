#!/bin/bash

# Railway startup script for OneDrive Explorer

echo "🚀 Starting OneDrive Explorer on Railway..."

# Set default port if not provided
export PORT=${PORT:-8000}

echo "📡 Port: $PORT"
echo "🔐 MongoDB URL: ${MONGO_URL:0:20}..."

# Start the FastAPI backend
echo "🚀 Starting FastAPI backend..."
cd backend && python -m uvicorn server:app --host 0.0.0.0 --port $PORT