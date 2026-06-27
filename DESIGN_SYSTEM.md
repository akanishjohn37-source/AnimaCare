# AnimaCare Design System & Styling Specifications

This document serves as the comprehensive design system reference for the **AnimaCare** platform. It compiles all design tokens, CSS variables, global styles, and component layouts to ensure design consistency when generating or modifying frontend code.

---

## 1. Foundational Design Tokens

### A. Color Palette (Application-Level)
```css
:root {
  /* Background Colors */
  --bg-primary: #0a0a0f;      /* Obsidian/Void base background */
  --bg-secondary: #131318;    /* Dark surface card background */
  --bg-tertiary: #1c1c28;     /* Inner card / field background */
  
  /* Brand Accents */
  --accent-primary: #8b5cf6;  /* Vibrant Violet (Primary Brand Color) */
  --accent-secondary: #06b6d4;/* Cyan/Teal (Secondary Brand Color) */
  --accent-tertiary: #ec4899; /* Deep Pink (Tertiary Info Color) */
  
  /* Status/Feedback Colors */
  --success: #10b981;         /* Emerald Green */
  --warning: #f59e0b;         /* Amber Yellow */
  --danger: #ef4444;          /* Crimson Red */
  
  /* Text Colors */
  --text-primary: #e7e0ed;
  --text-secondary: #9a95a3;
  --text-tertiary: #6b6675;
  
  /* Glassmorphism Tokens */
  --glass-bg: rgba(35, 35, 41, 0.45);
  --glass-border: rgba(71, 70, 79, 0.5);
}
```

### B. Material Design 3 Extended Color Tokens (from Stitch)
> **Source:** Stitch Project `9131064481250496267`, Design System Asset `assets/cc02b45010da4d4da5712833cc63da0a`

```css
:root {
  /* ── MD3 Surface System ── */
  --md-surface:                 #131318;
  --md-surface-dim:             #131318;
  --md-surface-bright:          #39393e;
  --md-surface-container-lowest:#0e0e13;
  --md-surface-container-low:   #1b1b20;
  --md-surface-container:       #1f1f24;
  --md-surface-container-high:  #2a292f;
  --md-surface-container-highest:#35343a;
  --md-on-surface:              #e4e1e8;
  --md-on-surface-variant:      #cbc3d7;
  --md-surface-tint:            #d0bcff;
  --md-surface-variant:         #35343a;
  --md-inverse-surface:         #e4e1e8;
  --md-inverse-on-surface:      #303035;

  /* ── MD3 Primary ── */
  --md-primary:                 #d0bcff;
  --md-on-primary:              #3c0091;
  --md-primary-container:       #a078ff;
  --md-on-primary-container:    #340080;
  --md-inverse-primary:         #6d3bd7;
  --md-primary-fixed:           #e9ddff;
  --md-primary-fixed-dim:       #d0bcff;
  --md-on-primary-fixed:        #23005c;
  --md-on-primary-fixed-variant:#5516be;

  /* ── MD3 Secondary (Cyan) ── */
  --md-secondary:               #4cd7f6;
  --md-on-secondary:            #003640;
  --md-secondary-container:     #03b5d3;
  --md-on-secondary-container:  #00424e;
  --md-secondary-fixed:         #acedff;
  --md-secondary-fixed-dim:     #4cd7f6;
  --md-on-secondary-fixed:      #001f26;

  /* ── MD3 Tertiary (Pink) ── */
  --md-tertiary:                #ffb0cd;
  --md-on-tertiary:             #640039;
  --md-tertiary-container:      #f751a1;
  --md-on-tertiary-container:   #570032;
  --md-tertiary-fixed:          #ffd9e4;
  --md-tertiary-fixed-dim:      #ffb0cd;

  /* ── MD3 Error ── */
  --md-error:                   #ffb4ab;
  --md-on-error:                #690005;
  --md-error-container:         #93000a;
  --md-on-error-container:      #ffdad6;

  /* ── MD3 Outline ── */
  --md-outline:                 #958ea0;
  --md-outline-variant:         #494454;
}
```

### C. Typography & Hierarchy (Stitch-Verified)
*   **Headline Font:** `Geist` — headlines, navigation, labels
*   **Body Font:** `Inter` — paragraphs, form inputs, metadata
*   **Label Font:** `Geist` — small badges, metadata tags

| Token | Font | Size | Weight | Line Height | Letter Spacing |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `display-lg` | Geist | `48px` | `700` | `56px` | `-0.02em` |
| `headline-lg` | Geist | `32px` | `600` | `40px` | — |
| `headline-lg-mobile` | Geist | `24px` | `600` | `32px` | — |
| `headline-md` | Geist | `24px` | `600` | `32px` | — |
| `body-lg` | Inter | `18px` | `400` | `28px` | — |
| `body-md` | Inter | `16px` | `400` | `24px` | — |
| `label-md` | Geist | `14px` | `500` | `20px` | — |
| `label-sm` | Geist | `12px` | `500` | `16px` | — |

