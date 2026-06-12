# AnimaCare System Design & Specifications

This document outlines the core architecture, layout structures, user pages, design patterns, and detailed page-by-page specifications of the **AnimaCare** platform.

---

## 1. Core Project Idea
**AnimaCare** is a unified digital health and welfare ecosystem for pets and animals. Using role-based access control (RBAC), it connects citizens, veterinarians, shelters, civic authorities, and super-administrators:
*   **Citizens (Pet Owners):** Register animals via a Digital Pet Passport, view comprehensive medical histories, schedule veterinary appointments, apply for adoptions, self-report medical events, and report emergencies.
*   **Veterinarians:** Conduct clinical consultations (vitals logging, digital prescriptions, diagnostic media uploads, injection checklists) and manage schedule slots and leaves.
*   **Shelter Administrators:** Monitor real-time SOS rescue alerts, manage animal inventories, process adoption applications via a Kanban pipeline, and track facility capacity.
*   **Civic Authorities:** Track zoonotic diseases and public health trends via Leaflet GIS heatmaps and send geo-fenced mass broadcasts.
*   **Super Admins:** Monitor infrastructure health, manage user approvals, suspensions, and access audit logs.

---

## 2. Current Layout Structure
*   **Global Navigation:** A top navigation bar (`Navbar.jsx`) that renders role-specific links, a user profile dropdown, a notification center, and authentication controls:
    *   **Unauthenticated / Visitor State:** Displays links redirecting to the login page (with the `User` icon from `lucide-react`) and registration wizard (with the `Shield` icon).
    *   **Authenticated Profile Dropdown:** Renders the user's avatar, display name, verified role, and a prominent "Sign Out" button (with the `LogOut` icon) to end the session.
*   **Main Container:** A layout defined in `App.jsx` (`.app-container` and `.main-content`) with a glassmorphism theme (`.glass-panel`) and dark-themed pages.
*   **Layout Themes:** Glassmorphic dark theme using CSS variables (defined in `index.css`) for background, text, accent colors, gradients, and rounded borders.

---

## 3. Active User Pages
The application contains the following active routing endpoints:
1.  **Auth Modules:** `/login`, `/register`, `/pending-approval`, `/unauthorized`.
2.  **Citizen Modules:** `/dashboard` (Citizen Dashboard), `/pet/new` & `/pet/edit/:id` (Pet Passport Form), `/medical/:petId` (Medical History Viewer), `/appointments` (Appointments Booking), `/adopt` (Adoption Portal), `/sos` (SOS Emergency Map), `/verify-ownership` (Ownership Verification).
3.  **Vet Modules:** `/vet-dashboard` (Clinical Portal), `/vaccination-scheduler` (Injection Scheduler).
4.  **Shelter Modules:** `/shelter-dashboard` (Shelter Command Center).
5.  **Civic Modules:** `/civic-dashboard` (Civic Authority Control Room), `/civic-analytics` (Disease / Outbreak Forecasting).
6.  **Super Admin Modules:** `/superadmin` (Platform Governance Control Panel).
7.  **Shared Analytics Modules:** `/lifestyle-assessment` (Lifestyle Quiz), `/smart-match` (Adoption Smart Matches), `/predictive-health` (Early Health Risk Insights).

---

## 4. Existing Design & Code Patterns
*   **Styling Paradigm:** A cohesive glassmorphic dark-theme driven by our central design system stylesheet (`animacare_frontend/src/styles/design-system.css`). This file acts as the single source of truth for all layout tokens (e.g. `--bg-primary: #0a0a0f`, `--accent-primary: #8b5cf6`), component classes (`.glass-panel`, `.glass-card`), typography (Geist and Inter setups), standard buttons (`.btn`, `.btn-primary`), and inputs (`.form-control`).
*   **Layout Patterns:** Side-by-side split columns (sidebar for forms/menus and wider grid for data), horizontal scroll lists for real-time queues, and nested cards inside panels for structural layout without raw lines/borders.
*   **Component Patterns:** Modal overlays for forms or confirmations, multi-step forms (Register, Vaccination Scheduler) with state-based step rendering, and custom lists/tables using clean borderless row layouts.

---

# Page-by-Page Specifications

This section provides a deep-dive breakdown of the 20 pages discovered within the AnimaCare frontend codebase.

