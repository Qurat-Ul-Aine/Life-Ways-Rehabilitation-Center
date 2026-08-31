export default function AccessibilityStatement() {
  return (
    <article className="mx-auto max-w-3xl flex-1 px-4 py-14 prose prose-neutral dark:prose-invert">
      <h1 className="font-heading text-3xl font-bold tracking-tight">Accessibility statement</h1>
      <p className="lead text-muted-foreground">
        Life Ways Rehabilitation Center is committed to making our website usable for people in Pakistan and abroad,
        including visitors who rely on assistive technologies.
      </p>

      <h2>Our goal</h2>
      <p>
        We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA for key patient and public journeys
        (navigation, forms, authentication, and dashboards), and to improve continuously.
      </p>

      <h2>What we are working on</h2>
      <ul>
        <li>Keyboard navigation and visible focus across interactive components.</li>
        <li>Clear labels, instructions, and error messages on forms.</li>
        <li>Sufficient colour contrast and responsive layouts for different screen sizes.</li>
        <li>Meaningful page structure and descriptive link text.</li>
      </ul>

      <h2>Known limitations</h2>
      <p>
        Some legacy or third-party content may not yet meet every success criterion. If you encounter a barrier, please
        tell us — we will prioritise fixes on high-impact flows such as booking, screening, and portal access.
      </p>

      <h2>Request accommodations</h2>
      <p>
        Email{" "}
        <a href="mailto:accessibility@lifewaysrehab.com">accessibility@lifewaysrehab.com</a>
        {" "}or{" "}
        <a href="mailto:info@lifewaysrehab.com">info@lifewaysrehab.com</a>
        . Include the page URL, your browser or assistive technology, and what you were trying to do. We typically
        respond within several business days.
      </p>

      <p className="text-sm text-muted-foreground">Last updated: February 3, 2026</p>
    </article>
  );
}
