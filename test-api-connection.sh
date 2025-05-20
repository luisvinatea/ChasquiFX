#!/bin/bash

# Test script for checking ChasquiFX API connection

# Define color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
# shellcheck disable=SC2034
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="https://chasquifx-api.vercel.app"

echo -e "${BLUE}🔍 Testing connection to ChasquiFX API...${NC}"

# Check health endpoint
echo -e "\n${BLUE}Checking health endpoint:${NC}"
HEALTH_RESPONSE=$(curl -s "$API_URL/health")
if [[ $HEALTH_RESPONSE == *"healthy"* ]]; then
    echo -e "${GREEN}✅ Health endpoint responding correctly${NC}"
    echo -e "${BLUE}Response:${NC} $HEALTH_RESPONSE"
else
    echo -e "${RED}❌ Health endpoint not responding correctly${NC}"
    echo -e "${BLUE}Response:${NC} $HEALTH_RESPONSE"
fi

# Check DB status endpoint
echo -e "\n${BLUE}Checking DB status endpoint:${NC}"
DB_STATUS_RESPONSE=$(curl -s "$API_URL/api/db-status")
if [[ $DB_STATUS_RESPONSE == *"connected"* ]]; then
    echo -e "${GREEN}✅ DB status endpoint responding correctly${NC}"
    echo -e "${BLUE}Response:${NC} $DB_STATUS_RESPONSE"
else
    echo -e "${RED}❌ DB status endpoint not responding correctly${NC}"
    echo -e "${BLUE}Response:${NC} $DB_STATUS_RESPONSE"
fi

# Check forex status endpoint
echo -e "\n${BLUE}Checking forex status endpoint:${NC}"
FOREX_STATUS_RESPONSE=$(curl -s "$API_URL/api/v2/forex/status")
if [[ $FOREX_STATUS_RESPONSE == *"status"* ]]; then
    echo -e "${GREEN}✅ Forex status endpoint responding correctly${NC}"
    echo -e "${BLUE}Response:${NC} $FOREX_STATUS_RESPONSE"
else
    echo -e "${RED}❌ Forex status endpoint not responding correctly${NC}"
    echo -e "${BLUE}Response:${NC} $FOREX_STATUS_RESPONSE"
fi

echo -e "\n${BLUE}Testing frontend access to API (with CORS headers):${NC}"
CORS_TEST=$(curl -s -I -X OPTIONS -H "Origin: https://chasquifx-web.vercel.app" "$API_URL/health")
if [[ $CORS_TEST == *"Access-Control-Allow-Origin"* ]]; then
    echo -e "${GREEN}✅ CORS headers are correctly configured${NC}"
    echo -e "${BLUE}Headers:${NC}\n$CORS_TEST"
else
    echo -e "${RED}❌ CORS headers not properly configured${NC}"
    echo -e "${BLUE}Headers:${NC}\n$CORS_TEST"
fi

echo -e "\n${BLUE}Test complete!${NC}"
exit 0
