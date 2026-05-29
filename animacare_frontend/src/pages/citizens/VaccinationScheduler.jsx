import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ChevronDown, Search, CheckCircle } from 'lucide-react';
import './VaccinationScheduler.css';

const API_SCHEDULES = 'http://127.0.0.1:8000/api/clinical/vaccination-schedules';
const API_PETS = 'http://127.0.0.1:8000/api/citizens/pets';

const TRACK_EMOJI = {
  puppy: '🐶', kitten: '🐱', cattle: '🐮',
  small_ruminant: '🐐', poultry: '🐣', equine: '🐴', custom: '❓',
};
const TRACK_LABELS = {
  puppy: 'Puppy Track', kitten: 'Kitten Track', cattle: 'Cattle Track',
  small_ruminant: 'Small Ruminant', poultry: 'Poultry Track',
  equine: 'Equine Track', custom: 'Custom Track',
};
const SPECIES_EMOJI = {
  dog: '🐶', cat: '🐱', cow: '🐮', buffalo: '🐮', sheep: '🐑',
  goat: '🐐', chicken: '🐣', duck: '🦆', hen: '🐣', horse: '🐴', bird: '🐦',
};

/* ── Vaccine checkboxes per species (what the vet can confirm today) ── */
const VACCINE_OPTIONS = {
  dog: [
    { key: 'dhppil_1', label: 'DHPPiL Dose 1 (6 Weeks)', ageWeeksMin: 5 },
    { key: '7in1',     label: '7-in-1 Combo Vaccine (10 Weeks)', ageWeeksMin: 9 },
    { key: 'rabies_final', label: 'Final Booster + Anti-Rabies (14 Weeks)', ageWeeksMin: 13 },
    { key: 'annual_rabies', label: 'Annual Anti-Rabies Booster', ageWeeksMin: 52 },
  ],
  cat: [
    { key: 'fvrcp_1', label: 'FVRCP Dose 1 (6 Weeks)', ageWeeksMin: 5 },
    { key: 'fvrcp_2', label: 'FVRCP Dose 2 (10 Weeks)', ageWeeksMin: 9 },
    { key: 'fvrcp_3_rabies', label: 'FVRCP Dose 3 + Anti-Rabies (14 Weeks)', ageWeeksMin: 13 },
    { key: 'annual_fvrcp', label: 'Annual FVRCP & Anti-Rabies Booster', ageWeeksMin: 52 },
  ],
  cow: [
    { key: 'fmd', label: 'Foot & Mouth Disease (FMD) Vaccine' },
    { key: 'hs_bq', label: 'Haemorrhagic Septicaemia & Black Quarter' },
    { key: 'brucellosis', label: 'Brucellosis Vaccine (Female 4-8 months)', genderRestrict: 'female' },
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
    { key: 'newcastle', label: 'Ranikhet / Newcastle Disease (Day 5)' },
    { key: 'gumboro', label: 'Gumboro Disease (Day 14)' },
  ],
  horse: [
    { key: 'equine_flu', label: 'Annual Equine Influenza Vaccine' },
  ],
};

