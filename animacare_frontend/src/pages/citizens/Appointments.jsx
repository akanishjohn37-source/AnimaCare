import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Clock, User, Plus, CheckCircle, AlertCircle, Trash2, MapPin, Stethoscope, ChevronRight, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


const Appointments = () => {
  const { user, authFetch } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [vets, setVets] = useState([]);
  const [pets, setPets] = useState([]);
  const [livestock, setLivestock] = useState([]);
  const [slots, setSlots] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedVet, setSelectedVet] = useState(null);

  // New slot-based booking states
  const [animalType, setAnimalType] = useState('pet'); // 'pet' or 'livestock'
  const [selectedAnimalId, setSelectedAnimalId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [bookingReason, setBookingReason] = useState('');
  const [quickVetId, setQuickVetId] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const fetchAppointmentsAndSlots = async () => {
    try {
      const [apptsRes, slotsRes, holidaysRes] = await Promise.all([
        authFetch('http://localhost:8000/api/clinical/appointments/'),
        authFetch('http://localhost:8000/api/clinical/slots/'),
        authFetch('http://localhost:8000/api/clinical/schedule-days/')
      ]);
      if (apptsRes.ok) {
        const d = await apptsRes.json();
        setAppointments(d.results || (Array.isArray(d) ? d : []));
      }
      if (slotsRes.ok) {
        const d = await slotsRes.json();
        setSlots(d.results || (Array.isArray(d) ? d : []));
      }
      if (holidaysRes.ok) {
        const d = await holidaysRes.json();
        setHolidays(d.results || (Array.isArray(d) ? d : []));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (animalType === 'pet' && pets.length > 0 && !selectedAnimalId) {
      setSelectedAnimalId(pets[0].id.toString());
    } else if (animalType === 'livestock' && livestock.length > 0 && !selectedAnimalId) {
      setSelectedAnimalId(livestock[0].id.toString());
    }
  }, [animalType, pets, livestock, selectedAnimalId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [apptsRes, vetsRes, petsRes, livestockRes, slotsRes, holidaysRes] = await Promise.all([
          authFetch('http://localhost:8000/api/clinical/appointments/'),
          authFetch('http://localhost:8000/api/auth/vets/'),
          authFetch('http://localhost:8000/api/citizens/pets/'),
          authFetch('http://localhost:8000/api/citizens/livestocks/'),
          authFetch('http://localhost:8000/api/clinical/slots/'),
          authFetch('http://localhost:8000/api/clinical/schedule-days/')
        ]);
        
        if (apptsRes.ok) { const d = await apptsRes.json(); setAppointments(d.results || (Array.isArray(d) ? d : [])); }
        if (vetsRes.ok) { const d = await vetsRes.json(); setVets(d.results || (Array.isArray(d) ? d : [])); }
        if (petsRes.ok) { const d = await petsRes.json(); setPets(d.results || (Array.isArray(d) ? d : [])); }
        if (livestockRes.ok) { const d = await livestockRes.json(); setLivestock(d.results || (Array.isArray(d) ? d : [])); }
        if (slotsRes.ok) { const d = await slotsRes.json(); setSlots(d.results || (Array.isArray(d) ? d : [])); }
        if (holidaysRes.ok) { const d = await holidaysRes.json(); setHolidays(d.results || (Array.isArray(d) ? d : [])); }
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
    const vetId = selectedVet?.id || (quickVetId ? parseInt(quickVetId) : null);
    if (!selectedAnimalId || !vetId || !selectedSlotId) {
        alert("Please select an animal, veterinarian, and slot.");
        return;
    }
    const [slotIdStr, slotDate] = selectedSlotId.split('_');
    const selectedSlot = slots.find(s => s.id === parseInt(slotIdStr) && s.date === slotDate);
    if (!selectedSlot) {
        alert("Selected slot is invalid.");
        return;
    }

    try {
      const dateTime = `${selectedSlot.date}T${selectedSlot.start_time}`;
      const payload = {
        vet: vetId,
        slot: selectedSlot.id,
        date: dateTime,
        reason: bookingReason
      };
      if (animalType === 'pet') {
        payload.pet = parseInt(selectedAnimalId);
        payload.livestock = null;
      } else {
        payload.livestock = parseInt(selectedAnimalId);
        payload.pet = null;
      }

      const res = await authFetch('http://localhost:8000/api/clinical/appointments/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await fetchAppointmentsAndSlots();
        setShowModal(false);
        setSelectedVet(null);
        setSelectedAnimalId('');
        setSelectedSlotId('');
        setBookingReason('');
        setQuickVetId('');
        alert("Appointment booked successfully!");
      } else {
        const errData = await res.json();
        alert(`Error booking appointment: ${JSON.stringify(errData)}`);
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
        await fetchAppointmentsAndSlots();
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
      await fetchAppointmentsAndSlots();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearCompleted = async () => {
    const completed = appointments.filter(a => a.status === 'Completed');
    if (completed.length === 0) return;
    if (!window.confirm("Are you sure you want to clear all completed appointments?")) return;
    try {
      await Promise.all(completed.map(a => 
        authFetch(`http://localhost:8000/api/clinical/appointments/${a.id}/`, { method: 'DELETE' })
      ));
      await fetchAppointmentsAndSlots();
    } catch (err) {
      console.error(err);
    }
  };

  const openBookingForVet = (vet) => {
    setSelectedVet(vet);
    setQuickVetId(vet.id);
    setSelectedDate('');
    setSelectedSlotId('');
    setShowModal(true);
    // Refresh slots to include any newly created slots by the vet
    fetchAppointmentsAndSlots();
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
            onClick={() => { setSelectedVet(null); setQuickVetId(''); setSelectedDate(''); setSelectedSlotId(''); setShowModal(true); fetchAppointmentsAndSlots(); }}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ color: '#fff', fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Calendar size={20} className="icon-accent" /> Upcoming Visits
            </h2>
            {appointments.some(a => a.status === 'Completed') && (
              <button 
                onClick={handleClearCompleted} 
                className="btn btn-secondary" 
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', border: '1px solid #10b981', color: '#10b981' }}
              >
                Clear Completed
              </button>
            )}
          </div>
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
                         <h4 style={{ color: '#fff', margin: 0, fontSize: '1rem' }}>
                           {appt.pet_detail ? appt.pet_detail.name : (appt.livestock_detail ? appt.livestock_detail.name : 'Unknown Animal')}
                           {(appt.pet_detail?.species || appt.livestock_detail?.species) ? ` (${appt.pet_detail?.species || appt.livestock_detail?.species})` : ''}
                         </h4>
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
            <button onClick={() => { setShowModal(false); setSelectedVet(null); setSelectedDate(''); setSelectedSlotId(''); }} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
               <X size={24} />
            </button>
            
             <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{ color: '#fff', margin: 0, fontSize: '1.75rem' }}>{selectedVet ? `Visit Dr. ${selectedVet.first_name || selectedVet.username}` : 'New Appointment'}</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Select your animal and choose an available consultation slot.</p>
             </div>
 
             <form onSubmit={handleCreateAppointment} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                 <div>
                   <label style={labelStyle}>Animal Type</label>
                   <div style={{ position: 'relative' }}>
                     <select 
                       value={animalType}
                       onChange={(e) => {
                         setAnimalType(e.target.value);
                         setSelectedAnimalId('');
                       }}
                       style={inputStyle}
                     >
                       <option value="pet">Pet</option>
                       <option value="livestock">Livestock</option>
                     </select>
                     <ChevronDown size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                   </div>
                 </div>
 
                 <div>
                   <label style={labelStyle}>Select {animalType === 'pet' ? 'Pet' : 'Livestock'}</label>
                   <div style={{ position: 'relative' }}>
                     <select 
                       required
                       value={selectedAnimalId}
                       onChange={(e) => setSelectedAnimalId(e.target.value)}
                       style={inputStyle}
                     >
                       <option value="">-- Choose {animalType === 'pet' ? 'Pet' : 'Livestock'} --</option>
                       {animalType === 'pet' ? (
                         pets.map(p => (
                           <option key={p.id} value={p.id}>
                             {p.name} ({p.species})
                           </option>
                         ))
                       ) : (
                         livestock.map(l => (
                           <option key={l.id} value={l.id}>
                             {l.name} ({l.species})
                           </option>
                         ))
                       )}
                     </select>
                     <ChevronDown size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                   </div>
                 </div>
               </div>
 
               {!selectedVet && (
                 <div style={{ position: 'relative' }}>
                   <label style={labelStyle}>Select Veterinarian</label>
                   <div style={{ position: 'relative' }}>
                     <select 
                       required
                       value={quickVetId}
                        onChange={(e) => {
                          setQuickVetId(e.target.value);
                          setSelectedDate('');
                          setSelectedSlotId('');
                        }}
                     >
                       <option value="">-- Choose Veterinarian --</option>
                       {vets.map(v => <option key={v.id} value={v.id}>Dr. {v.first_name || v.username} {v.last_name}</option>)}
                     </select>
                     <ChevronDown size={16} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                   </div>
                 </div>
               )}
 
                {/* Custom Calendar Date & Slot Picker */}
                {(() => {
                  const activeVetId = selectedVet?.id || (quickVetId ? parseInt(quickVetId) : null);
                  if (!activeVetId) {
                    return (
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginTop: '0.3rem' }}>
                        Please select a veterinarian first to see available dates and slots.
                      </p>
                    );
                  }

                  const getLocalDateString = (year, month, day) => {
                    const y = year;
                    const m = String(month + 1).padStart(2, '0');
                    const d = String(day).padStart(2, '0');
                    return `${y}-${m}-${d}`;
                  };

                  // Calculate days in the current calendarMonth
                  const year = calendarMonth.getFullYear();
                  const month = calendarMonth.getMonth();
                  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday, 6 is Saturday
                  const totalDays = new Date(year, month + 1, 0).getDate();

                  // Get bounds for 30-day range
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const maxDate = new Date(today);
                  maxDate.setDate(today.getDate() + 30);

                  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

                  const handlePrevMonth = () => {
                    const prev = new Date(year, month - 1, 1);
                    setCalendarMonth(prev);
                  };

                  const handleNextMonth = () => {
                    const next = new Date(year, month + 1, 1);
                    setCalendarMonth(next);
                  };

                  // Days grid construction
                  const dayCells = [];
                  // Padding cells
                  for (let i = 0; i < firstDayIndex; i++) {
                    dayCells.push(<div key={`pad-${i}`} style={{ height: '36px' }} />);
                  }
                  // Day cells
                  for (let d = 1; d <= totalDays; d++) {
                    const cellDateStr = getLocalDateString(year, month, d);
                    const cellDateObj = new Date(year, month, d);
                    
                    const isSunday = cellDateObj.getDay() === 0;
                    const holidayObj = holidays.find(h => h.vet === activeVetId && h.date === cellDateStr && h.status === 'holiday');
                    const isHoliday = !!holidayObj;
                    const isUnselectable = isSunday || isHoliday;
                    
                    const isOutside = cellDateObj < today || cellDateObj > maxDate;
                    const isSelected = selectedDate === cellDateStr;

                    dayCells.push(
                      <div
                        key={`day-${d}`}
                        onClick={() => {
                          if (!isOutside && !isUnselectable) {
                            setSelectedDate(cellDateStr);
                            setSelectedSlotId('');
                          }
                        }}
                        style={{
                          height: '36px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '6px',
                          cursor: isOutside ? 'default' : isUnselectable ? 'not-allowed' : 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: isSelected ? 700 : 500,
                          transition: 'all 0.2s ease',
                          opacity: isOutside ? 0.25 : 1,
                          border: isSelected 
                            ? '1px solid #22d3ee' 
                            : isUnselectable && !isOutside
                              ? '1px solid rgba(239, 68, 68, 0.3)' 
                              : '1px solid transparent',
                          background: isSelected 
                            ? 'rgba(34, 211, 238, 0.2)' 
                            : isUnselectable && !isOutside
                              ? 'rgba(239, 68, 68, 0.05)' 
                              : 'rgba(255, 255, 255, 0.02)',
                          color: isOutside 
                            ? 'rgba(255,255,255,0.3)' 
                            : isUnselectable 
                              ? '#ef4444' 
                              : isSelected 
                                ? '#22d3ee' 
                                : '#fff',
                        }}
                        title={isHoliday ? (holidayObj.description || 'Holiday') : isSunday ? 'Sunday' : ''}
                      >
                        <span>{d}</span>
                        {isHoliday && (
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#ef4444', marginTop: '1px' }} />
                        )}
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {/* Date Section (Calendar Picker) */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <label style={{ ...labelStyle, margin: 0 }}>Select Date</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <button
                              type="button"
                              onClick={handlePrevMonth}
                              style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '4px',
                                color: '#fff',
                                padding: '2px 6px',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                              }}
                            >
                              &lt;
                            </button>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', minWidth: '85px', textAlign: 'center' }}>
                              {monthNames[month]} {year}
                            </span>
                            <button
                              type="button"
                              onClick={handleNextMonth}
                              style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '4px',
                                color: '#fff',
                                padding: '2px 6px',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                              }}
                            >
                              &gt;
                            </button>
                          </div>
                        </div>

                        <div style={{
                          background: 'rgba(0, 0, 0, 0.2)',
                          borderRadius: '10px',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          padding: '0.75rem'
                        }}>
                          {/* Weekday headers */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            textAlign: 'center',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            color: 'rgba(255,255,255,0.4)',
                            marginBottom: '0.5rem'
                          }}>
                            <span>Sun</span>
                            <span>Mon</span>
                            <span>Tue</span>
                            <span>Wed</span>
                            <span>Thu</span>
                            <span>Fri</span>
                            <span>Sat</span>
                          </div>

                          {/* Days grid */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: '4px'
                          }}>
                            {dayCells}
                          </div>
                        </div>
                      </div>

                      {/* Slots Section */}
                      {selectedDate && (
                        <div>
                          <label style={labelStyle}>Select Consultation Slot</label>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '0.75rem'
                          }}>
                            {(() => {
                              const daySlots = slots.filter(s => s.vet === activeVetId && s.date === selectedDate);
                              if (daySlots.length === 0) {
                                return (
                                  <div style={{ gridColumn: 'span 3', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                                    No slots scheduled for this day.
                                  </div>
                                );
                              }
                              return daySlots.map(s => {
                                const remaining = s.max_appointments - s.booked_count;
                                const isFull = remaining <= 0;
                                const uniqueSlotVal = s.id.toString() + '_' + s.date;
                                const isSelected = selectedSlotId === uniqueSlotVal;

                                return (
                                  <div
                                    key={s.id}
                                    onClick={() => {
                                      if (!isFull) {
                                        setSelectedSlotId(uniqueSlotVal);
                                      }
                                    }}
                                    style={{
                                      padding: '0.75rem 0.5rem',
                                      borderRadius: '8px',
                                      textAlign: 'center',
                                      border: isSelected 
                                        ? '1px solid #4ade80' 
                                        : isFull 
                                          ? '1px solid rgba(255,255,255,0.05)' 
                                          : '1px solid rgba(255,255,255,0.15)',
                                      background: isSelected 
                                        ? 'rgba(74, 222, 128, 0.15)' 
                                        : isFull 
                                          ? 'rgba(255, 255, 255, 0.01)' 
                                          : 'rgba(255, 255, 255, 0.03)',
                                      cursor: isFull ? 'not-allowed' : 'pointer',
                                      opacity: isFull ? 0.35 : 1,
                                      color: isFull ? 'rgba(255,255,255,0.3)' : isSelected ? '#4ade80' : '#fff',
                                      transition: 'all 0.2s ease',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '4px'
                                    }}
                                  >
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                                      {s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: isFull ? '#ef4444' : '#4ade80', fontWeight: 600 }}>
                                      {isFull ? '0 left' : `${remaining} left`}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>
                                      Total: {s.max_appointments}
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
 
               <div>
                 <label style={labelStyle}>Reason for Examination</label>
                 <textarea 
                   rows="3"
                   value={bookingReason}
                   onChange={(e) => setBookingReason(e.target.value)}
                   placeholder="Describe symptoms or visit reason..."
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
