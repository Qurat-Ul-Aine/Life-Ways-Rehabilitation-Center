import { useEffect, useRef, useState } from "react";
import { Upload, FileVideo, FileText, ImageIcon, Trash2, Play, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { therapyService } from "../services/therapyService";
import type { TherapyExercise, TherapyFile } from "../therapy.types";

type Props = {
  planId: string;
  canUpload: boolean;
  exercises?: TherapyExercise[];
  onExercisesChange?: () => void;
};

export default function ExerciseUploader({
  planId,
  canUpload,
  exercises = [],
  onExercisesChange,
}: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<TherapyFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [addingManual, setAddingManual] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refetch = () =>
    therapyService.listFiles(planId).then(setItems).catch(() => setItems([]));

  useEffect(() => {
    void refetch();
  }, [planId]);

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      await therapyService.uploadFile(planId, file, {
        uploadedBy: user?.name ?? "Unknown",
        title: title.trim() || file.name,
      });
      toast.success("Exercise file uploaded.");
      setTitle("");
      await refetch();
      onExercisesChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onAddManual = async () => {
    if (!manualTitle.trim()) {
      toast.error("Enter an exercise title.");
      return;
    }
    setAddingManual(true);
    try {
      await therapyService.createExercise(planId, {
        title: manualTitle.trim(),
        description: manualDescription.trim() || undefined,
      });
      toast.success("Exercise added.");
      setManualTitle("");
      setManualDescription("");
      onExercisesChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add exercise.");
    } finally {
      setAddingManual(false);
    }
  };

  const onDeleteFile = async (fileId: string) => {
    setDeletingId(fileId);
    try {
      await therapyService.deleteFile(planId, fileId);
      toast.success("File deleted.");
      await refetch();
      onExercisesChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  };

  const onDeleteExercise = async (exerciseId: string) => {
    setDeletingId(exerciseId);
    try {
      await therapyService.deleteExercise(planId, exerciseId);
      toast.success("Exercise removed.");
      onExercisesChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  };

  const textExercises = exercises.filter((ex) => !ex.media_url);

  return (
    <div className="space-y-6">
      {canUpload ? (
        <>
          <div className="rounded-lg border border-dashed p-4 space-y-3">
            <p className="text-sm font-medium">Upload exercise video or document</p>
            <p className="text-xs text-muted-foreground">
              MP4, WebM, MOV, PDF, or images — max 250 MB
            </p>
            <div>
              <Label htmlFor="exercise-title">Title (optional)</Label>
              <Input
                id="exercise-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Shoulder mobility routine"
              />
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="video/*,image/*,.pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onUpload(f);
              }}
            />
            <Button onClick={() => inputRef.current?.click()} disabled={uploading} size="sm">
              <Upload className="h-4 w-4 mr-1" />
              {uploading ? "Uploading…" : "Choose file & upload"}
            </Button>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium">Add text-only exercise</p>
            <div>
              <Label htmlFor="manual-title">Title</Label>
              <Input
                id="manual-title"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="e.g. Daily breathing exercise"
              />
            </div>
            <div>
              <Label htmlFor="manual-desc">Instructions (optional)</Label>
              <Textarea
                id="manual-desc"
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                rows={3}
                placeholder="Steps or notes for the patient…"
              />
            </div>
            <Button size="sm" disabled={addingManual} onClick={() => void onAddManual()}>
              <Plus className="h-4 w-4 mr-1" />
              {addingManual ? "Adding…" : "Add exercise"}
            </Button>
          </div>
        </>
      ) : null}

      {textExercises.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Prescribed exercises</p>
          {textExercises.map((ex) => (
            <div key={ex.id} className="flex flex-wrap items-start justify-between gap-2 rounded-md border p-3">
              <div>
                <p className="font-medium">{ex.title ?? ex.name ?? "Exercise"}</p>
                {ex.description ? (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{ex.description}</p>
                ) : null}
              </div>
              {canUpload ? (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={deletingId === ex.id}
                  onClick={() => void onDeleteExercise(ex.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium">Uploaded files ({items.length})</p>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No video or document files yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((f) => {
              const Icon =
                f.fileType === "video" ? FileVideo : f.fileType === "image" ? ImageIcon : FileText;
              return (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{f.title ?? f.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.fileType} · {f.uploadedBy}
                        {f.sizeKb ? ` · ${f.sizeKb} KB` : ""} ·{" "}
                        {new Date(f.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void therapyService.openFile(planId, f).catch((err) => {
                          toast.error(err instanceof Error ? err.message : "Could not open file.");
                        });
                      }}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Open
                    </Button>
                    {canUpload ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deletingId === f.id}
                        onClick={() => void onDeleteFile(f.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
