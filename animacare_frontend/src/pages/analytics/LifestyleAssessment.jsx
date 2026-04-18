import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Activity, Users, Dog, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LifestyleAssessment.css';

const questions = [
  {
    id: 'housing_type',
    title: 'What is your current housing type?',
    icon: <Home className="icon" />,
    options: [
      { label: 'Apartment', value: 'Apartment', desc: 'No private yard, shared spaces' },
      { label: 'House with Yard', value: 'House with Yard', desc: 'Private outdoor space' }
    ]
  },
  {
    id: 'activity_level',
    title: 'What is your daily activity level?',
    icon: <Activity className="icon" />,
    isSlider: true,
    min: 1,
    max: 10,
    labels: ['Couch Potato', 'Marathon Runner']
  },
  {
    id: 'has_children',
    title: 'Do you have children in your household?',
    icon: <Users className="icon" />,
    options: [
      { label: 'Yes', value: true, desc: 'Under 12 years old' },
      { label: 'No', value: false, desc: 'Adults only' }
    ]
  },
  {
    id: 'has_other_pets',
    title: 'Do you have other pets?',
    icon: <Dog className="icon" />,
    options: [
      { label: 'Yes', value: true, desc: 'Dogs, cats, or others' },
      { label: 'No', value: false, desc: 'No other pets' }
    ]
  }
];

const LifestyleAssessment = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    housing_type: '',
    activity_level: 5,
    has_children: null,
    has_other_pets: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleNext = () => {
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      submitAssessment();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const submitAssessment = async () => {
    setIsSubmitting(true);
    try {
      await axios.post('http://localhost:8000/api/v4/analytics/submit_lifestyle/', answers);
      navigate('/smart-match');
    } catch (err) {
      console.error(err);
      // fallback to smart match even if API not running
      navigate('/smart-match');
    }
    setIsSubmitting(false);
  };

  const currentQ = questions[step];

  return (
    <div className="assessment-container">
      <div className="assessment-card">
        <div className="progress-bar">
          <div className="progress" style={{ width: `${((step + 1) / questions.length) * 100}%` }}></div>
        </div>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="question-block"
          >
            <div className="question-header">
              {currentQ.icon}
              <h2>{currentQ.title}</h2>
            </div>

            {currentQ.isSlider ? (
              <div className="slider-container">
                <input
                  type="range"
                  min={currentQ.min}
                  max={currentQ.max}
                  value={answers[currentQ.id]}
                  onChange={(e) => setAnswers({ ...answers, [currentQ.id]: parseInt(e.target.value) })}
                  className="activity-slider"
                />
                <div className="slider-labels">
                  <span>{currentQ.labels[0]}</span>
                  <span className="slider-value">{answers[currentQ.id]}</span>
                  <span>{currentQ.labels[1]}</span>
                </div>
              </div>
            ) : (
              <div className="options-grid">
                {currentQ.options.map(opt => (
                  <button
                    key={String(opt.value)}
                    className={`option-btn ${answers[currentQ.id] === opt.value ? 'selected' : ''}`}
                    onClick={() => setAnswers({ ...answers, [currentQ.id]: opt.value })}
                  >
                    <h3>{opt.label}</h3>
                    <p>{opt.desc}</p>
                    {answers[currentQ.id] === opt.value && <CheckCircle className="check-icon" />}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="navigation-buttons">
          <button onClick={handleBack} disabled={step === 0} className="btn-back">
            <ArrowLeft size={20} /> Back
          </button>
          <button 
            onClick={handleNext} 
            className="btn-next"
            disabled={
              (!currentQ.isSlider && answers[currentQ.id] === '') || 
              answers[currentQ.id] === null || 
              isSubmitting
            }
          >
            {isSubmitting ? 'Processing...' : step === questions.length - 1 ? 'Find My Match' : 'Next'} <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LifestyleAssessment;
