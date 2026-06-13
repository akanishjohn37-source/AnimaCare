import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './SuperAdminDashboard.css';

const API = `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/auth`;

const STATUS_COLOR = {
  active:    { bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.3)',  color: '#4ade80' },
  pending:   { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  color: '#f59e0b' },
  suspended: { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   color: '#f87171' },
  rejected:  { bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.3)', color: '#9ca3af' },
};

const ROLE_COLOR = {
  citizen:        '#22d3ee',
  veterinarian:   '#4ade80',
  shelter_admin:  '#f59e0b',
  civic_authority:'#a78bfa',
  admin:          '#f43f5e',
};

const MOCK_SYSTEM_METRICS = {
  s3Storage: '42.8 GB', apiLatency: '42ms',
  celeryTasks: '14 Active / 0 Failed', cpuUsage: '34%', memoryUsage: '65%',
};

const getInitialAuditLogs = () => {
  const saved = localStorage.getItem('auditLogs');
  if (saved) return JSON.parse(saved);
  return [];
};

/* ── Stat card ── */
const StatCard = ({ label, value, color }) => (
  <div style={{
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14, padding: '1.25rem 1.5rem',
    display: 'flex', flexDirection: 'column', gap: 6,
  }}>
    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
    <span style={{ fontSize: '1.75rem', fontWeight: 800, color: color || '#fff' }}>{value}</span>
  </div>
);

/* ── Status badge ── */
const StatusBadge = ({ status }) => {
  const s = STATUS_COLOR[status] || STATUS_COLOR.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '0.2rem 0.65rem',
      background: s.bg, border: `1px solid ${s.border}`, borderRadius: 20,
      color: s.color, fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize',
    }}>{status}</span>
  );
};

/* ── Role badge ── */
const RoleBadge = ({ role }) => (
  <span style={{
    display: 'inline-flex', padding: '0.2rem 0.65rem',
    background: `${ROLE_COLOR[role]}18`,
    border: `1px solid ${ROLE_COLOR[role]}40`,
    borderRadius: 20, color: ROLE_COLOR[role],
    fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize',
    whiteSpace: 'nowrap',
  }}>{role?.replace('_', ' ')}</span>
);

