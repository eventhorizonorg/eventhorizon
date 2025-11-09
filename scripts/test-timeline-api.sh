#!/bin/bash
# Simple smoke test for Timeline API using curl
# Usage: ./scripts/test-timeline-api.sh

API_URL="${API_URL:-http://localhost:3000}"

# Calculate dates (last 7 days) - macOS compatible
END_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
if [[ "$(uname)" == "Darwin" ]]; then
  # macOS
  START_DATE=$(date -u -v-7d +"%Y-%m-%dT%H:%M:%SZ")
else
  # Linux
  START_DATE=$(date -u -d "7 days ago" +"%Y-%m-%dT%H:%M:%SZ")
fi

URL="${API_URL}/api/timeline?startDate=${START_DATE}&endDate=${END_DATE}&page=1&limit=5"

echo "🧪 Testing Timeline API..."
echo "📍 URL: ${URL}"
echo "📅 Date Range: ${START_DATE} to ${END_DATE}"
echo ""

# Get response - separate body and status code
response=$(curl -s -w "\nHTTPCODE:%{http_code}" "${URL}")
http_code=$(echo "${response}" | grep "HTTPCODE:" | cut -d: -f2)
body=$(echo "${response}" | sed '/HTTPCODE:/d')

echo "✅ HTTP Status: ${http_code}"
echo "📊 Response:"
if command -v jq >/dev/null 2>&1; then
  echo "${body}" | jq '.'
else
  echo "${body}"
fi
echo ""

if [ "${http_code}" -eq 200 ]; then
  if echo "${body}" | grep -q '"status":"success"'; then
    status="success"
    # Extract count using grep and cut (works on both macOS and Linux)
    count=$(echo "${body}" | grep -o '"count":[0-9]*' | head -1 | cut -d':' -f2)
    if [ -z "${count}" ]; then
      count="0"
    fi
    echo "✅ Smoke test passed! Posts returned: ${count}"
    exit 0
  else
    status=$(echo "${body}" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -z "${status}" ]; then
      status="unknown"
    fi
    echo "⚠️  API returned error status: ${status}"
    if echo "${body}" | grep -q '"message"'; then
      message=$(echo "${body}" | grep -o '"message":"[^"]*"' | head -1 | cut -d'"' -f4)
      echo "   Error message: ${message}"
    fi
    exit 1
  fi
else
  echo "❌ Smoke test failed with HTTP ${http_code}"
  exit 1
fi

