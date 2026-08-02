# Dokploy Deployment Setup for Samaria ERP

## 🚀 Quick Setup Guide

### 1. **DNS Configuration**
Make sure your domain `app.samariaerp.org` points to your Dokploy server's IP address:
```
A record: app.samariaerp.org → YOUR_SERVER_IP
```

### 2. **Dokploy Application Setup**

#### Create New Application:
- **Type**: Docker Compose
- **Name**: samaria-erp
- **Repository**: Your Git repository URL
- **Branch**: main/master
- **Docker Compose File**: `docker-compose.yml`
- **Build Path**: `.`

#### Domain Configuration:
- **Domain**: `app.samariaerp.org`
- **Port**: `3000`
- **SSL**: Enable (Let's Encrypt)
- **Redirect HTTP to HTTPS**: ✅ Enable

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

### 3. **Network Requirements**
- Ensure Dokploy network exists: `dokploy`
- Traefik should be running on ports 80/443
- Container should be accessible on internal network

### 4. **Health Check**
- Health endpoint: `/api/health`
- Should return JSON with status information
- Traefik will use this for load balancer health checks

### 5. **Deployment Steps**

1. **Push your code** to Git repository
2. **Create application** in Dokploy dashboard
3. **Configure domain and SSL**
4. **Set environment variables**
5. **Deploy** the application
6. **Monitor logs** for successful startup

### 6. **Troubleshooting**

#### If getting 502 Bad Gateway:
1. Check container logs: `docker logs <container_name>`
2. Verify database connection
3. Check Traefik labels in docker-compose
4. Ensure port 3000 is exposed

#### If SSL issues:
1. Verify DNS points to server
2. Check Let's Encrypt certificate generation
3. Ensure Traefik is properly configured

#### If database connection fails:
1. Check PostgreSQL container status
2. Verify DATABASE_URL environment variable
3. Check network connectivity between containers

### 7. **Expected URLs**
- **Application**: https://app.samariaerp.org
- **Health Check**: https://app.samariaerp.org/api/health
- **Admin Login**: https://app.samariaerp.org/login
  - Username: `admin`
  - Password: `admin123`

## 📋 **Final Checklist**
- [ ] DNS points to server IP
- [ ] Dokploy application created
- [ ] Domain configured with SSL
- [ ] Environment variables set
- [ ] Application deployed successfully
- [ ] Health check responds with 200 OK
- [ ] Can access https://app.samariaerp.org