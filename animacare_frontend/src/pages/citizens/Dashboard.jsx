import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Clock, Heart, AlertTriangle, ArrowRight, FileText, Trash2, X, Edit2, PlusCircle, Activity } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();
  const [pets, setPets] = useState([]);
  const [livestocks, setLivestocks] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pets'); // 'pets' or 'livestocks'

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [petsRes, livestockRes, appsRes] = await Promise.all([
          authFetch('http://localhost:8000/api/citizens/pets/'),
          authFetch('http://localhost:8000/api/citizens/livestocks/'),
          authFetch('http://localhost:8000/api/shelter/applications/')
        ]);
        
        let fetchedPets = [];
        let fetchedLivestocks = [];
        
        if (petsRes.ok) { const d = await petsRes.json(); fetchedPets = d.results || (Array.isArray(d) ? d : []); }
        if (livestockRes.ok) { const d = await livestockRes.json(); fetchedLivestocks = d.results || (Array.isArray(d) ? d : []); }
        if (appsRes.ok) { const d = await appsRes.json(); setApplications(d.results || (Array.isArray(d) ? d : [])); }
        
        // Filter out livestocks from pets since Pet endpoint returns all
        const livestockIds = new Set(fetchedLivestocks.map(l => l.id));
        const justPets = fetchedPets.filter(p => !livestockIds.has(p.id));
        
        setPets(justPets);
        setLivestocks(fetchedLivestocks);
        
        if (justPets.length === 0 && fetchedLivestocks.length > 0) {
          setActiveTab('livestocks');
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [authFetch]);

  const handleDeletePet = async (petId) => {
    if (!window.confirm("Are you sure you want to delete this pet profile?")) return;
    try {
      const res = await authFetch(`http://localhost:8000/api/citizens/pets/${petId}/`, { method: 'DELETE' });
      if (res.ok) { setPets(pets.filter(p => p.id !== petId)); }
      else { alert(`Failed to delete pet.`); }
    } catch (err) { console.error(err); }
  };

  const handleDeleteLivestock = async (lsId) => {
    if (!window.confirm("Are you sure you want to delete this livestock profile?")) return;
    try {
      const res = await authFetch(`http://localhost:8000/api/citizens/livestocks/${lsId}/`, { method: 'DELETE' });
      if (res.ok) { setLivestocks(livestocks.filter(l => l.id !== lsId)); }
      else { alert(`Failed to delete livestock.`); }
    } catch (err) { console.error(err); }
  };

  const handleCancelAdoption = async (appId) => {
    if (!window.confirm("Are you sure you want to cancel this adoption application?")) return;
    try {
      const res = await authFetch(`http://localhost:8000/api/shelter/applications/${appId}/cancel/`, { method: 'POST' });
      if (res.ok) { setApplications(applications.map(app => app.id === appId ? { ...app, status: 'Cancelled' } : app)); }
    } catch (err) { console.error(err); }
  };

  const handleClearFinishedApps = async () => {
    const finishedApps = applications.filter(a => a.status === 'Cancelled' || a.status === 'Rejected');
    if (finishedApps.length === 0) return;
    if (!window.confirm("Are you sure you want to clear these application records?")) return;
    try {
      await Promise.all(finishedApps.map(app => authFetch(`http://localhost:8000/api/shelter/applications/${app.id}/`, { method: 'DELETE' })));
      setApplications(applications.filter(a => a.status !== 'Cancelled' && a.status !== 'Rejected'));
    } catch (err) { console.error("Clear apps error", err); }
  };

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  const hasAnimals = pets.length > 0 || livestocks.length > 0;

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <div className="page-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <h1 className="page-title gradient-text">Welcome back, {user?.first_name || 'Citizen'}</h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', margin: '0.2rem 0 0.5rem 0' }}>
            <span style={{ fontSize: '0.78rem', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa', padding: '0.2rem 0.65rem', borderRadius: 20, fontWeight: 700 }}>
              📍 Local Body: {user?.zone || 'Kollam Corporation'}
            </span>
          </div>
          <p className="page-subtitle">Manage your digital profiles, adoptions, and monitor active alerts.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/pet/new?type=pet" className="btn btn-primary"><Heart size={18} /> Register Pet</Link>
          <Link to="/pet/new?type=livestock" className="btn btn-secondary"><Shield size={18} /> Register Livestock</Link>
        </div>
      </div>

      <div className="dashboard-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* If No Animals */}
          {!hasAnimals && !loading && (
            <motion.div variants={itemVariants} className="glass-panel dashboard-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <Activity size={48} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 1rem' }} />
              <h2 style={{ marginBottom: '1rem' }}>You haven't registered any animals yet.</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
                As a citizen without registered animals, you can still play a vital role in animal welfare and public health.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button onClick={() => navigate('/sos')} className="btn btn-primary" style={{ background: 'var(--danger)' }}>
                  <AlertTriangle size={18} /> Report Disease Alert
                </button>
                <button onClick={() => navigate('/sos')} className="btn btn-secondary">
                  <Shield size={18} /> Send Rescue SOS
                </button>
              </div>
            </motion.div>
          )}

          {hasAnimals && (
            <motion.div variants={itemVariants} className="glass-panel dashboard-card">
              <div className="card-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                <div style={{ display: 'flex', gap: '1.5rem', cursor: 'pointer' }}>
                  <h2 
                    onClick={() => setActiveTab('pets')} 
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      opacity: activeTab === 'pets' ? 1 : 0.4,
                      borderBottom: activeTab === 'pets' ? '2px solid #8b5cf6' : '2px solid transparent',
                      paddingBottom: '1rem',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <Heart size={20} className={activeTab === 'pets' ? "icon-accent" : ""} /> Active Pet Profiles
                  </h2>
                  <h2 
                    onClick={() => setActiveTab('livestocks')} 
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      opacity: activeTab === 'livestocks' ? 1 : 0.4,
                      borderBottom: activeTab === 'livestocks' ? '2px solid #10b981' : '2px solid transparent',
                      paddingBottom: '1rem',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <Shield size={20} style={{ color: activeTab === 'livestocks' ? '#10b981' : 'inherit' }} /> Active Livestock Herds
                  </h2>
                </div>
              </div>

              <div className="pet-list" style={{ marginTop: '1rem' }}>
                {activeTab === 'pets' && (
                  pets.length > 0 ? pets.map(pet => {
                    const adoptedApp = applications.find(a => a.status === 'Approved' && a.animal_detail?.name === pet.name);
                    const isAdopted = !!adoptedApp;
                    return (
                      <div key={pet.id} className="pet-item">
                        {pet.media_url ? (
                          <img src={pet.media_url} alt={pet.name} className="pet-avatar" />
                        ) : (
                          <div className="pet-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', fontSize: '0.65rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>No Image</div>
                        )}
                        <div className="pet-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3>{pet.name}</h3>
                            {isAdopted && <span style={{ fontSize: '10px', background: 'var(--success-bg)', color: 'var(--success)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>ADOPTED</span>}
                          </div>
                          <p>{pet.breed || pet.species || 'Unknown Breed'}</p>
                          <div className="pet-badges">
                            {pet.rfid_tag && <span className="badge badge-success">Microchipped</span>}
                            <span className="badge badge-primary">{pet.health_status || 'Healthy'}</span>
                          </div>
                        </div>
                        <div className="pet-actions">
                          <Link to={`/pet/edit/${pet.id}?type=pet`} className="action-btn" title="Edit Pet"><Edit2 size={18} /></Link>
                          <Link to={`/medical/${pet.id}`} className="action-btn" title="View Medical Records"><FileText size={18} /></Link>
                          <button onClick={() => handleDeletePet(pet.id)} className="action-btn" style={{color: '#ef4444'}} title="Delete Pet"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    );
                  }) : <p style={{ color: 'rgba(255,255,255,0.4)', padding: '2rem', textAlign: 'center' }}>No active pet profiles found.</p>
                )}

                {activeTab === 'livestocks' && (
                  livestocks.length > 0 ? livestocks.map(ls => (
                    <div key={ls.id} className="pet-item" style={{ borderLeft: '4px solid #10b981' }}>
                      <div className="pet-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        <Activity size={24} />
                      </div>
                      <div className="pet-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3>{ls.name}</h3>
                          <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>Herd Size: {ls.herd_size}</span>
                        </div>
                        <p>{ls.livestock_type} • {ls.species}</p>
                        <div className="pet-badges">
                          {ls.farm_location && <span className="badge badge-secondary">{ls.farm_location}</span>}
                          <span className="badge badge-primary" style={{ background: ls.health_status === 'Healthy' ? '#10b981' : '#f59e0b' }}>{ls.health_status || 'Healthy'}</span>
                        </div>
                      </div>
                      <div className="pet-actions">
                        <Link to={`/pet/edit/${ls.id}?type=livestock`} className="action-btn" title="Edit Livestock"><Edit2 size={18} /></Link>
                        <Link to={`/medical/${ls.id}?type=livestock`} className="action-btn" title="View Medical Records"><FileText size={18} /></Link>
                        <button onClick={() => handleDeleteLivestock(ls.id)} className="action-btn" style={{color: '#ef4444'}} title="Delete Livestock"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  )) : <p style={{ color: 'rgba(255,255,255,0.4)', padding: '2rem', textAlign: 'center' }}>No active livestock herds found.</p>
                )}
              </div>
            </motion.div>
          )}
        </div>

        <div className="dashboard-sidebar">
          {/* Adoptions */}
          <motion.div variants={itemVariants} className="glass-panel dashboard-card">
            <div className="card-header">
              <h2><Clock size={20} className="icon-accent" /> Adoption Status</h2>
              {applications.some(a => a.status === 'Cancelled' || a.status === 'Rejected') && (
                <button onClick={handleClearFinishedApps} className="btn btn-secondary btn-sm" style={{ fontSize: '0.65rem', padding: '0.2rem 0.6rem' }}>Clear Finished</button>
              )}
            </div>
            <div className="adoption-status-list" style={{ padding: '1rem', minHeight: '100px' }}>
              {applications.length > 0 ? (
                applications.map(app => (
                  <div key={app.id} className="status-item" style={{ marginBottom: '1rem', paddingBottom: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold' }}>{app.animal_detail?.name || 'Animal'}</span>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span className={`badge ${app.status === 'Approved' ? 'badge-success' : app.status === 'Rejected' ? 'badge-danger' : app.status === 'Cancelled' ? 'badge-secondary' : 'badge-primary'}`} style={{ fontSize: '0.7rem' }}>{app.status}</span>
                        {(app.status === 'Pending' || app.status === 'Under Review') && (
                          <button onClick={() => handleCancelAdoption(app.id)} className="action-btn" style={{ color: 'rgba(255,255,255,0.3)', padding: '2px' }} title="Cancel Application"><X size={14} /></button>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>Applied on: {new Date(app.timestamp).toLocaleDateString()}</p>
                  </div>
                ))
              ) : (
                <div style={{ padding: '1rem', textAlign: 'center' }}><p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>No pending adoption applications.</p></div>
              )}
            </div>
          </motion.div>

          {/* Recent Alerts */}
          <motion.div variants={itemVariants} className="glass-panel dashboard-card">
            <div className="card-header">
              <h2><AlertTriangle size={20} className="icon-danger" /> Recent Alerts</h2>
            </div>
            <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>No active local alerts.</p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
