# EcoPin Role & Permission Matrix

| Feature / Action | Officer | Field Crew | Citizen | Admin |
| :--- | :---: | :---: | :---: | :---: |
| **Officer Dashboard** (`/dashboard`) | ✅ | ❌ | ❌ | ❌ |
| **Field Crew Dashboard** (`/dashboard/field-crew`) | ❌ | ✅ | ❌ | ❌ |
| **Clusters View** (`/dashboard/clusters`) | ✅ | ❌ | ❌ | ❌ |
| **Analytics View** (`/dashboard/analytics`) | ✅ | ❌ | ❌ | ❌ |
| **Response Logs** (`/dashboard/response-logs`) | ✅ | ❌ | ❌ | ❌ |
| **Create Custom Task** (`/dashboard/officer/cleanup-tasks/create`) | ✅ | ❌ | ❌ | ❌ |
| **Open and read own support tickets** (Android app, `/api/support/tickets`) | ❌ | ❌ | ✅ | ❌ |
| **Answer support tickets** (`/dashboard/support-tickets`) | ✅ | ❌ | ❌ | ✅ |
| **View Cleanup Tasks** | ✅ | ✅ | ❌ | ✅ |
| **View Reports** | ✅ | ✅ | ✅ | ✅ |
| **User & System Admin** | ❌ | ❌ | ❌ | ✅ |
