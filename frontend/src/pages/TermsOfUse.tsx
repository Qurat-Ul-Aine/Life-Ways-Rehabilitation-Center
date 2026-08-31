import { useHospitalContact } from "@/features/admin/hooks/useHospitalContact";

export default function TermsOfUse() {
  const { hospitalName, contactEmail, address, emailHref } = useHospitalContact();

  return (
    <article className="mx-auto max-w-3xl flex-1 px-4 py-14 prose prose-neutral dark:prose-invert">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Terms of use</h1>
      <p className="lead text-muted-foreground">
        These terms govern use of the {hospitalName} website and related digital experiences for users
        worldwide, including Pakistan.
      </p>

      <h2>Not emergency care</h2>
      <p>
        This website does not provide emergency services. If you are in immediate danger or a medical emergency,
        contact local emergency services right away.
      </p>

      <h2>Medical information</h2>
      <p>
        Educational content on this site is general in nature and not a substitute for personalised medical advice,
        diagnosis, or treatment. Always consult a qualified clinician regarding your health.
      </p>

      <h2>Accounts &amp; eligibility</h2>
      <p>
        You agree to provide accurate registration information and keep credentials confidential. We may suspend access
        when needed to protect patients, staff, or systems.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>No unlawful, harassing, or harmful activity.</li>
        <li>No probing or attacking our systems.</li>
        <li>No misuse of another person’s identity or health information.</li>
      </ul>

      <h2>International users</h2>
      <p>
        If you browse from outside Pakistan, you are responsible for compliance with your local laws. Pakistan law may
        apply to disputes arising from our operations here; nothing in this summary limits non-waivable consumer rights
        in your country.
      </p>

      <h2>Intellectual property</h2>
      <p>
        Trademarks, logos, and site content are owned by Life Ways or licensors. Do not copy or redistribute without
        permission except as allowed by law.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by applicable law, Life Ways is not liable for indirect or consequential damages
        arising from use of the site. Some jurisdictions do not allow certain limitations; in those cases our liability is
        limited to the maximum permitted.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. Continued use after changes constitutes acceptance of the revised terms.</p>

      <h2>Contact</h2>
      <p>
        {emailHref ? (
          <a href={emailHref}>{contactEmail}</a>
        ) : (
          contactEmail
        )}
        <br />
        {hospitalName}
        {address ? ` · ${address}` : " · Islamabad, Pakistan"}
      </p>

      <p className="text-sm text-muted-foreground">Last updated: February 3, 2026</p>
    </article>
  );
}
