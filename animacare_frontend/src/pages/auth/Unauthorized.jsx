import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldOff, ArrowLeft } from 'lucide-react';

const Unauthorized = () => {
  const { user } = useAuth();

  const getRoleHome = (role) => {
    const map = {
      citizen:        '/dashboard',
      veterinarian:   '/vet-dashboard',
      shelter_admin:  '/shelter-dashboard',
      civic_authority:'/civic-dashboard',
      admin:          '/superadmin',
    };
    return map[role] || '/dashboard';
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
        maxWidth: '460px',
        width: '100%',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(239,68,68,0.25)',
        borderRadius: '20px',
        padding: '3rem 2.5rem',
        textAlign: 'center',
        backdropFilter: 'blur(16px)',
      }}>
        <div style={{
          width: '80px', height: '80px',
          background: 'rgba(239,68,68,0.1)',
          border: '2px solid rgba(239,68,68,0.3)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}>
          <ShieldOff size={36} color="#f87171" />
        </div>

        <h2 style={{ color: '#fff', fontSize: '1.6rem', marginBottom: '0.5rem' }}>
          Access Denied
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          You don't have permission to view this page.
          This section is restricted to a different role.
        </p>

        {user && (
          <Link
            to={getRoleHome(user.role)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.85rem 1.75rem',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              color: '#fff', borderRadius: '12px',
              fontWeight: 600, fontSize: '0.9rem',
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(124,58,237,0.3)',
            }}
          >
            <ArrowLeft size={16} />
            Back to My Dashboard
          </Link>
        )}
      </div>
    </div>
  );
};

export default Unauthorized;
