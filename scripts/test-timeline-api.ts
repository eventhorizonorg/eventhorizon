/**
 * Simple smoke test for Timeline API
 * Run with: npx ts-node --compiler-options '{\"module\":\"commonjs\"}' scripts/test-timeline-api.ts
 * Or install tsx: npm install -D tsx && npx tsx scripts/test-timeline-api.ts
 */

async function testTimelineAPI() {
  const baseUrl = process.env.API_URL || 'http://localhost:3000'
  const url = `${baseUrl}/api/timeline`

  // Test parameters - last 7 days
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 7)

  const params = new URLSearchParams({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    page: '1',
    limit: '5'
  })

  const testUrl = `${url}?${params.toString()}`

  console.log('🧪 Testing Timeline API...')
  console.log(`📍 URL: ${testUrl}`)
  console.log(`📅 Date Range: ${startDate.toISOString()} to ${endDate.toISOString()}\n`)

  try {
    const response = await fetch(testUrl)
    const data = await response.json()

    console.log(`✅ Status: ${response.status} ${response.statusText}`)
    console.log(`📊 Response Status: ${data.status}`)
    
    if (data.status === 'success') {
      console.log(`📝 Posts Returned: ${data.count}`)
      console.log(`📄 Page: ${data.page}`)
      console.log(`📏 Limit: ${data.limit}`)
      console.log(`➡️  Has More: ${data.hasMore}`)
      
      if (data.posts && data.posts.length > 0) {
        console.log(`\n📰 Sample Post:`)
        const post = data.posts[0]
        console.log(`   ID: ${post.id}`)
        console.log(`   Channel: ${post.channel} (@${post.channel_username})`)
        console.log(`   Date: ${post.date}`)
        console.log(`   Text: ${post.text?.substring(0, 100)}...`)
        console.log(`   Location: ${post.location_name || 'N/A'}`)
        console.log(`   Entities: ${post.entities.people.length} people, ${post.entities.locations.length} locations`)
      } else {
        console.log(`\n⚠️  No posts found in date range`)
      }
    } else {
      console.log(`❌ Error: ${data.message}`)
      if (data.error) {
        console.log(`   Details: ${data.error}`)
      }
    }

    console.log(`\n✅ Smoke test completed successfully!`)
  } catch (error) {
    console.error(`❌ Smoke test failed:`)
    console.error(error)
    process.exit(1)
  }
}

// Run the test
testTimelineAPI()

