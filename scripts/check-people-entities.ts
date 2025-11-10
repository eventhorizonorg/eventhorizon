import { createClient } from '@supabase/supabase-js'

async function checkPeopleEntities() {
  // Use Next.js environment variables
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('❌ Missing Supabase credentials')
    console.error('   SUPABASE_URL:', url ? 'Set' : 'Missing')
    console.error('   SUPABASE_ANON_KEY:', key ? 'Set' : 'Missing')
    process.exit(1)
  }

  const supabase = createClient(url, key)

  console.log('🔍 Checking People Entities in Database\n')

  // 1. Check total people in people_master
  const { data: allPeople, error: allPeopleError } = await supabase
    .from('people_master')
    .select('id, name, canonical_name, wikipedia_title')
    .order('name', { ascending: true })

  if (allPeopleError) {
    console.error('❌ Error fetching people:', allPeopleError)
  } else {
    console.log(`📊 Total people in people_master: ${allPeople?.length || 0}`)
    if (allPeople && allPeople.length > 0) {
      console.log('\n📝 Sample people (first 20):')
      allPeople.slice(0, 20).forEach((person, idx) => {
        console.log(`   ${idx + 1}. ${person.name} ${person.canonical_name ? `(${person.canonical_name})` : ''}`)
      })
    }
  }

  // 2. Check for specific people
  console.log('\n🔎 Searching for specific people:\n')
  
  const searchNames = ['Trump', 'Putin', 'Netanyahu', 'Biden', 'Xi', 'Zelensky']
  
  for (const searchName of searchNames) {
    const { data: foundPeople, error } = await supabase
      .from('people_master')
      .select('id, name, canonical_name, wikipedia_title')
      .or(`name.ilike.%${searchName}%,canonical_name.ilike.%${searchName}%`)
    
    if (error) {
      console.log(`   ❌ ${searchName}: Error - ${error.message}`)
    } else if (foundPeople && foundPeople.length > 0) {
      console.log(`   ✅ ${searchName}: Found ${foundPeople.length} match(es)`)
      foundPeople.forEach(p => {
        console.log(`      - ${p.name} ${p.canonical_name ? `(${p.canonical_name})` : ''}`)
      })
    } else {
      console.log(`   ❌ ${searchName}: Not found`)
    }
  }

  // 3. Check posts mentioning these people
  console.log('\n📰 Checking posts mentioning these people:\n')
  
  // Get recent posts
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recentPosts, error: postsError } = await supabase
    .from('posts')
    .select('id, text, date')
    .gte('date', twentyFourHoursAgo)
    .order('date', { ascending: false })
    .limit(100)

  if (postsError) {
    console.error('❌ Error fetching posts:', postsError)
  } else if (recentPosts) {
    console.log(`   Total recent posts (last 24h): ${recentPosts.length}`)
    
    for (const searchName of searchNames) {
      const mentioningPosts = recentPosts.filter(p => 
        p.text.toLowerCase().includes(searchName.toLowerCase())
      )
      console.log(`   Posts mentioning "${searchName}": ${mentioningPosts.length}`)
    }
  }

  // 4. Check post_people relationships
  console.log('\n🔗 Checking post_people relationships:\n')
  
  const { data: postPeople, error: postPeopleError } = await supabase
    .from('post_people')
    .select('post_id, mentioned_as, people_master(name, canonical_name)')
    .limit(20)

  if (postPeopleError) {
    console.error('❌ Error fetching post_people:', postPeopleError)
  } else {
    console.log(`   Total post_people relationships: ${postPeople?.length || 0}`)
    if (postPeople && postPeople.length > 0) {
      console.log('\n   Sample relationships:')
      postPeople.slice(0, 10).forEach((rel: any, idx) => {
        console.log(`   ${idx + 1}. Post ${rel.post_id}: "${rel.mentioned_as}" -> ${rel.people_master?.name}`)
      })
    }
  }

  console.log('\n✅ Check complete!')
}

checkPeopleEntities().catch(console.error)

