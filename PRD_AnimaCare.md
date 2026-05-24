# AnimaCare — Product Requirements Document (PRD)

**Version:** 2.0 (Source-Code Verified)  
**Date:** 2026-05-21  
**Author:** Auto-Generated via Exhaustive Codebase Analysis  
**Status:** Baseline — Verified Against All Source Files  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Goals](#2-product-vision--goals)
3. [Target Users & Roles](#3-target-users--roles)
4. [System Architecture](#4-system-architecture)
5. [Technology Stack](#5-technology-stack)
6. [Module Breakdown](#6-module-breakdown)
   - 6.1 [Authentication & User Management](#61-authentication--user-management-appusers)
   - 6.2 [Pet Registration & Citizen Services](#62-pet-registration--citizen-services-appcitizens)
   - 6.3 [Clinical Records & Veterinary Workflows](#63-clinical-records--veterinary-workflows-appclinical)
   - 6.4 [Shelter Management & Adoption Pipeline](#64-shelter-management--adoption-pipeline-appshelter)
   - 6.5 [AI Analytics & Smart Matching](#65-ai-analytics--smart-matching-appanalytics)
   - 6.6 [Public Health & Civic Authority](#66-public-health--civic-authority-apppublic_health)
   - 6.7 [Super Admin Governance](#67-super-admin-governance-appgovernance)
7. [Database Schema](#7-database-schema)
8. [API Endpoints Reference](#8-api-endpoints-reference)
9. [Frontend Architecture](#9-frontend-architecture)
10. [Security & Access Control](#10-security--access-control)
11. [UI/UX Design System](#11-uiux-design-system)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [Known Bugs & Issues](#13-known-bugs--issues)
14. [Known Gaps & Missing Features](#14-known-gaps--missing-features)
15. [Future Roadmap](#15-future-roadmap)

---

## 1. Executive Summary

**AnimaCare** is a comprehensive digital platform for animal welfare management that connects six user roles — Citizens, Agricultural Facilities, Veterinarians, Shelter Administrators, Civic Authorities, and Super Admins — under a unified ecosystem. 

The platform provides:
- **Pet passport system** with digital identity and medical records
- **Clinical workflow management** for veterinarians including appointments, consultations, prescriptions, and diagnostic media
- **Shelter operations** with real-time SOS alert monitoring, Kanban adoption pipeline, and capacity tracking
- **AI-powered adoption matching** using rule-based compatibility scoring
- **Zoonotic disease surveillance** with GIS heatmaps and geo-fenced mass broadcast alerts
- **Predictive health analytics** with weight trajectory monitoring
- **Super admin governance** with user approval workflows, audit trails, and system health monitoring

### Architecture Overview
| Layer | Technology |
|---|---|
| **Frontend** | React 18 SPA (Vite), React Router v7, Framer Motion, Leaflet Maps, Chart.js |
| **Backend** | Django 6.0.3, Django REST Framework, Custom JWT (PyJWT), Django Channels |
| **Database** | SQLite (development) / PostgreSQL (planned) |
| **Real-time** | WebSocket via Django Channels (InMemoryChannelLayer) |
| **Media** | Base64/URL storage (S3 planned but not configured) |

---

## 2. Product Vision & Goals

### Vision
To create a unified digital ecosystem that streamlines animal welfare operations, connects all stakeholders, and improves outcomes for animals through technology, data, and intelligent matching.

### Goals
1. **Digitize pet ownership** — Pet passport system with RFID/microchip tracking and complete medical histories
2. **Streamline veterinary workflows** — Digital appointments, consultations with vital signs, vaccinations with tamper-proof hashing, and diagnostic media uploads
3. **Optimize adoption processes** — AI compatibility scoring matching adopters to animals based on lifestyle assessments
4. **Enable rapid emergency response** — Real-time SOS alert monitoring with GPS, rescue mission workflow, and shelter intake pipeline
5. **Empower civic governance** — Zoonotic disease GIS heatmaps, geo-fenced mass broadcasts, and public health analytics
6. **Ensure data security** — JWT authentication with role-based access control and account approval workflows
7. **Support predictive health** — Weight trajectory analysis and health risk flagging for early veterinary intervention

---

## 3. Target Users & Roles

| Role | Code Value | Approval | Key Capabilities |
|---|---|---|---|
| **Citizen (Pet Owner)** | `citizen` | Auto-approved | Register pets, view medical records, book appointments, adopt animals, file SOS alerts |
| **Agricultural Facility** | `agricultural_facility` | Requires admin approval | Livestock management, SOS alerts (shares citizen routes) |
| **Veterinarian** | `veterinarian` | Requires admin approval | Clinical consultations, vaccinations, prescriptions, diagnostic media, zoonotic reporting |
| **Shelter Administrator** | `shelter_admin` | Requires admin approval | Real-time SOS monitoring, rescue missions, animal inventory, Kanban adoption pipeline, capacity tracking |
| **Civic Authority** | `civic_authority` | Requires admin approval | Zoonotic disease heatmaps, mass broadcast alerts, public health analytics |
| **Super Admin** | `admin` | N/A | User approval/suspension, audit trails, system health, platform governance |

### Profile Models per Role

| Role | Profile Model | Key Fields |
|---|---|---|
| Veterinarian | `VeterinarianProfile` | clinic_hospital_name, medical_license_number (unique), specialization, years_of_experience, license_document_url |
| Shelter Admin | `ShelterAdminProfile` | shelter_name, shelter_registration_number (unique), shelter_address, capacity, registration_document_url |
| Civic Authority | `CivicAuthorityProfile` | department_name, employee_id (unique), jurisdiction_area, designation, id_document_url |
| Agricultural Facility | `AgriculturalFacilityProfile` | facility_name, facility_type, registration_number (unique), contact_person |

---

## 4. System Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                              │
│   React 18 SPA (Vite) · React Router v7 · Framer Motion          │
│   Leaflet Maps · Chart.js · @hello-pangea/dnd (Kanban)            │
│   Formik + Yup (Validation) · Lucide React (Icons)                │
│   Dark Glassmorphism UI · CSS Custom Properties · Outfit Font     │
└───────────────────────┬────────────────────┬──────────────────────┘
                        │ REST API (HTTP)    │ WebSocket (WS)
                        │ JWT Bearer Auth    │ Django Channels
┌───────────────────────▼────────────────────▼──────────────────────┐
│                         SERVER LAYER                              │
│   Django 6.0.3 · DRF · Custom JWT (PyJWT) · Django Channels      │
│   ASGI (HTTP + WebSocket) · CORS (allow all in dev)               │
│                                                                   │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌─────────────────────┐ │
│  │  users   │ │ citizens  │ │ clinical │ │      shelter        │ │
│  │  (auth)  │ │(pets,SOS) │ │(vet work)│ │ (inventory,adopt)   │ │
│  └──────────┘ └───────────┘ └──────────┘ └─────────────────────┘ │
│  ┌───────────────┐ ┌─────────────────┐ ┌────────────────────────┐│
│  │   analytics   │ │  public_health  │ │     governance        ││
│  │ (AI matching) │ │  (civic dash)   │ │   (super admin)       ││
│  └───────────────┘ └─────────────────┘ └────────────────────────┘│
└───────────────────────┬──────────────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────────────┐
│                        DATA LAYER                                │
│   SQLite3 (Development) / PostgreSQL (Production planned)        │
│   24+ Models across 7 Django Apps                                │
│   Django ORM · Migrations · InMemoryChannelLayer                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Technology Stack

### Backend
| Technology | Version/Details | Purpose |
|---|---|---|
| Python | 3.13 | Server-side language |
| Django | 6.0.3 | Web framework |
| Django REST Framework | Latest | RESTful API layer |
| PyJWT | Latest | Custom JWT authentication (NOT SimpleJWT) |
| Django Channels | Latest | WebSocket support (ASGI) |
| SQLite3 | Dev DB | Local development database |
| CORS Headers | Latest | Cross-Origin Resource Sharing |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.3.1 | UI component library |
| Vite | 5.4.10 | Build tool & dev server |
| React Router DOM | 7.14.0 | Client-side routing |
| Framer Motion | 12.38.0 | Page transitions & animations |
| Leaflet + React-Leaflet | 1.9.4 / 4.2.1 | Interactive maps (SOS, heatmaps) |
| Chart.js + React-Chartjs-2 | 4.5.1 / 5.3.1 | Health analytics charts |
| @hello-pangea/dnd | 16.6.0 | Drag-and-drop Kanban board |
| Formik + Yup | 2.4.9 / 1.7.1 | Form management & validation |
| Lucide React | 1.7.0 | Icon library |
| Axios | 1.14.0 | HTTP client (analytics pages) |
| Vanilla CSS | — | Styling with CSS custom properties |
| Google Fonts (Outfit) | — | Typography |

---

## 6. Module Breakdown

### 6.1 Authentication & User Management (`app:users`)

#### Features
- [x] Registration with role-specific profile creation (multi-step wizard on frontend)
- [x] Account approval workflow: citizens auto-approved; all other roles require admin approval
- [x] Custom JWT authentication using PyJWT (HS256, 24h expiry, no refresh token)
- [x] Account status management: pending → active / rejected / suspended
- [x] User profile view with nested role-specific profile data
- [x] In-app notification system (CRUD, mark-as-read, clear-all)
- [x] Veterinarian directory listing
- [x] Admin user management (list, filter by role/status, approve/reject/suspend)
- [x] Admin dashboard stats (user counts by role and status)
- [x] Password change endpoint (⚠️ security issue — see Known Bugs)

#### Backend Models (6 models)

**User** (extends AbstractUser):
| Field | Type | Notes |
|---|---|---|
| role | CharField(30) | citizen/veterinarian/shelter_admin/civic_authority/agricultural_facility/admin |
| account_status | CharField(20) | pending/active/suspended/rejected |
| phone_number | CharField(20) | |
| profile_picture | URLField | |
| address | TextField | |
| requires_approval | BooleanField | Default True |
| approval_note | TextField | |
| approved_by | FK(self) | SET_NULL |
| approved_at | DateTimeField | |

**VeterinarianProfile** (OneToOne → User):
| Field | Type |
|---|---|
| clinic_hospital_name | CharField(255) |
| medical_license_number | CharField(100, unique) |
| clinic_address | TextField |
| professional_contact_number | CharField(20) |
| specialization | CharField(150) |
| years_of_experience | PositiveIntegerField |
| license_document_url | URLField |

**ShelterAdminProfile** (OneToOne → User):
| Field | Type |
|---|---|
| shelter_name | CharField(255) |
| shelter_registration_number | CharField(100, unique) |
| shelter_address | TextField |
| shelter_contact_number | CharField(20) |
| capacity | PositiveIntegerField |
| registration_document_url | URLField |

**CivicAuthorityProfile** (OneToOne → User):
| Field | Type |
|---|---|
| department_name | CharField(255) |
| employee_id | CharField(100, unique) |
| jurisdiction_area | CharField(255) |
| designation | CharField(150) |
| official_contact | CharField(20) |
| id_document_url | URLField |

**AgriculturalFacilityProfile** (OneToOne → User):
| Field | Type |
|---|---|
| facility_name | CharField(255) |
| facility_type | CharField(100) |
| registration_number | CharField(100, unique) |
| facility_address | TextField |
| contact_person | CharField(150) |
| contact_number | CharField(20) |

**Notification**:
| Field | Type |
|---|---|
| recipient | FK(User) |
| title | CharField(255) |
| message | TextField |
| is_read | BooleanField |

#### API Endpoints
| Method | Endpoint | Permission | Description |
|---|---|---|---|
| POST | `/api/auth/register/` | AllowAny | User registration with role profile |
| POST | `/api/auth/login/` | AllowAny | JWT token issuance |
| POST | `/api/auth/logout/` | Auth | Stateless logout |
| GET | `/api/auth/me/` | Auth | Current user profile |
| POST | `/api/auth/change-password/` | AllowAny ⚠️ | Password change (insecure) |
| GET | `/api/auth/vets/` | Auth | List active veterinarians |
| GET | `/api/auth/admin/users/` | Admin | All users with filters |
| GET | `/api/auth/admin/users/pending/` | Admin | Pending approval queue |
| POST | `/api/auth/admin/users/{id}/action/` | Admin | Approve/reject/suspend |
| GET | `/api/auth/admin/stats/` | Admin | Dashboard statistics |
| CRUD | `/api/auth/notifications/` | Auth | Notification management |
| POST | `/api/auth/notifications/clear_all/` | Auth | Clear all notifications |
| POST | `/api/auth/notifications/{id}/mark_as_read/` | Auth | Mark notification read |

#### Frontend Components
| Component | Route | Features |
|---|---|---|
| `Login.jsx` | `/login` | Username/password form, role-based redirect, status warnings |
| `Register.jsx` | `/register` | 3-step wizard (Formik+Yup): account → personal → role-specific |
| `PendingApproval.jsx` | `/pending-approval` | Static approval status page with progress steps |
| `Unauthorized.jsx` | `/unauthorized` | Role mismatch error page |
| `AuthContext.jsx` | — | login/register/logout/authFetch/hasRole/isApproved |
| `ProtectedRoute.jsx` | — | Auth + role + account status gate |

---

### 6.2 Pet Registration & Citizen Services (`app:citizens`)

#### Features
- [x] Pet CRUD with digital passport (name, species, breed, DOB, gender, RFID, photo)
- [x] Pet edit and delete functionality
- [x] Image upload via Base64 encoding
- [x] Medical report viewer with consultation history and self-reports
- [x] Multi-pet medical report view
- [x] Print-ready medical reports
- [x] SOS alert creation with GPS auto-location
- [x] SOS alert lifecycle: Pending → Accepted → Resolved
- [x] Interactive Leaflet map for SOS alerts
- [x] Appointment booking with veterinarian directory

#### Backend Models (2 models)

**Pet**:
| Field | Type | Notes |
|---|---|---|
| owner | FK → User | CASCADE |
| name | CharField(100) | |
| species | CharField(50) | |
| breed | CharField(100) | Nullable |
| health_status | CharField(100) | Default 'Healthy' |
| gender | CharField(50) | Nullable |
| dob | DateField | Nullable |
| rfid_tag | CharField(100) | Unique, nullable |
| media_url | TextField | Base64 or URL, nullable |

**SOSAlert**:
| Field | Type | Notes |
|---|---|---|
| reporter | FK → User | CASCADE |
| animal_description | TextField | |
| location | CharField(255) | Lat/lng combined string |
| timestamp | DateTimeField | Auto |
| status | CharField(20) | Pending/Accepted/Resolved |
| assigned_shelter | FK → Shelter | SET_NULL, nullable |
| is_resolved | BooleanField | Default False |

#### API Endpoints
| Method | Endpoint | Permission | Description |
|---|---|---|---|
| CRUD | `/api/citizens/pets/` | Auth (owner-filtered) | Pet management |
| GET | `/api/citizens/pets/{id}/medical_report/` | Auth (owner/vet/admin) | Full medical history |
| CRUD | `/api/citizens/sos/` | Auth | SOS alert management |
| GET | `/api/citizens/sos/nearby/` | Auth | Unresolved SOS alerts |
| POST | `/api/citizens/sos/{id}/accept_mission/` | Shelter Admin | Accept rescue mission |
| POST | `/api/citizens/sos/{id}/complete_mission/` | Shelter Admin | Complete rescue & resolve |
| POST | `/api/citizens/sos/{id}/cancel_mission/` | Shelter Admin | Cancel mission |

#### Frontend Pages
| Component | Route | Key Features |
|---|---|---|
| `Dashboard.jsx` | `/dashboard` | Stats cards, pet grid, quick actions |
| `PetPassportForm.jsx` | `/pet/new`, `/pet/edit/:id` | Create/edit with image upload (Base64) |
| `SOSMap.jsx` | `/sos` | Leaflet map with GPS, create/view alerts |
| `MedicalViewer.jsx` | `/medical/:petId`, `/medical/all` | Medical history, vaccination records, print |
| `Appointments.jsx` | `/appointments` | Vet directory, booking modal, cancel/clear |

---

### 6.3 Clinical Records & Veterinary Workflows (`app:clinical`)

#### Features
- [x] Appointment system with scheduling and completion workflow
- [x] Consultation logging with vital signs (JSON), notes, and zoonotic disease flagging
- [x] Vaccination records with tamper-proof SHA256 hashing and amendment chains
- [x] Digital prescriptions linked to consultations
- [x] Diagnostic media upload (X-ray, DICOM support)
- [x] Self-reported records by pet owners
- [x] Notification system: appointment → vet notification, consultation → owner notification
- [x] Zoonotic disease reporting (Rabies, Canine Parvovirus, Avian Flu, Feline Leukemia)

#### Backend Models (6 models)

**Appointment**:
| Field | Type | Notes |
|---|---|---|
| pet | FK → Pet | CASCADE |
| vet | FK → User | Role=veterinarian |
| owner | FK → User | Role=citizen |
| date | DateTimeField | |
| reason | TextField | |
| status | CharField | Scheduled/Completed/Cancelled |

**ConsultationLog**:
| Field | Type | Notes |
|---|---|---|
| pet | FK → Pet | CASCADE |
| attending_vet | FK → User | SET_NULL |
| date | DateTimeField | Auto |
| vital_signs | JSONField | Nullable |
| consultation_notes | TextField | Nullable |
| zoonotic_disease_flag | CharField(100) | Nullable |

**VaccinationLog**:
| Field | Type | Notes |
|---|---|---|
| consultation | FK → ConsultationLog | CASCADE |
| vaccine_name | CharField(100) | |
| manufacturer | CharField(100) | |
| batch_number | CharField(50) | |
| date_administered | DateField | Auto |
| next_due_date | DateField | Nullable |
| is_frozen | BooleanField | Default False |
| record_hash | CharField(64) | SHA256 tamper-proofing |
| is_amended | BooleanField | Amendment tracking |
| original_record | FK(self) | Amendment chain |

**DigitalPrescription**:
| Field | Type | Notes |
|---|---|---|
| consultation | FK → ConsultationLog | CASCADE |
| medications | JSONField | |
| issued_date | DateTimeField | Auto |
| is_frozen | BooleanField | |
| record_hash | CharField(64) | |

**DiagnosticMedia**:
| Field | Type | Notes |
|---|---|---|
| consultation | FK → ConsultationLog | Nullable |
| media_url | TextField | S3/Base64 |
| media_type | CharField(50) | |
| diagnostic_tags | JSONField | Nullable |

**SelfReportedRecord**:
| Field | Type | Notes |
|---|---|---|
| pet | FK → Pet | CASCADE |
| title | CharField(255) | |
| date | DateField | |
| description | TextField | |

#### API Endpoints
| Method | Endpoint | Permission |
|---|---|---|
| CRUD | `/api/clinical/appointments/` | Auth (role-filtered) |
| POST | `/api/clinical/appointments/{id}/complete/` | Vet only |
| CRUD | `/api/clinical/consultations/` | Auth |
| CRUD | `/api/clinical/self-reports/` | Auth (owner-filtered) |

#### Frontend Pages
| Component | Route | Key Features |
|---|---|---|
| `VetDashboard.jsx` | `/vet-dashboard` | Appointments list, clinical record editor, vital signs, zoonotic flags, media upload, patient history |

---

### 6.4 Shelter Management & Adoption Pipeline (`app:shelter`)

#### Features
- [x] Shelter registration (auto-created when shelter_admin registers)
- [x] Animal inventory management (add, edit, remove, toggle availability)
- [x] Real-time SOS alert monitoring (10-second polling + WebSocket support)
- [x] Rescue mission workflow: Accept SOS → Complete & Intake → Resolve
- [x] Drag-and-drop Kanban adoption pipeline: Pending → Under Review → Interview → Approved/Rejected
- [x] Adoption application processing with status notifications
- [x] Auto-create pet record for citizen on adoption approval
- [x] Visual capacity tracker (kennel grid)
- [x] Animal marketplace with listing types (Adopt/Sell/Donate) and pricing
- [x] Google Maps integration for rescue mission directions
- [x] Toast notifications for incoming SOS alerts

#### Backend Models (3 models)

**Shelter**:
| Field | Type | Notes |
|---|---|---|
| name | CharField(255) | |
| tax_id | CharField(50) | Unique |
| address | TextField | |
| location | CharField(255) | Simplified from PointField |
| admin | OneToOne → User | Role=shelter_admin |
| is_verified | BooleanField | Default False |

**AnimalInventory**:
| Field | Type | Notes |
|---|---|---|
| shelter | FK → Shelter | CASCADE |
| name | CharField(100) | |
| species | CharField(50) | |
| breed | CharField(100) | Nullable |
| age | CharField(50) | Nullable |
| behavioral_traits | TextField | |
| medical_triage_status | CharField(50) | |
| intake_date | DateField | Auto |
| found_location | CharField(255) | |
| kennel_zone_id | CharField(50) | |
| is_adopted | BooleanField | Default False |
| is_available | BooleanField | Default True |
| is_suspended | BooleanField | Super-admin moderation |
| listing_type | CharField | Adopt/Sell/Donate |
| price | DecimalField(10,2) | |
| media_url | TextField | S3/Base64, nullable |

**AdoptionApplication**:
| Field | Type | Notes |
|---|---|---|
| applicant | FK → User | Role=citizen |
| animal | FK → AnimalInventory | CASCADE |
| status | CharField | Pending/Under Review/Interview Scheduled/Approved/Rejected/Cancelled |
| feedback | TextField | Nullable |

#### WebSocket
- **Consumer**: `ShelterDashboardConsumer` (AsyncWebsocketConsumer)
- **Group**: `shelters_group`
- **URL**: `ws/shelter/dashboard/`
- **Events**: `sos_alert` — real-time SOS push to shelter dashboard

#### API Endpoints
| Method | Endpoint | Permission |
|---|---|---|
| CRUD | `/api/shelter/shelters/` | Auth |
| CRUD | `/api/shelter/inventory/` | Auth (role-filtered) |
| CRUD | `/api/shelter/applications/` | Auth (role-filtered) |
| POST | `/api/shelter/applications/{id}/update_status/` | Shelter Admin |
| POST | `/api/shelter/applications/{id}/cancel/` | Citizen (own) |

#### Frontend: `ShelterDashboard.jsx` (Route: `/shelter-dashboard`)
**Largest file in project: 1,108 lines / 82KB**

5 Tabs:
1. **Rescue Missions** — Real-time SOS feed with accept/complete/cancel, Leaflet map, Google Maps directions
2. **Adoption Pipeline** — Drag-and-drop Kanban board (@hello-pangea/dnd)
3. **Animal Inventory** — Pet cards with edit modal, availability toggle, delete
4. **Capacity Tracker** — Visual kennel grid (occupied/available slots)
5. **Completed Adoptions** — Historical adopted animal list

---

### 6.5 AI Analytics & Smart Matching (`app:analytics`)

#### Features
- [x] Lifestyle assessment questionnaire (housing type, activity level, children, pets)
- [x] AI compatibility scoring (rule-based, not ML)
- [x] Smart match recommendations ranked by score
- [x] Predictive health dashboard with weight trajectory charts
- [x] Health risk flagging (severity: Low/Medium/High)
- [ ] Celery-based batch analysis (referenced in UI but not configured)

#### AI Compatibility Algorithm
```
score = 0

// Apartment Check
IF housing == 'Apartment' AND animal.good_for_apartments:
    score += 25

// Children Safety
IF has_children AND animal.good_with_children:
    score += 20
ELIF has_children AND NOT animal.good_with_children:
    score -= 15

// Energy Level Match
energy_diff = ABS(activity_level - animal.energy_level) / 10.0
score += MAX(0, 30 * (1 - energy_diff))

// Multi-pet Household
IF has_other_pets AND animal.good_with_other_pets:
    score += 15

// Match Reasons generated as human-readable strings
RETURN { score_percentage, match_reasons[] }
```

#### Backend Models (6 models — **Note: Duplicate/shadow models, separate from shelter/citizens**)

**AnimalInventory** (UUID PK):
| Field | Type |
|---|---|
| name, breed | CharField |
| energy_level | IntegerField(1-10) |
| sociability | CharField (Low/Moderate/High) |
| required_maintenance | CharField |
| good_for_apartments | BooleanField |
| good_with_children | BooleanField |
| good_with_other_pets | BooleanField |
| image_url | URLField |

**Pet** (UUID PK): owner, name, breed, age_months, current_weight_kg

**MedicalRecord**: pet (FK), date, weight_kg, notes

**LifestyleAssessment** (OneToOne → User): housing_type, activity_level, has_children, has_other_pets

**AICompatibilityScore**: user (FK), animal (FK), score_percentage, match_reasons (JSON)

**HealthRiskFlag**: pet (FK), risk_type, severity, description, is_active

#### API Endpoints
| Method | Endpoint | Permission |
|---|---|---|
| POST | `/api/v4/analytics/submit_lifestyle/` | Auth |
| GET | `/api/v4/analytics/recommendations/` | Auth |
| GET | `/api/v4/analytics/pet_health_dashboard/` | Auth |
| POST | `/api/v4/analytics/trigger_health_analysis/` | Auth |
| CRUD | `/api/v4/animals/` | Auth |
| CRUD | `/api/v4/pets/` | Auth |
| CRUD | `/api/v4/medical-records/` | Auth |

#### Frontend Pages
| Component | Route | Key Features |
|---|---|---|
| `LifestyleAssessment.jsx` | `/lifestyle-assessment` | 4-step questionnaire with slider |
| `SmartMatchDashboard.jsx` | `/smart-match` | Match cards with % scores and reasons |
| `PredictiveHealthDashboard.jsx` | `/predictive-health` | Chart.js weight trajectory, health flags |

---

### 6.6 Public Health & Civic Authority (`app:public_health`)

#### Features
- [x] Zoonotic disease GIS heatmap with Leaflet CircleMarkers
- [x] Disease filter (Rabies, Canine Parvovirus, Avian Flu, Feline Leukemia)
- [x] Geo-fenced mass broadcast system (SMS/Push-style notifications)
- [x] Target groups: all citizens, pet owners, agricultural facilities
- [x] Public health analytics dashboard (mock metrics)
- [ ] Real PostGIS integration (currently returns mock Kerala, India coordinates)

#### Backend (No models — views only)

| View | Method | Description |
|---|---|---|
| `ZoonoticHeatmapView` | GET | Mock GIS heatmap data with disease filter |
| `BroadcastAlertView` | POST | Mass notification via bulk_create |
| `PublicHealthAnalyticsView` | GET | Mock analytics metrics |

#### API Endpoints
| Method | Endpoint | Permission |
|---|---|---|
| GET | `/api/public-health/heatmap/?disease=X` | Civic Authority |
| POST | `/api/public-health/broadcast/` | Civic Authority |
| GET | `/api/public-health/analytics/` | Civic Authority |

#### Frontend: `CivicAuthorityDashboard.jsx` (Route: `/civic-dashboard`)
- Zoonotic Disease GIS Heatmap (Leaflet with CircleMarkers)
- Geo-Fenced Mass Broadcast system with target group selection
- Livestock & Wildlife Registry Panel (hardcoded data)
- Analytics metrics cards

---

### 6.7 Super Admin Governance (`app:governance`)

#### Features
- [x] AuditTrail model for logging admin actions
- [x] User approval/rejection with audit logging
- [x] Listing suspension (animal moderation)
- [x] System health dashboard (mock metrics)
- [ ] Real system metrics (currently hardcoded)

#### Backend Models (1 model)

**AuditTrail**:
| Field | Type |
|---|---|
| admin_user | FK → User (SET_NULL) |
| action_type | CharField(100) |
| description | TextField |
| timestamp | DateTimeField (auto) |
| ip_address | GenericIPAddressField |

#### API Endpoints
| Method | Endpoint | Permission |
|---|---|---|
| GET | `/api/superadmin/pending-users/` | Superuser |
| POST | `/api/superadmin/users/{id}/approve/` | Superuser |
| POST | `/api/superadmin/animals/{id}/suspend/` | Superuser |
| GET | `/api/superadmin/audit-logs/` | Superuser |
| GET | `/api/superadmin/system-health/` | Superuser |

#### Frontend: `SuperAdminDashboard.jsx` (Route: `/superadmin`)
4 Tabs:
1. **System Health** — Stats, infrastructure metrics (mock), AI algorithm weight sliders (mock)
2. **Pending Approval** — User approval queue with approve/reject/suspend
3. **All Users** — RBAC user management table
4. **Audit Trail** — Immutable log viewer (mock data)

---

## 7. Database Schema

### Complete Entity Relationship Map

```
User (AbstractUser, 6 roles)
 ├── VeterinarianProfile (1:1)
 ├── ShelterAdminProfile (1:1)
 ├── CivicAuthorityProfile (1:1)
 ├── AgriculturalFacilityProfile (1:1)
 ├── Notification (1:N) [recipient]
 ├── citizens.Pet (1:N) [owner]
 │    ├── clinical.Appointment (1:N) [pet]
 │    ├── clinical.ConsultationLog (1:N) [pet]
 │    │    ├── clinical.VaccinationLog (1:N)
 │    │    ├── clinical.DigitalPrescription (1:N)
 │    │    └── clinical.DiagnosticMedia (1:N)
 │    └── clinical.SelfReportedRecord (1:N)
 ├── citizens.SOSAlert (1:N) [reporter]
 ├── analytics.LifestyleAssessment (1:1)
 ├── analytics.AICompatibilityScore (1:N)
 └── governance.AuditTrail (1:N)

shelter.Shelter (1:1 → User[shelter_admin])
 └── shelter.AnimalInventory (1:N)
      └── shelter.AdoptionApplication (1:N)

analytics.AnimalInventory (UUID, separate)
 └── analytics.AICompatibilityScore (1:N)

analytics.Pet (UUID, separate)
 ├── analytics.MedicalRecord (1:N)
 └── analytics.HealthRiskFlag (1:N)
```

### Model Count by App
| App | Models | Count |
|---|---|---|
| users | User, VetProfile, ShelterProfile, CivicProfile, AgriProfile, Notification | 6 |
| citizens | Pet, SOSAlert | 2 |
| clinical | Appointment, ConsultationLog, VaccinationLog, DigitalPrescription, DiagnosticMedia, SelfReportedRecord | 6 |
| shelter | Shelter, AnimalInventory, AdoptionApplication | 3 |
| analytics | AnimalInventory, Pet, MedicalRecord, LifestyleAssessment, AICompatibilityScore, HealthRiskFlag | 6 |
| governance | AuditTrail | 1 |
| public_health | (none — views only) | 0 |
| **Total** | | **24** |

---

## 8. API Endpoints Reference

### Complete Endpoint Map (Grouped by App)

#### Authentication (`/api/auth/`) — 12 endpoints
| # | Method | Endpoint | Permission |
|---|---|---|---|
| 1 | POST | `/api/auth/register/` | AllowAny |
| 2 | POST | `/api/auth/login/` | AllowAny |
| 3 | POST | `/api/auth/logout/` | Auth |
| 4 | GET | `/api/auth/me/` | Auth |
| 5 | POST | `/api/auth/change-password/` | AllowAny ⚠️ |
| 6 | GET | `/api/auth/vets/` | Auth |
| 7 | GET | `/api/auth/admin/users/` | Admin |
| 8 | GET | `/api/auth/admin/users/pending/` | Admin |
| 9 | POST | `/api/auth/admin/users/{id}/action/` | Admin |
| 10 | GET | `/api/auth/admin/stats/` | Admin |
| 11 | CRUD | `/api/auth/notifications/` | Auth |
| 12 | POST | `/api/auth/notifications/{id}/mark_as_read/` | Auth |

#### Citizens (`/api/citizens/`) — 8 endpoints
| # | Method | Endpoint | Permission |
|---|---|---|---|
| 13 | CRUD | `/api/citizens/pets/` | Auth (owner) |
| 14 | GET | `/api/citizens/pets/{id}/medical_report/` | Auth |
| 15 | CRUD | `/api/citizens/sos/` | Auth |
| 16 | GET | `/api/citizens/sos/nearby/` | Auth |
| 17 | POST | `/api/citizens/sos/{id}/accept_mission/` | Shelter Admin |
| 18 | POST | `/api/citizens/sos/{id}/complete_mission/` | Shelter Admin |
| 19 | POST | `/api/citizens/sos/{id}/cancel_mission/` | Shelter Admin |
| 20 | GET | `/api/citizens/stats/` | Auth |

#### Clinical (`/api/clinical/`) — 4 endpoints
| # | Method | Endpoint | Permission |
|---|---|---|---|
| 21 | CRUD | `/api/clinical/appointments/` | Auth (role-filtered) |
| 22 | POST | `/api/clinical/appointments/{id}/complete/` | Vet |
| 23 | CRUD | `/api/clinical/consultations/` | Auth |
| 24 | CRUD | `/api/clinical/self-reports/` | Auth |

#### Shelter (`/api/shelter/`) — 5 endpoints
| # | Method | Endpoint | Permission |
|---|---|---|---|
| 25 | CRUD | `/api/shelter/shelters/` | Auth |
| 26 | CRUD | `/api/shelter/inventory/` | Auth (role-filtered) |
| 27 | CRUD | `/api/shelter/applications/` | Auth (role-filtered) |
| 28 | POST | `/api/shelter/applications/{id}/update_status/` | Shelter Admin |
| 29 | POST | `/api/shelter/applications/{id}/cancel/` | Citizen |

#### Analytics (`/api/v4/`) — 7 endpoints
| # | Method | Endpoint | Permission |
|---|---|---|---|
| 30 | POST | `/api/v4/analytics/submit_lifestyle/` | Auth |
| 31 | GET | `/api/v4/analytics/recommendations/` | Auth |
| 32 | GET | `/api/v4/analytics/pet_health_dashboard/` | Auth |
| 33 | POST | `/api/v4/analytics/trigger_health_analysis/` | Auth |
| 34 | CRUD | `/api/v4/animals/` | Auth |
| 35 | CRUD | `/api/v4/pets/` | Auth |
| 36 | CRUD | `/api/v4/medical-records/` | Auth |

#### Public Health (`/api/public-health/`) — 3 endpoints
| # | Method | Endpoint | Permission |
|---|---|---|---|
| 37 | GET | `/api/public-health/heatmap/` | Civic Auth |
| 38 | POST | `/api/public-health/broadcast/` | Civic Auth |
| 39 | GET | `/api/public-health/analytics/` | Civic Auth |

#### Governance (`/api/superadmin/`) — 5 endpoints
| # | Method | Endpoint | Permission |
|---|---|---|---|
| 40 | GET | `/api/superadmin/pending-users/` | Superuser |
| 41 | POST | `/api/superadmin/users/{id}/approve/` | Superuser |
| 42 | POST | `/api/superadmin/animals/{id}/suspend/` | Superuser |
| 43 | GET | `/api/superadmin/audit-logs/` | Superuser |
| 44 | GET | `/api/superadmin/system-health/` | Superuser |

#### System
| # | Method | Endpoint | Permission |
|---|---|---|---|
| 45 | GET | `/` and `/api/status/` | Public (health check) |
| 46 | — | `/admin/` | Django Admin |
| 47 | WS | `ws/shelter/dashboard/` | WebSocket |

**Total: 47 endpoint groups**

---

## 9. Frontend Architecture

### Route Table

#### Public Routes
| Path | Component | Access |
|---|---|---|
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/unauthorized` | Unauthorized | Public |
| `/pending-approval` | PendingApproval | Public |
| `/` and `*` | → Redirect to `/login` | Public |

#### Protected Routes (by role)
| Path | Component | Allowed Roles |
|---|---|---|
| `/dashboard` | Dashboard | citizen, agricultural_facility |
| `/pet/new` | PetPassportForm | citizen, agricultural_facility |
| `/pet/edit/:id` | PetPassportForm | citizen, agricultural_facility |
| `/medical/:petId` | MedicalViewer | citizen, veterinarian, agricultural_facility |
| `/medical/all` | MedicalViewer | citizen, veterinarian, agricultural_facility |
| `/adopt` | AdoptionPortal | citizen, shelter_admin |
| `/sos` | SOSMap | citizen, shelter_admin, agricultural_facility |
| `/appointments` | Appointments | citizen |
| `/vet-dashboard` | VetDashboard | veterinarian |
| `/shelter-dashboard` | ShelterDashboard | shelter_admin |
| `/lifestyle-assessment` | LifestyleAssessment | citizen, veterinarian |
| `/smart-match` | SmartMatchDashboard | citizen, shelter_admin |
| `/predictive-health` | PredictiveHealthDashboard | veterinarian, shelter_admin |
| `/civic-dashboard` | CivicAuthorityDashboard | civic_authority, admin |
| `/superadmin` | SuperAdminDashboard | admin |

### Component Hierarchy
```
<StrictMode>
  <App>
    <ErrorBoundary>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Navbar />               ← Persistent (auth-aware, role-based nav)
          <Routes>
            /login → <Login />
            /register → <Register />
            <ProtectedRoute roles={[...]}>
              /<role-routes> → <Page />
            </ProtectedRoute>
          </Routes>
        </Suspense>
      </AuthProvider>
    </ErrorBoundary>
  </App>
</StrictMode>
```

### State Management
- **AuthContext** (React Context API): user, token, login/register/logout/authFetch/hasRole/isApproved
- **Local component state**: Each page uses `useState` + `useEffect`
- **localStorage**: `ac_token` (JWT), `shelter_capacity` (shelter config)
- No Redux/Zustand/other global state

### API Layer
- **Primary**: `authFetch()` — wrapper around native `fetch()` in AuthContext, auto-injects Bearer token
- **Secondary**: `axios` — used in analytics pages (LifestyleAssessment, SmartMatch, PredictiveHealth)
- **Tertiary**: Raw `fetch()` with manual Authorization header — used in SuperAdminDashboard
- **No centralized API service file** — all URLs hardcoded inline
- **Base URLs**: Mixed `localhost:8000` and `127.0.0.1:8000` (inconsistent)

### Lazy Loading
All route components use `React.lazy()` with `<Suspense>` for code splitting.

---

## 10. Security & Access Control

### Authentication Architecture
```
1. User registers → POST /api/auth/register/
   → Citizens: auto-approved, JWT returned immediately
   → Others: account_status='pending', no token, redirect to /pending-approval
2. Admin approves user → POST /api/auth/admin/users/{id}/action/
3. User logs in → POST /api/auth/login/ → receives JWT (24h expiry)
4. Token stored in localStorage as 'ac_token'
5. Every API request: authFetch() injects Authorization: Bearer <token>
6. Token decoded client-side for role information
7. Backend validates JWT on each request via CustomJWTAuthentication
```

### JWT Configuration
| Parameter | Value |
|---|---|
| Library | PyJWT (custom implementation) |
| Algorithm | HS256 |
| Secret | Django SECRET_KEY |
| Expiry | 24 hours |
| Payload | user_id, username, role, account_status, exp, iat |
| Refresh token | ❌ Not implemented |
| Token blacklisting | ❌ Not implemented (stateless logout) |

### Role-Based Access Matrix

| Feature | Citizen | Agri-Facility | Vet | Shelter Admin | Civic Auth | Admin |
|---|---|---|---|---|---|---|
| Register/Login | ✅ | ✅ (approval) | ✅ (approval) | ✅ (approval) | ✅ (approval) | ✅ |
| Pet management | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Book appointments | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View medical records | ✅ (own) | ✅ (own) | ✅ (patients) | ❌ | ❌ | ❌ |
| Clinical consultations | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Create SOS alerts | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Manage rescue missions | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Animal inventory | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Adoption pipeline | ✅ (apply) | ❌ | ❌ | ✅ (manage) | ❌ | ❌ |
| Lifestyle assessment | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Smart match | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Predictive health | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| GIS heatmaps | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Mass broadcasts | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| User approval | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Audit trails | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Django Admin | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 11. UI/UX Design System

### Design Philosophy
- **Dark Glassmorphism** theme with violet/purple primary accent
- Framer Motion for page transitions and micro-animations
- Lucide React for consistent iconography
- Leaflet for interactive map components
- Responsive design with mobile breakpoints

### CSS Custom Properties (Design Tokens)
```css
--primary: #7c3aed          /* Violet - primary actions */
--primary-glow: #8b5cf6     /* Lighter violet for glow effects */
--success: #10b981          /* Green - positive/success */
--warning: #f59e0b          /* Amber - warnings */
--danger: #ef4444           /* Red - danger/SOS */
--bg-primary: #0a0a0f       /* Near-black background */
--bg-secondary: #12121a     /* Dark card background */
--text-primary: #f8fafc     /* Almost-white text */
--text-secondary: rgba(248,250,252,0.6)  /* Muted text */
```

### Visual Effects
- Glassmorphism: `.glass-panel` with `backdrop-filter: blur()`
- Framer Motion: page transitions (slideY), modal animations, card hover effects
- Smooth hover transitions on interactive elements
- Priority-colored badges for SOS alerts
- Status badges with contextual colors
- Kanban columns with drag-and-drop visual feedback
- Chart.js health trajectory visualization

### Typography
- **Primary font**: Outfit (Google Fonts)
- Dark theme: light text on dark backgrounds throughout

---

## 12. Non-Functional Requirements

| Requirement | Status | Details |
|---|---|---|
| **Authentication** | ✅ | Custom JWT (PyJWT), 24h expiry |
| **Authorization** | ✅ | Role-based + account status checks |
| **Account Approval** | ✅ | Citizens auto-approved; others require admin |
| **Real-time Updates** | ⚠️ Partial | WebSocket configured but polling used (10s SOS, 30s notifications) |
| **Responsive Design** | ✅ | Media queries, mobile hamburger menu |
| **Dark Mode** | ✅ | Default dark theme (no light mode toggle) |
| **Lazy Loading** | ✅ | React.lazy() for all route components |
| **Error Boundary** | ✅ | Global ErrorBoundary in App.jsx |
| **Map Integration** | ✅ | Leaflet for SOS, heatmaps |
| **Charts** | ✅ | Chart.js for health analytics |
| **Drag & Drop** | ✅ | @hello-pangea/dnd for Kanban |
| **Form Validation** | ⚠️ Partial | Formik+Yup on Register only |
| **CORS** | ⚠️ Dev mode | `CORS_ALLOW_ALL_ORIGINS = True` |
| **Database** | ⚠️ SQLite | PostgreSQL planned but not configured |
| **File Storage** | ⚠️ Base64/URL | S3 planned but not configured |
| **Token Refresh** | ❌ Not implemented | No refresh mechanism |
| **HTTPS** | ❌ Not configured | HTTP only |
| **Rate Limiting** | ❌ Not implemented | No API throttling |
| **Pagination** | ❌ Not implemented | All results returned at once |
| **Caching** | ❌ Not implemented | No caching layer |
| **Automated Testing** | ❌ Not implemented | Only ad-hoc script tests |
| **CI/CD** | ❌ Not configured | No pipeline |
| **Docker** | ❌ Not configured | No containerization |
| **API Documentation** | ❌ Not implemented | No Swagger/OpenAPI |
| **Logging Framework** | ❌ Not implemented | Ad-hoc print/log files |

---

## 13. Known Bugs & Issues

### Critical Bugs 🔴

| # | Bug | Location | Impact |
|---|---|---|---|
| 1 | **Insecure password change**: `ChangePasswordDirectView` allows ANY user to change ANY password with just username/email. No old password verification, no authentication required (`AllowAny`). | `apps/users/views.py` | **CRITICAL SECURITY VULNERABILITY** — account takeover |
| 2 | **Wrong User model import**: analytics views.py imports `from django.contrib.auth.models import User` instead of `get_user_model()`. Conflicts with custom User model. | `apps/analytics/views.py:9` | Analytics features may crash or return wrong data |
| 3 | **Case mismatch in governance**: Uses `account_status='Pending'` (capital P) while users model uses `'pending'` (lowercase). | `apps/governance/views.py` | PendingUsersView never finds pending users; approve/reject fails silently |

### Moderate Bugs 🟡

| # | Bug | Location | Impact |
|---|---|---|---|
| 4 | **Invalid serializer field**: `governance.UserAdminSerializer` references `medical_license_number` on User model — field only exists on VeterinarianProfile | `apps/governance/serializers.py` | Serialization errors for governance user views |
| 5 | **Duplicate models**: `analytics.AnimalInventory` and `analytics.Pet` are separate from `shelter.AnimalInventory` and `citizens.Pet`. Data is completely siloed. | `apps/analytics/models.py` | AI matching uses different data than actual shelter/citizen records |
| 6 | **Mixed API base URLs**: Frontend uses both `localhost:8000` and `127.0.0.1:8000` interchangeably | Frontend (multiple files) | Cross-origin issues or broken requests on some configurations |
| 7 | **Mixed HTTP clients**: `authFetch`, `axios`, and raw `fetch` used inconsistently across frontend | Frontend (multiple files) | No unified error handling or token management |
| 8 | **Incompatible test scripts**: `test_jwt.py` uses `simplejwt`, `test_token.py` uses `authtoken` — neither matches the custom JWT auth | Backend test files | Tests cannot actually validate authentication |

### Minor Bugs 🟢

| # | Bug | Location | Impact |
|---|---|---|---|
| 9 | **No default permission classes** in REST_FRAMEWORK settings | `config/settings.py` | Views without explicit permissions allow any authenticated user |
| 10 | **Hardcoded SECRET_KEY** not loaded from .env | `config/settings.py` | Security risk if deployed without change |
| 11 | **ag-grid dependency unused**: Listed in package.json but never imported | `package.json` | Unnecessary bundle size |

---

## 14. Known Gaps & Missing Features

### Documented but Not Implemented
| # | Feature | Notes |
|---|---|---|
| 1 | PostgreSQL/AWS RDS | .env has placeholder credentials but SQLite used |
| 2 | AWS S3 storage | Referenced in documentation but not configured |
| 3 | Celery task queue | Referenced in PredictiveHealth UI disclaimer but not set up |
| 4 | Real PostGIS heatmap data | Civic heatmap returns random mock coordinates |
| 5 | System health real metrics | SuperAdmin dashboard shows hardcoded mock data |
| 6 | Audit trail real logging | Viewer shows hardcoded mock entries |
| 7 | AI algorithm weight tuning | SuperAdmin sliders are non-functional UI |
| 8 | Real-time WebSocket notifications | Configured in ASGI but frontend uses polling |

### Feature Gaps
| # | Feature | Notes |
|---|---|---|
| 9 | Token refresh mechanism | JWT expires after 24h with no refresh path |
| 10 | Pagination | All list endpoints return everything |
| 11 | Search & filtering UI | No search bars on list pages |
| 12 | Rate limiting / throttling | No API abuse protection |
| 13 | Email notifications | No email integration |
| 14 | Mobile app / PWA | Web-only |
| 15 | API documentation | No Swagger/OpenAPI |
| 16 | Automated test suite | No Django tests or frontend tests |
| 17 | CI/CD pipeline | No automated deployments |
| 18 | Docker containerization | No Dockerfile |
| 19 | Light mode toggle | Dark theme only |
| 20 | Internationalization | English only |

---

## 15. Future Roadmap

### Phase 1: Bug Fixes & Security
- [ ] Fix `ChangePasswordDirectView` — require authentication + old password verification
- [ ] Fix analytics `User` import to use `get_user_model()`
- [ ] Fix governance case mismatch (`pending` vs `Pending`)
- [ ] Fix governance serializer invalid field
- [ ] Unify frontend API base URL using environment variables
- [ ] Consolidate HTTP clients to single `authFetch`

### Phase 2: Production Readiness
- [ ] Migrate to PostgreSQL with proper .env configuration
- [ ] Configure AWS S3 for file/media storage
- [ ] Implement token refresh mechanism
- [ ] Add API rate limiting and throttling
- [ ] Add pagination to all list endpoints
- [ ] Set proper CORS origins (remove `CORS_ALLOW_ALL_ORIGINS`)
- [ ] Set up HTTPS/SSL
- [ ] Docker containerization
- [ ] CI/CD pipeline

### Phase 3: Feature Completion
- [ ] Unify analytics models with shelter/citizens models (eliminate data silos)
- [ ] Implement real PostGIS for GIS heatmap data
- [ ] Set up Celery for async health analysis
- [ ] Implement real system health metrics
- [ ] Real audit trail logging for all admin actions
- [ ] Implement real-time WebSocket notifications (replace polling)
- [ ] Add email notification system
- [ ] Build automated test suite (Django + React Testing Library)
- [ ] Add API documentation (drf-spectacular/Swagger)

### Phase 4: Enhancement
- [ ] Upgrade AI matching from rule-based to ML model
- [ ] Add real-time WebSocket for SOS alerts (replace 10s polling)
- [ ] Add search and filtering across all modules
- [ ] Light/dark mode toggle
- [ ] Multi-language support (i18n)
- [ ] Mobile-responsive PWA capabilities
- [ ] Advanced analytics with real chart data

---

*This PRD was auto-generated from an exhaustive analysis of every source file in the AnimaCare project (backend + frontend) as of 2026-05-21. All features marked ✅ are verified as implemented. Features marked ❌ are documented but not yet implemented. Features marked ⚠️ are partially implemented or have known issues.*
