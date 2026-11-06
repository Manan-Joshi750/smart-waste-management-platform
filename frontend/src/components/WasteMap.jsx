import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';

// Define color markers mapping to priority levels
const redIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const yellowIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });

function LogisticsRouting({ bins, onRouteCalculated }) {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    // Only route trucks through high-priority markers (Overflow or Hazardous)
    const priorityBins = bins.filter(b => 
      b.status.toLowerCase().includes('overflow') || 
      b.status.toLowerCase().includes('hazardous')
    );
    
    if (priorityBins.length < 2) {
      onRouteCalculated(null);
      return;
    }

    const waypoints = priorityBins.map(b => L.latLng(b.latitude, b.longitude));
    const routingControl = L.Routing.control({
      waypoints,
      lineOptions: { styles: [{ color: '#ef4444', weight: 5, opacity: 0.9, dashArray: '10, 10' }] },
      show: false, addWaypoints: false, routeWhileDragging: false, fitSelectedRoutes: true,
      createMarker: () => null 
    }).addTo(map);

    routingControl.on('routesfound', function(e) {
      const route = e.routes[0];
      
      const steps = route.instructions.map(instruction => ({
        text: instruction.text,
        distance: instruction.distance < 1000 
          ? `${Math.round(instruction.distance)} m` 
          : `${(instruction.distance / 1000).toFixed(1)} km`
      }));

      onRouteCalculated({ 
        distance: (route.summary.totalDistance / 1000).toFixed(1),
        time: Math.round(route.summary.totalTime / 60),
        steps: steps 
      });
    });

    return () => map.removeControl(routingControl);
  }, [map, bins, onRouteCalculated]);

  return null;
}

export default function WasteMap({ bins, onBinDeleted, onRouteCalculated }) {
  const defaultCenter = [28.6139, 77.209];

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/bins/${id}`, { method: 'DELETE' });
      if (response.ok) onBinDeleted(); 
    } catch (error) { console.error(error); }
  };

  // Helper function to assign color/icon based on AI status
  const getMarkerConfig = (status) => {
    const s = status.toLowerCase();
    if (s.includes('overflow') || s.includes('hazardous')) {
      return { icon: redIcon, color: '#ef4444' }; // Red for High Priority
    }
    return { icon: yellowIcon, color: '#eab308' }; // Yellow for Normal/Pending
  };

  return (
    <MapContainer center={defaultCenter} zoom={11} className="map-container">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
      <LogisticsRouting bins={bins} onRouteCalculated={onRouteCalculated} />
      
      {bins.map((bin) => {
        const { icon, color } = getMarkerConfig(bin.status);
        
        return (
          <Marker key={bin.id || bin._id} position={[bin.latitude, bin.longitude]} icon={icon}>
            <Popup>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 8px 0', color: color }}>{bin.status}</h3>
                <p style={{ margin: '0 0 10px 0' }}><strong>Volume:</strong> {bin.volume}</p>
                <button onClick={() => handleDelete(bin.id || bin._id)} className="delete-btn">✓ Mark as Cleaned</button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}