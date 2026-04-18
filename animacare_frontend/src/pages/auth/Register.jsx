import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Activity, User, Mail, Lock, Eye, EyeOff, Phone, MapPin,
  Stethoscope, Building2, Map, Shield, AlertCircle, CheckCircle,
  ArrowRight, ChevronDown, FileText, Award, Hash
} from 'lucide-react';
import './Auth.css';

const ROLES = [
  {
    value: 'citizen',
    label: 'Citizen / Pet Owner',
    icon: User,
    color: '#22d3ee',
    desc: 'Register pets, book appointments, access SOS & adoption services',
    approval: false,
  },
  {
    value: 'veterinarian',
    label: 'Veterinary Doctor',
    icon: Stethoscope,
    color: '#4ade80',
    desc: 'Manage clinical records, consultations and medical diagnostics',
    approval: true,
  },
  {
    value: 'shelter_admin',
    label: 'Shelter Administrator',
    icon: Building2,
    color: '#f59e0b',
    desc: 'Manage animal inventory, adoptions, SOS routing & shelter operations',
    approval: true,
  },
  {
    value: 'civic_authority',
    label: 'Civic Authority',
    icon: Map,
    color: '#a78bfa',
    desc: 'Disease surveillance, GIS heatmaps, public health broadcasts',
    approval: true,
  },
];