### D. Spacing Scale (4px base)
| Token | Value |
| :--- | :--- |
| `xs` | `4px` |
| `sm` | `8px` |
| `md` | `16px` |
| `lg` | `24px` |
| `xl` | `32px` |
| `container-padding` | `24px` |
| `gutter` | `16px` |

### E. Shapes & Roundness
| Token | Radius | Usage |
| :--- | :--- | :--- |
| `sm` | `0.25rem` (4px) | Checkboxes, small badges |
| `DEFAULT` | `0.5rem` (8px) | Inner elements |
| `md` | `0.75rem` (12px) | Buttons, inputs |
| `lg` | `1rem` (16px) | Cards, panels |
| `xl` | `1.5rem` (24px) | Modals, large panels |
| `full` | `9999px` | Avatars, pill badges |

### F. Elevation & Depth Layers
1.  **Base Layer:** `#0a0a0f` (Solid Obsidian)
2.  **Surface Layer:** `#131318` (Solid) — sidebars, footers
3.  **Glass Layer:** `rgba(35, 35, 41, 0.45)` + `blur(16px)` + `1px border rgba(71, 70, 79, 0.5)`
4.  **Floating Elements:** Glass layer + `box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.8)`
5.  **Interactive Glows:** `box-shadow: 0 0 15px rgba(139, 92, 246, 0.3)` on active/focus states

---

## 2. Mobile Responsiveness & Layout Adjustments

To ensure a seamless experience on all devices, AnimaCare enforces standard CSS media queries and responsive utility classes.

### A. Breakpoints
*   **Mobile Small:** `< 480px` (Stacks tight components like pet items and internal card actions).
*   **Mobile / Tablet:** `< 768px` (General stack threshold for page headers, sidebars, and grid panels).
*   **Tablet Landscape / Desktop:** `< 1024px` (Adjusts main complex grids).

### B. Global Container Rules (`App.css`)
*   **Main Container Padding:** Reduces `.main-content` padding from `2rem` to `1rem` on mobile (`max-width: 768px`) to maximize screen real estate.
*   **Page Headers:** `.page-header` elements apply `flex-direction: column` and `align-items: flex-start` on mobile to prevent overlapping titles and buttons.

### C. Dashboard Specific Patterns
*   **Card Headers:** Internal dashboard sections utilize `flex-wrap: wrap` with a gap to safely flow long text onto new lines.
*   **Sidebar Navigation:** Complex dashboards (e.g., Shelter Dashboard) use full-width sidebars on mobile (`w-full`) and fixed widths on desktop (`md:w-64`), switching the main layout from `flex-col` to `md:flex-row`.
*   **Data Grids & Lists:** Flex layouts gracefully collapse into single columns via `flex-direction: column` on screens `< 480px` or `< 768px`.

---

## 3. Global CSS Utility Configurations

### A. Glassmorphic Panel (`.glass-panel` / `.glass-card`)
```css
.glass-panel,
.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  position: relative;
  overflow: hidden;
}

/* Subtle internal top-light gloss highlight */
.glass-panel::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
  pointer-events: none;
}
```

### B. Form Inputs & Control Fields (`.form-control`)
```css
.form-control,
.auth-input-wrap input,
.auth-input-wrap select {
  width: 100%;
  background: rgba(14, 14, 19, 0.65);
  border: 1px solid rgba(71, 70, 79, 0.5);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  color: var(--text-primary);
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* Focused State With Primary Outer Glow */
.form-control:focus,
.auth-input-wrap input:focus,
.auth-input-wrap select:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.3), inset 0 2px 4px rgba(0, 0, 0, 0.3);
}

.form-control::placeholder {
  color: var(--text-tertiary);
}
```

### C. Standard Button Layouts (`.btn`)
```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;
}

/* Primary Violet Button with Outer Glow */
.btn-primary {
  background: var(--accent-primary);
  color: #fff;
  border: none;
  box-shadow: 0 4px 14px 0 rgba(139, 92, 246, 0.4);
}

.btn-primary:hover {
  background: #7c3aed;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px 0 rgba(139, 92, 246, 0.5);
}

/* Secondary Glassmorphic Button */
.btn-secondary {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}
```

---

## 3. Status Badges & Indicators
```css
.badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.badge-success {
  background: rgba(16, 185, 129, 0.2);
  color: var(--success);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.badge-warning {
  background: rgba(245, 158, 11, 0.2);
  color: var(--warning);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.badge-danger {
  background: rgba(239, 68, 68, 0.2);
  color: var(--danger);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.badge-primary {
  background: rgba(139, 92, 246, 0.2);
  color: var(--accent-primary);
  border: 1px solid rgba(139, 92, 246, 0.3);
}
```

