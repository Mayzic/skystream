#!/bin/bash

# SkyStream - Flight Price Aggregator
# Startup script for all services

echo "🚀 Starting SkyStream services..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a service is running
check_service() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${RED}❌ Port $1 is already in use${NC}"
        exit 1
    fi
}

# Check ports
check_service 27017  # MongoDB
check_service 3000  # API Server
check_service 8501  # Streamlit

# Create data directory if not exists
mkdir -p data

# Start MongoDB
echo -e "${YELLOW}📦 Starting MongoDB...${NC}"
mongod --dbpath ./data --port 27017 --logpath ./data/mongodb.log --fork
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ MongoDB started on port 27017${NC}"
else
    echo -e "${RED}❌ Failed to start MongoDB${NC}"
    exit 1
fi

# Wait for MongoDB to start
sleep 3

# Start API Server
echo -e "${YELLOW}🔌 Starting API Server...${NC}"
node src/api-server.js > logs/api-server.log 2>&1 &
API_PID=$!
echo -e "${GREEN}✅ API Server started on port 3000 (PID: $API_PID)${NC}"

# Wait for API Server to start
sleep 2

# Start Streamlit Web Interface
echo -e "${YELLOW}🌐 Starting Streamlit Web Interface...${NC}"
streamlit run web/app.py --server.headless true --server.port 8501 > logs/web.log 2>&1 &
WEB_PID=$!
echo -e "${GREEN}✅ Streamlit Web Interface started on port 8501 (PID: $WEB_PID)${NC}"

# Save PIDs
echo $API_PID > .api-server.pid
echo $WEB_PID > .web.pid

echo ""
echo -e "${GREEN}🎉 All services started successfully!${NC}"
echo ""
echo "📊 Services:"
echo "  - MongoDB:      http://localhost:27017"
echo "  - API Server:   http://localhost:3000"
echo "  - Web Interface: http://localhost:8501"
echo ""
echo "📝 Logs:"
echo "  - MongoDB:      ./data/mongodb.log"
echo "  - API Server:   ./logs/api-server.log"
echo "  - Web Interface: ./logs/web.log"
echo ""
echo "🛑 To stop all services, run: ./stop.sh"
