import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Stethoscope, FileText, BarChart2, Users,
  Calendar, Activity, TrendingUp, Clock, CheckCircle, ChevronRight, X, Upload, ImageIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';

const VetDashboard = () => {
  const { user, authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  // Consultation Form
  const [consultationData, setConsultationData] = useState({
    vital_signs: { weight: '', temp: '', heartRate: '' },
    notes: '',
    media: null
  });
  const [patientHistory, setPatientHistory] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');


  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await authFetch('http://localhost:8000/api/clinical/appointments/');
        if (res.ok) {
          const data = await res.json();
          setAppointments(data);
        }
      } catch (err) {
        console.error("Vet Dashboard Error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [authFetch]);

  useEffect(() => {
    if (selectedPatient) {
      const fetchHistory = async () => {
        try {
          const res = await authFetch(`http://localhost:8000/api/citizens/pets/${selectedPatient.pet}/medical_report/`);
          if (res.ok) {
            const data = await res.json();
            setPatientHistory(data);
          }
        } catch (err) {
          console.error("Fetch history error", err);
        }
      };
      fetchHistory();
    } else {
      setPatientHistory(null);
    }
  }, [selectedPatient, authFetch]);

  const handleCompleteAppointment = async (id) => {
    try {
      const res = await authFetch(`http://localhost:8000/api/clinical/appointments/${id}/complete/`, {
        method: 'POST'
      });
      if (res.ok) {
        setAppointments(appointments.map(a => a.id === id ? { ...a, status: 'Completed' } : a));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitConsultation = async () => {
    if (!selectedPatient) return;
    try {
      // For simplicity, we'll send media as a URL mock for now, 
      // in real scenario we'd use FormData if uploading file directly to backend
      const res = await authFetch('http://localhost:8000/api/clinical/consultations/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet: selectedPatient.pet,
          vital_signs: consultationData.vital_signs,
          consultation_notes: consultationData.notes,
          media_url: consultationData.media ? "https://images.unsplash.com/photo-1574701292021-99529ccf0e21?auto=format&fit=crop&q=80&w=400" : null
        })
      });
      if (res.ok) {
        alert("Medical record successfully submitted!");
        setSelectedPatient(null);
        setConsultationData({ vital_signs: { weight: '', temp: '', heartRate: '' }, notes: '', media: null });
        setSelectedFileName('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const tabBtnStyle = (key) => ({
    padding: '0.55rem 1.25rem',
    background: activeTab === key ? 'rgba(74,222,128,0.15)' : 'transparent',
    border: `1px solid ${activeTab === key ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.1)'}`,
    color: activeTab === key ? '#4ade80' : 'rgba(255,255,255,0.5)',
    borderRadius: 10, cursor: 'pointer', fontSize: '0.87rem', fontWeight: 600,
    transition: 'all 0.2s',
  });

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'rgba(74,222,128,0.12)',
            border: '1px solid rgba(74,222,128,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Stethoscope size={22} color="#4ade80" />
          </div>
          <div>
            <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Clinical Portal</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.83rem', margin: 0 }}>Dr. {user?.first_name} {user?.last_name} — Attending Veterinarian</p>
          </div>
        </div>
      </div>

      {!selectedPatient && (
        <>
          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem' }}>
            <button style={tabBtnStyle('overview')} onClick={() => setActiveTab('overview')}>Appointments</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={18} color="#4ade80" /> Today's Schedule
              </h3>
              {loading ? <p>Loading appointments...</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {appointments.filter(a => a.status === 'Scheduled').map(appt => (
                    <div key={appt.id} className="glass-panel" style={{ padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ color: '#fff', margin: 0 }}>{appt.pet_detail?.name}</h4>
                          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: '4px 0' }}>Owner: {appt.owner_name}</p>
                          <span style={{ fontSize: '0.75rem', color: '#4ade80' }}>{new Date(appt.date).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            onClick={() => setSelectedPatient(appt)}
                            style={{ padding: '0.4rem 0.8rem', borderRadius: 8, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                          >Examine</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {appointments.filter(a => a.status === 'Scheduled').length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)' }}>No pending appointments.</p>}
                </div>
              )}
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ color: '#fff', marginBottom: '1.5rem' }}>⚡ Recent Completed</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {appointments.filter(a => a.status === 'Completed').slice(0, 5).map(appt => (
                  <div key={appt.id} style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.6 }}>
                    <span style={{ color: '#fff' }}>{appt.pet_detail?.name}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{new Date(appt.date).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {selectedPatient && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
             <h2 style={{ color: '#fff', margin: 0 }}>Clinical Examination: {selectedPatient.pet_detail?.name}</h2>
             <button onClick={() => setSelectedPatient(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                <X size={24} />
             </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
               <h3 style={{ color: '#4ade80', fontSize: '1rem', marginBottom: '1rem' }}>Clinical Record Editor</h3>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Weight (kg)</label>
                    <input 
                      type="number" 
                      value={consultationData.vital_signs.weight}
                      onChange={(e) => setConsultationData({...consultationData, vital_signs: {...consultationData.vital_signs, weight: e.target.value}})}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Temp (°C)</label>
                    <input 
                      type="number" 
                      value={consultationData.vital_signs.temp}
                      onChange={(e) => setConsultationData({...consultationData, vital_signs: {...consultationData.vital_signs, temp: e.target.value}})}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} 
                    />
                  </div>
               </div>
               <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Consultation Notes</label>
               <textarea 
                  rows="6"
                  value={consultationData.notes}
                  onChange={(e) => setConsultationData({...consultationData, notes: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', marginBottom: '1.5rem' }}
               />

               <h3 style={{ color: '#22d3ee', fontSize: '1rem', marginBottom: '1rem' }}>Diagnostic Media (X-Rays / Reports)</h3>
               <div style={{ 
                  border: '2px dashed rgba(255,255,255,0.1)', 
                  borderRadius: 12, 
                  padding: '2rem', 
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.02)',
                  marginBottom: '2rem'
               }}>
                  <Upload size={32} color="#22d3ee" style={{ margin: '0 auto 1rem' }} />
                  <p style={{ color: '#fff', margin: 0, fontWeight: 600 }}>Click to upload media</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Supports JPG, PNG, DICOM (Max 50MB)</p>
                  <input type="file" style={{ display: 'none' }} id="file-upload" onChange={(e) => {
                      if(e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setSelectedFileName(file.name);
                          
                          const reader = new FileReader();
                          reader.onloadend = () => {
                              setConsultationData({...consultationData, media: reader.result});
                          };
                          reader.readAsDataURL(file);
                      }
                  }} />
                  {selectedFileName ? (
                      <div style={{ marginTop: '1rem', padding: '0.5rem', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 8, color: '#22d3ee', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <CheckCircle size={16} /> {selectedFileName}
                      </div>
                  ) : (
                      <button onClick={() => document.getElementById('file-upload').click()} className="btn btn-secondary" style={{ marginTop: '1rem', fontSize: '0.8rem' }}>Browse Files</button>
                  )}
               </div>

               <div style={{ display: 'flex', gap: '1rem' }}>
                 <button 
                  onClick={async () => {
                      if (!selectedPatient) return;
                      try {
                        const res = await authFetch('http://localhost:8000/api/clinical/consultations/', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            pet: selectedPatient.pet,
                            vital_signs: consultationData.vital_signs,
                            consultation_notes: consultationData.notes,
                            media_url: consultationData.media // This is now the Base64 string
                          })
                        });
                        if (res.ok) {
                          alert("Medical record successfully submitted!");
                          setSelectedPatient(null);
                          setConsultationData({ vital_signs: { weight: '', temp: '', heartRate: '' }, notes: '', media: null });
                          setSelectedFileName('');
                        }
                      } catch (err) {
                        console.error(err);
                      }
                  }}
                  style={{ padding: '0.75rem 1.5rem', borderRadius: 8, background: '#4ade80', color: '#000', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                 >Sign & Submit Record</button>
                 <button 
                  onClick={() => handleCompleteAppointment(selectedPatient.id)}
                  style={{ padding: '0.75rem 1.5rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                 >Mark Visit as Complete</button>
               </div>
            </div>

            <div>
               <h3 style={{ color: '#22d3ee', fontSize: '1rem', marginBottom: '1rem' }}>Pet Health Profile</h3>
               <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                     <img src={selectedPatient.pet_detail?.media_url || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150&h=150&fit=crop"} alt="Pet" style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'cover' }} />
                     <div>
                        <h4 style={{ color: '#fff', margin: 0 }}>{selectedPatient.pet_detail?.name}</h4>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Microchip: {selectedPatient.pet_detail?.microchip_id || 'N/A'}</p>
                     </div>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                     <strong>Owner's Note:</strong> {selectedPatient.reason || 'No specific concerns mentioned.'}
                  </p>
               </div>

               <Link 
                to={`/medical/${selectedPatient.pet}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#22d3ee', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '1.5rem', fontWeight: 600 }}
               >
                 <ImageIcon size={18} /> View Full Diagnostic History <ChevronRight size={16} />
               </Link>
               
               <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '1rem' }}>Previous Consultations</h4>
                  {patientHistory && patientHistory.medical_history && patientHistory.medical_history.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {patientHistory.medical_history.slice(0, 3).map(log => (
                              <div key={log.id} style={{ borderLeft: '3px solid #8b5cf6', paddingLeft: '1rem' }}>
                                  <p style={{ color: '#fff', fontSize: '0.85rem', margin: '0 0 0.25rem 0' }}>{new Date(log.date).toLocaleDateString()} - Dr. {log.vet_name}</p>
                                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{log.consultation_notes || 'No notes provided.'}</p>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
                         No previous clinical records found.
                      </p>
                  )}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VetDashboard;
