'use client'

import { useEffect, useRef, useState } from 'react'
import type { TimelinePost } from '@/lib/types/timeline'

interface TimelineProps {
  locationName?: string
  personName?: string
  className?: string
}

export default function Timeline({ locationName, personName, className = '' }: TimelineProps) {
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

  const entityName = locationName || personName || ''

  // Build markers for the last 7 days (including today) using UTC dates
  const dayMarkers = Array.from({ length: 7 }, (_, i) => {
    const now = new Date()
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) // 00:00 UTC today
    d.setUTCDate(d.getUTCDate() - i)
    const label = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    })
    return { date: d, label }
  })

  // (Grouping UI removed per request)

  // Fetch posts (page-based)
  const fetchPage = async (pageToLoad: number, replace = false) => {
    if (!locationName && !personName) {
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

    const res = await fetch(`/api/timeline?${params.toString()}`)
    const data = await res.json()
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
  }, [locationName, personName])

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
  }, [page, hasMore, loadingMore, locationName, personName])

  if (!locationName && !personName) return null

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
          <div
            className="absolute left-0 right-0 pointer-events-none"
            style={{ top: '0.75rem', bottom: '1rem' }}
          >
            <div className="absolute top-0 bottom-0 left-0 right-0 flex flex-col justify-between">
              {dayMarkers.map((m, idx) => (
                <div key={idx} className="relative">
                  {/* Horizontal stem with right-side fade (present marker included) */}
                  <div
                    className="absolute h-px bg-gradient-to-r from-white/70 via-white/30 to-transparent"
                    style={{ left: 'calc(1rem + 0.25rem)', right: '6rem', top: '-0.1875rem' }}
                  />
                  <div
                    className="absolute w-1.5 h-1.5 bg-white rounded-full -translate-x-1/2"
                    style={{ left: 'calc(1rem + 0.0625rem)', top: '-0.375rem' }}
                  />
                  <div
                    className="absolute text-white/70 text-[10px] whitespace-nowrap"
                    style={{ left: 'calc(1rem + 0.5rem)', top: '0.125rem' }}
                  >
                    {m.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Invisible hourly markers between days (0:00 to 23:59) */}
          <div
            className="absolute left-0 right-0 pointer-events-none"
            style={{ top: '0.75rem', bottom: '1rem' }}
            aria-hidden="true"
          >
            <div className="grid grid-rows-6 h-full">
              {Array.from({ length: 6 }).map((_, intervalIdx) => (
                <div key={intervalIdx} className="relative">
                  <div
                    className="absolute top-0 bottom-0"
                    style={{ left: 'calc(1rem + 0.0625rem)' }}
                  >
                    <div className="flex flex-col justify-between h-full">
                      {Array.from({ length: 24 }).map((_, hourIdx) => (
                        <div key={hourIdx} className="h-px opacity-0" />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Posts plotted along the weekly ruler */}
          {posts.length > 0 && (
            <div
              className="absolute left-0 right-0 pointer-events-none"
              style={{ top: '0.75rem', bottom: '1rem' }}
            >
              {(() => {
                const now = new Date().getTime()
                const totalMs = 7 * 24 * 60 * 60 * 1000
                return posts.map(post => {
                  const t = new Date(post.date).getTime()
                  const frac = Math.min(1, Math.max(0, (now - t) / totalMs))
                  const topPct = (frac * 100).toFixed(3) + '%'
                  return (
                    <div key={post.id} className="absolute" style={{ top: `calc(${topPct} - 2px)` }}>
                      {/* short horizontal stem */}
                      <div
                        className="absolute h-px bg-gradient-to-r from-white/60 to-transparent"
                        style={{ left: 'calc(1rem + 0.25rem)', width: '8rem', top: '-0.1875rem' }}
                      />
                      {/* rail dot */}
                      <div
                        className="absolute w-1.5 h-1.5 bg-white rounded-full -translate-x-1/2"
                        style={{ left: 'calc(1rem + 0.0625rem)' }}
                      />
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
