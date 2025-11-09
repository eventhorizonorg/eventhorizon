/**
 * Tests for Timeline API route
 */

import { GET } from '@/app/api/timeline/route'

// Mock dependencies
jest.mock('@/lib/services/timeline-service')
jest.mock('@/lib/supabase/server')

describe('Timeline API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Set up environment variables
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'test-key'
  })

  afterEach(() => {
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_ANON_KEY
  })

  describe('Parameter Validation', () => {
    it('should return 400 when startDate is missing', async () => {
      const request = new Request('http://localhost:3000/api/timeline?endDate=2024-01-02')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.status).toBe('error')
      expect(data.message).toContain('startDate')
    })

    it('should return 400 when endDate is missing', async () => {
      const request = new Request('http://localhost:3000/api/timeline?startDate=2024-01-01')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.status).toBe('error')
      expect(data.message).toContain('endDate')
    })

    it('should return 400 when startDate is after endDate', async () => {
      const request = new Request(
        'http://localhost:3000/api/timeline?startDate=2024-01-02&endDate=2024-01-01'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.status).toBe('error')
      expect(data.message).toContain('startDate must be before endDate')
    })

    it('should return 400 when date range exceeds 1 year', async () => {
      const request = new Request(
        'http://localhost:3000/api/timeline?startDate=2023-01-01&endDate=2024-01-02'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.status).toBe('error')
      expect(data.message).toContain('Date range cannot exceed 1 year')
    })

    it('should return 400 for invalid entity ID', async () => {
      const request = new Request(
        'http://localhost:3000/api/timeline?startDate=2024-01-01&endDate=2024-01-02&locationId=invalid'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.status).toBe('error')
    })

    it('should return 400 for negative entity ID', async () => {
      const request = new Request(
        'http://localhost:3000/api/timeline?startDate=2024-01-01&endDate=2024-01-02&personId=-1'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.status).toBe('error')
    })

    it('should return 400 for invalid pagination', async () => {
      const request = new Request(
        'http://localhost:3000/api/timeline?startDate=2024-01-01&endDate=2024-01-02&page=0'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.status).toBe('error')
    })

    it('should sanitize limit to max 100', async () => {
      const { getTimelinePosts } = require('@/lib/services/timeline-service')
      getTimelinePosts.mockResolvedValue({
        status: 'success',
        posts: [],
        count: 0,
        hasMore: false,
        page: 1,
        limit: 100
      })

      const request = new Request(
        'http://localhost:3000/api/timeline?startDate=2024-01-01&endDate=2024-01-02&limit=200'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.limit).toBe(100)
    })
  })

  describe('Successful Requests', () => {
    it('should return success response with valid parameters', async () => {
      const mockPosts = [
        {
          id: 1,
          post_id: 123,
          text: 'Test post',
          date: '2024-01-01T12:00:00Z',
          channel: 'Test Channel',
          channel_username: 'testchannel',
          latitude: null,
          longitude: null,
          location_name: null,
          country_code: null,
          has_photo: false,
          has_video: false,
          detected_language: 'en',
          media: [],
          entities: {
            people: [],
            locations: [],
            policies: [],
            groups: []
          },
          primaryLocation: null,
          locations: []
        }
      ]

      const { getTimelinePosts } = require('@/lib/services/timeline-service')
      getTimelinePosts.mockResolvedValue({
        status: 'success',
        posts: mockPosts,
        count: 1,
        hasMore: false,
        page: 1,
        limit: 20
      })

      const request = new Request(
        'http://localhost:3000/api/timeline?startDate=2024-01-01&endDate=2024-01-02'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('success')
      expect(data.posts).toHaveLength(1)
      expect(data.count).toBe(1)
      expect(data.hasMore).toBe(false)
      expect(data.page).toBe(1)
      expect(data.limit).toBe(20)
    })

    it('should handle empty results', async () => {
      const { getTimelinePosts } = require('@/lib/services/timeline-service')
      getTimelinePosts.mockResolvedValue({
        status: 'success',
        posts: [],
        count: 0,
        hasMore: false,
        page: 1,
        limit: 20
      })

      const request = new Request(
        'http://localhost:3000/api/timeline?startDate=2024-01-01&endDate=2024-01-02'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('success')
      expect(data.posts).toHaveLength(0)
      expect(data.count).toBe(0)
    })
  })

  describe('Missing Environment Variables', () => {
    it('should return empty results when Supabase env vars are missing', async () => {
      delete process.env.SUPABASE_URL
      delete process.env.SUPABASE_ANON_KEY

      const request = new Request(
        'http://localhost:3000/api/timeline?startDate=2024-01-01&endDate=2024-01-02'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('success')
      expect(data.posts).toHaveLength(0)
      expect(data.count).toBe(0)
    })
  })

  describe('Query Parameters', () => {
    it('should handle entity filters', async () => {
      const { getTimelinePosts } = require('@/lib/services/timeline-service')
      getTimelinePosts.mockResolvedValue({
        status: 'success',
        posts: [],
        count: 0,
        hasMore: false,
        page: 1,
        limit: 20
      })

      const request = new Request(
        'http://localhost:3000/api/timeline?startDate=2024-01-01&endDate=2024-01-02&locationId=1&personId=2'
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(getTimelinePosts).toHaveBeenCalledWith(
        expect.objectContaining({
          locationId: 1,
          personId: 2
        })
      )
    })

    it('should handle channel filter', async () => {
      const { getTimelinePosts } = require('@/lib/services/timeline-service')
      getTimelinePosts.mockResolvedValue({
        status: 'success',
        posts: [],
        count: 0,
        hasMore: false,
        page: 1,
        limit: 20
      })

      const request = new Request(
        'http://localhost:3000/api/timeline?startDate=2024-01-01&endDate=2024-01-02&channel=testchannel'
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(getTimelinePosts).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'testchannel'
        })
      )
    })

    it('should handle pagination parameters', async () => {
      const { getTimelinePosts } = require('@/lib/services/timeline-service')
      getTimelinePosts.mockResolvedValue({
        status: 'success',
        posts: [],
        count: 0,
        hasMore: false,
        page: 2,
        limit: 50
      })

      const request = new Request(
        'http://localhost:3000/api/timeline?startDate=2024-01-01&endDate=2024-01-02&page=2&limit=50'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.page).toBe(2)
      expect(data.limit).toBe(50)
    })
  })

  describe('Error Handling', () => {
    it('should handle query errors', async () => {
      const { getTimelinePosts } = require('@/lib/services/timeline-service')
      const { QueryError } = require('@/lib/utils/errors')
      getTimelinePosts.mockRejectedValue(new QueryError('Database query failed'))

      const request = new Request(
        'http://localhost:3000/api/timeline?startDate=2024-01-01&endDate=2024-01-02'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.status).toBe('error')
      expect(data.message).toContain('Database query failed')
    })

    it('should handle unexpected errors', async () => {
      const { getTimelinePosts } = require('@/lib/services/timeline-service')
      getTimelinePosts.mockRejectedValue(new Error('Unexpected error'))

      const request = new Request(
        'http://localhost:3000/api/timeline?startDate=2024-01-01&endDate=2024-01-02'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.status).toBe('error')
      expect(data.message).toContain('Internal server error')
    })
  })
})

