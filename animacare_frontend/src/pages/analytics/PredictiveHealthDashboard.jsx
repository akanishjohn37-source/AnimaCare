import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { AlertCircle, Stethoscope, Activity, Bell, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './PredictiveHealth.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const MOCK_PET_DATA = [
  {
    id: '1',
    name: "Max",
    breed: "Golden Retriever",
    medical_records: [
      { date: '2023-01-15', weight_kg: 10 },
      { date: '2023-04-15', weight_kg: 20 },
      { date: '2023-07-15', weight_kg: 28 },
      { date: '2023-10-15', weight_kg: 33 },
      { date: '2024-01-15', weight_kg: 36 } // Overweight!
    ],
    health_flags: [
      {
        id: 'f1',
        risk_type: 'Overweight / Obesity Risk',
        severity: 'High',
        description: 'Golden Retriever baseline is 30.0kg. Current weight 36kg is dangerously high. High risk for Hip Dysplasia and joint issues.',
        flagged_at: '2024-01-16T02:00:00Z'
      }
    ]
  }
];

const MOCK_BASELINE = {
  labels: ['3 mo', '6 mo', '9 mo', '12 mo', '15 mo'],
  lower: [8, 15, 23, 27, 28],
  upper: [12, 19, 27, 32, 33]
};

const PredictiveHealthDashboard = () => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePetId, setActivePetId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/v4/analytics/pet_health_dashboard/');
        if (response.data && response.data.length > 0) {
          setPets(response.data);
          setActivePetId(response.data[0].id);
        } else {
          setPets(MOCK_PET_DATA);
          setActivePetId(MOCK_PET_DATA[0].id);
        }
      } catch (err) {
        console.error(err);
        setPets(MOCK_PET_DATA);
        setActivePetId(MOCK_PET_DATA[0].id);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const activePet = pets.find(p => p.id === activePetId);

  // Prepare chart data
  const chartData = activePet ? {
    labels: MOCK_BASELINE.labels,
    datasets: [
      {
        label: 'Actual Weight Curve',
        data: activePet.medical_records.map(r => r.weight_kg),
        borderColor: '#fb7185',
        backgroundColor: '#fb7185',
        borderWidth: 3,
        pointBackgroundColor: '#fb7185',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#fb7185',
        pointRadius: 5,
        tension: 0.4
      },
      {
        label: 'Healthy Upper Bound',
        data: MOCK_BASELINE.upper,
        borderColor: 'rgba(79, 70, 229, 0.4)',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: '+1', // Fill to next dataset
        tension: 0.4,
        pointRadius: 0
      },
      {
        label: 'Healthy Lower Bound',
        data: MOCK_BASELINE.lower,
        borderColor: 'rgba(79, 70, 229, 0.4)',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        pointRadius: 0
      }
    ]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { family: "'Inter', sans-serif", size: 13 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleFont: { size: 14, family: "'Inter', sans-serif" },
        bodyFont: { size: 14, family: "'Inter', sans-serif" },
        padding: 12,
        cornerRadius: 8,
        displayColors: false
      }
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Weight (kg)',
          font: { family: "'Inter', sans-serif", weight: 600 }
        },
        grid: { color: '#f3f4f6' }
      },
      x: {
        grid: { display: false }
      }
    }
  };

  if (loading) return <div className="loader">Loading Predictive Health Data...</div>;

  return (
    <div className="health-dashboard">
      <header className="health-header">
        <div>
          <h1>Predictive Health Insights</h1>
          <p>AI-driven longitudinal analysis safeguarding your pet's future.</p>
        </div>
        <div className="pet-selector">
          {pets.map(pet => (
            <button 
              key={pet.id} 
              className={`pet-tab ${activePetId === pet.id ? 'active' : ''}`}
              onClick={() => setActivePetId(pet.id)}
            >
              {pet.name}
            </button>
          ))}
        </div>
      </header>

      {activePet && (
        <div className="dashboard-grid">
          {/* Main Chart Area */}
          <div className="chart-card">
            <div className="card-header">
              <Activity className="icon text-indigo" />
              <h2>Development Trajectory vs. {activePet.breed} Baseline</h2>
            </div>
            <div className="chart-wrapper">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* AI Notifications / Flags */}
          <div className="alerts-col">
            <div className="notifications-header">
              <Bell className="icon" />
              <h2>Early-Warning Network</h2>
            </div>
            
            <AnimatePresence>
              {activePet.health_flags.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="all-clear">
                  <Stethoscope className="icon text-green" />
                  <h3>All Systems Normal</h3>
                  <p>Trajectory is well within the healthy baseline.</p>
                </motion.div>
              ) : (
                activePet.health_flags.map((flag, idx) => (
                  <motion.div 
                    key={flag.id || idx}
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className={`alert-card severity-${flag.severity.toLowerCase()}`}
                  >
                    <div className="alert-top">
                      <AlertCircle className="alert-icon" />
                      <span className="risk-type">{flag.risk_type}</span>
                      <span className="severity-badge">{flag.severity} Risk</span>
                    </div>
                    <p className="alert-desc">{flag.description}</p>
                    <div className="alert-actions">
                      <button className="consult-btn">Consult Verified Vet</button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
            
            <div className="info-box">
              <Info className="icon" size={18} />
              <p>Predictive Health relies on anonymized aggregate data to detect early warning signs. It does not replace professional veterinary diagnosis. <br/><strong>Last Analyzed: 2:00 AM (Celery Worker)</strong></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictiveHealthDashboard;
