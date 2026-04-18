import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Heart, Info, MapPin } from 'lucide-react';
import './SmartMatchDashboard.css';

// Mock data in case backend isn't up
const MOCK_MATCHES = [
  {
    id: 1,
    animal: {
      name: "Max",
      breed: "Golden Retriever",
      image_url: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=400"
    },
    score_percentage: 94,
    match_reasons: ["High Energy Match", "Excellent with kids", "Great for apartments"]
  },
  {
    id: 2,
    animal: {
      name: "Bella",
      breed: "French Bulldog",
      image_url: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=400"
    },
    score_percentage: 82,
    match_reasons: ["Low maintenance", "Perfect for your space"]
  }
];

const SmartMatchDashboard = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/v4/analytics/recommendations/');
        if (response.data && response.data.length > 0) {
          setMatches(response.data);
        } else {
          setMatches(MOCK_MATCHES); // Fallback
        }
      } catch (err) {
        console.error(err);
        setMatches(MOCK_MATCHES);
      }
      setLoading(false);
    };
    fetchMatches();
  }, []);

  if (loading) return <div className="loader">Analyzing Compatibility...</div>;

  return (
    <div className="match-dashboard">
      <div className="dashboard-header">
        <h1>Your Smart Matches</h1>
        <p>Sorted by an AI Compatibility Score based on your lifestyle.</p>
      </div>

      <div className="matches-grid">
        {matches.map((match, idx) => (
          <motion.div 
            key={match.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="match-card"
          >
            <div className="image-container">
              <img 
                src={match.animal?.image_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=400'} 
                alt={match.animal?.name} 
              />
              <div className="score-badge">
                <Heart size={16} className="fill-current" />
                <span>{match.score_percentage}% Match</span>
              </div>
            </div>
            
            <div className="match-info">
              <h2>{match.animal?.name}</h2>
              <span className="breedTag">{match.animal?.breed}</span>
              
              <div className="reasons">
                <p className="reasons-title">Why it's a match:</p>
                <ul>
                  {match.match_reasons.map((reason, i) => (
                    <li key={i}>
                      <span className="bullet"></span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>

              <button className="meet-btn">Meet {match.animal?.name}</button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SmartMatchDashboard;
