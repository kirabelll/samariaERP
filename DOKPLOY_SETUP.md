# Dokploy Deployment Setup for Samaria ERP

## 🚀 Docker Deployment with Traefik Proxy (Dokploy)

### 1. **DNS Configuration**
Make sure your domain points to your server's IP address:
```
A record: app.samariaerp.org → YOUR_SERVER_IP
```

### 2. **Dokploy Deployment Setup**

#### Application Configuration:
- **Type**: Docker Compose
- **Name**: samaria-erp
- **Repository**: Your Git repository URL
- **Branch**: main/master
- **Docker Compose File**: `docker-compose.yml`
- **Build Path**: `.`

#### Environment Variables (Set in Dokploy):
```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres:kirabel@123@db:5432/samaria_erp
NEXTAUTH_SECRET=samaria1995
NEXTAUTH_URL=https://app.samariaerp.org
NEXT_PUBLIC_APP_URL=https://app.samariaerp.org
HOSTNAME=0.0.0.0
PORT=3001
```

### 3. **Traefik Configuration (Automatic)**

Dokploy automatically configures Traefik with the labels in docker-compose.yml:
- **Domain**: app.samariaerp.org
- **SSL**: Automatic Let's Encrypt certificates
- **HTTP to HTTPS**: Automatic redirect
- **Health checks**: Configured for /api/health endpoint

### 4. **Deployment Steps**

1. **Configure Dokploy project**:
   - Create new application in Dokploy
   - Set repository URL and branch
   - Configure environment variables
   
2. **Deploy**:
   - Dokploy will automatically build and deploy
   - Traefik will handle SSL and routing
   - Application will be available at https://app.samariaerp.org

### 5. **Service Architecture**

```
Internet → Traefik (SSL/Proxy) → Next.js App (Port 3001) → PostgreSQL DB
```

- **Traefik**: Handles SSL termination, routing, and Let's Encrypt certificates
- **Next.js App**: Runs on internal port 3001 (managed by Dokploy network)
- **PostgreSQL**: Database on internal Docker network

### 6. **Troubleshooting**

#### If deployment fails:
1. **Check Dokploy logs** in the application dashboard
2. **Check build logs** for Docker build errors
3. **Verify environment variables** are set correctly
4. **Check database connectivity**: 
   ```bash
   # In Dokploy terminal
   docker-compose exec app npx prisma db push
   ```

#### If application doesn't start:
1. **Check application logs** in Dokploy dashboard
2. **Verify database connection**: Check DATABASE_URL format
3. **Check health endpoint**: Visit `/api/health` 
4. **Restart services**: Use Dokploy restart button

#### Common issues:
- **502 Bad Gateway**: App container not healthy, check app logs
- **SSL certificate errors**: Traefik is getting Let's Encrypt cert automatically
- **Database connection**: Ensure DATABASE_URL points to `db:5432`

### 7. **Expected URLs**
- **Main Application**: https://app.samariaerp.org (HTTPS with Let's Encrypt SSL)
- **HTTP Redirect**: http://app.samariaerp.org → automatically redirects to HTTPS
- **Health Check**: https://app.samariaerp.org/api/health
- **Admin Login**: https://app.samariaerp.org/login
  - Username: `admin`
  - Password: `admin123`

### 8. **Dokploy Features**
- **Automatic SSL**: Let's Encrypt certificates managed by Traefik
- **Zero-downtime deployment**: Rolling updates
- **Health monitoring**: Application health checks
- **Log management**: Centralized logs in Dokploy dashboard
- **Automatic backup**: Database backups (if configured)
- **Domain management**: Easy domain and SSL management

## 📋 **Final Checklist**
- [ ] DNS points to server IP (A record)
- [ ] Dokploy application configured
- [ ] Environment variables set in Dokploy
- [ ] Repository URL and branch configured
- [ ] Deployment successful (green status)
- [ ] All containers healthy (db, app)
- [ ] Can access https://app.samariaerp.org
- [ ] Health check responds with 200 OK
- [ ] Admin login works
- [ ] SSL certificate active (Let's Encrypt)

## 🔧 **Dokploy Management**

### Application Monitoring
- **Status**: Check in Dokploy dashboard
- **Logs**: Real-time logs available
- **Resources**: CPU, Memory usage monitoring
- **Deployments**: History and rollback options

### Database Management
```bash
# Access database (via Dokploy terminal)
docker-compose exec db psql -U postgres -d samaria_erp

# Run migrations
docker-compose exec app npx prisma migrate deploy

# Seed database
docker-compose exec app node prisma/seed.mjs
```

### Updates and Deployment
1. **Push code** to Git repository
2. **Trigger deployment** in Dokploy (automatic or manual)
3. **Monitor deployment** progress in dashboard
4. **Verify application** is running correctly

### 7. **Expected URLs**
- **Main Application**: https://app.samariaerp.org (HTTPS with SSL)
- **HTTP Redirect**: http://app.samariaerp.org → redirects to HTTPS
- **Development Fallback**: http://app.samariaerp.org:8080 (HTTP only)
- **Health Check**: https://app.samariaerp.org/api/health
- **Nginx Health**: https://app.samariaerp.org/health
- **Admin Login**: https://app.samariaerp.org/login
  - Username: `admin`
  - Password: `admin123`

### 8. **Security Features**
- **SSL/TLS encryption** for all traffic
- **HTTP to HTTPS redirect** automatic
- **Security headers** (HSTS, X-Frame-Options, etc.)
- **Rate limiting** for API endpoints
- **Gzip compression** for better performance
- **Static file caching** with proper cache headers

## 📋 **Final Checklist**
- [ ] DNS points to server IP
- [ ] Ports 80, 443, and 8080 are open
- [ ] SSL certificates are in place (nginx/ssl/)
- [ ] Environment variables set correctly
- [ ] Docker Compose deployed successfully
- [ ] Nginx service is running and healthy
- [ ] App service is running and healthy
- [ ] Database service is running and healthy
- [ ] Can access https://app.samariaerp.org
- [ ] Health checks respond with 200 OK
- [ ] HTTP redirects to HTTPS properly

## 🔧 **Advanced Configuration**

### Custom Nginx Configuration
To modify nginx settings, edit `nginx/nginx.conf` and restart:
```bash
docker-compose restart nginx
```

### SSL Certificate Renewal (Let's Encrypt)
```bash
# Renew certificates
sudo certbot renew

# Update Docker volumes
sudo cp /etc/letsencrypt/live/app.samariaerp.org/fullchain.pem nginx/ssl/app.samariaerp.org.crt
sudo cp /etc/letsencrypt/live/app.samariaerp.org/privkey.pem nginx/ssl/app.samariaerp.org.key

# Reload nginx
docker-compose exec nginx nginx -s reload
```