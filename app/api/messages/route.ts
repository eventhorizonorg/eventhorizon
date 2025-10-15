import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

export async function GET() {
  try {
    const hasEnv = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
    if (!hasEnv) {
      return NextResponse.json({ status: 'ok', messages: [], count: 0 })
    }

    const supabase = supabaseServer()

    // Get messages with geolocation data and telegram_id for widget support
    const { data, error } = await supabase
      .from('messages')
      .select('id, text, date, channel, latitude, longitude, country_code, telegram_id')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)

    if (error) {
      return NextResponse.json({ status: 'ok', messages: [], count: 0 })
    }

    return NextResponse.json({
      status: 'success',
      messages: data ?? [],
      count: data?.length ?? 0
    })
  } catch {
    return NextResponse.json({ status: 'ok', messages: [], count: 0 })
  }
}