---

## 4. Page-by-Page Element & UI Component Catalogs

### A. Authentication Pages (Login & Register)

#### 1. Split-Column Layout (`.auth-page`)
*   **Branding Panel (Left Side):** Dark background (`#0a0a0f`) with linear gradient highlighting. Displays logo, tagline, and role badges.
*   **Form Card (Right Side):** Centered panel (`.auth-card`) utilizing `--glass-bg`, `--glass-border`, and `backdrop-filter: blur(16px)`.

#### 2. Input Fields with Icons (`.auth-input-wrap`)
*   **Icon Asset:** Absolute positioned inside inputs (left 0.85rem) using `lucide-react` icons (e.g. `User`, `Lock`, `Mail`, `FileText`) styled in `rgba(255, 255, 255, 0.3)`.
*   **Password Visibility Toggle:** `.auth-eye-btn` positioned absolute on the right of fields. Clicking toggles input visibility.

#### 3. Stepper Indicator (`.auth-stepper`)
*   **Steps Wrappers:** `.auth-step` transitions colors from muted grey `rgba(255, 255, 255, 0.3)` to active Violet `#8b5cf6` or completed Green `#4ade80`.
*   **Circular Dots:** `.auth-step-dot` uses a circular border crop (`width: 28px`, `border-radius: 50%`) displaying the step number. Includes outer glowing shadows when active: `box-shadow: 0 0 12px rgba(139, 92, 246, 0.5)`.

#### 4. Role Selection Cards (`.auth-role-card`)
*   **Grid layout:** `.auth-roles-grid` arranged in two columns.
*   **Interactive Cards:** Cards scale upwards on hover (`transform: translateY(-2px)`). Activating states overrides borders to the custom color and colors backgrounds using `color-mix` values: `background: color-mix(in srgb, var(--role-color) 12%, transparent)`.

---

### B. Global Navigation Header (`Navbar.jsx`)

#### 1. Public Links (Visitor State)
*   **Login Link:** Includes `User` icon (Lucide) alongside "Login" text label.
*   **Register Link:** Includes `Shield` icon (Lucide) alongside "Register" text label.

#### 2. Authenticated Profile Controls (`.nav-profile-wrap`)
*   **Notifications Menu:** Ringing bell icon. Clicking displays `.nav-dropdown` containing scrollable lists of notifications and a "Clear All" link styled in crimson `#f43f5e`.
*   **Profile Dropdown Toggle:** Displays a circular avatar image (`.profile-img` with `50%` crop and active border stroke matching the role color), user name, role label, and a rotating `ChevronDown` arrow.
*   **Dropdown Drawer Menu:** Lists user details and a prominent "Sign Out" button `.nav-dropdown-item--danger` featuring the `LogOut` icon (Lucide).

---

### C. Citizen Pages

#### 1. Citizen Dashboard (`citizens/Dashboard.jsx`)
*   **Active Tab Selectors:** Toggle headers between "Active Pet Profiles" (using `Heart` icon) and "Active Livestock Herds" (using `Shield` icon). Active tab draws a bottom border matching the accent color.
*   **Pet List Cards (`.pet-item`):** Glassmorphic rows that move horizontally on hover (`transform: translateX(6px)`) with secondary border triggers: `border-color: rgba(139, 92, 246, 0.5)`.
*   **Circular Avatar (`.pet-avatar`):** `64px` circular crops wrapped with a 2px primary accent border stroke (`border: 2px solid var(--accent-primary)`).
*   **Action Buttons (`.action-btn`):** Display Lucide icons (`Edit2`, `FileText`, `Trash2`). Scales slightly on hover (`transform: scale(1.05)`) with accent backgrounds.

#### 2. Pet & Livestock Register Form (`citizens/PetPassportForm.jsx`)
*   **Form Grid:** `.form-grid` arranges input text fields, select lists, and textareas in two columns.
*   **Avatar Upload Panel (`.avatar-upload`):** Box with gradient overlays and dashed borders (`border: 2px dashed var(--accent-primary)`).
*   **Avatar Image Preview (`.avatar-preview`):** Circular thumbnail preview that triggers a pink glow on hover: `box-shadow: 0 0 15px rgba(236, 72, 153, 0.3)`.

#### 3. Medical Viewer Page (`citizens/MedicalViewer.jsx`)
*   **Header Panel (`.medical-header`):** Glassmorphic panel displaying the pet identity. Features absolute positioning for action buttons on mobile screens to push the "Export PDF" button to the top right corner and prevent text overlap.
*   **Consultation History Timelines:** Chronological vertical timelines mapping past veterinary visits.
*   **Prescription Details:** Nested cards featuring custom border-left outlines highlighting logged instructions.
*   **Attachment Files:** Download blocks allowing citizens to open diagnostic images or documents.

