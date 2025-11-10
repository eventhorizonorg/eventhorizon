/**
 * Type definitions for Timeline API
 */

/**
 * Date range with start and end dates
 */
export interface DateRange {
  startDate: string // ISO 8601 date string
  endDate: string   // ISO 8601 date string
}

/**
 * Entity filter options
 * Supports both ID-based and name-based filtering
 */
export interface TimelineFilters {
  locationId?: number
  locationName?: string // Filter by location name (searches locations_master)
  personId?: number
  personName?: string // Filter by person name (searches people_master)
  policyId?: number
  groupId?: number
  groupName?: string // Filter by group name (searches groups_master)
  channel?: string // Channel username or name
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number  // 1-indexed page number
  limit: number // Items per page
}

/**
 * Complete query parameters for timeline endpoint
 */
export interface TimelineQueryParams extends DateRange, TimelineFilters, PaginationParams {}

/**
 * Entity data structures (matching feed API format)
 */
export interface LocationEntity {
  name: string
  latitude: number | null
  longitude: number | null
  location_type: string | null
  location_subtype: string | null
  type_confidence: number | null
  canonical_name: string | null
  wikipedia_title: string | null
  wikipedia_url: string | null
  priority?: number
}

export interface PersonEntity {
  name: string
  mentioned_as: string | null
  canonical_name: string | null
  title: string | null
  role: string | null
  wikipedia_title: string | null
  wikipedia_url: string | null
  wikipedia_page_id: number | null
}

export interface PolicyEntity {
  name: string
  canonical_name: string | null
  wikipedia_title: string | null
  wikipedia_url: string | null
  wikipedia_page_id: number | null
}

export interface GroupEntity {
  name: string
  canonical_name: string | null
  wikipedia_title: string | null
  wikipedia_url: string | null
  wikipedia_page_id: number | null
}

export interface PostEntities {
  people: PersonEntity[]
  locations: LocationEntity[]
  policies: PolicyEntity[]
  groups: GroupEntity[]
}

/**
 * Media item from Supabase
 */
export interface MediaItem {
  id: number
  media_type: string
  public_url: string
  filename: string | null
  width: number | null
  height: number | null
}

/**
 * Timeline post (matching feed API format)
 */
export interface TimelinePost {
  id: number
  post_id: number
  text: string
  date: string
  channel: string
  channel_username: string
  latitude: number | null
  longitude: number | null
  location_name: string | null
  country_code: string | null
  has_photo: boolean
  has_video: boolean
  detected_language: string | null
  media: MediaItem[]
  entities: PostEntities
  primaryLocation: LocationEntity | null
  locations: LocationEntity[]
}

/**
 * Timeline API response
 */
export interface TimelineResponse {
  status: 'success' | 'error'
  posts: TimelinePost[]
  count: number
  hasMore: boolean
  page: number
  limit: number
  total?: number // Optional total count
  message?: string // Error message if status is 'error'
  error?: string // Error details if status is 'error'
}

