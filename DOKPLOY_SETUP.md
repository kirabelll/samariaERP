# Direct Deployment Setup for Samaria ERP

## 🚀 Simple Docker Deployment (No Traefik)

### 1. **DNS Configuration**
Make sure your domain points to your server's IP address:
```
A record: app.samariaerp.org → YOUR_SERVER_IP
```

### 2. **Direct Deployment Setup**

#### Application Configuration:
- **Type**: Docker Compose
- **Name**: samaria-erp
- **Repository**: Your Git repository URL
- **Branch**: main/master
- **Docker Compose File**: `docker-compose.yml`
- **Build Path**: `.`

#### Port Configuration:
- **Application runs on**: Port 80 (mapped from internal 3000)
- **Access URL**: `http://app.samariaerp.org`
- **No SSL/HTTPS**: Direct HTTP access

#### Environment Variables:
```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres:kirabel@123@db:5432/samaria_erp
NEXTAUTH_SECRET=samaria1995
NEXTAUTH_URL=http://app.samariaerp.org
NEXT_PUBLIC_APP_URL=http://app.samariaerp.org
HOSTNAME=0.0.0.0
PORT=3000
```

### 3. **Deployment Steps**

1. **Push your code** to Git repository
2. **Run deployment** command:
   ```bash
   docker-compose up --build -d
   ```
3. **Check status**:
   ```bash
   docker-compose ps
   docker-compose logs -f app
   ```
4. **Access application**: `http://app.samariaerp.org`

### 4. **Troubleshooting**

#### If getting connection issues:
1. Check container logs: `docker-compose logs app`
2. Verify database connection: `docker-compose logs db`
3. Check port 80 is not blocked
4. Ensure DNS points to server

#### If database connection fails:
1. Check PostgreSQL container status: `docker-compose ps`
2. Verify DATABASE_URL environment variable
3. Check network connectivity between containers

### 5. **Expected URLs**
- **Application**: http://app.samariaerp.org (port 80)
- **Health Check**: http://app.samariaerp.org/api/health
- **Admin Login**: http://app.samariaerp.org/login
  - Username: `admin`
  - Password: `admin123`

## 📋 **Final Checklist**
- [ ] DNS points to server IP
- [ ] Port 80 is open and available
- [ ] Environment variables set correctly
- [ ] Application deployed successfully
- [ ] Health check responds with 200 OK
- [ ] Can access http://app.samariaerp.org