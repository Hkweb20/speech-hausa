# 🚀 VPS Deployment Guide - Hausa Speech-to-Text

This guide will help you deploy the Hausa Speech-to-Text application to a VPS (Virtual Private Server).

## 📋 Prerequisites

- VPS with Ubuntu 20.04+ or CentOS 8+
- Root or sudo access
- Domain name (optional but recommended)
- Google Cloud Platform account
- MongoDB Atlas account (or self-hosted MongoDB)

## 🛠️ Server Requirements

### Minimum Requirements
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **Bandwidth**: 1TB/month

### Recommended Requirements
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 50GB SSD
- **Bandwidth**: 2TB/month

## 🔧 Step 1: Server Setup

### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Node.js 18+
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 1.3 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

### 1.4 Install Nginx
```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 1.5 Install FFmpeg
```bash
sudo apt install ffmpeg -y
```

### 1.6 Install MongoDB (if self-hosting)
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl enable mongod
sudo systemctl start mongod
```

## 🔐 Step 2: Environment Configuration

### 2.1 Create Production Environment File
```bash
sudo nano /opt/hausa-speech/.env.production
```

### 2.2 Production Environment Variables
```env
# Server Configuration
NODE_ENV=production
PORT=4000
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb://localhost:27017/hausa-speech-prod
# OR use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hausa-speech-prod

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_EXPIRES_IN=7d

# Google Cloud Configuration
GOOGLE_APPLICATION_CREDENTIALS=/opt/hausa-speech/config/gcp-service-account.json
GCS_BUCKET=your-gcs-bucket-name
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload Limits
MAX_FILE_SIZE=50MB
MAX_FILE_DURATION=300

# Logging
LOG_LEVEL=info
LOG_FILE=/opt/hausa-speech/logs/app.log

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret-here

# Email Configuration (if using email features)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Push Notifications
FCM_SERVER_KEY=your-fcm-server-key
FCM_PROJECT_ID=your-fcm-project-id
```

## 📁 Step 3: Application Deployment

### 3.1 Create Application Directory
```bash
sudo mkdir -p /opt/hausa-speech
sudo chown -R $USER:$USER /opt/hausa-speech
```

### 3.2 Clone and Setup Application
```bash
cd /opt/hausa-speech
git clone https://github.com/yourusername/hausa-speech.git .
cd backend
npm install --production
npm run build
```

### 3.3 Create Required Directories
```bash
sudo mkdir -p /opt/hausa-speech/logs
sudo mkdir -p /opt/hausa-speech/config
sudo mkdir -p /opt/hausa-speech/uploads
sudo chown -R $USER:$USER /opt/hausa-speech
```

### 3.4 Setup Google Cloud Service Account
```bash
# Download your service account key from Google Cloud Console
# Save it as /opt/hausa-speech/config/gcp-service-account.json
sudo chmod 600 /opt/hausa-speech/config/gcp-service-account.json
```

## ⚙️ Step 4: PM2 Configuration

### 4.1 Create PM2 Ecosystem File
```bash
nano /opt/hausa-speech/ecosystem.config.js
```

### 4.2 PM2 Configuration Content
```javascript
module.exports = {
  apps: [{
    name: 'hausa-speech-api',
    script: './dist/index.js',
    cwd: '/opt/hausa-speech/backend',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    env_file: '/opt/hausa-speech/.env.production',
    log_file: '/opt/hausa-speech/logs/combined.log',
    out_file: '/opt/hausa-speech/logs/out.log',
    error_file: '/opt/hausa-speech/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

### 4.3 Start Application with PM2
```bash
cd /opt/hausa-speech
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🌐 Step 5: Nginx Configuration

### 5.1 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/hausa-speech
```

### 5.2 Nginx Configuration Content
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/s;
    
    # API Routes
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
    
    # File Upload Routes (with stricter rate limiting)
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
    
    # WebSocket Support
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
    
    # Static Files
    location / {
        root /opt/hausa-speech/backend/public;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Health Check
    location /health {
        proxy_pass http://localhost:4000;
        access_log off;
    }
}
```

### 5.3 Enable Site and Restart Nginx
```bash
sudo ln -s /etc/nginx/sites-available/hausa-speech /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔒 Step 6: SSL Certificate Setup

### 6.1 Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 6.2 Obtain SSL Certificate
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 6.3 Setup Auto-Renewal
```bash
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Step 7: Monitoring and Logging

### 7.1 Install PM2 Monitoring
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### 7.2 Setup Log Rotation
```bash
sudo nano /etc/logrotate.d/hausa-speech
```

