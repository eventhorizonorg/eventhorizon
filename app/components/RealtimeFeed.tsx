'use client'

import { useEffect, useState } from 'react'
import { supabaseClient } from '@/lib/supabase/client'

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

interface FeedPost extends Post {
  location_name?: string
  country_code?: string
  latitude?: number | null
  longitude?: number | null
}

interface RealtimeFeedProps {
  onZoomToLocation?: (latitude: number, longitude: number, locationName?: string, postId?: number) => void
}

export default function RealtimeFeed({ onZoomToLocation }: RealtimeFeedProps) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'failed' | 'disabled'>('connecting')
  const [newPostCount, setNewPostCount] = useState(0)

  // Load initial posts
  useEffect(() => {
    const loadInitialPosts = async () => {
      try {
        console.log('🔄 Loading initial posts for feed...')
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
        console.log('📊 Feed API Response:', data)
        
        if (data.posts && Array.isArray(data.posts)) {
          // Get unique posts (since API returns posts with locations, we might have duplicates)
          const uniquePosts = data.posts.reduce((acc: FeedPost[], post: any) => {
            const existingPost = acc.find(p => p.id === post.id)
            if (!existingPost) {
              acc.push({
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
                longitude: post.longitude
              })
            }
            return acc
          }, [])
          
          // Sort by date and take latest 5
          const latestPosts = uniquePosts
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5)
          
          console.log(`📍 Feed loaded ${latestPosts.length} posts`)
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
    console.log('🔌 Setting up real-time subscription for feed...')
    
    try {
      const supabase = supabaseClient()
      
      const subscription = supabase
        .channel('feed_realtime')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        }, async (payload) => {
          console.log('🆕 New post received in feed:', payload.new)
          console.log('🔍 Payload details:', JSON.stringify(payload, null, 2))
          
          // Fetch the complete post data
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
                console.log('📍 Adding new post to feed:', newPost)
                
                const feedPost: FeedPost = {
                  id: newPost.id,
                  channel_name: newPost.channel,
                  channel_username: newPost.channel_username,
                  post_id: newPost.post_id,
                  date: newPost.date,
                  text: newPost.text,
                  has_photo: newPost.has_photo,
                  has_video: newPost.has_video,
                  detected_language: newPost.detected_language,
                  location_name: newPost.location_name,
                  country_code: newPost.country_code,
                  latitude: newPost.latitude,
                  longitude: newPost.longitude
                }
                
                // Add to the beginning of the list and keep only 5
                setPosts(prev => [feedPost, ...prev.slice(0, 4)])
                setNewPostCount(prev => prev + 1)
                
                // Reset new post count after 3 seconds
                setTimeout(() => setNewPostCount(0), 3000)
              }
            }
          } catch (error) {
            console.error('❌ Error fetching new post data:', error)
          }
        })
        .subscribe((status, err) => {
          console.log('📡 Feed real-time subscription status:', status)
          if (err) {
            console.error('❌ Feed subscription error:', err)
          }
          if (status === 'SUBSCRIBED') {
            setRealtimeStatus('connected')
            console.log('✅ Feed subscription successful - ready to receive real-time updates')
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setRealtimeStatus('failed')
            console.error('❌ Feed subscription failed:', status)
          } else if (status === 'CLOSED') {
            setRealtimeStatus('disabled')
            console.log('🔌 Feed subscription closed')
          }
        })

      return () => {
        console.log('🔌 Cleaning up feed real-time subscription')
        subscription.unsubscribe()
      }
    } catch (error) {
      console.error('❌ Error setting up feed real-time subscription:', error)
      setRealtimeStatus('failed')
    }
  }, [])

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

  if (loading) {
    return (
      <div className="fixed top-4 right-4 z-50 w-80 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          <span className="text-white text-sm font-medium">Loading Feed...</span>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-white/20 rounded mb-2"></div>
              <div className="h-3 bg-white/10 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-80 rounded-lg p-4 max-h-[70vh] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            realtimeStatus === 'connected' ? 'bg-green-500 animate-pulse' :
            realtimeStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            realtimeStatus === 'failed' ? 'bg-red-500' :
            'bg-gray-500'
          }`}></div>
          <span className="text-white text-sm font-semibold">Live Feed</span>
          {newPostCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
              {newPostCount} new
            </span>
          )}
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-2">
        {posts.length === 0 ? (
          <div className="text-white/60 text-sm text-center py-4">
            No posts available
          </div>
        ) : (
          posts.map((post, index) => (
            <div
              key={post.id}
              className={`bg-white/5 backdrop-blur-sm rounded-lg p-3 transition-all duration-300 cursor-pointer ${
                index === 0 && newPostCount > 0 
                  ? 'bg-red-500/10 animate-pulse' 
                  : 'hover:bg-white/10'
              }`}
              onClick={() => {
                if (post.latitude && post.longitude && onZoomToLocation) {
                  onZoomToLocation(post.latitude, post.longitude, post.location_name || undefined, post.id)
                }
              }}
            >
              {/* Post Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-white text-xs font-medium truncate flex items-center space-x-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="white"/>
                    </svg>
                    <span>{post.channel_name}</span>
                  </span>
                  {post.has_photo && <span className="text-blue-400 text-xs">📷</span>}
                  {post.has_video && <span className="text-purple-400 text-xs">🎥</span>}
                </div>
                <span className="text-white/60 text-xs">
                  {formatTime(post.date)}
                </span>
              </div>

              {/* Post Content */}
              <p className="text-white/90 text-xs leading-relaxed mb-2">
                {truncateText(post.text)}
              </p>

              {/* Post Footer */}
              <div className="flex items-center justify-between text-xs text-white/60 min-h-[20px]">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  {post.location_name && (
                    <span className="flex items-center space-x-1 flex-shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22S19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9S10.62 6.5 12 6.5S14.5 7.62 14.5 9S13.38 11.5 12 11.5Z" fill="white"/>
                      </svg>
                      <span className="truncate">{post.location_name}</span>
                    </span>
                  )}
                  {post.country_code && (
                    <span className="flex-shrink-0">🌍 {post.country_code}</span>
                  )}
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                  {post.channel_username && (
                    <a
                      href={`https://t.me/${post.channel_username.replace('@', '')}/${post.post_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 transition-colors text-[10px] whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()} // Prevent parent click
                    >
                      View on Telegram
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  )
}
