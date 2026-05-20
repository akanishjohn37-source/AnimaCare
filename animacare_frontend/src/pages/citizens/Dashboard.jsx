import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Clock, Heart, AlertTriangle, ArrowRight, FileText, Trash2, X, Edit2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user, authFetch } = useAuth();
  const [pets, setPets] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [petsRes, appsRes] = await Promise.all([
          authFetch('http://localhost:8000/api/citizens/pets/'),
          authFetch('http://localhost:8000/api/shelter/applications/')
        ]);
        
        if (petsRes.ok) setPets(await petsRes.json());
        if (appsRes.ok) setApplications(await appsRes.json());
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [authFetch]);

  const handleDelete = async (petId) => {
    if (!window.confirm("Are you sure you want to delete this pet profile?")) return;
    try {
      const res = await authFetch(`http://localhost:8000/api/citizens/pets/${petId}/`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setPets(pets.filter(p => p.id !== petId));
      } else {
        const text = await res.text();
        alert(`Failed to delete pet: ${res.status} ${text}`);
      }
    } catch (err) {
      console.error(err);
      alert(`Error deleting pet: ${err.message}`);
    }
  };

  const handleCancelAdoption = async (appId) => {
    if (!window.confirm("Are you sure you want to cancel this adoption application?")) return;
    try {
      const res = await authFetch(`http://localhost:8000/api/shelter/applications/${appId}/cancel/`, {
        method: 'POST'
      });
      if (res.ok) {
        setApplications(applications.map(app => app.id === appId ? { ...app, status: 'Cancelled' } : app));
      } else {
        const text = await res.text();
        alert(`Failed to cancel: ${text}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error cancelling application.");
    }
  };

  const handleClearFinishedApps = async () => {
    const finishedApps = applications.filter(a => a.status === 'Cancelled' || a.status === 'Rejected');
    if (finishedApps.length === 0) return;
    if (!window.confirm("Are you sure you want to clear these application records?")) return;
    
    try {
      await Promise.all(finishedApps.map(app => 
        authFetch(`http://localhost:8000/api/shelter/applications/${app.id}/`, { method: 'DELETE' })
      ));
      setApplications(applications.filter(a => a.status !== 'Cancelled' && a.status !== 'Rejected'));
    } catch (err) {
      console.error("Clear apps error", err);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants}
    >
      <div className="page-header">
        <div>
          <h1 className="page-title gradient-text">Welcome back, {user?.first_name || (user?.role === 'agricultural_facility' ? 'Facility Manager' : 'Citizen')}</h1>
          <p className="page-subtitle">
            {user?.role === 'agricultural_facility' 
              ? 'Manage your digital livestock health records and monitor active alerts.'
              : 'Manage your digital pet passports and monitor active alerts.'}
          </p>
        </div>
        <Link to="/pet/new" className="btn btn-primary">
          <Shield size={18} /> {user?.role === 'agricultural_facility' ? 'Register Livestock' : 'Register New Pet'}
        </Link>
      </div>

      <div className="dashboard-grid">
        {/* Pets Section */}
        <motion.div variants={itemVariants} className="glass-panel dashboard-card">
          <div className="card-header">
            <h2><Heart size={20} className="icon-accent" /> {user?.role === 'agricultural_facility' ? 'Active Livestock' : 'Active Pet Profiles'}</h2>
            <Link to="/pet/new" className="btn btn-secondary btn-sm">Add</Link>
          </div>
          
          <div className="pet-list" style={{ minHeight: '150px' }}>
            {loading ? (
              <p style={{ textAlign: 'center', marginTop: '2rem', color: 'rgba(255,255,255,0.4)' }}>Loading profiles...</p>
            ) : (pets.length > 0 || applications.filter(a => a.status !== 'Cancelled' && a.status !== 'Rejected').length > 0) ? (
              <>
                {/* Real Owned Pets (and merged adopted pets) */}
                {pets.map(pet => {
                  const adoptedApp = applications.find(a => a.status === 'Approved' && a.animal_detail?.name === pet.name);
                  const isAdopted = !!adoptedApp;
                  return (
                    <div key={pet.id} className="pet-item">
                      {pet.media_url ? (
                        <img src={pet.media_url} alt={pet.name} className="pet-avatar" />
                      ) : (
                        <div className="pet-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', fontSize: '0.65rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                          No Image
                        </div>
                      )}
                      <div className="pet-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3>{pet.name}</h3>
                          {isAdopted && <span style={{ fontSize: '10px', background: 'var(--success-bg)', color: 'var(--success)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>ADOPTED</span>}
                        </div>
                        <p>{pet.breed || pet.species || 'Unknown Breed'}</p>
                        <div className="pet-badges">
                          {pet.rfid_tag && <span className="badge badge-success">Microchipped</span>}
                          {isAdopted && <span className="badge badge-success">SHELTER VERIFIED</span>}
                          <span className="badge badge-primary">{pet.health_status || 'Healthy'}</span>
                        </div>
                      </div>
                      <div className="pet-actions">
                        <Link to={`/pet/edit/${pet.id}`} className="action-btn" title="Edit Pet Details"><Edit2 size={18} /></Link>
                        <Link to={`/medical/${pet.id}`} className="action-btn" title="View Medical Records"><FileText size={18} /></Link>
                        <button onClick={() => handleDelete(pet.id)} className="action-btn" style={{color: '#ef4444'}} title="Delete Pet"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  );
                })}
                
                {/* Pending Applications from Shelter are tracked in the Adoption Status widget */}
              </>
            ) : (
              <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                <Heart size={48} color="rgba(255,255,255,0.05)" style={{ margin: '0 auto 1rem' }} />
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem' }}>No active pet profiles yet.</p>
              </div>
            )}
          </div>
        </motion.div>

        <div className="dashboard-sidebar">
          {/* Adoptions */}
          <motion.div variants={itemVariants} className="glass-panel dashboard-card">
            <div className="card-header">
              <h2><Clock size={20} className="icon-accent" /> Adoption Status</h2>
              {applications.some(a => a.status === 'Cancelled' || a.status === 'Rejected') && (
                <button 
                  onClick={handleClearFinishedApps}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.65rem', padding: '0.2rem 0.6rem' }}
                >
                  Clear Finished
                </button>
              )}
            </div>
            <div className="adoption-status-list" style={{ padding: '1rem', minHeight: '100px' }}>
              {applications.length > 0 ? (
                applications.map(app => (
                  <div key={app.id} className="status-item" style={{ marginBottom: '1rem', paddingBottom: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold' }}>{app.animal_detail?.name || 'Animal'}</span>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span className={`badge ${app.status === 'Approved' ? 'badge-success' : app.status === 'Rejected' ? 'badge-danger' : app.status === 'Cancelled' ? 'badge-secondary' : 'badge-primary'}`} style={{ fontSize: '0.7rem' }}>
                          {app.status}
                        </span>
                        {(app.status === 'Pending' || app.status === 'Under Review') && (
                          <button 
                            onClick={() => handleCancelAdoption(app.id)}
                            className="action-btn" 
                            style={{ color: 'rgba(255,255,255,0.3)', padding: '2px' }}
                            title="Cancel Application"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>
                      Applied on: {new Date(app.timestamp).toLocaleDateString()}
                    </p>
                    {app.feedback && (
                      <div style={{ 
                        marginTop: '0.8rem', 
                        padding: '0.8rem', 
                        background: app.status === 'Rejected' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255, 255, 255, 0.03)', 
                        borderRadius: '10px', 
                        border: app.status === 'Rejected' ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid rgba(255, 255, 255, 0.05)'
                      }}>
                        <p style={{ fontSize: '0.65rem', color: app.status === 'Rejected' ? '#f87171' : 'var(--primary)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                          Shelter Feedback
                        </p>
                        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', lineHeight: '1.4' }}>
                          "{app.feedback}"
                        </p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ padding: '1rem', textAlign: 'center' }}>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>No pending adoption applications.</p>
                </div>
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
