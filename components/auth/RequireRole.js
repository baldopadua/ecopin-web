// components/auth/RequireRole.js
'use client';
import { useUser } from './UserContext';
import React from 'react';

/**
 * Guard component that renders children only if the authenticated user has one of the required roles.
 * @param {Object} props
 * @param {string|string[]} props.allowedRole - Role name or array of role names that are permitted.
 * @param {React.ReactNode} props.children - Content to render when authorized.
 */
export function RequireRole({ allowedRole, children }) {
  const user = useUser();
//   console.log("user role: ", user?.role);
  const role = user?.role ?? 'guest';
  const allowed = allowedRole?.toString() === role;
  console.log("Allowed: ", allowed);
  if (allowed) {
    return <>{children}</>;
  }
  return (
    <div className="flex h-screen items-center justify-center bg-surface dark:bg-[#0a0f08]">
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold mb-4 text-text-primary">Access Denied</h2>
        <p className="text-text-secondary">You do not have permission to view this page.</p>
      </div>
    </div>
  );
}

/** Convenience wrappers for common roles */
export const OfficerGuard = ({ children }) => (
  <RequireRole allowedRole="officer">{children}</RequireRole>
);

export const FieldCrewGuard = ({ children }) => (
  <RequireRole allowedRole="field_crew">{children}</RequireRole>
);
