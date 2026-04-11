# Learn2Hire

Placement and learning platform: student profiles, assessments, jobs, notifications, and a public or authenticated **learning hub** (subjects, study materials, progress).

---

## Tech stack

| Layer | Technology |
|--------|------------|
| Frontend | React 18, React Router 6, Vite 6, Tailwind CSS 4 |
| Backend | Node.js, Express 5, MongoDB (Mongoose) |
| Auth | JWT (`Authorization: Bearer <token>`), bcrypt for passwords |

---

## Repository layout

```
Learn2Hire/
├── frontend/                 # Vite + React SPA
│   ├── src/
│   │   ├── App.jsx           # Route table + ProtectedRoute
│   │   ├── main.jsx          # BrowserRouter entry
│   │   ├── index.css         # Global + Tailwind
│   │   ├── pages/            # Full-page views (see routes below)
│   │   ├── components/
│   │   │   ├── landing/      # SiteHeader, HeroSection, SectionHeading
│   │   │   ├── auth/         # AuthLayout, AuthField
│   │   │   ├── dashboard/    # DashboardTopNav (shared top bar)
│   │   │   ├── *-dashboard/  # Role-specific dashboards (student, faculty, …)
│   │   │   └── ui/           # button, card, nav-dropdown
│   │   └── lib/
│   │       ├── api.js        # readApiResponse, fetch helpers
│   │       ├── authSession.js# post-login paths, session helpers
│   │       └── utils.js      # cn(), etc.
│   └── vite.config.js        # port 3000; proxies /api → backend
├── backend/
│   ├── server.js             # Express app, mounts /api/* routers
│   ├── config/db.js          # MongoDB connection
│   ├── middleware/
│   │   └── authMiddleware.js # protect, optionalProtect
│   ├── routes/               # HTTP route modules (thin)
│   ├── controllers/          # Request handlers + business logic
│   ├── models/               # Mongoose schemas
│   └── scripts/              # seed / verify learning content
│
└── README.md                 # This file
```

---

## How the app runs

1. **Backend** (`backend/`, default port **5000**): serves REST JSON under `/api/...`. Sets `Cache-Control: no-store` for `/api` to avoid stale cached API responses.
2. **Frontend** (`frontend/`, Vite dev server port **3000**): proxies **`/api`** to `http://localhost:5000` (override with env **`VITE_PROXY_TARGET`**).

Typical local workflow:

```bash
# Terminal 1 — MongoDB must be running; configure backend/.env
cd backend && npm install && npm run dev

# Terminal 2
cd frontend && npm install && npm run dev
```

Open `http://localhost:3000`. The UI calls `/api/...` on the same origin; Vite forwards those to the backend.

---

## Frontend routing (`frontend/src/App.jsx`)

React Router uses **`BrowserRouter`** (`frontend/src/main.jsx`). **`ProtectedRoute`** reads auth from `useAuthSession()` (token + user in `localStorage`); unauthenticated users are redirected to **`/login`**.

### Public routes

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | `LandingPage` | Marketing home |
| `/login` | `Login` | Sign in |
| `/signup` | `Signup` | Register |
| `/learning` | `LearningHomePage` (`mode="public"`) | Public learning hub (catalog, filters) |
| `/learning/topic/:slug` | `MaterialDetailsPage` | Read one material by slug |
| `/learning/subject/:categorySlug` | `LearningSubjectPage` (`mode="public"`) | Materials for one subject |
| `/learning/:categorySlug` | `RedirectPublicLearningCategory` | Redirects to `/learning/subject/:categorySlug` (legacy-style URL) |

### Protected routes (require JWT)

| Path | Component | Purpose |
|------|-----------|---------|
| `/dashboard` | `Dashboard` | Role router → loads the correct dashboard component |
| `/learning/progress` | `MyLearningProgressPage` | Student learning progress (public URL variant) |
| `/dashboard/learning` | `LearningHomePage` (`mode="dashboard"`) | Learning hub inside app shell (dark theme) |
| `/dashboard/learning/progress` | `MyLearningProgressPage` | Same progress page, dashboard context |
| `/dashboard/learning/manage` | `LearningManagePage` | Faculty: create/edit/import study materials |
| `/dashboard/learning/topic/:slug` | `MaterialDetailsPage` | Material detail when logged in |
| `/dashboard/learning/subject/:categorySlug` | `LearningSubjectPage` (`mode="dashboard"`) | Subject page in dashboard |
| `/dashboard/learning/:categorySlug` | `RedirectDashboardLearningCategory` | Redirects to `/dashboard/learning/subject/:categorySlug` |
| `/notifications` | `NotificationsPage` | In-app notifications |
| `/assessments` | `AssessmentsList` | List published assessments |
| `/assessments/create` | `CreateAssessment` | Faculty: create assessment |
| `/assessments/:id` | `StudentAssessment` | Take / view assessment |
| `/jobs` | `JobsPage` | Job board |
| `/jobs/:id` | `JobDetailsPage` | Job detail + apply |
| `/admin/jobs` | `AdminJobsPage` | Admin job management |
| `/company/jobs` | `CompanyJobsPage` | Company job management |

