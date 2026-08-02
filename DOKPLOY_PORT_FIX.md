# 🔧 Dokploy Port Conflict Fix

## Issue
Dokploy runs on port 3000 by default, causing conflicts with Next.js applications that also use port 3000.

## ✅ Solution Applied
Changed application port from **3000** to **3001** to avoid conflict with Dokploy.

## Files Updated
- `docker-compose.yml` - Port mapping and environment variables
- `Dockerfile` - EXPOSE directive and health check
- `DOKPLOY_SETUP.md` - Documentation updated

## ⚙️ Configuration Changes

### Port Mapping
```yaml
ports:
  - "3001:3001"  # Changed from 3000:3000
```

### Environment Variables
```yaml
environment:
  PORT: 3001  # Changed from 3000
```

### Traefik Labels
```yaml
- "traefik.http.services.samaria-app.loadbalancer.server.port=3001"
```

## 🚀 Deployment Instructions

1. **Update Dokploy Environment Variables**:
   - In Dokploy dashboard, change `PORT=3001`
   
2. **Redeploy Application**:
   ```bash
   # Dokploy will automatically rebuild with new configuration
   # Or manually rebuild:
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

3. **Verify Deployment**:
   - Check https://app.samariaerp.org
   - Verify health check: https://app.samariaerp.org/api/health
   
## 🔍 Troubleshooting

### Check if port 3001 is available:
```bash
# Linux/Mac
netstat -tulpn | grep :3001

# Windows
netstat -an | findstr :3001
```

### Debug deployment:
```bash
# Use the debug script
./debug-deployment.bat
```

## 📋 Common Dokploy Port Issues

- **Port 3000**: Dokploy UI
- **Port 80**: HTTP (Traefik)
- **Port 443**: HTTPS (Traefik)
- **Port 3001**: Your Application (after fix)

Always use ports **3001+** for applications when using Dokploy!