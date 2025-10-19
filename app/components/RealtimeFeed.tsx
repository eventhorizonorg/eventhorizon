'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabaseClient } from '@/lib/supabase/client'
import WikipediaPanel from './WikipediaPanel'

interface WikipediaEntity {
  name: string
  mentioned_as?: string
  canonical_name?: string
  title?: string
  role?: string
  wikipedia_title?: string
  wikipedia_url?: string
  wikipedia_page_id?: number
}

interface PostEntities {
  people: WikipediaEntity[]
  locations: WikipediaEntity[]
  policies: WikipediaEntity[]
  groups: WikipediaEntity[]
}

interface Post {
  id: number
  channel_name: string
  channel_username: string
  post_id: number
  date: string
  text: string
  has_photo: boolean
  has_video: boolean
  detected_language: string
}

interface LocationItem {
  name: string
  latitude: number | null
  longitude: number | null
  location_type?: string | null
  location_subtype?: string | null
  type_confidence?: number | null
  canonical_name?: string | null
  wikipedia_title?: string | null
  wikipedia_url?: string | null
  priority?: number
}

interface MediaItem {
  id: number
  media_type: 'photo' | 'video' | 'document' | 'audio'
  public_url: string
  filename?: string | null
  width?: number | null
  height?: number | null
}

interface FeedPost extends Post {
  location_name?: string
  country_code?: string
  latitude?: number | null
  longitude?: number | null
  entities?: PostEntities
  primaryLocation?: LocationItem | null
  locations?: LocationItem[]
  media?: MediaItem[]
}

interface ExternalPostSelection {
  id: number
  timestamp: number
}

interface RealtimeFeedProps {
  onZoomToLocation?: (latitude: number, longitude: number, locationName?: string, postId?: number, locationType?: string | null) => void
  externalSelection?: ExternalPostSelection | null
}

