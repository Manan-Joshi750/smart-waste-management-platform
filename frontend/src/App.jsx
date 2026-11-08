import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import WasteMap from './components/WasteMap';
import WasteForm from './components/WasteForm';

function App() {
  const [bins, setBins] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);

  const fetchBins = () => {
    fetch('http://127.0.0.1:8000/api/bins')
      .then(response => response.json())
      .then(data => setBins(data.data || data))
      .catch(error => console.error(error));
  };

  useEffect(() => { 
    // 1. Initial fetch on load
    fetchBins(); 

    // 2. Connect to the WebSocket
    const ws = new WebSocket('ws://127.0.0.1:8000/ws');
    
    ws.onmessage = (event) => {
      // 3. Listen for the backend broadcast. If it says update, instantly re-fetch
      if (event.data === 'update_bins') {
        fetchBins();
      }
    };

    // Cleanup on unmount
    return () => {
      ws.close();
    };
  }, []);

  const overflowCount = bins.filter(b => b.status.toLowerCase().includes('overflow')).length;
  const chartData = [
    { name: 'Normal / Safe', value: bins.length - overflowCount, color: '#10b981' }, 
    { name: 'Critical Overflow', value: overflowCount, color: '#ef4444' }
  ];

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>♻️ Smart Waste Command Center</h1>
        <p>Live Logistics & Municipal Tracking Dashboard</p>
      </header>

      <div className="dashboard-grid">
        <div className="sidebar">
          <div className="card"><WasteForm onBinAdded={fetchBins} /></div>
          
          <div className="card">
            <h3 style={{ marginTop: 0, color: '#1e293b' }}>System Analytics</h3>
            <div style={{ marginTop: '20px' }}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} dataKey="value" paddingAngle={5}>
                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Routing Stats & Turn-by-Turn Directions */}
          {routeInfo && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="route-summary">
                <div className="route-stat">
                  <span className="route-label">Active Route</span>
                  <span className="route-value">{routeInfo.distance} km</span>
                </div>
                <div className="route-stat" style={{ textAlign: 'right' }}>
                  <span className="route-label">Est. Time</span>
                  <span className="route-value">{routeInfo.time} min</span>
                </div>
              </div>

              {/* Turn-by-Turn Directions Box */}
              <div className="card" style={{ padding: '16px', maxHeight: '300px', overflowY: 'auto' }}>
                <h4 style={{ marginTop: 0, marginBottom: '12px', color: '#1e293b' }}>Navigation Steps</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {routeInfo.steps && routeInfo.steps.map((step, index) => (
                    <li key={index} style={{ 
                      padding: '10px 0', 
                      borderBottom: index !== routeInfo.steps.length - 1 ? '1px solid #e2e8f0' : 'none',
                      display: 'flex', 
                      justifyContent: 'space-between',
                      fontSize: '0.9rem',
                      color: '#475569'
                    }}>
                      <span>{step.text}</span>
                      <span style={{ fontWeight: '600', color: '#3b82f6', marginLeft: '12px', whiteSpace: 'nowrap' }}>
                        {step.distance}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          )}
        </div>

        <div className="card map-section">
          <WasteMap bins={bins} onBinDeleted={fetchBins} onRouteCalculated={setRouteInfo} />
        </div>
      </div>
    </div>
  );
}

export default App;