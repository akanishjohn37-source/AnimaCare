import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, ShieldCheck, Activity, Image as ImageIcon, Plus, Syringe, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './MedicalViewer.css';

const MedicalViewer = () => {
  const { petId } = useParams();
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Owner added vaccines state
  const [showVaccineModal, setShowVaccineModal] = useState(false);
  const [ownerVaccines, setOwnerVaccines] = useState([]);
  const [vaccineForm, setVaccineForm] = useState({ vaccine_name: '', dose_date: '', valid_period: '' });

  useEffect(() => {
    authFetch('http://localhost:8000/api/citizens/pets/')
      .then(res => res.json())
      .then(data => {
        setPets(data);
        if (data && data.length > 0) {
          if (petId && petId !== 'all') {
            const match = data.find(p => p.id.toString() === petId);
            setSelectedPet(match || data[0]);
          } else {
            setSelectedPet(data[0]);
          }
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to load pets:", err);
        setIsLoading(false);
      });
  }, [petId, authFetch]);

  const handleAddVaccine = (e) => {
    e.preventDefault();
    setOwnerVaccines([...ownerVaccines, { ...vaccineForm, id: Date.now() }]);
    setShowVaccineModal(false);
    setVaccineForm({ vaccine_name: '', dose_date: '', valid_period: '' });
  };

  if (isLoading) {
    return <div style={{ color: 'white', padding: '2rem' }}>Loading Medical Records...</div>;
  }

  if (pets.length === 0) {
    return (
      <div style={{ color: 'white', padding: '3rem', textAlign: 'center' }}>
        <h2>No Pets Found</h2>
        <p>You haven't added any pets yet. Register a pet to view their medical records.</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="medical-container"
    >
      {/* Pet Selector Sidebar/Top bar */}
      <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        {pets.map(p => (
          <div 
            key={p.id} 
            onClick={() => { setSelectedPet(p); navigate(`/medical/${p.id}`); }}
            style={{ 
              padding: '0.5rem 1.5rem', borderRadius: '20px', cursor: 'pointer',
              background: selectedPet?.id === p.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
              color: 'white', whiteSpace: 'nowrap', fontWeight: selectedPet?.id === p.id ? 'bold' : 'normal'
            }}>
            {p.name}
          </div>
        ))}
      </div>

      {selectedPet && (
        <>
          <div className="medical-header glass-panel">
            <div className="pet-identity">
              <img src={selectedPet.media_url || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150&h=150&fit=crop"} alt={selectedPet.name} className="profile-img-lg" />
              <div>
                <h1 className="page-title">{selectedPet.name}'s Medical Record</h1>
                <p className="page-subtitle">Verified Clinical History & Diagnostics</p>
                <div className="auth-badge">
                  <ShieldCheck size={16} /> Authenticated by Central Vet Clinic
                </div>
              </div>
            </div>
        <button className="btn btn-secondary">
          <Download size={18} /> Export PDF
        </button>
      </div>

        <div className="medical-grid">
          <div className="logs-section">
            
            {/* Owner Added Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="section-title" style={{ margin: 0 }}><UserIcon size={20} className="icon-accent" /> Owner self-reported Vaccines</h2>
              <button className="btn btn-primary" onClick={() => setShowVaccineModal(true)} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                <Plus size={16} /> Add Vaccine Report
              </button>
            </div>

            {ownerVaccines.length === 0 ? (
               <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', borderRadius: '12px' }}>
                 No self-reported medical details added yet.
               </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                {ownerVaccines.map(vaccine => (
                  <div key={vaccine.id} className="glass-panel log-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                    <div className="log-header">
                      <h3>{vaccine.vaccine_name}</h3>
                      <span className="log-date">{vaccine.dose_date}</span>
                    </div>
                    <div className="log-body">
                      <p><strong>Administered By:</strong> Owner</p>
                      <p><strong>Valid Time Period:</strong> {vaccine.valid_period}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}


            {/* Doctor Added Section */}
            <h2 className="section-title"><Activity size={20} className="icon-accent" /> Doctor Checked Encounters</h2>
            <div className="glass-panel log-card">
              <div className="log-header">
                <h3>Annual Vaccination & Checkup (Clinical)</h3>
                <span className="log-date">Oct 12, 2025</span>
              </div>
              <div className="log-body">
                <p><strong>Attending Vet:</strong> Dr. Sarah Jenkins (ID: VET-8492)</p>
                <p><strong>Administered:</strong> Rabies (1yr), DHPP</p>
                <p><strong>Notes:</strong> Patient is in good health. No abnormalities detected during routine full body examination.</p>
              </div>
            </div>

            <div className="glass-panel log-card">
              <div className="log-header">
                <h3>Minor Injury Assessment</h3>
                <span className="log-date">Jun 04, 2025</span>
              </div>
              <div className="log-body">
                <p><strong>Attending Vet:</strong> Dr. Mark O'Connor (ID: VET-3911)</p>
                <p><strong>Diagnosis:</strong> Superficial laceration on right hind paw.</p>
                <p><strong>Treatment:</strong> Cleaned wound, applied topical antibiotic. Prescribed 5 days of rest.</p>
              </div>
            </div>
          </div>

          <div className="media-section">
            <h2 className="section-title"><ImageIcon size={20} className="icon-accent" /> Diagnostic Media</h2>
            
            <div className="glass-panel media-card">
              <div className="media-image-container">
                <img src="https://images.unsplash.com/photo-1574701292021-99529ccf0e21?auto=format&fit=crop&q=80&w=400" alt="X-Ray" />
                <div className="media-overlay">
                  <button className="btn btn-primary"><Download size={16} /> Download Source</button>
                </div>
              </div>
              <div className="media-info">
                <h4>Right Hind Paw X-Ray</h4>
                <p>Jun 04, 2025</p>
              </div>
            </div>
            
            <div className="readonly-notice glass-panel">
              <ShieldCheck size={24} className="icon-success" />
              <p>Clinical Records are read-only for Citizens. Modifications must be made by an authorized Veterinarian. You may add personal self-reports above.</p>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Add Vaccine Modal */}
      {showVaccineModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-panel" style={{ padding: '2rem', width: '400px', maxWidth: '90%', position: 'relative' }}>
            <button onClick={() => setShowVaccineModal(false)} style={{ position: 'absolute', top: 15, right: 15, background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Syringe size={20} /> Add Previous Vaccine</h3>
            <form onSubmit={handleAddVaccine} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>Which Vaccine?</label>
                <input required type="text" className="form-control" placeholder="e.g. Rabies, DHPP, FVRCP" value={vaccineForm.vaccine_name} onChange={e => setVaccineForm({...vaccineForm, vaccine_name: e.target.value})} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>Dose Date</label>
                <input required type="date" className="form-control" value={vaccineForm.dose_date} onChange={e => setVaccineForm({...vaccineForm, dose_date: e.target.value})} style={{ width: '100%', colorScheme: 'dark' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>Time Period (Validity)</label>
                <input required type="text" className="form-control" placeholder="e.g. 1 Year, 3 Years" value={vaccineForm.valid_period} onChange={e => setVaccineForm({...vaccineForm, valid_period: e.target.value})} style={{ width: '100%' }} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Add Record</button>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default MedicalViewer;
