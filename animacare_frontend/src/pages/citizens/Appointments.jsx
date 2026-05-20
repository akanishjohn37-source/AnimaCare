import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Clock, User, Plus, CheckCircle, AlertCircle, Trash2, MapPin, Stethoscope, ChevronRight, X, ChevronDown, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00"
];

const Appointments = () => {
  const { user, authFetch } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [vets, setVets] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedVet, setSelectedVet] = useState(null);
  const [newAppt, setNewAppt] = useState({
    pet: '',
    vet: '',
    date: '',
    time: '09:00',
    reason: ''
  });

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [apptsRes, vetsRes, petsRes] = await Promise.all([
          authFetch('http://localhost:8000/api/clinical/appointments/'),
          authFetch('http://localhost:8000/api/auth/vets/'),
          authFetch('http://localhost:8000/api/citizens/pets/')
        ]);
        
        if (apptsRes.ok) setAppointments(await apptsRes.json());
        if (vetsRes.ok) setVets(await vetsRes.json());
        if (petsRes.ok) setPets(await petsRes.json());
      } catch (err) {
        console.error("Fetch data error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [authFetch]);

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    if (!newAppt.pet || (!newAppt.vet && !selectedVet)) {
        alert("Please select a pet and veterinarian.");
        return;
    }
    try {
      const dateTime = `${newAppt.date}T${newAppt.time}:00Z`;
      const res = await authFetch('http://localhost:8000/api/clinical/appointments/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet: newAppt.pet,
          vet: newAppt.vet || selectedVet?.id,
          date: dateTime,
          reason: newAppt.reason
        })
      });
      if (res.ok) {
        const created = await res.json();
        setAppointments([...appointments, created]);
        setShowModal(false);
        setSelectedVet(null);
        setNewAppt({ pet: '', vet: '', date: '', time: '09:00', reason: '' });
      } else {
        const errData = await res.json();
        alert(`Error: ${JSON.stringify(errData)}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      const res = await authFetch(`http://localhost:8000/api/clinical/appointments/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setAppointments(appointments.map(a => a.id === id ? { ...a, status } : a));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearCancelled = async () => {
    const cancelled = appointments.filter(a => a.status === 'Cancelled');
    if (cancelled.length === 0) return;
    try {
      await Promise.all(cancelled.map(a => 
        authFetch(`http://localhost:8000/api/clinical/appointments/${a.id}/`, { method: 'DELETE' })
      ));
      setAppointments(appointments.filter(a => a.status !== 'Cancelled'));
    } catch (err) {
      console.error(err);
    }
  };

  const openBookingForVet = (vet) => {
    setSelectedVet(vet);
    setNewAppt({ ...newAppt, vet: vet.id });
    setShowModal(true);
  };

  const inputStyle = {
    width: '100%',
    padding: '0.85rem 1rem',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    outline: 'none',
    fontSize: '0.9rem',
    transition: 'all 0.2s ease',
    appearance: 'none',
    cursor: 'pointer',
    colorScheme: 'dark'
  };

  const labelStyle = {
    display: 'block',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.75rem',
    fontWeight: 600,
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>Vet Appointments</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem' }}>Discover specialized care and manage your pet's clinical schedule.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {appointments.some(a => a.status === 'Cancelled') && (
            <button onClick={handleClearCancelled} className="btn btn-secondary" style={{ border: '1px solid #ef4444', color: '#ef4444' }}>
              Clear Cancelled
            </button>
          )}
          <button 
            onClick={() => { setSelectedVet(null); setShowModal(true); }}
            className="btn btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 8px 24px rgba(139,92,246,0.3)' }}
          >
            <Plus size={18} /> Quick Book
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Veterinarians List */}
        <div>
          <h2 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Stethoscope size={20} className="icon-accent" /> Veterinarians Directory
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            {vets.map(vet => (
              <motion.div 
                key={vet.id}
                whileHover={{ y: -4, backgroundColor: 'rgba(255,255,255,0.03)' }}
                className="glass-panel"
                style={{ padding: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.2rem' }}>
                  <img 
                    src={vet.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(vet.username)}&background=8b5cf6&color=fff`} 
                    alt={vet.username} 
                    style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover', border: '2px solid rgba(139,92,246,0.3)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <h3 style={{ color: '#fff', margin: 0, fontSize: '1.1rem' }}>Dr. {vet.first_name || vet.username} {vet.last_name}</h3>
                    <p style={{ color: '#22d3ee', fontSize: '0.75rem', fontWeight: 600, margin: '4px 0' }}>{vet.veterinarian_profile?.specialization || 'General Veterinarian'}</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                       <MapPin size={12} /> {vet.veterinarian_profile?.clinic_hospital_name || 'AnimaCare Clinic'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => openBookingForVet(vet)}
                  className="btn btn-secondary" 
                  style={{ width: '100%', fontSize: '0.85rem', padding: '0.6rem', background: 'rgba(255,255,255,0.05)' }}
                >
                  Schedule Visit
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Your Visits */}
        <div>
          <h2 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Calendar size={20} className="icon-accent" /> Upcoming Visits
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {loading ? <p>Loading...</p> : appointments.length > 0 ? (
              appointments.sort((a,b) => new Date(a.date) - new Date(b.date)).map(appt => (
                <div 
                  key={appt.id}
                  className="glass-panel"
                  style={{ padding: '1.2rem', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                         <h4 style={{ color: '#fff', margin: 0, fontSize: '1rem' }}>{appt.pet_detail?.name}</h4>
                         <span className={`badge ${appt.status === 'Completed' ? 'badge-success' : appt.status === 'Cancelled' ? 'badge-secondary' : 'badge-primary'}`} style={{ fontSize: '0.6rem' }}>
                            {appt.status}
                         </span>
                      </div>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: '2px 0' }}>Dr. {appt.vet_name}</p>
                      <p style={{ color: '#8b5cf6', fontSize: '0.75rem', fontWeight: 600, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                         <Clock size={12} /> {new Date(appt.date).toLocaleDateString()} • {new Date(appt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {appt.status === 'Scheduled' && (
                      <button 
                        onClick={() => handleStatusUpdate(appt.id, 'Cancelled')} 
                        style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem', textAlign: 'center' }}>No visits scheduled.</p>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
      {showModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(12px)'
          }}
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="glass-panel" 
            style={{ width: '100%', maxWidth: 500, padding: '2.5rem', position: 'relative', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
          >
            <button onClick={() => { setShowModal(false); setSelectedVet(null); }} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
               <X size={24} />
            </button>
            
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
               <h2 style={{ color: '#fff', margin: 0, fontSize: '1.75rem' }}>{selectedVet ? `Visit Dr. ${selectedVet.first_name}` : 'New Appointment'}</h2>
               <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Select your pet and choose a preferred time slot.</p>
            </div>

            <form onSubmit={handleCreateAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ position: 'relative' }}>
                <label style={labelStyle}>Select Pet</label>
                <div style={{ position: 'relative' }}>
                  <select 
                    required
                    value={newAppt.pet}
                    onChange={(e) => setNewAppt({...newAppt, pet: e.target.value})}
                    style={inputStyle}
                  >
                    <option value="" style={{ background: '#1e293b', color: '#fff' }}>-- Choose Your Pet --</option>
                    {pets.map(p => (
                      <option key={p.id} value={p.id} style={{ background: '#1e293b', color: '#fff' }}>
                        {p.name} ({p.species}{p.breed ? ` - ${p.breed}` : ''})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                </div>
              </div>

              {!selectedVet && (
                <div style={{ position: 'relative' }}>
                  <label style={labelStyle}>Select Veterinarian</label>
                  <div style={{ position: 'relative' }}>
                    <select 
                      required
                      value={newAppt.vet}
                      onChange={(e) => setNewAppt({...newAppt, vet: e.target.value})}
                      style={inputStyle}
                    >
                      <option value="" style={{ background: '#1e293b', color: '#fff' }}>-- Choose Veterinarian --</option>
                      {vets.map(v => <option key={v.id} value={v.id} style={{ background: '#1e293b', color: '#fff' }}>Dr. {v.username}</option>)}
                    </select>
                    <ChevronDown size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem' }}>
                <div style={{ position: 'relative' }}>
                  <label style={labelStyle}>Preferred Date</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="date" 
                      required
                      min={today}
                      value={newAppt.date}
                      onChange={(e) => setNewAppt({...newAppt, date: e.target.value})}
                      style={{ ...inputStyle, paddingRight: '2.5rem' }} 
                    />
                    <CalendarDays size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                  </div>
                </div>
                <div style={{ position: 'relative' }}>
                  <label style={labelStyle}>Time Slot</label>
                  <div style={{ position: 'relative' }}>
                    <select 
                      required
                      value={newAppt.time}
                      onChange={(e) => setNewAppt({...newAppt, time: e.target.value})}
                      style={inputStyle}
                    >
                      {TIME_SLOTS.map(slot => <option key={slot} value={slot} style={{ background: '#1e293b', color: '#fff' }}>{slot}</option>)}
                    </select>
                    <ChevronDown size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                  </div>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Reason for Examination</label>
                <textarea 
                  rows="3"
                  value={newAppt.reason}
                  onChange={(e) => setNewAppt({...newAppt, reason: e.target.value})}
                  placeholder="Describe your pet's symptoms or visit reason..."
                  style={{ ...inputStyle, resize: 'none', appearance: 'auto', cursor: 'text' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', padding: '1rem', fontWeight: 700, fontSize: '1rem' }}>Confirm Booking</button>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <style>{`
        select option {
          background-color: #0f172a !important;
          color: white !important;
          padding: 12px !important;
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
          background: transparent;
          bottom: 0;
          color: transparent;
          cursor: pointer;
          height: auto;
          left: 0;
          position: absolute;
          right: 0;
          top: 0;
          width: auto;
        }
        .icon-accent {
          color: #8b5cf6;
        }
      `}</style>
    </div>
  );
};

export default Appointments;
