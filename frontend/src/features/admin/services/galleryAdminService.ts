import axios from "axios";
import api from "@/lib/api";

export const GALLERY_CATEGORIES = ["Environment", "Therapy", "Facilities", "Activities"] as const;
export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

export interface AdminGalleryImage {
  id: number;
  image_url: string;
  alt_text: string;
  category: GalleryCategory;
  sort_order: number;
  is_published: boolean;
}

export interface GalleryImageUpdate {
  alt_text?: string;
  category?: GalleryCategory;
  sort_order?: number;
  is_published?: boolean;
  image?: File;
}

export interface GalleryImageUpdateResult {
  item: AdminGalleryImage;
  warning?: string;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Gallery request failed. Please try again.";
}

function toFormData(values: GalleryImageUpdate): FormData {
  const formData = new FormData();
  if (values.alt_text !== undefined) formData.append("alt_text", values.alt_text);
  if (values.category !== undefined) formData.append("category", values.category);
  if (values.sort_order !== undefined) formData.append("sort_order", String(values.sort_order));
  if (values.is_published !== undefined) formData.append("is_published", String(values.is_published));
  if (values.image) formData.append("image", values.image);
  return formData;
}

export const galleryAdminService = {
  async list(): Promise<AdminGalleryImage[]> {
    try {
      const { data } = await api.get<{ items: AdminGalleryImage[] }>("/admin/gallery");
      return data.items;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  async create(values: Required<Pick<GalleryImageUpdate, "alt_text" | "category" | "sort_order" | "image">>): Promise<AdminGalleryImage> {
    try {
      const { data } = await api.post<{ item: AdminGalleryImage }>("/admin/gallery", toFormData(values));
      return data.item;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  async update(id: number, values: GalleryImageUpdate): Promise<GalleryImageUpdateResult> {
    try {
      const { data } = values.image
        ? await api.put<GalleryImageUpdateResult>(`/admin/gallery/${id}`, toFormData(values))
        : await api.put<GalleryImageUpdateResult>(`/admin/gallery/${id}`, values);
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  async remove(id: number): Promise<void> {
    try {
      await api.delete(`/admin/gallery/${id}`);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};
