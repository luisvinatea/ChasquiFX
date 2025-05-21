#!/bin/bash

# Test script for checking CORS configuration

# Set colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API URL - Production Vercel deployment
API_URL="https://chasquifx-api.vercel.app"

echo -e "${BLUE}Testing CORS configuration for ChasquiFX API${NC}"
echo -e "${BLUE}API URL: ${API_URL}${NC}"

# Test CORS headers with preflight (OPTIONS) request
echo -e "\n${BLUE}Testing CORS headers on /health endpoint:${NC}"
CORS_TEST=$(curl -s -I -X OPTIONS -H "Origin: https://chasquifx-web.vercel.app" "${API_URL}/health")

if [[ $CORS_TEST == *"Access-Control-Allow-Origin"* ]]; then
    echo -e "${GREEN}✅ CORS headers are present${NC}"
    echo -e "${BLUE}Headers:${NC}"
    echo "$CORS_TEST" | grep -i "Access-Control"
else
    echo -e "${RED}❌ CORS headers are missing${NC}"
    echo -e "${BLUE}Response headers:${NC}"
    echo "$CORS_TEST"
fi

# Test CORS headers on /api/v2/forex/status endpoint
echo -e "\n${BLUE}Testing CORS headers on /api/v2/forex/status endpoint:${NC}"
CORS_TEST_FOREX=$(curl -s -I -X OPTIONS -H "Origin: https://chasquifx-web.vercel.app" "${API_URL}/api/v2/forex/status")

if [[ $CORS_TEST_FOREX == *"Access-Control-Allow-Origin"* ]]; then
    echo -e "${GREEN}✅ CORS headers are present on forex endpoint${NC}"
    echo -e "${BLUE}Headers:${NC}"
    echo "$CORS_TEST_FOREX" | grep -i "Access-Control"
else
    echo -e "${RED}❌ CORS headers are missing on forex endpoint${NC}"
    echo -e "${BLUE}Response headers:${NC}"
    echo "$CORS_TEST_FOREX"
fi

# Test actual GET request with CORS headers
echo -e "\n${BLUE}Testing actual GET request with CORS:${NC}"
HEALTH_TEST=$(curl -s -H "Origin: https://chasquifx-web.vercel.app" "${API_URL}/health")

if [[ $HEALTH_TEST == *"status"* ]]; then
    echo -e "${GREEN}✅ GET request successful${NC}"
    echo -e "${BLUE}Response:${NC}"
    echo "$HEALTH_TEST" | grep -i "status"
else
    echo -e "${RED}❌ GET request failed${NC}"
    echo -e "${BLUE}Response:${NC}"
    echo "$HEALTH_TEST"
fi

echo -e "\n${BLUE}CORS testing complete!${NC}"
echo -e "${BLUE}If CORS headers are missing, remember these changes may take time to deploy.${NC}"
echo -e "${BLUE}You will need to re-deploy the API to Vercel for these changes to take effect.${NC}"
