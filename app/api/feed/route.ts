import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

export async function GET() {
  try {
    const hasEnv = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
    console.log('Feed API - Environment check:', {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
      urlPrefix: process.env.SUPABASE_URL?.substring(0, 20) + '...'
    })
    
    if (!hasEnv) {
      return NextResponse.json({ status: 'ok', posts: [], count: 0 })
    }

    const supabase = supabaseServer()
    
    // Get latest posts from last 24 hours with location data
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    console.log('Feed API - Filtering posts from last 24 hours:', twentyFourHoursAgo)
    
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('id, channel_name, channel_username, post_id, date, text, has_photo, has_video, detected_language')
      .gte('date', twentyFourHoursAgo)
      .order('date', { ascending: false })
      .limit(100)

    if (postsError) {
      console.error('Feed API - Posts query error:', postsError)
      return NextResponse.json({ status: 'error', message: 'Posts query failed', error: postsError.message })
    }

    console.log('Feed API - Posts data:', postsData?.length, 'posts found')
    console.log('Feed API - First 3 posts:', postsData?.slice(0, 3).map(p => ({ id: p.id, channel_name: p.channel_name, date: p.date })))

    // Get location data for posts
    const postIds = postsData?.map(p => p.id) || []
    let locationData: any[] = []
    
    if (postIds.length > 0) {
      const { data: locationsData, error: locationsError } = await supabase
        .from('post_locations')
        .select(`
          post_id,
          locations_master!inner(id, name, latitude, longitude, canonical_name)
        `)
        .in('post_id', postIds)
        .order('post_id', { ascending: false })

      if (!locationsError) {
        locationData = locationsData || []
        console.log('Feed API - Location data:', locationData.length, 'relationships found')
      }
    }

    // Create a map of post_id to primary location
    const locationMap = new Map()
    locationData.forEach((loc: any) => {
      if (!locationMap.has(loc.post_id)) {
        locationMap.set(loc.post_id, {
          latitude: loc.locations_master.latitude,
          longitude: loc.locations_master.longitude,
          location_name: loc.locations_master.name,
          canonical_name: loc.locations_master.canonical_name
        })
      }
    })

    // Transform data to match expected format
    const transformedPosts = postsData?.map((post: any) => {
      const location = locationMap.get(post.id)
      return {
        id: post.id,
        post_id: post.post_id,
        text: post.text,
        date: post.date,
        channel: post.channel_name,
        channel_username: post.channel_username,
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        location_name: location?.location_name || null,
        country_code: location?.canonical_name || null,
        has_photo: post.has_photo,
        has_video: post.has_video,
        detected_language: post.detected_language
      }
    }) || []

    console.log('Feed API - Transformed posts:', transformedPosts.length, 'posts')

    return NextResponse.json({
      status: 'success',
      posts: transformedPosts,
      count: transformedPosts.length
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
