import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PanelAction } from "../data/panelMeta";

type Props = {
  action?: PanelAction;
};

export default function MobileFab({ action }: Props) {
  if (!action) return null;

  const Icon = action.icon ?? Plus;

  if (action.to) {
    return (
      <Button
        asChild
        size="icon"
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-40 h-12 w-12 rounded-full shadow-lg xl:hidden"
        aria-label={action.label}
      >
        <Link to={action.to}>
          <Icon className="h-5 w-5" />
        </Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="icon"
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-40 h-12 w-12 rounded-full shadow-lg xl:hidden"
      aria-label={action.label}
    >
      <Icon className="h-5 w-5" />
    </Button>
  );
}
