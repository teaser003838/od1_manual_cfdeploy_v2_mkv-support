#!/bin/bash

# 🚀 Vercel Deployment Script for OneDrive Netflix App
# This script automates the deployment process

echo "🚀 Starting Vercel Deployment for OneDrive Netflix App..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_warning "Vercel CLI not found. Installing..."
    npm install -g vercel
    if [ $? -eq 0 ]; then
        print_success "Vercel CLI installed successfully"
    else
        print_error "Failed to install Vercel CLI"
        exit 1
    fi
fi

# Check if user is logged in to Vercel
print_status "Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    print_warning "Please log in to Vercel..."
    vercel login
    if [ $? -ne 0 ]; then
        print_error "Vercel login failed"
        exit 1
    fi
fi

print_success "Vercel authentication verified"

# Check for required files
print_status "Checking required files..."
required_files=("vercel.json" "package.json" "api/index.py" "api/requirements.txt" "frontend/package.json")

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file missing: $file"
        exit 1
    fi
done

print_success "All required files found"

# Install frontend dependencies
print_status "Installing frontend dependencies..."
cd frontend
if [ -f "yarn.lock" ]; then
    yarn install
else
    npm install
fi

if [ $? -ne 0 ]; then
    print_error "Failed to install frontend dependencies"
    exit 1
fi

cd ..
print_success "Frontend dependencies installed"

# Test build locally (optional)
read -p "$(echo -e ${YELLOW}Would you like to test the build locally first? [y/N]: ${NC})" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Running local build test..."
    cd frontend
    if [ -f "yarn.lock" ]; then
        yarn build
    else
        npm run build
    fi
    
    if [ $? -eq 0 ]; then
        print_success "Local build test passed"
    else
        print_error "Local build test failed"
        exit 1
    fi
    cd ..
fi

# Deploy to Vercel
print_status "Deploying to Vercel..."
echo
echo "=================================================================="
echo "🚀 VERCEL DEPLOYMENT STARTING..."
echo "=================================================================="
echo

vercel --prod

deployment_status=$?

echo
echo "=================================================================="

if [ $deployment_status -eq 0 ]; then
    print_success "Deployment completed successfully! 🎉"
    echo
    echo "📋 POST-DEPLOYMENT CHECKLIST:"
    echo "1. ✅ Set up environment variables in Vercel Dashboard"
    echo "2. ✅ Update Azure app registration with new domain"
    echo "3. ✅ Test authentication flow"
    echo "4. ✅ Test file browsing and media playback"
    echo
    echo "📖 For detailed setup instructions, see:"
    echo "   - DEPLOYMENT_GUIDE.md"
    echo "   - ARCHITECTURE_CHANGES.md"
    echo
    print_success "Your OneDrive Netflix app is now live on Vercel!"
else
    print_error "Deployment failed. Please check the error messages above."
    echo
    echo "🔧 TROUBLESHOOTING TIPS:"
    echo "1. Check vercel.json configuration"
    echo "2. Verify all required files are present"
    echo "3. Ensure environment variables are set"
    echo "4. Check Vercel dashboard for detailed logs"
    echo
    echo "📖 For help, see DEPLOYMENT_GUIDE.md"
    exit 1
fi