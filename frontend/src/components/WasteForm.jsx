import { useState } from 'react';

export default function WasteForm({ onBinAdded }) {
  const [formData, setFormData] = useState({ latitude: '', longitude: '', status: 'Normal', volume: '20%' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData, latitude: parseFloat(formData.latitude), longitude: parseFloat(formData.longitude) };
    try {
      const response = await fetch('http://127.0.0.1:8000/api/bins', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (response.ok) {
        setFormData({ latitude: '', longitude: '', status: 'Normal', volume: '20%' });
        onBinAdded(); 
      }
    } catch (error) { console.error(error); }
  };

  return (
    <form onSubmit={handleSubmit} className="premium-form">
      <h3 style={{ marginTop: 0, marginBottom: '8px', color: '#1e293b', fontSize: '1.25rem' }}>📍 Deploy New Sensor</h3>
      
      <div className="input-group">
        <input type="number" step="any" required placeholder="Latitude" className="premium-input"
          value={formData.latitude} onChange={(e) => setFormData({...formData, latitude: e.target.value})} />
        <input type="number" step="any" required placeholder="Longitude" className="premium-input"
          value={formData.longitude} onChange={(e) => setFormData({...formData, longitude: e.target.value})} />
      </div>

      <div className="input-group">
        <select className="premium-input" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
          <option value="Normal">Normal</option>
          <option value="Plastic Overflow">Plastic Overflow</option>
          <option value="Organic Overflow">Organic Overflow</option>
          <option value="Hazardous">Hazardous</option>
        </select>
        <input type="text" required placeholder="Volume (e.g. 100%)" className="premium-input"
          value={formData.volume} onChange={(e) => setFormData({...formData, volume: e.target.value})} />
      </div>

      <button type="submit" className="premium-button">Deploy to Map</button>
    </form>
  );
}