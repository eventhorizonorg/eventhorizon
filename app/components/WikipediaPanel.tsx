'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

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
  onClose: () => void
}

export default function WikipediaPanel({ wikipediaTitle, onClose }: WikipediaPanelProps) {
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
    <div className={`fixed left-4 top-4 z-50 w-96 max-h-[90vh] overflow-hidden transform transition-all duration-200 ${panelEntering ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
      <div className="bg-white/5 backdrop-blur-sm rounded-lg shadow-xl border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <span className="text-white/80 font-semibold text-xs uppercase tracking-wider">Source: Wikipedia</span>
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
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <FadingContent transitionKey={`${wikipediaTitle}-${loading ? 'loading' : 'ready'}`}>
            {loading && (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                <p className="text-white/60 text-sm mt-4">Loading...</p>
              </div>
            )}

            {error && (
              <div className="p-6">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              </div>
            )}

            {data && !loading && !error && (
              <div className="p-6 space-y-4">
              {/* Image */}
              {(data.thumbnail || data.originalImage) && (
                <div className="rounded-lg overflow-hidden bg-white/5">
                  <img
                    src={data.thumbnail || data.originalImage || ''}
                    alt={data.title}
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}

              {/* Title */}
              <div>
                <h2 className="text-white text-xs font-semibold mb-1">{(data.displayTitle || data.title).replace(/<[^>]*>/g, '')}</h2>
                {data.description && (
                  <p className="text-white/60 text-[11px] italic">{data.description}</p>
                )}
              </div>

              {/* Extract/Summary */}
              {data.extract && (
                <div className="text-white/90 text-xs leading-relaxed">
                  {data.extract}
                </div>
              )}

              {/* Coordinates (if available) */}
              {data.coordinates && (
                <div className="flex items-center space-x-2 text-white/60 text-xs">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2C8.13,2 5,5.13 5,9C5,14.25 12,22 12,22S19,14.25 19,9C19,5.13 15.87,2 12,2M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5Z"/>
                  </svg>
                  <span>{data.coordinates.lat.toFixed(4)}, {data.coordinates.lon.toFixed(4)}</span>
                </div>
              )}

                {/* Link to full article */}
                <div className="pt-4 border-t border-white/10">
                  <a
                    href={data.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 text-white hover:text-white/80 text-xs transition-colors"
                  >
                    <span>Read more on Wikipedia</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            )}
          </FadingContent>
        </div>
      </div>
    </div>
  )

  return createPortal(panel, document.body)
}

