# 🚀 Dokploy Deployment Guide - Hausa Speech-to-Text

This guide will help you deploy your Hausa Speech-to-Text application using Dokploy, a modern deployment platform for VPS.

## 📋 Prerequisites

- VPS with Ubuntu 20.04+ or CentOS 8+
- Root or sudo access
- Domain name (optional but recommended)
- Google Cloud Platform account
- MongoDB Atlas account

## 🛠️ Step 1: Install Dokploy

### 1.1 Install Dokploy on your VPS
```bash
# Connect to your VPS
ssh root@your-vps-ip

# Install Dokploy
curl -sSL https://dokploy.com/install.sh | sh

# Start Dokploy
sudo systemctl start dokploy
sudo systemctl enable dokploy
```

### 1.2 Access Dokploy Dashboard
- Open your browser and go to: `http://your-vps-ip:3000`
- Create an admin account
- Complete the initial setup

## 🐳 Step 2: Prepare Your Application

### 2.1 Create Dockerfile for Dokploy
```dockerfile
# backend/Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    ffmpeg \
    curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S hausa -u 1001

# Create necessary directories
RUN mkdir -p logs uploads config && \
    chown -R hausa:nodejs logs uploads config

# Switch to non-root user
USER hausa

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4000/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
```

### 2.2 Create Docker Compose for Dokploy
```yaml
# docker-compose.dokploy.yml
version: '3.8'

services:
  hausa-speech-api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: hausa-speech-api
    restart: unless-stopped
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - PORT=4000
      - HOST=0.0.0.0
    env_file:
      - .env.production
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
      - ./config:/app/config
    networks:
      - hausa-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    container_name: hausa-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./ssl:/etc/nginx/ssl:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - hausa-speech-api
    networks:
      - hausa-network

networks:
  hausa-network:
    driver: bridge
```

### 2.3 Create Nginx Configuration
```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/s;
    
    # Upstream
    upstream hausa_api {
        server hausa-speech-api:4000;
    }
    
    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }
    
    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name _;
        
        # SSL configuration (Dokploy will handle this)
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        
        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://hausa_api;
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
            proxy_pass http://hausa_api;
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
            proxy_pass http://hausa_api;
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
            proxy_pass http://hausa_api;
            access_log off;
        }
        
        # Static files
        location / {
            root /usr/share/nginx/html;
            index index.html;
            try_files $uri $uri/ /index.html;
        }
    }
}
```

## 🚀 Step 3: Deploy with Dokploy

### 3.1 Create New Project in Dokploy
1. Login to Dokploy dashboard
2. Click "New Project"
3. Name: `hausa-speech`
4. Description: `Hausa Speech-to-Text API`
5. Click "Create Project"

### 3.2 Connect Your Repository
1. In your project, click "Connect Repository"
2. Choose your Git provider (GitHub, GitLab, etc.)
3. Select your repository: `yourusername/hausa-speech`
4. Branch: `main`
5. Click "Connect"

### 3.3 Configure Environment Variables
1. Go to "Environment Variables" tab
2. Add the following variables:

```env
# Server Configuration
NODE_ENV=production
PORT=4000
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hausa-speech-prod

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_EXPIRES_IN=7d

# Google Cloud Configuration
GOOGLE_APPLICATION_CREDENTIALS=/app/config/gcp-service-account.json
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
LOG_FILE=/app/logs/app.log

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret-here
```

### 3.4 Configure Build Settings
1. Go to "Build Settings" tab
2. Dockerfile Path: `backend/Dockerfile`
3. Build Context: `.`
4. Build Command: `npm run build`
5. Start Command: `node dist/index.js`

