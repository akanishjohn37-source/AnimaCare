import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, ShieldCheck, Activity, Image as ImageIcon, Plus, Syringe, User as UserIcon, X, FileText, Clock, Trash2, Heart, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './MedicalViewer.css';

const MedicalViewer = () => {
  const { petId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialType = queryParams.get('type') || 'pet';
  
  const { authFetch, user } = useAuth();
  
  const [pets, setPets] = useState([]);
  const [livestocks, setLivestocks] = useState([]);
  const [activeTab, setActiveTab] = useState(initialType);
  const [selectedPetData, setSelectedPetData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeConsultation, setActiveConsultation] = useState(null);

  // Owner self-report state
  const [showModal, setShowModal] = useState(false);
  const [reportForm, setReportForm] = useState({ title: '', date: '', description: '' });

  useEffect(() => {
    Promise.all([
      authFetch('http://localhost:8000/api/citizens/pets/'),
      authFetch('http://localhost:8000/api/citizens/livestocks/')
    ])
    .then(async ([petsRes, lsRes]) => {
      let pData = [];
      let lData = [];
      if (petsRes.ok) { const d = await petsRes.json(); pData = d.results || (Array.isArray(d) ? d : []); }
      if (lsRes.ok) { const d = await lsRes.json(); lData = d.results || (Array.isArray(d) ? d : []); }
      
      const livestockIds = new Set(lData.map(l => l.id));
      const justPets = pData.filter(p => !livestockIds.has(p.id));
      
      setPets(justPets);
      setLivestocks(lData);
      
      const allAnimals = activeTab === 'livestock' ? lData : justPets;
      
      if (allAnimals.length > 0) {
        const activePetId = (petId && petId !== 'all') ? petId : allAnimals[0].id;
        fetchMedicalReport(activePetId);
      } else {
        setIsLoading(false);
      }
    })
    .catch(err => {
      console.error(err);
      setIsLoading(false);
    });
  }, [petId, activeTab, authFetch]);

  const fetchMedicalReport = async (id) => {
    setIsLoading(true);
    try {
      const res = await authFetch(`http://localhost:8000/api/citizens/pets/${id}/medical_report/`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPetData(data);
        if (data.medical_history && data.medical_history.length > 0) {
            setActiveConsultation(data.medical_history[0]);
        } else {
            setActiveConsultation(null);
        }
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

  const deleteSelfReport = async (reportId) => {
    if (!window.confirm("Are you sure you want to delete this self-reported detail?")) return;
    try {
      const res = await authFetch(`http://localhost:8000/api/clinical/self-reports/${reportId}/`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSelectedPetData(prev => ({
          ...prev,
          self_reports: prev.self_reports.filter(r => r.id !== reportId)
        }));
      } else {
        alert("Failed to delete self-report.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting self-report.");
    }
  };

  const deleteConsultation = async (logId) => {
    if (!window.confirm("Are you sure you want to delete this old consultation record?")) return;
    setIsDeleting(true);
    try {
      const res = await authFetch(`http://localhost:8000/api/clinical/consultations/${logId}/`, {
        method: 'DELETE'
      });
      if (res.ok) {
        // Remove from UI immediately
        setSelectedPetData(prev => ({
          ...prev,
          medical_history: prev.medical_history.filter(log => log.id !== logId)
        }));
      } else {
        alert("Failed to delete record.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting record.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading && !selectedPetData) {
    return <div style={{ color: 'white', padding: '2rem', textAlign: 'center' }}>Loading Medical Records...</div>;
  }

  if (pets.length === 0 && livestocks.length === 0) {
    return (
      <div style={{ color: 'white', padding: '3rem', textAlign: 'center' }}>
        <h2>No Animals Found</h2>
        <p>You haven't added any pets or livestocks yet. Register an animal to view their medical records.</p>
      </div>
    );
  }

  const currentPet = selectedPetData?.pet;
  const activeList = activeTab === 'livestock' ? livestocks : pets;

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

      <button 
        onClick={() => window.history.length > 2 ? navigate(-1) : window.close()} 
        className="btn btn-secondary no-print" 
        style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 100 }}
      >
        <X size={18} /> Close
      </button>

      {/* Tabs */}
      <div className="no-print" style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.5rem' }}>
        <h2 
          onClick={() => { setActiveTab('pet'); navigate('/medical/all?type=pet', { replace: true }); }} 
          style={{ 
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
            paddingBottom: '0.5rem', borderBottom: activeTab === 'pet' ? '2px solid #8b5cf6' : '2px solid transparent',
            opacity: activeTab === 'pet' ? 1 : 0.4, transition: 'all 0.3s ease'
          }}
        >
          <Heart size={20} className={activeTab === 'pet' ? "icon-accent" : ""} /> Pets Record
        </h2>
        <h2 
          onClick={() => { setActiveTab('livestock'); navigate('/medical/all?type=livestock', { replace: true }); }} 
          style={{ 
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
            paddingBottom: '0.5rem', borderBottom: activeTab === 'livestock' ? '2px solid #10b981' : '2px solid transparent',
            opacity: activeTab === 'livestock' ? 1 : 0.4, transition: 'all 0.3s ease'
          }}
        >
          <Shield size={20} style={{ color: activeTab === 'livestock' ? '#10b981' : 'inherit' }} /> Livestocks Record
        </h2>
      </div>

      {/* Animal Selector */}
      <div className="no-print" style={{ display: 'flex', gap: '1rem', overflowX: 'auto', marginBottom: '2rem', paddingBottom: '1rem' }}>
        {activeList.map(p => (
          <div 
            key={p.id} 
            onClick={() => navigate(`/medical/${p.id}?type=${activeTab}`)}
            style={{ 
              padding: '0.5rem 1.5rem', borderRadius: '20px', cursor: 'pointer',
              background: currentPet?.id === p.id ? (activeTab === 'livestock' ? '#10b981' : '#8b5cf6') : 'rgba(255,255,255,0.05)',
              color: 'white', whiteSpace: 'nowrap', fontWeight: currentPet?.id === p.id ? 'bold' : 'normal'
            }}>
            {p.name}
          </div>
        ))}
        {activeList.length === 0 && (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', padding: '0.5rem 0' }}>
            No {activeTab}s registered.
          </div>
        )}
      </div>

      {selectedPetData && activeList.some(p => p.id === selectedPetData.pet.id) && (
        <>
          <div className="medical-header glass-panel">
            <div className="pet-identity">
              <img src={currentPet.media_url || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150&h=150&fit=crop"} alt={currentPet.name} className="profile-img-lg" />
              <div>
                <h1 className="page-title">{currentPet.name}'s Medical History</h1>
                <p className="page-subtitle">Microchip/Tag ID: {currentPet.microchip_id || currentPet.rfid_tag || 'Not Registered'}</p>
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
                  {selectedPetData.medical_history.map((log, index) => (
                    <div 
                      key={log.id} 
                      className="glass-panel log-card" 
                      onClick={() => setActiveConsultation(log)}
                      style={{ 
                        borderLeft: activeConsultation?.id === log.id ? '4px solid #22d3ee' : '4px solid #4ade80', 
                        position: 'relative',
                        cursor: 'pointer',
                        background: activeConsultation?.id === log.id ? 'rgba(34, 211, 238, 0.05)' : 'rgba(255,255,255,0.02)'
                      }}
                    >
                      <div className="log-header">
                        <h3 style={{ color: '#4ade80' }}>Clinical Consultation</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span className="log-date">{new Date(log.date).toLocaleDateString()}</span>
                          {index !== 0 && (
                            <button 
                              onClick={() => deleteConsultation(log.id)}
                              disabled={isDeleting}
                              className="btn btn-secondary no-print" 
                              style={{ padding: '0.2rem 0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                              title="Delete old record"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
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
                  <div key={report.id} className="glass-panel log-card" style={{ borderLeft: '4px solid #8b5cf6', position: 'relative' }}>
                    <div className="log-header">
                      <h3 style={{ color: '#fff' }}>{report.title}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span className="log-date">{new Date(report.date).toLocaleDateString()}</span>
                        {user.role === 'citizen' && (
                          <button 
                            onClick={() => deleteSelfReport(report.id)}
                            className="btn btn-secondary no-print" 
                            style={{ padding: '0.2rem 0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                            title="Delete self-report"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
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
                 {!activeConsultation ? (
                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>
                      <p>Select a clinical encounter to view associated media.</p>
                    </div>
                 ) : activeConsultation.media && activeConsultation.media.length > 0 ? (
                    activeConsultation.media.map(m => (
                      <div key={m.id} className="glass-panel media-card">
                        <div className="media-image-container">
                          <img src={m.media_url} alt="Diagnostic" />
                          <div className="media-overlay">
                            <button className="btn btn-primary" onClick={() => window.open(m.media_url, '_blank')}><Download size={16} /> View Full Size</button>
                          </div>
                        </div>
                        <div className="media-info">
                          <h4>{m.diagnostic_tags ? m.diagnostic_tags[0] : 'Diagnostic Scan'}</h4>
                          <p>{new Date(activeConsultation.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))
                 ) : (
                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', opacity: 0.3 }}>
                       <ImageIcon size={32} style={{ margin: '0 auto 1rem' }} />
                       <p>No diagnostic images uploaded for this consultation.</p>
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
