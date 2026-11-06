import { useState } from 'react';

function WasteForm({ onBinAdded }) {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    setIsUploading(true); // Start the loading spinner

    const formData = new FormData();
    formData.append("latitude", latitude);
    formData.append("longitude", longitude);
    formData.append("file", file);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/bins", {
        method: "POST",
        body: formData,
      });
      
      if (response.ok) {
        // Clear form and refresh map data in App.jsx
        setFile(null);
        setLatitude('');
        setLongitude('');
        // Reset the file input visually
        document.getElementById('file-upload').value = '';
        onBinAdded(); 
      }
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setIsUploading(false); // Stop the spinner
    }
  };

  return (
    <div>
      <h3 style={{ marginTop: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
        📷 Report Waste via Image
      </h3>
      
      <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="number"
            step="any"
            placeholder="Latitude"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            required
            style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
          <input
            type="number"
            step="any"
            placeholder="Longitude"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            required
            style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <input
          id="file-upload"
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
          required
          style={{ padding: '8px', border: '1px dashed #cbd5e1', borderRadius: '4px', background: '#f8fafc' }}
        />

        <button 
          type="submit" 
          disabled={isUploading || !file || !latitude || !longitude}
          style={{
            backgroundColor: isUploading ? '#94a3b8' : '#10b981',
            color: 'white',
            fontWeight: 'bold',
            padding: '10px 16px',
            borderRadius: '4px',
            border: 'none',
            cursor: (isUploading || !file || !latitude || !longitude) ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {isUploading ? (
            <>
              <svg className="animate-spin" style={{ height: '20px', width: '20px', animation: 'spin 1s linear infinite' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              AI Analyzing...
            </>
          ) : (
            "Upload & Analyze"
          )}
        </button>
      </form>

      {/* Add standard CSS keyframes for the spinner inline to ensure it works without Tailwind */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default WasteForm;