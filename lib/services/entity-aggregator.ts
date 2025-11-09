/**
 * Entity Aggregation Service
 * Fetches and aggregates entities (people, locations, policies, groups) for posts
 * Reusable across feed and timeline endpoints
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  PostEntities,
  LocationEntity,
  PersonEntity,
  PolicyEntity,
  GroupEntity
} from '../types/timeline'
import { QueryError } from '../utils/errors'

/**
 * Fetch all entities for a set of post IDs
 */
export async function fetchPostEntities(
  supabase: SupabaseClient,
  postIds: number[]
): Promise<{
  locationsByPost: Map<number, LocationEntity[]>
  primaryLocationByPost: Map<number, LocationEntity | null>
  entitiesByPost: Map<number, PostEntities>
}> {
  if (postIds.length === 0) {
    return {
      locationsByPost: new Map(),
      primaryLocationByPost: new Map(),
      entitiesByPost: new Map()
    }
  }

  // Fetch locations
  const { data: locationData, error: locationsError } = await supabase
    .from('post_locations')
    .select(`
      post_id,
      priority,
      locations_master!inner(
        id,
        name,
        latitude,
        longitude,
        canonical_name,
        location_type,
        location_subtype,
        type_confidence,
        wikipedia_title,
        wikipedia_url
      )
    `)
    .in('post_id', postIds)
    .order('post_id', { ascending: false })
    .order('priority', { ascending: true })

  if (locationsError) {
    throw new QueryError('Failed to fetch location data', locationsError)
  }

  // Fetch people
  const { data: peopleData, error: peopleError } = await supabase
    .from('post_people')
    .select(`
      post_id,
      mentioned_as,
      people_master!inner(
        id,
        name,
        canonical_name,
        wikipedia_title,
        wikipedia_url,
        wikipedia_page_id,
        title,
        role
      )
    `)
    .in('post_id', postIds)

  if (peopleError) {
    throw new QueryError('Failed to fetch people data', peopleError)
  }

  // Fetch policies
  const { data: policiesData, error: policiesError } = await supabase
    .from('post_policies')
    .select(`
      post_id,
      policies_master!inner(
        id,
        policy_name,
        canonical_name,
        wikipedia_title,
        wikipedia_url,
        wikipedia_page_id
      )
    `)
    .in('post_id', postIds)

  if (policiesError) {
    throw new QueryError('Failed to fetch policies data', policiesError)
  }

  // Fetch groups
  const { data: groupsData, error: groupsError } = await supabase
    .from('post_groups')
    .select(`
      post_id,
      groups_master!inner(
        id,
        group_name,
        canonical_name,
        wikipedia_title,
        wikipedia_url,
        wikipedia_page_id
      )
    `)
    .in('post_id', postIds)

  if (groupsError) {
    throw new QueryError('Failed to fetch groups data', groupsError)
  }

  // Group entities by post
  const result = groupEntitiesByPost(
    locationData || [],
    peopleData || [],
    policiesData || [],
    groupsData || []
  )

  return result
}

/**
 * Group entities by post ID and build maps
 */
export function groupEntitiesByPost(
  locationData: any[],
  peopleData: any[],
  policiesData: any[],
  groupsData: any[]
): {
  locationsByPost: Map<number, LocationEntity[]>
  primaryLocationByPost: Map<number, LocationEntity | null>
  entitiesByPost: Map<number, PostEntities>
} {
  // Build location maps (ordered by priority)
  const locationsByPost = new Map<number, LocationEntity[]>()
  const primaryLocationByPost = new Map<number, LocationEntity | null>()

  locationData.forEach((row: any) => {
    const entry: LocationEntity = {
      name: row.locations_master.name,
      latitude: row.locations_master.latitude,
      longitude: row.locations_master.longitude,
      location_type: row.locations_master.location_type,
      location_subtype: row.locations_master.location_subtype,
      type_confidence: row.locations_master.type_confidence,
      canonical_name: row.locations_master.canonical_name,
      wikipedia_title: row.locations_master.wikipedia_title,
      wikipedia_url: row.locations_master.wikipedia_url,
      priority: row.priority
    }

    if (!locationsByPost.has(row.post_id)) {
      locationsByPost.set(row.post_id, [entry])
      primaryLocationByPost.set(row.post_id, entry)
    } else {
      locationsByPost.get(row.post_id)!.push(entry)
    }
  })

  // Build entities map
  const entitiesByPost = new Map<number, PostEntities>()

  // Add people
  peopleData.forEach((person: any) => {
    if (!entitiesByPost.has(person.post_id)) {
      entitiesByPost.set(person.post_id, {
        people: [],
        locations: [],
        policies: [],
        groups: []
      })
    }
    const entities = entitiesByPost.get(person.post_id)!
    entities.people.push({
      name: person.people_master.name,
      mentioned_as: person.mentioned_as,
      canonical_name: person.people_master.canonical_name,
      title: person.people_master.title,
      role: person.people_master.role,
      wikipedia_title: person.people_master.wikipedia_title,
      wikipedia_url: person.people_master.wikipedia_url,
      wikipedia_page_id: person.people_master.wikipedia_page_id
    })
  })

  // Add locations to entities (for Wikipedia data)
  locationData.forEach((loc: any) => {
    if (!entitiesByPost.has(loc.post_id)) {
      entitiesByPost.set(loc.post_id, {
        people: [],
        locations: [],
        policies: [],
        groups: []
      })
    }
    const entities = entitiesByPost.get(loc.post_id)!
    entities.locations.push({
      name: loc.locations_master.name,
      canonical_name: loc.locations_master.canonical_name,
      wikipedia_title: loc.locations_master.wikipedia_title,
      wikipedia_url: loc.locations_master.wikipedia_url,
      latitude: loc.locations_master.latitude,
      longitude: loc.locations_master.longitude,
      location_type: loc.locations_master.location_type,
      location_subtype: loc.locations_master.location_subtype,
      type_confidence: loc.locations_master.type_confidence,
      priority: loc.priority
    })
  })

  // Add policies
  policiesData.forEach((policy: any) => {
    if (!entitiesByPost.has(policy.post_id)) {
      entitiesByPost.set(policy.post_id, {
        people: [],
        locations: [],
        policies: [],
        groups: []
      })
    }
    const entities = entitiesByPost.get(policy.post_id)!
    entities.policies.push({
      name: policy.policies_master.policy_name,
      canonical_name: policy.policies_master.canonical_name,
      wikipedia_title: policy.policies_master.wikipedia_title,
      wikipedia_url: policy.policies_master.wikipedia_url,
      wikipedia_page_id: policy.policies_master.wikipedia_page_id
    })
  })

  // Add groups
  groupsData.forEach((group: any) => {
    if (!entitiesByPost.has(group.post_id)) {
      entitiesByPost.set(group.post_id, {
        people: [],
        locations: [],
        policies: [],
        groups: []
      })
    }
    const entities = entitiesByPost.get(group.post_id)!
    entities.groups.push({
      name: group.groups_master.group_name,
      canonical_name: group.groups_master.canonical_name,
      wikipedia_title: group.groups_master.wikipedia_title,
      wikipedia_url: group.groups_master.wikipedia_url,
      wikipedia_page_id: group.groups_master.wikipedia_page_id
    })
  })

  return {
    locationsByPost,
    primaryLocationByPost,
    entitiesByPost
  }
}

