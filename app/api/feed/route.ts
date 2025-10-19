import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { stripTelegramFormatting } from '@/lib/text/sanitize'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const hasEnv = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
    console.log('Feed API - Environment check:', {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
      urlPrefix: process.env.SUPABASE_URL?.substring(0, 20) + '...',
      page,
      limit,
      offset
    })
    
    if (!hasEnv) {
      return NextResponse.json({ status: 'ok', posts: [], count: 0, hasMore: false })
    }

    const supabase = supabaseServer()
    
    // Get latest posts from last 24 hours with location data
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    console.log('Feed API - Filtering posts from last 24 hours:', twentyFourHoursAgo)
    
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select(`
        id,
        channel_name,
        channel_username,
        post_id,
        date,
        text,
        has_photo,
        has_video,
        detected_language,
        media (
          id,
          media_type,
          public_url,
          filename,
          width,
          height
        )
      `)
      .gte('date', twentyFourHoursAgo)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (postsError) {
      console.error('Feed API - Posts query error:', postsError)
      return NextResponse.json({ status: 'error', message: 'Posts query failed', error: postsError.message })
    }

    console.log('Feed API - Posts data:', postsData?.length, 'posts found')
    console.log('Feed API - First 3 posts:', postsData?.slice(0, 3).map(p => ({ id: p.id, channel_name: p.channel_name, date: p.date })))

    // Get location data for posts
    const postIds = postsData?.map(p => p.id) || []
    let locationData: any[] = []
    let peopleData: any[] = []
    let policiesData: any[] = []
    let groupsData: any[] = []
    
    if (postIds.length > 0) {
      const { data: locationsData, error: locationsError } = await supabase
        .from('post_locations')
        .select(`
          post_id,
          priority,
          locations_master!inner(id, name, latitude, longitude, canonical_name, location_type, location_subtype, type_confidence, wikipedia_title, wikipedia_url)
        `)
        .in('post_id', postIds)
        .order('post_id', { ascending: false })
        .order('priority', { ascending: true })

      if (!locationsError) {
        locationData = locationsData || []
        console.log('Feed API - Location data:', locationData.length, 'relationships found')
      }

      // Get people data with Wikipedia links
      const { data: peopleDataResult, error: peopleError } = await supabase
        .from('post_people')
        .select(`
          post_id,
          mentioned_as,
          people_master!inner(id, name, canonical_name, wikipedia_title, wikipedia_url, wikipedia_page_id, title, role)
        `)
        .in('post_id', postIds)

      if (!peopleError) {
        peopleData = peopleDataResult || []
        console.log('Feed API - People data:', peopleData.length, 'relationships found')
      }

      // Get policies data with Wikipedia links
      const { data: policiesDataResult, error: policiesError } = await supabase
        .from('post_policies')
        .select(`
          post_id,
          policies_master!inner(id, policy_name, canonical_name, wikipedia_title, wikipedia_url, wikipedia_page_id)
        `)
        .in('post_id', postIds)

      if (!policiesError) {
        policiesData = policiesDataResult || []
        console.log('Feed API - Policies data:', policiesData.length, 'relationships found')
      }

      // Get groups data with Wikipedia links
      const { data: groupsDataResult, error: groupsError } = await supabase
        .from('post_groups')
        .select(`
          post_id,
          groups_master!inner(id, group_name, canonical_name, wikipedia_title, wikipedia_url, wikipedia_page_id)
        `)
        .in('post_id', postIds)

      if (!groupsError) {
        groupsData = groupsDataResult || []
        console.log('Feed API - Groups data:', groupsData.length, 'relationships found')
      }
    }

    // Create maps for locations (ordered by priority) and a primary location
    const locationsByPost: Map<number, any[]> = new Map()
    const primaryLocationByPost: Map<number, any | null> = new Map()
    locationData.forEach((row: any) => {
      const entry = {
        name: row.locations_master.name,
        latitude: row.locations_master.latitude,
        longitude: row.locations_master.longitude,
        location_type: row.locations_master.location_type,
        location_subtype: row.locations_master.location_subtype,
        type_confidence: row.locations_master.type_confidence,
        canonical_name: row.locations_master.canonical_name,
        wikipedia_title: row.locations_master.wikipedia_title,
        wikipedia_url: row.locations_master.wikipedia_url,
        priority: row.priority
      }
      if (!locationsByPost.has(row.post_id)) {
        locationsByPost.set(row.post_id, [entry])
        primaryLocationByPost.set(row.post_id, entry)
      } else {
        locationsByPost.get(row.post_id)!.push(entry)
      }
    })

    // Create maps for entities with Wikipedia links
    const entitiesMap = new Map()
    
    // Group people by post_id
    peopleData.forEach((person: any) => {
      if (!entitiesMap.has(person.post_id)) {
        entitiesMap.set(person.post_id, { people: [], locations: [], policies: [], groups: [] })
      }
      const entities = entitiesMap.get(person.post_id)
      entities.people.push({
        name: person.people_master.name,
        mentioned_as: person.mentioned_as,
        canonical_name: person.people_master.canonical_name,
        title: person.people_master.title,
        role: person.people_master.role,
        wikipedia_title: person.people_master.wikipedia_title,
        wikipedia_url: person.people_master.wikipedia_url,
        wikipedia_page_id: person.people_master.wikipedia_page_id
      })
    })

    // Group locations by post_id (including Wikipedia data)
    locationData.forEach((loc: any) => {
      if (!entitiesMap.has(loc.post_id)) {
        entitiesMap.set(loc.post_id, { people: [], locations: [], policies: [], groups: [] })
      }
      const entities = entitiesMap.get(loc.post_id)
      entities.locations.push({
        name: loc.locations_master.name,
        canonical_name: loc.locations_master.canonical_name,
        wikipedia_title: loc.locations_master.wikipedia_title,
        wikipedia_url: loc.locations_master.wikipedia_url
      })
    })

    // Group policies by post_id
    policiesData.forEach((policy: any) => {
      if (!entitiesMap.has(policy.post_id)) {
        entitiesMap.set(policy.post_id, { people: [], locations: [], policies: [], groups: [] })
      }
      const entities = entitiesMap.get(policy.post_id)
      entities.policies.push({
        name: policy.policies_master.policy_name,
        canonical_name: policy.policies_master.canonical_name,
        wikipedia_title: policy.policies_master.wikipedia_title,
        wikipedia_url: policy.policies_master.wikipedia_url,
        wikipedia_page_id: policy.policies_master.wikipedia_page_id
      })
    })

    // Group groups by post_id
    groupsData.forEach((group: any) => {
      if (!entitiesMap.has(group.post_id)) {
        entitiesMap.set(group.post_id, { people: [], locations: [], policies: [], groups: [] })
      }
      const entities = entitiesMap.get(group.post_id)
      entities.groups.push({
        name: group.groups_master.group_name,
        canonical_name: group.groups_master.canonical_name,
        wikipedia_title: group.groups_master.wikipedia_title,
        wikipedia_url: group.groups_master.wikipedia_url,
        wikipedia_page_id: group.groups_master.wikipedia_page_id
      })
    })

    // Transform data to match expected format
    const transformedPosts = postsData?.map((post: any) => {
      const primaryLocation = primaryLocationByPost.get(post.id) || null
      const locations = locationsByPost.get(post.id) || []
      const entities = entitiesMap.get(post.id) || { people: [], locations: [], policies: [], groups: [] }
      
      return {
        id: post.id,
        post_id: post.post_id,
        text: stripTelegramFormatting(post.text),
        date: post.date,
        channel: post.channel_name,
        channel_username: post.channel_username,
        // legacy fields for back-compat filled from primaryLocation
        latitude: primaryLocation?.latitude ?? null,
        longitude: primaryLocation?.longitude ?? null,
        location_name: primaryLocation?.name ?? null,
        country_code: primaryLocation?.canonical_name ?? null,
        has_photo: post.has_photo,
        has_video: post.has_video,
        detected_language: post.detected_language,
        media: Array.isArray(post.media) ? post.media : [],
        entities: entities,
        primaryLocation,
        locations
      }
    }) || []

    console.log('Feed API - Transformed posts:', transformedPosts.length, 'posts')

    // Check if there are more posts
    const hasMore = transformedPosts.length === limit

    return NextResponse.json({
      status: 'success',
      posts: transformedPosts,
      count: transformedPosts.length,
      hasMore,
      page,
      limit
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (err) {
    console.error('Feed API error:', err)
    return NextResponse.json({ status: 'error', message: 'API error', error: err instanceof Error ? err.message : String(err) })
  }
}
