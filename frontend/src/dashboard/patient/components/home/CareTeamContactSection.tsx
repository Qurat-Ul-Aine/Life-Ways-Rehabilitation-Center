import { HospitalContactDisplay } from "@/features/admin/components/HospitalContactDisplay";

export default function CareTeamContactSection() {
  return (
    <div
      id="care-team-contact"
      className="scroll-mt-4 rounded-xl border border-border bg-card p-4 md:p-5"
      aria-labelledby="care-team-contact-title"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Get In Touch</p>
      <h3 id="care-team-contact-title" className="mt-1 text-lg font-bold text-foreground">
        Contact Us
      </h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        Ready to start your recovery journey? Reach out to us for appointments, inquiries, or
        support.
      </p>

      <HospitalContactDisplay layout="grid" showHours className="mt-4" />
    </div>
  );
}
