# Fillop CBT Guru - System Architecture and Monorepo Documentation

Welcome to **Fillop CBT Guru**, the premium offline-first Windows CBT preparation application designed for JAMB, WAEC, and NECO candidates in Nigeria. This document details the monorepo architecture, file system layout, database schemas, and integration flows.

---

## 📂 Monorepo File System Layout

The project is structured as a modular monorepo containing three sibling application directories alongside a central documentation hub:

```text
/fillop-cbt-guru-monorepo
├── package.json                   # Root package configuration with workspaces
├── backend/                       # PHP REST API Backend
│   ├── db/
│   │   ├── db.php                 # Hybrid mysqli / SQLite3 connection adapter
│   │   └── schema.sql             # Central MySQL Database Schema
│   └── api/v1/
│       ├── register.php           # Registration & checkout initialization
│       ├── activate.php           # Passcode validation & hardware binding
│       ├── payments/
│       │   └── verify.php         # Paystack transaction verification
│       ├── sync/
│       │   ├── pull.php           # Question bank/syllabus download
│       │   └── push.php           # Candidate result backup sync
│       └── admin/
│           ├── analytics.php      # Admin analytics dashboard feed
│           ├── users.php          # Candidate lookup and suspension toggles
│           ├── passcodes.php      # License generation & extension
│           ├── promo_codes.php    # Referral and promo creation
│           └── questions.php      # Individual CRUD & CSV bulk upload
│
├── admin/                         # Central React Web Admin Panel
│   ├── package.json               # Vite + React Admin config
│   ├── tsconfig.json              # TypeScript compilation rules
│   ├── vite.config.ts             # Vite server config (Port 5174)
│   ├── index.html                 # Entry layout
│   └── src/
│       ├── main.tsx               # Bootstrap script
│       ├── shims.d.ts             # CSS / asset shims
│       ├── style.css              # Custom slate/glowing admin stylesheet
│       └── App.tsx                # Single-Page Admin interface (Dashboard, Users, Passcodes, Promos, Questions)
│
├── desktop/                       # Electron + React Client Terminal (Offline-First)
│   ├── package.json               # Electron + React Renderer package
│   ├── tsconfig.json              # Client compilation rules
│   ├── vite.config.ts             # Vite server config (Port 5173)
│   ├── index.html                 # Client entry layout
│   ├── electron/
│   │   ├── main.cjs               # Main process, local registry UUID binding, exam selection algorithms
│   │   ├── preload.cjs            # Type-safe secure IPC boundary bridge
│   │   └── services/
│   │       ├── dbService.cjs      # SQLite initialization, indexing, 10Q per subject mock data seeding
│   │       └── syncService.cjs    # Startup pulls, manual sync, 45s periodic background sync checks
│   └── src/
│       ├── main.tsx               # Bootstrap script
│       ├── global.d.ts            # Type-safe window.api IPC interface declarations
│       ├── shims.d.ts             # Static asset shims
│       ├── style.css              # Candidate UI styling
│       └── App.tsx                # Candidate terminal dashboard, single/multi-mode practice, review engine
│
└── docs/
    └── architecture.md            # [This File] Full Architectural Guide
```

---

## 🗄️ Database Schemas

SQLite and MySQL databases share a mirrored schema to maintain synchronization integrity:

### 1. `subjects`
- **Columns:** `id (INT PRIMARY KEY)`, `name (VARCHAR)`, `exam_type (VARCHAR: JAMB | WAEC | NECO)`.
- *Note:* Subjects are unique per exam type (e.g., JAMB Mathematics and WAEC Mathematics are separate rows to accommodate syllabus differences).

### 2. `topics`
- **Columns:** `id (INT PRIMARY KEY)`, `subject_id (INT FK)`, `name (VARCHAR)`.

### 3. `questions`
- **Columns:** `id (INT PRIMARY KEY)`, `exam_type (VARCHAR)`, `subject_id (INT FK)`, `year (INT)`, `topic_id (INT FK)`, `difficulty (VARCHAR)`, `question_text (TEXT)`, `option_a..d (TEXT)`, `correct_answer (CHAR: A..D)`, `topic_explanation (TEXT)`, `correct_explanation (TEXT)`, `wrong_explanations (TEXT)`.
- **Indices:**
  - `idx_questions_filter ON (exam_type, subject_id, year)` — drives Mock exam selection.
  - `idx_questions_topic ON (exam_type, subject_id, topic_id)` — drives Practice mode selection.

### 4. `passcodes` (Server)
- **Columns:** `id (INT AUTO_INC)`, `passcode (VARCHAR UNIQUE)`, `email (VARCHAR)`, `organization_id (INT NULL FK)`, `max_devices (INT)`, `activated_devices (INT)`, `status (VARCHAR)`, `duration_days (INT)`, `expires_at (TIMESTAMP)`.

### 5. `devices` (Server)
- **Columns:** `id (INT AUTO_INC)`, `passcode_id (INT FK)`, `device_uuid (VARCHAR)`, `hardware_hash (VARCHAR)`.

### 6. `activation` (Local Client SQLite)
- **Columns:** `email (TEXT)`, `passcode (TEXT PRIMARY KEY)`, `activated_at (TEXT)`, `expiry_date (TEXT)`, `is_active (INT)`.

---

## ⚙️ Algorithms & Mechanics

### 1. Stratified Topic Selection Algorithm
To prevent mock exams from being accidentally dominated by a single topic, questions are balanced using a two-pass stratification draw:
1. **Pass 1:** Calculate quota $base = \lfloor needed / topic\_count \rfloor$ and $remainder = needed \pmod{topic\_count}$. Every topic receives $base$ slots, with remainder slots distributed round-robin. For each topic, a random sample is drawn up to its quota.
2. **Pass 2:** If any topic contains fewer questions than its quota, the deficit (shortfall) is aggregated into a surplus pool. This surplus pool is then randomized and used to backfill the gap across other topics that still contain unselected questions, ensuring a balanced, non-blocking test sheet.

### 2. Multi-Seat Licensing & Anti-Piracy
- A single passcode purchase can contain $N$ maximum device seats.
- Upon activation, the desktop client generates a unique `device_uuid` persisted to local user data and the **Windows Registry** (surviving application reinstalls), alongside a SHA-256 hardware features hash.
- The server checks seat limits, binds new hardware, and dynamically calculates the $X$-day expiration starting from the first activation event.

### 3. Bi-Directional Offline Sync
- **Startup:** If internet is detected, the client automatically pulls updated questions, subjects, and topics inside atomic SQLite database transactions and backs up local scores.
- **Pushes:** Local test scores where `synced = 0` are pushed in batches to the cloud PHP REST backend, and marked `synced = 1` in SQLite upon a successful response.
- **Background Loop:** Runs a periodic loop every 45 seconds when simulated online to maintain consistency.
