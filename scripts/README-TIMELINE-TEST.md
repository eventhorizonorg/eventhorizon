# Timeline API Smoke Test

Simple smoke test to verify the Timeline API is working.

## Quick Test (curl)

The simplest way to test - just paste this in your terminal:

```bash
# Last 7 days
curl "http://localhost:3000/api/timeline?startDate=$(date -u -v-7d +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "7 days ago" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "-7 days" +"%Y-%m-%dT%H:%M:%SZ")&endDate=$(date -u +"%Y-%m-%dT%H:%M:%SZ")&page=1&limit=5" | jq .
```

Or manually with specific dates:

```bash
curl "http://localhost:3000/api/timeline?startDate=2024-01-01T00:00:00Z&endDate=2024-01-08T00:00:00Z&page=1&limit=5" | jq .
```

## Bash Script

Run the provided bash script:

```bash
./scripts/test-timeline-api.sh
```

Or if testing against a different URL:

```bash
API_URL=http://localhost:3000 ./scripts/test-timeline-api.sh
```

## TypeScript Script

If you have `tsx` installed:

```bash
npm install -D tsx
npx tsx scripts/test-timeline-api.ts
```

Or use ts-node:

```bash
npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-timeline-api.ts
```

## Expected Output

Successful response should look like:

```json
{
  "status": "success",
  "posts": [...],
  "count": 5,
  "hasMore": true,
  "page": 1,
  "limit": 5
}
```

## Testing Different Parameters

### With entity filter:
```bash
curl "http://localhost:3000/api/timeline?startDate=2024-01-01T00:00:00Z&endDate=2024-01-08T00:00:00Z&locationId=123&page=1&limit=10"
```

### With channel filter:
```bash
curl "http://localhost:3000/api/timeline?startDate=2024-01-01T00:00:00Z&endDate=2024-01-08T00:00:00Z&channel=clashreport&page=1&limit=10"
```

### Test validation errors:
```bash
# Missing dates
curl "http://localhost:3000/api/timeline?page=1"

# Invalid date range
curl "http://localhost:3000/api/timeline?startDate=2024-01-02T00:00:00Z&endDate=2024-01-01T00:00:00Z"
```

