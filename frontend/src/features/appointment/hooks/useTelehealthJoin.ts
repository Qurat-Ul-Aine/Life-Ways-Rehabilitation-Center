import { useEffect, useState } from "react";
import {
  canJoinTelehealth,
  telehealthJoinMessage,
} from "../utils/appointmentDisplay";
import type { TelehealthJoinable } from "../utils/appointmentDisplay";

export function useTelehealthJoin(appointment: TelehealthJoinable | null | undefined) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (!appointment || appointment.mode !== "online") {
    return { canJoin: false, message: null as string | null };
  }

  return {
    canJoin: canJoinTelehealth(appointment, now),
    message: telehealthJoinMessage(appointment, now),
  };
}
