import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Clock, Heart, AlertTriangle, ArrowRight, FileText, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user, authFetch } = useAuth();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPets = async () => {
      try {
        const res = await authFetch('http://localhost:8000/api/citizens/pets/');
        if (res.ok) {
          const data = await res.json();
          setPets(data);
        }
      } catch (err) {
        console.error("Failed to fetch pets", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPets();
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
          <h1 className="page-title gradient-text">Welcome back, {user?.first_name || 'Citizen'}</h1>
          <p className="page-subtitle">Manage your digital pet passports and monitor active alerts.</p>
        </div>
        <Link to="/pet/new" className="btn btn-primary">
          <Shield size={18} /> Register New Pet
        </Link>
      </div>

      <div className="dashboard-grid">
        {/* Pets Section */}
        <motion.div variants={itemVariants} className="glass-panel dashboard-card">
          <div className="card-header">
            <h2><Heart size={20} className="icon-accent" /> Active Pet Profiles</h2>
            <Link to="/pet/new" className="btn btn-secondary btn-sm">Add</Link>
          </div>
          
          <div className="pet-list" style={{ minHeight: '150px' }}>
            {loading ? (
              <p style={{ textAlign: 'center', marginTop: '2rem', color: 'rgba(255,255,255,0.4)' }}>Loading passports...</p>
            ) : pets.length > 0 ? (
              pets.map(pet => (
                <div key={pet.id} className="pet-item">
                  {pet.media_url ? (
                    <img src={pet.media_url} alt={pet.name} className="pet-avatar" />
                  ) : (
                    <div className="pet-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', fontSize: '0.65rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                      No Image Uploaded
                    </div>
                  )}
                  <div className="pet-info">
                    <h3>{pet.name}</h3>
                    {pet.breed || pet.species || pet.gender ? (
                      <p>{pet.breed || pet.species} {pet.gender ? `• ${pet.gender}` : ''}</p>
                    ) : (
                      <p style={{fontStyle: 'italic', color: 'rgba(255,255,255,0.3)'}}>No details provided</p>
                    )}
                    <div className="pet-badges">
                      {pet.rfid_tag && <span className="badge badge-success">Microchipped</span>}
                      {pet.health_status && <span className="badge badge-primary">{pet.health_status}</span>}
                    </div>
                  </div>
                  <div className="pet-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link to={`/medical/${pet.id}`} className="action-btn" title="View Medical History">
                      <FileText size={18} />
                    </Link>
                    <button onClick={() => handleDelete(pet.id)} className="action-btn" style={{color: '#ef4444'}} title="Delete Pet">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                <Heart size={48} color="rgba(255,255,255,0.05)" style={{ margin: '0 auto 1rem' }} />
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem' }}>
                  No active pet profiles yet.<br/>Click "Register New Pet" to get started.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        <div className="dashboard-sidebar">
          {/* Adoptions */}
          <motion.div variants={itemVariants} className="glass-panel dashboard-card">
            <div className="card-header">
              <h2><Clock size={20} className="icon-accent" /> Adoption Status</h2>
            </div>
            <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>No pending adoption applications.</p>
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
