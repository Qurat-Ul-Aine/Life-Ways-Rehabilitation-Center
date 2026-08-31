import { useHospitalContact } from "@/features/admin/hooks/useHospitalContact";

export default function PrivacyPolicy() {
  const { hospitalName, contactEmail, address, emailHref } = useHospitalContact();

  return (
    <article className="mx-auto max-w-3xl flex-1 px-4 py-14 prose prose-neutral dark:prose-invert">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Privacy policy</h1>
      <p className="lead text-muted-foreground">
        {hospitalName} (“Life Ways”, “we”) serves people in Pakistan and internationally. This policy
        explains how we handle information when you use our website and digital services.
      </p>

      <h2>Who this applies to</h2>
      <p>
        Visitors, prospective patients, patients, family members, and authorised staff who use lifewaysrehab.com (or
        related domains we operate), including contact forms, screening tools, and authenticated dashboards.
      </p>

      <h2>Information we may collect</h2>
      <ul>
        <li>
          <strong>Account &amp; contact data:</strong> name, email, phone, role, and authentication details you provide.
        </li>
        <li>
          <strong>Health-related data you choose to submit:</strong> information you enter in forms, messages, or uploads
          intended for care or intake. Treat this as sensitive — only share what is necessary.
        </li>
        <li>
          <strong>Technical data:</strong> IP address, browser type, general device information, and logs needed for
          security and reliability.
        </li>
        <li>
          <strong>Cookies &amp; similar tech:</strong> we may use essential cookies for sign-in and preferences, and —
          only with your consent — analytics to improve the site.
        </li>
      </ul>

      <h2>Pakistan and overseas visitors</h2>
      <p>
        Our facilities are in Pakistan. If you access the site from another country, your information may be processed
        in Pakistan and wherever our service providers operate. We use appropriate safeguards such as access controls and
        contractual protections with vendors, consistent with applicable laws.
      </p>

      <h2>How we use information</h2>
      <ul>
        <li>Providing services you request (appointments, enquiries, care coordination).</li>
        <li>Operating and securing our systems; detecting abuse and fraud.</li>
        <li>Complying with law and responding to lawful requests.</li>
        <li>Improving usability and accessibility when you have agreed to non-essential analytics.</li>
      </ul>

      <h2>Retention</h2>
      <p>
        We retain information only as long as needed for the purposes above, legal obligations, and clinical record
        policies where applicable.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>
          <strong>Access &amp; corrections:</strong> contact us using the details below — we will verify your identity
          before sharing or changing records.
        </li>
        <li>
          <strong>Marketing:</strong> where permitted, you may opt out of promotional communications.
        </li>
        <li>
          <strong>Cookies:</strong> adjust choices via the cookie banner or your browser settings.
        </li>
      </ul>

      <h2>Children</h2>
      <p>
        If you are under 18, a parent or guardian should contact us on your behalf unless local law allows independent
        consent for specific services.
      </p>

      <h2>Third parties</h2>
      <p>
        We may use trusted providers (e.g. hosting, email, analytics if consented). They may only process data under our
        instructions or as the law requires.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions:{" "}
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
