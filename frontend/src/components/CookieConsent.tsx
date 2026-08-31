import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "lifeways_cookie_consent_v1";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const accept = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }, []);

  const essentialOnly = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "essential");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80 md:p-5"
    >
      <div className="container mx-auto flex max-w-4xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-muted-foreground">
          <p id="cookie-consent-title" className="font-medium text-foreground">
            Cookies &amp; privacy
          </p>
          <p id="cookie-consent-desc" className="mt-1">
            We use essential cookies to keep the site working. With your consent, we may use additional cookies to
            understand usage and improve accessibility for visitors in Pakistan and other countries. See our{" "}
            <Link to="/privacy" className="text-primary underline underline-offset-2">
              Privacy policy
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={essentialOnly}>
            Essential only
          </Button>
          <Button type="button" size="sm" onClick={accept}>
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}
