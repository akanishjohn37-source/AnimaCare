import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, AlertCircle, Phone, Camera, Send } from 'lucide-react';
import './SOSMap.css';

const SOSMap = () => {
  const [reportState, setReportState] = useState('idle'); // idle, reporting, submitted

  const handleSubmit = (e) => {
    e.preventDefault();
    setReportState('submitted');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      className="sos-container"
    >
      <div className="sos-header">
        <h1 className="page-title text-danger">Emergency SOS Alert</h1>
        <p className="page-subtitle">Report an animal in immediate danger. This will notify the nearest shelter.</p>
      </div>

      <div className="sos-layout">
        <div className="map-view glass-panel">
          <div className="map-placeholder">
            {/* Embedded map will go here */}
            <div className="map-overlay">
              <MapPin size={48} className="map-pin pulse" />
              <p>Lat: 34.0522 N, Long: -118.2437 W</p>
            </div>
            <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=800&h=600" alt="Map Area" className="map-img-bg" />
          </div>
          <div className="map-controls">
             <button className="btn btn-secondary"><MapPin size={16} /> Locate Me</button>
             <p className="helper-text">You can drag the pin to adjust the precise location.</p>
          </div>
        </div>

        <div className="report-panel glass-panel">
          {reportState !== 'submitted' ? (
            <form onSubmit={handleSubmit}>
              <h2 className="panel-title">Incident Details</h2>
              
              <div className="form-group">
                <label className="form-label">Animal Type</label>
                <select className="form-control">
                  <option>Dog</option>
                  <option>Cat</option>
                  <option>Bovine</option>
                  <option>Wildlife / Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Condition Description</label>
                <textarea className="form-control" rows={4} placeholder="E.g. Injured leg, unable to walk, bleeding..."></textarea>
              </div>

              <div className="form-group">
                <label className="form-label">Attach Photo Evidence (Optional)</label>
                <div className="photo-upload-box">
                  <Camera size={24} />
                  <span>Tap to upload photo</span>
                </div>
              </div>

              <button type="submit" className="btn btn-danger btn-block" style={{width: '100%'}}>
                <AlertCircle size={20} /> SEND SOS ALERT
              </button>
              <p className="disclaimer">Misuse of the SOS feature may result in account suspension.</p>
            </form>
          ) : (
            <div className="success-state">
              <div className="success-icon"><Send size={48} /></div>
              <h2>Alert Dispatched!</h2>
              <p>The nearest shelter has received your alert. They may contact you via phone for additional details.</p>
              <button onClick={() => setReportState('idle')} className="btn btn-primary" style={{marginTop: '2rem'}}>Return to map</button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SOSMap;
