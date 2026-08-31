import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { X, FileText, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { createWaitingSocket } from "@/lib/telehealthSocket";
import { toast } from "sonner";
import JitsiMeetEmbed from "../components/JitsiMeetEmbed";
import NotesPanel from "../components/NotesPanel";

export default function TelehealthSessionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user } = useAuth();

  const [notesOpen, setNotesOpen] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showUnsavedNotesDialog, setShowUnsavedNotesDialog] = useState(false);
  const [checkingNotes, setCheckingNotes] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState(location.state?.meetingUrl || "");
  const [loading, setLoading] = useState(!location.state?.meetingUrl);
  const socketRef = useRef<ReturnType<typeof createWaitingSocket> | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const isDoctor = user?.role === "doctor";

  useEffect(() => {
    if (!meetingUrl && appointmentId) {
      setLoading(true);
      // Fetch the telehealth session for this appointment
      api.get(`/appointments/${appointmentId}`)
        .then(res => {
          const url = res.data?.meetingUrl || res.data?.meeting_url || res.data?.jitsiUrl;
          if (url) {
            setMeetingUrl(url);
          }
        })
        .catch(err => {
          console.error("Failed to fetch meeting URL:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [appointmentId, meetingUrl]);

  // Connect to waiting room socket (session lifecycle events)
  useEffect(() => {
    if (!appointmentId || !user) return;

    const socket = createWaitingSocket();
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-waiting-room", {
        appointmentId,
        userId: user.id,
        role: user.role,
      });
    });

    socket.on("action-denied", (data: { message?: string }) => {
      toast.error(data?.message ?? "Action not allowed");
    });

    // Patient listens — when doctor ends, show feedback
    if (!isDoctor) {
      socket.on("session-ended", () => {
        toast.info("Doctor has ended the session");
        setShowFeedback(true);
      });
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [appointmentId, user, isDoctor]);

  const finishEndSession = () => {
    setShowEndDialog(false);
    setShowUnsavedNotesDialog(false);

    if (isDoctor) {
      socketRef.current?.emit("session-ended", { appointmentId });
      setTimeout(() => {
        navigate("/doctor/dashboard");
        toast.success("Session ended", {
          description: "Would you like to schedule a follow-up?",
          action: {
            label: "Schedule Follow-up",
            onClick: () => {
              api
                .get(`/appointments/${appointmentId}`)
                .then((res) => {
                  const patientId = res.data?.patientId;
                  if (patientId) {
                    navigate(`/doctor/appointments/new?patientId=${patientId}`);
                  } else {
                    navigate("/doctor/appointments");
                  }
                })
                .catch(() => {
                  navigate("/doctor/appointments");
                });
            },
          },
          duration: 8000,
        });
      }, 500);
      return;
    }

    navigate("/patient/dashboard/appointments");
  };

  const handleConfirmEnd = async () => {
    if (!isDoctor) {
      finishEndSession();
      return;
    }

    if (!appointmentId) {
      finishEndSession();
      return;
    }

    setCheckingNotes(true);
    try {
      const res = await api.get<{ session?: { id?: string } | null }>(
        `/appointments/${appointmentId}/telehealth/notes`,
      );
      const hasSavedNotes = Boolean(res.data?.session?.id);
      if (!hasSavedNotes) {
        setShowEndDialog(false);
        setShowUnsavedNotesDialog(true);
        return;
      }
    } catch {
      setShowEndDialog(false);
      setShowUnsavedNotesDialog(true);
      return;
    } finally {
      setCheckingNotes(false);
    }

    finishEndSession();
  };

  const handleAddNotesBeforeEnd = () => {
    setShowUnsavedNotesDialog(false);
    setNotesOpen(true);
    toast.info("Add session notes before ending the call.");
  };

  const handleFeedbackSubmit = async () => {
    setSubmittingFeedback(true);
    try {
      await api.post(`/appointments/${appointmentId}/feedback`, {
        rating,
        comment,
      });
      toast.success("Thank you for your feedback!");
      setShowFeedback(false);
      navigate("/patient/dashboard/appointments");
    } catch {
      toast.error("Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleSkipFeedback = () => {
    setShowFeedback(false);
    navigate("/patient/dashboard/appointments");
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <p className="text-lg font-semibold">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!meetingUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-muted">
        <div className="text-center">
          <p className="text-lg font-semibold">No meeting URL provided</p>
          <Button
            className="mt-4"
            onClick={() => isDoctor ? navigate("/doctor/dashboard") : navigate("/patient/dashboard")}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      <JitsiMeetEmbed
        meetingUrl={meetingUrl}
        displayName={user?.name || "User"}
        onSessionEnd={() => setShowEndDialog(true)}
      />

      <div className="absolute top-4 right-4 z-[60] flex items-center gap-2">
        {isDoctor && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setNotesOpen((open) => !open)}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            {notesOpen ? "Hide Notes" : "Session Notes"}
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowEndDialog(true)}
          className="gap-2"
        >
          <X className="h-4 w-4" />
          {isDoctor ? "End Session" : "Leave Session"}
        </Button>
      </div>

      {isDoctor && notesOpen && appointmentId && (
        <div className="absolute inset-y-0 right-0 z-[55] flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl">
          <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
            <h2 className="text-lg font-semibold">Session Notes</h2>
            <Button variant="ghost" size="sm" onClick={() => setNotesOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <NotesPanel appointmentId={appointmentId} />
          </div>
        </div>
      )}

      {/* End Session Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isDoctor ? "End Session?" : "Leave Session?"}
            </DialogTitle>
            <DialogDescription>
              {isDoctor
                ? "This will end the session for everyone including the patient."
                : "Are you sure you want to leave this session?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEndDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleConfirmEnd()} disabled={checkingNotes}>
              {checkingNotes
                ? "Checking…"
                : isDoctor
                  ? "End Session"
                  : "Leave Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved session notes reminder (doctor only) */}
      <Dialog open={showUnsavedNotesDialog} onOpenChange={setShowUnsavedNotesDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Session notes not saved yet</DialogTitle>
            <DialogDescription>
              These notes will not appear on the patient&apos;s Therapy Plan until you save them.
              Do you want to add them now?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => void finishEndSession()}>
              End without notes
            </Button>
            <Button onClick={handleAddNotesBeforeEnd}>
              <FileText className="h-4 w-4 mr-2" />
              Add notes now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Patient Feedback Dialog */}
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>How was your session?</DialogTitle>
            <DialogDescription>
              Please rate your telehealth session and provide any additional feedback.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Star Rating */}
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Any additional feedback?</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts about the session..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleSkipFeedback}>
              Skip
            </Button>
            <Button
              onClick={handleFeedbackSubmit}
              disabled={submittingFeedback || rating === 0}
            >
              {submittingFeedback ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
