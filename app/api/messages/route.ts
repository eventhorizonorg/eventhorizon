import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get messages with geolocation data
    const { data, error } = await supabase
      .from('messages')
      .select('id, text, date, channel, latitude, longitude, country_code')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch messages: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'success',
      messages: data,
      count: data.length
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch messages: ${error}` },
      { status: 500 }
    )
  }
} 