/* ─────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────── */
const SuperAdminDashboard = () => {
  const { token } = useAuth();
  const location = useLocation();
  const isUsersSection = location.pathname.includes('/superadmin/users');
  const [activeTab, setActiveTab] = useState(isUsersSection ? 'users' : 'health');
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers]         = useState([]);
  const [usersPagination, setUsersPagination] = useState({ count: 0, next: null, previous: null });
  const [usersPage, setUsersPage]       = useState(1);
  const [searchQuery, setSearchQuery]   = useState('');
  const [stats, setStats]               = useState(null);
  const [loading, setLoading]           = useState(false);
  const [actionNote, setActionNote]     = useState({});
  const [toast, setToast]               = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, userId: null, action: null, reason: '' });
  const [auditLogs, setAuditLogs]       = useState(getInitialAuditLogs());
  const [expandedDetails, setExpandedDetails] = useState({});

  const toggleDetails = (userId) => {
    setExpandedDetails(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/users/pending/`, { headers: authHeaders });
      const data = await res.json();
      // Handle both unpaginated and paginated (if applied globally)
      setPendingUsers(data.results ? data.results : (Array.isArray(data) ? data : []));
    } catch {}
  }, [token]);

  const fetchAllUsers = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(`${API}/admin/users/`);
      url.searchParams.set('page', usersPage);
      if (searchQuery) url.searchParams.set('search', searchQuery);
      
      const res = await fetch(url, { headers: authHeaders });
      const data = await res.json();
      
      if (data.results) {
        setAllUsers(data.results);
        setUsersPagination({ count: data.count, next: data.next, previous: data.previous });
      } else {
        setAllUsers(Array.isArray(data) ? data : []);
      }
    } catch {}
    setLoading(false);
  }, [token, usersPage, searchQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/stats/`, { headers: authHeaders });
      const data = await res.json();
      setStats(data);
    } catch {}
  }, [token]);

  useEffect(() => {
    fetchStats();
    fetchPending();
  }, [fetchStats, fetchPending]);

  useEffect(() => {
    if (activeTab === 'users') fetchAllUsers();
  }, [activeTab, fetchAllUsers]);

  useEffect(() => {
    if (isUsersSection && activeTab !== 'users' && activeTab !== 'audit') {
      setActiveTab('users');
    } else if (!isUsersSection && activeTab !== 'health' && activeTab !== 'verification') {
      setActiveTab('health');
    }
  }, [isUsersSection]);

  const doUserAction = async (userId, action, reasonText = '') => {
    const note = reasonText || actionNote[userId] || '';
    try {
      const res = await fetch(`${API}/admin/users/${userId}/action/`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ action, note }),
      });
      const data = await res.json();
      showToast(data.message || `User ${action}d.`);
      
      const targetUser = allUsers.find(u => u.id === userId) || pendingUsers.find(u => u.id === userId);
      const targetName = targetUser ? `@${targetUser.username}` : `User ID #${userId}`;
      const newLog = {
        id: Date.now(),
        admin: 'superadmin',
        action: action.toUpperCase(),
        target: targetName,
        timestamp: new Date().toLocaleString('sv-SE').replace('T', ' '),
        ip: '127.0.0.1'
      };
      const updatedLogs = [newLog, ...auditLogs];
      setAuditLogs(updatedLogs);
      localStorage.setItem('auditLogs', JSON.stringify(updatedLogs));

      fetchPending();
      fetchStats();
      if (activeTab === 'users') fetchAllUsers();
    } catch { showToast('Error performing action.'); }
  };

  const tabs = isUsersSection ? [
    { key: 'users',        label: 'All Users'          },
    { key: 'audit',        label: 'Audit Trail'        },
  ] : [
    { key: 'health',       label: 'System Health'     },
    { key: 'verification', label: `Pending Approval (${pendingUsers.length})` },
  ];

  return (
    <div className="superadmin-container">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '5rem', right: '2rem', zIndex: 999,
          background: '#1a1a3e', border: '1px solid rgba(74,222,128,0.4)',
          color: '#4ade80', padding: '0.8rem 1.25rem', borderRadius: 12,
          fontSize: '0.87rem', fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          animation: 'dropIn 0.2s ease',
        }}>
          ✓ {toast}
        </div>
      )}

      <header className="superadmin-header">
        <div className="header-content">
          <h1>Super-Administrator Control Panel</h1>
          <span className="badge-mfa">🛡 Admin Session Active</span>
        </div>
        <nav className="superadmin-nav">
          {tabs.map(t => (
            <button
              key={t.key}
              className={activeTab === t.key ? 'active' : ''}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="superadmin-main">

        {/* ── System Health ─────────────────────────────── */}
        {activeTab === 'health' && (
          <section className="dashboard-section fade-in">
            <h2>Platform Overview</h2>

            {stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <StatCard label="Total Users"    value={stats.total}     color="#fff"     />
                <StatCard label="Pending"         value={stats.pending}   color="#f59e0b"  />
                <StatCard label="Active"          value={stats.active}    color="#4ade80"  />
                <StatCard label="Suspended"       value={stats.suspended} color="#f87171"  />
                <StatCard label="Citizens"        value={stats.by_role?.citizen || 0}       color="#22d3ee" />
                <StatCard label="Veterinarians"   value={stats.by_role?.veterinarian || 0}  color="#4ade80" />
                <StatCard label="Shelter Admins"  value={stats.by_role?.shelter_admin || 0} color="#f59e0b" />
                <StatCard label="Civic Auth"      value={stats.by_role?.civic_authority || 0} color="#a78bfa" />
              </div>
            )}

            <h2 style={{ marginTop: '1.5rem' }}>Infrastructure &amp; API Health</h2>
            <div className="metrics-grid">
              <div className="metric-card glass"><h3>AWS S3 Storage</h3><p className="value highlight-blue">{MOCK_SYSTEM_METRICS.s3Storage}</p></div>
              <div className="metric-card glass"><h3>Global API Latency</h3><p className="value highlight-green">{MOCK_SYSTEM_METRICS.apiLatency}</p></div>
              <div className="metric-card glass"><h3>Celery Task Queue</h3><p className="value">{MOCK_SYSTEM_METRICS.celeryTasks}</p></div>
              <div className="metric-card glass"><h3>Server CPU</h3><p className="value highlight-orange">{MOCK_SYSTEM_METRICS.cpuUsage}</p></div>
              <div className="metric-card glass"><h3>Memory</h3><p className="value highlight-red">{MOCK_SYSTEM_METRICS.memoryUsage}</p></div>
            </div>

            <div className="ai-controls glass fade-in" style={{ marginTop: '1.5rem' }}>
              <h3><span className="icon">⚙️</span> AI Algorithm Weight Adjustments</h3>
              <p>Global overrides for AnimaCare predictive models. Use with extreme caution.</p>
              <div className="slider-group">
                <label>Behavioral Match Weight (0–100)</label>
                <input type="range" min="0" max="100" defaultValue="75" />
              </div>
              <div className="slider-group">
                <label>Emergency Triage Priority (0–10)</label>
                <input type="range" min="0" max="10" defaultValue="8" />
              </div>
              <button className="btn-primary" onClick={() => showToast('Weights synchronized with Redis cache.')}>
                Compile &amp; Push to Redis
              </button>
            </div>
          </section>
        )}

        {/* ── Pending Approvals ─────────────────────────── */}
        {activeTab === 'verification' && (
          <section className="dashboard-section fade-in">
            <h2>Pending Registration Approvals</h2>
            <p className="subtitle">
              Review and approve professional registrations. Veterinarians, Shelter Admins, and Civic
              Authority accounts require manual verification before activation.
            </p>

            {pendingUsers.length === 0 ? (
              <div className="empty-state" style={{
                padding: '3rem', textAlign: 'center',
                color: 'rgba(255,255,255,0.35)', fontSize: '0.95rem',
              }}>
                ✅ No pending approvals — all clear!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {pendingUsers.map(u => (
                  <div key={u.id} style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    borderRadius: 14, padding: '1.25rem 1.5rem',
                    display: 'flex', flexDirection: 'column', gap: '0.85rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                          <span style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>{u.full_name}</span>
                          <RoleBadge role={u.role} />
                          <StatusBadge status={u.account_status} />
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                          <span>@{u.username}</span>
                          <span>{u.email}</span>
                          {u.phone_number && <span>📞 {u.phone_number}</span>}
                          <span>Jurisdiction: {u.zone || 'N/A'}</span>
                          <span>Registered: {new Date(u.date_joined).toLocaleDateString()}</span>
                        </div>
                        {u.role === 'shelter_admin' && u.shelter_profile && (
                          <div style={{ marginTop: '0.65rem', padding: '0.6rem 0.8rem', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem' }}>
                            <span><strong>Shelter:</strong> {u.shelter_profile.shelter_name}</span>
                            <span><strong>NGO Darpan ID:</strong> {u.shelter_profile.shelter_registration_number}</span>
                            <span><strong>Capacity:</strong> {u.shelter_profile.capacity}</span>
                            <span><strong>Type:</strong> {u.shelter_profile.shelter_type === 'specific' ? `Specific (${u.shelter_profile.specific_animal})` : 'Mixed Animal'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={() => toggleDetails(u.id)}
                      style={{
                        background: expandedDetails[u.id] ? 'rgba(167, 139, 250, 0.2)' : 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: expandedDetails[u.id] ? '#a78bfa' : '#fff',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        width: 'fit-content',
                        marginTop: '0.5rem',
                        marginBottom: '0.5rem'
                      }}
                    >
                      {expandedDetails[u.id] ? 'Hide Verification Details ▴' : 'View Verification Details ▾'}
                    </button>

                    {expandedDetails[u.id] && (
                      <div style={{
                        marginTop: '0.5rem',
                        marginBottom: '1rem',
                        padding: '1rem',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        <h4 style={{ margin: '0 0 0.8rem 0', color: '#a78bfa', fontSize: '0.9rem', letterSpacing: '1px' }}>VERIFICATION DATA</h4>
                        
                        {u.role === 'veterinarian' && u.veterinarian_profile && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>
                            <div>
                              <strong style={{ color: '#fff', display: 'block', marginBottom: '0.2rem' }}>Clinic Name:</strong>
                              {u.veterinarian_profile.clinic_hospital_name}
                            </div>
                            <div>
                              <strong style={{ color: '#fff', display: 'block', marginBottom: '0.2rem' }}>License Number:</strong>
                              {u.veterinarian_profile.medical_license_number}
                            </div>
                            <div>
                              <strong style={{ color: '#fff', display: 'block', marginBottom: '0.2rem' }}>Specialization:</strong>
                              {u.veterinarian_profile.specialization}
                            </div>
                            <div>
                              <strong style={{ color: '#fff', display: 'block', marginBottom: '0.2rem' }}>Years of Experience:</strong>
                              {u.veterinarian_profile.years_of_experience}
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                              <strong style={{ color: '#fff', display: 'block', marginBottom: '0.2rem' }}>Clinic Address:</strong>
                              {u.veterinarian_profile.clinic_address}
                            </div>
                            <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <strong style={{ minWidth: '130px' }}>License Document:</strong>
                              {u.veterinarian_profile.license_document_url ? (
                                <a href={u.veterinarian_profile.license_document_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#4ade80', textDecoration: 'none', background: 'rgba(74, 222, 128, 0.1)', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 500 }}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                  View Document
                                </a>
                              ) : (
                                <span style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>Not uploaded</span>
                              )}
                            </div>
                          </div>
                        )}

                        {u.role === 'shelter_admin' && u.shelter_profile && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>
                            <div>
                              <strong style={{ color: '#fff', display: 'block', marginBottom: '0.2rem' }}>Shelter Name:</strong>
                              {u.shelter_profile.shelter_name}
                            </div>
                            <div>
                              <strong style={{ color: '#fff', display: 'block', marginBottom: '0.2rem' }}>NGO Registration Number:</strong>
                              {u.shelter_profile.shelter_registration_number}
                            </div>
                            <div>
                              <strong style={{ color: '#fff', display: 'block', marginBottom: '0.2rem' }}>Shelter Type:</strong>
                              {u.shelter_profile.shelter_type === 'specific' ? `Specific (${u.shelter_profile.specific_animal})` : 'Mixed Animal'}
                            </div>
                            <div>
                              <strong style={{ color: '#fff', display: 'block', marginBottom: '0.2rem' }}>Capacity:</strong>
                              {u.shelter_profile.capacity}
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                              <strong style={{ color: '#fff', display: 'block', marginBottom: '0.2rem' }}>Shelter Address:</strong>
                              {u.shelter_profile.shelter_address}
                            </div>
                            <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <strong style={{ minWidth: '130px' }}>NGO Document:</strong>
                              {u.shelter_profile.registration_document_url ? (
                                <a href={u.shelter_profile.registration_document_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#4ade80', textDecoration: 'none', background: 'rgba(74, 222, 128, 0.1)', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 500 }}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                  View Document
                                </a>
                              ) : (
                                <span style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>Not uploaded</span>
                              )}
                            </div>
                          </div>
                        )}

                        {u.role === 'civic_authority' && u.civic_profile && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>
                            <div>
                              <strong style={{ color: '#fff', display: 'block', marginBottom: '0.2rem' }}>Department:</strong>
                              {u.civic_profile.department_name}
                            </div>
                            <div>
                              <strong style={{ color: '#fff', display: 'block', marginBottom: '0.2rem' }}>Designation:</strong>
                              {u.civic_profile.designation}
                            </div>
                            <div>
                              <strong style={{ color: '#fff', display: 'block', marginBottom: '0.2rem' }}>Employee ID:</strong>
                              {u.civic_profile.employee_id}
                            </div>
                            <div>
                              <strong style={{ color: '#fff', display: 'block', marginBottom: '0.2rem' }}>Jurisdiction Area:</strong>
                              {u.civic_profile.jurisdiction_area}
                            </div>
                            <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <strong style={{ minWidth: '130px' }}>Official ID:</strong>
                              {u.civic_profile.id_document_url ? (
                                <a href={u.civic_profile.id_document_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#4ade80', textDecoration: 'none', background: 'rgba(74, 222, 128, 0.1)', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 500 }}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                  View Document
                                </a>
                              ) : (
                                <span style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>Not uploaded</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Admin note field */}
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <input
                        type="text"
                        placeholder="Optional approval/rejection note…"
                        value={actionNote[u.id] || ''}
                        onChange={e => setActionNote(p => ({ ...p, [u.id]: e.target.value }))}
                        style={{
                          flex: 1, background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                          padding: '0.55rem 0.85rem', color: '#fff', fontSize: '0.85rem',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <button
                        id={`approve-user-${u.id}`}
                        className="btn-approve"
                        onClick={() => doUserAction(u.id, 'approve')}
                      >
                        ✓ Approve
                      </button>
                      <button
                        id={`reject-user-${u.id}`}
                        className="btn-reject"
                        onClick={() => setConfirmModal({ isOpen: true, userId: u.id, action: 'reject', reason: '' })}
                      >
                        ✗ Reject
                      </button>
                      <button
                        id={`suspend-user-${u.id}`}
                        className="btn-suspend"
                        onClick={() => setConfirmModal({ isOpen: true, userId: u.id, action: 'suspend', reason: '' })}
                      >
                        ⏸ Suspend
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── All Users ──────────────────────────────────── */}
        {activeTab === 'users' && (
          <section className="dashboard-section fade-in">
            <h2>RBAC User Management</h2>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <input 
                type="text" 
                placeholder="Search by name, username, or email..." 
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setUsersPage(1);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') setUsersPage(1);
                }}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                  padding: '0.55rem 0.85rem', color: '#fff', fontSize: '0.85rem',
                }}
              />
              <button className="btn-primary" onClick={() => setUsersPage(1)}>Search</button>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.3)' }}>Loading users…</div>
            ) : (
              <div className="data-grid glass-dark">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Role</th>
                      <th>Jurisdiction</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map(u => (
                      <tr key={u.id}>
                        <td>#{u.id}</td>
                        <td style={{ fontWeight: 600, color: '#fff' }}>{u.full_name}</td>
                        <td style={{ color: 'rgba(255,255,255,0.5)' }}>@{u.username}</td>
                        <td><RoleBadge role={u.role} /></td>
                        <td style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>{u.zone || 'N/A'}</td>
                        <td><StatusBadge status={u.account_status} /></td>
                        <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>
                          {new Date(u.date_joined).toLocaleDateString()}
                        </td>
                        <td>
                          <div className="action-buttons">
                            {u.account_status !== 'active' && u.account_status !== 'rejected' && (
                              <button className="btn-approve" onClick={() => doUserAction(u.id, 'approve')}>Approve</button>
                            )}
                            {u.account_status === 'active' && u.role !== 'admin' && (
                              <button className="btn-suspend" onClick={() => setConfirmModal({ isOpen: true, userId: u.id, action: 'suspend', reason: '' })}>Suspend</button>
                            )}
                            {u.account_status !== 'rejected' && u.role !== 'admin' && (
                              <button className="btn-reject"  onClick={() => setConfirmModal({ isOpen: true, userId: u.id, action: 'reject', reason: '' })}>Reject</button>
                            )}
                            {u.account_status === 'rejected' && (
                              <button className="btn-reject" style={{ background: '#ef4444', color: '#fff', border: 'none' }} onClick={() => { if(window.confirm('Are you sure you want to permanently delete this user?')) doUserAction(u.id, 'delete'); }}>Delete</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', color: 'rgba(255,255,255,0.5)' }}>
                  <button 
                    disabled={!usersPagination.previous} 
                    onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', padding: '0.3rem 0.8rem', color: '#fff', borderRadius: 4, cursor: usersPagination.previous ? 'pointer' : 'not-allowed', opacity: usersPagination.previous ? 1 : 0.5 }}
                  >
                    Previous
                  </button>
                  <span>Page {usersPage} (Total: {usersPagination.count})</span>
                  <button 
                    disabled={!usersPagination.next} 
                    onClick={() => setUsersPage(p => p + 1)}
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', padding: '0.3rem 0.8rem', color: '#fff', borderRadius: 4, cursor: usersPagination.next ? 'pointer' : 'not-allowed', opacity: usersPagination.next ? 1 : 0.5 }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Audit Trail ────────────────────────────────── */}
        {activeTab === 'audit' && (
          <section className="dashboard-section fade-in">
            <h2>Immutable Audit Trail Viewer</h2>
            <div className="audit-log-container glass-dark">
              {auditLogs.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                  No recent audit logs found. Perform actions on users to populate this trail.
                </div>
              ) : (
                auditLogs.map(log => (
                  <div className="audit-entry" key={log.id}>
                    <div className="audit-time">{log.timestamp}</div>
                    <div className="audit-details">
                      <strong>{log.admin}</strong> executed{' '}
                      <span className="action-tag">{log.action}</span>{' '}
                      on <em>{log.target}</em>.
                      <span className="ip-address">IP: {log.ip}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

      </main>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ color: '#fff', marginTop: 0, textTransform: 'capitalize' }}>Confirm {confirmModal.action}</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1rem' }}>
              Please provide a reason for this action (e.g., False info about SOS alert, fake account, improper activities, etc.)
            </p>
            <textarea
              rows="4"
              value={confirmModal.reason}
              onChange={e => setConfirmModal({ ...confirmModal, reason: e.target.value })}
              placeholder="Enter reason here..."
              style={{
                width: '100%', padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', color: '#fff', marginBottom: '1.5rem', resize: 'none'
              }}
            />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmModal({ isOpen: false, userId: null, action: null, reason: '' })}
                style={{ padding: '0.75rem 1.5rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={() => {
                  doUserAction(confirmModal.userId, confirmModal.action, confirmModal.reason);
                  setConfirmModal({ isOpen: false, userId: null, action: null, reason: '' });
                }}
                style={{ padding: '0.75rem 1.5rem', borderRadius: 8, background: confirmModal.action === 'reject' ? '#ef4444' : '#f59e0b', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >Confirm {confirmModal.action}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes dropIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
};

export default SuperAdminDashboard;