#### 4. Appointments Booking (`citizens/Appointments.jsx`)
*   **Date Pickers & Calendars:** Responsive calendar select screens to choose appointment dates.
*   **Doctor Selection Grid:** Interactive cards presenting attending vet credentials, clinic labels, and active queue sizes.
*   **Success Modal Overlays:** Centered congratulations card indicating queue positions, barcodes, and slot timings.

#### 5. SOS Emergency Map (`citizens/SOSMap.jsx`)
*   **Map Workspace:** Full-width GIS Map layers utilizing Leaflet.
*   **Distress Alert Forms:** Side panel modal providing inputs to document distress coordinates, animal descriptions, and danger levels.

---

### D. Shelter Pages

#### 1. Shelter Command Center (`ShelterDashboard.jsx`)
*   **Sub-Module Navigation Tab Row:** 5 horizontal toggle buttons displaying custom icons representing SOS Rescues, Kanban Pipeline, Inventory, Completed Adoptions, and Capacity.
*   **Capacity Indicators:** Progress bar widgets displaying current animal counts versus the facility's maximum occupancy limits.

#### 2. SOS Rescues List
*   **Active Alert Cards:** Red-themed glass panels containing location coordinates, notes, and action buttons ("Accept Rescue", "Resolve Alert").

#### 3. Kanban adoption pipeline
*   **4-Column Grid:** Board divided into columns: Applied, Interview Scheduled, Completed/Approved, and Cancelled.
*   **Kanban Cards:** Drag-and-drop elements showing applicant names, animal targets, and submission dates.
*   **Questionnaire View Modals:** Popup overlay displaying the applicant's lifestyle assessment stats, housing parameters, and buttons ("Schedule Interview", "Reject Application").

#### 4. Shelter Inventory
*   **Search Controls:** Filter headers to locate animals by species, breed, or status.
*   **Add/Edit Animal Modal:** Glass overlay form to record names, ages, health states, and upload media files.

---

### E. Vet Pages

#### 1. Clinical Portal (`vet/VetDashboard.jsx`)
*   **Active Workspace Tabs:** Toggles overview of Appointments queue versus Slot Schedule tables.
*   **Queue Tables:** Lists checked-in patients. Renders active patient detail panels containing "Call Patient" buttons (triggering blinking animations on notification) and skipping triggers.
*   **Vitals Logging Forms:** Input grid for documenting patient Weight, Temperature, and Heart Rate.
*   **Zoonotic Flags Dropdown:** Highlighted selector to flag potential public health outbreaks.
*   **Diagnostic Media Uploads:** File inputs to attach medical x-rays or check-up photos.

#### 2. Inline Injection Checklist (`InjectionChecklistInline`)
*   **Progress Indicators:** Reminders completion bars using green gradients: `background: linear-gradient(90deg, #818cf8, #6366f1)`.
*   **Checklist Checkboxes:** Grid lists corresponding to recommended animal track lists (e.g. puppy, kitten, cattle). Checking saves records and recalculates deworming offset timetables.

#### 3. Slots & Holidays Configurator
*   **Slot Configuration Tables:** Multi-row tables showing available timings with inline "Edit", "Save", and "Delete" actions.
*   **Holidays Scheduler:** Date selector forms to mark out-of-office dates, accompanied by deletion audit lists.

---

### F. Civic Pages

#### 1. Civic Authority Dashboard (`CivicAuthorityDashboard.jsx`)
*   **Outbreak Metrics Cards:** 4 statistics grids displaying total cases, active alerts, verified registrations, and broadcast logs.
*   **Live Reports Pane:** Horizontal scrolling row presenting emergency alert signals.
*   **GIS Heatmap Widget:** Split layout featuring interactive Leaflet maps illustrating disease hotspots.
*   **Geo-Broadcast dispatch form:** Input form featuring target body dropdowns, message textareas, and "Execute Broadcast" primary submit buttons.
*   **Alert Deletion Modal:** Centered confirmation modal requiring vets/officers to select deletion reasons.

---

### G. Super-Administrator Governance

#### 1. Control Panel (`superadmin/SuperAdminDashboard.jsx`)
*   **Moderation Tables:** Paginated data tables listing pending vet licenses or shelter registrations with control options ("Approve", "Reject", "Suspend").
*   **System Audit Logs:** Tables displaying tracking indexes, user ids, actions, and dates with search bars.
*   **Infrastructure Metrics Grid:** 3-column widgets layout plotting database capacity, S3 storage metrics, and email queue health logs.
