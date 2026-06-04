import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';

const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

import { Activity, ShieldAlert, Users, TrendingUp, Download, Radio, Map as MapIcon, Database, MapPin, Trash2, Building2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import 'leaflet/dist/leaflet.css';
import './CivicAuthorityDashboard.css';

const CivicAuthorityDashboard = () => {
  const [metrics, setMetrics] = useState({
    total_adoptions: 0,
    intakes_this_quarter: 0,
    vaccination_compliance: '0%',
    active_zoonotic_reports: 0
  });
  
  const [heatmapData, setHeatmapData] = useState([]);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [diseaseFilter, setDiseaseFilter] = useState('Rabies');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [targetGroup, setTargetGroup] = useState('all_users');
  const [liveReports, setLiveReports] = useState([]);
  const [mapCenter, setMapCenter] = useState([10.8505, 76.2711]);
  const [mapZoom, setMapZoom] = useState(8);
  const [selectedReport, setSelectedReport] = useState(null);
  
  // Deletion Modal State
  const [deletingReportId, setDeletingReportId] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteDetails, setDeleteDetails] = useState('');
  
  const { user, authFetch } = useAuth();
  
  // Livestock Data
  const [rowData, setRowData] = useState([]);

  // LSGD Verification State
  const [municipalId, setMunicipalId] = useState('');
  const [issuingZone, setIssuingZone] = useState('');
  const [municipalStatus, setMunicipalStatus] = useState('idle'); // idle, verifying, verified, invalid
  const [municipalDetails, setMunicipalDetails] = useState(null);

  const verifyMunicipalRegistration = async (e) => {
    if (e) e.preventDefault();
    if (!municipalId.trim()) return;
    setMunicipalStatus('verifying');
    setMunicipalDetails(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/auth/verify-municipal/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ municipal_id: municipalId }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'VERIFIED') {
        setMunicipalStatus('verified');
        setMunicipalDetails(data);
        setIssuingZone(data.zone || '');
      } else {
        setMunicipalStatus('invalid');
        setMunicipalDetails(data);
      }
    } catch (err) {
      setMunicipalStatus('invalid');
      setMunicipalDetails({ message: 'Network error. Verification service unavailable.' });
    }
  };

  useEffect(() => {
    // Fetch live reports from SOS endpoint
    authFetch('http://127.0.0.1:8000/api/citizens/sos/')
      .then(res => res.json())
      .then(data => {
        // Handle pagination response or array response
        const reportsData = Array.isArray(data) ? data : data.results || [];
        // Map backend SOS alerts to report format
        const formattedReports = reportsData.map(alert => {
          let typeLabel = 'Rescue Needed';
          if (alert.alert_type === 'disease_report') typeLabel = 'Disease Sighted';
          if (alert.alert_type === 'disaster') typeLabel = 'Disaster';
          
          let lat = 'Unknown', lng = 'Unknown';
          if (alert.location && alert.location.includes(',')) {
            const parts = alert.location.split(',');
            lat = parseFloat(parts[0]).toFixed(3);
            lng = parseFloat(parts[1]).toFixed(3);
          }

          // Calculate time ago
          const timeDiff = new Date() - new Date(alert.timestamp);
          const minutesAgo = Math.floor(timeDiff / 60000);
          const hoursAgo = Math.floor(minutesAgo / 60);
          const daysAgo = Math.floor(hoursAgo / 24);
          
          let timeStr;
          if (minutesAgo < 60) timeStr = `${minutesAgo} mins ago`;
          else if (hoursAgo < 24) timeStr = `${hoursAgo} hrs ago`;
          else timeStr = `${daysAgo} days ago`;

          return {
            id: alert.id,
            type: typeLabel,
            desc: alert.animal_description || 'No description provided.',
            time: timeStr,
            lat,
            lng,
            reporterName: alert.reporter_name || 'Anonymous Citizen',
            status: alert.status
          };
        });
        
        // Sort by newest first
        setLiveReports(formattedReports);
      })
      .catch(err => console.error("Error fetching live reports:", err));

    // Fetch analytics metrics
    authFetch('http://127.0.0.1:8000/api/public-health/analytics/')
    .then(res => res.json())
    .then(data => {
      if (data.metrics) setMetrics(data.metrics);
      if (data.livestock_registry) setRowData(data.livestock_registry);
    }).catch(err => {
      console.error(err);
      // Fallback
      setMetrics({
        total_adoptions: 1520,
        intakes_this_quarter: 435,
        vaccination_compliance: '85%',
        active_zoonotic_reports: 23
      });
    });

    fetchHeatmap(diseaseFilter);
  }, [diseaseFilter, authFetch]);

  const fetchHeatmap = (disease) => {
    authFetch(`http://127.0.0.1:8000/api/public-health/heatmap/?disease=${disease}`)
    .then(res => res.json())
    .then(data => {
      if (data.heatmap_data) setHeatmapData(data.heatmap_data);
    }).catch(err => {
      console.error(err);
      setHeatmapData([]); // Real data only
    });
  };

  const handleBroadcast = (e) => {
    e.preventDefault();
    setIsBroadcasting(true);
    authFetch('http://127.0.0.1:8000/api/public-health/broadcast/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: broadcastMessage,
        polygon: [[10.8, 76.2], [10.9, 76.3], [10.7, 76.1]],
        target_group: targetGroup
      })
    }).then(res => res.json())
    .then(data => {
      if (data.message) {
        alert(`Success: ${data.message}\n${data.details || ''}`);
      }
      setBroadcastMessage('');
    }).catch(err => {
      alert("Failed to execute broadcast. Ensure backend is running.");
      setBroadcastMessage('');
    }).finally(() => {
      setIsBroadcasting(false);
    });
  };

  const handleExport = () => {
    alert("Compiling strictly anonymized JSON/CSV exports for Municipal health reporting...");
  };

  const confirmDelete = async (id) => {
    try {
      const res = await authFetch(`http://127.0.0.1:8000/api/citizens/sos/${id}/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deleteReason, details: deleteDetails })
      });
      if (res.ok) {
        setLiveReports(prev => prev.filter(r => r.id !== id));
        if (selectedReport && selectedReport.id === id) {
          setSelectedReport(null);
        }
        setDeletingReportId(null);
        setDeleteReason('');
        setDeleteDetails('');
        alert("Alert removed and the reporter has been notified.");
      } else {
        alert("Failed to remove alert.");
      }
    } catch (err) {
      console.error(err);
      alert("Error processing removal.");
    }
  };

  return (
    <div className="civic-dashboard">
      <div className="civic-header">
        <div className="civic-title">
          <h1>Disease and Disaster Alert Feature</h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', margin: '0.35rem 0' }}>
            <span style={{ fontSize: '0.75rem', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', color: '#c084fc', padding: '0.2rem 0.65rem', borderRadius: 20, fontWeight: 700 }}>
              📍 Local Body: {user?.zone || 'Kollam Corporation'}
            </span>
          </div>
          <p>Real-Time Alerts and Emergency Broadcast for Citizens & NGOs</p>
        </div>
        <button className="export-btn" onClick={handleExport}>
          <Download size={18} />
          <span>Export Analytics</span>
        </button>
      </div>

      <motion.div 
        className="reports-feed"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ marginBottom: '2rem', padding: '1.5rem', background: '#1e1e2d', borderRadius: '12px' }}
      >
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#f87171' }}>
          <ShieldAlert size={24} /> Live Incoming Reports
        </h2>
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
          {liveReports.length > 0 ? liveReports.map(report => (
            <div 
              key={report.id} 
              onClick={() => {
                if (report.lat !== 'Unknown') {
                  setMapCenter([parseFloat(report.lat), parseFloat(report.lng)]);
                  setMapZoom(14);
                  setSelectedReport(report);
                }
              }}
              style={{
                minWidth: '300px', maxWidth: '350px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '1rem',
                borderLeft: `4px solid ${report.type === 'Disaster' ? '#3b82f6' : report.type === 'Disease Sighted' ? '#ef4444' : '#f59e0b'}`,
                cursor: 'pointer', transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', color: report.type === 'Disaster' ? '#60a5fa' : report.type === 'Disease Sighted' ? '#f87171' : '#fbbf24' }}>{report.type}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{report.time}</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingReportId(report.id);
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center', borderRadius: '4px' }}
                    title="Remove Alert"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#e2e8f0', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {report.desc}
              </p>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} /> {report.lat}, {report.lng}
              </div>
            </div>
          )) : (
            <div style={{ padding: '2rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', width: '100%' }}>
              No incoming reports at the moment.
            </div>
          )}
        </div>
      </motion.div>

      <div className="main-content-grid">
        <motion.div 
          className="panel"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="panel-header">
            <h2><MapIcon size={20} /> Zoonotic Disease GIS Heatmap</h2>
            <select 
              className="civic-input" 
              style={{ width: '200px' }}
              value={diseaseFilter}
              onChange={(e) => setDiseaseFilter(e.target.value)}
            >
              <option value="Rabies">Rabies Outbreaks</option>
              <option value="Canine Parvovirus">Canine Parvovirus</option>
              <option value="Avian Flu">Avian Flu (H5N1)</option>
              <option value="Feline Leukemia">Feline Leukemia</option>
            </select>
          </div>
            <div className="map-container-wrapper" style={{ height: '400px', backgroundColor: '#1e1e2d', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {selectedReport && (
              <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontWeight: 'bold', color: '#f87171' }}>Selected Alert: </span>
                <span style={{ color: '#e2e8f0' }}>{selectedReport.type} reported by {selectedReport.reporterName} ({selectedReport.time})</span>
              </div>
            )}
            <MapContainer center={mapCenter} zoom={mapZoom} style={{ flex: 1, width: '100%' }} zoomControl={false}>
              <ChangeView center={mapCenter} zoom={mapZoom} />
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
              />
              {selectedReport && (
                <CircleMarker
                  center={[selectedReport.lat, selectedReport.lng]}
                  radius={8}
                  pathOptions={{ color: '#ffffff', fillColor: '#ef4444', fillOpacity: 1, weight: 3 }}
                >
                  <Popup>
                    <div style={{color: '#000'}}>
                      <strong>{selectedReport.type}</strong><br/>
                      By: {selectedReport.reporterName}<br/>
                      {selectedReport.desc}
                    </div>
                  </Popup>
                </CircleMarker>
              )}
              {heatmapData.map((pt, i) => (
                <CircleMarker 
                  key={i} 
                  center={[pt.latitude, pt.longitude]} 
                  radius={pt.intensity * 3}
                  pathOptions={{ 
                    color: diseaseFilter === 'Rabies' ? '#ef4444' : '#f59e0b', 
                    fillColor: diseaseFilter === 'Rabies' ? '#ef4444' : '#f59e0b', 
                    fillOpacity: 0.6 
                  }}
                >
                  <Popup>
                    <div style={{color: '#000'}}>
                      <strong>Live Disease Alert</strong><br/>
                      Reporter: {pt.reporter}<br/>
                      Condition: {pt.disease}<br/>
                      Time: {pt.time_ago} ({pt.status})<br/>
                      Severity Index: {pt.intensity}/10
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </motion.div>

        <motion.div 
          className="panel"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="panel-header">
            <h2><Radio size={20} /> Geo-Fenced Mass Broadcast</h2>
          </div>
          <form className="broadcast-form" onSubmit={handleBroadcast}>
            <div className="polygon-info">
              <ShieldAlert size={18} style={{flexShrink: 0}} />
              <span>Simulated Polygon: Map coordinates are pre-selected for the current active viewport. Ensure strict criteria before executing.</span>
            </div>
            <div className="form-group">
              <label>Priority Target Group</label>
              <select className="civic-input" value={targetGroup} onChange={(e) => setTargetGroup(e.target.value)}>
                <option value="all_users">All Users in Area (Citizens, Vets, Shelters)</option>
                <option value="citizen">Citizens & Pet Owners Only</option>
                <option value="veterinarian">Veterinarians Only</option>
                <option value="shelter_admin">Shelters Only</option>
              </select>
            </div>
            <div className="form-group">
              <label>Emergency Payload Content (SMS/Push)</label>
              <textarea 
                className="civic-textarea" 
                placeholder="Enter rich-text emergency notification..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                required
              />
            </div>
            <button 
              type="submit" 
              className="broadcast-btn"
              disabled={isBroadcasting || !broadcastMessage}
            >
              {isBroadcasting ? 'Broadcasting...' : 'EXECUTE GEO-BROADCAST'}
            </button>
          </form>
        </motion.div>
      </div>

      <motion.div 
        className="panel"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="panel-header">
          <h2><Database size={20} /> SOS Alert Operations Log</h2>
        </div>
        <div className="grid-panel" style={{ overflowX: 'auto', backgroundColor: '#1e1e2d', borderRadius: '8px', padding: '1rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: '#fff' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                <th style={{ padding: '0.75rem' }}>Alert ID</th>
                <th style={{ padding: '0.75rem' }}>Type</th>
                <th style={{ padding: '0.75rem' }}>Reporter</th>
                <th style={{ padding: '0.75rem' }}>Description</th>
                <th style={{ padding: '0.75rem' }}>Status</th>
                <th style={{ padding: '0.75rem' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {liveReports.length > 0 ? liveReports.map(report => (
                <tr key={report.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.75rem' }}>{report.id}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{report.type}</td>
                  <td style={{ padding: '0.75rem' }}>{report.reporterName}</td>
                  <td style={{ padding: '0.75rem' }}>{report.desc}</td>
                  <td style={{ 
                    padding: '0.75rem', 
                    fontWeight: 'bold',
                    color: report.status === 'Resolved' ? '#10b981' : report.status === 'Accepted' ? '#f59e0b' : '#ef4444'
                  }}>
                    {report.status}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{report.time}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>No alerts found in the region.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>



      {/* Deletion Modal Overlay */}
      {deletingReportId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1e1e2d', padding: '2rem', borderRadius: '12px', width: '450px', maxWidth: '90%', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Trash2 color="#ef4444" size={24} />
              <h3 style={{ margin: 0, color: '#f87171' }}>Remove Alert</h3>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Before removing this alert from the civic database, please provide a classification reason for auditing purposes.
            </p>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e2e8f0', fontSize: '0.9rem' }}>Reason for Removal *</label>
              <select className="civic-input" style={{ width: '100%' }} value={deleteReason} onChange={e => setDeleteReason(e.target.value)}>
                <option value="">-- Select Reason --</option>
                <option value="false_news">False News / Hoax</option>
                <option value="wrong_location">Wrong Location/No Location</option>
                <option value="no_evidence">No Evidence Found</option>
                <option value="resolved">Already Resolved / Handled</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e2e8f0', fontSize: '0.9rem' }}>Additional Details</label>
              <textarea className="civic-textarea" style={{ width: '100%', minHeight: '80px' }} value={deleteDetails} onChange={e => setDeleteDetails(e.target.value)} placeholder="Provide contextual notes regarding this removal..." />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="export-btn" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }} onClick={() => { setDeletingReportId(null); setDeleteReason(''); setDeleteDetails(''); }}>Cancel</button>
              <button className="broadcast-btn" style={{ width: 'auto', background: deleteReason ? '#ef4444' : 'rgba(239,68,68,0.5)', cursor: deleteReason ? 'pointer' : 'not-allowed' }} disabled={!deleteReason} onClick={() => confirmDelete(deletingReportId)}>Confirm Remove</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CivicAuthorityDashboard;
