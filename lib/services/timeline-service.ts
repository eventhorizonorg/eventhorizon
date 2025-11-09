/**
 * Timeline Service
 * Main service orchestrator for timeline queries
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseServer } from '../supabase/server'
import { stripTelegramFormatting } from '../text/sanitize'
import { fetchPostEntities } from './entity-aggregator'
import {
  buildBaseQuery,
  applyDateRange,
  applyEntityFilters,
  applyPagination,
  getPostIdsByMultipleEntities
} from './timeline-query'
import type {
  TimelineQueryParams,
  TimelineResponse,
  TimelinePost
} from '../types/timeline'
import { QueryError } from '../utils/errors'

/**
 * Get timeline posts based on query parameters
 */
export async function getTimelinePosts(
  params: TimelineQueryParams
): Promise<TimelineResponse> {
  const supabase = supabaseServer()

  try {
    // Handle entity filtering by getting matching post IDs first
    // Supports both ID-based and name-based filtering
    let filteredPostIds: number[] | null = null
    if (
      params.locationId || params.locationName ||
      params.personId || params.personName ||
      params.policyId || params.groupId
    ) {
      filteredPostIds = await getPostIdsByMultipleEntities(supabase, {
        locationId: params.locationId,
        locationName: params.locationName,
        personId: params.personId,
        personName: params.personName,
        policyId: params.policyId,
        groupId: params.groupId
      })

      // If no posts match entity filters, return empty result
      if (filteredPostIds !== null && filteredPostIds.length === 0) {
        return {
          status: 'success',
          posts: [],
          count: 0,
          hasMore: false,
          page: params.page,
          limit: params.limit
        }
      }
    }

    // Build base query
    let query = buildBaseQuery(supabase)

    // Apply date range
    query = applyDateRange(query, {
      startDate: params.startDate,
      endDate: params.endDate
    })

    // Apply entity filters (excluding entity ID filters which are handled above)
    query = applyEntityFilters(query, {
      channel: params.channel
    })

    // Apply post ID filter if entity filtering was used
    if (filteredPostIds !== null && filteredPostIds.length > 0) {
      query = query.in('id', filteredPostIds)
    }

    // Apply pagination
    query = applyPagination(query, {
      page: params.page,
      limit: params.limit
    })

    // Execute query
    const { data: postsData, error: postsError } = await query

    if (postsError) {
      throw new QueryError('Failed to fetch posts', postsError)
    }

    if (!postsData || postsData.length === 0) {
      return {
        status: 'success',
        posts: [],
        count: 0,
        hasMore: false,
        page: params.page,
        limit: params.limit
      }
    }

    // Fetch entities for all posts
    const postIds = postsData.map((p: any) => p.id)
    const { locationsByPost, primaryLocationByPost, entitiesByPost } =
      await fetchPostEntities(supabase, postIds)

    // Transform posts to match expected format
    const transformedPosts: TimelinePost[] = postsData.map((post: any) => {
      const primaryLocation = primaryLocationByPost.get(post.id) || null
      const locations = locationsByPost.get(post.id) || []
      const entities = entitiesByPost.get(post.id) || {
        people: [],
        locations: [],
        policies: [],
        groups: []
      }

      return {
        id: post.id,
        post_id: post.post_id,
        text: stripTelegramFormatting(post.text),
        date: post.date,
        channel: post.channel_name,
        channel_username: post.channel_username,
        latitude: primaryLocation?.latitude ?? null,
        longitude: primaryLocation?.longitude ?? null,
        location_name: primaryLocation?.name ?? null,
        country_code: primaryLocation?.canonical_name ?? null,
        has_photo: post.has_photo || false,
        has_video: post.has_video || false,
        detected_language: post.detected_language || null,
        media: Array.isArray(post.media) ? post.media : [],
        entities,
        primaryLocation,
        locations
      }
    })

    // Check if there are more posts
    const hasMore = transformedPosts.length === params.limit

    return {
      status: 'success',
      posts: transformedPosts,
      count: transformedPosts.length,
      hasMore,
      page: params.page,
      limit: params.limit
    }
  } catch (error) {
    if (error instanceof QueryError) {
      throw error
    }
    throw new QueryError(
      'Unexpected error fetching timeline posts',
      error instanceof Error ? error : new Error(String(error))
    )
  }
}

