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
    zoonotic_disease_flag: '',
    media: null
  });
  const [patientHistory, setPatientHistory] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState(null);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await authFetch('http://localhost:8000/api/clinical/appointments/');
        if (res.ok) {
          const data = await res.json();
          setAppointments(data.results || (Array.isArray(data) ? data : []));
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
      setShowHistory(false);
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
          zoonotic_disease_flag: consultationData.zoonotic_disease_flag || null,
          media_url: consultationData.media ? "https://images.unsplash.com/photo-1574701292021-99529ccf0e21?auto=format&fit=crop&q=80&w=400" : null
        })
      });
      if (res.ok) {
        alert("Medical record successfully submitted!");
        const updatedHistoryRes = await authFetch(`http://localhost:8000/api/citizens/pets/${selectedPatient.pet}/medical_report/`);
        if (updatedHistoryRes.ok) {
          setPatientHistory(await updatedHistoryRes.json());
        }
        setConsultationData({ vital_signs: { weight: '', temp: '', heartRate: '' }, notes: '', zoonotic_disease_flag: '', media: null });
        setSelectedFileName('');
      } else {
        const errText = await res.text();
        alert("Failed to save: " + errText);
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
                          <h4 style={{ color: '#fff', margin: 0 }}>{appt.pet_detail?.name}{appt.pet_detail?.species ? ` (${appt.pet_detail.species})` : ''}</h4>
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
                  <div key={appt.id} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flex: 1 }}>
                    <span style={{ color: '#fff' }}>{appt.pet_detail?.name}{appt.pet_detail?.species ? ` (${appt.pet_detail.species})` : ''}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>• {new Date(appt.date).toLocaleDateString()}</span>
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
             <h2 style={{ color: '#fff', margin: 0 }}>Clinical Examination: {selectedPatient.pet_detail?.name}{selectedPatient.pet_detail?.species ? ` (${selectedPatient.pet_detail.species})` : ''}</h2>
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

               <label style={{ display: 'block', color: '#ef4444', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 600 }}>⚠️ Report Communicable Disease (Civic Alert)</label>
               <select 
                  value={consultationData.zoonotic_disease_flag}
                  onChange={(e) => setConsultationData({...consultationData, zoonotic_disease_flag: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fff', marginBottom: '1.5rem', outline: 'none' }}
               >
                  <option value="">None (Routine Case)</option>
                  <option value="Rabies">Rabies</option>
                  <option value="Canine Parvovirus">Canine Parvovirus</option>
                  <option value="Avian Flu">Avian Flu (H5N1)</option>
                  <option value="Feline Leukemia">Feline Leukemia</option>
               </select>

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
                            zoonotic_disease_flag: consultationData.zoonotic_disease_flag || null,
                            media_url: consultationData.media // This is now the Base64 string
                          })
                        });
                        if (res.ok) {
                          alert("Medical record successfully submitted!");
                          const updatedHistoryRes = await authFetch(`http://localhost:8000/api/citizens/pets/${selectedPatient.pet}/medical_report/`);
                          if (updatedHistoryRes.ok) {
                            setPatientHistory(await updatedHistoryRes.json());
                          }
                          setConsultationData({ vital_signs: { weight: '', temp: '', heartRate: '' }, notes: '', zoonotic_disease_flag: '', media: null });
                          setSelectedFileName('');
                        } else {
                          const errText = await res.text();
                          alert("Failed to save: " + errText);
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
               <h3 style={{ color: '#22d3ee', fontSize: '1rem', marginBottom: '1rem' }}>Pet / Livestock Profile</h3>
               <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                     <img src={selectedPatient.pet_detail?.media_url || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150&h=150&fit=crop"} alt="Pet" style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'cover' }} />
                     <div>
                        <h4 style={{ color: '#fff', margin: 0 }}>{selectedPatient.pet_detail?.name}</h4>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                           Microchip/RFID: {patientHistory?.pet?.rfid_tag || 'Not Registered'}
                        </p>
                     </div>
                  </div>

                  {patientHistory?.pet && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                       <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>Species:</span> <span style={{ color: '#fff' }}>{patientHistory.pet.species}</span></div>
                       {patientHistory.pet.breed && <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>Breed:</span> <span style={{ color: '#fff' }}>{patientHistory.pet.breed}</span></div>}
                       {patientHistory.pet.livestock_type && <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>Type:</span> <span style={{ color: '#fff' }}>{patientHistory.pet.livestock_type}</span></div>}
                       <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>Gender:</span> <span style={{ color: '#fff' }}>{patientHistory.pet.gender || 'N/A'}</span></div>
                       <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>DOB:</span> <span style={{ color: '#fff' }}>{patientHistory.pet.dob ? new Date(patientHistory.pet.dob).toLocaleDateString() : 'Unknown'}</span></div>
                       <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>Status:</span> <span style={{ color: patientHistory.pet.health_status === 'Healthy' ? '#4ade80' : '#f59e0b' }}>{patientHistory.pet.health_status}</span></div>
                    </div>
                  )}

                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                     <p style={{ color: '#22d3ee', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem 0', fontWeight: 600 }}>Owner's Stated Reason for Visit</p>
                     <p style={{ color: '#fff', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                        {selectedPatient.reason || 'No specific concerns mentioned.'}
                     </p>
                  </div>
               </div>

               <button 
                onClick={() => setShowHistory(!showHistory)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#22d3ee', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '1.5rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
               >
                 <ImageIcon size={18} /> View Full Diagnostic History <ChevronRight size={16} style={{ transform: showHistory ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
               </button>
               
               {showHistory && patientHistory ? (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Vet Consultations */}
                    <div>
                        <h4 style={{ color: '#4ade80', fontSize: '0.95rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Activity size={18} /> Clinical Encounters (Veterinarian)
                        </h4>
                        {patientHistory.medical_history && patientHistory.medical_history.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {patientHistory.medical_history.map(log => (
                                    <div 
                                      key={`med-${log.id}`} 
                                      className="glass-panel" 
                                      style={{ padding: '1.25rem', borderLeft: '4px solid #4ade80', cursor: 'pointer' }}
                                      onClick={() => setSelectedConsultation(log)}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>Dr. {log.vet_name || 'Veterinarian'}</span>
                                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{new Date(log.date).toLocaleDateString()}</span>
                                        </div>
                                        {log.vital_signs && (
                                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', margin: '0 0 0.75rem 0' }}>
                                                Vitals: {log.vital_signs.weight ? `${log.vital_signs.weight}kg` : ''} {log.vital_signs.temp ? `| ${log.vital_signs.temp}°C` : ''}
                                            </p>
                                        )}
                                        <p style={{ color: '#fff', fontSize: '0.85rem', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {log.consultation_notes || 'No notes provided.'}
                                        </p>
                                        <p style={{ color: '#4ade80', fontSize: '0.75rem', margin: '0.75rem 0 0 0', fontWeight: 600 }}>Click to view details</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: 0 }}>No previous clinical records found.</p>
                            </div>
                        )}
                    </div>

                    {/* Owner Self Reports */}
                    <div>
                        <h4 style={{ color: '#8b5cf6', fontSize: '0.95rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Users size={18} /> Self-Reported Details (Owner)
                        </h4>
                        {patientHistory.self_reports && patientHistory.self_reports.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {patientHistory.self_reports.map(report => (
                                    <div key={`self-${report.id}`} className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{report.title}</span>
                                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{new Date(report.date).toLocaleDateString()}</span>
                                        </div>
                                        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>{report.description || 'No description provided.'}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: 0 }}>No self-reported details found.</p>
                            </div>
                        )}
                    </div>
                 </div>
               ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Consultation Details Modal */}
      {selectedConsultation && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}>
            <button onClick={() => setSelectedConsultation(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <X size={24} />
            </button>
            
            <h2 style={{ color: '#4ade80', marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={24} /> Consultation Details
            </h2>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '0 0 0.5rem 0' }}>Date: <span style={{ color: '#fff' }}>{new Date(selectedConsultation.date).toLocaleDateString()}</span></p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '0 0 0.5rem 0' }}>Attending Vet: <span style={{ color: '#fff' }}>Dr. {selectedConsultation.vet_name || 'Veterinarian'}</span></p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 8, marginBottom: '1.5rem' }}>
              <h4 style={{ color: '#fff', margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Vital Signs</h4>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: 0 }}>
                {selectedConsultation.vital_signs ? 
                  `Weight: ${selectedConsultation.vital_signs.weight || 'N/A'}kg | Temp: ${selectedConsultation.vital_signs.temp || 'N/A'}°C` 
                  : 'No vitals recorded.'}
              </p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 8, marginBottom: '1.5rem' }}>
              <h4 style={{ color: '#fff', margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Consultation Notes</h4>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>
                {selectedConsultation.consultation_notes || 'No notes provided.'}
              </p>
            </div>

            {selectedConsultation.zoonotic_disease_flag && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1rem', borderRadius: 8, marginBottom: '1.5rem' }}>
                <h4 style={{ color: '#ef4444', margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>⚠️ Civic Alert</h4>
                <p style={{ color: '#fff', fontSize: '0.85rem', margin: 0 }}>{selectedConsultation.zoonotic_disease_flag}</p>
              </div>
            )}

            <div>
              <h4 style={{ color: '#fff', margin: '0 0 1rem 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ImageIcon size={18} color="#22d3ee" /> Diagnostic Media
              </h4>
              {selectedConsultation.media_url ? (
                <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <img src={selectedConsultation.media_url} alt="Diagnostic Media" style={{ width: '100%', display: 'block' }} />
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <ImageIcon size={32} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 0.5rem' }} />
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: 0 }}>No diagnostic images available for this consultation.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VetDashboard;
