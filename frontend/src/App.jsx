import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import WasteMap from './components/WasteMap';
import WasteForm from './components/WasteForm';

function App() {
  const [bins, setBins] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [viewMode, setViewMode] = useState('command'); // 'command' or 'driver'

  const fetchBins = () => {
    fetch('http://127.0.0.1:8000/api/bins')
      .then(response => response.json())
      .then(data => setBins(data.data || data))
      .catch(error => console.error(error));
  };

  useEffect(() => { 
    fetchBins(); 
    const ws = new WebSocket('ws://127.0.0.1:8000/ws');
    
    ws.onmessage = (event) => {
      if (event.data === 'update_bins') {
        fetchBins();
      }
    };

    return () => ws.close();
  }, []);

  const overflowCount = bins.filter(b => b.status.toLowerCase().includes('overflow')).length;
  const chartData = [
    { name: 'Normal / Safe', value: bins.length - overflowCount, color: '#10b981' }, 
    { name: 'Critical Overflow', value: overflowCount, color: '#ef4444' }
  ];

  return (
    <div className="app-container">
      <header className="app-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>♻️ Smart Waste {viewMode === 'command' ? 'Command Center' : 'Driver Navigation'}</h1>
          <p>{viewMode === 'command' ? 'Live Logistics & Municipal Tracking Dashboard' : 'Mobile-Optimized Route View'}</p>
        </div>
        <button 
          onClick={() => setViewMode(viewMode === 'command' ? 'driver' : 'command')}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: viewMode === 'command' ? '#3b82f6' : '#475569', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: 'pointer', 
            fontWeight: 'bold',
            fontSize: '1rem',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }}
        >
          Switch to {viewMode === 'command' ? 'Driver View 🚚' : 'Command Center 💻'}
        </button>
      </header>

      {viewMode === 'command' ? (
        /* --- COMMAND CENTER VIEW (DESKTOP) --- */
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

                <div className="card" style={{ padding: '16px', maxHeight: '300px', overflowY: 'auto' }}>
                  <h4 style={{ marginTop: 0, marginBottom: '12px', color: '#1e293b' }}>Navigation Steps</h4>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {routeInfo.steps && routeInfo.steps.map((step, index) => (
                      <li key={index} style={{ padding: '10px 0', borderBottom: index !== routeInfo.steps.length - 1 ? '1px solid #e2e8f0' : 'none', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#475569' }}>
                        <span>{step.text}</span>
                        <span style={{ fontWeight: '600', color: '#3b82f6', marginLeft: '12px', whiteSpace: 'nowrap' }}>{step.distance}</span>
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
      ) : (
        /* --- DRIVER VIEW (MOBILE OPTIMIZED) --- */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
          
          {routeInfo ? (
            <div style={{ backgroundColor: '#1e293b', color: 'white', padding: '20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.875rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Active Mission</span>
                <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#38bdf8' }}>{routeInfo.distance} km</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ display: 'block', fontSize: '0.875rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Est. Time</span>
                <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#34d399' }}>{routeInfo.time} min</span>
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '20px', borderRadius: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
              🎉 All critical zones cleared. No active routes.
            </div>
          )}

          <div className="card map-section" style={{ height: '50vh', minHeight: '400px', padding: 0, borderRadius: '12px', overflow: 'hidden' }}>
            <WasteMap bins={bins} onBinDeleted={fetchBins} onRouteCalculated={setRouteInfo} />
          </div>

          {routeInfo && (
            <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.5rem', color: '#1e293b' }}>Turn-by-Turn Directions</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {routeInfo.steps && routeInfo.steps.map((step, index) => (
                  <li key={index} style={{ padding: '16px 0', borderBottom: index !== routeInfo.steps.length - 1 ? '1px solid #e2e8f0' : 'none', display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', color: '#334155' }}>
                    <span>{step.text}</span>
                    <span style={{ fontWeight: 'bold', color: '#3b82f6', marginLeft: '16px', whiteSpace: 'nowrap' }}>{step.distance}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;