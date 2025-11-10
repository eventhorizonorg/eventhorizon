'use client'

import { useEffect, useRef, useState } from 'react'
import type { TimelinePost } from '@/lib/types/timeline'

interface TimelineProps {
  locationName?: string
  personName?: string
  groupName?: string
  className?: string
}

export default function Timeline({ locationName, personName, groupName, className = '' }: TimelineProps) {
  const [posts, setPosts] = useState<TimelinePost[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Helpers
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const highlightEntityInText = (text: string, entityName?: string) => {
    if (!entityName) return text
    const parts = text.split(new RegExp(`(${entityName})`, 'gi'))
    return parts.map((part, index) => {
      if (part.toLowerCase() === entityName.toLowerCase()) {
        return <span key={index} className="text-red-400 font-semibold">{part}</span>
      }
      return <span key={index}>{part}</span>
    })
  }

  const entityName = locationName || personName || groupName || ''

  // Build markers for the last 7 days (including today) using UTC dates
  // Each marker represents exactly 00:00 UTC of that day
  const dayMarkers = Array.from({ length: 7 }, (_, i) => {
    const now = new Date()
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) // 00:00 UTC today
    d.setUTCDate(d.getUTCDate() - i)
    const label = d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    })
    return { date: d, label, timestamp: d.getTime() }
  })

  // (Grouping UI removed per request)

  // Fetch posts (page-based)
  const fetchPage = async (pageToLoad: number, replace = false) => {
    console.log('Timeline fetchPage called:', { locationName, personName, groupName, pageToLoad });
    
    if (!locationName && !personName && !groupName) {
      console.log('Timeline: No entity names provided, returning early');
      setPosts([])
      setHasMore(false)
      return
    }

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7)

    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      page: String(pageToLoad),
      limit: '20'
    })
    if (locationName) params.append('locationName', locationName)
    if (personName) params.append('personName', personName)
    if (groupName) params.append('groupName', groupName)

    const url = `/api/timeline?${params.toString()}`;
    console.log('Timeline fetching:', url);
    const res = await fetch(url)
    const data = await res.json()
    console.log('Timeline response:', { status: data.status, count: data.count, hasMore: data.hasMore });
    if (data.status !== 'success') {
      throw new Error(data.message || 'Failed to load timeline')
    }
    const newPosts: TimelinePost[] = data.posts || []
    setHasMore(Boolean(data.hasMore) && newPosts.length > 0)
    setPage(pageToLoad)
    setPosts(prev => {
      const merged = replace ? [] : prev.slice()
      const map = new Map<number, TimelinePost>(merged.map(p => [p.id, p]))
      newPosts.forEach(p => map.set(p.id, p))
      return Array.from(map.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    })
  }

  // Initial load and when entity changes
  useEffect(() => {
    let ignore = false
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        await fetchPage(1, true)
      } catch (e: any) {
        if (!ignore) setError(e.message || 'Failed to load timeline')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => { ignore = true }
  }, [locationName, personName, groupName])

  // Infinite scroll
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      if (!hasMore || loadingMore) return
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
        setLoadingMore(true)
        fetchPage(page + 1)
          .catch(err => console.error('Timeline load more error', err))
          .finally(() => setLoadingMore(false))
      }
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [page, hasMore, loadingMore, locationName, personName, groupName])

  if (!locationName && !personName && !groupName) return null

  return (
    <div className={`h-full overflow-hidden ${className}`}>
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white/60" />
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-3">
          <p className="text-red-400 text-[11px]">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="relative h-full">
          {/* Left rail line slightly inset from the edge, pushed down from top */}
          <div
            className="absolute left-4 w-0.5 bg-white/70 pointer-events-none"
            style={{ top: '0.75rem', bottom: '1rem' }}
          />
          {/* Top glowing dot removed as requested */}
          {/* Day markers spaced along the rail */}
          {/* Day markers align with hour markers at 0, 24, 48, 72, 96, 120, 144 */}
          <div
            className="absolute left-0 right-0 pointer-events-none"
            style={{ top: '0.75rem', bottom: '1rem' }}
          >
            {dayMarkers.map((m, idx) => {
              // Calculate position to align with hour markers
              // Day 0 = hour 0, Day 1 = hour 24, Day 2 = hour 48, etc.
              const hourIndex = idx * 24
              const totalHours = 7 * 24
              const topPct = (hourIndex / totalHours) * 100
              
                  return (
                    <div key={idx} className="absolute" style={{ top: `${topPct}%` }}>
                      {/* Horizontal stem line extending to the right */}
                      <div
                        className="absolute h-px bg-white/40"
                        style={{ left: 'calc(1rem + 0.0625rem)', width: '3rem', top: '0px' }}
                      />
                      {/* Day label at the end of the line - shifted up */}
                      <div
                        className="absolute text-white/60 text-[10px] whitespace-nowrap"
                        style={{ left: 'calc(1rem + 3.5rem)', top: '-0.5rem' }}
                      >
                        {m.label}
                      </div>
                    </div>
                  )
            })}
          </div>
          {/* Invisible hourly markers between days (23 hours between each day marker) */}
          {/* Total: 7 days × 24 hours = 168 hour positions */}
          <div
            className="absolute left-0 right-0 pointer-events-none"
            style={{ top: '0.75rem', bottom: '1rem' }}
            aria-hidden="true"
          >
            {(() => {
              // Create 168 hour markers (7 days × 24 hours)
              // Hour 0, 24, 48, 72, 96, 120, 144 are day markers (visible above)
              // All other hours are invisible positioning anchors
              const totalHours = 7 * 24
              return Array.from({ length: totalHours }, (_, hourIndex) => {
                const topPct = (hourIndex / totalHours) * 100
                const isDayMarker = hourIndex % 24 === 0
                
                return (
                  <div
                    key={hourIndex}
                    className="absolute w-px h-px"
                    style={{ 
                      top: `${topPct}%`,
                      left: 'calc(1rem + 0.0625rem)',
                      opacity: 0,
                      pointerEvents: 'none'
                    }}
                    data-hour={hourIndex}
                    data-is-day-marker={isDayMarker}
                  />
                )
              })
            })()}
          </div>
          {/* Posts plotted along the weekly ruler */}
            {posts.length > 0 && (
              <div
                className="absolute left-0 right-0"
                style={{ top: '0.75rem', bottom: '1rem' }}
              >
                {(() => {
                  // Calculate timeline range: from 7 days ago (00:00 UTC) to now
                  const now = new Date()
                  const nowMs = now.getTime()
                  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
                  startDate.setUTCDate(startDate.getUTCDate() - 6) // 7 days including today
                  const startMs = startDate.getTime()
                  const totalMs = nowMs - startMs
                  
                  return posts.map(post => {
                    const postMs = new Date(post.date).getTime()
                    
                    // Calculate position: 0% = now (top), 100% = 7 days ago (bottom)
                    const elapsed = postMs - startMs
                    const frac = Math.min(1, Math.max(0, elapsed / totalMs))
                    const topPct = ((1 - frac) * 100).toFixed(3) + '%' // Invert: recent at top
                    
                    return (
                      <div 
                        key={post.id} 
                        className="absolute group cursor-pointer"
                        style={{ top: `${topPct}` }}
                      >
                        {/* Interactive white dot with subtle glow on hover */}
                        <div
                          className="absolute w-1.5 h-1.5 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 transition-all duration-200 group-hover:w-2.5 group-hover:h-2.5 group-hover:shadow-[0_0_8px_rgba(255,255,255,0.6)] z-10"
                          style={{ left: 'calc(1rem + 0.0625rem)', top: '0px' }}
                        />
                        
                        {/* Hover tooltip with post preview */}
                        <div
                          className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20"
                          style={{ 
                            left: 'calc(1rem + 1.5rem)', 
                            top: '-2rem',
                            width: '16rem'
                          }}
                        >
                          <div className="bg-black/95 backdrop-blur-sm border border-white/20 rounded-lg p-3 shadow-xl">
                            <div className="text-white/50 text-[9px] mb-1">
                              {formatDate(post.date)} • {post.channel}
                            </div>
                            <div className="text-white/90 text-[11px] line-clamp-3">
                              {highlightEntityInText(post.text, entityName)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          <div ref={scrollRef} className="h-full overflow-y-auto pl-8 pr-4 py-4 feed-fade-bottom-half" />
        </div>
      )}
    </div>
  )
}
