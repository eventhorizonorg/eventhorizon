import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title')
    
    if (!title) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'Wikipedia title is required' 
      }, { status: 400 })
    }

    // Fetch Wikipedia page summary and image
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    
    const response = await fetch(summaryUrl, {
      headers: {
        'User-Agent': 'EventHorizon/1.0 (https://github.com/yourusername/eventhorizon)',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ 
          status: 'error', 
          message: 'Wikipedia page not found' 
        }, { status: 404 })
      }
      throw new Error(`Wikipedia API error: ${response.status}`)
    }

    const data = await response.json()

    // Extract relevant information
    const wikipediaData = {
      title: data.title,
      displayTitle: data.displaytitle,
      extract: data.extract,
      description: data.description,
      thumbnail: data.thumbnail?.source || null,
      originalImage: data.originalimage?.source || null,
      pageUrl: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      type: data.type,
      coordinates: data.coordinates || null
    }

    return NextResponse.json({
      status: 'success',
      data: wikipediaData
    }, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      }
    })
  } catch (err) {
    console.error('Wikipedia API error:', err)
    return NextResponse.json({ 
      status: 'error', 
      message: 'Failed to fetch Wikipedia data',
      error: err instanceof Error ? err.message : String(err)
    }, { status: 500 })
  }
}


