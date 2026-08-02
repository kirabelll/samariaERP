@echo off
echo === Samaria ERP Deployment Debug ===
echo.

echo 🔍 Checking running containers...
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.

echo 🔍 Checking app container logs (last 20 lines)...
docker-compose logs --tail=20 app
echo.

echo 🔍 Checking database container logs (last 10 lines)...
docker-compose logs --tail=10 db
echo.

echo 🔍 Testing database connection...
docker-compose exec db pg_isready -U postgres -d samaria_erp
echo.

echo 🔍 Testing health endpoint...
docker-compose exec app curl -f http://localhost:3001/api/health
echo.

echo 🔍 Checking network connectivity...
docker network ls | findstr samaria
echo.

echo === Debug Complete ===
pause