const VaccinationScheduler = () => {
  const { authFetch } = useAuth();

  // Step 1 - Search & select pet
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [searching, setSearching] = useState(false);

  // Step 4 - Vet confirms vaccines
  const [checkedVaccines, setCheckedVaccines] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Existing schedules
  const [schedules, setSchedules] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await authFetch(`${API_SCHEDULES}/`);
      const data = await res.json();
      setSchedules(data.results || (Array.isArray(data) ? data : []));
    } catch (err) {
      console.error('Failed to fetch schedules:', err);
    }
    setLoading(false);
  }, [authFetch]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  /* ── Search pets from DB ── */
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await authFetch(`${API_PETS}/?search=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results || (Array.isArray(data) ? data : []));
    } catch (err) {
      console.error(err);
    }
    setSearching(false);
  };

  /* ── Calculate age info ── */
  const getAgeInfo = (dob) => {
    if (!dob) return { weeks: 0, months: 0, label: 'Unknown' };
    const birthDate = new Date(dob);
    const today = new Date();
    const diffMs = today - birthDate;
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(totalDays / 7);
    const months = Math.floor(totalDays / 30.44);
    const years = Math.floor(totalDays / 365.25);

    let label;
    if (years >= 1) label = `${years} year${years > 1 ? 's' : ''}, ${months % 12} month${months % 12 !== 1 ? 's' : ''}`;
    else if (months >= 1) label = `${months} month${months > 1 ? 's' : ''}, ${weeks % 4} week${weeks % 4 !== 1 ? 's' : ''}`;
    else label = `${weeks} week${weeks > 1 ? 's' : ''} (${totalDays} days)`;

    return { weeks, months, totalDays, label };
  };

  /* ── Get applicable vaccines for this pet ── */
  const getApplicableVaccines = (pet) => {
    const species = (pet.species || '').toLowerCase();
    const options = VACCINE_OPTIONS[species] || [];
    const age = getAgeInfo(pet.dob);
    const gender = (pet.gender || '').toLowerCase();

    return options.filter(v => {
      if (v.ageWeeksMin && age.weeks < v.ageWeeksMin) return false;
      if (v.genderRestrict && v.genderRestrict !== gender) return false;
      if (v.genderRestrict === 'female' && species === 'cow') {
        // Brucellosis only for 4-8 month old female calves
        if (age.months < 4 || age.months > 8) return false;
      }
      return true;
    });
  };

  /* ── Submit: Vet saves appointment data & generate timeline ── */
  const handleSaveAppointment = async () => {
    if (!selectedPet || checkedVaccines.length === 0) return;
    setSubmitting(true);
    try {
      const res = await authFetch(`${API_SCHEDULES}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: selectedPet.id,
          animal_type: (selectedPet.species || '').toLowerCase(),
          animal_name: selectedPet.name,
          date_of_birth: selectedPet.dob,
          gender: (selectedPet.gender || '').toLowerCase(),
          vaccines_given: checkedVaccines,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSchedules(prev => [data, ...prev]);
        setExpandedId(data.id);
        setSelectedPet(null);
        setCheckedVaccines([]);
        setSearchQuery('');
        setSearchResults([]);
      } else {
        alert(data.error || 'Failed to generate schedule.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving appointment data.');
    }
    setSubmitting(false);
  };

  const handleMarkComplete = async (scheduleId, itemId) => {
    try {
      const res = await authFetch(`${API_SCHEDULES}/${scheduleId}/mark-item/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSchedules(prev =>
          prev.map(s => s.id === scheduleId ? {
            ...s,
            items: s.items.map(i => i.id === itemId ? { ...i, is_completed: data.is_completed } : i)
          } : s)
        );
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('Delete this entire vaccination schedule?')) return;
    try {
      await authFetch(`${API_SCHEDULES}/${scheduleId}/`, { method: 'DELETE' });
      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
    } catch (err) { console.error(err); }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return {
      day: d.getDate(),
      monthYear: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    };
  };
  const isUpcoming = (dateStr) => new Date(dateStr) >= new Date(new Date().toISOString().split('T')[0]);

  const ageInfo = selectedPet ? getAgeInfo(selectedPet.dob) : null;
  const applicableVaccines = selectedPet ? getApplicableVaccines(selectedPet) : [];

  return (
    <div className="vacc-scheduler">
      <h1>💉 Vaccination Scheduler</h1>
      <p className="subtitle">
        Check in patients, confirm today's injections, and automatically generate future vaccination timelines with smart deworming reminders.
      </p>

      {/* ═══════ Step 1: Appointment Check-In ═══════ */}
      <div className="vacc-form-section">
        <h2>🏥 Step 1 — Appointment Check-In</h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Search for the animal by name, breed, or owner to pull up their profile.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            placeholder="Search by pet name, breed, or species..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="vacc-search-input"
            style={{
              flex: 1, padding: '0.75rem 1rem', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
              color: '#fff', fontSize: '0.9rem'
            }}
          />
          <button className="vacc-btn-generate" style={{ marginTop: 0, padding: '0.75rem 1.5rem' }} onClick={handleSearch} disabled={searching}>
            <Search size={16} /> {searching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && !selectedPet && (
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {searchResults.map(pet => (
              <div key={pet.id} onClick={() => { setSelectedPet(pet); setCheckedVaccines([]); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1.25rem',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(129,140,248,0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
              >
                <span style={{ fontSize: '1.8rem' }}>{SPECIES_EMOJI[(pet.species || '').toLowerCase()] || '🐾'}</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff' }}>{pet.name} <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400, fontSize: '0.82rem' }}>({pet.species}{pet.breed ? ` • ${pet.breed}` : ''})</span></div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                    {pet.gender || 'Unknown gender'} • DOB: {pet.dob || 'N/A'} • Status: {pet.health_status || 'Healthy'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════ Step 2 & 3: Profile & Age Auto-Calc ═══════ */}
      {selectedPet && (
        <div className="vacc-form-section" style={{ borderColor: 'rgba(129,140,248,0.25)' }}>
          <h2>📋 Step 2 & 3 — Animal Profile & Vital Signals</h2>
          <div style={{
            display: 'grid', gridTemplateColumns: '60px 1fr', gap: '1.25rem', alignItems: 'center',
            background: 'rgba(129,140,248,0.05)', borderRadius: 14, padding: '1.25rem',
            border: '1px solid rgba(129,140,248,0.15)', marginBottom: '1.25rem'
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.2)',
            }}>
              {SPECIES_EMOJI[(selectedPet.species || '').toLowerCase()] || '🐾'}
            </div>
            <div>
              <h3 style={{ color: '#fff', margin: 0, fontSize: '1.15rem' }}>{selectedPet.name}</h3>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                {selectedPet.species}{selectedPet.breed ? ` • ${selectedPet.breed}` : ''} • {selectedPet.gender || 'Unknown'} • DOB: {selectedPet.dob || 'N/A'}
              </div>
            </div>
          </div>

          {/* Auto-calculated vitals */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 12, padding: '1rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Calculated Age</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4ade80', marginTop: '0.25rem' }}>{ageInfo?.label}</div>
            </div>
            <div style={{ background: 'rgba(129,140,248,0.06)', border: '1px solid rgba(129,140,248,0.15)', borderRadius: 12, padding: '1rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Gender Check</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#818cf8', marginTop: '0.25rem' }}>{selectedPet.gender || 'Not specified'}</div>
            </div>
            <div style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)', borderRadius: 12, padding: '1rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Visit Date</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#22d3ee', marginTop: '0.25rem' }}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            </div>
          </div>

          <button onClick={() => setSelectedPet(null)} style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)',
            padding: '0.4rem 0.85rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem'
          }}>✕ Change Animal</button>
        </div>
      )}

      {/* ═══════ Step 4: Vet Confirms Injections ═══════ */}
      {selectedPet && (
        <div className="vacc-form-section">
          <h2>💉 Step 4 — Confirm Injections Given Today</h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Check the vaccines you administered during this visit. The system will auto-generate the future timeline.
          </p>

          {applicableVaccines.length === 0 ? (
            <div className="custom-track-message">
              <h3>❓ No Built-in Schedule</h3>
              <p>No standard vaccine blueprint found for this species ({selectedPet.species}). Please consult local veterinary guidelines and create a manual entry.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {applicableVaccines.map(v => (
                <label key={v.key} style={{
                  display: 'flex', alignItems: 'center', gap: '0.85rem',
                  padding: '0.85rem 1.25rem', borderRadius: 12, cursor: 'pointer',
                  background: checkedVaccines.includes(v.key) ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${checkedVaccines.includes(v.key) ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  transition: 'all 0.2s',
                }}>
                  <input
                    type="checkbox"
                    checked={checkedVaccines.includes(v.key)}
                    onChange={e => {
                      if (e.target.checked) setCheckedVaccines(prev => [...prev, v.key]);
                      else setCheckedVaccines(prev => prev.filter(k => k !== v.key));
                    }}
                    style={{ width: 18, height: 18, accentColor: '#4ade80' }}
                  />
                  <span style={{ fontWeight: 600, color: checkedVaccines.includes(v.key) ? '#4ade80' : '#fff', fontSize: '0.9rem' }}>
                    {v.label}
                  </span>
                </label>
              ))}
            </div>
          )}

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
            <button
              className="vacc-btn-generate"
              disabled={checkedVaccines.length === 0 || submitting}
              onClick={handleSaveAppointment}
            >
              <CheckCircle size={18} /> {submitting ? 'Saving...' : 'Save Appointment & Generate Timeline'}
            </button>
          </div>
        </div>
      )}

      {/* ═══════ Generated Schedules ═══════ */}
      <div style={{ marginTop: '2.5rem' }}>
        <h2 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 800, marginBottom: '1rem' }}>
          📅 Generated Vaccination Timelines
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.3)' }}>Loading schedules...</div>
        ) : schedules.length === 0 ? (
          <div className="vacc-empty-state">
            <div className="emoji-large">🩺</div>
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>No vaccination timelines generated yet</p>
            <p style={{ fontSize: '0.85rem' }}>Search for a patient above and confirm their today's vaccinations to generate their personalized future timeline.</p>
          </div>
        ) : (
          <div className="vacc-schedules-list">
            {schedules.map(schedule => {
              const isOpen = expandedId === schedule.id;
              const items = schedule.items || [];
              const totalItems = items.filter(i => i.item_type !== 'deworming').length;
              const completedItems = items.filter(i => i.is_completed && i.item_type !== 'deworming').length;
              const upcomingItems = items.filter(i => !i.is_completed && isUpcoming(i.scheduled_date));

              return (
                <div className="vacc-schedule-card" key={schedule.id}>
                  <div className="vacc-schedule-header" onClick={() => setExpandedId(isOpen ? null : schedule.id)}>
                    <div className="info">
                      <div className="animal-icon">{TRACK_EMOJI[schedule.track] || '🐾'}</div>
                      <div className="details">
                        <h3>
                          {schedule.animal_name}
                          <span className={`vacc-track-badge track-${schedule.track}`} style={{ marginLeft: '0.75rem' }}>
                            {TRACK_LABELS[schedule.track] || schedule.track}
                          </span>
                        </h3>
                        <div className="meta">
                          {(schedule.animal_type || '').charAt(0).toUpperCase() + (schedule.animal_type || '').slice(1)} • DOB: {schedule.date_of_birth} • {completedItems}/{totalItems} complete • {upcomingItems.length} upcoming
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button className="vacc-delete-btn" onClick={e => { e.stopPropagation(); handleDeleteSchedule(schedule.id); }}>🗑 Delete</button>
                      <ChevronDown size={20} className={`toggle-icon ${isOpen ? 'open' : ''}`} />
                    </div>
                  </div>

                  {isOpen && (
                    <div className="vacc-timeline">
                      {schedule.track === 'custom' && items.length === 0 ? (
                        <div className="custom-track-message">
                          <h3>❓ Custom Profile</h3>
                          <p>No built-in schedule for this species. Please consult a local vet and add manual reminders.</p>
                        </div>
                      ) : (
                        items
                          .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
                          .map(item => {
                            const fd = formatDate(item.scheduled_date);
                            const upcoming = isUpcoming(item.scheduled_date);
                            return (
                              <div key={item.id} className={`vacc-timeline-item ${item.is_completed ? 'completed' : ''}`}>
                                <div className="date-col">
                                  <div className="day">{fd.day}</div>
                                  <div className="month-year">{fd.monthYear}</div>
                                </div>
                                <div className="content">
                                  <span className={`type-badge type-${item.item_type}`}>
                                    {item.item_type === 'deworming' ? '🪱 Deworming' :
                                     item.item_type === 'vaccine' ? '💉 Vaccine' :
                                     item.item_type === 'annual' ? '🔄 Annual' : '📅 Seasonal'}
                                  </span>
                                  <div className="title">{item.title}</div>
                                  <div className="desc">{item.description}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  {(() => {
                                    const schedDate = new Date(item.scheduled_date + 'T00:00:00');
                                    const now = new Date();
                                    const todayStr = now.toISOString().split('T')[0];
                                    // Month has arrived = current year/month >= scheduled year/month
                                    const monthReached = (now.getFullYear() > schedDate.getFullYear()) ||
                                      (now.getFullYear() === schedDate.getFullYear() && now.getMonth() >= schedDate.getMonth());
                                    const isPast = item.scheduled_date < todayStr;
                                    const daysUntil = Math.ceil((schedDate - now) / (1000*60*60*24));

                                    if (item.is_completed) {
                                      return (
                                        <button 
                                          className="vacc-complete-btn done" 
                                          onClick={() => handleMarkComplete(schedule.id, item.id)}
                                          title="Click to undo"
                                        >✓ Done</button>
                                      );
                                    } else if (monthReached) {
                                      return (
                                        <button className="vacc-complete-btn" onClick={() => handleMarkComplete(schedule.id, item.id)}>
                                          ✓ Mark Done
                                        </button>
                                      );
                                    } else if (isPast) {
                                      return <span style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 5, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>⚠ Missed</span>;
                                    } else {
                                      return (
                                        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem' }}>
                                          <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>🔒 Locked</span>
                                          <span style={{ fontSize: '0.58rem' }}>{daysUntil}d away</span>
                                        </span>
                                      );
                                    }
                                  })()}
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VaccinationScheduler;