**Catch-all:** unknown paths → **`/`**.

### Dashboard role dispatch (`frontend/src/pages/Dashboard.jsx`)

After login, **`/dashboard`** renders one of:

- **student** → `StudentDashboard` (sidebar + sections: profile, assessments, learning links, progress)
- **faculty** → `FacultyDashboard` (includes link to **`/dashboard/learning/manage`**)
- **company** → `CompanyDashboard`
- **college** → `CollegeDashboard`
- **admin** → `AdminDashboard`
- **alumni** → lightweight layout with jobs / learning links
- Other roles → generic “workspace setup” placeholder

Shared chrome: often **`DashboardTopNav`** (`frontend/src/components/dashboard/DashboardTopNav.jsx`) for title, notifications, sign-out, and toolbar actions.

---

## Backend API (`backend/server.js`)

All JSON APIs are under **`/api`**. Routers are mounted as follows:

| Mount path | Router file | Notes |
|------------|-------------|--------|
| `/api/auth` | `routes/authRoutes.js` | Signup/login public; `/me` protected |
| `/api/profile` | `routes/profileRoutes.js` | **All protected** — student profile CRUD + skills |
| `/api/assessments` | `routes/assessmentRoutes.js` | **All protected** — assessment CRUD |
| `/api/submissions` | `routes/submissionRoutes.js` | **All protected** — submit / list submissions |
| `/api/jobs` | `routes/jobRoutes.js` | **All protected** — jobs, apply, save, company dashboard, etc. |
| `/api/admin` | `routes/adminRoutes.js` | **All protected** — analytics, user role, student import |
| `/api/notifications` | `routes/notificationRoutes.js` | **All protected** |
| `/api/learning` | `routes/learningRoutes.js` | **Mixed** — public reads + optional auth; `/manage/*` protected |
| `/api/subjects` | `routes/subjectRoutes.js` | **All protected** — subject master CRUD |
| `/api/college` | `routes/collegeRoutes.js` | **All protected** — roster, faculty approval, imports |

Additional:

- `GET /api/health` — health check JSON
- `GET /` (backend root) — plain text hello (not used by SPA for data)

### Learning API (most used by the hub)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/learning/categories` | Public | Legacy/public categories |
| GET | `/api/learning/subjects` | Optional | Subject list for hub (can personalize if token present) |
| GET | `/api/learning/materials` | Optional | List materials |
| GET | `/api/learning/materials/:slug` | Optional | One material by slug |
| GET | `/api/learning/materials/recommended/me` | **JWT** | Recommended materials |
| GET | `/api/learning/progress/me` | **JWT** | Aggregated progress |
| GET | `/api/learning/progress/material/:slug` | **JWT** | Progress for one material |
| PUT | `/api/learning/progress/material/:slug` | **JWT** | Save progress |
| * | `/api/learning/manage/*` | **JWT** | Categories + materials CRUD, image upload, sheet import |

### Auth API

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/signup` | Register |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Current user (JWT) |

### Other groups (summary)

- **`/api/profile`**: `GET/POST/PUT /`, `PATCH /skills`
- **`/api/assessments`**: `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`
- **`/api/submissions`**: `GET /`, `GET /assessment/:assessmentId`, `GET /:id`, `POST /`
- **`/api/jobs`**: list/detail CRUD, `POST /:id/apply`, save/unsave, applications, suggestions, company dashboard (see `jobRoutes.js` for order — parameterized routes last)
- **`/api/notifications`**: list, mark read, mark all read
- **`/api/admin`**: analytics, insights, user list, role patch, student import
- **`/api/subjects`**: subject CRUD
- **`/api/college`**: insights, roster, import students, pending faculty, approval patch

Controllers live in **`backend/controllers/`**; models in **`backend/models/`** (e.g. `User`, `Job`, `Assessment`, `StudyMaterial`, `Subject` / learning categories, `LearningProgress`, `Notification`, `StudentProfile`, etc.).

---

## Environment

Configure **`backend/.env`** (not committed) with at least MongoDB URI and JWT secret as required by `config/db.js` and `authMiddleware`. The frontend needs no API base URL in dev if you use the Vite proxy; production builds typically serve the SPA and reverse-proxy `/api` to the same host or a known API URL.

---

## Seed scripts (backend)

From `backend/`:

- `npm run seed:subjects` — seed learning subjects
- `npm run seed:materials` — seed study materials
- `npm run seed:learning` — both
- `npm run verify:learning` — verify learning content

---

## Design notes

- **Learning URLs:** Static path segments (`/learning/progress`, `/learning/topic/...`) are registered **before** `/learning/:categorySlug` so slugs are not mistaken for category routes.
- **Material detail** works on both `/learning/topic/:slug` and `/dashboard/learning/topic/:slug`; the page can adapt behavior based on auth/context.
- **Optional JWT** on some learning GET routes allows the same endpoints to return generic or personalized data when a token is sent.

For deeper behavior, follow the route → controller → model chain for the feature you care about.
