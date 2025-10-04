import { useEffect, useRef, useState } from 'react'
import Map from 'react-map-gl/maplibre'
import { Protocol } from 'pmtiles'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

function App() {
  const mapRef = useRef<any>(null)
  const [activeLayer, setActiveLayer] = useState<'senate' | 'assembly'>('senate')

  useEffect(() => {
    // Register the PMTiles protocol once when component mounts
    let protocol = new Protocol()
    maplibregl.addProtocol('pmtiles', protocol.tile)
    
    // Cleanup on unmount
    return () => {
      maplibregl.removeProtocol('pmtiles')
    }
  }, [])

  const toggleLayer = (layer: 'senate' | 'assembly') => {
    setActiveLayer(layer)
    if (!mapRef.current) return
    const map = mapRef.current.getMap()
    
    // Hide all layers first
    map.setLayoutProperty('senate-polygon', 'visibility', 'none')
    map.setLayoutProperty('senate-line', 'visibility', 'none')
    map.setLayoutProperty('assembly-polygon', 'visibility', 'none')
    map.setLayoutProperty('assembly-line', 'visibility', 'none')
    
    // Show selected layer
    if (layer === 'senate') {
      map.setLayoutProperty('senate-polygon', 'visibility', 'visible')
      map.setLayoutProperty('senate-line', 'visibility', 'visible')
    } else {
      map.setLayoutProperty('assembly-polygon', 'visibility', 'visible')
      map.setLayoutProperty('assembly-line', 'visibility', 'visible')
    }
  }

  const handleMapLoad = () => {
    
    if (!mapRef.current) return
    const map = mapRef.current.getMap()
    
    // Add your PMTiles source from R2 bucket
    map.addSource('r2-tiles', {
      type: 'vector',
      url: 'pmtiles://https://pub-ab0c00b2b5024563855a23efd20fe62b.r2.dev/districts.pmtiles'
    })
    
    // Listen for source data events
    map.on('sourcedata', (e: any) => {
      if (e.sourceId === 'r2-tiles' && e.isSourceLoaded) {
        
        // senate layer
        if (!map.getLayer('senate-polygon')) {
          map.addLayer({
            id: 'senate-polygon',
            type: 'fill',
            source: 'r2-tiles',
            'source-layer': 'senate',
            layout: { visibility: 'visible' },
            paint: {
              'fill-color': '#3388ff',
              'fill-opacity': 0.5
            }
          })
        }
        
        // Add line layer for polygon borders
        if (!map.getLayer('senate-line')) {
          map.addLayer({
            id: 'senate-line',
            type: 'line',
            source: 'r2-tiles',
            'source-layer': 'senate',
            layout: { visibility: 'visible' },
            paint: {
              'line-color': '#000000',
              'line-width': 1
            }
          })
        }

        // assembly layer
        if (!map.getLayer('assembly-polygon')) {
          map.addLayer({
            id: 'assembly-polygon',
            type: 'fill',
            source: 'r2-tiles',
            'source-layer': 'assembly',
            layout: { visibility: 'none' },
            paint: {
              'fill-color': '#8462C0',
              'fill-opacity': 0.5
            }
          })
        }
        
        // Add line layer for polygon borders
        if (!map.getLayer('assembly-line')) {
          map.addLayer({
            id: 'assembly-line',
            type: 'line',
            source: 'r2-tiles',
            'source-layer': 'assembly',
            layout: { visibility: 'none' },
            paint: {
              'line-color': '#000000',
              'line-width': 1
            }
          })
        }
      }
    })
  }

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
      <Map
        ref={mapRef}
        onLoad={handleMapLoad}
        initialViewState={{
          longitude: -120.081,
          latitude: 37.725,
          zoom: 5.25
        }}
        style={{ height: '100%', width: '100%' }}
        mapStyle="https://api.maptiler.com/maps/positron/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL"
      />
      
      {/* Layer Toggle UI */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: 'white',
        color: 'black',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => toggleLayer('senate')}
            style={{
              padding: '8px 16px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: activeLayer === 'senate' ? '#3388ff' : 'white',
              color: activeLayer === 'senate' ? 'white' : 'black',
              cursor: 'pointer'
            }}
          >
            Senate
          </button>
          <button
            onClick={() => toggleLayer('assembly')}
            style={{
              padding: '8px 16px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: activeLayer === 'assembly' ? '#8462C0' : 'white',
              color: activeLayer === 'assembly' ? 'white' : 'black',
              cursor: 'pointer'
            }}
          >
            Assembly
          </button>
        </div>
      </div>
    </div>
  )
}

export default App