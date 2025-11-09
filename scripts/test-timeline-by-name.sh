#!/bin/bash
# Test Timeline API filtered by entity NAME (for frontend use)
# Examples:
#   ./scripts/test-timeline-by-name.sh location "United States"
#   ./scripts/test-timeline-by-name.sh person "Donald Trump"

API_URL="${API_URL:-http://localhost:3000}"
FILTER_TYPE="${1:-}"
ENTITY_NAME="${2:-}"

if [ -z "${FILTER_TYPE}" ] || [ -z "${ENTITY_NAME}" ]; then
  echo "Usage: $0 <filterType> <entityName>"
  echo ""
  echo "Filter Types:"
  echo "  location  - Filter by location name (e.g., 'United States')"
  echo "  person    - Filter by person name (e.g., 'Donald Trump')"
  echo ""
  echo "Examples:"
  echo "  $0 location 'United States'"
  echo "  $0 person 'Trump'"
  echo "  $0 location 'Gaza'"
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

# Build URL based on filter type
if [ "${FILTER_TYPE}" = "location" ]; then
  PARAM="locationName"
  DISPLAY_NAME="Location"
elif [ "${FILTER_TYPE}" = "person" ]; then
  PARAM="personName"
  DISPLAY_NAME="Person"
else
  echo "❌ Invalid filter type: ${FILTER_TYPE}"
  echo "   Must be 'location' or 'person'"
  exit 1
fi

# URL encode the entity name
ENTITY_NAME_ENCODED=$(echo -n "${ENTITY_NAME}" | jq -sRr @uri)

URL="${API_URL}/api/timeline?startDate=${START_DATE}&endDate=${END_DATE}&${PARAM}=${ENTITY_NAME_ENCODED}&page=1&limit=10"

echo "🧪 Testing Timeline API with ${DISPLAY_NAME} Filter..."
echo "📍 ${DISPLAY_NAME}: ${ENTITY_NAME}"
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
  echo "${body}" | jq '{status, count, hasMore, page, limit, sample_posts: .posts[0:3] | map({id, text: .text[0:80], location_name, date, channel})}'
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
    echo "✅ Timeline filtered by ${DISPLAY_NAME}! Posts found: ${count}"
    exit 0
  else
    echo "⚠️  API returned error status"
    if echo "${body}" | grep -q '"message"'; then
      message=$(echo "${body}" | grep -o '"message":"[^"]*"' | head -1 | cut -d'"' -f4)
      echo "   Error: ${message}"
    fi
    exit 1
  fi
else
  echo "❌ Request failed with HTTP ${http_code}"
  exit 1
fi

