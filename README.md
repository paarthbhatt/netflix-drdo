# Netflix Clone — Security Research Sandbox

> **A high-fidelity Netflix clone built as an intentionally vulnerable web application for academic security research, penetration testing labs, and access-control vulnerability demonstrations.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-netflix--drdo.vercel.app-E50914?style=for-the-badge&logo=vercel&logoColor=white)](https://netflix-drdo.vercel.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Features](#features)
- [Intentional Vulnerabilities (Research Targets)](#intentional-vulnerabilities-research-targets)
- [Security Remediation](#security-remediation)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Firebase Configuration](#firebase-configuration)
- [Firestore Security Rules](#firestore-security-rules)
- [Vulnerability Research Notes](#vulnerability-research-notes)
- [Git Branch Strategy](#git-branch-strategy)
- [Deployment](#deployment)
- [Disclaimer](#disclaimer)

---

## Project Overview

This repository is a **full-stack, production-grade Netflix clone** used as a controlled security research sandbox. It replicates the core Netflix experience — authentication, subscription paywalls, profile management, movie browsing, watchlists, and a video player — while intentionally embedding documented vulnerabilities for academic study.

The project was developed as part of a **Secure Software Engineering & Cloud Architecture** module. Its dual purpose is:

1. **Authentic UX fidelity** — a pixel-close Netflix clone to make vulnerability demonstrations realistic and meaningful.
2. **Controlled vulnerability surface** — deliberately introduced weaknesses (CWE-285, CWE-639, CWE-353) that can be safely exploited in a sandboxed environment with Google authentication.

The security research findings, exploitation paths, and remediations are documented in full within the [`notes/`](./notes/) directory and the [`vulnerability_complete_analysis.md`](./vulnerability_complete_analysis.md) file.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (SPA — Vite + React)              │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Landing    │  │  Subscription│  │  Authenticated    │  │
│  │  Page       │  │  Paywall     │  │  Browse UI        │  │
│  └─────────────┘  └──────────────┘  └───────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Firebase SDK (Client-Side)              │    │
│  │   Auth (Google OAuth) │ Firestore (Realtime DB)     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Firebase Backend (GCP)                     │
│                                                             │
│  ┌──────────────────────┐   ┌───────────────────────────┐   │
│  │  Firebase Auth       │   │  Cloud Firestore           │   │
│  │  (Google Provider)   │   │  /users/{uid}              │   │
│  │                      │   │  /users/{uid}/profiles/    │   │
│  └──────────────────────┘   └───────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Data Flow:**
1. User authenticates via Google OAuth through Firebase Auth.
2. On sign-in, the app fetches the user's subscription document from Firestore (`/users/{uid}`).
3. Subscription state determines rendering: unauthenticated → landing page; authenticated + unsubscribed → paywall; authenticated + subscribed → full browse UI.
4. Viewer profiles (`/users/{uid}/profiles/`) store per-profile preferences and watchlists, synced to Firestore in real time.

---

## Features

### 🎬 Core Application
| Feature | Description |
|---|---|
| **Landing Page** | Pixel-accurate Netflix landing with hero section, trending carousel, feature cards, FAQ accordion |
| **Google Sign-In** | OAuth via Firebase Auth (popup + redirect fallback for embedded/mobile environments) |
| **Subscription Paywall** | Multi-step subscription flow with plan selection (Mobile / Standard / Premium) and billing cycle |
| **Profile Selector** | Multi-viewer profile system with avatars, kids mode, and profile management |
| **Movie Browser** | Categorized rows: Trending, Popular, Sci-Fi, Action/Thriller, Documentary, Romance, Fantasy |
| **Billboard Hero** | Full-width featured movie with play and watchlist actions |
| **Search** | Real-time full-text search across title, genre, cast, and overview |
| **Watchlist** | Per-profile watchlist, persisted to Firestore with optimistic UI updates |
| **Movie Details Modal** | Expanded view with overview, cast, rating, and match score |
| **Video Player** | Inline video playback component with movie-specific video URLs |
| **Account Management** | Billing info, plan details, profile CRUD, and sign-out |
| **Kids Mode** | Parental control tab that restricts content to age-appropriate movies |

### 🔒 Security Research Features
| Feature | Description |
|---|---|
| **`window.auditState`** | Globally exposed React state setter for client-side state injection demo (CWE-639) |
| **`window.db`** | Globally exposed Firestore SDK instance for direct database write demo (CWE-285) |
| **Permissive Firestore Rules** | Pre-remediation rules allow authenticated users to write subscription fields directly |
| **Audit Hook** | Subscription state bypass injectable via DevTools Console |

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend Framework** | React | 19 |
| **Language** | TypeScript | ~5.8 |
| **Build Tool** | Vite | 6 |
| **Styling** | Tailwind CSS | 4 |
| **Animation** | Motion (Framer Motion) | 12 |
| **Icons** | Lucide React | 0.546 |
| **Authentication** | Firebase Auth (Google OAuth) | 12 |
| **Database** | Cloud Firestore | 12 |
| **AI SDK** | Google Gemini (`@google/genai`) | 2 |
| **Runtime** | Node.js / Express (dev proxy) | — |
| **Deployment** | Vercel | — |

---

## Project Structure

```
netflix-drdo/
├── src/
│   ├── App.tsx                     # Root component: auth, routing, state orchestration
│   ├── firebase.ts                 # Firebase init, Firestore error handler, connection test
│   ├── authz.ts                    # (Post-fix) Authorization utilities
│   ├── types.ts                    # TypeScript interfaces: UserAccount, ViewerProfile, Movie
│   ├── moviesData.ts               # Static movie catalog with profile-specific dressing logic
│   ├── index.css                   # Global styles
│   ├── main.tsx                    # React DOM entry point
│   └── components/
│       ├── Billboard.tsx           # Hero featured movie banner
│       ├── ManageAccountModal.tsx  # Account settings, billing, profile management
│       ├── MovieDetailsModal.tsx   # Expanded movie info overlay
│       ├── MovieRow.tsx            # Horizontally scrollable movie category row
│       ├── Navbar.tsx              # Top navigation: tabs, search, profile switcher
│       ├── ProfileSelector.tsx     # Multi-profile chooser screen
│       ├── SubscriptionPaywall.tsx # Plan selection and subscription flow
│       └── VideoPlayer.tsx         # Inline video playback
│
├── notes/                          # Security research notes (post-audit)
│   ├── Findings.md                 # All discovered vulnerabilities
│   ├── Attack_Path.md              # Step-by-step exploitation chains
│   ├── Code_Review.md              # Source code security annotations
│   ├── Database_Assessment.md      # Firestore rules analysis
│   ├── Firestore_Security_Review.md
│   ├── Architecture_Changes.md     # Remediation design decisions
│   ├── Security_Remediation_Report.md
│   └── Report.md                   # Final consolidated assessment report
│
├── firestore.rules                 # Cloud Firestore security rules
├── firebase-applet-config.json     # Firebase project configuration
├── firebase-blueprint.json         # Firebase project schema/blueprint
├── vulnerability_complete_analysis.md  # Full vulnerability write-up (CWE-639, CWE-285, CWE-353)
├── VULNERABILITY_RESEARCH_REPORT.md    # Executive research report
├── security_spec.md                # Security specification and test cases
├── vite.config.ts                  # Vite build configuration
├── tsconfig.json                   # TypeScript compiler options
├── package.json                    # Dependencies and scripts
└── .env.example                    # Environment variable template
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [npm](https://www.npmjs.com/) v9 or higher
- A [Firebase project](https://console.firebase.google.com/) with Auth and Firestore enabled

### Installation

```bash
# Clone the repository
git clone https://github.com/paarthbhatt/netflix-drdo.git
cd netflix-drdo

# Install dependencies
npm install
```

### Running Locally

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### Other Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite dev server on port 3000 |
| `npm run build` | Build production bundle to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Type-check with TypeScript (`tsc --noEmit`) |
| `npm run clean` | Remove `dist/` and `server.js` |

---

## Firebase Configuration

The app reads its Firebase config from [`firebase-applet-config.json`](./firebase-applet-config.json). This file contains the standard Firebase SDK configuration object (non-secret, public keys).

**Required Firebase services:**
1. **Authentication** — Enable the **Google** sign-in provider.
2. **Cloud Firestore** — Create a database and deploy the [`firestore.rules`](./firestore.rules).
3. **Authorized Domains** — Add your deployment domain (e.g., `netflix-drdo.vercel.app`) under `Authentication → Settings → Authorized Domains`.

**Environment Variables** (optional, see [`.env.example`](./.env.example)):

```ini
GEMINI_API_KEY=your_gemini_api_key_here
APP_URL=https://your-deployment-url.vercel.app
```

---



## Vulnerability Research Notes

All security research artifacts are in the [`notes/`](./notes/) directory:

| Document | Contents |
|---|---|
| [`Findings.md`](./notes/Findings.md) | Complete vulnerability findings list with severity ratings |
| [`Attack_Path.md`](./notes/Attack_Path.md) | Detailed step-by-step exploitation chains |
| [`Code_Review.md`](./notes/Code_Review.md) | Annotated source code review with security observations |
| [`Database_Assessment.md`](./notes/Database_Assessment.md) | Firestore rules analysis (pre and post fix) |
| [`Firestore_Security_Review.md`](./notes/Firestore_Security_Review.md) | Deep-dive into Firestore rule design |
| [`Architecture_Changes.md`](./notes/Architecture_Changes.md) | Architectural decisions made during remediation |
| [`Security_Remediation_Report.md`](./notes/Security_Remediation_Report.md) | Full remediation summary |
| [`Report.md`](./notes/Report.md) | Final consolidated assessment report |

The root-level documents provide a higher-level summary:
- [`vulnerability_complete_analysis.md`](./vulnerability_complete_analysis.md) — Unified analysis with exploitation steps and mitigations (CWE-639, CWE-285, CWE-353)
- [`VULNERABILITY_RESEARCH_REPORT.md`](./VULNERABILITY_RESEARCH_REPORT.md) — Executive research report

---

## Git Branch Strategy

This repo maintains two significant states for evaluation purposes:

| Branch / Commit | State | Description |
|---|---|---|
| `e061a96` | **Pre-fix (Vulnerable)** | Intentionally vulnerable state with `window.db`, `window.auditState`, and permissive Firestore rules — used for live exploit demonstrations |
| `security-fixes` | **Post-fix (Hardened)** | Full remediation applied: `authz.ts` introduced, global exposures removed, Firestore rules hardened |
| `main` | **Current** | Points to whichever state is being evaluated |

**To switch to the hardened state:**
```bash
git reset --hard security-fixes
git push origin main --force
```

**To restore the vulnerable state for demos:**
```bash
git reset --hard e061a96
git push origin main --force
```

---

## Deployment

The application is deployed on **Vercel** and is configured for automatic deployment on pushes to `main`.

**Live URL:** [https://netflix-drdo.vercel.app/](https://netflix-drdo.vercel.app/)

### Deploy Your Own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/paarthbhatt/netflix-drdo)

**Post-deploy checklist:**
1. Add your Vercel domain to Firebase Authorized Domains.
2. Set `GEMINI_API_KEY` and `APP_URL` in Vercel Environment Variables if needed.
3. Deploy Firestore security rules: `firebase deploy --only firestore:rules`.

---

## Disclaimer

> **This project is strictly for educational and academic research purposes.**
>
> The vulnerabilities documented and demonstrated in this repository are **intentionally introduced** in a controlled environment under academic supervision. The exploit techniques shown — including client-side state injection and direct Firestore writes — are designed to illustrate real-world attack classes (CWE-285, CWE-639, CWE-353) in a safe, isolated sandbox.
>
> **Do not attempt to apply these techniques against any production system, third-party service, or application without explicit written authorization.** Unauthorized exploitation of systems is illegal and unethical.
>
> The production deployment at `netflix-drdo.vercel.app` is a research demonstration. No real payment information is collected or processed.

---

<div align="center">
  <sub>Built for academic security research · <a href="https://netflix-drdo.vercel.app/">Live Demo</a> · <a href="./vulnerability_complete_analysis.md">Vulnerability Analysis</a></sub>
</div>