export default function RealtimeFeed({ onZoomToLocation, externalSelection }: RealtimeFeedProps) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'failed' | 'disabled'>('connecting')
  const [newPostCount, setNewPostCount] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMorePosts, setHasMorePosts] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const postRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null)
  const [isExpanding, setIsExpanding] = useState(false)
  const [selectedWikipediaTitle, setSelectedWikipediaTitle] = useState<string | null>(null)
  const postsRef = useRef<FeedPost[]>([])


  const mapApiPostToFeedPost = useCallback((post: any): FeedPost => ({
    id: post.id,
    channel_name: post.channel,
    channel_username: post.channel_username,
    post_id: post.post_id,
    date: post.date,
    text: post.text,
    has_photo: post.has_photo,
    has_video: post.has_video,
    detected_language: post.detected_language,
    location_name: post.location_name,
    country_code: post.country_code,
    latitude: post.latitude,
    longitude: post.longitude,
    entities: post.entities,
    primaryLocation: post.primaryLocation || null,
    locations: post.locations || [],
    media: Array.isArray(post.media) ? post.media : []
  }), [])

  // Handle toggle with animation
  const handleToggle = () => {
    if (isAnimating) return // Prevent multiple clicks during animation
    
    if (isExpanded) {
      // Collapsing - start fade out animation
      setIsAnimating(true)
      setTimeout(() => {
        setIsExpanded(false)
        setIsAnimating(false)
      }, 150) // Match fadeOutDown duration
    } else {
      // Expanding - immediate
      setIsExpanded(true)
    }
  }

  useEffect(() => {
    postsRef.current = posts
  }, [posts])

  // Load more posts for pagination
  const loadMorePosts = async () => {
    if (loadingMore || !hasMorePosts) return
    
    setLoadingMore(true)
    try {
      const response = await fetch(`/api/feed?page=${currentPage + 1}&limit=20`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.posts && data.posts.length > 0) {
        const newPosts = data.posts.map(mapApiPostToFeedPost)
        
        setPosts(prev => {
          const mergedMap = new Map<number, FeedPost>()
          prev.forEach(post => mergedMap.set(post.id, post))
          newPosts.forEach(post => mergedMap.set(post.id, post))
          return Array.from(mergedMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        })
        setCurrentPage(prev => prev + 1)
        
        // Check if we have more posts based on API response
        if (!data.hasMore) {
          setHasMorePosts(false)
        }
      } else {
        setHasMorePosts(false)
      }
    } catch (error) {
      console.error('❌ Error loading more posts:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  // Handle scroll for load more functionality
  const handleScroll = () => {
    if (!scrollContainerRef.current) return
    
    const container = scrollContainerRef.current
    const scrollTop = container.scrollTop
    const scrollHeight = container.scrollHeight
    const clientHeight = container.clientHeight
    
    // Load more when near bottom
    if (scrollTop + clientHeight >= scrollHeight - 200 && hasMorePosts && !loadingMore) {
      loadMorePosts()
    }
  }

  // Handle post expansion with fade animations and map zoom
  const handlePostClick = (post: FeedPost) => {
    if (isExpanding) return // Prevent clicks during animation
    
    if (expandedPostId === post.id) {
      // Collapsing - start fade out animation
      setIsExpanding(true)
      setTimeout(() => {
        setExpandedPostId(null)
        setIsExpanding(false)
      }, 200) // Match fadeOut duration
    } else {
      // Expanding - immediate
      setExpandedPostId(post.id)
      // Close Wikipedia panel when clicking a new post
      setSelectedWikipediaTitle(null)
      // Smoothly scroll the clicked post into view within the feed
      requestAnimationFrame(() => {
        const container = scrollContainerRef.current
        const target = postRefs.current.get(post.id)
        if (container && target) {
          const desiredTop = Math.max(target.offsetTop - 8, 0)
          const maxTop = Math.max(container.scrollHeight - container.clientHeight, 0)
          container.scrollTo({ top: Math.min(desiredTop, maxTop), behavior: 'smooth' })
        }
      })
      
      // Also zoom to location if available
      if (post.latitude && post.longitude && onZoomToLocation) {
        onZoomToLocation(post.latitude, post.longitude, post.location_name || undefined, post.id)
      }
    }
  }

  // Load initial posts
  useEffect(() => {
    const loadInitialPosts = async () => {
      try {
        const response = await fetch('/api/feed', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.posts && Array.isArray(data.posts)) {
          // Get unique posts (since API returns posts with locations, we might have duplicates)
          const uniquePosts = data.posts.reduce((acc: FeedPost[], post: any) => {
            const existingPost = acc.find(p => p.id === post.id)
            if (!existingPost) {
              acc.push(mapApiPostToFeedPost(post))
            }
            return acc
          }, [])
          
          // Sort by date and take latest 20 for better scrolling
          const latestPosts = uniquePosts
            .sort((a: FeedPost, b: FeedPost) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 20)
          
          setPosts(latestPosts)
        }
      } catch (error) {
        console.error('❌ Error loading initial posts:', error)
      } finally {
        setLoading(false)
      }
    }

    loadInitialPosts()
  }, [])

  // Set up real-time subscription
  useEffect(() => {
    
    try {
      const supabase = supabaseClient()
      
      const subscription = supabase
        .channel('feed_realtime')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        }, async (payload) => {
          // Filter out large embedding data from console log
          const filteredPayload = {
            ...payload,
            new: {
              id: payload.new.id,
              channel_name: payload.new.channel_name,
              channel_username: payload.new.channel_username,
              post_id: payload.new.post_id,
              date: payload.new.date,
              text: payload.new.text,
              has_photo: payload.new.has_photo,
              has_video: payload.new.has_video,
              detected_language: payload.new.detected_language
              // Excluding embedding, embedding_dimensions, embedding_model for smaller payload
            }
          }
          
          // Fetch the complete post data with retry for location data
          const fetchPostWithRetry = async (retryCount = 0) => {
            try {
              const response = await fetch('/api/feed', {
                cache: 'no-store',
                headers: {
                  'Cache-Control': 'no-cache'
                }
              })
              const data = await response.json()
              
              if (data.posts && data.posts.length > 0) {
                // Find the new post
                const newPost = data.posts.find((post: any) => post.id === payload.new.id)
                if (newPost) {
                  
                  // Check if location data is available
                  if (newPost.latitude && newPost.longitude) {
                    const feedPost = mapApiPostToFeedPost(newPost)
                    
                    // Add to the beginning of the list and keep only 5
                    setPosts(prev => [feedPost, ...prev.slice(0, 4)])
                    setNewPostCount(prev => prev + 1)
                    
                    // Reset new post count after 3 seconds
                    setTimeout(() => setNewPostCount(0), 3000)
                  } else if (retryCount < 3) {
                    // Location data not ready yet, retry after a short delay
                    console.log(`🔄 Location data not ready for post ${payload.new.id}, retrying in 1s... (attempt ${retryCount + 1}/3)`)
                    setTimeout(() => fetchPostWithRetry(retryCount + 1), 1000)
                  } else {
                    // Add post without location data after max retries
                    console.log(`⚠️ Adding post ${payload.new.id} without location data after ${retryCount} retries`)
                    const feedPost = mapApiPostToFeedPost(newPost)
                    
                    setPosts(prev => [feedPost, ...prev.slice(0, 4)])
                    setNewPostCount(prev => prev + 1)
                    setTimeout(() => setNewPostCount(0), 3000)
                  }
                }
              }
            } catch (error) {
              console.error('❌ Error fetching new post data:', error)
            }
          }
          
          fetchPostWithRetry()
        })
        .subscribe((status, err) => {
          if (err) {
            console.error('❌ Feed subscription error:', err)
          }
          if (status === 'SUBSCRIBED') {
            setRealtimeStatus('connected')
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setRealtimeStatus('failed')
            console.error('❌ Feed subscription failed:', status)
          } else if (status === 'CLOSED') {
            setRealtimeStatus('disabled')
          }
        })

      return () => {
        subscription.unsubscribe()
      }
    } catch (error) {
      console.error('❌ Error setting up feed real-time subscription:', error)
      setRealtimeStatus('failed')
    }
  }, [])

  // Handle external selection requests (e.g., map marker clicks)
  useEffect(() => {
    if (!externalSelection) return

    const focusPost = async () => {
      const targetId = externalSelection.id
      if (!targetId) return

      setIsExpanded(true)

      const ensurePostPresent = async () => {
        const exists = postsRef.current.some(post => post.id === targetId)
        if (exists) return

        try {
          const response = await fetch('/api/feed', {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache'
            }
          })

          if (!response.ok) return
          const data = await response.json()
          if (!data.posts || !Array.isArray(data.posts)) return

          const fetchedPosts = data.posts.map(mapApiPostToFeedPost)
          setPosts(prev => {
            const mergedMap = new Map<number, FeedPost>()
            prev.forEach(post => mergedMap.set(post.id, post))
            fetchedPosts.forEach(post => mergedMap.set(post.id, post))
            return Array.from(mergedMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          })
        } catch (error) {
          console.error('❌ Error refreshing posts for external selection:', error)
        }
      }

      await ensurePostPresent()
      setSelectedWikipediaTitle(null)
      setExpandedPostId(targetId)

      requestAnimationFrame(() => {
        const container = scrollContainerRef.current
        const target = postRefs.current.get(targetId)
        if (container && target) {
          const desiredTop = Math.max(target.offsetTop - 8, 0)
          const maxTop = Math.max(container.scrollHeight - container.clientHeight, 0)
          container.scrollTo({ top: Math.min(desiredTop, maxTop), behavior: 'smooth' })
        }
      })
    }

    focusPost()
  }, [externalSelection, mapApiPostToFeedPost])

  // Render text with clickable Wikipedia entities
  const renderTextWithEntities = (text: string, entities?: PostEntities) => {
    // Collect all entities with Wikipedia links (if any)
    const allEntities: Array<{ name: string; wikipedia_title?: string }> = []

    if (entities) {
      allEntities.push(
        ...entities.people.filter(e => e.wikipedia_title),
        ...entities.locations.filter(e => e.wikipedia_title),
        ...entities.policies.filter(e => e.wikipedia_title),
        ...entities.groups.filter(e => e.wikipedia_title)
      )

      // Entities loaded successfully
    }

    // Always-available simple keywords (temporary: make specific names clickable regardless of DB)
    const staticEntities: Array<{ name: string; wikipedia_title: string }> = [
      { name: 'Trump', wikipedia_title: 'Donald_Trump' }
    ]
    allEntities.push(...staticEntities)

    if (allEntities.length === 0) return text

    // Sort entities by length (longest first) to avoid partial matches
    allEntities.sort((a, b) => b.name.length - a.name.length)

    // Split text into parts and identify entity matches
    const parts: Array<{ text: string; entity?: { name: string; wikipedia_title: string } }> = []
    let remainingText = text
    let currentIndex = 0

    while (remainingText.length > 0) {
      let foundMatch = false

      for (const entity of allEntities) {
        const entityIndex = remainingText.toLowerCase().indexOf(entity.name.toLowerCase())
        
        if (entityIndex === 0) {
          // Found a match at the start
          parts.push({
            text: remainingText.substring(0, entity.name.length),
            entity: { name: entity.name, wikipedia_title: entity.wikipedia_title! }
          })
          remainingText = remainingText.substring(entity.name.length)
          currentIndex += entity.name.length
          foundMatch = true
          break
        }
      }

      if (!foundMatch) {
        // No match found, add one character as plain text
        parts.push({ text: remainingText[0] })
        remainingText = remainingText.substring(1)
        currentIndex++
      }
    }

    // Render the parts
    return (
      <span>
        {parts.map((part, index) => {
          if (part.entity) {
            return (
              <span
                key={index}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedWikipediaTitle(part.entity!.wikipedia_title)
                }}
                className="text-white hover:text-white cursor-pointer font-bold relative group"
                title={`Click to view ${part.entity.name} on Wikipedia`}
              >
                {part.text}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
              </span>
            )
          }
          return <span key={index}>{part.text}</span>
        })}
      </span>
    )
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }

