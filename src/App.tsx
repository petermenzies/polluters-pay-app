
import Map from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import './App.css'

function App() {
  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <Map
        initialViewState={{
          longitude: -119.700,
          latitude: 34.419,
          zoom: 13
        }}
        style={{ height: '100%', width: '100%' }}
        mapStyle="https://api.maptiler.com/maps/positron/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL"
        attributionControl={{}}
      />
    </div>
  )
}

export default App
