#!/bin/bash

# Configuration
API_URL="http://localhost:3000/api"
USER_ID="15"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🚀 Starting NutriHelp API Smoke Test..."

check_endpoint() {
    local name=$1
    local url=$2
    echo -n "Testing $name... "
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$response" == "200" ] || [ "$response" == "201" ]; then
        echo -e "${GREEN}PASS ($response)${NC}"
    else
        echo -e "${RED}FAIL ($response)${NC}"
    fi
}

# 1. Test Recipes
check_endpoint "Get Recipes" "$API_URL/recipes?user_id=$USER_ID"

# 2. Test Water Intake
check_endpoint "Get Water Intake" "$API_URL/water?user_id=$USER_ID"

# 3. Test Appointments
check_endpoint "Get Appointments" "$API_URL/appointments?user_id=$USER_ID"

# 4. Test Validation (Should fail with 400)
echo -n "Testing Validation Error (Missing ID)... "
val_response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/recipes")
if [ "$val_response" == "400" ]; then
    echo -e "${GREEN}PASS (400)${NC}"
else
    echo -e "${RED}FAIL ($val_response)${NC}"
fi

echo "🏁 Smoke test complete."
