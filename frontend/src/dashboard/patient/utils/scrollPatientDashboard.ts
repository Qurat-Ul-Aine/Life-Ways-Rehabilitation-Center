/** Scroll a section into view inside the patient dashboard main panel (not document). */
export function scrollPatientDashboardTo(elementId: string, offsetPx = 20) {
  const container = document.getElementById("patient-dashboard-main");
  const target = document.getElementById(elementId);
  if (!container || !target) return;

  const containerTop = container.getBoundingClientRect().top;
  const targetTop = target.getBoundingClientRect().top;
  const nextScrollTop = container.scrollTop + (targetTop - containerTop) - offsetPx;

  container.scrollTo({
    top: Math.max(0, nextScrollTop),
    behavior: "smooth",
  });
}
