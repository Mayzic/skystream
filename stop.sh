#!/bin/bash

# SkyStream - Stop all services

echo "🛑 Stopping SkyStream services..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Stop API Server
if [ -f .api-server.pid ]; then
    API_PID=$(cat .api-server.pid)
    if ps -p $API_PID > /dev/null 2>&1; then
        kill $API_PID
        echo -e "${GREEN}✅ API Server stopped (PID: $API_PID)${NC}"
    else
        echo -e "${YELLOW}⚠️  API Server process not found${NC}"
    fi
    rm .api-server.pid
fi

# Stop Web Interface
if [ -f .web.pid ]; then
    WEB_PID=$(cat .web.pid)
    if ps -p $WEB_PID > /dev/null 2>&1; then
        kill $WEB_PID
        echo -e "${GREEN}✅ Web Interface stopped (PID: $WEB_PID)${NC}"
    else
        echo -e "${YELLOW}⚠️  Web Interface process not found${NC}"
    fi
    rm .web.pid
fi

# Stop MongoDB
echo -e "${YELLOW}📦 Stopping MongoDB...${NC}"
mongod --dbpath ./data --port 27017 --shutdown
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ MongoDB stopped${NC}"
else
    echo -e "${YELLOW}⚠️  MongoDB may not be running or needs manual shutdown${NC}"
fi

# Kill any remaining processes on ports
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:8501 | xargs kill -9 2>/dev/null

echo ""
echo -e "${GREEN}🎉 All services stopped${NC}"
