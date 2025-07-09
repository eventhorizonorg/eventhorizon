import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
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
    
    // Create a test message
    const testMessage = {
      text: `🧪 Test real-time message at ${new Date().toISOString()}`,
      date: new Date().toISOString(),
      channel: '@TestChannel',
      latitude: 40.7128 + (Math.random() - 0.5) * 10, // Random around NYC
      longitude: -74.0060 + (Math.random() - 0.5) * 10,
      country_code: 'US',
      telegram_id: '12345'
    }
    
    // Insert test message
    const { data, error } = await supabase
      .from('messages')
      .insert([testMessage])
      .select()

    if (error) {
      return NextResponse.json(
        { error: `Failed to insert test message: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'success',
      message: 'Test message inserted',
      data: data[0]
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to insert test message: ${error}` },
      { status: 500 }
    )
  }
} 