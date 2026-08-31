/** Patient profile within the doctor portal (keeps doctor sidebar/layout). */
export function doctorPatientPath(patientId: string): string {
  return `/doctor/patients/${patientId}`;
}

export function doctorNotesPath(patientId?: string): string {
  return patientId ? `/doctor/notes?patient=${encodeURIComponent(patientId)}` : "/doctor/notes";
}
