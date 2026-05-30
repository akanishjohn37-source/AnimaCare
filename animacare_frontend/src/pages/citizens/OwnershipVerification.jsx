import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, ShieldX, CheckCircle, AlertCircle, Loader2,
  Hash, Fingerprint, Cpu, Syringe, Lock, Unlock, ArrowRight,
  XCircle, AlertTriangle
} from 'lucide-react';
import './OwnershipVerification.css';

const VECTORS = [
  { key: 'municipal_id', label: 'LSGD Kerala Municipal License ID', icon: Hash, placeholder: 'COCHIN-CORP-2026-04192', hint: 'Your pet\'s civic registration token from the local self government.' },
  { key: 'owner_gov_id', label: 'Owner Government ID (PAN)', icon: Fingerprint, placeholder: 'ABCDE1234F', hint: 'This value is SHA-256 hashed on the server. Plaintext is never stored.' },
  { key: 'microchip_id', label: 'Animal Microchip Serial ID', icon: Cpu, placeholder: '956118000123456', hint: 'The 15-digit ISO microchip serial (e.g. starting with 956) implanted in your animal.' },
  { key: 'vaccination_batch', label: 'Anti-Rabies Vaccine Batch Serial', icon: Syringe, placeholder: 'ARV-BATCH-2026-A01', hint: 'The batch serial from your pet\'s most recent clinical vaccination record signed by a KSVC vet.' },
];

const VECTOR_ERRORS = {
  REGISTRY_NOT_FOUND: { vector: 1, label: 'Municipal License ID', color: '#ef4444' },
  IDENTITY_MISMATCH: { vector: 2, label: 'Owner Identity Hash', color: '#f97316' },
  MICROCHIP_MISMATCH: { vector: 3, label: 'Microchip Serial', color: '#eab308' },
  MEDICAL_BATCH_MISMATCH: { vector: 4, label: 'Vaccination Batch', color: '#ec4899' },
  INCOMPLETE_VECTORS: { vector: 0, label: 'Missing Fields', color: '#94a3b8' },
};

