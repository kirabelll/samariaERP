#!/bin/bash

# Debug deployment script for Samaria ERP
echo "=== Samaria ERP Deployment Debug ==="
echo ""

# Check if containers are running
echo "🔍 Checking running containers..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Check container logs
echo "🔍 Checking app container logs (last 20 lines)..."
docker-compose logs --tail=20 app
echo ""

echo "🔍 Checking database container logs (last 10 lines)..."
docker-compose logs --tail=10 db
echo ""

# Test database connection
echo "🔍 Testing database connection..."
docker-compose exec db pg_isready -U postgres -d samaria_erp
echo ""

# Test health endpoint
echo "🔍 Testing health endpoint..."
docker-compose exec app curl -f http://localhost:3001/api/health || echo "Health check failed"
echo ""

# Check network connectivity
echo "🔍 Checking network connectivity..."
docker network ls | grep samaria
echo ""

echo "🔍 Checking port binding..."
netstat -tulpn | grep :3001 || echo "Port 3001 not bound"
echo ""

echo "=== Debug Complete ==="