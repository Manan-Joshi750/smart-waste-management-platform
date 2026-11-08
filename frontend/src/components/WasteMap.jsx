import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet-routing-machine';

// Ensure Leaflet is globally available
window.L = window.L || L;

// Fix default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const getMarkerIcon = (status) => {
  const color = status?.toLowerCase().includes('overflow') ? 'red' : 'green';
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const RoutingMachine = ({ bins, onRouteCalculated }) => {
  const map = useMap();

  useEffect(() => {
    const overflowBins = bins.filter(b => b.status?.toLowerCase().includes('overflow'));
    
    if (overflowBins.length < 2) {
      if (onRouteCalculated) onRouteCalculated(null);
      return;
    }

    const waypoints = overflowBins.map(b => L.latLng(b.latitude, b.longitude));

    const routingControl = L.Routing.control({
      waypoints,
      routeWhileDragging: false,
      addWaypoints: false,
      show: false, // Hides the ugly map overlay box so your sidebar handles the UI
      lineOptions: {
        styles: [{ color: '#ef4444', weight: 6, opacity: 0.8, dashArray: '10, 10' }]
      },
      createMarker: () => null
    }).addTo(map);

    routingControl.on('routesfound', (e) => {
      const routes = e.routes;
      if (routes && routes.length > 0 && onRouteCalculated) {
        const route = routes[0];
        // Passing the raw 'route.instructions' fixes your sidebar UI crashing/hiding
        onRouteCalculated({
          distance: (route.summary.totalDistance / 1000).toFixed(1),
          time: Math.round(route.summary.totalTime / 60),
          steps: route.instructions, 
          rawRoute: route 
        });
      }
    });

    return () => {
      try {
        if (map && routingControl) {
          map.removeControl(routingControl);
        }
      } catch (err) {
        // Safe unmount
      }
    };
  }, [map, bins, onRouteCalculated]);

  return null;
};

const HeatmapLayer = ({ data }) => {
  const map = useMap();

  useEffect(() => {
    let isMounted = true;
    let heatLayer = null;

    const activeData = (data && data.length > 0) ? data : [
      [28.6304, 77.2177, 1], // Connaught Place fallback
      [28.6304, 77.2177, 1],
      [28.6304, 77.2177, 1]
    ];

    const formattedData = activeData.map(point => {
      if (Array.isArray(point)) return point;
      return [
        point.latitude || point.lat, 
        point.longitude || point.lng, 
        point.intensity || 1
      ];
    }).filter(p => p[0] && p[1]);

    const renderHeatmap = () => {
      // isMounted check PREVENTS the zombie layer from drawing on the wrong tab
      if (isMounted && window.L.heatLayer && map) {
        heatLayer = window.L.heatLayer(formattedData, {
          radius: 35,
          blur: 25,
          maxZoom: 14,
          gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' }
        }).addTo(map);
      }
    };

    if (window.L.heatLayer) {
      renderHeatmap();
    } else {
      const scriptId = 'leaflet-heat-script';
      let script = document.getElementById(scriptId);
      
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
        script.async = true;
        document.body.appendChild(script);
      }
      
      script.addEventListener('load', renderHeatmap);
    }

    return () => {
      isMounted = false; // Strictly mark component as dead so async script abandons draw
      if (map && heatLayer) {
        map.removeLayer(heatLayer);
      }
      const script = document.getElementById('leaflet-heat-script');
      if (script) {
        script.removeEventListener('load', renderHeatmap);
      }
    };
  }, [map, data]);

  return null;
};

function WasteMap({ bins = [], onBinDeleted, onRouteCalculated, heatmapData = [], showHeatmap = false }) {
  const center = [28.6139, 77.2090]; 

  const handleDelete = (id) => {
    fetch(`http://127.0.0.1:8000/api/bins/${id}`, { method: 'DELETE' })
      .then(response => {
        if (response.ok && onBinDeleted) {
          onBinDeleted();
        }
      })
      .catch(error => console.error(error));
  };

  return (
    <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%', borderRadius: '12px' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      
      {!showHeatmap && bins.map(bin => (
        <Marker key={bin.id} position={[bin.latitude, bin.longitude]} icon={getMarkerIcon(bin.status)}>
          <Popup>
            <div style={{ textAlign: 'center' }}>
              <strong>Status:</strong> {bin.status}<br/>
              <strong>Volume:</strong> {bin.volume}<br/>
              <button onClick={() => handleDelete(bin.id)} style={{ marginTop: '10px', backgroundColor: '#10b981', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>
                Mark as Cleaned
              </button>
            </div>
          </Popup>
        </Marker>
      ))}

      {!showHeatmap && <RoutingMachine bins={bins} onRouteCalculated={onRouteCalculated} />}
      {showHeatmap && <HeatmapLayer data={heatmapData} />}
    </MapContainer>
  );
}

export default WasteMap;