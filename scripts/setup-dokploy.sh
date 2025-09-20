#!/bin/bash

# 🚀 Dokploy Setup Script for Hausa Speech-to-Text
# This script helps you set up your VPS with Dokploy

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOKPLOY_PORT=3000
APP_NAME="hausa-speech"

# Functions
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root (use sudo)"
fi

log "🚀 Setting up Dokploy for Hausa Speech-to-Text..."

# Update system
log "📦 Updating system packages..."
apt update && apt upgrade -y
success "System updated"

# Install Docker
log "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker $USER
    success "Docker installed"
else
    warning "Docker is already installed"
fi

# Install Docker Compose
log "🐳 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    success "Docker Compose installed"
else
    warning "Docker Compose is already installed"
fi

# Install Dokploy
log "🚀 Installing Dokploy..."
if ! command -v dokploy &> /dev/null; then
    curl -sSL https://dokploy.com/install.sh | sh
    success "Dokploy installed"
else
    warning "Dokploy is already installed"
fi

# Start Dokploy
log "🚀 Starting Dokploy..."
systemctl start dokploy
systemctl enable dokploy
success "Dokploy started"

# Wait for Dokploy to be ready
log "⏳ Waiting for Dokploy to be ready..."
sleep 10

# Check if Dokploy is running
if systemctl is-active --quiet dokploy; then
    success "Dokploy is running"
else
    error "Failed to start Dokploy"
fi

# Get VPS IP
VPS_IP=$(curl -s ifconfig.me)
if [ -z "$VPS_IP" ]; then
    VPS_IP=$(hostname -I | awk '{print $1}')
fi

# Show setup summary
log "📋 Dokploy Setup Summary:"
echo "  - Dokploy Status: $(systemctl is-active dokploy)"
echo "  - Dokploy Port: $DOKPLOY_PORT"
echo "  - VPS IP: $VPS_IP"
echo "  - Docker Version: $(docker --version)"
echo "  - Docker Compose Version: $(docker-compose --version)"

success "🎉 Dokploy setup completed successfully!"

log "📝 Next steps:"
echo "  1. Open your browser and go to: http://$VPS_IP:$DOKPLOY_PORT"
echo "  2. Create an admin account"
echo "  3. Create a new project called '$APP_NAME'"
echo "  4. Connect your Git repository"
echo "  5. Configure environment variables using dokploy.env.template"
echo "  6. Upload your Google Cloud service account key to config/ directory"
echo "  7. Deploy your application"

log "📚 For detailed instructions, see DOKPLOY_DEPLOYMENT.md"

# Show useful commands
log "🔧 Useful commands:"
echo "  - Check Dokploy status: sudo systemctl status dokploy"
echo "  - View Dokploy logs: sudo journalctl -u dokploy -f"
echo "  - Restart Dokploy: sudo systemctl restart dokploy"
echo "  - Stop Dokploy: sudo systemctl stop dokploy"

success "Setup complete! Happy deploying! 🚀"