## 1. Login Page (`auth/Login.jsx`)
*   **Purpose:** Allows users to authenticate into the AnimaCare ecosystem using their credentials or retrieve/reset their password.
*   **Layout Blueprint:**
    1.  **Split Columns:**
        *   **Left Column (Branding Panel):** Logo, Application Name ("AnimaCare"), Tagline, and role badges representing available roles (Citizen, Vet, Shelter, Civic, Admin).
        *   **Right Column (Form Card):** Form container displaying header, warnings/banners, credentials fields, and action buttons.
*   **Interactive Components:**
    *   `Username` and `Password` input fields.
    *   Password visibility toggle button (eye icon).
    *   "Forgot Password?" text link (toggles password reset mode).
    *   "Sign In" primary submit button.
    *   "Back" navigation button (in forgot password mode).
    *   "Create account" redirect link.
*   **Responsive Behavior:** 
    *   The split-column layout (`.auth-page`) is built to stack vertically on mobile screens, putting the branding panel on top and the form card below. Input wraps flex dynamically to fill full width.

---

## 2. Register Page (`auth/Register.jsx`)
*   **Purpose:** Multi-step registration wizard that lets new users register accounts under different roles (Citizen, Shelter, Veterinarian, Civic Authority) and upload necessary verification documents.
*   **Layout Blueprint:**
    1.  **Split Columns:**
        *   **Left Column (Branding Panel):** Logo, application summary, and role badges.
        *   **Right Column (Multi-Step Form):**
            *   **Step 1: Role Selection Grid:** Interactive cards to select the user's role.
            *   **Step 2: Profile Fields Grid:** Input forms (varying dynamically depending on selected role).
            *   **Step 3: Document Upload Area:** File drop/upload fields for licensing and verification files.
            *   **Step 4: Review Panel:** Summary of inputs before final submission.
*   **Interactive Components:**
    *   Role selection cards (interactive grid).
    *   Form Inputs: first name, last name, username, email, phone, address, password, clinic name, shelter name, license number, etc.
    *   Dropdown selects: zone, shelter type, jurisdiction area.
    *   File upload input for registration/license documents.
    *   "Back" and "Next/Register" navigation buttons.
*   **Responsive Behavior:**
    *   Inputs and role cards are wrapped in flexible CSS grids (`.auth-roles-grid`, `.auth-fields-grid`) that transition from multi-column layouts on desktop to single-column lists on mobile.

---

## 3. Pending Approval Page (`auth/PendingApproval.jsx`)
*   **Purpose:** Informs newly registered role users (Vets, Shelters, Civic) that their account registration is under administrator review and restricts access.
*   **Layout Blueprint:**
    1.  **Centered Card Container:**
        *   Animated Clock Icon at the top.
        *   Header ("Awaiting Approval").
        *   Role Indicator Badge (highlighting pending role).
        *   Process Flow Timeline (vertical list of steps indicating current progress).
        *   Sign Out button.
*   **Interactive Components:**
    *   "Sign Out" button (logs user out and redirects to login).
*   **Responsive Behavior:**
    *   A single-column centered block layout (`max-width: 520px`) that auto-adjusts margins and scales padding for smaller mobile viewports.

---

## 4. Access Denied Page (`auth/Unauthorized.jsx`)
*   **Purpose:** Displays a restricted access notice when a user tries to access a route that doesn't match their role permissions.
*   **Layout Blueprint:**
    1.  **Centered Card Container:**
        *   ShieldOff Icon.
        *   Header ("Access Denied").
        *   Warning message.
        *   "Back to My Dashboard" CTA button.
*   **Interactive Components:**
    *   "Back to My Dashboard" button (redirects based on user role).
*   **Responsive Behavior:**
    *   Clean centered box layout (`max-width: 460px`) that stretches full width on mobile viewports with padded margins.

---

## 5. Citizen Dashboard Page (`citizens/Dashboard.jsx`)
*   **Purpose:** The central portal for citizens/pet owners to view registered animals, track active adoption applications, and view recent public safety alerts.
*   **Layout Blueprint:**
    1.  **Page Header:** Welcome message, page title, and "Add Pet" CTA.
    2.  **Two-Column Dashboard Grid:**
        *   **Left Column (Pets List - 2/3 width):** Grid layout of digital pet passport cards.
        *   **Right Column (Sidebar - 1/3 width):** 
            *   **Adoption Status Panel:** Status cards for active adoption applications.
            *   **Recent Alerts Panel:** Emergency alerts log with "Clear Finished" button.
*   **Interactive Components:**
    *   Pet cards (click to view medical history).
    *   "Add Pet" button (navigates to pet registration form).
    *   "Clear Finished" alerts button.
