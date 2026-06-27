import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, AlertCircle, Phone, Camera, Send, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, GeoJSON } from 'react-leaflet';
import invertedKeralaData from '../../assets/inverted_kerala.json';
import keralaData from '../../assets/kerala_feature.json';

const KERALA_BOUNDS = [
  [8.15, 74.85],
  [12.85, 77.40]
];
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './SOSMap.css';
import { useAuth } from '../../context/AuthContext';

export const getMunicipalityFromLatLng = (lat, lng) => {
  if (lat >= 8.15 && lat < 8.71) return 'Thiruvananthapuram Corporation';
  if (lat >= 8.71 && lat < 9.41) return 'Kollam Corporation';
  if (lat >= 9.41 && lat < 10.23) return 'Kochi Municipal Corporation';
  if (lat >= 10.23 && lat < 10.90) return 'Thrissur Corporation';
  if (lat >= 10.90 && lat < 11.57) return 'Kozhikode Corporation';
  if (lat >= 11.57 && lat <= 12.85) return 'Kannur Corporation';
  return null;
};

const municipalityZones = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Thiruvananthapuram Corporation", color: "#f43f5e" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [74.85, 8.15],
            [77.40, 8.15],
            [77.40, 8.71],
            [74.85, 8.71],
            [74.85, 8.15]
          ]
        ]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kollam Corporation", color: "#ec4899" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [74.85, 8.71],
            [77.40, 8.71],
            [77.40, 9.41],
            [74.85, 9.41],
            [74.85, 8.71]
          ]
        ]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kochi Municipal Corporation", color: "#8b5cf6" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [74.85, 9.41],
            [77.40, 9.41],
            [77.40, 10.23],
            [74.85, 10.23],
            [74.85, 9.41]
          ]
        ]
      }
    },
    {
      type: "Feature",
      properties: { name: "Thrissur Corporation", color: "#3b82f6" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [74.85, 10.23],
            [77.40, 10.23],
            [77.40, 10.90],
            [74.85, 10.90],
            [74.85, 10.23]
          ]
        ]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kozhikode Corporation", color: "#06b6d4" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [74.85, 10.90],
            [77.40, 10.90],
            [77.40, 11.57],
            [74.85, 11.57],
            [74.85, 10.90]
          ]
        ]
      }
    },
    {
      type: "Feature",
      properties: { name: "Kannur Corporation", color: "#10b981" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [74.85, 11.57],
            [77.40, 11.57],
            [77.40, 12.85],
            [74.85, 12.85],
            [74.85, 11.57]
          ]
        ]
      }
    }
  ]
};

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
    if (location.lat !== 0 && location.lng !== 0) {
      map.flyTo([location.lat, location.lng], map.getZoom(), { animate: true, duration: 1.5 });
    }
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
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (location.lat === 0 && location.lng === 0) {
      showToast("Please select a valid location inside Kerala before submitting.");
      return;
    }
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
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          if (lat >= 8.15 && lat <= 12.85 && lng >= 74.85 && lng <= 77.40) {
            setLocation({ lat, lng });
            showToast("Location updated successfully!");
          } else {
            showToast("Your physical location is outside Kerala. Snapping to default location.");
            setLocation({ lat: 9.9312, lng: 76.2673 }); // Snap to Kochi instead of 0,0
          }
        },
        (error) => {
          console.error("Error obtaining location", error);
          let errorMessage = "Unable to retrieve your location.";
          if (error.code === 1) errorMessage = "Location access denied. Please allow location permissions in your browser settings.";
          else if (error.code === 2) errorMessage = "Location information is currently unavailable (GPS/Network issue).";
          else if (error.code === 3) errorMessage = "The request to get your location timed out.";
          
          alert(errorMessage);
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
      );
    } else {
      alert("Geolocation is not supported by your browser");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="sos-container">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[9999] bg-red-600 text-white px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2"
          >
            <AlertCircle size={20} />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sos-header">
        <h1 className="page-title text-danger">Emergency & Disease Alert</h1>
        <p className="page-subtitle">Report an animal in immediate danger or log a disease sighting. This will notify the authorities.</p>
      </div>

      <div className="sos-layout">
        <div className="map-view glass-panel">
          <div className="map-placeholder" style={{ position: 'relative', zIndex: 1, height: '450px' }}>
            <MapContainer 
              bounds={KERALA_BOUNDS}
              minZoom={7}
              maxBounds={KERALA_BOUNDS}
              maxBoundsViscosity={1.0}
              style={{ height: '100%', width: '100%', borderRadius: '12px' }}
            >
              <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <GeoJSON 
                data={municipalityZones} 
                style={(feature) => ({
                  color: feature.properties.color,
                  weight: 1.5,
                  dashArray: '4, 4',
                  fillColor: feature.properties.color,
                  fillOpacity: 0.1
                })}
                onEachFeature={(feature, layer) => {
                  layer.on({
                    mouseover: (e) => {
                      e.target.setStyle({ fillOpacity: 0.22, weight: 2.5 });
                    },
                    mouseout: (e) => {
                      e.target.setStyle({ fillOpacity: 0.1, weight: 1.5 });
                    },
                    click: (e) => {
                      setLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
                    }
                  });
                  layer.bindTooltip(feature.properties.name, { sticky: true, className: 'municipality-tooltip' });
                }}
              />
              <GeoJSON 
                data={invertedKeralaData} 
                style={{ color: 'transparent', fillColor: '#111827', fillOpacity: 0.95 }} 
                interactive={true} 
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stop(e);
                    showToast("Cannot place marker outside Kerala state boundaries!");
                  }
                }}
              />
              <GeoJSON data={keralaData} style={{ color: '#047857', weight: 8, opacity: 0.4, fillColor: 'transparent' }} interactive={false} />
              <GeoJSON data={keralaData} style={{ color: '#34d399', weight: 3, opacity: 1, fillColor: 'transparent' }} interactive={false} />
              <Marker position={[location.lat, location.lng]} icon={customMarkerIcon}>
                <Popup>Incident Location<br />{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</Popup>
              </Marker>
              <MapEvents location={location} setLocation={setLocation} />
            </MapContainer>
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', zIndex: 1000, background: 'rgba(15, 23, 42, 0.85)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--glass-border)', color: '#fff', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
                <MapPin size={16} color="var(--danger)" />
                Lat: {location.lat.toFixed(4)} N, Lng: {location.lng.toFixed(4)} E
              </p>
              {location.lat !== 0 && (
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#10b981' }}>
                  📍 {getMunicipalityFromLatLng(location.lat, location.lng) || 'Outside Service Area'}
                </span>
              )}
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
