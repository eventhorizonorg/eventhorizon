'use client'

import { useEffect, useState } from 'react'

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

  if (!wikipediaTitle) return null

  return (
    <div className="fixed left-4 top-4 z-50 w-96 max-h-[90vh] overflow-hidden">
      <div className="bg-black/80 backdrop-blur-md rounded-lg shadow-2xl border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.09 13.119c-.936 1.932-2.217 4.548-2.853 5.728-.616 1.074-1.127.931-1.532.029-1.406-3.321-4.293-9.144-5.651-12.409-.251-.601-.441-.987-.619-1.139-.181-.15-.554-.24-1.122-.271C.103 5.033 0 4.982 0 4.898v-.455l.052-.045c.924-.005 5.401 0 5.401 0l.051.045v.434c0 .119-.075.176-.225.176l-.564.031c-.485.029-.727.164-.727.436 0 .135.053.33.166.601 1.082 2.646 4.818 10.521 4.818 10.521l.136.046 2.411-4.81-.482-.93s-2.346-4.545-2.479-4.778c-.131-.232-.405-.344-.82-.344l-.576-.051c-.135 0-.195-.06-.195-.181v-.434l.061-.045 4.84-.016c.195 0 .255.045.255.134v.436c0 .119-.06.181-.181.181l-.516.031c-.465.029-.705.164-.705.436 0 .135.045.33.135.601l1.918 3.92.211.436 2.463-4.356c.119-.211.179-.391.179-.541 0-.27-.225-.391-.674-.391l-.51-.045c-.135 0-.195-.06-.195-.181v-.434l.061-.045 3.451-.016c.195 0 .255.045.255.134v.436c0 .119-.06.181-.181.181l-.465.031c-.405.029-.705.164-.885.391-.195.24-.645 1.08-1.352 2.517l-3.146 6.211z"/>
            </svg>
            <span className="text-white font-semibold text-sm">Wikipedia</span>
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
                <h2 className="text-white text-xl font-bold mb-1">{data.displayTitle}</h2>
                {data.description && (
                  <p className="text-white/60 text-sm italic">{data.description}</p>
                )}
              </div>

              {/* Extract/Summary */}
              {data.extract && (
                <div className="text-white/90 text-sm leading-relaxed">
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
                  className="inline-flex items-center space-x-2 text-blue-400 hover:text-blue-300 text-sm transition-colors"
                >
                  <span>Read more on Wikipedia</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

