
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

function App() {
  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <MapContainer
        center={[34.419, -119.700]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`}
        />
        <Marker position={[34.419, -119.700]}>
          <Popup>
            Santa Barbara, CA
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}

export default App
