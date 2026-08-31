export const PATIENT_DASHBOARD_REFRESH = "patient-dashboard-refresh";

export function refreshPatientDashboard() {
  window.dispatchEvent(new Event(PATIENT_DASHBOARD_REFRESH));
}
