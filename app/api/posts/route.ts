import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

export async function GET() {
  try {
    const hasEnv = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
    if (!hasEnv) {
      return NextResponse.json({ status: 'ok', posts: [], count: 0 })
    }

    const supabase = supabaseServer()

    // Query posts with their associated locations using joins
    // Each post can have multiple locations via post_locations junction table
    const { data, error } = await supabase
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
        views,
        forwards,
        detected_language,
        post_locations!inner (
          location_id,
          locations_master!inner (
            id,
            name,
            latitude,
            longitude,
            country: canonical_name
          )
        )
      `)
      .not('post_locations.locations_master.latitude', 'is', null)
      .not('post_locations.locations_master.longitude', 'is', null)
      .order('date', { ascending: false })
      .limit(1000)

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json({ status: 'ok', posts: [], count: 0 })
    }

    // Transform data to flatten the location info for each post
    // If a post has multiple locations, we'll create multiple points (one per location)
    const transformedPosts = data?.flatMap((post: any) => {
      const locations = post.post_locations || []
      return locations.map((locJunction: any) => {
        const location = locJunction.locations_master
        return {
          id: post.id,
          post_id: post.post_id,
          text: post.text,
          date: post.date,
          channel: post.channel_name,
          channel_username: post.channel_username,
          latitude: location.latitude,
          longitude: location.longitude,
          location_name: location.name,
          country_code: location.country,
          has_photo: post.has_photo,
          has_video: post.has_video,
          views: post.views,
          forwards: post.forwards,
          detected_language: post.detected_language
        }
      })
    }) || []

    return NextResponse.json({
      status: 'success',
      posts: transformedPosts,
      count: transformedPosts.length
    })
  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json({ status: 'ok', posts: [], count: 0 })
  }
}

