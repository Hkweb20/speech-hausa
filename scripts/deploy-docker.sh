#!/bin/bash

# 🐳 Docker Deployment Script for Hausa Speech-to-Text
# This script deploys the application using Docker Compose

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
APP_NAME="hausa-speech"
BACKUP_DIR="./backups"
LOG_FILE="./logs/docker-deploy.log"

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

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    error "Docker is not installed. Please install Docker first."
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose is not installed. Please install Docker Compose first."
fi

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    error ".env.production file not found. Please create it from production.env.template"
fi

log "🐳 Starting Docker deployment of $APP_NAME..."

# Create necessary directories
log "📁 Creating necessary directories..."
mkdir -p logs nginx/conf.d nginx/ssl monitoring/prometheus monitoring/grafana/provisioning monitoring/logstash/pipeline
success "Directories created"

# Create backup
log "📦 Creating backup..."
if [ -d "$BACKUP_DIR" ]; then
    BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).tar.gz"
    tar -czf $BACKUP_FILE . 2>/dev/null || warning "Backup creation failed, continuing..."
    success "Backup created: $BACKUP_FILE"
fi

# Pull latest images
log "📥 Pulling latest Docker images..."
docker-compose -f $COMPOSE_FILE pull
success "Images pulled"

# Build application image
log "🔨 Building application image..."
docker-compose -f $COMPOSE_FILE build --no-cache
success "Application image built"

# Stop existing containers
log "🛑 Stopping existing containers..."
docker-compose -f $COMPOSE_FILE down || warning "No existing containers to stop"

# Start services
log "🚀 Starting services..."
docker-compose -f $COMPOSE_FILE up -d
success "Services started"

# Wait for services to be ready
log "⏳ Waiting for services to be ready..."
sleep 30

# Health check
log "🏥 Performing health checks..."

# Check API health
API_URL="http://localhost:4000/health"
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f -s $API_URL > /dev/null; then
        success "API health check passed"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        warning "API health check failed, retry $RETRY_COUNT/$MAX_RETRIES"
        sleep 10
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    error "API health check failed after $MAX_RETRIES retries"
fi

# Check other services
log "🔍 Checking service status..."
docker-compose -f $COMPOSE_FILE ps

# Show logs
log "📋 Recent logs:"
docker-compose -f $COMPOSE_FILE logs --tail=20

# Show deployment summary
log "📋 Deployment Summary:"
echo "  - Application: $APP_NAME"
echo "  - Compose file: $COMPOSE_FILE"
echo "  - API URL: http://localhost:4000"
echo "  - Grafana: http://localhost:3000"
echo "  - Kibana: http://localhost:5601"
echo "  - Prometheus: http://localhost:9090"

# Show resource usage
log "📊 Resource Usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

success "🎉 Docker deployment completed successfully!"

log "📝 Useful commands:"
echo "  - View logs: docker-compose -f $COMPOSE_FILE logs -f"
echo "  - Stop services: docker-compose -f $COMPOSE_FILE down"
echo "  - Restart services: docker-compose -f $COMPOSE_FILE restart"
echo "  - Scale API: docker-compose -f $COMPOSE_FILE up -d --scale hausa-speech-api=3"
echo "  - Update services: docker-compose -f $COMPOSE_FILE pull && docker-compose -f $COMPOSE_FILE up -d"

log "📝 Deployment log saved to: $LOG_FILE"
