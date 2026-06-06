import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as Yup from 'yup';
import { motion } from 'framer-motion';
import { Camera, Save } from 'lucide-react';
import './PetPassport.css';

const PetSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  species: Yup.string().required('Species is required'),
  breed: Yup.string().when('isLivestock', { is: false, then: () => Yup.string().required('Breed is required') }),
  livestock_type: Yup.string().when('isLivestock', { is: true, then: () => Yup.string().required('Livestock type is required') }),
  gender: Yup.string().required('Gender is required'),
  dob: Yup.date().max(new Date(), 'Date cannot be in the future').required('Date is required'),
});

const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400; const MAX_HEIGHT = 400;
        let width = img.width; let height = img.height;
        if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
        else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    };
  });
};

const PetPassportForm = () => {
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [initialData, setInitialData] = useState({ 
    name: '', species: '', breed: '', gender: '', dob: '',
    livestock_type: '', farm_location: ''
  });
  const [isFetching, setIsFetching] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const type = queryParams.get('type') || 'pet';
  const isLivestock = type === 'livestock';
  const { authFetch, user } = useAuth();

  useEffect(() => {
    if (id) {
      setIsFetching(true);
      const url = isLivestock 
        ? `http://localhost:8000/api/citizens/livestocks/${id}/` 
        : `http://localhost:8000/api/citizens/pets/${id}/`;
      
      authFetch(url)
        .then(res => { if (res.ok) return res.json(); throw new Error("Failed to load data"); })
        .then(data => {
          setInitialData({
            name: data.name || '',
            species: data.species || '',
            breed: data.breed || '',
            gender: data.gender || '',
            dob: data.dob ? new Date(data.dob).toISOString().split('T')[0] : '',
            livestock_type: data.livestock_type || '',
            farm_location: data.farm_location || ''
          });
          if (data.media_url) setAvatarPreview(data.media_url);
        })
        .catch(err => console.error(err))
        .finally(() => setIsFetching(false));
    }
  }, [id, authFetch, isLivestock]);

  // Municipal verification functions removed from pet register page

  if (isFetching) return <div style={{ color: 'white', padding: '3rem', textAlign: 'center' }}>Loading Data...</div>;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="passport-container glass-panel">
      <div className="passport-header">
        <h1 className="page-title gradient-text">{id ? `Update ${isLivestock ? 'Livestock' : 'Pet'} Profile` : `Register ${isLivestock ? 'Livestock' : 'Pet'}`}</h1>
        <p className="page-subtitle">{isLivestock ? 'Manage livestock herds on the network.' : 'Register your pet on the AnimaCare network.'}</p>
      </div>

      <Formik
        enableReinitialize={true}
        initialValues={{ ...initialData, isLivestock }}
        validationSchema={PetSchema}
        onSubmit={async (values, { setSubmitting, setStatus }) => {
          try {
            const data = {
              name: values.name,
              species: values.species,
              gender: values.gender,
              dob: values.dob,
            };
            if (!isLivestock) {
              data.breed = values.breed;
            } else {
              data.livestock_type = values.livestock_type;
              data.farm_location = values.farm_location;
            }
            if (values.avatar) data.media_url = values.avatar;
            // Municipal registration data moved to Civic Authority verification page
            
            const baseUrl = isLivestock ? 'http://localhost:8000/api/citizens/livestocks/' : 'http://localhost:8000/api/citizens/pets/';
            const url = id ? `${baseUrl}${id}/` : baseUrl;
            
            const response = await authFetch(url, { method: id ? 'PATCH' : 'POST', body: JSON.stringify(data) });

            if (!response.ok) {
              const errData = await response.json();
              let errorMsg = `Failed to ${id ? 'update' : 'create'} record.`;
              if (errData.detail) errorMsg = errData.detail;
              else if (typeof errData === 'object' && Object.keys(errData).length > 0) {
                  const firstKey = Object.keys(errData)[0];
                  errorMsg = Array.isArray(errData[firstKey]) ? `${firstKey.replace('_', ' ').toUpperCase()}: ${errData[firstKey][0]}` : errData[firstKey];
              }
              throw new Error(errorMsg);
            }
            
            setSubmitting(false);
            navigate('/dashboard');
          } catch(err) {
            setStatus({ error: err.message });
            setSubmitting(false);
          }
        }}
      >
        {({ isSubmitting, setFieldValue, status }) => (
          <Form className="passport-form">
            {status && status.error && <div style={{ color: '#ef4444', textAlign: 'center', marginBottom: '1rem', background: 'rgba(239,68,68,0.1)', padding: '0.5rem', borderRadius: '8px' }}>{status.error}</div>}
            
            <div className="avatar-upload">
              <label htmlFor="pet-avatar" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="avatar-preview" style={{ overflow: 'hidden' }}>
                  {avatarPreview ? <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera size={32} />}
                </div>
                <p style={{ marginTop: '0.5rem', marginBottom: '0.2rem' }}>Upload Avatar</p>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>(Max 5MB, Auto-compressed)</p>
              </label>
              <input id="pet-avatar" name="avatar" type="file" accept="image/*" style={{ display: 'none' }}
                onChange={async (event) => {
                  const file = event.currentTarget.files[0];
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) { alert("File too large!"); return; }
                    const compressedBase64 = await compressImage(file);
                    setFieldValue('avatar', compressedBase64);
                    setAvatarPreview(compressedBase64);
                  }
                }}
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">{isLivestock ? 'Herd / Animal Name *' : 'Pet Name *'}</label>
                <Field type="text" name="name" className="form-control" placeholder={isLivestock ? 'Dairy Herd A' : 'Buddy'} />
                <ErrorMessage name="name" component="div" className="form-error" />
              </div>

              <div className="form-group">
                <label className="form-label">Species *</label>
                <Field as="select" name="species" className="form-control">
                  <option value="">Select Species</option>
                  {!isLivestock && <>
                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
                    <option value="Bird">Bird</option>
                  </>}
                  {isLivestock && <>
                    <option value="Bovine">Bovine</option>
                    <option value="Poultry">Poultry</option>
                    <option value="Goat">Goat/Sheep</option>
                    <option value="Equine">Equine</option>
                  </>}
                  <option value="Other">Other</option>
                </Field>
                <ErrorMessage name="species" component="div" className="form-error" />
              </div>

              {!isLivestock && (
                <div className="form-group">
                  <label className="form-label">Breed *</label>
                  <Field type="text" name="breed" className="form-control" placeholder="Golden Retriever" />
                  <ErrorMessage name="breed" component="div" className="form-error" />
                </div>
              )}

              {isLivestock && (
                <>
                  <div className="form-group">
                    <label className="form-label">Livestock Type *</label>
                    <Field type="text" name="livestock_type" className="form-control" placeholder="Dairy Cows" />
                    <ErrorMessage name="livestock_type" component="div" className="form-error" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Farm Location</label>
                    <Field as="select" name="farm_location" className="form-control">
                      <option value="">Select Farm Location</option>
                      {(user?.farm_locations || []).map((loc) => (
                        <option key={loc.id || loc.name} value={loc.name}>
                          {loc.name}
                        </option>
                      ))}
                    </Field>
                    <ErrorMessage name="farm_location" component="div" className="form-error" />
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">Gender *</label>
                <Field as="select" name="gender" className="form-control">
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Unknown">Mixed/Unknown</option>
                </Field>
                <ErrorMessage name="gender" component="div" className="form-error" />
              </div>

              <div className="form-group">
                <label className="form-label">Date of Birth / Foundation *</label>
                <Field type="date" name="dob" className="form-control" max={new Date().toISOString().split('T')[0]} />
                <ErrorMessage name="dob" component="div" className="form-error" />
              </div>

            </div>

            {/* LSGD municipal verification moved to Civic Authority portal */}

            <div className="form-actions">
              <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-lg">
                <Save size={20} /> {id ? 'Save Changes' : `Register ${isLivestock ? 'Livestock' : 'Pet'}`}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </motion.div>
  );
};

export default PetPassportForm;
