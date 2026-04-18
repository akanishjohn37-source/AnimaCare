import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Clock, LogOut, CheckCircle, Shield } from 'lucide-react';

const PendingApproval = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary, #0a0a0f)',
      padding: '2rem',
    }}>
      <div style={{
        maxWidth: '520px',
        width: '100%',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(245,158,11,0.3)',
        borderRadius: '20px',
        padding: '3rem 2.5rem',
        textAlign: 'center',
        backdropFilter: 'blur(16px)',
      }}>
        {/* Icon */}
        <div style={{
          width: '80px', height: '80px',
          background: 'rgba(245,158,11,0.1)',
          border: '2px solid rgba(245,158,11,0.3)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem',
          animation: 'pendingPulse 2s ease-in-out infinite',
        }}>
          <Clock size={36} color="#f59e0b" />
        </div>

        <h2 style={{ color: '#fff', fontSize: '1.6rem', marginBottom: '0.5rem' }}>
          Awaiting Approval
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
          {user?.first_name
            ? `Hi ${user.first_name},`
            : 'Your account is under review.'}
        </p>

        {user && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.35rem 0.85rem',
            background: 'rgba(139,92,246,0.1)',
            border: '1px solid rgba(139,92,246,0.25)',
            borderRadius: '20px',
            marginBottom: '1.75rem',
            fontSize: '0.82rem', color: '#a78bfa',
          }}>
            <Shield size={13} />
            <strong>{user.role?.replace('_', ' ').toUpperCase()}</strong>
          </div>
        )}

        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          Your <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{user?.role?.replace('_', ' ') || 'account'}</strong> registration
          has been submitted and is pending review by our administrators.
          You'll receive access once approved.
        </p>

        {/* Process steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '2rem', textAlign: 'left' }}>
          {[
            { done: true,  text: 'Registration submitted successfully' },
            { done: false, text: 'Admin reviews your credentials & documents' },
            { done: false, text: 'Account activated — you receive a notification' },
          ].map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.65rem 0.9rem',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                background: s.done ? '#4ade80' : 'rgba(255,255,255,0.08)',
                border: `2px solid ${s.done ? '#4ade80' : 'rgba(255,255,255,0.15)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {s.done
                  ? <CheckCircle size={13} color="#fff" />
                  : <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>{i + 1}</span>
                }
              </div>
              <span style={{ fontSize: '0.85rem', color: s.done ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)' }}>
                {s.text}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            width: '100%', padding: '0.85rem',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '12px',
            color: '#fca5a5', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: 600,
            transition: 'background 0.2s',
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>

      <style>{`
        @keyframes pendingPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); }
          50%       { box-shadow: 0 0 0 12px rgba(245,158,11,0.12); }
        }
      `}</style>
    </div>
  );
};

export default PendingApproval;