### 3.5 Configure Domain and SSL
1. Go to "Domains" tab
2. Add your domain: `yourdomain.com`
3. Enable SSL (Dokploy will automatically get Let's Encrypt certificate)
4. Configure redirects if needed

### 3.6 Configure Volumes
1. Go to "Volumes" tab
2. Add the following volume mounts:
   - Host: `/opt/hausa-speech/logs` → Container: `/app/logs`
   - Host: `/opt/hausa-speech/uploads` → Container: `/app/uploads`
   - Host: `/opt/hausa-speech/config` → Container: `/app/config`

### 3.7 Deploy the Application
1. Go to "Deployments" tab
2. Click "Deploy Now"
3. Wait for the build to complete
4. Check the logs for any errors

## 🔧 Step 4: Post-Deployment Configuration

### 4.1 Upload Google Cloud Service Account Key
1. Go to your project's "Files" tab
2. Navigate to `config/` directory
3. Upload your `gcp-service-account.json` file
4. Set proper permissions: `chmod 600 gcp-service-account.json`

### 4.2 Configure MongoDB
1. Create a MongoDB Atlas cluster
2. Get the connection string
3. Update `MONGODB_URI` in environment variables
4. Test the connection

### 4.3 Test the Application
1. Check health endpoint: `https://yourdomain.com/health`
2. Test API documentation: `https://yourdomain.com/api-docs`
3. Test file upload: `https://yourdomain.com/api/stt/transcribe`

## 📊 Step 5: Monitoring and Management

### 5.1 View Logs
- Go to "Logs" tab in Dokploy
- View real-time logs
- Download log files if needed

### 5.2 Monitor Resources
- Go to "Metrics" tab
- Monitor CPU, Memory, and Network usage
- Set up alerts if needed

### 5.3 Scale the Application
- Go to "Settings" tab
- Adjust CPU and Memory limits
- Enable auto-scaling if needed

## 🔄 Step 6: Continuous Deployment

### 6.1 Enable Auto-Deploy
1. Go to "Settings" tab
2. Enable "Auto Deploy on Push"
3. Select the branch (usually `main`)
4. Save settings

### 6.2 Manual Deployment
1. Go to "Deployments" tab
2. Click "Deploy Now"
3. Select the commit to deploy
4. Click "Deploy"

## 🛠️ Step 7: Advanced Configuration

### 7.1 Custom Nginx Configuration
1. Go to "Files" tab
2. Navigate to `nginx/` directory
3. Edit `nginx.conf` as needed
4. Restart the application

### 7.2 SSL Certificate Management
- Dokploy automatically manages Let's Encrypt certificates
- Certificates are renewed automatically
- You can view certificate status in the "Domains" tab

### 7.3 Backup Configuration
1. Go to "Backups" tab
2. Enable automatic backups
3. Configure backup schedule
4. Set retention policy

## 🚨 Troubleshooting

### Common Issues

1. **Build Fails**
   - Check Dockerfile syntax
   - Verify all dependencies are installed
   - Check build logs for specific errors

2. **Application Won't Start**
   - Check environment variables
   - Verify all required files are present
   - Check application logs

3. **Database Connection Failed**
   - Verify MongoDB URI
   - Check network connectivity
   - Verify database credentials

4. **SSL Certificate Issues**
   - Check domain DNS settings
   - Verify domain is pointing to your VPS
   - Check certificate status in Dokploy

### Log Locations
- **Application logs**: Available in Dokploy dashboard
- **Nginx logs**: Available in Dokploy dashboard
- **System logs**: Available in Dokploy dashboard

## 📈 Scaling and Performance

### Horizontal Scaling
1. Go to "Settings" tab
2. Increase the number of replicas
3. Configure load balancing
4. Monitor performance

### Vertical Scaling
1. Go to "Settings" tab
2. Increase CPU and Memory limits
3. Restart the application
4. Monitor resource usage

## 🔐 Security Best Practices

1. **Environment Variables**
   - Never commit sensitive data to Git
   - Use strong passwords and secrets
   - Rotate secrets regularly

2. **Network Security**
   - Use HTTPS only
   - Configure proper CORS settings
   - Enable rate limiting

3. **Application Security**
   - Keep dependencies updated
   - Use non-root user in containers
   - Implement proper error handling

## 🎉 Success!

Your Hausa Speech-to-Text application is now deployed with Dokploy! 

### Access Points:
- **API**: `https://yourdomain.com/api`
- **Health Check**: `https://yourdomain.com/health`
- **API Documentation**: `https://yourdomain.com/api-docs`
- **Dokploy Dashboard**: `http://your-vps-ip:3000`

### Next Steps:
1. Test all API endpoints
2. Set up monitoring alerts
3. Configure automated backups
4. Scale as needed

For any issues, check the Dokploy logs and refer to the troubleshooting section above.
