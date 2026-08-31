export const PATIENT_THERAPY_REFRESH = "patient-therapy-refresh";

export function refreshPatientTherapy() {
  window.dispatchEvent(new Event(PATIENT_THERAPY_REFRESH));
}
