import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, ShieldCheck, Activity, Image as ImageIcon, Plus, Syringe, User as UserIcon, X, FileText, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './MedicalViewer.css';

const MedicalViewer = () => {
  const { petId } = useParams();
  const navigate = useNavigate();
  const { authFetch, user } = useAuth();
  
  const [pets, setPets] = useState([]);
  const [selectedPetData, setSelectedPetData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Owner self-report state
  const [showModal, setShowModal] = useState(false);
  const [reportForm, setReportForm] = useState({ title: '', date: '', description: '' });

  useEffect(() => {
    // 1. Fetch pets list
    authFetch('http://localhost:8000/api/citizens/pets/')
      .then(res => res.json())
      .then(data => {
        setPets(data);
        if (data && data.length > 0) {
          const activePetId = (petId && petId !== 'all') ? petId : data[0].id;
          fetchMedicalReport(activePetId);
        } else {
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error("Failed to load pets:", err);
        setIsLoading(false);
      });
  }, [petId, authFetch]);

  const fetchMedicalReport = async (id) => {
    setIsLoading(true);
    try {
      const res = await authFetch(`http://localhost:8000/api/citizens/pets/${id}/medical_report/`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPetData(data);
      }
    } catch (err) {
      console.error("Medical Report Fetch Error", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSelfReport = async (e) => {
    e.preventDefault();
    if (!selectedPetData) return;
    try {
      const res = await authFetch('http://localhost:8000/api/clinical/self-reports/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet: selectedPetData.pet.id,
          ...reportForm
        })
      });
      if (res.ok) {
        fetchMedicalReport(selectedPetData.pet.id);
        setShowModal(false);
        setReportForm({ title: '', date: '', description: '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading && !selectedPetData) {
    return <div style={{ color: 'white', padding: '2rem', textAlign: 'center' }}>Loading Medical Records...</div>;
  }

  if (pets.length === 0) {
    return (
      <div style={{ color: 'white', padding: '3rem', textAlign: 'center' }}>
        <h2>No Pets Found</h2>
        <p>You haven't added any pets yet. Register a pet to view their medical records.</p>
      </div>
    );
  }

  const currentPet = selectedPetData?.pet;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="medical-container"
    >
      <div className="print-only document-header">
        <div className="header-top">
          <div className="brand"><span className="brand-icon">AnimaCare</span></div>
          <div className="document-info">
            <p>Official Medical Record</p>
            <p>Generated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <div className="header-divider"></div>
      </div>

      {/* Pet Selector */}
      <div className="no-print" style={{ display: 'flex', gap: '1rem', overflowX: 'auto', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        {pets.map(p => (
          <div 
            key={p.id} 
            onClick={() => navigate(`/medical/${p.id}`)}
            style={{ 
              padding: '0.5rem 1.5rem', borderRadius: '20px', cursor: 'pointer',
              background: currentPet?.id === p.id ? '#8b5cf6' : 'rgba(255,255,255,0.05)',
              color: 'white', whiteSpace: 'nowrap', fontWeight: currentPet?.id === p.id ? 'bold' : 'normal'
            }}>
            {p.name}
          </div>
        ))}
      </div>

      {selectedPetData && (
        <>
          <div className="medical-header glass-panel">
            <div className="pet-identity">
              <img src={currentPet.media_url || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150&h=150&fit=crop"} alt={currentPet.name} className="profile-img-lg" />
              <div>
                <h1 className="page-title">{currentPet.name}'s Medical History</h1>
                <p className="page-subtitle">Microchip ID: {currentPet.microchip_id || 'Not Registered'}</p>
                <div className="auth-badge">
                  <ShieldCheck size={16} /> Authenticated Veterinary Record
                </div>
              </div>
            </div>
            <button className="btn btn-secondary no-print" onClick={() => window.print()}>
              <Download size={18} /> Export PDF
            </button>
          </div>

          <div className="medical-grid">
            <div className="logs-section">
              {/* Doctor Records */}
              <h2 className="section-title"><Activity size={20} className="icon-accent" /> Clinical Encounters (Veterinarian)</h2>
              {selectedPetData.medical_history.length === 0 ? (
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', marginBottom: '2rem' }}>
                   No clinical encounters recorded yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
                  {selectedPetData.medical_history.map(log => (
                    <div key={log.id} className="glass-panel log-card" style={{ borderLeft: '4px solid #4ade80' }}>
                      <div className="log-header">
                        <h3 style={{ color: '#4ade80' }}>Clinical Consultation</h3>
                        <span className="log-date">{new Date(log.date).toLocaleDateString()}</span>
                      </div>
                      <div className="log-body">
                        <p><strong>Attending Vet:</strong> Dr. {log.vet_name}</p>
                        <p><strong>Vitals:</strong> {log.vital_signs ? `Weight: ${log.vital_signs.weight}kg, Temp: ${log.vital_signs.temp}°C` : 'N/A'}</p>
                        <p style={{ marginTop: '0.5rem', lineHeight: 1.5 }}>{log.consultation_notes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Self Reports */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 className="section-title" style={{ margin: 0 }}><UserIcon size={20} className="icon-accent" /> Self-Reported Details (Owner)</h2>
                {user.role === 'citizen' && (
                  <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
                    <Plus size={16} /> Add Report
                  </button>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {selectedPetData.self_reports.map(report => (
                  <div key={report.id} className="glass-panel log-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                    <div className="log-header">
                      <h3 style={{ color: '#fff' }}>{report.title}</h3>
                      <span className="log-date">{new Date(report.date).toLocaleDateString()}</span>
                    </div>
                    <div className="log-body">
                      <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{report.description}</p>
                    </div>
                  </div>
                ))}
                {selectedPetData.self_reports.length === 0 && (
                   <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>No self-reported medical details.</p>
                )}
              </div>
            </div>

            <div className="media-section">
              <h2 className="section-title"><ImageIcon size={20} className="icon-accent" /> Diagnostic Media</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 {selectedPetData.medical_history.some(log => log.media && log.media.length > 0) ? (
                   selectedPetData.medical_history.map(log => 
                     log.media.map(m => (
                       <div key={m.id} className="glass-panel media-card">
                         <div className="media-image-container">
                           <img src={m.media_url} alt="Diagnostic" />
                           <div className="media-overlay">
                             <button className="btn btn-primary" onClick={() => window.open(m.media_url, '_blank')}><Download size={16} /> View Full Size</button>
                           </div>
                         </div>
                         <div className="media-info">
                           <h4>{m.diagnostic_tags ? m.diagnostic_tags[0] : 'Diagnostic Scan'}</h4>
                           <p>{new Date(log.date).toLocaleDateString()}</p>
                         </div>
                       </div>
                     ))
                   )
                 ) : (
                   <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', opacity: 0.3 }}>
                      <ImageIcon size={32} style={{ margin: '0 auto 1rem' }} />
                      <p>No diagnostic images uploaded.</p>
                   </div>
                 )}
              </div>

              <div className="readonly-notice glass-panel no-print" style={{ marginTop: '2rem' }}>
                <ShieldCheck size={24} className="icon-success" />
                <p>Clinical Records are cryptographically secured and read-only for Citizens. Modifications must be made by authorized Veterinarians.</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Report Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="glass-panel" style={{ padding: '2.5rem', width: '450px', maxWidth: '90%', position: 'relative' }}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={24} /></button>
            <h3 style={{ marginBottom: '1.5rem', color: '#fff' }}>Add Self-Reported Detail</h3>
            <form onSubmit={handleAddSelfReport} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>Title (e.g. Vaccination, Deworming)</label>
                <input required type="text" className="form-control" value={reportForm.title} onChange={e => setReportForm({...reportForm, title: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem', borderRadius: '8px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>Event Date</label>
                <input required type="date" className="form-control" value={reportForm.date} onChange={e => setReportForm({...reportForm, date: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem', borderRadius: '8px', colorScheme: 'dark' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>Description / Notes</label>
                <textarea rows="3" className="form-control" value={reportForm.description} onChange={e => setReportForm({...reportForm, description: e.target.value})} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem', borderRadius: '8px', resize: 'none' }} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', padding: '0.8rem' }}>Save Report</button>
            </form>
          </motion.div>
        </div>
      )}

      <div className="print-only document-footer">
        <div className="header-divider"></div>
        <p>AnimaCare Unified Veterinary Network | Confidential Medical Record</p>
      </div>
    </motion.div>
  );
};

export default MedicalViewer;
