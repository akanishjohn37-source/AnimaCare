import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Activity, User, AlertCircle, Heart, FileText,
  Map, Shield, Stethoscope, Building2, LogOut,
  ChevronDown, LayoutDashboard, BookOpen, ClipboardList,
  BarChart2, PlusCircle, Bell, Calendar
} from 'lucide-react';
import './Navbar.css';

/* Role → nav items mapping */
const NAV_MAP = {
  citizen: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'   },
    { to: '/pet/new',      icon: PlusCircle,      label: 'Add Pet'      },
    { to: '/medical/all',  icon: FileText,        label: 'Medical'      },
    { to: '/appointments', icon: Stethoscope,     label: 'Appointments' },
    { to: '/adopt',        icon: Heart,           label: 'Adoption'     },
  ],

  veterinarian: [
    { to: '/vet-dashboard',     icon: LayoutDashboard, label: 'Clinical Portal' },
    { to: '/vaccination-scheduler', icon: Calendar, label: 'Vaccines' },
    { to: '/predictive-health', icon: BarChart2,        label: 'Analytics'    },
  ],
  shelter_admin: [
    { to: '/shelter-dashboard', icon: LayoutDashboard, label: 'Dashboard'    },
    { to: '/adopt',             icon: Heart,           label: 'Adoptions'    },
  ],
  civic_authority: [
    { to: '/civic-dashboard',   icon: Map,             label: 'Civic Portal' },
    { to: '/civic-analytics',   icon: BarChart2,        label: 'Analytics'   },
  ],
  admin: [
    { to: '/superadmin',        icon: Shield,          label: 'Admin Panel'  },
    { to: '/superadmin/users',  icon: User,            label: 'Users'        },
    { to: '/civic-dashboard',   icon: Map,             label: 'Civic Data'   },
  ],
};

const ROLE_COLORS = {
  citizen:         '#22d3ee',
  veterinarian:    '#4ade80',
  shelter_admin:   '#f59e0b',
  civic_authority: '#a78bfa',
  admin:           '#f43f5e',
};

const ROLE_ICONS = {
  citizen:         User,
  veterinarian:    Stethoscope,
  shelter_admin:   Building2,
  civic_authority: Map,
  admin:           Shield,
};

const Navbar = () => {
  const { user, logout, authFetch } = useAuth();
  const navigate = useNavigate();
  const [dropOpen, setDropOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  React.useEffect(() => {
    if (user) {
      const fetchNotifs = () => {
        authFetch('http://localhost:8000/api/auth/notifications/')
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              setNotifications(data);
              setUnreadCount(data.filter(n => !n.is_read).length);
            }
          })
          .catch(err => console.error("Notif error", err));
      };
      fetchNotifs();
      const interval = setInterval(fetchNotifs, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [user, authFetch]);

  const markRead = (id) => {
    authFetch(`http://localhost:8000/api/auth/notifications/${id}/mark_as_read/`, { method: 'POST' })
      .then(() => {
        setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      });
  };

  const clearAllNotifications = (e) => {
    e.stopPropagation();
    e.preventDefault();
    authFetch(`http://localhost:8000/api/auth/notifications/clear_all/`, { method: 'POST' })
      .then(() => {
        setNotifications([]);
        setUnreadCount(0);
      })
      .catch(err => console.error("Error clearing notifications", err));
  };

  const role      = user?.role;
  const color     = ROLE_COLORS[role] || '#8b5cf6';
  const navItems  = NAV_MAP[role] || [];
  const RoleIcon  = ROLE_ICONS[role] || User;
  const roleLabel = user?.role?.replace('_', ' ') || '';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // If not logged in, show minimal public nav
  if (!user) {
    return (
      <nav className="navbar glass-panel no-print">
        <div className="navbar-container">
          <NavLink to="/login" className="navbar-brand">
            <Activity className="brand-icon" size={28} />
            <span className="brand-text gradient-text">AnimaCare</span>
          </NavLink>
          <div className="nav-links">
            <NavLink to="/login"    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><User size={18}/><span>Login</span></NavLink>
            <NavLink to="/register" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Shield size={18}/><span>Register</span></NavLink>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar glass-panel no-print">
      <div className="navbar-container">
        {/* Brand */}
        <NavLink to={navItems[0]?.to || '/dashboard'} className="navbar-brand">
          <Activity className="brand-icon" size={28} />
          <span className="brand-text gradient-text">AnimaCare</span>
        </NavLink>

        {/* Role-specific nav links */}
        <div className="nav-links">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/superadmin'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        {/* Right actions */}
        <div className="nav-actions">
          {['citizen', 'shelter_admin'].includes(role) && (
            <NavLink to="/sos" className="sos-btn">
              <AlertCircle size={18} />
              <span>SOS</span>
            </NavLink>
          )}

          {/* Notifications */}
          <div className="nav-profile-wrap" onBlur={() => setTimeout(() => setNotifOpen(false), 200)}>
            <button className="nav-profile-btn" style={{ padding: '0.5rem' }} onClick={() => setNotifOpen(!notifOpen)}>
               <Bell size={20} color={unreadCount > 0 ? '#f59e0b' : 'rgba(255,255,255,0.6)'} />
               {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>
            {notifOpen && (
              <div className="nav-dropdown" style={{ width: '300px', right: 0 }}>
                <div className="nav-dropdown-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>Notifications</strong>
                  {notifications.length > 0 && (
                     <button onMouseDown={clearAllNotifications} style={{ background: 'none', border: 'none', color: '#f43f5e', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>Clear All</button>
                  )}
                </div>
                <div className="notif-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                   {notifications.length > 0 ? (
                     notifications.map(n => (
                       <div key={n.id} onClick={() => !n.is_read && markRead(n.id)} className={`notif-item ${!n.is_read ? 'unread' : ''}`} style={{ padding: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.2s' }}>
                          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.85rem' }}>{n.title}</p>
                          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{n.message}</p>
                          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)' }}>{new Date(n.created_at).toLocaleString()}</span>
                       </div>
                     ))
                   ) : (
                     <p style={{ padding: '1.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>No notifications</p>
                   )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="nav-profile-wrap" onBlur={() => setTimeout(() => setDropOpen(false), 150)}>
            <button
              className="nav-profile-btn"
              onClick={() => setDropOpen((p) => !p)}
              aria-label="User menu"
              aria-expanded={dropOpen}
            >
              <img
                src={user.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.first_name || user.username)}&background=${color.replace('#', '')}&color=fff`}
                alt="Profile"
                className="profile-img"
              />
              <div className="nav-user-info">
                <span className="nav-user-name">{user.first_name || user.username}</span>
                <span className="nav-user-role" style={{ color }}>{user.get_role_display || roleLabel}</span>
              </div>
              <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.4)', transition: 'transform 0.2s', transform: dropOpen ? 'rotate(180deg)' : 'none' }} />
            </button>

            {dropOpen && (
              <div className="nav-dropdown">
                <div className="nav-dropdown-header">
                  <strong>{user.first_name} {user.last_name}</strong>
                  <span>{user.email}</span>
                  <div className="nav-dropdown-status" style={{ color }}>
                    <RoleIcon size={12} /> {roleLabel}
                  </div>
                </div>
                <div className="nav-dropdown-divider" />
                <button className="nav-dropdown-item nav-dropdown-item--danger" onMouseDown={handleLogout}>
                  <LogOut size={15} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
