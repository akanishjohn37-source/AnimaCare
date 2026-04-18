import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Activity, User, AlertCircle, Heart, FileText,
  Map, Shield, Stethoscope, Building2, LogOut,
  ChevronDown, LayoutDashboard, BookOpen, ClipboardList,
  BarChart2, PlusCircle, Bell
} from 'lucide-react';
import './Navbar.css';

/* Role → nav items mapping */
const NAV_MAP = {
  citizen: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'   },
    { to: '/pet/new',      icon: PlusCircle,      label: 'Add Pet'      },
    { to: '/medical/all',  icon: FileText,        label: 'Medical'      },
    { to: '/adopt',        icon: Heart,           label: 'Adoption'     },
  ],
  veterinarian: [
    { to: '/vet-dashboard',     icon: LayoutDashboard, label: 'Dashboard'    },
    { to: '/medical/all',       icon: ClipboardList,   label: 'Patient Records'},
    { to: '/predictive-health', icon: BarChart2,        label: 'Analytics'    },
  ],
  shelter_admin: [
    { to: '/shelter-dashboard', icon: LayoutDashboard, label: 'Dashboard'    },
    { to: '/adopt',             icon: Heart,           label: 'Adoptions'    },
    { to: '/sos',               icon: AlertCircle,     label: 'SOS Center'   },
  ],
  civic_authority: [
    { to: '/civic-dashboard',   icon: Map,             label: 'Civic Portal' },
    { to: '/predictive-health', icon: BarChart2,        label: 'Analytics'   },
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropOpen, setDropOpen] = useState(false);

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
      <nav className="navbar glass-panel">
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
    <nav className="navbar glass-panel">
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
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        {/* Right actions */}
        <div className="nav-actions">
          {/* SOS — citizens & shelter admins */}
          {(role === 'citizen' || role === 'shelter_admin') && (
            <NavLink to="/sos" className="sos-btn">
              <AlertCircle size={18} />
              <span>SOS</span>
            </NavLink>
          )}

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
