import { NextResponse } from 'next/server'

export async function GET() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  
  if (!token) {
    return NextResponse.json({ token: null })
  }
  
  return NextResponse.json({ token })
}