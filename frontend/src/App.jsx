import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import WasteMap from './components/WasteMap';
import WasteForm from './components/WasteForm';

function App() {
  const [bins, setBins] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [viewMode, setViewMode] = useState('command'); 
  const [analytics, setAnalytics] = useState({ average_resolution_time: 0, total_cleaned: 0, heatmap_data: [], last_cleared: null });
  
  const [isNavigating, setIsNavigating] = useState(false);
  const [navMode, setNavMode] = useState('simulate'); 
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const stepListRef = useRef(null);

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
    ws.onmessage = (event) => { if (event.data === 'update_bins') fetchData(); };
    return () => ws.close();
  }, []);

  useEffect(() => {
    if (stepListRef.current && activeStepIndex > 0) {
      const activeElement = stepListRef.current.children[activeStepIndex];
      if (activeElement) activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeStepIndex]);

  const overflowCount = bins.filter(b => b.status.toLowerCase().includes('overflow')).length;
  const chartData = [
    { name: 'Normal / Safe', value: bins.length - overflowCount, color: '#10b981' }, 
    { name: 'Critical Overflow', value: overflowCount, color: '#ef4444' }
  ];

  const handleStartNav = (mode) => {
    setNavMode(mode);
    setIsNavigating(true);
  };

  return (
    <div className="app-container">
      <header className="app-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>♻️ Smart Waste {viewMode === 'command' ? 'Command Center' : viewMode === 'driver' ? 'Driver Navigation' : 'Historical Analytics'}</h1>
          <p>{viewMode === 'command' ? 'Live Logistics & Municipal Tracking Dashboard' : viewMode === 'driver' ? 'Mobile-Optimized Route View' : 'Predictive Heatmaps & Performance Metrics'}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setViewMode('command')} style={{ padding: '8px 16px', backgroundColor: viewMode === 'command' ? '#3b82f6' : '#475569', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Command Center 💻</button>
          <button onClick={() => setViewMode('driver')} style={{ padding: '8px 16px', backgroundColor: viewMode === 'driver' ? '#3b82f6' : '#475569', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Driver View 🚚</button>
          <button onClick={() => setViewMode('analytics')} style={{ padding: '8px 16px', backgroundColor: viewMode === 'analytics' ? '#8b5cf6' : '#475569', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Analytics 📊</button>
        </div>
      </header>

      {viewMode === 'analytics' ? (
         <div className="dashboard-grid">
           <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
             <div className="card" style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                <h3 style={{ color: '#475569', marginTop: 0, marginBottom: '10px', fontSize: '1rem', textTransform: 'uppercase' }}>Avg Resolution Time</h3>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#8b5cf6' }}>{analytics.average_resolution_time} <span style={{ fontSize: '1.2rem', color: '#64748b' }}>min</span></div>
             </div>
             <div className="card" style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                <h3 style={{ color: '#475569', marginTop: 0, marginBottom: '10px', fontSize: '1rem', textTransform: 'uppercase' }}>Total Overflows Cleared</h3>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#10b981' }}>{analytics.total_cleaned}</div>
             </div>
             
             {/* ---> HERE IS YOUR TIMESTAMP CARD <--- */}
             <div className="card" style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                <h3 style={{ color: '#475569', marginTop: 0, marginBottom: '10px', fontSize: '1rem', textTransform: 'uppercase' }}>Latest Clearance</h3>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#f59e0b' }}>
                  {analytics.last_cleared 
                    ? new Date(analytics.last_cleared).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
                    : 'No data yet'}
                </div>
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
                {routeInfo.steps && routeInfo.steps.length > 0 && (
                  <div className="card route-steps-container" style={{ padding: '15px', maxHeight: '250px', overflowY: 'auto' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '10px', color: '#1e293b', fontSize: '0.9rem' }}>Route Details</h4>
                    <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                      {routeInfo.steps.map((step, index) => {
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
        <div className="dashboard-grid">
          <div className="card map-section" style={{ flex: 2, height: '75vh', minHeight: '500px', padding: 0, borderRadius: '12px', overflow: 'hidden' }}>
            <WasteMap 
               bins={bins} 
               onBinDeleted={fetchData} 
               onRouteCalculated={setRouteInfo} 
               viewMode={viewMode}
               isNavigating={isNavigating}
               navMode={navMode}
               routeInfo={routeInfo}
               onStepChange={setActiveStepIndex}
            />
          </div>

          <div className="sidebar" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* ---> DRIVER BUTTONS ARE ONLY SHOWN IF routeInfo EXISTS <--- */}
            {routeInfo ? (
              <>
                <div style={{ backgroundColor: '#1e293b', color: 'white', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.875rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Active Mission</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#38bdf8' }}>{routeInfo.distance} km</span>
                    </div>
                    {isNavigating && (
                      <button onClick={() => setIsNavigating(false)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Stop</button>
                    )}
                  </div>
                  
                  {!isNavigating && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => handleStartNav('simulate')} style={{ flex: 1, backgroundColor: '#475569', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Test Simulate</button>
                      <button onClick={() => handleStartNav('real')} style={{ flex: 1, backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Real GPS Tracking</button>
                    </div>
                  )}
                </div>

                <div className="card route-steps-container" style={{ padding: '0', flexGrow: 1, overflowY: 'auto', maxHeight: 'calc(75vh - 150px)' }}>
                    <ul ref={stepListRef} style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                      {routeInfo.steps.map((step, index) => {
                        if (!step.text) return null;
                        const isGlowing = index === activeStepIndex && isNavigating;
                        return (
                          <li key={index} style={{ padding: '15px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', backgroundColor: isGlowing ? '#eff6ff' : 'transparent', borderLeft: isGlowing ? '5px solid #3b82f6' : '5px solid transparent', transition: 'all 0.3s ease', fontWeight: isGlowing ? 'bold' : 'normal', color: isGlowing ? '#1e3a8a' : '#475569' }}>
                            <span style={{ paddingRight: '15px' }}>{step.text}</span>
                            <span style={{ color: isGlowing ? '#2563eb' : '#94a3b8', whiteSpace: 'nowrap' }}>{step.distance > 1000 ? `${(step.distance / 1000).toFixed(1)} km` : `${Math.round(step.distance)} m`}</span>
                          </li>
                        );
                      })}
                    </ul>
                </div>
              </>
            ) : (
              <div style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '20px', borderRadius: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>🎉 All critical zones cleared.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;