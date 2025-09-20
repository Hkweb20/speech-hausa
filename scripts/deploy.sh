#!/bin/bash

# 🚀 Hausa Speech-to-Text Deployment Script
# This script automates the deployment process to your VPS

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="hausa-speech-api"
APP_DIR="/opt/hausa-speech"
BACKUP_DIR="/opt/backups/hausa-speech"
LOG_FILE="/opt/hausa-speech/logs/deploy.log"

# Functions
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a $LOG_FILE
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a $LOG_FILE
    exit 1
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root for security reasons"
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    error "PM2 is not installed. Please install it first: npm install -g pm2"
fi

# Check if application directory exists
if [ ! -d "$APP_DIR" ]; then
    error "Application directory $APP_DIR does not exist"
fi

log "🚀 Starting deployment of $APP_NAME..."

# Create backup
log "📦 Creating backup..."
mkdir -p $BACKUP_DIR
BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czf $BACKUP_FILE -C $APP_DIR . 2>/dev/null || warning "Backup creation failed, continuing..."
success "Backup created: $BACKUP_FILE"

# Navigate to application directory
cd $APP_DIR

# Pull latest changes
log "📥 Pulling latest changes from Git..."
if git pull origin main; then
    success "Git pull completed"
else
    error "Git pull failed"
fi

# Install dependencies
log "📦 Installing dependencies..."
cd backend
if npm ci --production; then
    success "Dependencies installed"
else
    error "Dependency installation failed"
fi

# Build application
log "🔨 Building application..."
if npm run build; then
    success "Application built successfully"
else
    error "Build failed"
fi

# Run database migrations (if any)
log "🗄️  Running database migrations..."
# Add your migration commands here if needed
# npm run migrate:prod

# Restart PM2 processes
log "🔄 Restarting PM2 processes..."
if pm2 reload ecosystem.config.js; then
    success "PM2 processes restarted"
else
    warning "PM2 reload failed, trying restart..."
    if pm2 restart $APP_NAME; then
        success "PM2 processes restarted"
    else
        error "PM2 restart failed"
    fi
fi

# Wait for application to start
log "⏳ Waiting for application to start..."
sleep 10

# Health check
log "🏥 Performing health check..."
HEALTH_URL="http://localhost:4000/health"
MAX_RETRIES=5
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f -s $HEALTH_URL > /dev/null; then
        success "Health check passed"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        warning "Health check failed, retry $RETRY_COUNT/$MAX_RETRIES"
        sleep 5
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    error "Health check failed after $MAX_RETRIES retries"
fi

# Check PM2 status
log "📊 Checking PM2 status..."
pm2 status

# Cleanup old backups (keep last 7 days)
log "🧹 Cleaning up old backups..."
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete 2>/dev/null || true
success "Old backups cleaned up"

# Show deployment summary
log "📋 Deployment Summary:"
echo "  - Application: $APP_NAME"
echo "  - Directory: $APP_DIR"
echo "  - Backup: $BACKUP_FILE"
echo "  - Status: $(pm2 jlist | jq -r '.[] | select(.name=="'$APP_NAME'") | .pm2_env.status')"
echo "  - Uptime: $(pm2 jlist | jq -r '.[] | select(.name=="'$APP_NAME'") | .pm2_env.pm_uptime')"
echo "  - Memory: $(pm2 jlist | jq -r '.[] | select(.name=="'$APP_NAME'") | .monit.memory')"
echo "  - CPU: $(pm2 jlist | jq -r '.[] | select(.name=="'$APP_NAME'") | .monit.cpu')"

success "🎉 Deployment completed successfully!"

# Optional: Send notification (uncomment and configure)
# curl -X POST "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK" \
#   -H "Content-Type: application/json" \
#   -d '{"text":"🚀 Hausa Speech-to-Text deployed successfully!"}'

log "📝 Deployment log saved to: $LOG_FILE"