const truncateText = (text: string, maxLength: number = 120) => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

const renderMediaContent = (post: FeedPost, isExpanded: boolean) => {
  if (!post.media || post.media.length === 0) return null

  return (
    <div className="space-y-2 mb-2">
      {post.media.map((item) => {
        if (!item || !item.public_url) return null
        const preventToggle = isExpanded
          ? (event: React.MouseEvent<HTMLElement>) => event.stopPropagation()
          : undefined

        if (item.media_type === 'photo') {
          return (
            <div
              key={item.id}
              className="overflow-hidden rounded-lg border border-white/10 bg-black/40"
              onClick={preventToggle}
            >
              <img
                src={item.public_url}
                alt={item.filename || 'Telegram photo'}
                loading="lazy"
                className="h-auto w-full object-contain"
              />
            </div>
          )
        }

        if (item.media_type === 'video') {
          return (
            <div
              key={item.id}
              className="overflow-hidden rounded-lg border border-white/10 bg-black/40"
            >
              <video
                controls
                src={item.public_url}
                className="w-full"
                preload="metadata"
                onClick={preventToggle}
                onDoubleClick={preventToggle}
              />
            </div>
          )
        }

        if (item.media_type === 'audio') {
          return (
            <div
              key={item.id}
              className="rounded-lg border border-white/10 bg-black/40 p-3"
              onClick={preventToggle}
            >
              <audio controls className="w-full">
                <source src={item.public_url} />
                Your browser does not support the audio element.
              </audio>
            </div>
          )
        }

        // For document/audio or other media types provide a simple link fallback
        return (
          <a
            key={item.id}
            href={item.public_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-blue-300 hover:text-blue-200"
            onClick={preventToggle}
          >
            <span className="truncate">
              {item.filename || `${item.media_type} attachment`}
            </span>
            <span className="ml-2 text-white/60">↗</span>
          </a>
        )
      })}
    </div>
  )
}

// Render up to 3 location chips per post, ordered by priority (already ordered from API)
const renderLocationChips = (post: FeedPost) => {
    const list: LocationItem[] = (post.locations && post.locations.length > 0)
      ? post.locations
      : (post.primaryLocation ? [post.primaryLocation] : [])

    if (!list || list.length === 0) return null

  const shown = list.slice(0, 3)

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {shown.map((loc, idx) => (
          <div
            key={`${post.id}-loc-${idx}-${loc.name}`}
            className="flex items-center space-x-1 px-2 py-1 rounded-md border border-white/10 text-white/70 hover:text-white/90 hover:bg-white/5 text-[10px] transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              if (loc.latitude != null && loc.longitude != null && onZoomToLocation) {
                onZoomToLocation(loc.latitude, loc.longitude, loc.name, post.id, loc.location_type || null)
              }
            }}
            role="button"
          >
            <span className="truncate max-w-[120px]">{loc.name}</span>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-black/80 backdrop-blur-sm rounded-lg">
        <div className="flex items-center justify-between p-4 cursor-pointer" onClick={handleToggle}>
          <div className={`flex items-center space-x-2 transition-all duration-300 ease-in-out ${
            isExpanded ? 'transform -translate-x-2' : 'transform translate-x-0'
          }`}>
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-white text-sm font-medium hover:scale-105 transition-transform duration-200">Loading Feed...</span>
          </div>
          <svg 
            className={`w-4 h-4 text-white/60 transition-all duration-300 ease-in-out ml-4 ${
              isExpanded ? 'rotate-180 transform translate-x-2' : 'rotate-0 transform translate-x-0'
            }`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className={`fixed top-4 right-4 z-50 backdrop-blur-sm rounded-lg transition-all duration-300 ease-in-out ${
      isExpanded ? 'w-80' : 'w-auto'
    }`}>
      {/* Header - Always visible */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={handleToggle}
      >
        <div className={`flex items-center space-x-2 transition-all duration-300 ease-in-out ${
          isExpanded ? 'transform -translate-x-2' : 'transform translate-x-0'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            realtimeStatus === 'connected' ? 'bg-green-500 animate-pulse' :
            realtimeStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            realtimeStatus === 'failed' ? 'bg-red-500' :
            'bg-gray-500'
          }`}></div>
          <span className="text-white text-sm font-semibold hover:scale-105 transition-transform duration-200">Live Feed</span>
          {newPostCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
              {newPostCount} new
            </span>
          )}
        </div>
        <svg 
          className={`w-4 h-4 text-white/60 transition-all duration-300 ease-in-out ml-4 ${
            isExpanded ? 'rotate-180 transform translate-x-2' : 'rotate-0 transform translate-x-0'
          }`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Posts List - Only visible when expanded */}
      {(isExpanded || isAnimating) && (
        <div className={`overflow-hidden transition-all duration-300 ease-in-out relative mt-2 ${
          isAnimating ? 'animate-fadeOut' : 'animate-fadeIn'
        }`}>
          <div 
            ref={scrollContainerRef}
            className="px-4 pt-3 pb-4 space-y-2 overflow-y-auto max-h-[40vh] pr-2 feed-fade-bottom-half"
            onScroll={handleScroll}
          >
            
            {/* Posts */}
            
            {posts.length === 0 ? (
              <div className="text-white/60 text-sm text-center py-4">
                No posts available
              </div>
            ) : (
              <>
                {/* Simple scrolling without virtual scrolling for now */}
                {posts.map((post, index) => (
                  <div
                    key={post.id}
                    ref={(el) => {
                      if (el) {
                        postRefs.current.set(post.id, el)
                      } else {
                        postRefs.current.delete(post.id)
                      }
                    }}
                    className={`bg-white/5 backdrop-blur-sm rounded-lg p-3 transition-all duration-500 cursor-pointer mb-3 ${
                      index === 0 && newPostCount > 0 
                        ? 'bg-red-500/10 animate-pulse' 
                        : 'hover:bg-white/10'
                    } ${
                      expandedPostId === post.id ? 'ring-2 ring-blue-500/50 animate-slide-into' : ''
                    }`}
                    onClick={() => handlePostClick(post)}
                  >
                  {/* Post Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-white text-xs font-medium truncate flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                        {post.channel_name}
                      </span>
                      {post.has_photo && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M4,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M4,6V18H20V6H4M6,8A1,1 0 0,1 7,9A1,1 0 0,1 6,10A1,1 0 0,1 5,9A1,1 0 0,1 6,8M12,19L18,13L16.59,11.59L12,16.17L9.41,13.59L8,15L12,19Z"/>
                        </svg>
                      )}
                      {post.has_video && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z"/>
                        </svg>
                      )}
                    </div>
                    <span className="text-white/60 text-xs">
                      {formatTime(post.date)}
                    </span>
                  </div>

                  {/* Post Content */}
                  <div className="mb-2">
                    <p className="text-white/90 text-xs leading-relaxed transition-all duration-300">
                      {expandedPostId === post.id 
                        ? renderTextWithEntities(post.text, post.entities)
                        : renderTextWithEntities(truncateText(post.text), post.entities)
                      }
                    </p>
                  </div>

                  {/* Media Attachments */}
                  {renderMediaContent(post, expandedPostId === post.id)}

                  {/* Post Footer */}
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <div className="flex items-center space-x-2">
                      {post.location_name && (
                        <span className="flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12,2C8.13,2 5,5.13 5,9C5,14.25 12,22 12,22S19,14.25 19,9C19,5.13 15.87,2 12,2M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5Z"/>
                          </svg>
                          {post.location_name}
                        </span>
                      )}
                      {post.country_code && (
                        <span className="flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.9,17.39C17.64,16.59 16.89,16 16,16H15V13A1,1 0 0,0 14,12H8V10H10A1,1 0 0,0 11,9V7H13A2,2 0 0,0 15,5V4.59C17.93,5.77 20,8.64 20,12C20,14.08 19.2,15.97 17.9,17.39M11,19.93C7.05,19.44 4,16.08 4,12C4,11.38 4.08,10.78 4.21,10.21L9,15V16A2,2 0 0,0 11,18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                          </svg>
                          {post.country_code}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {post.channel_username && (
                        <a
                          href={`https://t.me/${post.channel_username.replace('@', '')}/${post.post_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          onClick={(e) => e.stopPropagation()} // Prevent parent click
                        >
                          View →
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Location Chips (prioritized) */}
                  {renderLocationChips(post)}
                  </div>
                ))}
                
                {/* Load more indicator */}
                {loadingMore && (
                  <div className="text-white/60 text-sm text-center py-4">
                    Loading more posts...
                  </div>
                )}
                
                {!hasMorePosts && posts.length > 0 && (
                  <div className="text-white/40 text-xs text-center py-2">
                    No more posts to load
                  </div>
                )}
                
                {/* Invisible spacer posts to allow scrolling last post up to header */}
                <div className="space-y-2">
                  {/* Add 3-4 invisible spacer divs to create scrollable space */}
                  {Array.from({ length: 4 }, (_, index) => (
                    <div
                      key={`spacer-${index}`}
                      className="h-16 opacity-0 pointer-events-none"
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          
        </div>
      )}

      {/* Wikipedia Panel */}
      <WikipediaPanel 
        wikipediaTitle={selectedWikipediaTitle}
        onClose={() => setSelectedWikipediaTitle(null)}
      />
    </div>
  )
}
