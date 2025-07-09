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

export default function Home() {
  console.log('Page loaded')
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
      console.log('Supabase client initialized for real-time')
    } else {
      console.error('Missing Supabase environment variables for real-time')
      setRealtimeStatus('disabled')
    }
  }, [])

  // Set up real-time subscription
  useEffect(() => {
    if (!supabaseRef.current) {
      console.log('Supabase client not available for real-time')
      return
    }

    console.log('Setting up real-time subscription...')
    
    let retryCount = 0
    const maxRetries = 3
    
    const setupRealtime = () => {
      try {
        // Create a unique channel name
        const channelName = `messages-${Date.now()}`
        
        // Subscribe to new messages with proper error handling
        subscriptionRef.current = supabaseRef.current
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: 'latitude=not.is.null AND longitude=not.is.null'
            },
            (payload: any) => {
              console.log('New message received:', payload.new)
              const newMessage = payload.new as NewMessage
              
              // Create notification
              const notification: Notification = {
                id: `notification-${Date.now()}-${Math.random()}`,
                message: newMessage,
                timestamp: Date.now(),
                isVisible: true
              }
              
              // Add to notifications
              setNotifications(prev => [...prev, notification])
              
              // Add to map
              addNewPointToMap(newMessage)
              
              // Auto-remove notification after 8 seconds
              setTimeout(() => {
                setNotifications(prev => 
                  prev.map(n => 
                    n.id === notification.id 
                      ? { ...n, isVisible: false }
                      : n
                  )
                )
              }, 8000)
              
              // Remove from state after animation
              setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== notification.id))
              }, 8500)
            }
          )
          .subscribe((status: any) => {
            console.log('Real-time subscription status:', status)
            if (status === 'SUBSCRIBED') {
              console.log('✅ Real-time subscription active')
              setRealtimeStatus('connected')
              retryCount = 0 // Reset retry count on success
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.log('❌ Real-time subscription failed:', status)
              setRealtimeStatus('failed')
              handleRealtimeError()
            } else if (status === 'CLOSED') {
              console.log('🔌 Real-time subscription closed')
              setRealtimeStatus('failed')
              handleRealtimeError()
            }
          })

      } catch (error) {
        console.error('Error setting up real-time subscription:', error)
        handleRealtimeError()
      }
    }

    const handleRealtimeError = () => {
      retryCount++
      if (retryCount <= maxRetries) {
        console.log(`🔄 Retrying real-time connection (${retryCount}/${maxRetries})...`)
        setRealtimeStatus('connecting')
        setTimeout(() => {
          if (subscriptionRef.current) {
            try {
              supabaseRef.current.removeChannel(subscriptionRef.current)
            } catch (error) {
              console.log('Error removing channel:', error)
            }
          }
          setupRealtime()
        }, 2000 * retryCount) // Exponential backoff
      } else {
        console.log('❌ Max retries reached, continuing without real-time updates')
        console.log('💡 Real-time updates disabled. Map will still work normally.')
        setRealtimeStatus('disabled')
      }
    }

    setupRealtime()

    return () => {
      if (subscriptionRef.current) {
        console.log('Cleaning up real-time subscription')
        try {
          supabaseRef.current.removeChannel(subscriptionRef.current)
        } catch (error) {
          console.log('Error cleaning up subscription:', error)
        }
      }
    }
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
        country_code: newMessage.country_code,
        telegram_id: newMessage.telegram_id,
        phase: Math.random() * 2 * Math.PI,
        isNew: true // Flag for special animation
      }
    }

    // Add to existing geojson
    const currentGeojson = geojsonRef.current
    currentGeojson.features.push(newFeature)
    geojsonRef.current = currentGeojson

    // Update map source
    ;(map.current.getSource('telegram-points') as mapboxgl.GeoJSONSource).setData(currentGeojson)
    
    console.log('New point added to map:', newMessage.channel)
  }

  // Reset idle timer on user activity
  const resetIdleTimer = () => {
    console.log('Activity detected, resetting idle timer')
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }
    
    if (isIdle) {
      console.log('Stopping idle rotation')
      setIsIdle(false)
      // Stop rotation animation
      if (rotationAnimationRef.current) {
        cancelAnimationFrame(rotationAnimationRef.current)
        rotationAnimationRef.current = null
      }
    }
    
    // Start new idle timer (10 seconds)
    idleTimerRef.current = setTimeout(() => {
      console.log('Idle timeout reached, starting rotation')
      setIsIdle(true)
      startIdleRotation()
    }, 10000)
  }

  // Start slow rotation animation
  const startIdleRotation = () => {
    console.log('Starting idle rotation animation')
    if (!map.current) {
      console.log('Map not ready for rotation')
      return
    }
    
    rotationStartTime.current = Date.now()
    const animateRotation = () => {
      if (!map.current || !isIdle) {
        console.log('Stopping rotation: map not ready or not idle')
        return
      }
      
      const elapsed = Date.now() - rotationStartTime.current
      const rotationSpeed = 0.0001 // Very slow rotation (degrees per millisecond)
      const newBearing = (elapsed * rotationSpeed) % 360
      
      console.log(`Rotating to bearing: ${newBearing.toFixed(2)}°`)
      map.current.easeTo({
        bearing: newBearing,
        duration: 0 // Instant update for smooth animation
      })
      
      rotationAnimationRef.current = requestAnimationFrame(animateRotation)
    }
    
    animateRotation()
  }

  // Set up activity listeners
  useEffect(() => {
    const handleActivity = () => resetIdleTimer()
    
    // Listen for various user activities
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })
    
    // Start initial idle timer
    console.log('Setting up initial idle timer')
    resetIdleTimer()
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
      if (rotationAnimationRef.current) {
        cancelAnimationFrame(rotationAnimationRef.current)
      }
    }
  }, [isIdle])

  useEffect(() => {
    if (!mapContainer.current) return
    const token = process.env.MAPBOX_TOKEN
    console.log('Mapbox token:', token)
    mapboxgl.accessToken = token || ''
    try {
      const initMap = async () => {
        // Create the map with dark preset for grey/black appearance
        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [0, 0],
          zoom: 1.5,
          projection: 'globe' as any,
          pitch: 0,
          bearing: 0
        })

        map.current.on('load', async () => {
          // Set fog for space background
          map.current?.setFog({
            'color': '#000000',
            'high-color': '#000000',
            'horizon-blend': 0.0,
            'space-color': '#000000',
            'star-intensity': 0.3
          })
          map.current?.setPaintProperty('water', 'fill-color', '#0a0a0a')
          map.current?.setPaintProperty('water', 'fill-opacity', 0.8)
          
          // Load and plot messages
          await loadAndPlotMessages()
          // Start pulse animation
          animatePulse()
        })

        // Reset idle timer on map interactions
        map.current.on('movestart', resetIdleTimer)
        map.current.on('zoomstart', resetIdleTimer)
      }

      initMap()

      return () => {
        if (map.current) {
          map.current.remove()
        }
      }
    } catch (error) {
      console.error('Error initializing map:', error)
    }
  }, [])

  const loadAndPlotMessages = async () => {
    try {
      console.log('Loading messages from API...')
      const response = await fetch('/api/messages')
      const data = await response.json()
      
      if (data.error) {
        console.error('Failed to load messages:', data.error)
        return
      }

      console.log(`Loaded ${data.messages.length} messages from API`)

      // Convert to GeoJSON FeatureCollection
      const features: Feature<Point>[] = data.messages.map((msg: any, i: number) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [msg.longitude, msg.latitude]
        },
        properties: {
          id: msg.id,
          text: msg.text,
          date: msg.date,
          channel: msg.channel,
          country_code: msg.country_code,
          telegram_id: msg.telegram_id,
          phase: (i * 2 * Math.PI) / data.messages.length
        }
      }))

      const geojson: FeatureCollection<Point> = {
        type: 'FeatureCollection',
        features
      }
      geojsonRef.current = geojson

      console.log(`Created ${geojson.features.length} GeoJSON features`)

      if (!map.current) {
        console.error('Map not available for plotting messages')
        return
      }

      console.log('Adding source to map...')
      // Add source
      if (map.current.getSource('telegram-points')) {
        console.log('Updating existing source...')
        ;(map.current.getSource('telegram-points') as mapboxgl.GeoJSONSource).setData(geojson)
      } else {
        console.log('Creating new source...')
        map.current.addSource('telegram-points', {
          type: 'geojson',
          data: geojson
        })

        console.log('Adding circle layer...')
        // Add circle layer
        map.current.addLayer({
          id: 'telegram-points-layer',
          type: 'circle',
          source: 'telegram-points',
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', 'pulse'],
              0, 5,
              1, 10
            ],
            'circle-color': '#ffffff', // Always white for existing points
            'circle-blur': [
              'interpolate',
              ['linear'],
              ['get', 'pulse'],
              0, 0.2,
              1, 0.7
            ],
            'circle-opacity': 0.9,
            'circle-stroke-width': 0,
          }
        })
      }

      console.log('Map points added successfully!')

      // Add popup on hover
      let hoverPopup = new mapboxgl.Popup({ closeButton: true, maxWidth: '300px' })
      let popupOpen = false
      let popupShouldClose = false

      const closePopupWithFade = () => {
        const popupEl = document.querySelector('.mapboxgl-popup-content .fade-in')
        if (popupEl) {
          popupEl.classList.remove('fade-in')
          popupEl.classList.add('fade-out')
          setTimeout(() => hoverPopup.remove(), 200)
        } else {
          hoverPopup.remove()
        }
        popupOpen = false
      }

      map.current.on('mouseenter', 'telegram-points-layer', (e) => {
        map.current!.getCanvas().style.cursor = 'pointer'
        const feature = e.features![0]
        const props = feature.properties!
        let coordinates: [number, number] = [0, 0]
        if (feature.geometry.type === 'Point') {
          const coords = (feature.geometry as Point).coordinates
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
        
        const popupContent = `
          <div class="message-popup fade-in" id="telegram-hover-popup">
            <h4>📢 ${String(props.channel)}</h4>
            <p><strong>Date:</strong> ${new Date(String(props.date)).toLocaleString()}</p>
            <p><strong>Location:</strong> ${locationString}</p>
            ${props.country_code ? `<p><strong>Country:</strong> ${String(props.country_code)}</p>` : ''}
            <div class="message-text">
              <strong>Message:</strong><br>
              ${String(props.text)}
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

    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const animatePulse = () => {
    if (!map.current || !map.current.getSource('telegram-points')) return
    const geojson = geojsonRef.current
    const now = Date.now()
    const t = ((now - pulseStart.current) / 1000) % 2 // 2s period
    
    geojson.features.forEach((f: any) => {
      const phase = f.properties.phase || 0
      f.properties.pulse = 0.5 * (1 + Math.sin(2 * Math.PI * t / 2 + phase))
    })
    
    ;(map.current.getSource('telegram-points') as mapboxgl.GeoJSONSource).setData(geojson)
    requestAnimationFrame(animatePulse)
  }

  return (
    <div className="relative w-full h-screen">
      <div 
        ref={mapContainer} 
        className="absolute inset-0"
        style={{ background: '#000000', height: '100vh', width: '100vw' }}
      />
      
      {/* Real-time notifications overlay */}
      <div className="absolute top-4 right-4 z-50 space-y-2 pointer-events-none">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`
              bg-black/80 backdrop-blur-sm border border-red-500/50 rounded-lg p-4 max-w-sm
              transform transition-all duration-500 ease-out pointer-events-auto
              ${notification.isVisible 
                ? 'translate-x-0 opacity-100 scale-100' 
                : 'translate-x-full opacity-0 scale-95'
              }
            `}
            style={{
              boxShadow: '0 8px 32px rgba(255, 68, 68, 0.3)',
              animation: notification.isVisible ? 'notificationPulse 2s ease-in-out' : 'none'
            }}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-red-400 text-sm font-semibold">
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
    </div>
  )
} 