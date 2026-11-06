# EcoPin Web Application

EcoPin is an AI-powered environmental response and cleanup monitoring platform.

## Android download

The public Android download buttons use `/ecopin-app-release.apk`, also linked
from `/downloads`. Its version, source commit, size, and SHA-256 are recorded in
`public/ecopin-app-release.json`. The 7 November 2026 release is version 0.1.0,
Android build 6, from app commit `855e4082263b9dc9f53d8d6f5e72320e5bcdd0bb`.
It adds citizen-selected Urgent, Non-urgent and Not specified priority beside
report status in citizen/public details and field-crew headers. Build it from `ecopin_app` with
`flutter build apk --release --no-pub --build-name=0.1.0 --build-number=6`.
Replace the APK and manifest together, preserving the existing signing key and
increasing the Android build number for future upgrades.

## Officer dispatch tutorial (WT-96)

On the first visit to `/dashboard/officer`, officers see a six-step tour: review
hotzones, check crew readiness, generate routes, review the proposal, confirm dispatch,
and monitor crews. Each step names the relevant workspace and provides a short checklist.
The walkthrough highlights the relevant dashboard areas where visible;
it never generates proposals or dispatches crews. Back, Next, Skip, Finish, and Escape
are supported, with keyboard focus kept inside the tutorial.

Open **Profile & account → Onboarding** to toggle automatic onboarding or replay
the tutorial. Completion, dismissal, and the toggle persist per officer in this
browser. Replay enables the tour and starts at step one. If browser storage is
blocked, preferences last for the current visit. Profile uses the shared notification
toast for successful preference saves and a warning when storage is unavailable.

## Role-Based Access Control (RBAC) System

The application separates operations into clear roles:

- **Officer**: Responsible for planning, supervision, operational analytics, cluster management, cleanup task creation, and response logs monitoring.
- **Field Crew**: Responsible for field cleanup execution, viewing assigned tasks, status updates, and field report tracking.
- **Citizen**: Standard user role for reporting environmental issues and viewing public maps.
- **Admin**: User management, system configuration, and audit logs.

### Role Navigation & UI Protection
- Dynamic navigation rendering based on authenticated user context via `UserContext`.
- Role-specific UI gating using `RequireRole`, `OfficerGuard`, and `FieldCrewGuard` components.
- Dedicated dashboards for Officers (`/dashboard`) and Field Crew (`/dashboard/field-crew`).

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to launch the web application.
