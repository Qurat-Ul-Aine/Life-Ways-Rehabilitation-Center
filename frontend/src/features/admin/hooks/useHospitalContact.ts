import { useMemo } from "react";
import defaultLogo from "@/assets/logo.png";
import { resolveUploadUrl } from "@/lib/mediaUrl";
import { useHospitalSettings } from "@/features/admin/context/HospitalSettingsContext";

export function toPhoneHref(phone?: string | null): string | undefined {
  if (!phone?.trim()) return undefined;
  const normalized = phone.replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : undefined;
}

export function toEmailHref(email?: string | null): string | undefined {
  if (!email?.trim()) return undefined;
  return `mailto:${email.trim()}`;
}

export function useHospitalContact() {
  const { hospital, loading } = useHospitalSettings();

  return useMemo(
    () => ({
      hospitalName: hospital.hospitalName,
      address: hospital.address,
      contactEmail: hospital.contactEmail,
      contactPhone: hospital.contactPhone,
      logoUrl: resolveUploadUrl(hospital.logoUrl) ?? defaultLogo,
      phoneHref: toPhoneHref(hospital.contactPhone),
      emailHref: toEmailHref(hospital.contactEmail),
      loading,
    }),
    [hospital, loading],
  );
}