*   **Responsive Behavior:**
    *   Uses `.dashboard-grid` which stacks the sidebar below the main pet inventory on smaller devices. Pet passport cards stack from a 3-column grid on desktop to 1-column on mobile.

---

## 6. Pet Passport Form (`citizens/PetPassportForm.jsx`)
*   **Purpose:** Form to register new pets or update existing pet records (Digital Pet Passports).
*   **Layout Blueprint:**
    1.  **Page Title Header:** "Register Pet" or "Edit Profile".
    2.  **Form Grid Container:**
        *   **Left Sidebar:** Avatar/Image upload section with circular crop preview.
        *   **Right Main Panel:** Grid of input fields divided by category (Basic Info, Vitals).
        *   **Footer Actions:** Cancel and Save buttons.
*   **Interactive Components:**
    *   Avatar file input with click-to-upload area.
    *   Text inputs: pet name, species, breed, age, weight, chip/RFID ID, unique marking description.
    *   Submit and Cancel buttons.
*   **Responsive Behavior:**
    *   The `.form-grid` changes from a split-layout (avatar left, inputs right) to a single-column block layout on mobile, with inputs utilizing full width.

---

## 7. Medical Viewer Page (`citizens/MedicalViewer.jsx`)
*   **Purpose:** Provides a comprehensive medical record log for a selected pet, allowing owners to view vet consultation summaries and self-report health events.
*   **Layout Blueprint:**
    1.  **Header Row:** Pet details, medical ID, and action buttons ("Export PDF", "Add Report").
    2.  **Split Grid:**
        *   **Left Column (Encounters Timeline):** Detailed clinical logs recorded by veterinarians (prescriptions, vitals).
        *   **Right Column (Self-Reported Logs & Alerts):** 
            *   Pet owner notes and self-reported medical events.
            *   "Upcoming Injection Alerts" list.
    3.  **Add Report Modal:** Overlay modal for self-reporting clinical events.
*   **Interactive Components:**
    *   "Export PDF" button (triggers print view).
    *   "Add Report" button (opens self-report modal).
    *   Modal form: event description, event date, file attachment upload.
    *   "Save Report" and "Cancel" buttons.
*   **Responsive Behavior:**
    *   Uses `.medical-grid` which stacks columns on tablets and mobile devices. PDF export utilizes print-specific stylesheet overrides (`no-print`).

---

## 8. Vet Appointments Booking Page (`citizens/Appointments.jsx`)
*   **Purpose:** Allows citizens to schedule consultation appointments for their pets with registered veterinarians.
*   **Layout Blueprint:**
    1.  **Split Grid Layout:**
        *   **Left Column (Appointments List):** Vertical list of upcoming visits (active, completed, cancelled) with clean filter actions.
        *   **Right Column (Booking Card):** 
            *   Step 1: Vet selector dropdown.
            *   Step 2: Interactive Calendar Grid (date picker with month navigation buttons).
            *   Step 3: Available Time Slots grid.
            *   Step 4: Pet selector dropdown.
            *   Step 5: Submit booking actions.
*   **Interactive Components:**
    *   Vet selection dropdown.
    *   Month navigation buttons (`<` and `>`).
    *   Date grid buttons (click to select date).
    *   Time slots buttons (indicate availability, remaining seats, booked state).
    *   Pet selection dropdown.
    *   "Confirm Booking" primary button.
    *   "Clear Completed" and "Clear Cancelled" filter buttons.
*   **Responsive Behavior:**
    *   The calendar and appointments list layout fits side-by-side on desktop but stacks vertically on mobile devices, with calendar day items expanding to fill the screen width.

---

## 9. Adoption Portal Page (`citizens/AdoptionPortal.jsx`)
*   **Purpose:** Citizen interface to browse shelter animals available for adoption, submit adoption requests, and log street rescues.
*   **Layout Blueprint:**
    1.  **Page Title & Portal Tabs:** Toggle bar between "Marketplace" and "My Adoptions".
    2.  **Report Rescue Bar:** "Report Found Animal" button that toggles the intake form.
    3.  **Intake Form (Toggleable Panel):** Form inputs for found animal details (species, breed, location description, photo).
    4.  **Main Content Panels:**
        *   **Adoption Marketplace Tab:** Interactive grid of animal cards with filter inputs.
        *   **My Adoptions Tab:** Status cards for historical adoption applications.
    5.  **Adoption Details Modal:** Pop-up displaying pet profile, compatibility metrics, and adoption application questionnaire.
