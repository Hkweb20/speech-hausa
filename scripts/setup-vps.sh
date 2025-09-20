#!/bin/bash

# 🛠️ VPS Setup Script for Hausa Speech-to-Text
# This script sets up a fresh Ubuntu VPS for deployment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/opt/hausa-speech"
LOG_FILE="/var/log/vps-setup.log"

# Functions
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | sudo tee -a $LOG_FILE
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | sudo tee -a $LOG_FILE
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | sudo tee -a $LOG_FILE
}

error() {
    echo -e "${RED}❌ $1${NC}" | sudo tee -a $LOG_FILE
    exit 1
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root (use sudo)"
fi

log "🛠️  Starting VPS setup for Hausa Speech-to-Text..."

# Update system
log "📦 Updating system packages..."
apt update && apt upgrade -y
success "System updated"

# Install essential packages
log "📦 Installing essential packages..."
apt install -y curl wget git vim htop unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
success "Essential packages installed"

# Install Node.js 18
log "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
success "Node.js $(node --version) installed"

# Install PM2
log "📦 Installing PM2..."
npm install -g pm2
success "PM2 installed"

# Install Nginx
log "📦 Installing Nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx
success "Nginx installed and started"

# Install FFmpeg
log "📦 Installing FFmpeg..."
apt install -y ffmpeg
success "FFmpeg installed"

# Install MongoDB (optional - you can use MongoDB Atlas instead)
read -p "Do you want to install MongoDB locally? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "📦 Installing MongoDB..."
    wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    apt-get update
    apt-get install -y mongodb-org
    systemctl enable mongod
    systemctl start mongod
    success "MongoDB installed and started"
fi

# Install Certbot for SSL
log "📦 Installing Certbot..."
apt install -y certbot python3-certbot-nginx
success "Certbot installed"

# Install monitoring tools
log "📦 Installing monitoring tools..."
apt install -y htop iotop nethogs fail2ban
systemctl enable fail2ban
systemctl start fail2ban
success "Monitoring tools installed"

# Configure firewall
log "🔥 Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443
ufw deny 4000  # Block direct access to Node.js port
success "Firewall configured"

# Create application user
log "👤 Creating application user..."
if ! id "hausa" &>/dev/null; then
    useradd -m -s /bin/bash hausa
    usermod -aG sudo hausa
    success "User 'hausa' created"
else
    warning "User 'hausa' already exists"
fi

# Create application directory
log "📁 Creating application directory..."
mkdir -p $APP_DIR
mkdir -p $APP_DIR/logs
mkdir -p $APP_DIR/config
mkdir -p $APP_DIR/uploads
mkdir -p $APP_DIR/backups
chown -R hausa:hausa $APP_DIR
success "Application directory created"

# Create log rotation configuration
log "📝 Setting up log rotation..."
cat > /etc/logrotate.d/hausa-speech << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 hausa hausa
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
success "Log rotation configured"

# Setup PM2 startup
log "🚀 Setting up PM2 startup..."
sudo -u hausa pm2 startup systemd -u hausa --hp /home/hausa
success "PM2 startup configured"

# Create health check script
log "🏥 Creating health check script..."
cat > $APP_DIR/health-check.sh << 'EOF'
#!/bin/bash
API_URL="http://localhost:4000/health"
LOG_FILE="/opt/hausa-speech/logs/health-check.log"

check_health() {
    local response=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    if [ "$response" = "200" ]; then
        echo "[$timestamp] ✅ API is healthy (HTTP $response)" >> $LOG_FILE
        return 0
    else
        echo "[$timestamp] ❌ API is unhealthy (HTTP $response)" >> $LOG_FILE
        return 1
    fi
}

if ! check_health; then
    echo "🔄 Restarting application due to health check failure..."
    sudo -u hausa pm2 restart hausa-speech-api
fi
EOF

chmod +x $APP_DIR/health-check.sh
chown hausa:hausa $APP_DIR/health-check.sh
success "Health check script created"

# Setup cron job for health checks
log "⏰ Setting up health check cron job..."
echo "*/5 * * * * $APP_DIR/health-check.sh" | crontab -u hausa -
success "Health check cron job configured"

# Create backup script
log "💾 Creating backup script..."
cat > $APP_DIR/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/hausa-speech/backups"

mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz -C /opt/hausa-speech .

# Backup database (if MongoDB is installed locally)
if systemctl is-active --quiet mongod; then
    mongodump --out $BACKUP_DIR/mongodb_$DATE
fi

# Keep only last 7 days of backups
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x $APP_DIR/backup.sh
chown hausa:hausa $APP_DIR/backup.sh
success "Backup script created"

# Setup daily backup cron job
log "⏰ Setting up backup cron job..."
echo "0 2 * * * $APP_DIR/backup.sh" | crontab -u hausa -
success "Backup cron job configured"

# Configure Nginx
log "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/hausa-speech << 'EOF'
server {
    listen 80;
    server_name _;
    
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name _;
    
    # Temporary self-signed certificate (replace with Let's Encrypt)
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/s;
    
    # API routes
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # File upload routes
    location /api/stt/transcribe {
        limit_req zone=upload burst=5 nodelay;
        client_max_body_size 50M;
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:4000;
        access_log off;
    }
}
EOF

ln -sf /etc/nginx/sites-available/hausa-speech /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
success "Nginx configured"

# Install PM2 log rotate
log "📝 Installing PM2 log rotate..."
sudo -u hausa pm2 install pm2-logrotate
sudo -u hausa pm2 set pm2-logrotate:max_size 10M
sudo -u hausa pm2 set pm2-logrotate:retain 30
sudo -u hausa pm2 set pm2-logrotate:compress true
success "PM2 log rotate configured"

# Show setup summary
log "📋 VPS Setup Summary:"
echo "  - Node.js: $(node --version)"
echo "  - NPM: $(npm --version)"
echo "  - PM2: $(pm2 --version)"
echo "  - Nginx: $(nginx -v 2>&1)"
echo "  - FFmpeg: $(ffmpeg -version | head -n1)"
if systemctl is-active --quiet mongod; then
    echo "  - MongoDB: $(mongod --version | head -n1)"
fi
echo "  - Application directory: $APP_DIR"
echo "  - Log file: $LOG_FILE"

success "🎉 VPS setup completed successfully!"

log "📝 Next steps:"
echo "  1. Clone your repository to $APP_DIR"
echo "  2. Copy production.env.template to .env.production"
echo "  3. Configure your environment variables"
echo "  4. Set up Google Cloud service account"
echo "  5. Configure SSL certificate with Let's Encrypt"
echo "  6. Deploy your application using deploy.sh"

log "📚 For detailed instructions, see DEPLOYMENT_GUIDE.md"
