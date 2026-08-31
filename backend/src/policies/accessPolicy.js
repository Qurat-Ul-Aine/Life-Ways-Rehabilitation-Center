/**
 * Role-based access control policies (SRS-22, SRS-23).
 * Single source of truth for which roles may perform which actions.
 */

const ROLES = Object.freeze(["ADMIN", "DOCTOR", "PATIENT", "STAFF", "FAMILY", "INTERN"]);

/** @type {Record<string, readonly string[]>} */
const PERMISSIONS = Object.freeze({
  "users:manage_roles": ["ADMIN"],
  "users:suspend": ["ADMIN"],
  "patients:list": ["ADMIN", "DOCTOR"],
  "patients:read": ["ADMIN", "DOCTOR", "PATIENT", "FAMILY"],
  "patients:create": ["ADMIN"],
  "patients:update": ["ADMIN"],
  "patients:delete": ["ADMIN"],
  "patients:confidential": ["ADMIN", "DOCTOR"],
  "medical:read": ["ADMIN", "DOCTOR", "PATIENT", "FAMILY"],
  "medical:write": ["ADMIN", "DOCTOR"],
  "medical:upload": ["ADMIN", "DOCTOR"],
  "patients:own_profile": ["PATIENT", "FAMILY"],
  "staff:manage": ["ADMIN"],
  "doctors:manage": ["ADMIN"],
  "doctors:clinical": ["DOCTOR"],
  "appointments:manage": ["ADMIN"],
  "appointments:clinical": ["ADMIN", "DOCTOR"],
  "appointments:book": ["PATIENT", "FAMILY"],
  "therapy:clinical": ["ADMIN", "DOCTOR"],
  "therapy:view_own": ["PATIENT", "FAMILY"],
  "therapy:session_notes:add": ["DOCTOR"],
  "therapy:session_notes:edit": ["DOCTOR"],
  "therapy:session_notes:view": ["ADMIN", "DOCTOR"],
  "therapy:exercises:write": ["ADMIN", "DOCTOR"],
  "therapy:plan:edit": ["ADMIN", "DOCTOR"],
  "therapy:plan:delete": ["ADMIN"],
  "ai:admin": ["ADMIN"],
  "ai:clinical": ["ADMIN", "DOCTOR"],
  "ai:patient": ["PATIENT", "FAMILY"],
  "reports:admin": ["ADMIN"],
  "notifications:all": ["ADMIN", "DOCTOR", "PATIENT", "STAFF", "FAMILY"],
});

function normalizeRole(role) {
  return String(role ?? "").trim().toUpperCase();
}

function hasPermission(role, permission) {
  const allowed = PERMISSIONS[permission];
  if (!allowed) return false;
  return allowed.includes(normalizeRole(role));
}

function hasAnyRole(role, ...roles) {
  const norm = normalizeRole(role);
  return roles.map(normalizeRole).includes(norm);
}

/** Roles that may use the patient portal (SRS-21). */
const PATIENT_PORTAL_ROLES = ["PATIENT", "FAMILY"];

function canUsePatientPortal(role) {
  return PATIENT_PORTAL_ROLES.includes(normalizeRole(role));
}

/** Family members have read-only access to linked patient data — no clinical writes. */
function isFamilyRole(role) {
  return normalizeRole(role) === "FAMILY";
}

module.exports = {
  ROLES,
  PERMISSIONS,
  PATIENT_PORTAL_ROLES,
  normalizeRole,
  hasPermission,
  hasAnyRole,
  canUsePatientPortal,
  isFamilyRole,
};
