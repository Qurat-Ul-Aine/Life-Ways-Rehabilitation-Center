import { useEffect } from "react";
import { useHospitalContact } from "@/features/admin/hooks/useHospitalContact";

/** JSON-LD for search engines — uses hospital settings and VITE_SITE_URL when available */
export default function MedicalOrganizationJsonLd() {
  const { hospitalName, contactEmail, address, logoUrl } = useHospitalContact();

  useEffect(() => {
    const base = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, "");
    const data: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "MedicalOrganization",
      name: hospitalName,
      url: base,
      logo: logoUrl.startsWith("http") ? logoUrl : `${base}/favicon.svg`,
      areaServed: [
        { "@type": "Country", name: "Pakistan" },
        { "@type": "Place", name: "International patients" },
      ],
      medicalSpecialty: [
        "https://schema.org/Physiotherapy",
        "https://schema.org/Psychiatric",
        "https://schema.org/AddictionTreatment",
      ],
    };

    if (contactEmail) {
      data.email = contactEmail;
    }

    if (address) {
      data.address = {
        "@type": "PostalAddress",
        streetAddress: address,
        addressLocality: "Islamabad",
        addressCountry: "PK",
      };
    }

    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-lifeways-ld", "medical-org");
    el.textContent = JSON.stringify(data);
    document.head.appendChild(el);
    return () => {
      el.remove();
    };
  }, [hospitalName, contactEmail, address, logoUrl]);

  return null;
}
