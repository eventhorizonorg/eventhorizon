'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { FeatureCollection, Feature, Point } from 'geojson'
import React from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabaseClient } from '@/lib/supabase/client'
import RealtimeFeed from './components/RealtimeFeed'

// Types for real-time notifications
interface NewMessage {
  id: number
  post_id: number
  text: string
  date: string
  channel: string
  channel_username: string
  latitude: number
  longitude: number
  location_name?: string
  country_code?: string
  has_photo?: boolean
  has_video?: boolean
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
  const [liveNotification, setLiveNotification] = useState<{
    show: boolean
    channel: string
    text: string
    post: any
  }>({ show: false, channel: '', text: '', post: null })
  const supabaseRef = useRef<any>(null)
  const subscriptionRef = useRef<any>(null)

  // Expanded popup state
  const [expandedPopup, setExpandedPopup] = useState<ExpandedPopup>({
    isOpen: false,
    message: null,
    position: null
  })

  // Function to zoom to coordinates and highlight the marker
  const zoomToCoordinates = (latitude: number, longitude: number, locationName?: string, postId?: number) => {
    if (!map.current) return
    
    console.log(`🗺️ Zooming to: ${locationName || 'Unknown'} (${latitude}, ${longitude})`)
    
    map.current.flyTo({
      center: [longitude, latitude],
      zoom: 8,
      duration: 2000,
      essential: true
    })
    
    // Highlight the specific marker after zoom completes
    setTimeout(() => {
      if (!map.current || !map.current.getSource('telegram-points')) return
      
      const geojson = geojsonRef.current
      if (!geojson.features || geojson.features.length === 0) return
      
      // Find and highlight the specific marker
      let foundMarker = false
      geojson.features.forEach((feature: any) => {
        if (feature.properties.id === postId || 
            (Math.abs(feature.geometry.coordinates[0] - longitude) < 0.001 && 
             Math.abs(feature.geometry.coordinates[1] - latitude) < 0.001)) {
          // Highlight this marker by making it larger and brighter
          feature.properties.highlighted = true
          feature.properties.pulse = 1.5 // Make it larger
          foundMarker = true
          console.log(`🎯 Highlighted marker for post ${postId || 'unknown'}`)
        } else {
          // Reset other markers
          feature.properties.highlighted = false
        }
      })
      
      if (foundMarker) {
        // Update the map data
        try {
          ;(map.current.getSource('telegram-points') as mapboxgl.GeoJSONSource).setData(geojson)
          
          // Remove highlight after 5 seconds
          setTimeout(() => {
            geojson.features.forEach((feature: any) => {
              feature.properties.highlighted = false
            })
            if (map.current && map.current.getSource('telegram-points')) {
              ;(map.current.getSource('telegram-points') as mapboxgl.GeoJSONSource).setData(geojson)
            }
          }, 5000)
        } catch (error) {
          console.error('❌ Error highlighting marker:', error)
        }
      }
    }, 2100) // Wait for flyTo to complete
    
    // Show a temporary popup
    if (locationName) {
      new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'custom-popup'
      })
        .setLngLat([longitude, latitude])
        .setHTML(`
          <div class="text-center">
            <div class="font-semibold text-blue-600">📍 ${locationName}</div>
            <div class="text-sm text-gray-600">Zoomed from feed</div>
          </div>
        `)
        .addTo(map.current)
      
