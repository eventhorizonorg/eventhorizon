'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { FeatureCollection, Feature, Point } from 'geojson'
import React from 'react'
import { createClient } from '@supabase/supabase-js'

// Types for real-time notifications
interface NewMessage {
  id: number
  text: string
  date: string
  channel: string
  latitude: number
  longitude: number
  country_code?: string
  telegram_id?: string
}

interface Notification {
  id: string
  message: NewMessage
  timestamp: number
  isVisible: boolean
}

// Type for expanded popup state
interface ExpandedPopup {
  isOpen: boolean
  message: NewMessage | null
  position: { x: number; y: number } | null
}

export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const pulseStart = useRef(Date.now())
  const geojsonRef = useRef<FeatureCollection<Point>>({ type: 'FeatureCollection', features: [] })
  const [isIdle, setIsIdle] = useState(false)
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const rotationAnimationRef = useRef<number | null>(null)
  const rotationStartTime = useRef<number>(0)
  
  // Real-time state
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'failed' | 'disabled'>('connecting')
  const supabaseRef = useRef<any>(null)
  const subscriptionRef = useRef<any>(null)

  // Expanded popup state
  const [expandedPopup, setExpandedPopup] = useState<ExpandedPopup>({
    isOpen: false,
    message: null,
    position: null
  })

  // Initialize Supabase client
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (supabaseUrl && supabaseKey) {
      supabaseRef.current = createClient(supabaseUrl, supabaseKey, {
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      })
    } else {
      console.error('❌ Missing Supabase environment variables for real-time')
      setRealtimeStatus('disabled')
    }
  }, [])

    // Real-time updates disabled due to WebSocket connection issues
  useEffect(() => {
    setRealtimeStatus('disabled')
  }, [])

  // Add new point to map
  const addNewPointToMap = (newMessage: NewMessage) => {
    if (!map.current || !map.current.getSource('telegram-points')) return

    // Create new feature
    const newFeature: Feature<Point> = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [newMessage.longitude, newMessage.latitude]
      },
      properties: {
        id: newMessage.id,
        text: newMessage.text,
        date: newMessage.date,
        channel: newMessage.channel,
        latitude: newMessage.latitude,
        longitude: newMessage.longitude,
        country_code: newMessage.country_code,
        telegram_id: newMessage.telegram_id,
        pulse: 0.5,
        phase: Math.random() * Math.PI * 2
      }
    }

    // Add to geojson
    const currentGeojson = geojsonRef.current
    currentGeojson.features.push(newFeature)
    ;(map.current.getSource('telegram-points') as mapboxgl.GeoJSONSource).setData(currentGeojson)
  }

  // Handle expanded popup open
  const openExpandedPopup = (message: NewMessage, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    setExpandedPopup({
      isOpen: true,
      message,
      position: { x: event.clientX, y: event.clientY }
    })
  }

  // Handle expanded popup close
  const closeExpandedPopup = () => {
    setExpandedPopup({
      isOpen: false,
      message: null,
      position: null
    })
  }

  // Reset idle timer
  const resetIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }
    setIsIdle(false)
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true)
      startIdleRotation()
    }, 30000) // 30 seconds
  }

  // Start idle rotation
  const startIdleRotation = () => {
    if (!map.current) return
    
    rotationStartTime.current = Date.now()
    
    const animateRotation = () => {
      if (!map.current || !isIdle) return
      
      const elapsed = Date.now() - rotationStartTime.current
      const rotationSpeed = 0.1 // degrees per second
      const currentBearing = map.current.getBearing()
      const newBearing = currentBearing + rotationSpeed
      
      map.current.easeTo({
        bearing: newBearing,
        duration: 1000
      })
      
      rotationAnimationRef.current = requestAnimationFrame(animateRotation)
    }
    
    animateRotation()
  }

  // Handle user activity
  useEffect(() => {
    const handleActivity = () => resetIdleTimer()
    
    // Add event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, handleActivity)
    })
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [])

  // Initialize map and load data
  useEffect(() => {
    if (!mapContainer.current) return

    const initMap = async () => {
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
        if (!token) {
          console.error('Mapbox token not found')
          return
        }
        
        mapboxgl.accessToken = token
        
        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [0, 0],
          zoom: 1.5,
          projection: 'globe' as any,
          pitch: 0,
          bearing: 0
        })

        map.current.on('load', () => {
          loadAndPlotMessages()
          animatePulse()
        })

        map.current.on('error', (e) => {
          console.error('Map error:', e)
        })

        return () => {
          if (map.current) {
            map.current.remove()
          }
        }
      } catch (error) {
        console.error('Error initializing map:', error)
      }
    }

    initMap()
  }, [])

  // Load and plot messages
  const loadAndPlotMessages = async () => {
    try {
      const response = await fetch('/api/messages')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const responseData = await response.json()
      
      if (!responseData.messages || !Array.isArray(responseData.messages)) {
        throw new Error('Invalid response format: messages array not found')
      }
      
      const messages = responseData.messages
      
      const geojson: FeatureCollection<Point> = {
        type: 'FeatureCollection',
        features: messages.map((msg: any) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [msg.longitude, msg.latitude]
          },
          properties: {
            id: msg.id,
            text: msg.text,
            date: msg.date,
            channel: msg.channel,
            latitude: msg.latitude,
            longitude: msg.longitude,
            country_code: msg.country_code,
            telegram_id: msg.telegram_id,
            pulse: 0.5,
            phase: Math.random() * Math.PI * 2
          }
        }))
      }
      
      geojsonRef.current = geojson
      
      if (map.current && map.current.getSource('telegram-points')) {
        ;(map.current.getSource('telegram-points') as mapboxgl.GeoJSONSource).setData(geojson)
      } else if (map.current) {
        map.current.addSource('telegram-points', {
          type: 'geojson',
          data: geojson
        })

        // Add glow layer first (behind the main points)
        map.current.addLayer({
          id: 'telegram-points-glow',
          type: 'circle',
          source: 'telegram-points',
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 6,
              8, 12
            ],
            'circle-color': '#ffffff',
            'circle-opacity': [
              'interpolate',
              ['linear'],
              ['get', 'pulse'],
              0, 0.05,
              1, 0.15
            ],
            'circle-stroke-width': 0
          }
        })

        // Add main points layer
        map.current.addLayer({
          id: 'telegram-points-layer',
          type: 'circle',
          source: 'telegram-points',
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              0, 2,
              8, 4
            ],
            'circle-color': '#ffffff',
            'circle-opacity': [
              'interpolate',
              ['linear'],
              ['get', 'pulse'],
              0, 0.2,
              1, 0.6
            ],
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-opacity': [
              'interpolate',
              ['linear'],
              ['get', 'pulse'],
              0, 0.1,
              1, 0.4
            ]
          }
        })

        // Create popup
        const hoverPopup = new mapboxgl.Popup({
          closeButton: true,
          closeOnClick: false,
          maxWidth: '400px'
        })

        let popupOpen = false
        let popupShouldClose = true

        const closePopupWithFade = () => {
          if (hoverPopup.isOpen()) {
            const popupElement = hoverPopup.getElement()
            if (popupElement) {
              popupElement.classList.add('fade-out')
              setTimeout(() => {
                hoverPopup.remove()
                popupOpen = false
              }, 200)
            }
          }
        }

        map.current.on('mouseenter', 'telegram-points-layer', (e) => {
          if (!e.features || e.features.length === 0) return
          
          map.current!.getCanvas().style.cursor = 'pointer'
          popupShouldClose = false
          
          const feature = e.features[0]
          const props = feature.properties
          if (!props) return
          
          let coordinates: [number, number] = [0, 0]
          if (feature.geometry.type === 'Point') {
            const coords = feature.geometry.coordinates
            if (Array.isArray(coords) && coords.length === 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
              coordinates = [coords[0], coords[1]]
            }
          }
          
          let locationString = 'Unknown';
          if (
            Array.isArray(coordinates) &&
            coordinates.length === 2 &&
            typeof coordinates[0] === 'number' &&
            typeof coordinates[1] === 'number' &&
            !isNaN(coordinates[0]) &&
            !isNaN(coordinates[1])
          ) {
            locationString = `${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)}`;
          }
          
          // Check if we have telegram_id for widget embedding
          const hasTelegramId = props.telegram_id && props.telegram_id !== 'null'
          const cleanChannel = String(props.channel).replace('@', '')
          
          // Truncate text for popup preview
          const truncatedText = String(props.text).length > 150 
            ? String(props.text).substring(0, 150) + '...'
            : String(props.text)
          
          const popupContent = `
            <div class="message-popup fade-in" id="telegram-hover-popup">
              <h4>📢 ${String(props.channel)}</h4>
              <p><strong>Date:</strong> ${new Date(String(props.date)).toLocaleString()}</p>
              <p><strong>Location:</strong> ${locationString}</p>
              ${props.country_code ? `<p><strong>Country:</strong> ${String(props.country_code)}</p>` : ''}
              <div class="message-text">
                <strong>Message:</strong><br>
                ${truncatedText}
                ${String(props.text).length > 150 ? `
                  <br><br>
                  <button class="read-more-btn" onclick="window.openExpandedPopup(${JSON.stringify({
                    id: props.id,
                    text: props.text,
                    date: props.date,
                    channel: props.channel,
                    latitude: props.latitude,
                    longitude: props.longitude,
                    country_code: props.country_code,
                    telegram_id: props.telegram_id
                  }).replace(/"/g, '&quot;')})">
                    📖 Read Full Message
                  </button>
                ` : ''}
              </div>
              ${hasTelegramId ? `
                <div class="telegram-widget-container">
                  <div class="widget-loading">Loading Telegram post...</div>
                  <script async src="https://telegram.org/js/telegram-widget.js?1" 
                          data-telegram-post="${cleanChannel}/${props.telegram_id}" 
                          data-width="100%" 
                          data-author-photo="true"
                          data-dark="1"></script>
                </div>
              ` : ''}
            </div>
          `
          
          hoverPopup.setLngLat(coordinates as [number, number]).setHTML(popupContent).addTo(map.current!)
          popupOpen = true
          popupShouldClose = false
          
          // Make the openExpandedPopup function available globally
          ;(window as any).openExpandedPopup = (messageData: any) => {
            const message: NewMessage = {
              id: messageData.id,
              text: messageData.text,
              date: messageData.date,
              channel: messageData.channel,
              latitude: messageData.latitude,
              longitude: messageData.longitude,
              country_code: messageData.country_code,
              telegram_id: messageData.telegram_id
            }
            setExpandedPopup({
              isOpen: true,
              message,
              position: null
            })
          }
          
          setTimeout(() => {
            const popupDiv = document.getElementById('telegram-hover-popup')
            if (popupDiv) {
              popupDiv.addEventListener('mouseenter', () => {
                popupShouldClose = false
              })
              popupDiv.addEventListener('mouseleave', () => {
                popupShouldClose = true
                setTimeout(() => {
                  if (popupShouldClose) closePopupWithFade()
                }, 10)
              })
              
              // Handle widget loading and errors
              if (hasTelegramId) {
                const widgetContainer = popupDiv.querySelector('.telegram-widget-container')
                if (widgetContainer) {
                  const script = widgetContainer.querySelector('script')
                  if (script) {
                    script.onerror = () => {
                      const loadingDiv = widgetContainer.querySelector('.widget-loading')
                      if (loadingDiv) {
                        loadingDiv.innerHTML = `
                          <div style="text-align: center; color: #dc3545; padding: 20px;">
                            <p>Failed to load Telegram post</p>
                            <a href="https://t.me/${cleanChannel}/${props.telegram_id}" 
                               target="_blank" 
                               rel="noopener noreferrer"
                               style="color: #0088cc; text-decoration: none;">
                              View on Telegram
                            </a>
                          </div>
                        `
                      }
                    }
                    
                    // Remove loading text when widget loads
                    setTimeout(() => {
                      const loadingDiv = widgetContainer.querySelector('.widget-loading') as HTMLElement
                      if (loadingDiv) {
                        loadingDiv.style.display = 'none'
                      }
                    }, 3000)
                  }
                }
              }
            }
          }, 10)
        })

        map.current.on('mouseleave', 'telegram-points-layer', () => {
          map.current!.getCanvas().style.cursor = ''
          popupShouldClose = true
          setTimeout(() => {
            if (popupShouldClose && popupOpen) closePopupWithFade()
          }, 10)
        })

        // Also handle hover for glow layer
        map.current.on('mouseenter', 'telegram-points-glow', (e) => {
          if (!e.features || e.features.length === 0) return
          map.current!.getCanvas().style.cursor = 'pointer'
        })
        
        map.current.on('mouseleave', 'telegram-points-glow', () => {
          map.current!.getCanvas().style.cursor = ''
        })
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error)
      console.error('🔍 Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
    }
  }

  const animatePulse = () => {
    if (!map.current || !map.current.getSource('telegram-points')) {
      return
    }
    
    const geojson = geojsonRef.current
    if (!geojson.features || geojson.features.length === 0) {
      return
    }
    
    const now = Date.now()
    const t = ((now - pulseStart.current) / 1000) % 2 // 2s period
    
    geojson.features.forEach((f: any) => {
      const phase = f.properties.phase || 0
      f.properties.pulse = 0.5 * (1 + Math.sin(2 * Math.PI * t / 2 + phase))
    })
    
    try {
      ;(map.current.getSource('telegram-points') as mapboxgl.GeoJSONSource).setData(geojson)
      requestAnimationFrame(animatePulse)
    } catch (error) {
      console.error('❌ Error updating map data:', error)
    }
  }

  return (
    <div className="relative w-full h-screen">
      <div 
        ref={mapContainer} 
        className="absolute inset-0"
        style={{ 
          background: '#000000', 
          height: '100vh', 
          width: '100vw'
        }}
      />
      
      {/* Real-time notifications overlay */}
      <div className="absolute top-4 right-4 z-50 space-y-2 pointer-events-none">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`
              bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg p-4 max-w-sm
              transform transition-all duration-500 ease-out pointer-events-auto
              ${notification.isVisible 
                ? 'translate-x-0 opacity-100 scale-100' 
                : 'translate-x-full opacity-0 scale-95'
              }
            `}
            style={{
              boxShadow: '0 8px 32px rgba(255, 255, 255, 0.1)',
              animation: notification.isVisible ? 'notificationPulse 2s ease-in-out' : 'none'
            }}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-white text-sm font-semibold">
                    📢 {notification.message.channel}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {new Date(notification.message.date).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-white text-sm leading-relaxed line-clamp-3">
                  {notification.message.text}
                </p>
                {notification.message.country_code && (
                  <div className="mt-2">
                    <span className="text-gray-400 text-xs">
                      🌍 {notification.message.country_code}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Connection status indicator */}
      <div className="absolute bottom-4 left-4 z-50">
        <div className="flex items-center space-x-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-2">
          <div className={`w-2 h-2 rounded-full ${
            realtimeStatus === 'connected' ? 'bg-green-500 animate-pulse' :
            realtimeStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            realtimeStatus === 'failed' ? 'bg-red-500' :
            'bg-gray-500'
          }`}></div>
          <span className="text-white text-xs font-medium">
            {realtimeStatus === 'connected' ? 'Live Updates Active' :
             realtimeStatus === 'connecting' ? 'Connecting...' :
             realtimeStatus === 'failed' ? 'Updates Disabled' :
             'Updates Offline'}
          </span>
        </div>
      </div>

      {/* Expanded Popup Overlay */}
      {expandedPopup.isOpen && expandedPopup.message && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeExpandedPopup}
          />
          
          {/* Expanded Popup Content */}
          <div className="relative bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                          <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-white rounded-full"></div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  📢 {expandedPopup.message.channel}
                </h3>
                <p className="text-sm text-gray-500">
                  {new Date(expandedPopup.message.date).toLocaleString()}
                </p>
              </div>
            </div>
              <button
                onClick={closeExpandedPopup}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Message Details */}
              <div className="mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                  <div>
                    <span className="font-medium">Location:</span>
                    <br />
                    {expandedPopup.message.latitude.toFixed(4)}, {expandedPopup.message.longitude.toFixed(4)}
                  </div>
                  {expandedPopup.message.country_code && (
                    <div>
                      <span className="font-medium">Country:</span>
                      <br />
                      {expandedPopup.message.country_code}
                    </div>
                  )}
                </div>
                
                {/* Full Message Text */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Full Message:</h4>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {expandedPopup.message.text}
                  </p>
                </div>
              </div>
              
              {/* Telegram Widget */}
              {expandedPopup.message.telegram_id && expandedPopup.message.telegram_id !== 'null' && (
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="font-medium text-gray-900 mb-4">Telegram Post:</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="telegram-widget-container">
                      <div className="widget-loading">Loading Telegram post...</div>
                      <script 
                        async 
                        src="https://telegram.org/js/telegram-widget.js?1" 
                        data-telegram-post={`${String(expandedPopup.message.channel).replace('@', '')}/${expandedPopup.message.telegram_id}`}
                        data-width="100%" 
                        data-author-photo="true"
                        data-dark="0"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">
                Click outside to close
              </div>
              {expandedPopup.message.telegram_id && expandedPopup.message.telegram_id !== 'null' && (
                <a
                  href={`https://t.me/${String(expandedPopup.message.channel).replace('@', '')}/${expandedPopup.message.telegram_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                  </svg>
                  View on Telegram
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 