*   **Interactive Components:**
    *   Portal switcher buttons ("Marketplace" vs "My Adoptions").
    *   "Report Found Animal" form toggler.
    *   Intake Form inputs (species, description, location, image upload, submit button).
    *   Search filter inputs (name/breed filter).
    *   "View Pet Records" card button (opens details modal).
    *   Adoption Questionnaire fields (modal).
    *   "Submit Adoption Request" button.
*   **Responsive Behavior:**
    *   The intake form grid (`.rescue-grid-form`) splits into two main sections (inputs left, upload sidebar right) on desktop and collapses into a single column on mobile. The adoption cards grid is fully responsive (`.adoption-grid`).

---

## 10. SOS Emergency Map Page (`citizens/SOSMap.jsx`)
*   **Purpose:** Allows citizens to report animal emergencies (injured stray, abuse, disaster) on a live map, pin-point the coordinates, and dispatch alerts to local shelters.
*   **Layout Blueprint:**
    1.  **Header:** Emergency Title and "Locate Me" button.
    2.  **SOS Layout:**
        *   **Left Column (Interactive Map - 2/3 width):** Leaflet map displaying active alerts and enabling user coordinate selection.
        *   **Right Column (Report Panel - 1/3 width):** Form to compile emergency details.
*   **Interactive Components:**
    *   "Locate Me" button.
    *   Interactive map markers (click to view popup).
    *   Alert Type dropdown (Injured Stray, Abuse, Zoonotic Sighting, Disaster).
    *   Animal Description textarea.
    *   Photo upload selector.
    *   "Report Incident" primary submit button.
*   **Responsive Behavior:**
    *   Uses `.sos-layout` which converts the split map-sidebar configuration into a stacked view on mobile. The report panel overlays or sits below the map frame to maintain a high-quality user experience.

---

## 11. Ownership Verification Page (`citizens/OwnershipVerification.jsx`)
*   **Purpose:** Citizen verification utility that uses multi-key cryptographic binding hashes to prove ownership of registered pets.
*   **Layout Blueprint:**
    1.  **Header:** Verification titles and Shield icons.
    2.  **Verification Form Card:** Input field, status indicators, and confirmation dialogs.
*   **Interactive Components:**
    *   Ownership key code input text field.
    *   "Submit Verification" button.
*   **Responsive Behavior:**
    *   Centered card layout (`max-width: 480px`) with flexible full-width input wraps for mobile devices.

---

## 12. Shelter Command Center Page (`ShelterDashboard.jsx`)
*   **Purpose:** Multi-functional dashboard for shelter administrators to manage SOS rescues, inventories, adoption pipelines, and facility capacity.
*   **Layout Blueprint:**
    1.  **Shelter Header:** Title, capacity details indicator.
    2.  **Navigation Panel (Tabs Grid):** 5 buttons with icons representing sub-modules (SOS Rescue, Kanban Pipeline, Inventory, Completed Adoptions, Capacity).
    3.  **Dynamic Workspace:**
        *   **SOS Rescue Tab:** List of nearby active rescue alerts with location coordinates, description, and status actions.
        *   **Kanban Pipeline Tab:** 4-column drag-and-drop workflow dashboard representing adoption applications.
        *   **Inventory Tab:** List of sheltered animals with filters, details, and forms to add/edit animals.
        *   **Completed Adoptions Tab:** Audit table of finalized adoptions.
        *   **Capacity Tab:** Real-time occupancy details, quarantine limits, and room stats.
*   **Interactive Components:**
    *   Tab buttons.
    *   "Accept Rescue" / "Resolve Alert" buttons.
    *   Kanban Application Cards (click to view applicant details modal).
    *   Questionnaire View Modal (buttons: "Schedule Interview", "Reject Application").
    *   Inventory controls: search inputs, "Add Pet" form triggers.
    *   Add/Edit animal form fields (text, number, file, dropdown selectors).
*   **Responsive Behavior:**
    *   The 5 navigation tabs are styled to wrap onto multiple lines or horizontal scroll container. The Kanban board transitions from 4 horizontal columns to a single active column selector on mobile screens.

---

## 13. Smart Match Dashboard (`analytics/SmartMatchDashboard.jsx`)
*   **Purpose:** Shows recommended shelter animals for adoption based on citizen's Lifestyle Assessment scores.
*   **Layout Blueprint:**
    1.  **Header:** Dashboard titles.
    2.  **Matches Grid:** Card grid representing matching animals, displaying photos, key traits, compatibility score percentage, and matching details.
