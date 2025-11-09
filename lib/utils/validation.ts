/**
 * Validation utilities for Timeline API
 */

import { ValidationError } from './errors'
import type { DateRange, PaginationParams, TimelineFilters } from '../types/timeline'

/**
 * Validate date range
 * Ensures dates are valid and start < end
 */
export function validateDateRange(dateRange: DateRange): void {
  const { startDate, endDate } = dateRange

  if (!startDate || !endDate) {
    throw new ValidationError('Both startDate and endDate are required')
  }

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (isNaN(start.getTime())) {
    throw new ValidationError(`Invalid startDate: ${startDate}`)
  }

  if (isNaN(end.getTime())) {
    throw new ValidationError(`Invalid endDate: ${endDate}`)
  }

  if (start >= end) {
    throw new ValidationError('startDate must be before endDate')
  }

  // Optional: enforce maximum date range (e.g., 1 year)
  const maxRangeMs = 365 * 24 * 60 * 60 * 1000 // 1 year
  if (end.getTime() - start.getTime() > maxRangeMs) {
    throw new ValidationError('Date range cannot exceed 1 year')
  }
}

/**
 * Sanitize and validate pagination parameters
 * Ensures page/limit are reasonable
 */
export function sanitizePaginationParams(params: {
  page?: string | number
  limit?: string | number
}): PaginationParams {
  const page = Math.max(1, parseInt(String(params.page || 1), 10))
  const limit = Math.min(100, Math.max(1, parseInt(String(params.limit || 20), 10)))

  if (isNaN(page) || isNaN(limit)) {
    throw new ValidationError('Invalid pagination parameters')
  }

  return { page, limit }
}

/**
 * Validate entity IDs are positive integers
 */
export function validateEntityIds(filters: TimelineFilters): void {
  if (filters.locationId !== undefined) {
    const id = parseInt(String(filters.locationId), 10)
    if (isNaN(id) || id <= 0) {
      throw new ValidationError(`Invalid locationId: ${filters.locationId}`)
    }
  }

  if (filters.personId !== undefined) {
    const id = parseInt(String(filters.personId), 10)
    if (isNaN(id) || id <= 0) {
      throw new ValidationError(`Invalid personId: ${filters.personId}`)
    }
  }

  if (filters.policyId !== undefined) {
    const id = parseInt(String(filters.policyId), 10)
    if (isNaN(id) || id <= 0) {
      throw new ValidationError(`Invalid policyId: ${filters.policyId}`)
    }
  }

  if (filters.groupId !== undefined) {
    const id = parseInt(String(filters.groupId), 10)
    if (isNaN(id) || id <= 0) {
      throw new ValidationError(`Invalid groupId: ${filters.groupId}`)
    }
  }
}

/**
 * Validate channel filter is a non-empty string
 */
export function validateChannelFilter(filters: TimelineFilters): void {
  if (filters.channel !== undefined) {
    if (typeof filters.channel !== 'string' || filters.channel.trim().length === 0) {
      throw new ValidationError('Channel filter must be a non-empty string')
    }
  }
}

/**
 * Validate all timeline query parameters
 */
export function validateTimelineParams(params: {
  startDate?: string
  endDate?: string
  locationId?: string | number
  locationName?: string
  personId?: string | number
  personName?: string
  policyId?: string | number
  groupId?: string | number
  channel?: string
  page?: string | number
  limit?: string | number
}): {
  dateRange: DateRange
  filters: TimelineFilters
  pagination: PaginationParams
} {
  // Build filters object
  const filters: TimelineFilters = {}
  
  // Location filtering - prefer ID over name
  if (params.locationId !== undefined) {
    filters.locationId = typeof params.locationId === 'string' 
      ? parseInt(params.locationId, 10) 
      : params.locationId
  } else if (params.locationName !== undefined) {
    filters.locationName = params.locationName.trim()
    if (filters.locationName.length === 0) {
      throw new ValidationError('locationName cannot be empty')
    }
  }
  
  // Person filtering - prefer ID over name
  if (params.personId !== undefined) {
    filters.personId = typeof params.personId === 'string'
      ? parseInt(params.personId, 10)
      : params.personId
  } else if (params.personName !== undefined) {
    filters.personName = params.personName.trim()
    if (filters.personName.length === 0) {
      throw new ValidationError('personName cannot be empty')
    }
  }
  
  if (params.policyId !== undefined) {
    filters.policyId = typeof params.policyId === 'string'
      ? parseInt(params.policyId, 10)
      : params.policyId
  }
  if (params.groupId !== undefined) {
    filters.groupId = typeof params.groupId === 'string'
      ? parseInt(params.groupId, 10)
      : params.groupId
  }
  if (params.channel !== undefined) {
    filters.channel = params.channel
  }

  // Validate
  if (!params.startDate || !params.endDate) {
    throw new ValidationError('startDate and endDate are required')
  }

  const dateRange: DateRange = {
    startDate: params.startDate,
    endDate: params.endDate
  }

  validateDateRange(dateRange)
  validateEntityIds(filters)
  validateChannelFilter(filters)

  const pagination = sanitizePaginationParams({
    page: params.page,
    limit: params.limit
  })

  return { dateRange, filters, pagination }
}

