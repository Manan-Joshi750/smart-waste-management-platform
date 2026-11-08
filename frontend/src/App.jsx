import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import WasteMap from './components/WasteMap';
import WasteForm from './components/WasteForm';

function App() {
  const [bins, setBins] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [viewMode, setViewMode] = useState('command'); // 'command', 'driver', 'analytics'
  const [analytics, setAnalytics] = useState({ average_resolution_time: 0, total_cleaned: 0, heatmap_data: [] });

  const fetchData = () => {
    fetch('http://127.0.0.1:8000/api/bins')
      .then(response => response.json())
      .then(data => setBins(data.data || data))
      .catch(error => console.error(error));
      
    fetch('http://127.0.0.1:8000/api/analytics')
      .then(response => response.json())
      .then(data => setAnalytics(data))
      .catch(error => console.error(error));
  };

  useEffect(() => { 
    fetchData(); 
    const ws = new WebSocket('ws://127.0.0.1:8000/ws');
    
    ws.onmessage = (event) => {
      if (event.data === 'update_bins') {
        fetchData();
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
          <h1>♻️ Smart Waste {viewMode === 'command' ? 'Command Center' : viewMode === 'driver' ? 'Driver Navigation' : 'Historical Analytics'}</h1>
          <p>{viewMode === 'command' ? 'Live Logistics & Municipal Tracking Dashboard' : viewMode === 'driver' ? 'Mobile-Optimized Route View' : 'Predictive Heatmaps & Performance Metrics'}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setViewMode('command')}
            style={{ padding: '8px 16px', backgroundColor: viewMode === 'command' ? '#3b82f6' : '#475569', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Command Center 💻
          </button>
          <button 
            onClick={() => setViewMode('driver')}
            style={{ padding: '8px 16px', backgroundColor: viewMode === 'driver' ? '#3b82f6' : '#475569', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Driver View 🚚
          </button>
          <button 
            onClick={() => setViewMode('analytics')}
            style={{ padding: '8px 16px', backgroundColor: viewMode === 'analytics' ? '#8b5cf6' : '#475569', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Analytics 📊
          </button>
        </div>
      </header>

      {viewMode === 'analytics' ? (
         <div className="dashboard-grid">
           <div className="sidebar">
             <div className="card" style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                <h3 style={{ color: '#475569', marginTop: 0, marginBottom: '10px', fontSize: '1rem', textTransform: 'uppercase' }}>Avg Resolution Time</h3>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#8b5cf6' }}>
                  {analytics.average_resolution_time} <span style={{ fontSize: '1.2rem', color: '#64748b' }}>min</span>
                </div>
             </div>
             <div className="card" style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                <h3 style={{ color: '#475569', marginTop: 0, marginBottom: '10px', fontSize: '1rem', textTransform: 'uppercase' }}>Total Overflows Cleared</h3>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#10b981' }}>{analytics.total_cleaned}</div>
             </div>
             <div className="card" style={{ padding: '20px' }}>
                <h3 style={{ marginTop: 0, color: '#1e293b' }}>Predictive Insights</h3>
                <p style={{ color: '#475569', lineHeight: '1.6' }}>The map's thermal layer highlights historical overflow frequency. Red zones indicate chronic waste buildup, mapping exactly where the municipality should permanently allocate more bins.</p>
             </div>
           </div>
           <div className="card map-section">
              <WasteMap bins={[]} heatmapData={analytics.heatmap_data} showHeatmap={true} />
           </div>
         </div>
      ) : viewMode === 'command' ? (
        <div className="dashboard-grid">
          <div className="sidebar">
            <div className="card"><WasteForm onBinAdded={fetchData} /></div>
            
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
                
                {/* FIXED: Turn-by-turn route instructions mapping */}
                {routeInfo.steps && routeInfo.steps.length > 0 && (
                  <div className="card route-steps-container" style={{ padding: '15px', maxHeight: '250px', overflowY: 'auto' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '10px', color: '#1e293b', fontSize: '0.9rem' }}>Route Details</h4>
                    <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                      {routeInfo.steps.map((step, index) => {
                        // Skip empty text entries
                        if (!step.text) return null;
                        return (
                          <li key={index} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span style={{ color: '#475569', paddingRight: '15px' }}>{step.text}</span>
                            <span style={{ fontWeight: 'bold', color: '#3b82f6', whiteSpace: 'nowrap' }}>
                              {step.distance > 1000 ? `${(step.distance / 1000).toFixed(1)} km` : `${Math.round(step.distance)} m`}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card map-section">
            <WasteMap bins={bins} onBinDeleted={fetchData} onRouteCalculated={setRouteInfo} />
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
          {routeInfo ? (
            <div style={{ backgroundColor: '#1e293b', color: 'white', padding: '20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.875rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Active Mission</span>
                <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#38bdf8' }}>{routeInfo.distance} km</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ display: 'block', fontSize: '0.875rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Est. Time</span>
                <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#34d399' }}>{routeInfo.time} min</span>
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '20px', borderRadius: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
              🎉 All critical zones cleared.
            </div>
          )}

          <div className="card map-section" style={{ height: '50vh', minHeight: '400px', padding: 0, borderRadius: '12px', overflow: 'hidden' }}>
            <WasteMap bins={bins} onBinDeleted={fetchData} onRouteCalculated={setRouteInfo} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;