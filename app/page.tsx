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
  views?: number
  forwards?: number
  detected_language?: string
}

interface Notification {
  id: string
  message: NewMessage
  timestamp: number
  isVisible: boolean
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


  // Function to zoom to coordinates and highlight the marker
  const zoomToCoordinates = (latitude: number, longitude: number, locationName?: string, postId?: number) => {
    if (!map.current) return
    
    console.log(`🗺️ Zooming to: ${locationName || 'Unknown'} (${latitude}, ${longitude})`)
    
    // Check if this is a country-level location
    if (locationName && isCountryOnlyLocation(locationName)) {
      console.log(`🌍 Country-level location detected: ${locationName} - showing country borders`)
      
      // Add country border visualization
      addCountryBorders(locationName)
    } else {
      // Remove any existing country borders for city-level locations
      removeCountryBorders()
    }
    
    map.current.flyTo({
      center: [longitude, latitude],
      zoom: 6,
      duration: 2000,
      essential: true
    })
  }

  // Function to add country border visualization
  const addCountryBorders = (countryName: string) => {
    if (!map.current) return

    // Remove existing country borders first
    removeCountryBorders()

    try {
      // Add country border source and layer
      map.current.addSource('country-borders', {
        type: 'vector',
        url: 'mapbox://mapbox.country-boundaries-v1'
      })

      map.current.addLayer({
        id: 'country-borders-fill',
        type: 'fill',
        source: 'country-borders',
        'source-layer': 'country_boundaries',
        filter: ['==', 'name_en', countryName],
        paint: {
          'fill-color': '#ffffff',
          'fill-opacity': 0.1
        }
      })

      map.current.addLayer({
        id: 'country-borders-stroke',
        type: 'line',
        source: 'country-borders',
        'source-layer': 'country_boundaries',
        filter: ['==', 'name_en', countryName],
        paint: {
          'line-color': '#ffffff',
          'line-width': 2,
          'line-opacity': 0.8
        }
      })

      console.log(`🗺️ Added country borders for: ${countryName}`)
    } catch (error) {
      console.error('❌ Error adding country borders:', error)
    }
  }

