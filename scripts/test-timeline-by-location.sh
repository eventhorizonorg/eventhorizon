#!/bin/bash
# Test Timeline API filtered by location
# Example: ./scripts/test-timeline-by-location.sh <locationId>
# To find locationId, query Supabase locations_master table

API_URL="${API_URL:-http://localhost:3000}"
LOCATION_ID="${1:-}"

if [ -z "${LOCATION_ID}" ]; then
  echo "Usage: $0 <locationId>"
  echo ""
  echo "To find location IDs, you can query the database:"
  echo "  SELECT id, name FROM locations_master WHERE name ILIKE '%United States%';"
  echo ""
  echo "Or use the API to search for locations first."
  exit 1
fi

# Calculate dates (last 30 days) - macOS compatible
END_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
if [[ "$(uname)" == "Darwin" ]]; then
  # macOS
  START_DATE=$(date -u -v-30d +"%Y-%m-%dT%H:%M:%SZ")
else
  # Linux
  START_DATE=$(date -u -d "30 days ago" +"%Y-%m-%dT%H:%M:%SZ")
fi

URL="${API_URL}/api/timeline?startDate=${START_DATE}&endDate=${END_DATE}&locationId=${LOCATION_ID}&page=1&limit=20"

echo "🧪 Testing Timeline API with Location Filter..."
echo "📍 Location ID: ${LOCATION_ID}"
echo "🔗 URL: ${URL}"
echo "📅 Date Range: ${START_DATE} to ${END_DATE}"
echo ""

# Get response
response=$(curl -s -w "\nHTTPCODE:%{http_code}" "${URL}")
http_code=$(echo "${response}" | grep "HTTPCODE:" | cut -d: -f2)
body=$(echo "${response}" | sed '/HTTPCODE:/d')

echo "✅ HTTP Status: ${http_code}"
echo "📊 Response:"
if command -v jq >/dev/null 2>&1; then
  echo "${body}" | jq '{status, count, hasMore, page, limit, sample_posts: .posts[0:2] | map({id, text: .text[0:100], location_name, date})}'
else
  echo "${body}"
fi
echo ""

if [ "${http_code}" -eq 200 ]; then
  if echo "${body}" | grep -q '"status":"success"'; then
    count=$(echo "${body}" | grep -o '"count":[0-9]*' | head -1 | cut -d':' -f2)
    if [ -z "${count}" ]; then
      count="0"
    fi
    echo "✅ Timeline filtered by location! Posts found: ${count}"
    
    # Show location names from first post
    if echo "${body}" | grep -q '"location_name"'; then
      location=$(echo "${body}" | grep -o '"location_name":"[^"]*"' | head -1 | cut -d'"' -f4)
      if [ -n "${location}" ]; then
        echo "📍 Sample location: ${location}"
      fi
    fi
    exit 0
  else
    echo "⚠️  API returned error status"
    exit 1
  fi
else
  echo "❌ Request failed with HTTP ${http_code}"
  exit 1
fi

