import { useState } from 'react';

export default function WasteForm({ onBinAdded }) {
  const [formData, setFormData] = useState({ latitude: '', longitude: '' });
  const [imageFile, setImageFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // We must use FormData instead of JSON to send files
    const payload = new FormData();
    payload.append("latitude", formData.latitude);
    payload.append("longitude", formData.longitude);
    if (imageFile) {
        payload.append("file", imageFile);
    }

    try {
      // Notice: We remove the 'Content-Type' header; fetch sets it automatically for FormData
      const response = await fetch('http://127.0.0.1:8000/api/bins', {
        method: 'POST',
        body: payload
      });
      
      if (response.ok) {
        setFormData({ latitude: '', longitude: '' });
        setImageFile(null);
        onBinAdded(); 
      }
    } catch (error) { console.error(error); }
  };

  return (
    <form onSubmit={handleSubmit} className="premium-form">
      <h3 style={{ marginTop: 0, marginBottom: '8px', color: '#1e293b', fontSize: '1.25rem' }}>📸 Report Waste via Image</h3>
      
      <div className="input-group">
        <input type="number" step="any" required placeholder="Latitude" className="premium-input"
          value={formData.latitude} onChange={(e) => setFormData({...formData, latitude: e.target.value})} />
        <input type="number" step="any" required placeholder="Longitude" className="premium-input"
          value={formData.longitude} onChange={(e) => setFormData({...formData, longitude: e.target.value})} />
      </div>

      <div className="input-group">
        <input type="file" accept="image/*" required className="premium-input"
          onChange={(e) => setImageFile(e.target.files[0])} />
      </div>

      <button type="submit" className="premium-button">Upload & Analyze</button>
    </form>
  );
}