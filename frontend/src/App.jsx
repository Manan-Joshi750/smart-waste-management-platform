import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import WasteMap from './components/WasteMap';
import WasteForm from './components/WasteForm';

function App() {
  // --- AUTHENTICATION STATE ---
  const [userRole, setUserRole] = useState(null); // 'admin', 'driver', 'citizen', or null
  const [loginStep, setLoginStep] = useState('select'); // 'select' or 'pin'
  const [attemptedRole, setAttemptedRole] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // --- APP STATE ---
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
    if (userRole) {
      fetchData(); 
      const ws = new WebSocket('ws://127.0.0.1:8000/ws');
      ws.onmessage = (event) => { if (event.data === 'update_bins') fetchData(); };
      return () => ws.close();
    }
  }, [userRole]);

  useEffect(() => {
    if (stepListRef.current && activeStepIndex > 0) {
      const activeElement = stepListRef.current.children[activeStepIndex];
      if (activeElement) activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeStepIndex]);

  const handleLogin = (role) => {
    if (role === 'citizen') {
      setUserRole('citizen');
      setViewMode('citizen');
    } else {
      setAttemptedRole(role);
      setLoginStep('pin');
      setLoginError('');
      setPinInput('');
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (attemptedRole === 'admin' && pinInput === '9999') {
      setUserRole('admin');
      setViewMode('command');
    } else if (attemptedRole === 'driver' && pinInput === '1234') {
      setUserRole('driver');
      setViewMode('driver');
    } else {
      setLoginError('Invalid PIN entered. Please try again.');
    }
  };

  const handleLogout = () => {
    setUserRole(null);
    setLoginStep('select');
  };

  const handleStartNav = (mode) => {
    setNavMode(mode);
    setIsNavigating(true);
  };

  // Prevent citizens from deleting bins
  const handleCitizenDeleteAttempt = () => {
    alert("🔒 Access Denied: Only authenticated Municipal Admins or Drivers can mark bins as resolved.");
  };

  const overflowCount = bins.filter(b => b.status.toLowerCase().includes('overflow')).length;
  const chartData = [
    { name: 'Normal / Safe', value: bins.length - overflowCount, color: '#10b981' }, 
    { name: 'Critical Overflow', value: overflowCount, color: '#ef4444' }
  ];

  // ==========================================
  // LOGIN SCREEN (Gateway)
  // ==========================================
  if (!userRole) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: '2.5rem', color: '#1e293b', marginBottom: '2rem' }}>♻️ Smart Waste Portal</h1>
        
        {loginStep === 'select' ? (
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div onClick={() => handleLogin('admin')} style={{ cursor: 'pointer', backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', textAlign: 'center', width: '200px', borderTop: '6px solid #8b5cf6', transition: 'transform 0.2s' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>👨‍💼</div>
              <h3 style={{ margin: 0, color: '#334155' }}>Admin</h3>
            </div>
            <div onClick={() => handleLogin('driver')} style={{ cursor: 'pointer', backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', textAlign: 'center', width: '200px', borderTop: '6px solid #3b82f6', transition: 'transform 0.2s' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🚛</div>
              <h3 style={{ margin: 0, color: '#334155' }}>Driver</h3>
            </div>
            <div onClick={() => handleLogin('citizen')} style={{ cursor: 'pointer', backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', textAlign: 'center', width: '200px', borderTop: '6px solid #10b981', transition: 'transform 0.2s' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🌍</div>
              <h3 style={{ margin: 0, color: '#334155' }}>Public</h3>
            </div>
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', textAlign: 'center', width: '300px' }}>
            <h2 style={{ marginTop: 0, color: '#334155' }}>Enter {attemptedRole === 'admin' ? 'Admin' : 'Driver'} PIN</h2>
            <form onSubmit={handlePinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="****" autoFocus style={{ padding: '12px', fontSize: '1.5rem', textAlign: 'center', borderRadius: '8px', border: '1px solid #cbd5e1', letterSpacing: '8px' }} />
              {loginError && <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>{loginError}</span>}
              <button type="submit" style={{ padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>Login</button>
            </form>
            <button onClick={() => setLoginStep('select')} style={{ marginTop: '15px', padding: '8px', backgroundColor: 'transparent', color: '#64748b', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Cancel</button>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // MAIN DASHBOARD UI
  // ==========================================
  return (
    <div className="app-container">
      <header className="app-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>♻️ Smart Waste {viewMode === 'command' ? 'Command Center' : viewMode === 'driver' ? 'Driver Navigation' : viewMode === 'citizen' ? 'Public Portal' : 'Historical Analytics'}</h1>
          <p>{viewMode === 'command' ? 'Live Logistics & Municipal Tracking Dashboard' : viewMode === 'driver' ? 'Mobile-Optimized Route View' : viewMode === 'citizen' ? 'Report overflowing bins directly to the municipality' : 'Predictive Heatmaps & Performance Metrics'}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Admin Navigation */}
          {userRole === 'admin' && (
            <>
              <button onClick={() => setViewMode('command')} style={{ padding: '8px 16px', backgroundColor: viewMode === 'command' ? '#3b82f6' : '#475569', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Command Center</button>
              <button onClick={() => setViewMode('analytics')} style={{ padding: '8px 16px', backgroundColor: viewMode === 'analytics' ? '#8b5cf6' : '#475569', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Analytics</button>
            </>
          )}

          {/* Logout Button (Visible to all) */}
          <button onClick={handleLogout} style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginLeft: '10px' }}>Logout ({userRole})</button>
        </div>
      </header>

      {/* ---------------- ANALYTICS VIEW ---------------- */}
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
             <div className="card" style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                <h3 style={{ color: '#475569', marginTop: 0, marginBottom: '10px', fontSize: '1rem', textTransform: 'uppercase' }}>Latest Clearance</h3>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#f59e0b' }}>
                  {analytics.last_cleared ? new Date(analytics.last_cleared).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No data yet'}
                </div>
             </div>
           </div>
           <div className="card map-section">
              <WasteMap bins={[]} heatmapData={analytics.heatmap_data} showHeatmap={true} />
           </div>
         </div>
      
      // ---------------- COMMAND CENTER (ADMIN) ----------------
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
                            <span style={{ fontWeight: 'bold', color: '#3b82f6', whiteSpace: 'nowrap' }}>{step.distance > 1000 ? `${(step.distance / 1000).toFixed(1)} km` : `${Math.round(step.distance)} m`}</span>
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

      // ---------------- PUBLIC PORTAL (CITIZEN) ----------------
      ) : viewMode === 'citizen' ? (
        <div className="dashboard-grid">
          <div className="sidebar">
            <div className="card" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <h3 style={{ marginTop: 0, color: '#1e3a8a' }}>Help Keep The City Clean</h3>
              <p style={{ color: '#475569', fontSize: '0.95rem' }}>Upload an image of an overflowing public waste bin. Our AI will verify it, and municipal drivers will be dispatched.</p>
            </div>
            <div className="card"><WasteForm onBinAdded={fetchData} /></div>
          </div>
          <div className="card map-section">
            {/* Citizens pass a dummy function so they get rejected if they try to delete a marker */}
            <WasteMap bins={bins} onBinDeleted={handleCitizenDeleteAttempt} />
          </div>
        </div>

      // ---------------- DRIVER VIEW ----------------
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