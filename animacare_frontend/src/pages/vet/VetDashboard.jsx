import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Stethoscope, FileText, BarChart2, Users,
  Calendar, Activity, TrendingUp, Clock, CheckCircle, ChevronRight, X, Upload, ImageIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';

const API_SCHEDULES = 'http://127.0.0.1:8000/api/clinical/vaccination-schedules';

/* ── Inline Vaccine Checklist Sub-Component ─────────── */
const VaccineChecklistInline = ({ options, petId, petDetail, age, authFetch }) => {
  const [checked, setChecked] = React.useState([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [existingSchedules, setExistingSchedules] = React.useState([]);
  const [loadingExisting, setLoadingExisting] = React.useState(true);
  const [justGenerated, setJustGenerated] = React.useState(null);

  // Fetch existing vaccination schedules for this pet from DB
  React.useEffect(() => {
    if (!petId) return;
    const fetchExisting = async () => {
      setLoadingExisting(true);
      try {
        const res = await authFetch(`http://127.0.0.1:8000/api/citizens/pets/${petId}/medical_report/`);
        if (res.ok) {
          const data = await res.json();
          setExistingSchedules(data.vaccination_schedules || []);
        }
      } catch (err) {
        console.error('Failed to fetch existing schedules:', err);
      }
      setLoadingExisting(false);
    };
    fetchExisting();
  }, [petId, authFetch]);

  const toggle = (key) => {
    setChecked(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleSave = async () => {
    if (checked.length === 0) return;
    setSubmitting(true);
    try {
      const res = await authFetch(`${API_SCHEDULES}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: petId,
          animal_type: (petDetail.species || '').toLowerCase(),
          animal_name: petDetail.name,
          date_of_birth: petDetail.dob,
          gender: (petDetail.gender || '').toLowerCase(),
          vaccines_given: checked,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setJustGenerated(data);
        setExistingSchedules(prev => [data, ...prev]);
        setChecked([]);
      } else {
        alert(data.error || 'Failed to generate schedule.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving vaccination data.');
    }
    setSubmitting(false);
  };

  const handleMarkItemComplete = async (scheduleId, itemId) => {
    try {
      const res = await authFetch(`${API_SCHEDULES}/${scheduleId}/mark-item/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId }),
      });
      if (res.ok) {
        setExistingSchedules(prev =>
          prev.map(s => s.id === scheduleId ? {
            ...s,
            items: s.items.map(i => i.id === itemId ? { ...i, is_completed: true } : i)
          } : s)
        );
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this vaccination schedule? This action cannot be undone.')) return;
    try {
      const res = await authFetch(`${API_SCHEDULES}/${scheduleId}/`, { method: 'DELETE' });
      if (res.ok || res.status === 204) {
        setExistingSchedules(prev => prev.filter(s => s.id !== scheduleId));
      } else {
        alert('Failed to delete schedule.');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting schedule.');
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const TRACK_LABELS = {
    puppy: 'Puppy', kitten: 'Kitten', cattle: 'Cattle',
    small_ruminant: 'Ruminant', poultry: 'Poultry', equine: 'Equine', custom: 'Custom',
  };

  return (
    <div>
      {/* ── Existing Schedules from DB ── */}
      {!loadingExisting && existingSchedules.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '0.6rem' }}>
            📋 Existing Vaccination Records
          </p>
          {existingSchedules.map(schedule => {
            const items = schedule.items || [];
            const vaccineItems = items.filter(i => i.item_type !== 'deworming');
            const completed = vaccineItems.filter(i => i.is_completed).length;
            const total = vaccineItems.length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <div key={schedule.id} style={{
                background: 'rgba(129,140,248,0.05)', border: '1px solid rgba(129,140,248,0.15)',
                borderRadius: 12, padding: '1rem', marginBottom: '0.75rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, color: '#818cf8', fontSize: '0.9rem' }}>
                      💉 {schedule.animal_name}
                    </span>
                    <span style={{
                      fontSize: '0.6rem', fontWeight: 700, padding: '0.08rem 0.4rem', borderRadius: 12,
                      background: 'rgba(129,140,248,0.12)', color: '#a78bfa', border: '1px solid rgba(129,140,248,0.25)',
                      textTransform: 'uppercase',
                    }}>
                      {TRACK_LABELS[schedule.track] || schedule.track}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                      {completed}/{total} done ({pct}%)
                    </span>
                    <button
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      title="Delete this vaccination schedule"
                      style={{
                        padding: '0.2rem 0.4rem', borderRadius: 5, border: '1px solid rgba(239,68,68,0.3)',
                        background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '0.65rem',
                        fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                      }}
                    >🗑 Delete</button>
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 6, height: 6, marginBottom: '0.6rem', overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%', borderRadius: 6,
                    background: pct === 100 ? '#4ade80' : 'linear-gradient(90deg, #818cf8, #6366f1)',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
                {/* Items list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: 220, overflowY: 'auto' }}>
                  {items
                    .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
                    .map(item => {
                      const isUpcoming = new Date(item.scheduled_date) >= new Date(new Date().toISOString().split('T')[0]);
                      return (
                        <div key={item.id} style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.35rem 0.5rem', borderRadius: 6,
                          background: item.is_completed ? 'rgba(74,222,128,0.04)' : 'rgba(255,255,255,0.02)',
                          fontSize: '0.78rem',
                        }}>
                          <span style={{
                            display: 'inline-flex', padding: '0.06rem 0.35rem', borderRadius: 4,
                            fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase',
                            background: item.item_type === 'deworming' ? 'rgba(251,191,36,0.15)' : item.item_type === 'annual' ? 'rgba(129,140,248,0.15)' : item.item_type === 'seasonal' ? 'rgba(34,211,238,0.15)' : 'rgba(74,222,128,0.15)',
                            color: item.item_type === 'deworming' ? '#fbbf24' : item.item_type === 'annual' ? '#818cf8' : item.item_type === 'seasonal' ? '#22d3ee' : '#4ade80',
                          }}>
                            {item.item_type === 'deworming' ? '🪱' : item.item_type === 'vaccine' ? '💉' : item.item_type === 'annual' ? '🔄' : '📅'}
                          </span>
                          <span style={{
                            flex: 1, fontWeight: 600,
                            color: item.is_completed ? 'rgba(255,255,255,0.3)' : '#fff',
                            textDecoration: item.is_completed ? 'line-through' : 'none',
                          }}>
                            {item.title}
                          </span>
                          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                            {formatDate(item.scheduled_date)}
                          </span>
                          {(() => {
                            const schedDate = new Date(item.scheduled_date + 'T00:00:00');
                            const now = new Date();
                            const todayStr = now.toISOString().split('T')[0];
                            const monthReached = (now.getFullYear() > schedDate.getFullYear()) ||
                              (now.getFullYear() === schedDate.getFullYear() && now.getMonth() >= schedDate.getMonth());
                            const isPast = item.scheduled_date < todayStr;
                            const daysUntil = Math.ceil((schedDate - now) / (1000*60*60*24));

                            if (item.is_completed) {
                              return (
                                <button
                                  onClick={() => handleMarkItemComplete(schedule.id, item.id)}
                                  title="Click to undo"
                                  style={{
                                    padding: '0.15rem 0.4rem', borderRadius: 5, fontSize: '0.62rem',
                                    border: '1px solid rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.15)',
                                    color: '#4ade80', fontWeight: 700, cursor: 'pointer',
                                  }}
                                >✓ Done</button>
                              );
                            } else if (monthReached) {
                              return (
                                <button
                                  onClick={() => handleMarkItemComplete(schedule.id, item.id)}
                                  style={{
                                    padding: '0.15rem 0.4rem', borderRadius: 5, fontSize: '0.62rem',
                                    border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.08)',
                                    color: '#4ade80', fontWeight: 700, cursor: 'pointer',
                                  }}
                                >Done</button>
                              );
                            } else if (isPast) {
                              return <span style={{ color: '#ef4444', fontSize: '0.62rem', fontWeight: 700, background: 'rgba(239,68,68,0.1)', padding: '0.1rem 0.3rem', borderRadius: 4 }}>Missed</span>;
                            } else {
                              return <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.58rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span>🔒</span>
                                <span>{daysUntil}d</span>
                              </span>;
                            }
                          })()}
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── New Vaccine Confirmation ── */}
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
        💉 Administer New Vaccines Today
      </p>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', marginBottom: '0.6rem' }}>
        Check which vaccines were given during this visit to generate future reminders:
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.85rem' }}>
        {options.map(v => (
          <label key={v.key} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.6rem 0.85rem', borderRadius: 8, cursor: 'pointer',
            background: checked.includes(v.key) ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${checked.includes(v.key) ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.06)'}`,
            transition: 'all 0.2s',
          }}>
            <input
              type="checkbox"
              checked={checked.includes(v.key)}
              onChange={() => toggle(v.key)}
              style={{ width: 15, height: 15, accentColor: '#4ade80' }}
            />
            <span style={{ fontWeight: 600, color: checked.includes(v.key) ? '#4ade80' : 'rgba(255,255,255,0.8)', fontSize: '0.82rem' }}>
              {v.label}
            </span>
          </label>
        ))}
      </div>
      <button
        disabled={checked.length === 0 || submitting}
        onClick={handleSave}
        style={{
          padding: '0.6rem 1.25rem', borderRadius: 10, border: 'none',
          background: checked.length > 0 ? 'linear-gradient(135deg, #818cf8, #6366f1)' : 'rgba(255,255,255,0.08)',
          color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: checked.length > 0 ? 'pointer' : 'not-allowed',
          opacity: checked.length > 0 ? 1 : 0.5, transition: 'all 0.2s',
        }}
      >
        {submitting ? '⏳ Generating...' : '💉 Save & Generate Future Timeline'}
      </button>

      {/* Show just-generated timeline */}
      {justGenerated && (
        <div style={{ marginTop: '1rem', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 12, padding: '1rem' }}>
          <p style={{ color: '#4ade80', fontWeight: 700, fontSize: '0.85rem', margin: '0 0 0.25rem 0' }}>
            ✅ New timeline generated with {(justGenerated.items || []).filter(i => i.item_type !== 'deworming').length} vaccine reminders!
          </p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', margin: 0 }}>
            📱 Owner has been notified. Deworming reminders set 4 days before each vaccine.
          </p>
        </div>
      )}
    </div>
  );
};

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
  
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadDate, setDownloadDate] = useState('');


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
    if (!window.confirm("Are you sure the details are correct? Click OK to complete the visit, or Cancel to edit details.")) return;
    
    try {
      const res = await authFetch(`http://localhost:8000/api/clinical/appointments/${id}/complete/`, {
        method: 'POST'
      });
      if (res.ok) {
        setAppointments(appointments.map(a => a.id === id ? { ...a, status: 'Completed' } : a));
        setSelectedPatient(null);
      } else {
        alert("Failed to mark visit as complete.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while marking the visit as complete.");
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#fff', margin: 0 }}>⚡ Recent Completed</h3>
                <button 
                  onClick={() => setShowDownloadModal(true)}
                  style={{ padding: '0.4rem 0.8rem', borderRadius: 8, background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)', color: '#22d3ee', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                >Download Reports</button>
              </div>
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

          {/* ── Vaccination Schedule Section ────────────────────── */}
          {selectedPatient.pet_detail && (() => {
            const species = (selectedPatient.pet_detail.species || '').toLowerCase();
            const dob = selectedPatient.pet_detail.dob;
            const gender = (selectedPatient.pet_detail.gender || '').toLowerCase();
            const petName = selectedPatient.pet_detail.name || 'Animal';

            // Age calculation
            const getAge = () => {
              if (!dob) return { weeks: 0, months: 0, label: 'Unknown' };
              const diffMs = new Date() - new Date(dob);
              const totalDays = Math.floor(diffMs / (1000*60*60*24));
              const weeks = Math.floor(totalDays / 7);
              const months = Math.floor(totalDays / 30.44);
              const years = Math.floor(totalDays / 365.25);
              let label;
              if (years >= 1) label = `${years}y ${months % 12}m`;
              else if (months >= 1) label = `${months}m ${weeks % 4}w`;
              else label = `${weeks}w (${totalDays}d)`;
              return { weeks, months, totalDays, label };
            };
            const age = getAge();

            // Vaccine options per species
            const VACCINES = {
              dog: [
                { key: 'dhppil_1', label: 'DHPPiL Dose 1 (6 Weeks)', min: 5 },
                { key: '7in1', label: '7-in-1 Combo Vaccine (10 Weeks)', min: 9 },
                { key: 'rabies_final', label: 'Final Booster + Anti-Rabies (14 Weeks)', min: 13 },
                { key: 'annual_rabies', label: 'Annual Anti-Rabies Booster', min: 52 },
              ],
              cat: [
                { key: 'fvrcp_1', label: 'FVRCP Dose 1 (6 Weeks)', min: 5 },
                { key: 'fvrcp_2', label: 'FVRCP Dose 2 (10 Weeks)', min: 9 },
                { key: 'fvrcp_3_rabies', label: 'FVRCP Dose 3 + Anti-Rabies (14 Weeks)', min: 13 },
                { key: 'annual_fvrcp', label: 'Annual FVRCP & Anti-Rabies', min: 52 },
              ],
              cow: [
                { key: 'fmd', label: 'Foot & Mouth Disease (FMD)' },
                { key: 'hs_bq', label: 'HS & Black Quarter' },
                { key: 'brucellosis', label: 'Brucellosis (Female 4-8 months)', genderRestrict: 'female' },
              ],
              bovine: [
                { key: 'fmd', label: 'Foot & Mouth Disease (FMD)' },
                { key: 'hs_bq', label: 'HS & Black Quarter' },
                { key: 'brucellosis', label: 'Brucellosis (Female 4-8 months)', genderRestrict: 'female' },
              ],
              sheep: [
                { key: 'ppr', label: 'PPR Vaccine' },
                { key: 'enterotoxaemia', label: 'Enterotoxaemia Vaccine' },
              ],
              goat: [
                { key: 'ppr', label: 'PPR Vaccine' },
                { key: 'enterotoxaemia', label: 'Enterotoxaemia Vaccine' },
              ],
              chicken: [
                { key: 'newcastle', label: 'Ranikhet / Newcastle Disease (Day 5)' },
                { key: 'gumboro', label: 'Gumboro Disease (Day 14)' },
              ],
              duck: [
                { key: 'newcastle', label: 'Ranikhet / Newcastle Disease' },
                { key: 'gumboro', label: 'Gumboro Disease' },
              ],
              horse: [
                { key: 'equine_flu', label: 'Annual Equine Influenza' },
              ],
            };

            const options = (VACCINES[species] || []).filter(v => {
              if (v.min && age.weeks < v.min) return false;
              if (v.genderRestrict && v.genderRestrict !== gender) return false;
              if (v.genderRestrict === 'female' && (species === 'cow' || species === 'bovine') && (age.months < 4 || age.months > 8)) return false;
              return true;
            });

            return (
              <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '2rem' }}>
                <h3 style={{ color: '#818cf8', fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  💉 Vaccination Schedule
                </h3>

                {/* Age + Gender vitals */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 10, padding: '0.85rem' }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Calculated Age</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#4ade80', marginTop: '0.2rem' }}>{age.label}</div>
                  </div>
                  <div style={{ background: 'rgba(129,140,248,0.06)', border: '1px solid rgba(129,140,248,0.15)', borderRadius: 10, padding: '0.85rem' }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Gender</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#818cf8', marginTop: '0.2rem' }}>{selectedPatient.pet_detail.gender || 'N/A'}</div>
                  </div>
                  <div style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)', borderRadius: 10, padding: '0.85rem' }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Visit Date</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#22d3ee', marginTop: '0.2rem' }}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  </div>
                </div>

                {/* Vaccine checkboxes */}
                {options.length === 0 ? (
                  <div style={{ padding: '1.25rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                    ⚠️ No standard vaccine blueprint found for <strong>{selectedPatient.pet_detail.species}</strong> at this age. Please consult local veterinary guidelines.
                  </div>
                ) : (
                  <VaccineChecklistInline
                    options={options}
                    petId={selectedPatient.pet}
                    petDetail={selectedPatient.pet_detail}
                    age={age}
                    authFetch={authFetch}
                  />
                )}
              </div>
            );
          })()}

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

      {showDownloadModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '500px' }}>
             <h2 style={{ color: '#fff', marginTop: 0 }}>Download Completed Visits</h2>
             <div style={{ marginBottom: '1.5rem' }}>
               <label style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '0.5rem' }}>Select Date</label>
               <input 
                 type="date" 
                 value={downloadDate} 
                 onChange={(e) => setDownloadDate(e.target.value)}
                 style={{ width: '100%', padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', colorScheme: 'dark' }}
               />
             </div>
             
             {downloadDate && (
               <div style={{ marginBottom: '1.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                 <h4 style={{ color: '#22d3ee', margin: '0 0 1rem 0' }}>Visits on {downloadDate}:</h4>
                 {appointments.filter(a => a.status === 'Completed' && new Date(a.date).toISOString().split('T')[0] === downloadDate).length > 0 ? (
                   appointments.filter(a => a.status === 'Completed' && new Date(a.date).toISOString().split('T')[0] === downloadDate).map(appt => (
                     <div key={appt.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 8, marginBottom: '0.5rem' }}>
                       <div style={{ color: '#fff', fontWeight: 600 }}>{appt.pet_detail?.name} {appt.pet_detail?.species ? `(${appt.pet_detail.species})` : ''}</div>
                       <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '0.25rem' }}>Owner: {appt.owner_name} | Time: {new Date(appt.date).toLocaleTimeString()}</div>
                     </div>
                   ))
                 ) : (
                   <p style={{ color: 'rgba(255,255,255,0.4)' }}>No completed visits found for this date.</p>
                 )}
               </div>
             )}

             <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => {
                    setShowDownloadModal(false);
                    setDownloadDate('');
                  }}
                  style={{ padding: '0.75rem 1.5rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                >Cancel</button>
                <button 
                  onClick={() => {
                    const filtered = appointments.filter(a => a.status === 'Completed' && new Date(a.date).toISOString().split('T')[0] === downloadDate);
                    if (filtered.length === 0) return;
                    const text = filtered.map(a => `Date: ${new Date(a.date).toLocaleString()}\nPet: ${a.pet_detail?.name} (${a.pet_detail?.species || 'N/A'})\nOwner: ${a.owner_name}\n`).join('\n---\n\n');
                    const blob = new Blob([text], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Completed_Visits_${downloadDate}.txt`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    setShowDownloadModal(false);
                    setDownloadDate('');
                  }}
                  disabled={!downloadDate || appointments.filter(a => a.status === 'Completed' && new Date(a.date).toISOString().split('T')[0] === downloadDate).length === 0}
                  style={{ padding: '0.75rem 1.5rem', borderRadius: 8, background: '#22d3ee', color: '#000', fontWeight: 700, border: 'none', cursor: 'pointer', opacity: (!downloadDate || appointments.filter(a => a.status === 'Completed' && new Date(a.date).toISOString().split('T')[0] === downloadDate).length === 0) ? 0.5 : 1 }}
                >Download</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VetDashboard;