const OwnershipVerification = ({ petId, onVerified }) => {
  const [form, setForm] = useState({
    municipal_id: '',
    owner_gov_id: '',
    microchip_id: '',
    vaccination_batch: '',
  });
  const [status, setStatus] = useState('idle'); // idle, verifying, verified, failed, locked
  const [result, setResult] = useState(null);
  const [attempts, setAttempts] = useState(0);

  const MAX_ATTEMPTS = 5;

  const handleChange = (key, value) => {
    // Regex sanitization: remove leading/trailing whitespace
    let cleaned = value;
    if (key === 'owner_gov_id') {
      cleaned = value.replace(/[\s-]/g, '').toUpperCase();
    } else if (key === 'microchip_id') {
      cleaned = value.replace(/[\s-]/g, '');
    } else if (key === 'vaccination_batch') {
      cleaned = value.replace(/\s/g, '').toUpperCase();
    }

    setForm(p => ({ ...p, [key]: cleaned }));
    if (status === 'failed') {
      setStatus('idle');
      setResult(null);
    }
  };

  const allFilled = Object.values(form).every(v => v.trim() !== '');

  const handleVerify = async () => {
    if (!allFilled || status === 'locked') return;

    setStatus('verifying');
    setResult(null);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/auth/verify-ownership/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (res.ok && data.status === 'BINDING_VERIFIED') {
        setStatus('verified');
        setResult(data);
        if (onVerified) onVerified(data);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= MAX_ATTEMPTS) {
          setStatus('locked');
          setResult({ ...data, message: 'Maximum verification attempts exceeded. Account flagged for manual review.' });
        } else {
          setStatus('failed');
          setResult(data);
        }
      }
    } catch {
      setStatus('failed');
      setResult({ error: 'NETWORK_ERROR', message: 'Unable to reach verification server.' });
    }
  };

  const getVectorStatus = (vectorNum) => {
    if (status === 'verified') return 'pass';
    if (status === 'failed' && result) {
      const errorInfo = VECTOR_ERRORS[result.error];
      if (errorInfo && result.failed_vector) {
        if (vectorNum < result.failed_vector) return 'pass';
        if (vectorNum === result.failed_vector) return 'fail';
        return 'pending';
      }
    }
    return 'pending';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="ownership-verification"
    >
      {/* Header */}
      <div className="ov-header">
        <div className="ov-header-icon">
          {status === 'verified' ? <Unlock size={28} /> : <Lock size={28} />}
        </div>
        <h2 className="ov-title">Owner-Pet Binding Verification</h2>
        <p className="ov-subtitle">
          Cross-validate 4 credential vectors to confirm legal ownership binding.
        </p>
      </div>

      {/* Security Notice */}
      <div className="ov-security-notice">
        <Lock size={14} />
        <span>Government ID is SHA-256 hashed on the server. Plaintext is never stored in memory.</span>
      </div>

      {/* Vector Pipeline Visualization */}
      <div className="ov-pipeline">
        {VECTORS.map((v, i) => {
          const vStatus = getVectorStatus(i + 1);
          return (
            <div key={v.key} className={`ov-pipeline-step ${vStatus}`}>
              <div className="ov-pipeline-dot">
                {vStatus === 'pass' && <CheckCircle size={14} />}
                {vStatus === 'fail' && <XCircle size={14} />}
                {vStatus === 'pending' && <span>{i + 1}</span>}
              </div>
              <span className="ov-pipeline-label">{v.label.split('(')[0].trim()}</span>
              {i < 3 && <div className="ov-pipeline-line" />}
            </div>
          );
        })}
      </div>

      {/* Form Matrix */}
      <div className="ov-form-matrix">
        {VECTORS.map((v, i) => {
          const Icon = v.icon;
          const vStatus = getVectorStatus(i + 1);
          return (
            <div key={v.key} className={`ov-vector-field ${vStatus}`}>
              <label>
                <span className="ov-vector-num">Vector {i + 1}</span>
                {v.label}
              </label>
              <div className="ov-input-row">
                <div className="ov-input-icon"><Icon size={16} /></div>
                <input
                  type={v.key === 'owner_gov_id' ? 'password' : 'text'}
                  value={form[v.key]}
                  onChange={(e) => handleChange(v.key, e.target.value)}
                  placeholder={v.placeholder}
                  disabled={status === 'verified' || status === 'locked'}
                  autoComplete="off"
                />
                <div className="ov-input-status">
                  {vStatus === 'pass' && <CheckCircle size={16} className="ov-icon-pass" />}
                  {vStatus === 'fail' && <XCircle size={16} className="ov-icon-fail" />}
                </div>
              </div>
              <p className="ov-vector-hint">{v.hint}</p>
            </div>
          );
        })}
      </div>

      {/* Result Banner */}
      <AnimatePresence>
        {status === 'verified' && result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="ov-result ov-result--success"
          >
            <div className="ov-result-icon"><ShieldCheck size={32} /></div>
            <div className="ov-result-body">
              <h3>Binding Verified — Ownership Confirmed</h3>
              <p>All 4 verification vectors passed. An immutable verification seal has been applied to this pet's digital passport.</p>
              <div className="ov-result-details">
                <span>Pet: {result.pet_name}</span>
                <span>Zone: {result.zone}</span>
                <span>Vectors: {result.vectors_passed}/4 ✓</span>
              </div>
            </div>
          </motion.div>
        )}

        {status === 'failed' && result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="ov-result ov-result--error"
          >
            <div className="ov-result-icon"><AlertTriangle size={32} /></div>
            <div className="ov-result-body">
              <h3>Multi-Key Binding Mismatch</h3>
              <p>{result.message}</p>
              <div className="ov-result-error-code">
                Error: {result.error} — Vector {result.failed_vector} Failed
              </div>
              <div className="ov-attempts-warning">
                Attempts: {attempts}/{MAX_ATTEMPTS} — {MAX_ATTEMPTS - attempts} remaining before lockout.
              </div>
            </div>
          </motion.div>
        )}

        {status === 'locked' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="ov-result ov-result--locked"
          >
            <div className="ov-result-icon"><ShieldX size={32} /></div>
            <div className="ov-result-body">
              <h3>Verification Locked</h3>
              <p>Maximum verification attempts exceeded. This session has been flagged for manual review by a civic authority administrator.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Button */}
      {status !== 'verified' && (
        <button
          type="button"
          className="ov-submit-btn"
          disabled={!allFilled || status === 'verifying' || status === 'locked'}
          onClick={handleVerify}
        >
          {status === 'verifying' && <><Loader2 size={18} className="ov-spinner" /> Executing Sequential Validation…</>}
          {status === 'idle' && <><ShieldCheck size={18} /> Verify Owner-Pet Binding</>}
          {status === 'failed' && <><ShieldCheck size={18} /> Retry Verification ({MAX_ATTEMPTS - attempts} left)</>}
          {status === 'locked' && <><ShieldX size={18} /> Verification Locked</>}
        </button>
      )}
    </motion.div>
  );
};

export default OwnershipVerification;
