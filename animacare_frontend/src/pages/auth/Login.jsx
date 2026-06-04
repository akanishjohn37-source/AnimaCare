import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Activity, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowRight, ArrowLeft,
  User, Stethoscope, Building2, Map, Shield
} from 'lucide-react';
import './Auth.css';

const ROLES_INFO = {
  citizen:       { icon: User,       label: 'Citizen / Pet Owner',     color: '#22d3ee'  },
  veterinarian:  { icon: Stethoscope,label: 'Veterinary Doctor',       color: '#4ade80'  },
  shelter_admin: { icon: Building2,  label: 'Shelter Administrator',   color: '#f59e0b'  },
  civic_authority:{ icon: Map,       label: 'Civic Authority',         color: '#a78bfa'  },
  admin:         { icon: Shield,     label: 'System Administrator',    color: '#f43f5e'  },
};

const Login = () => {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const from = location.state?.from?.pathname || null;

  const [form, setForm]         = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotMsg, setForgotMsg]       = useState('');

  const change = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      setError('Please enter your username and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await login(form.username, form.password);
      // Role-based redirect
      const destination = from || getRoleHome(user.role);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      setError('Please enter your username and new password.');
      return;
    }
    setLoading(true);
    setError('');
    setForgotMsg('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/change-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, new_password: form.password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      setForgotMsg(data.message);
      setTimeout(() => {
        setIsForgotMode(false);
        setForgotMsg('');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

  // Demo credentials
  const demos = [
    { label: 'Admin',    username: 'superadmin', password: 'Admin@1234', role: 'admin'    },
  ];

  return (
    <div className="auth-page">
      {/* Left panel — branding */}
      <div className="auth-branding">
        <div className="auth-brand-content">
          <div className="auth-brand-logo">
            <Activity size={40} />
          </div>
          <h1 className="auth-brand-name">AnimaCare</h1>
          <p className="auth-brand-tagline">
            The Unified Animal Welfare &amp; HealthTech Ecosystem
          </p>
          <div className="auth-role-pills">
            {Object.entries(ROLES_INFO).map(([key, { icon: Icon, label, color }]) => (
              <div className="auth-role-pill" key={key} style={{ borderColor: color }}>
                <Icon size={14} style={{ color }} />
                <span style={{ color }}>{label}</span>
              </div>
            ))}
          </div>
          <p className="auth-brand-sub">
            Role-based access for Citizens, Veterinarians, Shelters, Civic Authorities &amp; Administrators.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2>{isForgotMode ? "Reset Password" : "Welcome Back"}</h2>
            <p>{isForgotMode ? "Enter your username and a new password" : "Sign in to your AnimaCare account"}</p>
          </div>

          {/* Status banners from navigation state */}
          {location.state?.rejected && (
            <div className="auth-alert auth-alert--error">
              <AlertCircle size={16} />
              Your registration was rejected. Please contact support.
            </div>
          )}
          {location.state?.suspended && (
            <div className="auth-alert auth-alert--error">
              <AlertCircle size={16} />
              Your account has been suspended. Please contact administrator.
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" id="login-form">
            <div className="auth-field">
              <label htmlFor="login-username">Username or Email</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  placeholder="Enter your username"
                  value={form.username}
                  onChange={change}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">Password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="login-password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={change}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPass((p) => !p)}
                  aria-label="Toggle password visibility"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="auth-alert auth-alert--error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            
            {forgotMsg && (
              <div className="auth-alert auth-alert--info">
                <CheckCircle size={16} />
                {forgotMsg}
              </div>
            )}

            {!isForgotMode ? (
              <>
                <div style={{ textAlign: 'right', marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
                  <button 
                    type="button" 
                    onClick={() => { setError(''); setForm({ username: '', password: '' }); setIsForgotMode(true); }}
                    style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <button
                  type="submit"
                  id="login-submit-btn"
                  className="auth-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="auth-btn-spinner" />
                  ) : (
                    <>Sign In <ArrowRight size={16} /></>
                  )}
                </button>
              </>
            ) : (
              <div className="auth-nav-btns">
                <button 
                  type="button" 
                  className="auth-back-btn" 
                  onClick={() => { setError(''); setIsForgotMode(false); }}
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  type="button"
                  onClick={handleForgotSubmit}
                  className="auth-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="auth-btn-spinner" />
                  ) : (
                    <>Change Password</>
                  )}
                </button>
              </div>
            )}
          </form>

          {/* <div className="auth-divider"><span>Demo Access</span></div>

          <div className="auth-demos">
            {demos.map((d) => (
              <button
                key={d.username}
                className="auth-demo-btn"
                onClick={() => setForm({ username: d.username, password: d.password })}
              >
                <Shield size={13} />
                {d.label}: <code>{d.username}</code>
              </button>
            ))}
          </div> */}

          <p className="auth-switch">
            Don't have an account?{' '}
            <Link to="/register" id="goto-register-link">Create account →</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
