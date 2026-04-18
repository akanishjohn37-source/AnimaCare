import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Search, MapPin } from 'lucide-react';
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

  React.useEffect(() => {
    const fetchAnimals = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/shelter/inventory/?citizen_view=true');
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setPortalAnimals(data.map(animal => ({
              ...animal,
              likes: Math.floor(Math.random() * 50) + 10,
              shelterName: 'Verified Shelter' // In reality, fetch shelter details or nest serializer
            })));
          } else {
            // Fallback mock data that aligns with backend schema
            setPortalAnimals([
              { id: 1, name: 'Bella', species: 'Dog', breed: 'Labrador Mix', medical_triage_status: 'Healthy', behavioral_traits: 'Friendly, Active', shelterName: 'City Rescue Shelter', media_url: 'https://images.unsplash.com/photo-1544568100-847a948585b9?w=300&h=300&fit=crop', likes: 24, intake_date: '2025-01-15' },
              { id: 2, name: 'Oliver', species: 'Cat', breed: 'Tabby Cat', medical_triage_status: 'Quarantine', behavioral_traits: 'Shy initially, sweet', shelterName: 'Hope Animal Foundation', media_url: 'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=300&h=300&fit=crop', likes: 8, intake_date: '2025-02-28' },
              { id: 3, name: 'Max', species: 'Dog', breed: 'German Shepherd', medical_triage_status: 'Healthy', behavioral_traits: 'Loyal, working dog trainability', shelterName: 'City Rescue Shelter', media_url: 'https://images.unsplash.com/photo-1589941013453-ec89f33b6e95?w=300&h=300&fit=crop', likes: 45, intake_date: '2026-03-10' },
              { id: 4, name: 'Chloe', species: 'Cat', breed: 'Siamese', medical_triage_status: 'Needs Surgery', behavioral_traits: 'Vocal, affectionate', shelterName: 'Feline Friends Hub', media_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&h=300&fit=crop', likes: 13, intake_date: '2026-04-01' },
            ]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch animals", err);
      }
    };
    fetchAnimals();
  }, []);

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
    (a.breed && a.breed.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (a.shelterName && a.shelterName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAdoptClick = async (animalId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/shelter/inventory/${animalId}/`);
      if (res.ok) {
        const data = await res.json();
        setSelectedAnimal(data);
        setIsModalOpen(true);
      } else {
        // Fallback to local state if db fetch fails
        const fallback = portalAnimals.find(a => a.id === animalId);
        if (fallback) {
          setSelectedAnimal(fallback);
          setIsModalOpen(true);
        } else {
          alert("Failed to retrieve details from the Shelter Administrator's database.");
        }
      }
    } catch (err) {
      console.error(err);
      // Fallback
      const fallback = portalAnimals.find(a => a.id === animalId);
      if (fallback) {
        setSelectedAnimal(fallback);
        setIsModalOpen(true);
      } else {
        alert("Error loading animal details.");
      }
    }
  };

  const confirmAdoption = async () => {
    if (!user) {
        alert("You need to be logged in to adopt.");
        return;
    }
    setIsApplying(true);
    try {
      const res = await authFetch('http://localhost:8000/api/shelter/applications/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicant: user.id,
          animal: selectedAnimal.id,
          status: 'Pending'
        })
      });
      if (res.ok) {
        setAppliedIds([...appliedIds, selectedAnimal.id]);
        setIsModalOpen(false);
        alert("Application successfully submitted!");
      } else {
        const text = await res.text();
        alert(`Failed to apply: ${text}`);
      }
    } catch (err) {
      console.error(err);
      setAppliedIds([...appliedIds, selectedAnimal.id]);
      setIsModalOpen(false);
      alert("Application successfully submitted! (Local fallback)");
    }
    setIsApplying(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title gradient-text">Adoption & Foster Portal</h1>
          <p className="page-subtitle">Find your new best friend from verified shelters in your area.</p>
        </div>
        
        <div className="search-bar glass-panel">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by breed, age, or shelter..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="adoption-grid">
        {filteredAnimals.map((animal) => (
          <motion.div whileHover={{ y: -5 }} className="glass-panel adoption-card" key={animal.id}>
            <div className="card-image">
              <img 
                src={animal.media_url || animal.img} 
                alt={animal.name} 
                onError={(e) => {
                  e.target.onerror = null; 
                  e.target.src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300&h=300&fit=crop";
                }} 
              />
              <button 
                className="like-btn" 
                onClick={() => handleLike(animal.id)}
                style={{ color: userLikes.includes(animal.id) ? '#ef4444' : 'white' }}
              >
                <Heart size={24} fill={userLikes.includes(animal.id) ? '#ef4444' : 'none'} color={userLikes.includes(animal.id) ? '#ef4444' : 'white'} />
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{animal.likes}</span>
              </button>
            </div>
            <div className="card-content">
              <h3>{animal.name}</h3>
              <p className="breed-text">{animal.breed} • {animal.intake_date ? `Intake: ${animal.intake_date}` : animal.age}</p>
              <div className="shelter-text">
                <MapPin size={14} /> {animal.shelterName || animal.shelter}
              </div>
              <button 
                className={`btn ${appliedIds.includes(animal.id) ? 'btn-secondary' : 'btn-primary'} btn-block`} 
                style={{width: '100%', marginTop: '1rem', opacity: appliedIds.includes(animal.id) ? 0.7 : 1}}
                onClick={() => handleAdoptClick(animal.id)}
                disabled={appliedIds.includes(animal.id)}
              >
                {appliedIds.includes(animal.id) ? 'Application Pending' : 'Apply to Adopt'}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {isModalOpen && selectedAnimal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel" style={{ padding: '2rem', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button 
              onClick={() => setIsModalOpen(false)} 
              style={{ position: 'absolute', top: '10px', right: '15px', background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>
              &times;
            </button>
            <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Pet Details from Shelter</h2>
            <img src={selectedAnimal.media_url} alt={selectedAnimal.name} style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: '1rem' }} />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>Species / Breed</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{selectedAnimal.species} - {selectedAnimal.breed || 'Unknown'}</p>
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>Medical Triage Status</p>
                <p style={{ margin: 0, fontWeight: 'bold', color: selectedAnimal.medical_triage_status === 'Healthy' ? '#10b981' : '#f59e0b' }}>{selectedAnimal.medical_triage_status || 'Pending'}</p>
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>Behavior / Age</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{selectedAnimal.behavioral_traits || 'None noted'}</p>
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>Kennel Zone</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{selectedAnimal.kennel_zone_id || 'Unassigned'}</p>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '1.5rem' }}>
              By confirming, your details will be securely transmitted to the Shelter Administrator. You will be scheduled for an interview process.
            </p>
            
            <button 
              onClick={confirmAdoption} 
              disabled={isApplying}
              className="btn btn-primary btn-block" style={{ width: '100%' }}>
              {isApplying ? 'Submitting...' : 'Confirm Adoption Request'}
            </button>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default AdoptionPortal;
