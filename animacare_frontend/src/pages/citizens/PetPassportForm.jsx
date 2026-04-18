import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as Yup from 'yup';
import { motion } from 'framer-motion';
import { Camera, Save } from 'lucide-react';
import './PetPassport.css';

const PetSchema = Yup.object().shape({
  name: Yup.string().required('Pet name is required'),
  species: Yup.string().required('Species is required'),
  breed: Yup.string().required('Breed is required'),
  gender: Yup.string().required('Gender is required'),
  dob: Yup.date()
    .max(new Date(), 'Date of birth cannot be in the future')
    .required('Date of birth is required'),
  microchipId: Yup.string()
    .matches(/^[0-9]*$/, 'Microchip ID must contain only digits')
    .max(15, 'Microchip ID cannot exceed 15 digits'),
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
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    };
  });
};

const PetPassportForm = () => {
  const [avatarPreview, setAvatarPreview] = useState(null);
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="passport-container glass-panel"
    >
      <div className="passport-header">
        <h1 className="page-title gradient-text">Initialize Pet Passport</h1>
        <p className="page-subtitle">Register your pet on the blockchain-secured AnimaCare network.</p>
      </div>

      <Formik
        initialValues={{ name: '', species: '', breed: '', gender: '', dob: '', microchipId: '' }}
        validationSchema={PetSchema}
        onSubmit={async (values, { setSubmitting, setStatus }) => {
          try {
            const data = {
              name: values.name,
              species: values.species,
              breed: values.breed,
              gender: values.gender,
              dob: values.dob,
            };
            if (values.microchipId) data.rfid_tag = values.microchipId;
            if (values.avatar) data.media_url = values.avatar;
            
            const response = await authFetch('http://localhost:8000/api/citizens/pets/', {
              method: 'POST',
              body: JSON.stringify(data)
            });

            if (!response.ok) {
              const errData = await response.json();
              // Extract specific field errors from DRF response (e.g. { rfid_tag: ["pet with this rfid tag already exists."] })
              let errorMsg = 'Failed to create pet record. Please try again.';
              if (errData.detail) {
                  errorMsg = errData.detail;
              } else if (typeof errData === 'object' && Object.keys(errData).length > 0) {
                  const firstKey = Object.keys(errData)[0];
                  errorMsg = Array.isArray(errData[firstKey]) ? `${firstKey.replace('_', ' ').toUpperCase()}: ${errData[firstKey][0]}` : errData[firstKey];
              }
              throw new Error(errorMsg);
            }
            
            setSubmitting(false);
            navigate('/dashboard'); // Route back to see the new pet
          } catch(err) {
            setStatus({ error: err.message });
            setSubmitting(false);
          }
        }}
      >
        {({ isSubmitting, setFieldValue, status }) => (
          <Form className="passport-form">
            {status && status.error && (
               <div style={{ color: '#ef4444', textAlign: 'center', marginBottom: '1rem', background: 'rgba(239,68,68,0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                 {status.error}
               </div>
            )}
            <div className="avatar-upload">
              <label htmlFor="pet-avatar" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="avatar-preview" style={{ overflow: 'hidden' }}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Pet Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Camera size={32} />
                  )}
                </div>
                <p style={{ marginTop: '0.5rem', marginBottom: '0.2rem' }}>Upload Avatar</p>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>(Max 5MB, Auto-compressed)</p>
              </label>
              <input 
                id="pet-avatar"
                name="avatar"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={async (event) => {
                  const file = event.currentTarget.files[0];
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                      alert("File is too large! Please upload an image smaller than 5MB.");
                      return;
                    }
                    const compressedBase64 = await compressImage(file);
                    setFieldValue('avatar', compressedBase64);
                    setAvatarPreview(compressedBase64);
                  }
                }}
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Pet Name *</label>
                <Field type="text" name="name" className="form-control" placeholder="Buddy" />
                <ErrorMessage name="name" component="div" className="form-error" />
              </div>

              <div className="form-group">
                <label className="form-label">Species *</label>
                <Field as="select" name="species" className="form-control">
                  <option value="">Select Species</option>
                  <option value="Dog">Dog</option>
                  <option value="Cat">Cat</option>
                  <option value="Bovine">Bovine</option>
                  <option value="Bird">Bird</option>
                  <option value="Other">Other</option>
                </Field>
                <ErrorMessage name="species" component="div" className="form-error" />
              </div>

              <div className="form-group">
                <label className="form-label">Breed *</label>
                <Field type="text" name="breed" className="form-control" placeholder="Golden Retriever" />
                <ErrorMessage name="breed" component="div" className="form-error" />
              </div>

              <div className="form-group">
                <label className="form-label">Gender *</label>
                <Field as="select" name="gender" className="form-control">
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Unknown">Unknown</option>
                </Field>
                <ErrorMessage name="gender" component="div" className="form-error" />
              </div>

              <div className="form-group">
                <label className="form-label">Date of Birth (Approx) *</label>
                <Field type="date" name="dob" className="form-control" max={new Date().toISOString().split('T')[0]} />
                <ErrorMessage name="dob" component="div" className="form-error" />
              </div>

              <div className="form-group">
                <label className="form-label">Microchip ID (Optional)</label>
                <Field type="text" name="microchipId" className="form-control" placeholder="15-digit ISO number" maxLength="15" />
                <ErrorMessage name="microchipId" component="div" className="form-error" />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-lg">
                <Save size={20} /> Initialize Digital Passport
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </motion.div>
  );
};

export default PetPassportForm;
