# 🚀 Quick Deploy Guide - Hausa Speech-to-Text

## 🎯 Choose Your Deployment Method

### Option 1: Traditional VPS Deployment (Recommended)
**Best for**: Production environments, full control, cost-effective

### Option 2: Docker Deployment
**Best for**: Easy setup, containerized environments, scaling

---

## 🛠️ Option 1: Traditional VPS Deployment

### Prerequisites
- Ubuntu 20.04+ VPS
- Root/sudo access
- Domain name (optional)

### Quick Setup (5 minutes)

1. **Connect to your VPS**
   ```bash
   ssh root@your-vps-ip
   ```

2. **Run the setup script**
   ```bash
   wget https://raw.githubusercontent.com/yourusername/hausa-speech/main/scripts/setup-vps.sh
   chmod +x setup-vps.sh
   ./setup-vps.sh
   ```

3. **Clone your repository**
   ```bash
   cd /opt/hausa-speech
   git clone https://github.com/yourusername/hausa-speech.git .
   ```

4. **Configure environment**
   ```bash
   cp production.env.template .env.production
   nano .env.production  # Edit with your values
   ```

5. **Deploy the application**
   ```bash
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   ```

6. **Setup SSL (if you have a domain)**
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

### ✅ Done! Your API is running at:
- **HTTP**: `http://your-vps-ip`
- **HTTPS**: `https://yourdomain.com` (if SSL configured)

---

## 🐳 Option 2: Docker Deployment

### Prerequisites
- Docker and Docker Compose installed
- VPS with at least 4GB RAM

### Quick Setup (3 minutes)

1. **Clone repository**
   ```bash
   git clone https://github.com/yourusername/hausa-speech.git
   cd hausa-speech
   ```

2. **Configure environment**
   ```bash
   cp production.env.template .env.production
   nano .env.production  # Edit with your values
   ```

3. **Deploy with Docker**
   ```bash
   chmod +x scripts/deploy-docker.sh
   ./scripts/deploy-docker.sh
   ```

### ✅ Done! Your services are running:
- **API**: `http://localhost:4000`
- **Grafana**: `http://localhost:3000`
- **Kibana**: `http://localhost:5601`
- **Prometheus**: `http://localhost:9090`

---

## 🔧 Essential Configuration

### 1. Google Cloud Setup
1. Create a Google Cloud Project
2. Enable Speech-to-Text API
3. Create a service account
4. Download the JSON key file
5. Update `GOOGLE_APPLICATION_CREDENTIALS` in `.env.production`

### 2. MongoDB Setup
**Option A: MongoDB Atlas (Recommended)**
1. Create account at [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env.production`

**Option B: Self-hosted**
- MongoDB will be installed automatically with the VPS setup script

### 3. Domain & SSL (Optional)
1. Point your domain to your VPS IP
2. Run: `sudo certbot --nginx -d yourdomain.com`
3. Update `CORS_ORIGIN` in `.env.production`

---

## 📊 Monitoring & Management

### PM2 Commands (Traditional VPS)
```bash
pm2 status                    # Check status
pm2 logs hausa-speech-api     # View logs
pm2 restart hausa-speech-api  # Restart app
pm2 monit                     # Monitor resources
```

### Docker Commands
```bash
docker-compose -f docker-compose.prod.yml ps           # Check status
docker-compose -f docker-compose.prod.yml logs -f      # View logs
docker-compose -f docker-compose.prod.yml restart      # Restart services
docker stats                                            # Monitor resources
```

---

## 🔍 Health Checks

### API Health
```bash
curl http://your-domain/health
```

### Expected Response
```json
{
  "status": "ok",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "storage": "available",
    "transcription": "available"
  }
}
```

---

## 🚨 Troubleshooting

### Common Issues

1. **Port 4000 not accessible**
   ```bash
   # Check if PM2 is running
   pm2 status
   
   # Check firewall
   sudo ufw status
   ```

2. **Database connection failed**
   ```bash
   # Check MongoDB status
   sudo systemctl status mongod
   
   # Check connection string in .env.production
   ```

3. **Google Cloud errors**
   ```bash
   # Check service account file
   ls -la /opt/hausa-speech/config/gcp-service-account.json
   
   # Check environment variable
   echo $GOOGLE_APPLICATION_CREDENTIALS
   ```

4. **High memory usage**
   ```bash
   # Check memory usage
   pm2 monit
   
   # Restart if needed
   pm2 restart hausa-speech-api
   ```

### Log Locations
- **Application logs**: `/opt/hausa-speech/logs/`
- **Nginx logs**: `/var/log/nginx/`
- **System logs**: `/var/log/syslog`
- **Docker logs**: `docker-compose logs`

---

## 📈 Scaling

### Horizontal Scaling (Docker)
```bash
# Scale API to 3 instances
docker-compose -f docker-compose.prod.yml up -d --scale hausa-speech-api=3
```

### Vertical Scaling (PM2)
```bash
# Update ecosystem.config.js
# Change instances: 'max' to instances: 4
pm2 reload ecosystem.config.js
```

---

## 🔐 Security Checklist

- [ ] Change default passwords
- [ ] Setup SSL certificates
- [ ] Configure firewall
- [ ] Enable fail2ban
- [ ] Regular security updates
- [ ] Monitor logs
- [ ] Backup data regularly

---

## 📞 Support

If you encounter any issues:

1. Check the logs first
2. Review the troubleshooting section
3. Check the full [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
4. Create an issue on GitHub

---

## 🎉 Congratulations!

Your Hausa Speech-to-Text API is now deployed and ready to use! 

### Next Steps:
1. Test all API endpoints
2. Set up monitoring alerts
3. Configure automated backups
4. Scale as needed

**API Documentation**: `https://your-domain/api-docs`
**Health Check**: `https://your-domain/health`
