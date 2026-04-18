import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Stethoscope, FileText, BarChart2, Users,
  Calendar, Activity, TrendingUp, Clock, CheckCircle
} from 'lucide-react';

const MOCK_PATIENTS = [
  { id: 1, name: 'Buddy',  species: 'Dog',  breed: 'Labrador',    owner: 'Rajan Sharma',  lastVisit: '2026-04-05', status: 'Healthy'   },
  { id: 2, name: 'Whisker',species: 'Cat',  breed: 'Persian',     owner: 'Priya Nair',    lastVisit: '2026-04-06', status: 'Follow-up' },
  { id: 3, name: 'Max',    species: 'Dog',  breed: 'Dobermann',   owner: 'Amir Khan',     lastVisit: '2026-04-07', status: 'Critical'  },
  { id: 4, name: 'Coco',   species: 'Bird', breed: 'Cockatiel',   owner: 'Sunita Rao',    lastVisit: '2026-04-03', status: 'Healthy'   },
];

const MOCK_APPOINTMENTS = [
  { id: 1, pet: 'Buddy',   owner: 'Rajan Sharma', time: '10:00 AM', type: 'Vaccination',    status: 'Confirmed' },
  { id: 2, pet: 'Bella',   owner: 'Nisha Verma',  time: '11:30 AM', type: 'General Checkup',status: 'Confirmed' },
  { id: 3, pet: 'Tommy',   owner: 'Vikram Joshi',  time: '2:00 PM', type: 'Surgery Consult', status: 'Pending'   },
];

