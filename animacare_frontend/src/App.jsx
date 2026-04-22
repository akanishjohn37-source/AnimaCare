import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Navbar from './components/layout/Navbar';
import './App.css';

// ── Lazy-loaded pages ────────────────────────────────────────────────────────
// Auth
const Login           = lazy(() => import('./pages/auth/Login'));
const Register        = lazy(() => import('./pages/auth/Register'));
const PendingApproval = lazy(() => import('./pages/auth/PendingApproval'));
const Unauthorized    = lazy(() => import('./pages/auth/Unauthorized'));

// Citizen
const Dashboard          = lazy(() => import('./pages/citizens/Dashboard'));
const SOSMap             = lazy(() => import('./pages/citizens/SOSMap'));
const PetPassportForm    = lazy(() => import('./pages/citizens/PetPassportForm'));
const AdoptionPortal     = lazy(() => import('./pages/citizens/AdoptionPortal'));
const MedicalViewer      = lazy(() => import('./pages/citizens/MedicalViewer'));
const Appointments       = lazy(() => import('./pages/citizens/Appointments'));


// Shelter Admin
const ShelterDashboard   = lazy(() => import('./pages/ShelterDashboard'));

// Veterinarian
const VetDashboard       = lazy(() => import('./pages/vet/VetDashboard'));

// Analytics (Vet + Citizen)
const LifestyleAssessment     = lazy(() => import('./pages/analytics/LifestyleAssessment'));
const SmartMatchDashboard     = lazy(() => import('./pages/analytics/SmartMatchDashboard'));
const PredictiveHealthDashboard = lazy(() => import('./pages/analytics/PredictiveHealthDashboard'));

// Civic Authority
const CivicAuthorityDashboard = lazy(() => import('./pages/CivicAuthorityDashboard'));

// Super Admin
const SuperAdminDashboard     = lazy(() => import('./pages/superadmin/SuperAdminDashboard'));

// ── Page Loader ──────────────────────────────────────────────────────────────
const PageLoader = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '60vh', flexDirection: 'column', gap: '1rem'
  }}>
    <div style={{
      width: 48, height: 48,
      border: '4px solid rgba(139,92,246,0.2)',
      borderTopColor: '#8b5cf6',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading module…</p>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#fca5a5' }}>
          <h3>⚠ Module Error</h3>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
            {this.state.error?.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              marginTop: '1rem', padding: '0.6rem 1.25rem',
              background: '#7c3aed', color: '#fff',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* ── Public routes ──────────────────────────── */}
                  <Route path="/login"    element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/unauthorized" element={<Unauthorized />} />
                  <Route path="/pending-approval" element={<PendingApproval />} />

                  {/* ── Citizen routes ─────────────────────────── */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute roles={['citizen']}>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/pet/new" element={
                    <ProtectedRoute roles={['citizen']}>
                      <PetPassportForm />
                    </ProtectedRoute>
                  } />
                  <Route path="/medical/:petId" element={
                    <ProtectedRoute roles={['citizen', 'veterinarian']}>
                      <MedicalViewer />
                    </ProtectedRoute>
                  } />
                  <Route path="/medical/all" element={
                    <ProtectedRoute roles={['citizen', 'veterinarian']}>
                      <MedicalViewer />
                    </ProtectedRoute>
                  } />
                  <Route path="/adopt" element={
                    <ProtectedRoute roles={['citizen', 'shelter_admin']}>
                      <AdoptionPortal />
                    </ProtectedRoute>
                  } />
                  <Route path="/sos" element={
                    <ProtectedRoute roles={['citizen', 'shelter_admin']}>
                      <SOSMap />
                    </ProtectedRoute>
                  } />
                  <Route path="/appointments" element={
                    <ProtectedRoute roles={['citizen']}>
                      <Appointments />
                    </ProtectedRoute>
                  } />


                  {/* ── Veterinarian routes ────────────────────── */}
                  <Route path="/vet-dashboard" element={
                    <ProtectedRoute roles={['veterinarian']}>
                      <VetDashboard />
                    </ProtectedRoute>
                  } />

                  {/* ── Shelter routes ─────────────────────────── */}
                  <Route path="/shelter-dashboard" element={
                    <ProtectedRoute roles={['shelter_admin']}>
                      <ShelterDashboard />
                    </ProtectedRoute>
                  } />

                  {/* ── Analytics routes (vet + citizen) ──────── */}
                  <Route path="/lifestyle-assessment" element={
                    <ProtectedRoute roles={['citizen', 'veterinarian']}>
                      <LifestyleAssessment />
                    </ProtectedRoute>
                  } />
                  <Route path="/smart-match" element={
                    <ProtectedRoute roles={['citizen', 'shelter_admin']}>
                      <SmartMatchDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/predictive-health" element={
                    <ProtectedRoute roles={['veterinarian', 'shelter_admin']}>
                      <PredictiveHealthDashboard />
                    </ProtectedRoute>
                  } />

                  {/* ── Civic Authority ────────────────────────── */}
                  <Route path="/civic-dashboard" element={
                    <ProtectedRoute roles={['civic_authority', 'admin']}>
                      <CivicAuthorityDashboard />
                    </ProtectedRoute>
                  } />

                  {/* ── Super Admin ────────────────────────────── */}
                  <Route path="/superadmin" element={
                    <ProtectedRoute roles={['admin']}>
                      <SuperAdminDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/superadmin/*" element={
                    <ProtectedRoute roles={['admin']}>
                      <SuperAdminDashboard />
                    </ProtectedRoute>
                  } />

                  {/* ── Default redirect ───────────────────────── */}
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