const STEPS = ['Select Role', 'Personal Info', 'Professional Details', 'Review'];

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]             = useState(0);
  const [selectedRole, setRole]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  const [form, setForm] = useState({
    // Base
    username: '', email: '', first_name: '', last_name: '',
    password: '', confirm_password: '',
    phone_number: '', address: '',
    // Vet
    veterinarian_profile: {
      clinic_hospital_name: '', medical_license_number: '',
      clinic_address: '', professional_contact_number: '',
      specialization: '', years_of_experience: '',
    },
    // Shelter
    shelter_profile: {
      shelter_name: '', shelter_registration_number: '',
      shelter_address: '', shelter_contact_number: '', capacity: '',
    },
    // Civic
    civic_profile: {
      department_name: '', employee_id: '',
      jurisdiction_area: '', designation: '', official_contact: '',
    },
  });

  const change = (e, section = null) => {
    let val = e.target.value;
    
    // Strict mobile number validation: only digits, max 10
    if (e.target.name === 'phone_number') {
      val = val.replace(/\D/g, '').slice(0, 10);
    }

    if (section) {
      setForm((p) => ({
        ...p,
        [section]: { ...p[section], [e.target.name]: val },
      }));
    } else {
      setForm((p) => ({ ...p, [e.target.name]: val }));
    }
    setError('');
  };

  const roleObj = ROLES.find((r) => r.value === selectedRole);

  const canNext = () => {
    if (step === 0) return !!selectedRole;
    if (step === 1) {
      return !!(form.username && form.email && form.first_name &&
             form.last_name && form.password && form.confirm_password &&
             form.phone_number.length === 10);
    }
    if (step === 2) {
      if (selectedRole === 'veterinarian') {
        return Object.values(form.veterinarian_profile).every(v => v.trim() !== '');
      }
      if (selectedRole === 'shelter_admin') {
        return Object.values(form.shelter_profile).every(v => v.trim() !== '');
      }
      if (selectedRole === 'civic_authority') {
        return Object.values(form.civic_profile).every(v => v.trim() !== '');
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.'); return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.'); return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        username: form.username,
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        password: form.password,
        confirm_password: form.confirm_password,
        role: selectedRole,
        phone_number: form.phone_number,
        address: form.address,
      };

      if (selectedRole === 'veterinarian') payload.veterinarian_profile = form.veterinarian_profile;
      if (selectedRole === 'shelter_admin') payload.shelter_profile = form.shelter_profile;
      if (selectedRole === 'civic_authority') payload.civic_profile = form.civic_profile;

      const result = await register(payload);

      if (result.requires_approval) {
        setSuccess(result.message);
        setStep(4); // "pending" state
      } else {
        // Citizen — auto-logged in, go to dashboard
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ──────────────── Step 0: Role Card ──────────────── */
  const renderRoleStep = () => (
    <div className="auth-roles-grid">
      {ROLES.map((r) => {
        const Icon = r.icon;
        const active = selectedRole === r.value;
        return (
          <button
            key={r.value}
            id={`role-card-${r.value}`}
            className={`auth-role-card ${active ? 'active' : ''}`}
            style={{ '--role-color': r.color }}
            onClick={() => { setRole(r.value); setError(''); }}
            type="button"
          >
            <div className="auth-role-card-icon">
              <Icon size={28} />
            </div>
            <div className="auth-role-card-label">{r.label}</div>
            <div className="auth-role-card-desc">{r.desc}</div>
            {r.approval && (
              <div className="auth-role-card-badge">Requires Approval</div>
            )}
            {active && <div className="auth-role-card-check"><CheckCircle size={18} /></div>}
          </button>
        );
      })}
    </div>
  );

  /* ──────────────── Step 1: Personal Info ──────────────── */
  const renderPersonalStep = () => (
    <div className="auth-fields-grid">
      <div className="auth-field">
        <label htmlFor="reg-first-name">First Name</label>
        <div className="auth-input-wrap">
          <User size={15} className="auth-input-icon" />
          <input id="reg-first-name" name="first_name" value={form.first_name}
            onChange={change} placeholder="John" />
        </div>
      </div>
      <div className="auth-field">
        <label htmlFor="reg-last-name">Last Name</label>
        <div className="auth-input-wrap">
          <User size={15} className="auth-input-icon" />
          <input id="reg-last-name" name="last_name" value={form.last_name}
            onChange={change} placeholder="Doe" />
        </div>
      </div>
      <div className="auth-field auth-field--full">
        <label htmlFor="reg-username">Username</label>
        <div className="auth-input-wrap">
          <Hash size={15} className="auth-input-icon" />
          <input id="reg-username" name="username" value={form.username}
            onChange={change} placeholder="john_doe_123" />
        </div>
      </div>
      <div className="auth-field auth-field--full">
        <label htmlFor="reg-email">Email Address</label>
        <div className="auth-input-wrap">
          <Mail size={15} className="auth-input-icon" />
          <input id="reg-email" name="email" type="email" value={form.email}
            onChange={change} placeholder="john@example.com" />
        </div>
      </div>
      <div className="auth-field">
        <label htmlFor="reg-phone">Phone Number</label>
        <div className="auth-input-wrap">
          <Phone size={15} className="auth-input-icon" />
          <input id="reg-phone" name="phone_number" value={form.phone_number}
            onChange={change} placeholder="10 digit number" />
        </div>
      </div>
      <div className="auth-field">
        <label htmlFor="reg-address">Address</label>
        <div className="auth-input-wrap">
          <MapPin size={15} className="auth-input-icon" />
          <input id="reg-address" name="address" value={form.address}
            onChange={change} placeholder="City, State" />
        </div>
      </div>
      <div className="auth-field">
        <label htmlFor="reg-password">Password</label>
        <div className="auth-input-wrap">
          <Lock size={15} className="auth-input-icon" />
          <input id="reg-password" name="password" type="password"
            value={form.password} onChange={change} placeholder="Min 8 characters" />
        </div>
      </div>
      <div className="auth-field">
        <label htmlFor="reg-confirm-password">Confirm Password</label>
        <div className="auth-input-wrap">
          <Lock size={15} className="auth-input-icon" />
          <input id="reg-confirm-password" name="confirm_password"
            type={showPass ? 'text' : 'password'} value={form.confirm_password}
            onChange={change} placeholder="Repeat password" />
        </div>
      </div>
    </div>
  );

  /* ──────────────── Step 2: Professional Info (role-specific) ──────────────── */
  const renderProfessionalStep = () => {
    if (selectedRole === 'citizen') {
      return (
        <div className="auth-no-extra">
          <CheckCircle size={48} color="#4ade80" />
          <h3>All set!</h3>
          <p>Citizens don't need additional verification. Your account will be activated immediately.</p>
        </div>
      );
    }
    if (selectedRole === 'veterinarian') {
      const vp = form.veterinarian_profile;
      const ch = (e) => change(e, 'veterinarian_profile');
      return (
        <div className="auth-fields-grid">
          <div className="auth-field auth-field--full">
            <label>Clinic / Hospital Name</label>
            <div className="auth-input-wrap"><Building2 size={15} className="auth-input-icon" />
              <input name="clinic_hospital_name" value={vp.clinic_hospital_name} onChange={ch}
                placeholder="Green Valley Animal Hospital" /></div>
          </div>
          <div className="auth-field">
            <label>Medical License Number</label>
            <div className="auth-input-wrap"><Award size={15} className="auth-input-icon" />
              <input name="medical_license_number" value={vp.medical_license_number} onChange={ch}
                placeholder="VET-2024-00123" /></div>
          </div>
          <div className="auth-field">
            <label>Specialization</label>
            <div className="auth-input-wrap"><Stethoscope size={15} className="auth-input-icon" />
              <input name="specialization" value={vp.specialization} onChange={ch}
                placeholder="Small Animals / Surgery" /></div>
          </div>
          <div className="auth-field">
            <label>Professional Contact</label>
            <div className="auth-input-wrap"><Phone size={15} className="auth-input-icon" />
              <input name="professional_contact_number" value={vp.professional_contact_number} onChange={ch}
                placeholder="+91 98765 43210" /></div>
          </div>
          <div className="auth-field">
            <label>Years of Experience</label>
            <div className="auth-input-wrap"><Hash size={15} className="auth-input-icon" />
              <input name="years_of_experience" type="number" value={vp.years_of_experience} onChange={ch}
                placeholder="5" /></div>
          </div>
          <div className="auth-field auth-field--full">
            <label>Clinic Address</label>
            <div className="auth-input-wrap"><MapPin size={15} className="auth-input-icon" />
              <input name="clinic_address" value={vp.clinic_address} onChange={ch}
                placeholder="123 Vet Street, City" /></div>
          </div>
        </div>
      );
    }
    if (selectedRole === 'shelter_admin') {
      const sp = form.shelter_profile;
      const ch = (e) => change(e, 'shelter_profile');
      return (
        <div className="auth-fields-grid">
          <div className="auth-field auth-field--full">
            <label>Shelter Name</label>
            <div className="auth-input-wrap"><Building2 size={15} className="auth-input-icon" />
              <input name="shelter_name" value={sp.shelter_name} onChange={ch}
                placeholder="Happy Paws Animal Shelter" /></div>
          </div>
          <div className="auth-field">
            <label>Registration Number</label>
            <div className="auth-input-wrap"><FileText size={15} className="auth-input-icon" />
              <input name="shelter_registration_number" value={sp.shelter_registration_number} onChange={ch}
                placeholder="SHLT-2024-00456" /></div>
          </div>
          <div className="auth-field">
            <label>Capacity (animals)</label>
            <div className="auth-input-wrap"><Hash size={15} className="auth-input-icon" />
              <input name="capacity" type="number" value={sp.capacity} onChange={ch}
                placeholder="50" /></div>
          </div>
          <div className="auth-field">
            <label>Contact Number</label>
            <div className="auth-input-wrap"><Phone size={15} className="auth-input-icon" />
              <input name="shelter_contact_number" value={sp.shelter_contact_number} onChange={ch}
                placeholder="+91 98765 43210" /></div>
          </div>
          <div className="auth-field auth-field--full">
            <label>Shelter Address</label>
            <div className="auth-input-wrap"><MapPin size={15} className="auth-input-icon" />
              <input name="shelter_address" value={sp.shelter_address} onChange={ch}
                placeholder="45 Shelter Road, City" /></div>
          </div>
        </div>
      );
    }
    if (selectedRole === 'civic_authority') {
      const cp = form.civic_profile;
      const ch = (e) => change(e, 'civic_profile');
      return (
        <div className="auth-fields-grid">
          <div className="auth-field auth-field--full">
            <label>Department Name</label>
            <div className="auth-input-wrap"><Building2 size={15} className="auth-input-icon" />
              <input name="department_name" value={cp.department_name} onChange={ch}
                placeholder="Municipal Animal Control Dept." /></div>
          </div>
          <div className="auth-field">
            <label>Employee ID</label>
            <div className="auth-input-wrap"><Hash size={15} className="auth-input-icon" />
              <input name="employee_id" value={cp.employee_id} onChange={ch}
                placeholder="EMP-GOV-0234" /></div>
          </div>
          <div className="auth-field">
            <label>Designation</label>
            <div className="auth-input-wrap"><Award size={15} className="auth-input-icon" />
              <input name="designation" value={cp.designation} onChange={ch}
                placeholder="Animal Welfare Officer" /></div>
          </div>
          <div className="auth-field">
            <label>Jurisdiction Area</label>
            <div className="auth-input-wrap"><Map size={15} className="auth-input-icon" />
              <input name="jurisdiction_area" value={cp.jurisdiction_area} onChange={ch}
                placeholder="North Zone, City Name" /></div>
          </div>
          <div className="auth-field">
            <label>Official Contact</label>
            <div className="auth-input-wrap"><Phone size={15} className="auth-input-icon" />
              <input name="official_contact" value={cp.official_contact} onChange={ch}
                placeholder="+91 98765 43210" /></div>
          </div>
        </div>
      );
    }
    return null;
  };

  /* ──────────────── Step 3: Review ──────────────── */
  const renderReviewStep = () => (
    <div className="auth-review">
      <div className="auth-review-role" style={{ '--role-color': roleObj?.color }}>
        {roleObj && <roleObj.icon size={22} />}
        <span>{roleObj?.label}</span>
      </div>
      <div className="auth-review-grid">
        <div className="auth-review-item"><span>Name</span><strong>{form.first_name} {form.last_name}</strong></div>
        <div className="auth-review-item"><span>Username</span><strong>{form.username}</strong></div>
        <div className="auth-review-item"><span>Email</span><strong>{form.email}</strong></div>
        {form.phone_number && <div className="auth-review-item"><span>Phone</span><strong>{form.phone_number}</strong></div>}
      </div>
      {roleObj?.approval && (
        <div className="auth-alert auth-alert--info" style={{ marginTop: '1rem' }}>
          <AlertCircle size={16} />
          Your account will require <strong>Admin Approval</strong> before activation.
          You'll receive a notification once reviewed.
        </div>
      )}
    </div>
  );

  /* ──────────────── Pending Success ──────────────── */
  if (step === 4 && success) {
    return (
      <div className="auth-page auth-page--center">
        <div className="auth-card auth-card--success">
          <div className="auth-success-icon"><CheckCircle size={64} /></div>
          <h2>Registration Submitted!</h2>
          <p>{success}</p>
          <div className="auth-pending-steps">
            <div className="auth-pending-step"><span>1</span>Admin reviews your credentials</div>
            <div className="auth-pending-step"><span>2</span>You receive approval notification</div>
            <div className="auth-pending-step"><span>3</span>Log in and access your dashboard</div>
          </div>
          <Link to="/login" className="auth-submit-btn" style={{ textDecoration: 'none', display: 'inline-flex', marginTop: '1.5rem' }}>
            Go to Login <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const stepTitles = ['Choose Your Role', 'Personal Information', 'Professional Details', 'Review & Submit'];

  return (
    <div className="auth-page">
      <div className="auth-branding">
        <div className="auth-brand-content">
          <div className="auth-brand-logo"><Activity size={40} /></div>
          <h1 className="auth-brand-name">AnimaCare</h1>
          <p className="auth-brand-tagline">Join the Unified Animal Welfare Ecosystem</p>

          <div className="auth-stepper">
            {STEPS.map((s, i) => (
              <div key={s} className={`auth-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
                <div className="auth-step-dot">{i < step ? <CheckCircle size={14} /> : <span>{i + 1}</span>}</div>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2>{stepTitles[step]}</h2>
            <p>
              {step === 0 && 'Select the role that best describes you'}
              {step === 1 && 'Fill in your basic account details'}
              {step === 2 && (selectedRole === 'citizen' ? 'No extra details required!' : 'Provide your professional credentials')}
              {step === 3 && 'Confirm your information before submitting'}
            </p>
          </div>

          <form onSubmit={step === 3 ? handleSubmit : (e) => e.preventDefault()}>
            {step === 0 && renderRoleStep()}
            {step === 1 && renderPersonalStep()}
            {step === 2 && renderProfessionalStep()}
            {step === 3 && renderReviewStep()}

            {error && (
              <div className="auth-alert auth-alert--error" style={{ marginTop: '1rem' }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div className="auth-nav-btns">
              {step > 0 && (
                <button type="button" className="auth-back-btn" onClick={() => setStep((p) => p - 1)}>
                  ← Back
                </button>
              )}
              {step < 3 && (
                <button
                  type="button"
                  id={`register-next-step-${step}`}
                  className="auth-submit-btn"
                  onClick={() => {
                    if (!canNext()) {
                      setError('Please fill in all required fields accurately before proceeding.');
                    } else {
                      setError('');
                      setStep((p) => p + 1);
                    }
                  }}
                >
                  Continue <ArrowRight size={16} />
                </button>
              )}
              {step === 3 && (
                <button
                  type="submit"
                  id="register-submit-btn"
                  className="auth-submit-btn"
                  disabled={loading}
                >
                  {loading ? <span className="auth-btn-spinner" /> : <>Create Account <ArrowRight size={16} /></>}
                </button>
              )}
            </div>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login" id="goto-login-link">Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
