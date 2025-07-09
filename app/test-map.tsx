'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

export default function TestMap() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    if (!mapContainer.current) return
    
    const token = process.env.MAPBOX_TOKEN
    console.log('Test Mapbox token:', token)
    mapboxgl.accessToken = token || ''
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [0, 0],
        zoom: 1.5,
        projection: 'globe' as any,
        pitch: 0,
        bearing: 0
      })

      map.current.on('load', () => {
        console.log('Test map loaded successfully')
        
        // Add a simple test point
        map.current?.addSource('test-points', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [0, 0]
                },
                properties: {
                  id: 'test',
                  pulse: 0.5
                }
              }
            ]
          }
        })

        map.current?.addLayer({
          id: 'test-points-layer',
          type: 'circle',
          source: 'test-points',
          paint: {
            'circle-radius': 10,
            'circle-color': '#ffffff',
            'circle-opacity': 0.9,
            'circle-stroke-width': 0,
          }
        })
        
        console.log('Test point added - should see white dot at center')
      })

      return () => {
        if (map.current) {
          map.current.remove()
        }
      }
    } catch (error) {
      console.error('Error in test map:', error)
    }
  }, [])

  return (
    <div className="w-full h-screen">
      <div 
        ref={mapContainer} 
        className="w-full h-full"
        style={{ background: '#000000' }}
      />
    </div>
  )
} 