      // Remove popup after 3 seconds
      setTimeout(() => {
        const popups = document.querySelectorAll('.custom-popup')
        popups.forEach(popup => popup.remove())
      }, 3000)
    }
  }

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

    // Real-time status is now managed by the subscription callback

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
        post_id: newMessage.post_id,
        text: newMessage.text,
        date: newMessage.date,
        channel: newMessage.channel,
        channel_username: newMessage.channel_username,
        latitude: newMessage.latitude,
        longitude: newMessage.longitude,
        location_name: newMessage.location_name,
        country_code: newMessage.country_code,
        has_photo: newMessage.has_photo,
        has_video: newMessage.has_video,
        views: newMessage.views,
        forwards: newMessage.forwards,
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
          bearing: 0,
          attributionControl: false
        })

        map.current.on('load', () => {
          loadAndPlotMessages()
          animatePulse()
          
          // Remove any remaining Mapbox logos
          setTimeout(() => {
            const logos = document.querySelectorAll('.mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib');
            logos.forEach(logo => logo.remove())
          }, 100)
          
          // Initialize globe rotation
          initGlobeRotation()
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

  // Real-time subscription for new posts
  useEffect(() => {
    console.log('🔌 Setting up real-time subscription...')
    
    try {
      const supabase = supabaseClient()
      
      const subscription = supabase
        .channel('posts_realtime')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        }, (payload) => {
          console.log('🆕 New post received:', payload.new)
          
          // Handle the new post asynchronously
          const handleNewPost = async () => {
            const newPost = payload.new
            console.log('🔍 Fetching complete post data for:', newPost.id)
            try {
              const response = await fetch('/api/feed')
              const data = await response.json()
              console.log('📊 API Response for new post:', data)
              
              if (data.posts && data.posts.length > 0) {
                // Find the new post in the updated data
                const latestPost = data.posts.find((post: any) => post.id === newPost.id)
                console.log('🔍 Looking for post ID:', newPost.id, 'Found:', !!latestPost)
                if (latestPost) {
                  console.log('📍 Adding new post to map:', latestPost)
                  addNewPostToMap(latestPost)
                  showNewPostNotification(latestPost)
                } else {
                  console.log('❌ New post not found in API response')
                }
              } else {
                console.log('❌ No posts in API response')
              }
            } catch (error) {
              console.error('❌ Error fetching new post data:', error)
            }
          }
          
          handleNewPost()
        })
        .subscribe((status) => {
          console.log('📡 Real-time subscription status:', status)
          if (status === 'SUBSCRIBED') {
            setRealtimeStatus('connected')
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setRealtimeStatus('failed')
          } else if (status === 'CLOSED') {
            setRealtimeStatus('disabled')
          }
        })

      return () => {
        console.log('🔌 Cleaning up real-time subscription')
        subscription.unsubscribe()
      }
    } catch (error) {
      console.error('❌ Error setting up real-time subscription:', error)
    }
  }, [])

  // Load and plot posts
  const loadAndPlotMessages = async () => {
    try {
      console.log('🔄 Loading posts...')
      const response = await fetch('/api/feed')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const responseData = await response.json()
      console.log('📊 API Response:', responseData)
      
      if (!responseData.posts || !Array.isArray(responseData.posts)) {
        throw new Error('Invalid response format: posts array not found')
      }
      
      const messages = responseData.posts
      console.log(`📍 Processing ${messages.length} posts`)
      
      // Filter posts that have location data (latitude and longitude)
      const postsWithLocations = messages.filter((msg: any) => 
        msg.latitude !== null && msg.longitude !== null && 
        msg.latitude !== undefined && msg.longitude !== undefined
      )
      
      console.log(`📍 Found ${postsWithLocations.length} posts with location data`)
      
      const geojson: FeatureCollection<Point> = {
        type: 'FeatureCollection',
        features: postsWithLocations.map((msg: any) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [msg.longitude, msg.latitude]
          },
          properties: {
            id: msg.id,
            post_id: msg.post_id,
            text: msg.text,
            date: msg.date,
            channel: msg.channel,
            channel_username: msg.channel_username,
            latitude: msg.latitude,
            longitude: msg.longitude,
            location_name: msg.location_name,
            country_code: msg.country_code,
            has_photo: msg.has_photo,
            has_video: msg.has_video,
            pulse: 0.5,
            phase: Math.random() * Math.PI * 2,
            highlighted: false // Initialize as not highlighted
          }
        }))
      }
      
      console.log(`🗺️ Created GeoJSON with ${geojson.features.length} features`)
      geojsonRef.current = geojson
      
      if (!map.current) {
        console.error('❌ Map not initialized')
        return
      }
      
      console.log('🗺️ Map is ready, adding data source...')
      
      if (map.current.getSource('telegram-points')) {
        console.log('🔄 Updating existing data source')
        ;(map.current.getSource('telegram-points') as mapboxgl.GeoJSONSource).setData(geojson)
      } else {
        console.log('➕ Adding new data source and layers')
        map.current.addSource('telegram-points', {
          type: 'geojson',
          data: geojson
        })

        // Add glow layer first (behind the main points) - dramatic pulsing white glow
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
            'circle-color': [
              'case',
              ['get', 'highlighted'],
              '#00ff00', // Green glow for highlighted markers
              '#ffffff'  // White glow for normal markers
            ],
            'circle-opacity': [
              'interpolate',
              ['linear'],
              ['get', 'pulse'],
              0, 0.05,
              1, 0.4
            ],
            'circle-stroke-width': 0
          }
        })

        // Add main points layer - dramatic pulsing white dots
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
            'circle-color': [
              'case',
              ['get', 'highlighted'],
              '#00ff00', // Green for highlighted markers
              '#ffffff'  // White for normal markers
            ],
            'circle-opacity': [
              'interpolate',
              ['linear'],
              ['get', 'pulse'],
              0, 0.3,
              1, 1.0
            ],
            'circle-stroke-width': 1,
            'circle-stroke-color': [
              'case',
              ['get', 'highlighted'],
              '#00ff00', // Green stroke for highlighted markers
              '#ffffff'  // White stroke for normal markers
            ],
            'circle-stroke-opacity': [
              'interpolate',
              ['linear'],
              ['get', 'pulse'],
              0, 0.2,
              1, 0.9
            ]
          }
        })
        
        console.log('✅ Map layers added successfully')
        
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
          
          const cleanChannel = String(props.channel_username || props.channel).replace('@', '')
          
          // Truncate text for popup preview
          const truncatedText = String(props.text).length > 150 
            ? String(props.text).substring(0, 150) + '...'
            : String(props.text)
          
          const popupContent = `
            <div class="message-popup fade-in" id="telegram-hover-popup">
              <h4 style="color: #333; font-weight: bold; margin: 0 0 8px 0;">📢 ${String(props.channel_name || props.channel || 'Unknown Channel')}</h4>
              <p><strong>Date:</strong> ${new Date(String(props.date)).toLocaleString()}</p>
              ${props.location_name ? `<p><strong>Location:</strong> ${String(props.location_name)} (${locationString})</p>` : `<p><strong>Coordinates:</strong> ${locationString}</p>`}
              ${props.country_code ? `<p><strong>Country:</strong> ${String(props.country_code)}</p>` : ''}
              <div class="message-text">
                <strong>Message:</strong><br>
                ${truncatedText}
                ${String(props.text).length > 150 ? `
                  <br><br>
                  <button class="read-more-btn" onclick="window.openExpandedPopup(${JSON.stringify({
                    id: props.id,
                    post_id: props.post_id,
                    text: props.text,
                    date: props.date,
                    channel: props.channel_name || props.channel,
                    channel_name: props.channel_name,
                    channel_username: props.channel_username,
                    latitude: props.latitude,
                    longitude: props.longitude,
                    location_name: props.location_name,
                    country_code: props.country_code,
                    has_photo: props.has_photo,
                    has_video: props.has_video
                  }).replace(/"/g, '&quot;')})">
                    📖 Read Full Message
                  </button>
                ` : ''}
              </div>
              ${props.post_id && cleanChannel ? `
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
                  <a href="https://t.me/${cleanChannel}/${props.post_id}" 
                     target="_blank" 
                     rel="noopener noreferrer"
                     style="color: #0088cc; text-decoration: none; font-size: 14px;">
                    🔗 View on Telegram →
                  </a>
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
              post_id: messageData.post_id,
              text: messageData.text,
              date: messageData.date,
              channel: messageData.channel,
              channel_username: messageData.channel_username,
              latitude: messageData.latitude,
              longitude: messageData.longitude,
              location_name: messageData.location_name,
              country_code: messageData.country_code,
              has_photo: messageData.has_photo,
              has_video: messageData.has_video,
              views: messageData.views,
              forwards: messageData.forwards
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

        // Add click handler for zooming to location
        map.current.on('click', 'telegram-points-layer', (e) => {
          if (!e.features || e.features.length === 0) return
          
          const feature = e.features[0]
          const props = feature.properties
          if (!props) return
          
          const coordinates: [number, number] = [props.longitude, props.latitude]
          const locationName = props.location_name || 'Unknown Location'
          
          // Determine zoom level based on location specificity
          let zoomLevel = 8 // Default zoom for general areas
          
          // Check if it's a city-specific location
          if (locationName.toLowerCase().includes('city') || 
              locationName.toLowerCase().includes('town') ||
              locationName.toLowerCase().includes('village') ||
              locationName.includes(',')) {
            zoomLevel = 12 // City level zoom
          }
          // Check if it's a country-level location
          else if (locationName === 'United States' || 
                   locationName === 'China' || 
                   locationName === 'Russia' ||
                   locationName === 'Brazil' ||
                   locationName === 'Canada' ||
                   locationName === 'Australia' ||
                   locationName === 'India' ||
                   locationName === 'France' ||
                   locationName === 'Germany' ||
                   locationName === 'United Kingdom' ||
                   locationName === 'Italy' ||
                   locationName === 'Spain' ||
                   locationName === 'Japan' ||
                   locationName === 'South Korea' ||
                   locationName === 'Mexico' ||
                   locationName === 'Argentina' ||
                   locationName === 'South Africa' ||
                   locationName === 'Nigeria' ||
                   locationName === 'Egypt' ||
                   locationName === 'Turkey' ||
                   locationName === 'Iran' ||
                   locationName === 'Saudi Arabia' ||
                   locationName === 'Indonesia' ||
                   locationName === 'Thailand' ||
                   locationName === 'Vietnam' ||
                   locationName === 'Philippines' ||
                   locationName === 'Malaysia' ||
                   locationName === 'Singapore' ||
                   locationName === 'Israel' ||
                   locationName === 'Palestine' ||
                   locationName === 'Syria' ||
                   locationName === 'Iraq' ||
                   locationName === 'Afghanistan' ||
                   locationName === 'Pakistan' ||
                   locationName === 'Bangladesh' ||
                   locationName === 'Sri Lanka' ||
                   locationName === 'Myanmar' ||
                   locationName === 'Cambodia' ||
                   locationName === 'Laos' ||
                   locationName === 'Mongolia' ||
                   locationName === 'Kazakhstan' ||
                   locationName === 'Uzbekistan' ||
                   locationName === 'Ukraine' ||
                   locationName === 'Poland' ||
                   locationName === 'Romania' ||
                   locationName === 'Bulgaria' ||
                   locationName === 'Greece' ||
                   locationName === 'Portugal' ||
                   locationName === 'Netherlands' ||
                   locationName === 'Belgium' ||
                   locationName === 'Switzerland' ||
                   locationName === 'Austria' ||
                   locationName === 'Sweden' ||
                   locationName === 'Norway' ||
                   locationName === 'Denmark' ||
                   locationName === 'Finland' ||
                   locationName === 'Ireland' ||
                   locationName === 'Iceland' ||
                   locationName === 'New Zealand' ||
                   locationName === 'Chile' ||
                   locationName === 'Peru' ||
                   locationName === 'Colombia' ||
                   locationName === 'Venezuela' ||
                   locationName === 'Ecuador' ||
                   locationName === 'Bolivia' ||
                   locationName === 'Paraguay' ||
                   locationName === 'Uruguay' ||
                   locationName === 'Guyana' ||
                   locationName === 'Suriname' ||
                   locationName === 'French Guiana' ||
                   locationName === 'Madagascar' ||
                   locationName === 'Mali' ||
                   locationName === 'Niger' ||
                   locationName === 'Chad' ||
                   locationName === 'Sudan' ||
                   locationName === 'Ethiopia' ||
                   locationName === 'Kenya' ||
                   locationName === 'Tanzania' ||
                   locationName === 'Uganda' ||
                   locationName === 'Rwanda' ||
                   locationName === 'Burundi' ||
                   locationName === 'Democratic Republic of the Congo' ||
                   locationName === 'Republic of the Congo' ||
                   locationName === 'Central African Republic' ||
                   locationName === 'Cameroon' ||
                   locationName === 'Gabon' ||
                   locationName === 'Equatorial Guinea' ||
                   locationName === 'São Tomé and Príncipe' ||
                   locationName === 'Angola' ||
                   locationName === 'Zambia' ||
                   locationName === 'Zimbabwe' ||
                   locationName === 'Botswana' ||
                   locationName === 'Namibia' ||
                   locationName === 'Lesotho' ||
                   locationName === 'Swaziland' ||
                   locationName === 'Mozambique' ||
                   locationName === 'Malawi' ||
                   locationName === 'Zambia' ||
                   locationName === 'Algeria' ||
                   locationName === 'Tunisia' ||
                   locationName === 'Libya' ||
                   locationName === 'Morocco' ||
                   locationName === 'Western Sahara' ||
                   locationName === 'Mauritania' ||
                   locationName === 'Senegal' ||
                   locationName === 'Gambia' ||
                   locationName === 'Guinea-Bissau' ||
                   locationName === 'Guinea' ||
                   locationName === 'Sierra Leone' ||
                   locationName === 'Liberia' ||
                   locationName === 'Ivory Coast' ||
                   locationName === 'Ghana' ||
                   locationName === 'Togo' ||
                   locationName === 'Benin' ||
                   locationName === 'Burkina Faso' ||
                   locationName === 'Qatar' ||
                   locationName === 'United Arab Emirates' ||
                   locationName === 'Kuwait' ||
                   locationName === 'Bahrain' ||
                   locationName === 'Oman' ||
                   locationName === 'Yemen' ||
                   locationName === 'Jordan' ||
                   locationName === 'Lebanon' ||
                   locationName === 'Cyprus' ||
                   locationName === 'Georgia' ||
                   locationName === 'Armenia' ||
                   locationName === 'Azerbaijan' ||
                   locationName === 'Belarus' ||
                   locationName === 'Moldova' ||
                   locationName === 'Lithuania' ||
                   locationName === 'Latvia' ||
                   locationName === 'Estonia' ||
                   locationName === 'Slovenia' ||
                   locationName === 'Croatia' ||
                   locationName === 'Bosnia and Herzegovina' ||
                   locationName === 'Serbia' ||
                   locationName === 'Montenegro' ||
                   locationName === 'North Macedonia' ||
                   locationName === 'Albania' ||
                   locationName === 'Kosovo' ||
                   locationName === 'Malta' ||
                   locationName === 'Luxembourg' ||
                   locationName === 'Liechtenstein' ||
                   locationName === 'Monaco' ||
                   locationName === 'San Marino' ||
                   locationName === 'Vatican City' ||
                   locationName === 'Andorra' ||
                   locationName === 'Palestinian Authority') {
            zoomLevel = 6 // Country level zoom
          }
          
          // Smooth zoom to location
          map.current!.easeTo({
            center: coordinates,
            zoom: zoomLevel,
            duration: 1500,
            essential: true
          })
          
          // Show a brief notification
          console.log(`🗺️ Zooming to ${locationName} at zoom level ${zoomLevel}`)
        })
        
        // Change cursor on hover over clickable points
        map.current.on('mouseenter', 'telegram-points-layer', () => {
          map.current!.getCanvas().style.cursor = 'pointer'
        })
        
        map.current.on('mouseleave', 'telegram-points-layer', () => {
          map.current!.getCanvas().style.cursor = ''
        })
      }
    } catch (error) {
      console.error('❌ Error loading posts:', error)
      console.error('🔍 Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
    }
  }

  // Globe rotation functionality
  const initGlobeRotation = () => {
    if (!map.current) return

    const secondsPerRevolution = 120 // Adjust for desired speed (2 minutes per revolution)
    const maxSpinZoom = 5 // Maximum zoom level for spinning
    const slowSpinZoom = 3 // Zoom level to start slowing spin
    let userInteracting = false // Track user interaction
    let spinEnabled = true // Control spin state
    let animationId: number | null = null // Track animation frame

    const spinGlobe = () => {
      if (!map.current || animationId) return // Prevent multiple animations
      
      const zoom = map.current.getZoom()
      if (spinEnabled && !userInteracting && zoom < maxSpinZoom) {
        let distancePerSecond = 360 / secondsPerRevolution
        if (zoom > slowSpinZoom) {
          const zoomDif = (maxSpinZoom - zoom) / (maxSpinZoom - slowSpinZoom)
          distancePerSecond *= zoomDif
        }
        const center = map.current.getCenter()
        center.lng -= distancePerSecond
        
        map.current.easeTo({ 
          center, 
          duration: 1000, 
          easing: (n) => n 
        })
        
        // Schedule next rotation
        animationId = window.setTimeout(() => {
          animationId = null
          spinGlobe()
        }, 1000)
      }
    }

    // Set up event listeners to manage user interaction
    map.current.on('mousedown', () => { 
      userInteracting = true
      if (animationId) {
        clearTimeout(animationId)
        animationId = null
      }
    })
    
    map.current.on('mouseup', () => { 
      userInteracting = false
      setTimeout(() => spinGlobe(), 100) // Small delay to prevent immediate restart
    })
    
    map.current.on('dragend', () => { 
      userInteracting = false
      setTimeout(() => spinGlobe(), 100)
    })
    
    map.current.on('pitchend', () => { 
      userInteracting = false
      setTimeout(() => spinGlobe(), 100)
    })
    
    map.current.on('rotateend', () => { 
      userInteracting = false
      setTimeout(() => spinGlobe(), 100)
    })

    // Start the spinning animation
    setTimeout(() => spinGlobe(), 1000) // Initial delay
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
    const t = ((now - pulseStart.current) / 1000) % 3 // 3s period for slower, more visible pulse
    
    geojson.features.forEach((f: any) => {
      const phase = f.properties.phase || 0
      // Create a more dramatic pulse effect
      f.properties.pulse = 0.3 + 0.7 * (1 + Math.sin(2 * Math.PI * t / 3 + phase)) / 2
    })
    
    try {
      ;(map.current.getSource('telegram-points') as mapboxgl.GeoJSONSource).setData(geojson)
      requestAnimationFrame(animatePulse)
    } catch (error) {
      console.error('❌ Error updating map data:', error)
    }
  }

  // Add new post to map dynamically
  const addNewPostToMap = (newPost: any) => {
    if (!map.current || !map.current.getSource('telegram-points')) {
      console.log('⚠️ Map not ready, skipping new post')
      return
    }

    try {
      const geojson = geojsonRef.current
      
      // Create new feature for the post
      const newFeature: Feature<Point> = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [newPost.longitude, newPost.latitude]
        },
        properties: {
          id: newPost.id,
          post_id: newPost.post_id,
          text: newPost.text,
          date: newPost.date,
          channel: newPost.channel,
          channel_username: newPost.channel_username,
          latitude: newPost.latitude,
          longitude: newPost.longitude,
          location_name: newPost.location_name,
          country_code: newPost.country_code,
          has_photo: newPost.has_photo,
          has_video: newPost.has_video,
          pulse: 1.0, // Start at full brightness for new posts
          phase: Math.random() * Math.PI * 2,
          highlighted: false // Initialize as not highlighted
        }
      }

      // Add to existing features
      geojson.features.push(newFeature)
      geojsonRef.current = geojson

      // Update map source
      ;(map.current.getSource('telegram-points') as mapboxgl.GeoJSONSource).setData(geojson)
      
      console.log('✅ New post added to map:', newPost.location_name)
    } catch (error) {
      console.error('❌ Error adding new post to map:', error)
    }
  }

  // Show notification for new post
  const showNewPostNotification = (newPost: any) => {
    // Show live notification
    const truncatedText = newPost.text.length > 100 
      ? newPost.text.substring(0, 100) + '...'
      : newPost.text

    console.log('🔔 Setting live notification:', {
      show: true,
      channel: newPost.channel_name || newPost.channel || 'Unknown Channel',
      text: truncatedText,
      post: newPost
    })
    
    setLiveNotification({
      show: true,
      channel: newPost.channel_name || newPost.channel || 'Unknown Channel',
      text: truncatedText,
      post: newPost
    })

    // Auto-hide after 8 seconds
    setTimeout(() => {
      setLiveNotification(prev => ({ ...prev, show: false }))
    }, 8000)

    // Also add to regular notifications
    const notification: Notification = {
      id: `new-post-${newPost.id}-${Date.now()}`,
      message: {
        id: newPost.id,
        post_id: newPost.post_id,
        text: newPost.text,
        date: newPost.date,
        channel: newPost.channel,
        channel_username: newPost.channel_username,
        latitude: newPost.latitude,
        longitude: newPost.longitude,
        location_name: newPost.location_name,
        country_code: newPost.country_code,
        has_photo: newPost.has_photo,
        has_video: newPost.has_video,
        detected_language: newPost.detected_language
      },
      isVisible: true
    }

    setNotifications(prev => [notification, ...prev.slice(0, 4)]) // Keep max 5 notifications

    // Auto-hide after 5 seconds
    setTimeout(() => {
      setNotifications(prev => 
        prev.map(n => 
          n.id === notification.id 
            ? { ...n, isVisible: false }
            : n
        )
      )
      
      // Remove from array after fade out
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id))
      }, 500)
    }, 5000)
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
      
      {/* Real-time Feed Component - Top Right */}
      <RealtimeFeed onZoomToLocation={zoomToCoordinates} />
      
      {/* Real-time notifications overlay */}
      <div className="absolute top-4 left-4 z-50 space-y-2 pointer-events-none">
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

      {/* Live notification */}
      {liveNotification.show && (
        <div className="absolute top-16 right-4 z-50 max-w-sm">
          {console.log('🔔 Rendering live notification:', liveNotification)}
          <div 
            className="bg-black/80 backdrop-blur-sm rounded-lg p-4 border border-white/20 cursor-pointer hover:bg-black/90 transition-all duration-300 group"
            onClick={() => {
              if (liveNotification.post && map.current) {
                // Zoom to location
                map.current.flyTo({
                  center: [liveNotification.post.longitude, liveNotification.post.latitude],
                  zoom: 8,
                  duration: 2000
                })
                setLiveNotification(prev => ({ ...prev, show: false }))
              }
            }}
            onMouseEnter={(e) => {
              // Expand on hover
              e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mt-2 flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-red-400 text-xs font-bold">NEW EVENT</span>
                  <span className="text-white/60 text-xs">•</span>
                  <span className="text-white text-xs font-medium truncate">
                    {liveNotification.channel}
                  </span>
                </div>
                <p className="text-white/90 text-sm leading-relaxed group-hover:text-white transition-colors">
                  {liveNotification.text}
                </p>
                <div className="mt-2 text-xs text-white/60">
                  Click to zoom to location
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  📢 {expandedPopup.message.channel_name || expandedPopup.message.channel || 'Unknown Channel'}
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
                    {expandedPopup.message.location_name || `${expandedPopup.message.latitude.toFixed(4)}, ${expandedPopup.message.longitude.toFixed(4)}`}
                  </div>
                  {expandedPopup.message.country_code && (
                    <div>
                      <span className="font-medium">Country:</span>
                      <br />
                      {expandedPopup.message.country_code}
                    </div>
                  )}
                  {expandedPopup.message.views && (
                    <div>
                      <span className="font-medium">Views:</span>
                      <br />
                      {expandedPopup.message.views.toLocaleString()}
                    </div>
                  )}
                  {expandedPopup.message.forwards && (
                    <div>
                      <span className="font-medium">Forwards:</span>
                      <br />
                      {expandedPopup.message.forwards.toLocaleString()}
                    </div>
                  )}
                </div>
                
                {/* Media indicators */}
                {(expandedPopup.message.has_photo || expandedPopup.message.has_video) && (
                  <div className="mb-4 flex gap-2">
                    {expandedPopup.message.has_photo && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        📷 Photo
                      </span>
                    )}
                    {expandedPopup.message.has_video && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        🎥 Video
                      </span>
                    )}
                  </div>
                )}
                
                {/* Full Message Text */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Full Message:</h4>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {expandedPopup.message.text}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">
                Click outside to close
              </div>
              {expandedPopup.message.post_id && expandedPopup.message.channel_username && (
                <a
                  href={`https://t.me/${String(expandedPopup.message.channel_username).replace('@', '')}/${expandedPopup.message.post_id}`}
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