  // Function to remove country border visualization
  const removeCountryBorders = () => {
    if (!map.current) return

    try {
      // Remove layers
      if (map.current.getLayer('country-borders-fill')) {
        map.current.removeLayer('country-borders-fill')
      }
      if (map.current.getLayer('country-borders-stroke')) {
        map.current.removeLayer('country-borders-stroke')
      }

      // Remove source
      if (map.current.getSource('country-borders')) {
        map.current.removeSource('country-borders')
      }

      console.log('🗺️ Removed country borders')
    } catch (error) {
      console.error('❌ Error removing country borders:', error)
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


  // Stop idle rotation
  const stopIdleRotation = () => {
    if (rotationAnimationRef.current) {
      cancelAnimationFrame(rotationAnimationRef.current)
      rotationAnimationRef.current = null
    }
    setIsIdle(false)
  }

  // Reset idle timer
  const resetIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }
    stopIdleRotation()
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true)
      startIdleRotation()
    }, 5000) // 5 seconds of inactivity
  }

  // Rotation configuration (following Mapbox example)
  const maxSpinZoom = 5 // Above zoom level 5, do not rotate
  const slowSpinZoom = 3 // Rotate at intermediate speeds between zoom levels 3 and 5
  const baseRotationSpeed = 0.05 // Base rotation speed in degrees per second

  // Start idle rotation
  const startIdleRotation = () => {
    if (!map.current || !isIdle) return
    
    rotationStartTime.current = Date.now()
    
    const animateRotation = () => {
      if (!map.current || !isIdle) return
      
      const zoom = map.current.getZoom()
      
      // Stop rotation at high zoom levels (following Mapbox example)
      if (zoom >= maxSpinZoom) {
        rotationAnimationRef.current = requestAnimationFrame(animateRotation)
        return
      }
      
      let rotationSpeed = baseRotationSpeed
      
      // Slow down rotation at higher zoom levels (following Mapbox example)
      if (zoom > slowSpinZoom) {
        const zoomDif = (maxSpinZoom - zoom) / (maxSpinZoom - slowSpinZoom)
        rotationSpeed *= zoomDif
      }
      
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
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'wheel']
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
      if (rotationAnimationRef.current) {
        cancelAnimationFrame(rotationAnimationRef.current)
      }
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

        map.current.on('load', async () => {
          await loadAndPlotMessages()
          console.log('🎬 Starting pulse animation...')
          animatePulse()
          
          // Remove any remaining Mapbox logos
          setTimeout(() => {
            const logos = document.querySelectorAll('.mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib');
            logos.forEach(logo => logo.remove())
          }, 100)
          
          // Initialize globe rotation
          initGlobeRotation()
          
          // Start idle timer
          resetIdleTimer()
          
          // Add idle rotation handlers
          map.current?.on('mousedown', () => {
            stopIdleRotation()
          })
          
          map.current?.on('dragstart', () => {
            stopIdleRotation()
          })
          
          map.current?.on('rotatestart', () => {
            stopIdleRotation()
          })
          
          map.current?.on('pitchstart', () => {
            stopIdleRotation()
          })
          
          map.current?.on('zoomstart', () => {
            stopIdleRotation()
          })
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
          // Filter out large embedding data from console log
          const filteredNewPost = {
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
          console.log('🆕 New post received:', filteredNewPost)
          
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
      // Clean up country borders
      removeCountryBorders()
      }
    } catch (error) {
      console.error('❌ Error setting up real-time subscription:', error)
    }
  }, [])

  // Helper function to check if location is country-level only
  const isCountryOnlyLocation = (locationName: string) => {
    if (!locationName) return false
    
    // List of common country names that should not show dots
    const countryOnlyNames = [
      'United States', 'China', 'India', 'Russia', 'Brazil', 'Canada', 'Australia',
      'Germany', 'France', 'United Kingdom', 'Italy', 'Spain', 'Japan', 'South Korea',
      'Mexico', 'Indonesia', 'Netherlands', 'Saudi Arabia', 'Turkey', 'Switzerland',
      'Iran',
      'Belgium', 'Israel', 'Austria', 'Sweden', 'Poland', 'Norway', 'Denmark',
      'Finland', 'Chile', 'New Zealand', 'Ireland', 'Portugal', 'Greece', 'Czech Republic',
      'Romania', 'Hungary', 'Bulgaria', 'Croatia', 'Slovakia', 'Slovenia', 'Estonia',
      'Latvia', 'Lithuania', 'Malta', 'Cyprus', 'Luxembourg', 'Iceland', 'Liechtenstein',
      'Monaco', 'San Marino', 'Vatican City', 'Andorra', 'Ukraine', 'Belarus', 'Moldova',
      'Georgia', 'Armenia', 'Azerbaijan', 'Kazakhstan', 'Uzbekistan', 'Kyrgyzstan',
      'Tajikistan', 'Turkmenistan', 'Afghanistan', 'Pakistan', 'Bangladesh', 'Sri Lanka',
      'Nepal', 'Bhutan', 'Maldives', 'Mongolia', 'North Korea', 'Taiwan', 'Hong Kong',
      'Macau', 'Singapore', 'Malaysia', 'Thailand', 'Vietnam', 'Cambodia', 'Laos',
      'Myanmar', 'Philippines', 'Indonesia', 'Brunei', 'East Timor', 'Papua New Guinea',
      'Fiji', 'Samoa', 'Tonga', 'Vanuatu', 'Solomon Islands', 'Palau', 'Micronesia',
      'Marshall Islands', 'Kiribati', 'Tuvalu', 'Nauru', 'South Africa', 'Egypt',
      'Nigeria', 'Ethiopia', 'Kenya', 'Tanzania', 'Uganda', 'Ghana', 'Morocco',
      'Algeria', 'Tunisia', 'Libya', 'Sudan', 'Chad', 'Niger', 'Mali', 'Burkina Faso',
      'Senegal', 'Guinea', 'Sierra Leone', 'Liberia', 'Ivory Coast', 'Ghana', 'Togo',
      'Benin', 'Cameroon', 'Central African Republic', 'Democratic Republic of the Congo',
      'Republic of the Congo', 'Gabon', 'Equatorial Guinea', 'Sao Tome and Principe',
      'Angola', 'Zambia', 'Zimbabwe', 'Botswana', 'Namibia', 'Lesotho', 'Swaziland',
      'Madagascar', 'Mauritius', 'Seychelles', 'Comoros', 'Cape Verde', 'Guinea-Bissau',
      'Gambia', 'Mauritania', 'Djibouti', 'Eritrea', 'Somalia', 'Rwanda', 'Burundi',
      'Malawi', 'Mozambique', 'Zambia', 'Zimbabwe', 'Botswana', 'Namibia', 'Lesotho',
      'Swaziland', 'South Africa', 'Argentina', 'Brazil', 'Chile', 'Uruguay', 'Paraguay',
      'Bolivia', 'Peru', 'Ecuador', 'Colombia', 'Venezuela', 'Guyana', 'Suriname',
      'French Guiana', 'Panama', 'Costa Rica', 'Nicaragua', 'Honduras', 'El Salvador',
      'Guatemala', 'Belize', 'Jamaica', 'Cuba', 'Haiti', 'Dominican Republic',
      'Puerto Rico', 'Trinidad and Tobago', 'Barbados', 'Saint Lucia', 'Saint Vincent',
      'Grenada', 'Antigua and Barbuda', 'Saint Kitts and Nevis', 'Dominica'
    ]
    
    return countryOnlyNames.includes(locationName)
  }

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

      // Filter posts that have location data (latitude and longitude) but exclude country-only locations
      const postsWithLocations = messages.filter((msg: any) => 
        msg.latitude !== null && msg.longitude !== null && 
        msg.latitude !== undefined && msg.longitude !== undefined &&
        !isCountryOnlyLocation(msg.location_name)
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
            pulse: 1.0, // Start at full brightness for new posts
            phase: Math.random() * Math.PI * 2
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
            'circle-color': '#ffffff',
            'circle-opacity': [
              'interpolate',
              ['linear'],
              ['get', 'pulse'],
              0, 0.3,
              1, 1.0
            ],
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff',
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
        
        // Simple hover effect - just change cursor
        map.current.on('mouseenter', 'telegram-points-layer', () => {
          map.current!.getCanvas().style.cursor = 'pointer'
        })

        map.current.on('mouseleave', 'telegram-points-layer', () => {
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
          let zoomLevel = 6 // Default zoom for general areas (more zoomed out)
          
          // Check if it's a city-specific location
          if (locationName.toLowerCase().includes('city') || 
              locationName.toLowerCase().includes('town') ||
              locationName.toLowerCase().includes('village') ||
              locationName.includes(',')) {
            zoomLevel = 9 // City level zoom (more zoomed out)
          }
          // Check if it's a country-level location
          else if (isCountryOnlyLocation(locationName)) {
            zoomLevel = 3 // Country level zoom (more zoomed out)
            
            // Add country border visualization for country-level locations
            addCountryBorders(locationName)
          } else {
            // Remove country borders for city-level locations
            removeCountryBorders()
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
      console.log('⚠️ Animation stopped: Map or source not ready')
      return
    }
    
    const geojson = geojsonRef.current
    if (!geojson.features || geojson.features.length === 0) {
      console.log('⚠️ Animation stopped: No features')
      return
    }
    
    const now = Date.now()
    const t = ((now - pulseStart.current) / 1000) % 2 // 2s period for faster, more visible pulse
    
    geojson.features.forEach((f: any) => {
      const phase = f.properties.phase || 0
      // Create a much more dramatic pulse effect - from 0.1 to 1.5
      f.properties.pulse = 0.1 + 1.4 * (1 + Math.sin(2 * Math.PI * t / 2 + phase)) / 2
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

    // Skip country-only locations (don't show dots for them)
    if (isCountryOnlyLocation(newPost.location_name)) {
      console.log('📍 Skipping country-only location:', newPost.location_name)
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
          phase: Math.random() * Math.PI * 2
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
      timestamp: Date.now(),
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
      <RealtimeFeed 
        onZoomToLocation={zoomToCoordinates} 
        notifications={notifications}
        liveNotification={liveNotification}
      />


    </div>
  )
} 