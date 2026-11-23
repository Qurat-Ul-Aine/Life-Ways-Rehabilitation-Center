import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { MOBILE_BOTTOM_NAV } from "../data/nav";

const isNavActive = (pathname: string, path: string) =>
  pathname === path || (path !== "/doctor/dashboard" && pathname.startsWith(`${path}/`));

export default function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Main navigation"
    >
      <ul className="flex items-stretch justify-around px-1 py-1">
        {MOBILE_BOTTOM_NAV.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item.path);
          return (
            <li key={item.id} className="max-w-[5.5rem] flex-1">
              <button
                type="button"
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
                    active ? "bg-primary/10" : "bg-transparent",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                </span>
                <span className="w-full truncate text-center leading-tight">
                  {item.id === "dashboard" ? "Home" : item.label.split(" ")[0]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
