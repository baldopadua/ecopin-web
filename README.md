# EcoPin Web Application

EcoPin is an AI-powered environmental response and cleanup monitoring platform.

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
