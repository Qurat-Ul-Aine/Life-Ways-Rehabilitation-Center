import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ImagePlus, Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { galleryAdminService, GALLERY_CATEGORIES, type AdminGalleryImage, type GalleryCategory } from "@/features/admin/services/galleryAdminService";

export default function AdminGalleryPage() {
  const [images, setImages] = useState<AdminGalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminGalleryImage | null>(null);
  const [altText, setAltText] = useState("");
  const [category, setCategory] = useState<GalleryCategory>("Environment");
  const [sortOrder, setSortOrder] = useState("0");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminGalleryImage | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingPublishedId, setUpdatingPublishedId] = useState<number | null>(null);

  const loadImages = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      setImages(await galleryAdminService.list());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load gallery images.";
      setPageError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadImages();
  }, [loadImages]);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(editing?.image_url ?? null);
    return undefined;
  }, [editing, selectedFile]);

  const resetForm = () => {
    setEditing(null);
    setAltText("");
    setCategory("Environment");
    setSortOrder("0");
    setSelectedFile(null);
  };

  const openAddForm = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEditForm = (image: AdminGalleryImage) => {
    setEditing(image);
    setAltText(image.alt_text);
    setCategory(image.category);
    setSortOrder(String(image.sort_order));
    setSelectedFile(null);
    setFormOpen(true);
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanAltText = altText.trim();
    const numericSortOrder = Number(sortOrder);
    if (!cleanAltText) {
      toast.error("Alt text is required.");
      return;
    }
    if (!Number.isInteger(numericSortOrder) || numericSortOrder < 0) {
      toast.error("Sort order must be a non-negative whole number.");
      return;
    }
    if (!editing && !selectedFile) {
      toast.error("Choose an image to upload.");
      return;
    }

    setSaving(true);
    try {
      const values = {
        alt_text: cleanAltText,
        category,
        sort_order: numericSortOrder,
        ...(selectedFile ? { image: selectedFile } : {}),
      };
      if (editing) {
        const result = await galleryAdminService.update(editing.id, values);
        setImages((current) => current.map((image) => image.id === result.item.id ? result.item : image));
        if (result.warning) toast.warning(result.warning);
        else toast.success("Gallery image updated.");
      } else {
        if (!selectedFile) throw new Error("Choose an image to upload.");
        await galleryAdminService.create({ ...values, image: selectedFile });
        toast.success("Gallery image added.");
      }
      setFormOpen(false);
      resetForm();
      await loadImages();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save gallery image.");
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (image: AdminGalleryImage, isPublished: boolean) => {
    setUpdatingPublishedId(image.id);
    try {
      const result = await galleryAdminService.update(image.id, { is_published: isPublished });
      setImages((current) => current.map((item) => item.id === result.item.id ? result.item : item));
      toast.success(isPublished ? "Image published." : "Image unpublished.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update publication status.");
    } finally {
      setUpdatingPublishedId(null);
    }
  };

  const deleteImage = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeletingId(target.id);
    try {
      await galleryAdminService.remove(target.id);
      setImages((current) => current.filter((image) => image.id !== target.id));
      setDeleteTarget(null);
      toast.success("Gallery image deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete gallery image.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="min-w-0 space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Gallery</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage the images shown on the public gallery page.</p>
        </div>
        <Button className="min-h-11 w-full sm:w-auto" onClick={openAddForm}>
          <Plus className="mr-2 h-4 w-4" />
          Add image
        </Button>
      </header>

      {pageError && (
        <Card role="alert" className="border-destructive/40">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-destructive">{pageError}</p>
            <Button className="min-h-11" variant="outline" onClick={() => void loadImages()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex min-h-40 items-center justify-center gap-2 text-muted-foreground" role="status">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading gallery…
        </div>
      ) : images.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center">
            <ImagePlus className="h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="text-muted-foreground">No gallery images yet. Add an image to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((image) => (
            <Card key={image.id} className="min-w-0 overflow-hidden">
              <img
                src={image.image_url}
                alt={image.alt_text}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full bg-muted object-cover"
              />
              <CardContent className="space-y-4 p-4">
                <div className="min-w-0">
                  <p className="break-words font-medium">{image.alt_text}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {image.category} · Order {image.sort_order}
                  </p>
                </div>
                <div className="flex min-h-11 items-center justify-between gap-3">
                  <Label htmlFor={`published-${image.id}`} className="cursor-pointer">
                    {image.is_published ? "Published" : "Unpublished"}
                  </Label>
                  <Switch
                    id={`published-${image.id}`}
                    checked={image.is_published}
                    disabled={updatingPublishedId === image.id}
                    onCheckedChange={(checked) => void togglePublished(image, checked)}
                    aria-label={`${image.is_published ? "Unpublish" : "Publish"} ${image.alt_text}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button className="min-h-11" variant="outline" onClick={() => openEditForm(image)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    className="min-h-11"
                    variant="destructive"
                    onClick={() => setDeleteTarget(image)}
                    disabled={deletingId === image.id}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit gallery image" : "Add gallery image"}</DialogTitle>
            <DialogDescription>
              Upload a JPEG, PNG, or WebP image up to 5 MB.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(event) => void submitForm(event)}>
            <div className="space-y-2">
              <Label htmlFor="gallery-image-file">Image</Label>
              <Input
                id="gallery-image-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required={!editing}
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                className="min-h-11"
              />
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Selected gallery preview"
                  className="max-h-56 w-full rounded-md bg-muted object-contain"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="gallery-alt-text">Alt text</Label>
              <Input
                id="gallery-alt-text"
                value={altText}
                onChange={(event) => setAltText(event.target.value)}
                maxLength={255}
                required
                className="min-h-11"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gallery-category">Category</Label>
                <select
                  id="gallery-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as GalleryCategory)}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-base"
                >
                  {GALLERY_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gallery-sort-order">Sort order</Label>
                <Input
                  id="gallery-sort-order"
                  type="number"
                  min={0}
                  step={1}
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  required
                  className="min-h-11"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? "Saving…" : editing ? "Save changes" : "Add image"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onConfirm={() => void deleteImage()}
        onCancel={() => setDeleteTarget(null)}
        title="Delete gallery image?"
        description="This removes the image from the gallery and deletes its Cloudinary file."
        confirmLabel={deletingId ? "Deleting…" : "Delete image"}
      />
    </main>
  );
}
