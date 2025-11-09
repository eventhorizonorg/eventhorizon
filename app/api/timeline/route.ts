import { NextResponse } from 'next/server'
import { getTimelinePosts } from '@/lib/services/timeline-service'
import { validateTimelineParams } from '@/lib/utils/validation'
import { ValidationError, QueryError, createErrorResponse } from '@/lib/utils/errors'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const params = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      locationId: searchParams.get('locationId') || undefined,
      locationName: searchParams.get('locationName') || undefined,
      personId: searchParams.get('personId') || undefined,
      personName: searchParams.get('personName') || undefined,
      policyId: searchParams.get('policyId') || undefined,
      groupId: searchParams.get('groupId') || undefined,
      channel: searchParams.get('channel') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined
    }

    // Validate and normalize parameters
    const { dateRange, filters, pagination } = validateTimelineParams(params)

    // Check for Supabase environment variables
    const hasEnv = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
    if (!hasEnv) {
      return NextResponse.json(
        {
          status: 'success',
          posts: [],
          count: 0,
          hasMore: false,
          page: pagination.page,
          limit: pagination.limit
        },
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      )
    }

    // Build query parameters
    const queryParams = {
      ...dateRange,
      ...filters,
      ...pagination
    }

    // Fetch timeline posts
    const result = await getTimelinePosts(queryParams)

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Timeline API error:', error)

    if (error instanceof ValidationError) {
      return NextResponse.json(
        createErrorResponse(error.message),
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }
      )
    }

    if (error instanceof QueryError) {
      return NextResponse.json(
        createErrorResponse('Database query failed', error.message),
        {
          status: 500,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }
      )
    }

    // Unexpected error
    return NextResponse.json(
      createErrorResponse(
        'Internal server error',
        error instanceof Error ? error.message : String(error)
      ),
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    )
  }
}

