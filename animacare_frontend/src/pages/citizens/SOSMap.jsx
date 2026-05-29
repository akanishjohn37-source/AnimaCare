import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, AlertCircle, Phone, Camera, Send, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './SOSMap.css';
import { useAuth } from '../../context/AuthContext';

const customMarkerIcon = new L.DivIcon({
  className: 'custom-leaflet-marker',
  html: `<div style="color: #ef4444; display: flex; justify-content: center; align-items: center; width: 36px; height: 36px; position: relative;">
           <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="rgba(239, 68, 68, 0.2)" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
         </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36]
});

const MapEvents = ({ location, setLocation }) => {
  const map = useMapEvents({
    click(e) {
      setLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });

  useEffect(() => {
    map.flyTo([location.lat, location.lng], map.getZoom(), { animate: true, duration: 1.5 });
  }, [location, map]);

  return null;
};

const SOSMap = () => {
  const { user, authFetch } = useAuth();
  const [reportState, setReportState] = useState('idle'); // idle, reporting, submitting, submitted
  const [description, setDescription] = useState('');
  const [animalType, setAnimalType] = useState('Dog');
  const [alertType, setAlertType] = useState('rescue');
  const [photo, setPhoto] = useState(null);
  const [location, setLocation] = useState({ lat: 10.8505, lng: 76.2711 });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setReportState('submitting');
    
    try {
      const res = await authFetch('http://localhost:8000/api/citizens/sos/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporter: user.id,
          animal_description: alertType === 'rescue' ? `${animalType}: ${description}` : description,
          lat: location.lat,
          lng: location.lng,
          alert_type: alertType
        })
      });
      
      if (res.ok) {
        setReportState('submitted');
      } else {
        alert("Failed to send SOS. Please try again.");
        setReportState('idle');
      }
    } catch (err) {
      console.error(err);
      alert("Network error. Check connection.");
      setReportState('idle');
    }
  };

  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  const handleLocateMe = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error obtaining location", error);
          alert("Unable to retrieve your location.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert("Geolocation is not supported by your browser");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="sos-container">
      <div className="sos-header">
        <h1 className="page-title text-danger">Emergency & Disease Alert</h1>
        <p className="page-subtitle">Report an animal in immediate danger or log a disease sighting. This will notify the authorities.</p>
      </div>

      <div className="sos-layout">
        <div className="map-view glass-panel">
          <div className="map-placeholder" style={{ position: 'relative', zIndex: 1, height: '450px' }}>
            <MapContainer center={[location.lat, location.lng]} zoom={14} style={{ height: '100%', width: '100%', borderRadius: '12px' }}>
              <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[location.lat, location.lng]} icon={customMarkerIcon}>
                <Popup>Incident Location<br />{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</Popup>
              </Marker>
              <MapEvents location={location} setLocation={setLocation} />
            </MapContainer>
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', zIndex: 1000, background: 'rgba(0,0,0,0.7)', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--glass-border)', color: '#fff' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MapPin size={16} color="var(--danger)" />
                Lat: {location.lat.toFixed(4)} N, Long: {location.lng.toFixed(4)} E
              </p>
            </div>
          </div>
          <div className="map-controls">
             <button type="button" className="btn btn-secondary" onClick={handleLocateMe}><MapPin size={16} /> Locate Me</button>
             <p className="helper-text">Click on the map to adjust the precise location.</p>
          </div>
        </div>

        <div className="report-panel glass-panel">
          {reportState !== 'submitted' ? (
            <form onSubmit={handleSubmit}>
              <h2 className="panel-title">Incident Details</h2>
              <div className="form-group">
                <label className="form-label">Alert Type</label>
                <select className="form-control" value={alertType} onChange={e => setAlertType(e.target.value)}>
                  <option value="rescue">Rescue Needed</option>
                  <option value="disease_report">Disease Sighted (e.g. Rabies)</option>
                  <option value="disaster">Disaster (Flooding, Earthquake)</option>
                </select>
              </div>
              {alertType === 'rescue' && (
                <div className="form-group">
                  <label className="form-label">Animal Type</label>
                  <select className="form-control" value={animalType} onChange={e => setAnimalType(e.target.value)}>
                    <option>Dog</option><option>Cat</option><option>Bovine</option><option>Wildlife / Other</option>
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Condition Description</label>
                <textarea required className="form-control" rows={4} placeholder="E.g. Injured leg, unable to walk, bleeding..." value={description} onChange={e => setDescription(e.target.value)}></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">Attach Photo Evidence (Optional)</label>
                <input type="file" id="evidence-upload" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                <label htmlFor="evidence-upload" className="photo-upload-box">
                  {photo ? (<span style={{color: 'var(--text-primary)', wordBreak: 'break-all'}}>{photo.name}</span>) : (<><Camera size={24} /><span>Tap to upload photo</span></>)}
                </label>
              </div>
              <button type="submit" disabled={reportState === 'submitting'} className="btn btn-danger btn-block" style={{width: '100%'}}>
                {reportState === 'submitting' ? <Loader2 className="animate-spin" /> : <AlertCircle size={20} />} 
                {reportState === 'submitting' ? ' DISPATCHING...' : ' SEND SOS ALERT'}
              </button>
            </form>
          ) : (
            <div className="success-state">
              <div className="success-icon"><Send size={48} /></div>
              <h2>Alert Dispatched!</h2>
              <p>
                {alertType === 'rescue' 
                  ? 'The nearest shelter has received your alert. They may contact you via phone for additional details.' 
                  : 'Your alert has been sent directly to the Civic Authority / Municipality. They will review the report and coordinate an emergency response if necessary.'}
              </p>
              <button onClick={() => { setReportState('idle'); setDescription(''); }} className="btn btn-primary" style={{marginTop: '2rem'}}>Return to map</button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SOSMap;