*   **Interactive Components:**
    *   "Meet Pet" / "Adopt" buttons on animal recommendation cards.
*   **Responsive Behavior:**
    *   Uses `.matches-grid` which dynamically flows from 3 columns down to 1 column based on viewport breakpoints.

---

## 14. Lifestyle Assessment Form (`analytics/LifestyleAssessment.jsx`)
*   **Purpose:** Quiz wizard that collects citizen lifestyle data (housing size, working hours, activity level) using slider inputs.
*   **Layout Blueprint:**
    1.  **Header:** Step wizard indicators.
    2.  **Card Container:**
        *   Question text.
        *   Interactive range slider.
        *   Min/Max helper labels.
    3.  **Navigation Controls:** Back and Next buttons.
*   **Interactive Components:**
    *   Range sliders (`type="range"`).
    *   "Next", "Back", and "Submit" buttons.
*   **Responsive Behavior:**
    *   Centered questionnaire card layout designed for easy touch-slider access on mobile and tablets.

---

## 15. Predictive Health Dashboard (`analytics/PredictiveHealthDashboard.jsx`)
*   **Purpose:** Veterinary utility demonstrating weight trajectories, baseline development trends, and early health warnings for registered animals.
*   **Layout Blueprint:**
    1.  **Page Title & Alert Ribbon:** Early warning notification header.
    2.  **Two-Column Grid:**
        *   **Left Column (Charts & Vitals - 2/3 width):** Line charts detailing weight trends versus baseline, and vital stats logs.
        *   **Right Column (Animal List & Flags - 1/3 width):** Animal selector list highlighting risk levels.
*   **Interactive Components:**
    *   Animal selection cards.
    *   "Consult Vet" CTA button.
*   **Responsive Behavior:**
    *   Uses `.dashboard-grid` which stacks columns on mobile, pushing charts on top and the selection index below.

---

## 16. Civic Authority Control Room (`CivicAuthorityDashboard.jsx`)
*   **Purpose:** Command center for civic authorities to map zoonotic disease outbreaks, issue geo-fenced broadcast alerts, and verify registrations.
*   **Layout Blueprint:**
    1.  **Dashboard Header:** Title, status indicator, and "Export Analytics" CTA.
    2.  **Metrics Row:** 4 grid-based statistic cards.
    3.  **Live Reports Scroll Pane:** Horizontal scrolling list of incoming emergency alerts.
    4.  **Main Split Grid:**
        *   **Left Column (GIS Heatmap - 2/3 width):** Interactive Leaflet map displaying disease outbreak concentrations with a disease filter dropdown.
        *   **Right Column (Geo-Broadcast Form - 1/3 width):** Form panel to compile and dispatch alerts.
    5.  **Alert Log Panel:** Data table logging all dispatched emergency alerts in the region.
    6.  **Alert Deletion Modal:** Overlay popup requiring removal reasons for audit logs.
*   **Interactive Components:**
    *   "Export Analytics" button.
    *   Disease filter dropdown.
    *   Geo-broadcast form fields (target group dropdown, text payload textarea, "Execute" submit button).
    *   Trash icon button on reports (opens removal modal).
    *   Removal modal fields (reason dropdown, details textarea, confirm button).
*   **Responsive Behavior:**
    *   Stat cards and split grids wrap and stack into a single column format on smaller viewports. The horizontal reports slider enables swipe navigation on mobile devices.

---

## 17. Civic Analytics Page (`analytics/CivicAnalytics.jsx`)
*   **Purpose:** Deep-dive public health analytics displaying disease outbreak forecasting trends and regional risk indexes.
*   **Layout Blueprint:**
    1.  **Header:** Page title and ML indicators.
    2.  **Dashboard Grid:**
        *   **Trend Chart Panel:** Chart.js graph indicating disease trajectories.
        *   **Regional Risk Panel:** Heat-table showing local risk categories (High, Mid, Low) by district.
*   **Interactive Components:**
    *   Outbreak category selectors.
*   **Responsive Behavior:**
    *   Fully flexible layouts wrapping risk boxes and chart widgets into single vertical columns on smaller viewports.

---

