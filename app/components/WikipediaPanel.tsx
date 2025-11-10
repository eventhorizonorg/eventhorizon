'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Timeline from './Timeline'

/**
 * Safely strip HTML tags from a string using DOM parsing
 * This prevents XSS vulnerabilities from incomplete or malformed HTML
 */
const stripHtml = (html: string): string => {
  if (typeof window === 'undefined') return html
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}

interface WikipediaData {
  title: string
  displayTitle: string
  extract: string
  description: string
  thumbnail: string | null
  originalImage: string | null
  pageUrl: string
  type: string
  coordinates: { lat: number; lon: number } | null
}

interface WikipediaPanelProps {
  wikipediaTitle: string | null
  locationName?: string
  personName?: string
  groupName?: string
  onClose: () => void
}

export default function WikipediaPanel({ 
  wikipediaTitle, 
  locationName,
  personName,
  groupName,
  onClose 
}: WikipediaPanelProps) {
  const [data, setData] = useState<WikipediaData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [panelEntering, setPanelEntering] = useState(false)

  useEffect(() => {
    setMounted(true)
    // trigger initial panel slide/fade
    requestAnimationFrame(() => setPanelEntering(true))
  }, [])

  useEffect(() => {
    if (!wikipediaTitle) {
      setData(null)
      return
    }

    const fetchWikipediaData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/wikipedia?title=${encodeURIComponent(wikipediaTitle)}`)
        const result = await response.json()
        
        if (result.status === 'success') {
          setData(result.data)
        } else {
          setError(result.message || 'Failed to load Wikipedia data')
        }
      } catch (err) {
        console.error('Error fetching Wikipedia data:', err)
        setError('Failed to load Wikipedia data')
      } finally {
        setLoading(false)
      }
    }

    fetchWikipediaData()
  }, [wikipediaTitle])

  if (!mounted || !wikipediaTitle) return null

  // Local fading content wrapper keyed by title/loading to animate switches
  const FadingContent = ({ transitionKey, children }: { transitionKey: string; children: ReactNode }) => {
    const [show, setShow] = useState(false)
    useEffect(() => {
      setShow(false)
      const t = window.setTimeout(() => setShow(true), 10)
      return () => window.clearTimeout(t)
    }, [transitionKey])
    return (
      <div className={`transform transition-all duration-200 ${show ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
        {children}
      </div>
    )
  }

  const panel = (
    <div className={`fixed left-0 top-0 z-50 w-96 h-screen overflow-hidden transform transition-all duration-200 flex flex-col ${panelEntering ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
      <div className="bg-white/5 backdrop-blur-sm shadow-xl border border-white/10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center space-x-2">
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Wikipedia Section - Top 25% */}
          <div className="flex-shrink-0" style={{ height: '25%', maxHeight: '25vh' }}>
            <FadingContent transitionKey={`${wikipediaTitle}-${loading ? 'loading' : 'ready'}`}>
              {loading && (
                <div className="p-4 text-center h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto"></div>
                </div>
              )}

              {error && (
                <div className="p-4">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-red-400 text-[11px]">{error}</p>
                  </div>
                </div>
              )}

              {data && !loading && !error && (
                <div className="h-full p-4 flex gap-3 overflow-hidden">
                  {/* Image - Left side, compact */}
                  {(data.thumbnail || data.originalImage) && (
                    <div className="flex-shrink-0 rounded-lg overflow-hidden bg-white/5" style={{ width: '40%' }}>
                      <img
                        src={data.thumbnail || data.originalImage || ''}
                        alt={data.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Text Content - Right side */}
                  <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                    {/* Title */}
                    <div className="mb-1.5">
                      <h2 className="text-white text-[10px] font-medium leading-tight">
                        {stripHtml(data.displayTitle || data.title)}
                      </h2>
                      {data.description && (
                        <p className="text-white/60 text-[9px] italic mt-0.5 leading-tight">{data.description}</p>
                      )}
                    </div>

                    {/* Extract/Summary - Truncated and scrollable */}
                    {data.extract && (
                      <div className="flex-1 overflow-y-auto">
                        <p className="text-white/90 text-[10px] leading-relaxed line-clamp-4">
                          {data.extract.length > 200 ? data.extract.substring(0, 200) + '...' : data.extract}
                        </p>
                      </div>
                    )}

                    {/* Footer - Coordinates and link */}
                    <div className="flex-shrink-0 mt-2 pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        {data.coordinates && (
                          <div className="flex items-center space-x-1.5 text-white/60 text-[9px]">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12,2C8.13,2 5,5.13 5,9C5,14.25 12,22 12,22S19,14.25 19,9C19,5.13 15.87,2 12,2M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5Z"/>
                            </svg>
                            <span>{data.coordinates.lat.toFixed(4)}, {data.coordinates.lon.toFixed(4)}</span>
                          </div>
                        )}
                        <a
                          href={data.pageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-white hover:text-white/80 text-[9px] transition-colors"
                        >
                          <span>Read more</span>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </FadingContent>
          </div>

          {/* Divider */}
          <div className="flex-shrink-0 border-t border-white/10"></div>

          {/* Timeline Section - Bottom 75% */}
          <div className="flex-1 overflow-hidden" style={{ height: '75%' }}>
            {(() => {
              console.log('WikipediaPanel Timeline render check:', { locationName, personName, groupName });
              if (locationName || personName || groupName) {
                return (
                  <Timeline 
                    locationName={locationName}
                    personName={personName}
                    groupName={groupName}
                  />
                );
              }
              return null;
            })()}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(panel, document.body)
}

