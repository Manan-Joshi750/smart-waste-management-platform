import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet-routing-machine';

window.L = window.L || L;

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

const getTruckIcon = () => {
  return new L.DivIcon({
    html: `<div style="background-color: #3b82f6; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.8); display: flex; align-items: center; justify-content: center; font-size: 16px;">🚚</div>`,
    className: 'custom-truck-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

const DriverTrackingLayer = ({ route, isNavigating, navMode, onStepChange }) => {
  const map = useMap();
  const [driverPos, setDriverPos] = useState(null);

  useEffect(() => {
    if (!isNavigating || !route || !route.coordinates) {
      setDriverPos(null);
      return;
    }

    const coords = route.coordinates;
    const instructions = route.instructions;

    // --- MODE 1: REAL GPS TRACKING ---
    if (navMode === 'real') {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
      }

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const currentLatLng = L.latLng(lat, lng);
          
          setDriverPos([lat, lng]);
          map.panTo([lat, lng], { animate: true, duration: 1 });

          // Find the closest route coordinate to the driver's real GPS
          let closestIndex = 0;
          let minDistance = Infinity;
          
          coords.forEach((coord, index) => {
            const distance = currentLatLng.distanceTo(L.latLng(coord.lat, coord.lng));
            if (distance < minDistance) {
              minDistance = distance;
              closestIndex = index;
            }
          });

          // Match nearest coordinate to the instruction step
          const activeInstIndex = instructions.findIndex((inst, idx) => {
            const nextInst = instructions[idx + 1];
            return nextInst ? (closestIndex >= inst.index && closestIndex < nextInst.index) : (closestIndex >= inst.index);
          });

          if (activeInstIndex !== -1 && onStepChange) {
            onStepChange(activeInstIndex);
          }
        },
        (error) => {
          console.error("GPS Error:", error);
          alert("Could not get real GPS location. Please allow location permissions.");
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    } 
    
    // --- MODE 2: DESKTOP SIMULATOR ---
    else if (navMode === 'simulate') {
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex >= coords.length) {
          clearInterval(interval);
          return;
        }

        const currentCoord = coords[currentIndex];
        setDriverPos([currentCoord.lat, currentCoord.lng]);
        map.panTo([currentCoord.lat, currentCoord.lng], { animate: true, duration: 0.5 });

        const activeInstIndex = instructions.findIndex((inst, idx) => {
          const nextInst = instructions[idx + 1];
          return nextInst ? (currentIndex >= inst.index && currentIndex < nextInst.index) : (currentIndex >= inst.index);
        });

        if (activeInstIndex !== -1 && onStepChange) onStepChange(activeInstIndex);
        currentIndex += 2; 
      }, 300);

      return () => clearInterval(interval);
    }
  }, [isNavigating, navMode, route, map, onStepChange]);

  if (!driverPos) return null;

  return (
    <Marker position={driverPos} icon={getTruckIcon()} zIndexOffset={1000}>
      <Popup>{navMode === 'real' ? "Your Live Location" : "Simulated Location"}</Popup>
    </Marker>
  );
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
      show: false, 
      lineOptions: { styles: [{ color: '#ef4444', weight: 6, opacity: 0.8, dashArray: '10, 10' }] },
      createMarker: () => null
    }).addTo(map);

    routingControl.on('routesfound', (e) => {
      const routes = e.routes;
      if (routes && routes.length > 0 && onRouteCalculated) {
        const route = routes[0];
        onRouteCalculated({
          distance: (route.summary.totalDistance / 1000).toFixed(1),
          time: Math.round(route.summary.totalTime / 60),
          steps: route.instructions, 
          rawRoute: route 
        });
      }
    });

    return () => { try { if (map && routingControl) map.removeControl(routingControl); } catch (err) {} };
  }, [map, bins, onRouteCalculated]);

  return null;
};

const HeatmapLayer = ({ data }) => {
  const map = useMap();

  useEffect(() => {
    let isMounted = true;
    let heatLayer = null;

    const activeData = (data && data.length > 0) ? data : [[28.6304, 77.2177, 1], [28.6304, 77.2177, 1]];
    const formattedData = activeData.map(point => {
      if (Array.isArray(point)) return point;
      return [point.latitude || point.lat, point.longitude || point.lng, point.intensity || 1];
    }).filter(p => p[0] && p[1]);

    const renderHeatmap = () => {
      if (isMounted && window.L.heatLayer && map) {
        heatLayer = window.L.heatLayer(formattedData, { radius: 35, blur: 25, maxZoom: 14, gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' } }).addTo(map);
      }
    };

    if (window.L.heatLayer) { renderHeatmap(); } else {
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
      isMounted = false;
      if (map && heatLayer) map.removeLayer(heatLayer);
      const script = document.getElementById('leaflet-heat-script');
      if (script) script.removeEventListener('load', renderHeatmap);
    };
  }, [map, data]);

  return null;
};

const WasteMapWrapper = (props) => {
    return (
        <MapContainer center={[28.6139, 77.2090]} zoom={12} style={{ height: '100%', width: '100%', borderRadius: '12px' }}>
             <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
             
             {!props.showHeatmap && props.bins.map(bin => (
                <Marker key={bin.id} position={[bin.latitude, bin.longitude]} icon={getMarkerIcon(bin.status)}>
                  <Popup>
                      <div style={{ textAlign: 'center' }}>
                      <strong>Status:</strong> {bin.status}<br/>
                      <strong>Volume:</strong> {bin.volume}<br/>
                      </div>
                  </Popup>
                </Marker>
             ))}

             {!props.showHeatmap && <RoutingMachine bins={props.bins} onRouteCalculated={props.onRouteCalculated} />}
             {props.showHeatmap && <HeatmapLayer data={props.heatmapData} />}
             
             {props.viewMode === 'driver' && props.routeInfo?.rawRoute && (
                 <DriverTrackingLayer 
                    route={props.routeInfo.rawRoute} 
                    isNavigating={props.isNavigating} 
                    navMode={props.navMode}
                    onStepChange={props.onStepChange} 
                 />
             )}
        </MapContainer>
    )
}

export default WasteMapWrapper;