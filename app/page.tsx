'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { FeatureCollection, Feature, Point } from 'geojson'
import React from 'react'

export default function Home() {
  console.log('Page loaded')
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const pulseStart = useRef(Date.now())
  const geojsonRef = useRef<FeatureCollection<Point>>({ type: 'FeatureCollection', features: [] })

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
      const response = await fetch('/api/messages')
      const data = await response.json()
      
      if (data.error) {
        console.error('Failed to load messages:', data.error)
        return
      }

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
          phase: (i * 2 * Math.PI) / data.messages.length
        }
      }))

      const geojson: FeatureCollection<Point> = {
        type: 'FeatureCollection',
        features
      }
      geojsonRef.current = geojson

      if (!map.current) return

      // Add source
      if (map.current.getSource('telegram-points')) {
        (map.current.getSource('telegram-points') as mapboxgl.GeoJSONSource).setData(geojson)
      } else {
        map.current.addSource('telegram-points', {
          type: 'geojson',
          data: geojson
        })

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
            'circle-color': '#fff',
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
    </div>
  )
} 