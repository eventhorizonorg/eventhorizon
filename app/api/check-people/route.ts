import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = supabaseServer()

    // 1. Get all people from people_master
    const { data: allPeople, error: allPeopleError } = await supabase
      .from('people_master')
      .select('id, name, canonical_name, wikipedia_title')
      .order('name', { ascending: true })

    // 2. Search for specific people
    const searchNames = ['Trump', 'Putin', 'Netanyahu', 'Biden', 'Xi', 'Zelensky']
    const searchResults: Record<string, any[]> = {}
    
    for (const searchName of searchNames) {
      const { data: foundPeople } = await supabase
        .from('people_master')
        .select('id, name, canonical_name, wikipedia_title')
        .or(`name.ilike.%${searchName}%,canonical_name.ilike.%${searchName}%`)
      
      searchResults[searchName] = foundPeople || []
    }

    // 3. Check recent posts mentioning these people
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('id, text, date')
      .gte('date', twentyFourHoursAgo)
      .order('date', { ascending: false })
      .limit(100)

    const mentionCounts: Record<string, number> = {}
    if (recentPosts) {
      for (const searchName of searchNames) {
        mentionCounts[searchName] = recentPosts.filter(p => 
          p.text.toLowerCase().includes(searchName.toLowerCase())
        ).length
      }
    }

    // 4. Check post_people relationships
    const { data: postPeople } = await supabase
      .from('post_people')
      .select('post_id, mentioned_as, people_master(name, canonical_name)')
      .limit(20)

    return NextResponse.json({
      status: 'success',
      totalPeople: allPeople?.length || 0,
      samplePeople: allPeople?.slice(0, 20) || [],
      searchResults,
      recentPostsCount: recentPosts?.length || 0,
      mentionCounts,
      postPeopleCount: postPeople?.length || 0,
      samplePostPeople: postPeople || []
    })
  } catch (error) {
    console.error('Error checking people:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

