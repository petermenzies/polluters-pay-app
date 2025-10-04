import { useEffect, useRef } from 'react'
import Map from 'react-map-gl/maplibre'
import { Protocol } from 'pmtiles'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

function App() {
  const mapRef = useRef<any>(null)

  useEffect(() => {
    // Register the PMTiles protocol once when component mounts
    let protocol = new Protocol()
    maplibregl.addProtocol('pmtiles', protocol.tile)
    
    // Cleanup on unmount
    return () => {
      maplibregl.removeProtocol('pmtiles')
    }
  }, [])

  const handleMapLoad = () => {
    
    if (!mapRef.current) return
    const map = mapRef.current.getMap()
    
    // Add your PMTiles source from R2 bucket
    map.addSource('r2-tiles', {
      type: 'vector',
      url: 'pmtiles://https://pub-ab0c00b2b5024563855a23efd20fe62b.r2.dev/senate.pmtiles'
    })
    
    // Listen for source data events
    map.on('sourcedata', (e: any) => {
      if (e.sourceId === 'r2-tiles' && e.isSourceLoaded) {
        
        // Check if layer already exists to avoid duplicate adds
        if (!map.getLayer('senate-layer')) {
          map.addLayer({
            id: 'senate-layer',
            type: 'fill',
            source: 'r2-tiles',
            'source-layer': 'senate',
            paint: {
              'fill-color': '#3388ff',
              'fill-opacity': 0.5
            }
          })
        }
        
        // Add line layer for polygon borders
        if (!map.getLayer('senate-layer-line')) {
          map.addLayer({
            id: 'senate-layer-line',
            type: 'line',
            source: 'r2-tiles',
            'source-layer': 'senate',
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
    <div style={{ height: '100vh', width: '100%' }}>
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
    </div>
  )
}

export default App