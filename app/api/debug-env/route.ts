import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
    urlPrefix: process.env.SUPABASE_URL?.substring(0, 20) + '...',
    keyPrefix: process.env.SUPABASE_ANON_KEY?.substring(0, 20) + '...'
  })
}
