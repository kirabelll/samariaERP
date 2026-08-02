#!/bin/bash
# Generate self-signed SSL certificates for development

set -e

echo "🔐 Generating self-signed SSL certificates for app.samariaerp.org..."

# Create SSL directory if it doesn't exist
mkdir -p nginx/ssl

# Generate private key and certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/app.samariaerp.org.key \
    -out nginx/ssl/app.samariaerp.org.crt \
    -subj "/C=ET/ST=Addis Ababa/L=Addis Ababa/O=Samaria ERP/CN=app.samariaerp.org"

# Set proper permissions
chmod 600 nginx/ssl/app.samariaerp.org.key
chmod 644 nginx/ssl/app.samariaerp.org.crt

echo "✅ SSL certificates generated successfully!"
echo "📁 Certificate: nginx/ssl/app.samariaerp.org.crt"
echo "🔑 Private key: nginx/ssl/app.samariaerp.org.key"
echo ""
echo "⚠️  Note: These are self-signed certificates for development only."
echo "   For production, use proper SSL certificates from a trusted CA or Let's Encrypt."