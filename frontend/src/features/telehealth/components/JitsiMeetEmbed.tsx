import { useEffect, useRef, memo } from "react";

type Props = {
  meetingUrl: string;
  displayName: string;
  onSessionEnd: () => void;
};

function JitsiMeetEmbed({ meetingUrl, displayName, onSessionEnd }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const onSessionEndRef = useRef(onSessionEnd);

  // Keep callback ref updated without triggering re-init
  useEffect(() => {
    onSessionEndRef.current = onSessionEnd;
  }, [onSessionEnd]);

  // Run ONLY ONCE on mount — empty dependency array
  useEffect(() => {
    if (initializedRef.current || !containerRef.current) return;
    initializedRef.current = true;

    const roomName = meetingUrl.split("/").pop();

    const existingScript = document.getElementById("jitsi-script");
    if (existingScript) {
      initJitsi(roomName);
      return;
    }

    const script = document.createElement("script");
    script.id = "jitsi-script";
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.onload = () => initJitsi(roomName);
    document.head.appendChild(script);

    function initJitsi(room: string | undefined) {
      const JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI;
      if (JitsiMeetExternalAPI && containerRef.current) {
        apiRef.current = new JitsiMeetExternalAPI("meet.jit.si", {
          roomName: room,
          parentNode: containerRef.current,
          userInfo: { displayName },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
          },
        });
        apiRef.current.addEventListener("readyToClose", () => {
          onSessionEndRef.current();
        });
      }
    }

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, []); // Empty array = runs once only

  return (
    <div
      ref={containerRef}
      id="jitsi-container"
      className="absolute inset-0 h-full w-full"
    />
  );
}

export default memo(JitsiMeetEmbed);