## 18. Veterinarian Clinical Portal (`vet/VetDashboard.jsx`)
*   **Purpose:** Complete workspace for veterinarian doctors to manage clinical queues, record patient encounters/consultations, and configure availability slots and leaves.
*   **Layout Blueprint:**
    1.  **Page Title & Attending Vet Metadata:** Displays name of the logged-in doctor, their local body jurisdiction (e.g. "Kollam Corporation"), and active navigation tabs ("Appointments", "Manage Slots & Schedule").
    2.  **Tab Workspace Panel:**
        *   **Appointments Tab:** Displays a split-column panel showing:
            *   *Left Sidebar (Queue Status):* Renders the today's checked-in queue and skipped patient records. Lists current active patient card featuring queue position details.
            *   *Right Panel (Active Consultation Workspace):* Renders when a patient is selected from queue. Features input fields for logging vital signs (weight, temperature, heart rate), clinical notes, zoonotic disease flag dropdowns, and diagnostic image uploads.
            *   *Patient History Sidebar:* Renders logs of previous consultation dates (click to inspect full diagnostic notes) and embeds the **Inline Injection Checklist** (`InjectionChecklistInline`).
        *   **Manage Slots & Schedule Tab:** Split panel dividing:
            *   *Left Sidebar (Slots Configurator):* Lists active booking slots (Start Time, End Time, Maximum Bookings) with inline editing, deletion, and additions controls.
            *   *Right Panel (Holidays/Leaves Log):* Provides a date picker form to schedule leaves/holidays, alongside table entries logging marked holidays.
*   **Interactive Components:**
    *   Sub-module navigation tab buttons.
    *   Queue controls: "Call Patient" button, "Skip Patient" button, "Recall / Call Back" buttons, and "Start Consultation" CTA.
    *   Vitals Logging form: input fields for Weight, Temperature, and Heart Rate.
    *   Outbreak safety flag: "Zoonotic Disease Flag" dropdown.
    *   Attachment File uploads: Drag-and-drop selector for diagnostic images.
    *   **Inline Injection Checklist:** Checkboxes representing vaccines administered today. Clicking "Save & Generate Future Timeline" generates future reminders with deworming offsets. Individual checkboxes let vets mark schedule tasks as completed.
    *   Slot editor inputs (Start/End times, capacity counters, Edit/Save buttons).
    *   Holiday scheduler input fields (date picker, description textbox, Add/Delete holiday actions).
*   **Responsive Behavior:**
    *   Splits form views and queues into stacked, vertically flowing panels on tablet and mobile viewports. Queue items and slot entries support horizontal scrolling to avoid truncation.

---

## 19. Injection Scheduler Page (`citizens/VaccinationScheduler.jsx`)
*   **Purpose:** Multi-step wizard helping veterinarians or shelters administer injections, check vital signs, and log injection timelines.
*   **Layout Blueprint:**
    1.  **Header:** Title ("Injection Scheduler").
    2.  **Multi-Step Wizard Grid:**
        *   **Step 1: Check-In search bar:** Inputs to search and select appointments.
        *   **Step 2: Animal Vitals Form:** Input fields for heart rate, weight, temperature.
        *   **Step 3: Injection Checklist:** Checkboxes representing injections to administer.
        *   **Step 4: Timeline Generator:** Display of future injection dates and schedules.
*   **Interactive Components:**
    *   Pet Search input.
    *   Vitals input fields (text/number).
    *   Injection selection checkboxes.
    *   "Confirm Administration" submit button.
*   **Responsive Behavior:**
    *   Step wizard elements stack vertically on mobile. Checklist columns shift from multi-column grid layouts to single-column checkbox lists.

---

## 20. Super-Administrator Control Panel (`superadmin/SuperAdminDashboard.jsx`)
*   **Purpose:** Provides site administrators with user moderation workflows, system health logs, and audit trails.
*   **Layout Blueprint:**
    1.  **Admin Header:** Control room titles.
    2.  **Sub-Module Navigation Tabs:** Toggle buttons for "Users Management", "Audit Trail", and "System Health".
    3.  **Dynamic Workspace:**
        *   **Users Management Tab:** Data tables of pending, active, and suspended user accounts with moderation action buttons.
        *   **Audit Trail Tab:** Searchable logs table documenting all critical transactions on the site.
        *   **System Health Tab:** Grid panel illustrating AWS S3 status, queue logs, and database metrics.
*   **Interactive Components:**
    *   Tab buttons.
    *   User moderation actions ("Approve", "Reject", "Suspend").
    *   User search bar.
    *   Audit log search field.
    *   Pagination controls ("Next", "Prev").
*   **Responsive Behavior:**
    *   Tables wrap cells or enable horizontal scrolling (`overflow-x: auto`) to prevent truncation on mobile. The system metrics grid converts from a 3-column widget board to a single vertical column stack on small screens.
