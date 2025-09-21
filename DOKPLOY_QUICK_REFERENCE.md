# 🚀 Dokploy Quick Reference - Hausa Speech-to-Text

## ⚡ Quick Start (5 minutes)

### 1. Setup VPS with Dokploy
```bash
# Connect to your VPS
ssh root@your-vps-ip

# Run setup script
wget https://raw.githubusercontent.com/Hkweb20/speech-hausa/scripts/setup-dokploy.sh
chmod +x setup-dokploy.sh
./setup-dokploy.sh
```

### 2. Access Dokploy Dashboard
- Open: `http://your-vps-ip:3000`
- Create admin account
- Complete setup

### 3. Deploy Application
1. **Create Project**: Name it `hausa-speech`
2. **Connect Repository**: Link your GitHub/GitLab repo
3. **Configure Environment**: Use `dokploy.env.template`
4. **Upload Files**: Add `gcp-service-account.json` to `config/`
5. **Deploy**: Click "Deploy Now"

## 🔧 Configuration Checklist

### ✅ Environment Variables
Copy from `dokploy.env.template` and configure:
- [ ] `MONGODB_URI` - MongoDB Atlas connection string
- [ ] `JWT_SECRET` - Strong secret key
- [ ] `GOOGLE_CLOUD_PROJECT_ID` - Your GCP project ID
- [ ] `GCS_BUCKET` - Google Cloud Storage bucket name
- [ ] `CORS_ORIGIN` - Your domain(s)

### ✅ Required Files
Upload to Dokploy Files tab:
- [ ] `config/gcp-service-account.json` - Google Cloud service account key
- [ ] `nginx/nginx.conf` - Nginx configuration (optional)

### ✅ Domain & SSL
- [ ] Add domain in Dokploy Domains tab
- [ ] Enable SSL (automatic Let's Encrypt)
- [ ] Test HTTPS access

## 🐳 Docker Configuration

### Dockerfile Location
```
backend/Dockerfile.dokploy
```

### Build Settings
- **Dockerfile Path**: `backend/Dockerfile.dokploy`
- **Build Context**: `.`
- **Build Command**: `npm run build`
- **Start Command**: `node dist/index.js`

### Volume Mounts
- `/opt/hausa-speech/logs` → `/app/logs`
- `/opt/hausa-speech/uploads` → `/app/uploads`
- `/opt/hausa-speech/config` → `/app/config`

## 🌐 Nginx Configuration

### Basic Setup
Dokploy will handle Nginx automatically, but you can customize:

```nginx
# Custom nginx.conf for advanced configuration
events {
    worker_connections 1024;
}

http {
    upstream hausa_api {
        server hausa-speech-api:4000;
    }
    
    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$host$request_uri;
    }
    
    server {
        listen 443 ssl http2;
        server_name yourdomain.com;
        
        location /api/ {
            proxy_pass http://hausa_api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## 📊 Monitoring & Management

### Dokploy Dashboard
- **Projects**: Manage your applications
- **Deployments**: View deployment history
- **Logs**: Real-time application logs
- **Metrics**: CPU, Memory, Network usage
- **Files**: Manage application files
- **Domains**: SSL and domain management

### Health Checks
- **API Health**: `https://yourdomain.com/health`
- **API Docs**: `https://yourdomain.com/api-docs`
- **Dokploy Status**: `http://your-vps-ip:3000`

## 🔄 Deployment Workflow

### Automatic Deployment
1. Enable "Auto Deploy on Push" in project settings
2. Push to your main branch
3. Dokploy automatically builds and deploys

### Manual Deployment
1. Go to Deployments tab
2. Click "Deploy Now"
3. Select commit to deploy
4. Monitor build progress

### Rollback
1. Go to Deployments tab
2. Select previous deployment
3. Click "Deploy" to rollback

## 🚨 Troubleshooting

### Common Issues

#### Build Fails
```bash
# Check build logs in Dokploy
# Common fixes:
- Verify Dockerfile syntax
- Check all dependencies in package.json
- Ensure all files are committed
```

#### Application Won't Start
```bash
# Check application logs
# Common fixes:
- Verify environment variables
- Check file permissions
- Ensure all required files are present
```

#### Database Connection Failed
```bash
# Check MongoDB Atlas settings
# Verify MONGODB_URI format:
mongodb+srv://username:password@cluster.mongodb.net/database
```

#### SSL Certificate Issues
```bash
# Check domain DNS settings
# Ensure domain points to your VPS IP
# Verify domain is added in Dokploy Domains tab
```

### Log Locations
- **Application Logs**: Dokploy Dashboard → Logs tab
- **Build Logs**: Dokploy Dashboard → Deployments tab
- **System Logs**: `sudo journalctl -u dokploy -f`

## 📈 Scaling

### Horizontal Scaling
1. Go to project Settings
2. Increase number of replicas
3. Configure load balancing
4. Monitor performance

### Vertical Scaling
1. Go to project Settings
2. Increase CPU/Memory limits
3. Restart application
4. Monitor resource usage

## 🔐 Security

### Environment Variables
- Never commit secrets to Git
- Use strong, unique passwords
- Rotate secrets regularly

### Network Security
- Use HTTPS only
- Configure proper CORS
- Enable rate limiting

### Application Security
- Keep dependencies updated
- Use non-root containers
- Implement proper error handling

## 📞 Support

### Dokploy Resources
- **Documentation**: https://dokploy.com/docs
- **GitHub**: https://github.com/dokploy/dokploy
- **Discord**: https://discord.gg/dokploy

### Application Resources
- **API Documentation**: `https://yourdomain.com/api-docs`
- **Health Check**: `https://yourdomain.com/health`
- **Project Repository**: Your GitHub/GitLab repo

## 🎯 Success Checklist

- [ ] Dokploy installed and running
- [ ] Project created and configured
- [ ] Repository connected
- [ ] Environment variables set
- [ ] Google Cloud service account uploaded
- [ ] Domain configured with SSL
- [ ] Application deployed successfully
- [ ] Health check passing
- [ ] API documentation accessible
- [ ] File upload working
- [ ] Database connected
- [ ] Monitoring configured

## 🚀 Advanced Features

### Custom Domains
- Add multiple domains
- Configure subdomains
- Set up redirects

### Environment Management
- Create staging environment
- Manage different configs
- Deploy to multiple environments

### Backup & Recovery
- Enable automatic backups
- Configure backup schedule
- Test recovery procedures

### Monitoring & Alerts
- Set up resource alerts
- Configure log monitoring
- Enable performance tracking

---

**🎉 Congratulations!** Your Hausa Speech-to-Text API is now deployed with Dokploy!

**Quick Access:**
- **API**: `https://yourdomain.com/api`
- **Health**: `https://yourdomain.com/health`
- **Docs**: `https://yourdomain.com/api-docs`
- **Dokploy**: `http://your-vps-ip:3000`
