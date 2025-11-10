/**
 * Timeline Query Builder Service
 * Composable query builder for timeline post queries
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { DateRange, TimelineFilters, PaginationParams } from '../types/timeline'

/**
 * Build base query starting from posts table
 */
export function buildBaseQuery(supabase: SupabaseClient) {
  return supabase
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
      detected_language,
      media (
        id,
        media_type,
        public_url,
        filename,
        width,
        height
      )
    `)
}

/**
 * Apply date range filtering
 */
export function applyDateRange(
  query: ReturnType<typeof buildBaseQuery>,
  dateRange: DateRange
) {
  return query
    .gte('date', dateRange.startDate)
    .lte('date', dateRange.endDate)
}

/**
 * Apply entity filters via junction tables
 */
export function applyEntityFilters(
  query: ReturnType<typeof buildBaseQuery>,
  filters: TimelineFilters
) {
  let filteredQuery = query

  // Filter by location via post_locations junction table
  if (filters.locationId) {
    // We need to use a join or subquery approach
    // For now, we'll fetch post IDs that match the location filter first
    // This will be handled in the service layer
  }

  // Filter by person via post_people junction table
  if (filters.personId) {
    // Similar approach - handled in service layer
  }

  // Filter by policy via post_policies junction table
  if (filters.policyId) {
    // Similar approach - handled in service layer
  }

  // Filter by group via post_groups junction table
  if (filters.groupId) {
    // Similar approach - handled in service layer
  }

  // Channel filter can be applied directly
  if (filters.channel) {
    filteredQuery = filteredQuery.eq('channel_username', filters.channel)
  }

  return filteredQuery
}

/**
 * Apply pagination
 */
export function applyPagination(
  query: ReturnType<typeof buildBaseQuery>,
  pagination: PaginationParams
) {
  const offset = (pagination.page - 1) * pagination.limit
  return query
    .order('date', { ascending: false })
    .range(offset, offset + pagination.limit - 1)
}

/**
 * Get post IDs filtered by entity (used when entity filtering is needed)
 */
export async function getPostIdsByEntity(
  supabase: SupabaseClient,
  entityType: 'location' | 'person' | 'policy' | 'group',
  entityId: number
): Promise<number[]> {
  let tableName: string
  let entityIdColumn: string

  switch (entityType) {
    case 'location':
      tableName = 'post_locations'
      entityIdColumn = 'location_id'
      break
    case 'person':
      tableName = 'post_people'
      entityIdColumn = 'person_id'
      break
    case 'policy':
      tableName = 'post_policies'
      entityIdColumn = 'policy_id'
      break
    case 'group':
      tableName = 'post_groups'
      entityIdColumn = 'group_id'
      break
  }

  const { data, error } = await supabase
    .from(tableName)
    .select('post_id')
    .eq(entityIdColumn, entityId)

  if (error) {
    throw error
  }

  return (data || []).map((row: any) => row.post_id)
}

/**
 * Find location ID by name (searches locations_master table)
 * Tries exact match first, then case-insensitive match, then aliases
 */
export async function findLocationIdByName(
  supabase: SupabaseClient,
  locationName: string
): Promise<number | null> {
  // Try exact match first (case-insensitive)
  const { data: exactData, error: exactError } = await supabase
    .from('locations_master')
    .select('id')
    .ilike('name', locationName)
    .limit(1)
    .maybeSingle()

  if (!exactError && exactData) {
    return exactData.id
  }

  // Try partial match (case-insensitive)
  const { data: partialData, error: partialError } = await supabase
    .from('locations_master')
    .select('id')
    .ilike('name', `%${locationName}%`)
    .limit(1)
    .maybeSingle()

  if (!partialError && partialData) {
    return partialData.id
  }

  // Try searching in aliases (Supabase array contains)
  const { data: allLocations, error: aliasError } = await supabase
    .from('locations_master')
    .select('id, aliases')

  if (!aliasError && allLocations) {
    for (const location of allLocations) {
      if (location.aliases && Array.isArray(location.aliases)) {
        const normalizedLocationName = locationName.toLowerCase()
        const match = location.aliases.some(
          (alias: string) => alias.toLowerCase() === normalizedLocationName ||
            alias.toLowerCase().includes(normalizedLocationName)
        )
        if (match) {
          return location.id
        }
      }
    }
  }

  return null
}

/**
 * Find person ID by name (searches people_master table)
 * Tries exact match first, then case-insensitive match, then aliases
 */
export async function findPersonIdByName(
  supabase: SupabaseClient,
  personName: string
): Promise<number | null> {
  // Try exact match first (case-insensitive)
  const { data: exactData, error: exactError } = await supabase
    .from('people_master')
    .select('id')
    .ilike('name', personName)
    .limit(1)
    .maybeSingle()

  if (!exactError && exactData) {
    return exactData.id
  }

  // Try partial match (case-insensitive)
  const { data: partialData, error: partialError } = await supabase
    .from('people_master')
    .select('id')
    .ilike('name', `%${personName}%`)
    .limit(1)
    .maybeSingle()

  if (!partialError && partialData) {
    return partialData.id
  }

  // Try searching in aliases (Supabase array contains)
  const { data: allPeople, error: aliasError } = await supabase
    .from('people_master')
    .select('id, aliases')

  if (!aliasError && allPeople) {
    for (const person of allPeople) {
      if (person.aliases && Array.isArray(person.aliases)) {
        const normalizedPersonName = personName.toLowerCase()
        const match = person.aliases.some(
          (alias: string) => alias.toLowerCase() === normalizedPersonName ||
            alias.toLowerCase().includes(normalizedPersonName)
        )
        if (match) {
          return person.id
        }
      }
    }
  }

  return null
}

/**
 * Find group ID by name (searches groups_master table)
 * Tries exact match first, then case-insensitive match, then aliases
 */
export async function findGroupIdByName(
  supabase: SupabaseClient,
  groupName: string
): Promise<number | null> {
  // Try exact match first (case-insensitive)
  const { data: exactData, error: exactError } = await supabase
    .from('groups_master')
    .select('id')
    .ilike('group_name', groupName)
    .limit(1)
    .maybeSingle()

  if (!exactError && exactData) {
    return exactData.id
  }

  // Try partial match (case-insensitive)
  const { data: partialData, error: partialError } = await supabase
    .from('groups_master')
    .select('id')
    .ilike('group_name', `%${groupName}%`)
    .limit(1)
    .maybeSingle()

  if (!partialError && partialData) {
    return partialData.id
  }

  // Try searching in aliases (Supabase array contains)
  const { data: allGroups, error: aliasError } = await supabase
    .from('groups_master')
    .select('id, aliases')

  if (!aliasError && allGroups) {
    for (const group of allGroups) {
      if (group.aliases && Array.isArray(group.aliases)) {
        const normalizedGroupName = groupName.toLowerCase()
        const match = group.aliases.some(
          (alias: string) => alias.toLowerCase() === normalizedGroupName ||
            alias.toLowerCase().includes(normalizedGroupName)
        )
        if (match) {
          return group.id
        }
      }
    }
  }

  return null
}

/**
 * Get post IDs filtered by multiple entities (AND condition)
 * Supports both ID-based and name-based filtering
 */
export async function getPostIdsByMultipleEntities(
  supabase: SupabaseClient,
  filters: TimelineFilters
): Promise<number[] | null> {
  const entityFilters: Array<{ type: 'location' | 'person' | 'policy' | 'group'; id: number }> = []

  // Handle location filtering (ID or name)
  if (filters.locationId) {
    entityFilters.push({ type: 'location', id: filters.locationId })
  } else if (filters.locationName) {
    const locationId = await findLocationIdByName(supabase, filters.locationName)
    if (locationId) {
      entityFilters.push({ type: 'location', id: locationId })
    } else {
      // Location name not found, return empty results
      return []
    }
  }

  // Handle person filtering (ID or name)
  if (filters.personId) {
    entityFilters.push({ type: 'person', id: filters.personId })
  } else if (filters.personName) {
    const personId = await findPersonIdByName(supabase, filters.personName)
    if (personId) {
      entityFilters.push({ type: 'person', id: personId })
    } else {
      // Person name not found, return empty results
      return []
    }
  }

  // Handle policy filtering (ID only for now)
  if (filters.policyId) {
    entityFilters.push({ type: 'policy', id: filters.policyId })
  }

  // Handle group filtering (ID or name)
  if (filters.groupId) {
    entityFilters.push({ type: 'group', id: filters.groupId })
  } else if (filters.groupName) {
    const groupId = await findGroupIdByName(supabase, filters.groupName)
    if (groupId) {
      entityFilters.push({ type: 'group', id: groupId })
    } else {
      // Group name not found, return empty results
      return []
    }
  }

  if (entityFilters.length === 0) {
    return null // No entity filters
  }

  // Get post IDs for each entity filter
  const postIdSets: Set<number>[] = []

  for (const filter of entityFilters) {
    const postIds = await getPostIdsByEntity(supabase, filter.type, filter.id)
    postIdSets.push(new Set(postIds))
  }

  // Find intersection (posts that match ALL entity filters)
  if (postIdSets.length === 0) {
    return []
  }

  let intersection = postIdSets[0]
  for (let i = 1; i < postIdSets.length; i++) {
    const intersectionArray = Array.from(intersection)
    intersection = new Set(intersectionArray.filter(id => postIdSets[i].has(id)))
  }

  return Array.from(intersection)
}