const STATUS_STYLE = {
  Healthy:   { color: '#4ade80', bg: 'rgba(74,222,128,0.1)',   border: 'rgba(74,222,128,0.25)'  },
  'Follow-up':{ color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)'  },
  Critical:  { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
};

const VetDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const tabBtnStyle = (key) => ({
    padding: '0.55rem 1.25rem',
    background: activeTab === key ? 'rgba(74,222,128,0.15)' : 'transparent',
    border: `1px solid ${activeTab === key ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.1)'}`,
    color: activeTab === key ? '#4ade80' : 'rgba(255,255,255,0.5)',
    borderRadius: 10, cursor: 'pointer', fontSize: '0.87rem', fontWeight: 600,
    transition: 'all 0.2s',
  });

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 1200, margin: '0 auto' }}>

      {/* Header & Global Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'rgba(74,222,128,0.12)',
            border: '1px solid rgba(74,222,128,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Stethoscope size={22} color="#4ade80" />
          </div>
          <div>
            <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
              Clinical Portal
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.83rem', margin: 0 }}>
              Dr. {user?.first_name || 'A'} {user?.last_name || 'JOHN'} — Veterinary Doctor
            </p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div style={{ flex: '1 1 auto', maxWidth: '400px' }}>
          <input 
            type="text" 
            placeholder="Search Pet Passport via Microchip ID or Owner Name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', outline: 'none', fontSize: '0.875rem'
            }}
          />
        </div>

        <div style={{
          padding: '0.4rem 0.9rem',
          background: 'rgba(74,222,128,0.1)',
          border: '1px solid rgba(74,222,128,0.25)',
          borderRadius: 20, color: '#4ade80', fontSize: '0.75rem', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: '0.4rem',
        }}>
          <CheckCircle size={12} /> Active Doctor
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { icon: Users,     label: 'Total Patients',  value: 128,  color: '#22d3ee' },
          { icon: Calendar,  label: "Today's Appts.",  value: 8,    color: '#4ade80' },
          { icon: Activity,  label: 'Active Cases',    value: 23,   color: '#f59e0b' },
          { icon: TrendingUp,label: 'Recoveries (Mo)', value: 41,   color: '#a78bfa' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14, padding: '1.25rem',
            display: 'flex', alignItems: 'center', gap: '1rem',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: `${color}18`, border: `1px solid ${color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{value}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem' }}>
        {[
          { key: 'overview',     label: 'Overview'        },
          { key: 'patients',     label: 'Patient Records' },
          { key: 'appointments', label: 'Appointments'    },
        ].map(t => (
          <button key={t.key} style={tabBtnStyle(t.key)} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Today's schedule */}
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: '1.5rem',
            }}>
              <h3 style={{ color: '#fff', marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16} color="#4ade80" /> Today's Appointments
              </h3>
              {MOCK_APPOINTMENTS.map(appt => (
                <div key={appt.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.75rem', borderRadius: 10,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  marginBottom: '0.5rem',
                }}>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{appt.pet}</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>{appt.owner} · {appt.type}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#4ade80', fontWeight: 600, fontSize: '0.85rem' }}>{appt.time}</div>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700,
                      color: appt.status === 'Confirmed' ? '#4ade80' : '#f59e0b',
                      padding: '0.1rem 0.5rem',
                      background: appt.status === 'Confirmed' ? 'rgba(74,222,128,0.1)' : 'rgba(245,158,11,0.1)',
                      borderRadius: 10,
                    }}>{appt.status}</span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pending Prescription Approvals */}
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: '1.5rem',
            }}>
              <h3 style={{ color: '#fff', marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={16} color="#22d3ee" /> Pending Prescriptions
              </h3>
              {[
                { pet: 'Max', owner: 'Amir Khan', medication: 'Amoxicillin 250mg', status: 'Requires Signature' },
                { pet: 'Coco', owner: 'Sunita Rao', medication: 'Ivermectin 1%', status: 'Requires Signature' }
              ].map((presc, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.75rem', borderRadius: 10,
                  background: 'rgba(34,211,238,0.05)',
                  border: '1px solid rgba(34,211,238,0.15)',
                  marginBottom: '0.5rem',
                }}>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>{presc.pet} <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 'normal' }}>({presc.owner})</span></div>
                    <div style={{ color: '#22d3ee', fontSize: '0.75rem' }}>{presc.medication}</div>
                  </div>
                  <button style={{
                    padding: '0.3rem 0.7rem',
                    background: '#22d3ee', color: '#0f172a',
                    border: 'none', borderRadius: '8px',
                    fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer'
                  }}>Sign</button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16, padding: '1.5rem', alignSelf: 'start'
          }}>
            <h3 style={{ color: '#fff', marginBottom: '1rem', fontSize: '1rem' }}>⚡ Quick Actions</h3>
            {[
              { label: 'Create Medical Record',   color: '#4ade80' },
              { label: 'Write Prescription',      color: '#22d3ee' },
              { label: 'Upload Lab/Media Results',color: '#a78bfa' },
              { label: 'Schedule Follow-up',      color: '#f59e0b' },
              { label: 'View Predictive Reports', color: '#f87171' },
            ].map(a => (
              <button key={a.label} style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                width: '100%', marginBottom: '0.5rem',
                padding: '0.75rem 1rem',
                background: `${a.color}0f`, border: `1px solid ${a.color}25`,
                borderRadius: 10, color: a.color, cursor: 'pointer',
                fontWeight: 600, fontSize: '0.87rem',
                transition: 'background 0.2s',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Patient Records */}
      {activeTab === 'patients' && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                {['Pet Name', 'Species', 'Breed', 'Owner', 'Last Visit', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '0.85rem 1rem', textAlign: 'left',
                    fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_PATIENTS.map(p => {
                const s = STATUS_STYLE[p.status] || STATUS_STYLE.Healthy;
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.85rem 1rem', color: '#fff', fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.6)' }}>{p.species}</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.6)' }}>{p.breed}</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.6)' }}>{p.owner}</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{p.lastVisit}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        padding: '0.2rem 0.65rem', borderRadius: 20,
                        background: s.bg, border: `1px solid ${s.border}`,
                        color: s.color, fontSize: '0.72rem', fontWeight: 700,
                      }}>{p.status}</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <button style={{
                        padding: '0.35rem 0.75rem',
                        background: 'rgba(34,211,238,0.1)',
                        border: '1px solid rgba(34,211,238,0.25)',
                        borderRadius: 8, color: '#22d3ee',
                        cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                      }}>
                        View Records
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Appointments */}
      {activeTab === 'appointments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {MOCK_APPOINTMENTS.map(appt => (
            <div key={appt.id} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14, padding: '1.25rem 1.5rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: 'rgba(74,222,128,0.1)',
                  border: '1px solid rgba(74,222,128,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Clock size={20} color="#4ade80" />
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700 }}>{appt.pet} — {appt.type}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>Owner: {appt.owner}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#4ade80', fontWeight: 700, fontSize: '1rem' }}>{appt.time}</div>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700,
                  color: appt.status === 'Confirmed' ? '#4ade80' : '#f59e0b',
                }}>{appt.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default VetDashboard;
