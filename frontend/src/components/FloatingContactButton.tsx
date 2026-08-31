import { MessageCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function FloatingContactButton() {
  const location = useLocation();
  const navigate = useNavigate();

  const isPublicPage =
    location.pathname === "/" ||
    location.pathname.startsWith("/about") ||
    location.pathname.startsWith("/services") ||
    location.pathname.startsWith("/doctors") ||
    location.pathname.startsWith("/team") ||
    location.pathname.startsWith("/gallery") ||
    location.pathname.startsWith("/testimonials");

  if (!isPublicPage) return null;

  const handleClick = () => {
    if (location.pathname === "/") {
      document.getElementById("contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    navigate("/#contact");
    window.setTimeout(() => {
      document.getElementById("contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Contact us"
      className={cn(
        "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full",
        "bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      <MessageCircle className="h-6 w-6" aria-hidden />
    </button>
  );
}