Add this content:
```
/opt/hausa-speech/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 7.3 Install System Monitoring
```bash
sudo apt install htop iotop nethogs -y
```

## 🔧 Step 8: Database Setup

### 8.1 MongoDB Atlas (Recommended)
1. Create account at [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a new cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env.production`

### 8.2 Self-Hosted MongoDB
```bash
# Create MongoDB user
mongo
use admin
db.createUser({
  user: "hausa_admin",
  pwd: "your-secure-password",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})
exit

# Update MongoDB configuration
sudo nano /etc/mongod.conf
# Add authentication:
security:
  authorization: enabled

sudo systemctl restart mongod
```

## 🚀 Step 9: Deployment Scripts

### 9.1 Create Deployment Script
```bash
nano /opt/hausa-speech/deploy.sh
```

### 9.2 Deployment Script Content
```bash
#!/bin/bash

# Hausa Speech Deployment Script
set -e

echo "🚀 Starting deployment..."

# Navigate to application directory
cd /opt/hausa-speech

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
cd backend
npm ci --production

# Build application
echo "🔨 Building application..."
npm run build

# Restart PM2 processes
echo "🔄 Restarting application..."
pm2 reload ecosystem.config.js

# Check status
echo "✅ Checking application status..."
pm2 status

echo "🎉 Deployment completed successfully!"
```

### 9.3 Make Script Executable
```bash
chmod +x /opt/hausa-speech/deploy.sh
```

## 🔍 Step 10: Health Checks and Monitoring

### 10.1 Create Health Check Script
```bash
nano /opt/hausa-speech/health-check.sh
```

### 10.2 Health Check Script Content
```bash
#!/bin/bash

# Health Check Script
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

# Run health check
if ! check_health; then
    echo "🔄 Restarting application due to health check failure..."
    pm2 restart hausa-speech-api
fi
```

### 10.3 Setup Cron Job for Health Checks
```bash
crontab -e
# Add this line to run health check every 5 minutes:
*/5 * * * * /opt/hausa-speech/health-check.sh
```

## 📋 Step 11: Security Hardening

### 11.1 Configure Firewall
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 4000  # Block direct access to Node.js port
```

### 11.2 Secure MongoDB (if self-hosted)
```bash
# Bind to localhost only
sudo nano /etc/mongod.conf
# Set:
net:
  bindIp: 127.0.0.1
```

### 11.3 Setup Fail2Ban
```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## 🎯 Step 12: Final Verification

### 12.1 Check All Services
```bash
# Check PM2
pm2 status

# Check Nginx
sudo systemctl status nginx

# Check MongoDB (if self-hosted)
sudo systemctl status mongod

# Check logs
pm2 logs hausa-speech-api --lines 50
```

### 12.2 Test API Endpoints
```bash
# Health check
curl https://yourdomain.com/health

# API documentation
curl https://yourdomain.com/api-docs
```

## 📚 Additional Resources

### Useful Commands
```bash
# View PM2 logs
pm2 logs hausa-speech-api

# Restart application
pm2 restart hausa-speech-api

# Monitor resources
pm2 monit

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check disk usage
df -h

# Check memory usage
free -h

# Check running processes
htop
```

### Backup Strategy
```bash
# Create backup script
nano /opt/hausa-speech/backup.sh
```

```bash
#!/bin/bash
# Backup script
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/hausa-speech"

mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /opt/hausa-speech

# Backup database (if self-hosted)
mongodump --out $BACKUP_DIR/mongodb_$DATE

# Keep only last 7 days of backups
find $BACKUP_DIR -type f -mtime +7 -delete
```

## 🆘 Troubleshooting

### Common Issues

1. **Port 4000 not accessible**
   - Check if PM2 is running: `pm2 status`
   - Check firewall: `sudo ufw status`

2. **SSL certificate issues**
   - Check certificate: `sudo certbot certificates`
   - Renew certificate: `sudo certbot renew`

3. **Database connection issues**
   - Check MongoDB status: `sudo systemctl status mongod`
   - Check connection string in `.env.production`

4. **High memory usage**
   - Monitor with: `pm2 monit`
   - Restart if needed: `pm2 restart hausa-speech-api`

### Log Locations
- Application logs: `/opt/hausa-speech/logs/`
- Nginx logs: `/var/log/nginx/`
- System logs: `/var/log/syslog`
- PM2 logs: `pm2 logs`

## 🎉 Congratulations!

Your Hausa Speech-to-Text application is now deployed and running on your VPS! 

### Next Steps:
1. Test all API endpoints
2. Set up monitoring alerts
3. Configure automated backups
4. Set up CI/CD pipeline (optional)
5. Monitor performance and scale as needed

For any issues, check the logs and refer to the troubleshooting section above.
