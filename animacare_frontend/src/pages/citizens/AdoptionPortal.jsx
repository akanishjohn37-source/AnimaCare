import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Search, MapPin, Plus, Camera, DollarSign, Tag, CheckCircle, 
  Upload, X, PawPrint, ChevronRight, Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './AdoptionPortal.css';

const AdoptionPortal = () => {
  const { user, authFetch } = useAuth();
  const [portalAnimals, setPortalAnimals] = useState([]);
  const [appliedIds, setAppliedIds] = useState([]);
  const [userLikes, setUserLikes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Shelter Admin specific state
  const [showRescueForm, setShowRescueForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [rescueForm, setRescueForm] = useState({
    name: '', species: 'Dog', custom_species: '', breed: '', medical_triage_status: 'Healthy',
    listing_type: 'Adopt', price: '0', media_url: '', kennel_zone_id: 'A1'
  });

  const isShelterAdmin = user?.role === 'shelter_admin';

  const fetchAnimals = async () => {
    try {
      const url = isShelterAdmin 
        ? 'http://localhost:8000/api/shelter/inventory/' 
        : 'http://localhost:8000/api/shelter/inventory/?citizen_view=true';
      
      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        setPortalAnimals(data.map(animal => ({
          ...animal,
          likes: animal.likes || Math.floor(Math.random() * 50) + 10,
          shelterName: animal.shelter_name || 'Verified Shelter'
        })));
      }
    } catch (err) {
      console.error("Failed to fetch animals", err);
    }
  };

  useEffect(() => {
    fetchAnimals();
  }, [user, isShelterAdmin]);

  useEffect(() => {
    if (user && !isShelterAdmin) {
      authFetch('http://localhost:8000/api/shelter/applications/')
        .then(res => res.json())
        .then(data => {
           if (Array.isArray(data)) {
             setAppliedIds(data.map(app => app.animal));
           }
        })
        .catch(err => console.error("Error fetching applications", err));
    }
  }, [user, authFetch, isShelterAdmin]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setRescueForm({ ...rescueForm, media_url: reader.result });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRescueSubmit = async (e) => {
    e.preventDefault();
    const finalSpecies = rescueForm.species === 'Other' ? rescueForm.custom_species : rescueForm.species;
    if (!finalSpecies) {
      alert("Please specify the species.");
      return;
    }

    try {
      const { custom_species, ...submissionData } = rescueForm;
      const res = await authFetch('http://localhost:8000/api/shelter/inventory/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...submissionData,
          species: finalSpecies
        })
      });
      if (res.ok) {
        alert("Animal Rescued Successfully!");
        setShowRescueForm(false);
        setRescueForm({ name: '', species: 'Dog', custom_species: '', breed: '', medical_triage_status: 'Healthy', listing_type: 'Adopt', price: '0', media_url: '', kennel_zone_id: 'A1' });
        fetchAnimals();
      } else {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const errData = await res.json();
          alert("Registration Failed: " + JSON.stringify(errData));
        } else {
          const text = await res.text();
          console.error("Server Error HTML:", text);
          alert("Registration Failed: Server error. Please check backend logs.");
        }
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred.");
    }
  };

  const toggleAvailability = async (animal) => {
    try {
        const res = await authFetch(`http://localhost:8000/api/shelter/inventory/${animal.id}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_available: !animal.is_available })
        });
        if (res.ok) {
            fetchAnimals();
        }
    } catch (err) {
        console.error(err);
    }
  };

  const handleLike = (animalId) => {
    if (userLikes.includes(animalId)) {
      setUserLikes(userLikes.filter(id => id !== animalId));
      setPortalAnimals(portalAnimals.map(a => a.id === animalId ? { ...a, likes: a.likes - 1 } : a));
    } else {
      setUserLikes([...userLikes, animalId]);
      setPortalAnimals(portalAnimals.map(a => a.id === animalId ? { ...a, likes: a.likes + 1 } : a));
    }
  };

  const filteredAnimals = portalAnimals.filter(a => 
    a.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (a.breed && a.breed.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="adoption-portal-container">
      <div className="page-header">
        <div style={{ position: 'relative' }}>
          <h1 className="page-title gradient-text">
            {isShelterAdmin ? 'Shelter Inventory Management' : 'Adoption & Foster Portal'}
          </h1>
          <p className="page-subtitle">
            {isShelterAdmin 
              ? 'Register rescued animals and manage their market availability.' 
              : 'Find your new best friend from verified shelters in your area.'}
          </p>
        </div>
        
        <div className="header-actions">
          {isShelterAdmin && (
            <button 
              className={`btn ${showRescueForm ? 'btn-secondary' : 'btn-primary'} rescue-toggle-btn`} 
              onClick={() => setShowRescueForm(!showRescueForm)}
            >
              {showRescueForm ? <X size={18} /> : <Plus size={18} />}
              <span>{showRescueForm ? 'Cancel Registration' : 'Register New Rescue'}</span>
            </button>
          )}
          <div className="search-bar glass-panel">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Filter by name or breed..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showRescueForm && isShelterAdmin && (
          <motion.div 
            initial={{ height: 0, opacity: 0, marginBottom: 0 }} 
            animate={{ height: 'auto', opacity: 1, marginBottom: '2rem' }} 
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            className="rescue-form-wrapper glass-panel"
          >
            <div className="rescue-form-header">
              <div className="header-icon-wrap">
                <PawPrint size={24} />
              </div>
              <h3>Animal Intake Registration</h3>
            </div>

            <form onSubmit={handleRescueSubmit} className="rescue-grid-form">
              <div className="form-main-content">
                <div className="input-group">
                  <label><Info size={14} /> Animal Name</label>
                  <input required type="text" placeholder="e.g. Buddy" value={rescueForm.name} onChange={e => setRescueForm({...rescueForm, name: e.target.value})} />
                </div>

                <div className="input-row">
                  <div className="input-group">
                    <label>Species</label>
                    <select value={rescueForm.species} onChange={e => setRescueForm({...rescueForm, species: e.target.value})}>
                      <option>Dog</option>
                      <option>Cat</option>
                      <option>Rabbit</option>
                      <option>Bird</option>
                      <option>Other</option>
                    </select>
                  </div>
                  {rescueForm.species === 'Other' && (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="input-group">
                      <label>Specify Species</label>
                      <input required type="text" placeholder="Type species name..." value={rescueForm.custom_species} onChange={e => setRescueForm({...rescueForm, custom_species: e.target.value})} />
                    </motion.div>
                  )}
                  <div className="input-group">
                    <label>Breed</label>
                    <input type="text" placeholder="e.g. Golden Retriever" value={rescueForm.breed} onChange={e => setRescueForm({...rescueForm, breed: e.target.value})} />
                  </div>
                </div>

                <div className="input-row">
                  <div className="input-group">
                    <label>Listing Type</label>
                    <div className="segmented-control">
                      {['Adopt', 'Sell', 'Donate'].map(type => (
                        <button 
                          key={type}
                          type="button"
                          className={rescueForm.listing_type === type ? 'active' : ''}
                          onClick={() => setRescueForm({...rescueForm, listing_type: type})}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  {rescueForm.listing_type === 'Sell' && (
                    <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="input-group">
                      <label><DollarSign size={14} /> Asking Price (USD)</label>
                      <input type="number" placeholder="0.00" value={rescueForm.price} onChange={e => setRescueForm({...rescueForm, price: e.target.value})} />
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="form-sidebar-content">
                <label className="image-upload-label">Pet Photography</label>
                <div 
                  className={`image-dropzone ${rescueForm.media_url ? 'has-image' : ''}`}
                  onClick={() => document.getElementById('pet-photo-upload').click()}
                >
                  {rescueForm.media_url ? (
                    <img src={rescueForm.media_url} alt="Preview" className="upload-preview" />
                  ) : (
                    <div className="dropzone-content">
                      <Camera size={32} />
                      <p>{isUploading ? 'Processing...' : 'Click to Upload Photo'}</p>
                      <span>Supports JPG, PNG</span>
                    </div>
                  )}
                  <input type="file" id="pet-photo-upload" hidden onChange={handleFileChange} accept="image/*" />
                </div>
                
                <button type="submit" className="btn btn-primary submit-rescue-btn">
                  <CheckCircle size={18} /> Complete Registration
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="adoption-grid">
        {filteredAnimals.map((animal) => (
          <motion.div whileHover={{ y: -5 }} className={`glass-panel adoption-card ${!animal.is_available ? 'offline' : ''}`} key={animal.id}>
            <div className="card-image">
              <img src={animal.media_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300&h=300&fit=crop'} alt={animal.name} />
              <div className="listing-tag">
                <Tag size={12} /> {animal.listing_type} {animal.price > 0 && `• $${animal.price}`}
              </div>
              {!isShelterAdmin && (
                <button 
                  className="like-btn" 
                  onClick={() => handleLike(animal.id)}
                  style={{ color: userLikes.includes(animal.id) ? '#ef4444' : 'white' }}
                >
                  <Heart size={20} fill={userLikes.includes(animal.id) ? '#ef4444' : 'none'} />
                  <span>{animal.likes}</span>
                </button>
              )}
              {isShelterAdmin && !animal.is_available && (
                <div className="offline-overlay">
                  <span>UNPUBLISHED</span>
                </div>
              )}
            </div>
            <div className="card-content">
              <div className="card-title-row">
                <h3>{animal.name}</h3>
                {animal.is_available && <div className="status-dot-active" title="Available for Users" />}
              </div>
              <p className="breed-text">{animal.breed || animal.species} • {animal.intake_date || 'New Arrival'}</p>
              
              <div className="shelter-info-line">
                <MapPin size={14} /> {animal.shelterName || animal.shelter_name}
              </div>

              {isShelterAdmin ? (
                <div className="admin-card-actions">
                  <button 
                    onClick={() => toggleAvailability(animal)}
                    className={`btn ${animal.is_available ? 'btn-secondary' : 'btn-primary'} flex-1`}
                  >
                    {animal.is_available ? 'Unpublish' : 'Publish to Market'}
                  </button>
                </div>
              ) : (
                <button 
                  className={`btn ${appliedIds.includes(animal.id) ? 'btn-secondary' : 'btn-primary'} btn-block w-full mt-4`} 
                  onClick={() => {
                    setSelectedAnimal(animal);
                    setIsModalOpen(true);
                  }}
                  disabled={appliedIds.includes(animal.id)}
                >
                  {appliedIds.includes(animal.id) ? 'Application Pending' : (animal.listing_type === 'Sell' ? 'Inquiry to Buy' : 'Apply to Adopt')}
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && selectedAnimal && (
          <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel pet-modal"
              onClick={e => e.stopPropagation()}
            >
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
              <div className="modal-pet-header">
                <img src={selectedAnimal.media_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300&h=300&fit=crop'} alt={selectedAnimal.name} />
                <div className="modal-title-wrap">
                  <h2>{selectedAnimal.name}</h2>
                  <span className="modal-badge">{selectedAnimal.listing_type}</span>
                </div>
              </div>
              
              <div className="modal-details-grid">
                <div className="detail-item">
                  <span className="label">Medical Status</span>
                  <span className="value status-healthy">{selectedAnimal.medical_triage_status}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Breed Info</span>
                  <span className="value">{selectedAnimal.breed || 'Unknown'}</span>
                </div>
                {selectedAnimal.listing_type === 'Sell' && (
                  <div className="detail-item price-item">
                    <span className="label">Price</span>
                    <span className="value">${selectedAnimal.price}</span>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <p className="disclaimer">By proceeding, your verified profile will be shared with the shelter for review.</p>
                <button className="btn btn-primary btn-block w-full" onClick={() => { alert("Application Sent!"); setIsModalOpen(false); }}>
                   Confirm {selectedAnimal.listing_type === 'Sell' ? 'Purchase Request' : 'Adoption Intent'} <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdoptionPortal;
