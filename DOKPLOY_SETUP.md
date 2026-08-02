# Nginx Proxy Deployment Setup for Samaria ERP

## 🚀 Docker Deployment with Nginx Proxy

### 1. **DNS Configuration**
Make sure your domain points to your server's IP address:
```
A record: app.samariaerp.org → YOUR_SERVER_IP
```

### 2. **Nginx Proxy Deployment Setup**

#### Application Configuration:
- **Type**: Docker Compose
- **Name**: samaria-erp
- **Repository**: Your Git repository URL
- **Branch**: main/master
- **Docker Compose File**: `docker-compose.yml`
- **Build Path**: `.`

#### Port Configuration:
- **HTTP**: Port 80 (redirects to HTTPS)
- **HTTPS**: Port 443 (main access point)
- **HTTP Fallback**: Port 8080 (development)
- **Access URL**: `https://app.samariaerp.org`

#### Environment Variables:
```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres:kirabel@123@db:5432/samaria_erp
NEXTAUTH_SECRET=samaria1995
NEXTAUTH_URL=https://app.samariaerp.org
NEXT_PUBLIC_APP_URL=https://app.samariaerp.org
HOSTNAME=0.0.0.0
PORT=3000
```

### 3. **SSL Certificate Setup**

#### Option A: Self-signed certificates (Development)
```bash
# Generate self-signed certificates
bash scripts/generate-ssl-cert.sh
```

#### Option B: Let's Encrypt certificates (Production)
```bash
# Install certbot and generate certificates
sudo apt install certbot
sudo certbot certonly --standalone -d app.samariaerp.org

# Copy certificates to nginx/ssl/
sudo cp /etc/letsencrypt/live/app.samariaerp.org/fullchain.pem nginx/ssl/app.samariaerp.org.crt
sudo cp /etc/letsencrypt/live/app.samariaerp.org/privkey.pem nginx/ssl/app.samariaerp.org.key
sudo chown $USER:$USER nginx/ssl/app.samariaerp.org.*
```

### 4. **Deployment Steps**

1. **Prepare SSL certificates** (see section 3)
2. **Push your code** to Git repository
3. **Run deployment** command:
   ```bash
   docker-compose up --build -d
   ```
4. **Check status**:
   ```bash
   docker-compose ps
   docker-compose logs -f nginx
   docker-compose logs -f app
   ```
5. **Access application**: `https://app.samariaerp.org`

### 5. **Service Architecture**

```
Internet → Nginx Proxy (Port 80/443) → Next.js App (Port 3000) → PostgreSQL DB
```

- **Nginx**: Handles SSL termination, static files, and proxying
- **Next.js App**: Runs on internal port 3000 (not exposed)
- **PostgreSQL**: Database on internal network

### 6. **Troubleshooting**

#### If getting connection issues:
1. Check nginx logs: `docker-compose logs nginx`
2. Check app logs: `docker-compose logs app`
3. Verify SSL certificates: `ls -la nginx/ssl/`
4. Test nginx configuration: `docker-compose exec nginx nginx -t`

#### If SSL issues:
1. Verify certificate files exist and have correct permissions
2. Check certificate validity: `openssl x509 -in nginx/ssl/app.samariaerp.org.crt -text -noout`
3. Use HTTP fallback: `http://app.samariaerp.org:8080`

#### If database connection fails:
1. Check PostgreSQL container status: `docker-compose ps`
2. Verify DATABASE_URL environment variable
3. Check network connectivity: `docker-compose exec app ping db`

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