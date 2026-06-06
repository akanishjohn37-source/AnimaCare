import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Activity, User, Mail, Lock, Eye, EyeOff, Phone, MapPin,
  Stethoscope, Building2, Map, Shield, AlertCircle, CheckCircle,
  ArrowRight, ChevronDown, FileText, Award, Hash, Loader2, ShieldCheck, ShieldX
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

const KERALA_LOCAL_BODIES = [
  'Kochi Municipal Corporation',
  'Thiruvananthapuram Corporation',
  'Kozhikode Corporation',
  'Kollam Corporation',
  'Thrissur Corporation',
  'Kannur Corporation',
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
  const [darpanStatus, setDarpanStatus] = useState('idle'); // idle, verifying, verified, invalid
  const [darpanDetails, setDarpanDetails] = useState(null);
  const [vetLicenseStatus, setVetLicenseStatus] = useState('idle'); // idle, verifying, verified, invalid
  const [vetLicenseDetails, setVetLicenseDetails] = useState(null);
  const [municipalId, setMunicipalId] = useState('');
  const [municipalStatus, setMunicipalStatus] = useState('idle'); // idle, verifying, verified, invalid
  const [municipalDetails, setMunicipalDetails] = useState(null);
  const [occupiedZones, setOccupiedZones] = useState([]);
  const [farmLocations, setFarmLocations] = useState([]);
  const [currentLocationInput, setCurrentLocationInput] = useState('');

  const API_BASE = `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/auth`;

  const verifyVetLicense = async (licenseNumber) => {
    if (!licenseNumber.trim()) return;
    setVetLicenseStatus('verifying');
    setVetLicenseDetails(null);
    try {
      const res = await fetch(`${API_BASE}/verify-vet-license/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_number: licenseNumber }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'AUTHENTICATED') {
        setVetLicenseStatus('verified');
        setVetLicenseDetails(data);
      } else {
        setVetLicenseStatus('invalid');
        setVetLicenseDetails(data);
      }
    } catch {
      setVetLicenseStatus('invalid');
      setVetLicenseDetails({ message: 'Network error. Verification service unavailable.' });
    }
  };

  const verifyDarpanId = async (darpanId) => {
    if (!darpanId.trim()) return;
    setDarpanStatus('verifying');
    setDarpanDetails(null);
    try {
      const res = await fetch(`${API_BASE}/verify-darpan/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ darpan_id: darpanId }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'VERIFIED') {
        setDarpanStatus('verified');
        setDarpanDetails(data);
      } else {
        setDarpanStatus('invalid');
        setDarpanDetails(data);
      }
    } catch {
      setDarpanStatus('invalid');
      setDarpanDetails({ message: 'Network error. Verification service unavailable.' });
    }
  };

  const verifyMunicipalRegistration = async (mId) => {
    if (!mId.trim()) return;
    setMunicipalStatus('verifying');
    setMunicipalDetails(null);
    try {
      const res = await fetch(`${API_BASE}/verify-municipal/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ municipal_id: mId }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'VERIFIED') {
        const selectedJur = form.civic_profile.jurisdiction_area;
        if (selectedJur && data.zone !== selectedJur) {
          setMunicipalStatus('invalid');
          setMunicipalDetails({ message: `Jurisdiction mismatch: This code is registered for '${data.zone}', but you selected '${selectedJur}'.` });
          return;
        }
        setMunicipalStatus('verified');
        setMunicipalDetails(data);
        setForm(p => ({
          ...p,
          zone: data.zone || p.zone,
          civic_profile: {
            ...p.civic_profile,
            jurisdiction_area: data.zone || p.civic_profile.jurisdiction_area
          }
        }));
      } else {
        setMunicipalStatus('invalid');
        setMunicipalDetails(data);
      }
    } catch {
      setMunicipalStatus('invalid');
      setMunicipalDetails({ message: 'Network error. Verification service unavailable.' });
    }
  };

  useEffect(() => {
    fetch(`${API_BASE}/occupied-civic-zones/`)
      .then(res => res.json())
      .then(data => {
        if (data.occupied_zones) {
          setOccupiedZones(data.occupied_zones);
        }
      })
      .catch(err => console.error("Error fetching occupied zones:", err));
  }, []);

  const [form, setForm] = useState({
    // Base
    username: '', email: '', first_name: '', last_name: '',
    password: '', confirm_password: '',
    phone_number: '', address: '', zone: '',
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
      shelter_type: 'mixed', specific_animal: '',
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
    const phoneFields = ['phone_number', 'professional_contact_number', 'shelter_contact_number', 'official_contact', 'contact_number'];
    if (phoneFields.includes(e.target.name)) {
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
             form.phone_number.length === 10 && (selectedRole === 'civic_authority' || form.zone));
    }
    if (step === 2) {
      if (selectedRole === 'veterinarian') {
        return Object.values(form.veterinarian_profile).every(v => v.trim() !== '') && form.veterinarian_profile.professional_contact_number.length === 10;
      }
      if (selectedRole === 'shelter_admin') {
        const sp = form.shelter_profile;
        const baseOk = !!(sp.shelter_name && sp.shelter_registration_number && sp.shelter_address && sp.capacity !== '' && sp.shelter_contact_number.length === 10);
        if (sp.shelter_type === 'specific') {
          return baseOk && !!(sp.specific_animal && sp.specific_animal.trim());
        }
        return baseOk;
      }
      if (selectedRole === 'civic_authority') {
        return Object.values(form.civic_profile).every(v => v.trim() !== '') && 
               form.civic_profile.official_contact.length === 10 && 
               municipalStatus === 'verified';
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
        zone: form.zone,
      };

      if (selectedRole === 'veterinarian') payload.veterinarian_profile = form.veterinarian_profile;
      if (selectedRole === 'shelter_admin') payload.shelter_profile = form.shelter_profile;
      if (selectedRole === 'civic_authority') payload.civic_profile = form.civic_profile;
      if (selectedRole === 'citizen') payload.farm_locations = farmLocations;

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
      {selectedRole !== 'civic_authority' && (
        <div className="auth-field auth-field--full">
          <label htmlFor="reg-zone">Local Body Jurisdiction (Corporation / Zone)</label>
          <div className="auth-input-wrap">
            <MapPin size={15} className="auth-input-icon" />
            <select 
              id="reg-zone" 
              name="zone" 
              value={form.zone} 
              onChange={change}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#fff',
                outline: 'none',
                padding: '0 0.5rem',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              <option value="" disabled style={{ background: '#0f172a' }}>Select Local Body / Corporation</option>
              {KERALA_LOCAL_BODIES.map(lb => (
                <option key={lb} value={lb} style={{ background: '#0f172a' }}>{lb}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      <div className="auth-field">
        <label htmlFor="reg-password">Password</label>
        <div className="auth-input-wrap">
          <Lock size={15} className="auth-input-icon" />
          <input id="reg-password" name="password" type={showPass ? 'text' : 'password'}
            value={form.password} onChange={change} placeholder="Min 8 characters" />
          <button type="button" className="auth-eye-btn" onClick={() => setShowPass((p) => !p)} aria-label="Toggle password visibility">
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <div className="auth-field">
        <label htmlFor="reg-confirm-password">Confirm Password</label>
        <div className="auth-input-wrap">
          <Lock size={15} className="auth-input-icon" />
          <input id="reg-confirm-password" name="confirm_password"
            type={showPass ? 'text' : 'password'} value={form.confirm_password}
            onChange={change} placeholder="Repeat password" />
          <button type="button" className="auth-eye-btn" onClick={() => setShowPass((p) => !p)} aria-label="Toggle password visibility">
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
    </div>
  );

  /* ──────────────── Step 2: Professional Info (role-specific) ──────────────── */
  const renderProfessionalStep = () => {
    if (selectedRole === 'citizen') {
      return (
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>
          <h3 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={20} color="#22d3ee" /> Farm Locations (Optional)
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            If you own livestock, register your farm locations below. You can select these locations from a dropdown when adding livestock passports.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div className="auth-input-wrap" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <MapPin size={15} className="auth-input-icon" style={{ marginLeft: '0.75rem' }} />
              <input
                value={currentLocationInput}
                onChange={(e) => setCurrentLocationInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (currentLocationInput.trim()) {
                      if (!farmLocations.includes(currentLocationInput.trim())) {
                        setFarmLocations([...farmLocations, currentLocationInput.trim()]);
                      }
                      setCurrentLocationInput('');
                    }
                  }
                }}
                placeholder="e.g. West Barn, Sector 4 Meadow"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  outline: 'none',
                  padding: '0.75rem'
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (currentLocationInput.trim()) {
                  if (!farmLocations.includes(currentLocationInput.trim())) {
                    setFarmLocations([...farmLocations, currentLocationInput.trim()]);
                  }
                  setCurrentLocationInput('');
                }
              }}
              style={{
                background: '#22d3ee',
                color: '#0f172a',
                border: 'none',
                borderRadius: '8px',
                padding: '0 1.5rem',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              Add
            </button>
          </div>

          {farmLocations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>Registered Locations ({farmLocations.length})</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {farmLocations.map((loc, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: 'rgba(34, 211, 238, 0.1)',
                      border: '1px solid rgba(34, 211, 238, 0.3)',
                      borderRadius: '20px',
                      padding: '0.25rem 0.75rem',
                      color: '#22d3ee',
                      fontSize: '0.85rem'
                    }}
                  >
                    <span>{loc}</span>
                    <button
                      type="button"
                      onClick={() => setFarmLocations(farmLocations.filter((_, i) => i !== idx))}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Remove location"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: '1.5rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              No farm locations added yet. You can still register without them and manage them later.
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'rgba(74, 222, 128, 0.05)', border: '1px solid rgba(74, 222, 128, 0.15)', borderRadius: '8px', color: '#4ade80', fontSize: '0.85rem' }}>
            <CheckCircle size={16} />
            <span>Registration verification is automatic for citizen accounts.</span>
          </div>
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
          <div className="auth-field auth-field--full">
            <label>Medical License Number (KSVC / State Council)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div className="auth-input-wrap" style={{ flex: 1 }}>
                <Award size={15} className="auth-input-icon" />
                <input name="medical_license_number" value={vp.medical_license_number}
                  onChange={(e) => { ch(e); setVetLicenseStatus('idle'); setVetLicenseDetails(null); }}
                  placeholder="e.g. KSVC.Reg.1234" />
              </div>
              <button
                type="button"
                disabled={vetLicenseStatus === 'verifying' || !vp.medical_license_number.trim()}
                style={{
                  background: vetLicenseStatus === 'verified' ? '#059669' : vetLicenseStatus === 'invalid' ? '#dc2626' : '#4f46e5',
                  color: 'white', border: 'none', borderRadius: '8px', padding: '0 1rem',
                  cursor: vetLicenseStatus === 'verifying' ? 'wait' : 'pointer',
                  fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.35rem',
                  minWidth: '120px', justifyContent: 'center', transition: 'all 0.3s ease',
                }}
                onClick={() => verifyVetLicense(vp.medical_license_number)}
              >
                {vetLicenseStatus === 'verifying' && <><Loader2 size={14} className="auth-btn-spinner" /> Verifying…</>}
                {vetLicenseStatus === 'idle' && <><ShieldCheck size={14} /> Verify License</>}
                {vetLicenseStatus === 'verified' && <><CheckCircle size={14} /> Verified</>}
                {vetLicenseStatus === 'invalid' && <><ShieldX size={14} /> Retry</>}
              </button>
            </div>
            {vetLicenseStatus === 'verified' && vetLicenseDetails && (
              <div style={{ color: '#4ade80', fontSize: '0.85rem', marginTop: '0.4rem', background: 'rgba(74,222,128,0.08)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(74,222,128,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 'bold', marginBottom: '0.25rem' }}><CheckCircle size={14} /> License Authenticated</div>
                <div style={{ fontSize: '0.78rem', color: '#86efac' }}>Registry: {vetLicenseDetails.state_council} • Expires: {vetLicenseDetails.expiry}</div>
              </div>
            )}
            {vetLicenseStatus === 'invalid' && vetLicenseDetails && (
              <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.4rem', background: 'rgba(239,68,68,0.08)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 'bold', marginBottom: '0.25rem' }}><AlertCircle size={14} /> Verification Failed</div>
                <div style={{ fontSize: '0.78rem', color: '#fca5a5' }}>{vetLicenseDetails.message}</div>
              </div>
            )}
          </div>
          <div className="auth-field auth-field--full">
            <label>Upload Registration Certificate</label>
            <input type="file" name="registration_certificate" accept="image/*,.pdf" className="auth-input-wrap" style={{ padding: '0.5rem', width: '100%' }} />
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>The Municipality Admin will manually verify your license via the State Veterinary Council database.</p>
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
          <div className="auth-field auth-field--full">
            <label>NGO Darpan Unique ID (Kerala)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div className="auth-input-wrap" style={{ flex: 1 }}>
                <FileText size={15} className="auth-input-icon" />
                <input name="shelter_registration_number" value={sp.shelter_registration_number}
                  onChange={(e) => { ch(e); setDarpanStatus('idle'); setDarpanDetails(null); }}
                  placeholder="e.g. KL/2026/0123456" />
              </div>
              <button 
                type="button"
                disabled={darpanStatus === 'verifying' || !sp.shelter_registration_number.trim()}
                style={{
                  background: darpanStatus === 'verified' ? '#059669' : darpanStatus === 'invalid' ? '#dc2626' : '#4f46e5',
                  color: 'white', border: 'none', borderRadius: '8px', padding: '0 1rem',
                  cursor: darpanStatus === 'verifying' ? 'wait' : 'pointer',
                  fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.35rem',
                  minWidth: '120px', justifyContent: 'center', transition: 'all 0.3s ease',
                }}
                onClick={() => verifyDarpanId(sp.shelter_registration_number)}
              >
                {darpanStatus === 'verifying' && <><Loader2 size={14} className="auth-btn-spinner" /> Verifying…</>}
                {darpanStatus === 'idle' && <><ShieldCheck size={14} /> Verify ID</>}
                {darpanStatus === 'verified' && <><CheckCircle size={14} /> Verified</>}
                {darpanStatus === 'invalid' && <><ShieldX size={14} /> Retry</>}
              </button>
            </div>
            {darpanStatus === 'verified' && darpanDetails && (
              <div style={{ color: '#4ade80', fontSize: '0.85rem', marginTop: '0.4rem', background: 'rgba(74,222,128,0.08)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(74,222,128,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 'bold', marginBottom: '0.25rem' }}><CheckCircle size={14} /> Organization Verified via NGO Darpan</div>
                <div style={{ fontSize: '0.78rem', color: '#86efac' }}>Org: {darpanDetails.org_name} • State: {darpanDetails.state} • Standing: {darpanDetails.compliance?.replace('_', ' ')}</div>
              </div>
            )}
            {darpanStatus === 'invalid' && darpanDetails && (
              <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.4rem', background: 'rgba(239,68,68,0.08)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 'bold', marginBottom: '0.25rem' }}><AlertCircle size={14} /> Verification Failed</div>
                <div style={{ fontSize: '0.78rem', color: '#fca5a5' }}>{darpanDetails.message}</div>
              </div>
            )}
          </div>
          <div className="auth-field">
            <label>Capacity (animals)</label>
            <div className="auth-input-wrap"><Hash size={15} className="auth-input-icon" />
              <input name="capacity" type="number" value={sp.capacity} onChange={ch}
                placeholder="50" /></div>
          </div>
          <div className="auth-field">
            <label>Shelter Type</label>
            <div className="auth-input-wrap">
              <Building2 size={15} className="auth-input-icon" />
              <select 
                name="shelter_type" 
                value={sp.shelter_type} 
                onChange={ch}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  outline: 'none',
                  padding: '0 0.5rem',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                <option value="mixed" style={{ background: '#0f172a' }}>Mixed Animal Shelter</option>
                <option value="specific" style={{ background: '#0f172a' }}>Specific Animal Shelter</option>
              </select>
            </div>
          </div>
          {sp.shelter_type === 'specific' && (
            <div className="auth-field auth-field--full">
              <label>Target Animal / Species</label>
              <div className="auth-input-wrap"><Activity size={15} className="auth-input-icon" />
                <input name="specific_animal" value={sp.specific_animal} onChange={ch}
                  placeholder="e.g. Dogs, Cats, Birds" /></div>
            </div>
          )}
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
            <label htmlFor="civic-jurisdiction">Jurisdiction Area (Corporation)</label>
            <div className="auth-input-wrap">
              <Map size={15} className="auth-input-icon" />
              <select 
                id="civic-jurisdiction" 
                name="jurisdiction_area" 
                value={cp.jurisdiction_area} 
                onChange={(e) => {
                  ch(e);
                  setForm(p => ({ ...p, zone: e.target.value }));
                  setMunicipalStatus('idle');
                  setMunicipalDetails(null);
                }}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  outline: 'none',
                  padding: '0 0.5rem',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                <option value="" disabled style={{ background: '#0f172a' }}>Select Corporation</option>
                {KERALA_LOCAL_BODIES.map(lb => {
                  const isOccupied = occupiedZones.includes(lb);
                  return (
                    <option 
                      key={lb} 
                      value={lb} 
                      disabled={isOccupied} 
                      style={{ 
                        background: '#0f172a',
                        color: isOccupied ? '#64748b' : '#fff'
                      }}
                    >
                      {lb} {isOccupied ? '(Already Registered)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          <div className="auth-field">
            <label>Official Contact</label>
            <div className="auth-input-wrap"><Phone size={15} className="auth-input-icon" />
              <input name="official_contact" value={cp.official_contact} onChange={ch}
                placeholder="+91 98765 43210" /></div>
          </div>

          {/* LSGD Kerala Municipal License Verification Portal Panel */}
          <div className="auth-field auth-field--full" style={{ marginTop: '1.5rem', padding: '1.25rem', borderRadius: '12px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' }}>
            <label style={{ color: '#c4b5fd', fontSize: '0.95rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold' }}>
              <Building2 size={18} /> LSGD Kerala (Sanchaya/Sevana) Department Code Verification
            </label>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: '1rem' }}>
              Verify your local body municipal authority registration code under LSGD Kerala guidelines.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div className="auth-input-wrap" style={{ flex: 1 }}>
                <Award size={15} className="auth-input-icon" />
                <input 
                  type="text" 
                  placeholder="e.g. COCHIN-CORP-2026-04192" 
                  value={municipalId}
                  onChange={(e) => { setMunicipalId(e.target.value); setMunicipalStatus('idle'); setMunicipalDetails(null); }}
                />
              </div>
              <button
                type="button"
                disabled={municipalStatus === 'verifying' || !municipalId.trim()}
                onClick={() => verifyMunicipalRegistration(municipalId)}
                style={{
                  background: municipalStatus === 'verified' ? '#059669' : municipalStatus === 'invalid' ? '#dc2626' : '#4f46e5',
                  color: 'white', border: 'none', borderRadius: '8px', padding: '0 1rem',
                  cursor: municipalStatus === 'verifying' ? 'wait' : 'pointer',
                  fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.35rem',
                  minWidth: '120px', justifyContent: 'center', transition: 'all 0.3s ease',
                }}
              >
                {municipalStatus === 'verifying' && <><Loader2 size={14} className="auth-btn-spinner" /> Verifying…</>}
                {municipalStatus === 'idle' && <><ShieldCheck size={14} /> Verify ID</>}
                {municipalStatus === 'verified' && <><CheckCircle size={14} /> Verified</>}
                {municipalStatus === 'invalid' && <><ShieldX size={14} /> Retry</>}
              </button>
            </div>
            {municipalStatus === 'verified' && municipalDetails && (
              <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', fontSize: '0.85rem', color: '#4ade80' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 'bold', marginBottom: '0.25rem' }}><CheckCircle size={14} /> LSGD Kerala Department Verified</div>
                <div style={{ fontSize: '0.78rem', color: '#86efac' }}>Local Body: {municipalDetails.zone} • Validity: {municipalDetails.registered_date} to {municipalDetails.expiry_date}</div>
              </div>
            )}
            {municipalStatus === 'invalid' && municipalDetails && (
              <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.85rem', color: '#ef4444' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 'bold', marginBottom: '0.25rem' }}><AlertCircle size={14} /> Verification Failed</div>
                <div style={{ fontSize: '0.78rem', color: '#fca5a5' }}>{municipalDetails.message}</div>
              </div>
            )}
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
        {selectedRole === 'shelter_admin' && (
          <>
            <div className="auth-review-item"><span>Shelter Name</span><strong>{form.shelter_profile.shelter_name}</strong></div>
            <div className="auth-review-item"><span>NGO Darpan ID</span><strong>{form.shelter_profile.shelter_registration_number}</strong></div>
            <div className="auth-review-item"><span>Capacity</span><strong>{form.shelter_profile.capacity}</strong></div>
            <div className="auth-review-item"><span>Shelter Type</span><strong>{form.shelter_profile.shelter_type === 'specific' ? `Specific (${form.shelter_profile.specific_animal})` : 'Mixed Animal'}</strong></div>
          </>
        )}
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
