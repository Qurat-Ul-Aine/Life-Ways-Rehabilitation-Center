import { doctorService } from "@/features/doctor/services/doctorService";

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  qualifications: string;
  experienceYears: number;
  patientsTreated: number;
  successRate: number;
  consultationFee: number;
  available: boolean;
  about: string;
  location: string;
  image: string;
  gender?: string | null;
}

// ── API se data fetch karo, map karo ─────────────────────────────────────────

function mapToDoctor(d: Awaited<ReturnType<typeof doctorService.getById>>): Doctor {
  return {
    id: d.id,
    name: d.name,
    specialty: d.specialization || "Specialist",
    qualifications: d.qualification || "",
    experienceYears: d.experience || 0,
    patientsTreated: (d as any).patientsTreated ?? 0,
    successRate: (d as any).successRate ?? 0,
    consultationFee: d.consultationFee || 0,
    available: d.availability_status === "AVAILABLE",
    about: d.about || `${d.name} is a dedicated specialist at Life Ways Rehabilitation Center.`,
    location: "Life Ways Rehabilitation Center, Ghouri Town, Islamabad",
    // Agar admin ne image URL diya hai toh woh use karo, warna placeholder
    image: d.image && d.image.trim() !== "" ? d.image : "/placeholder-doctor.png",
    gender: d.gender ?? null,
  };
}

// Public page ke liye — sirf approved doctors
export async function fetchDoctorsFromAPI(): Promise<Doctor[]> {
  try {
    const res = await doctorService.getAll({ approved: true });
    return res.items.map((d) => mapToDoctor(d));
  } catch {
    // API fail hone pe empty array — static fake data nahi
    return [];
  }
}

// Profile page ke liye — ek doctor by ID
export async function fetchDoctorByIdFromAPI(id: string): Promise<Doctor | undefined> {
  try {
    const d = await doctorService.getById(id);
    return mapToDoctor(d);
  } catch {
    return undefined;
  }
}