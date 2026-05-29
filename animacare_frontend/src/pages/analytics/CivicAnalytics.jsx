import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Activity, Map as MapIcon, BrainCircuit, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './CivicAnalytics.css';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, Filler
);

const CivicAnalytics = () => {
  const [mlData, setMlData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { authFetch } = useAuth();

  useEffect(() => {
    authFetch('http://127.0.0.1:8000/api/public-health/ml-predictions/')
      .then(res => res.json())
      .then(data => {
        setMlData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching ML predictions", err);
        setLoading(false);
      });
  }, [authFetch]);

  if (loading) return <div className="ml-loader">Initializing Neural Networks...</div>;
  if (!mlData) return <div className="ml-loader">Failed to connect to ML Backend.</div>;

  const timelineData = {
    labels: mlData.timeline.labels,
    datasets: [
      {
        label: 'Rabies Trajectory (Historical + Predicted)',
        data: mlData.timeline.rabies_cases,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: (ctx) => ctx.dataIndex === mlData.timeline.rabies_cases.length - 1 ? '#fff' : '#ef4444',
        pointRadius: (ctx) => ctx.dataIndex === mlData.timeline.rabies_cases.length - 1 ? 6 : 4,
      },
      {
        label: 'Flooding Incidents (Historical + Predicted)',
        data: mlData.timeline.flooding_incidents,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderWidth: 3,
        borderDash: [5, 5],
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#3b82f6',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#e2e8f0' } },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
      y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  };

  return (
    <div className="civic-ml-dashboard">
      <header className="ml-header">
        <div className="header-left">
          <h1><BrainCircuit className="header-icon" size={28} /> AI Outbreak & Disaster Forecasting</h1>
          <p>Machine Learning driven predictive analysis of state-wide health and disaster metrics.</p>
        </div>
      </header>

      <div className="ml-grid">
        <motion.div 
          className="ml-panel chart-panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2><Activity size={20}/> 6-Week Forecast Trajectory</h2>
          <div className="chart-wrapper">
            <Line data={timelineData} options={chartOptions} />
          </div>
        </motion.div>

        <motion.div 
          className="ml-panel state-panel"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h2><MapIcon size={20}/> State Risk Index (Real-Time)</h2>
          <div className="state-list">
            {mlData.states.map((state, idx) => (
              <div key={idx} className="state-card">
                <div className="state-header">
                  <h3>{state.name}</h3>
                  {state.trend === 'up' ? <TrendingUp color="#ef4444" size={18} /> : 
                   state.trend === 'down' ? <TrendingDown color="#22c55e" size={18} /> : 
                   <Minus color="#94a3b8" size={18} />}
                </div>
                
                <div className="risk-metrics">
                  <div className="risk-item">
                    <span className="risk-label">Disease Risk</span>
                    <div className="progress-bg">
                      <div className="progress-fill" style={{ width: `${state.disease_risk}%`, background: state.disease_risk > 70 ? '#ef4444' : '#f59e0b' }}></div>
                    </div>
                  </div>
                  
                  <div className="risk-item">
                    <span className="risk-label">Disaster Risk</span>
                    <div className="progress-bg">
                      <div className="progress-fill" style={{ width: `${state.disaster_risk}%`, background: state.disaster_risk > 70 ? '#3b82f6' : '#6366f1' }}></div>
                    </div>
                  </div>
                </div>

                <div className="primary-threat">
                  <AlertTriangle size={14} color="#f59e0b" />
                  <span>Threat: <strong>{state.primary_threat}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CivicAnalytics;
