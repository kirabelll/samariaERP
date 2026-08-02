#!/bin/bash
# Deploy Samaria ERP with Nginx proxy

set -e

echo "🚀 Deploying Samaria ERP with Nginx Proxy..."

# Check if SSL certificates exist
if [ ! -f "nginx/ssl/app.samariaerp.org.crt" ] || [ ! -f "nginx/ssl/app.samariaerp.org.key" ]; then
    echo "📜 SSL certificates not found. Generating self-signed certificates..."
    bash scripts/generate-ssl-cert.sh
fi

# Build and start services
echo "🏗️  Building and starting Docker services..."
docker-compose down --remove-orphans
docker-compose up --build -d

# Wait a moment for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check service status
echo "📊 Checking service status..."
docker-compose ps

# Test health endpoints
echo "🏥 Testing health endpoints..."
echo "Nginx health check:"
curl -f http://localhost/health || echo "❌ Nginx health check failed"

echo -e "\nApp health check:"
curl -f http://localhost/api/health || echo "❌ App health check failed"

echo -e "\n✅ Deployment complete!"
echo "🔗 Access your application at:"
echo "  - HTTPS: https://app.samariaerp.org"
echo "  - HTTP (redirect): http://app.samariaerp.org" 
echo "  - HTTP fallback: http://app.samariaerp.org:8080"
echo ""
echo "📋 To check logs:"
echo "  docker-compose logs -f nginx"
echo "  docker-compose logs -f app"
echo "  docker-compose logs -f db"