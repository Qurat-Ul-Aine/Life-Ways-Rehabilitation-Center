const prisma = require("../lib/prisma");
const cloudinary = require("../lib/cloudinaryConfig");

const CATEGORIES = ["Environment", "Therapy", "Facilities", "Activities"];
const MAX_ALT_TEXT_LENGTH = 255;

function publicImage(image) {
  return {
    id: image.id,
    src: image.image_url,
    alt: image.alt_text,
    category: image.category,
  };
}

function adminImage(image) {
  return {
    id: image.id,
    image_url: image.image_url,
    alt_text: image.alt_text,
    category: image.category,
    sort_order: image.sort_order,
    is_published: image.is_published,
    created_at: image.created_at,
    updated_at: image.updated_at,
  };
}

function sanitizeText(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function validateAltText(value) {
  const altText = sanitizeText(value);
  if (!altText) throw Object.assign(new Error("alt_text is required."), { statusCode: 400 });
  if (altText.length > MAX_ALT_TEXT_LENGTH) {
    throw Object.assign(new Error(`alt_text must be ${MAX_ALT_TEXT_LENGTH} characters or fewer.`), {
      statusCode: 400,
    });
  }
  return altText;
}

function validateCategory(value) {
  const category = sanitizeText(value);
  if (!CATEGORIES.includes(category)) {
    throw Object.assign(
      new Error(`category must be one of: ${CATEGORIES.join(", ")}.`),
      { statusCode: 400 },
    );
  }
  return category;
}

function validateSortOrder(value) {
  const sortOrder = Number(value);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 2147483647) {
    throw Object.assign(new Error("sort_order must be a non-negative integer."), {
      statusCode: 400,
    });
  }
  return sortOrder;
}

function validatePublished(value) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  throw Object.assign(new Error("is_published must be true or false."), { statusCode: 400 });
}

async function removeCloudinaryAsset(publicId) {
  if (!publicId) return;
  const result = await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error("Cloudinary did not confirm image deletion.");
  }
}

async function cleanupUploadedFile(file) {
  if (!file?.filename) return;
  try {
    await removeCloudinaryAsset(file.filename);
  } catch (error) {
    console.error("[gallery] Uploaded image cleanup failed:", { code: error.code });
  }
}

function sendError(res, error, fallbackMessage) {
  if (error?.statusCode === 400) {
    return res.status(400).json({ success: false, message: error.message });
  }
  console.error("[gallery] Request failed:", { code: error?.code });
  return res.status(500).json({ success: false, message: fallbackMessage });
}

async function listPublished(_req, res) {
  try {
    const images = await prisma.gallery_images.findMany({
      where: { is_published: true },
      orderBy: [{ sort_order: "asc" }, { id: "desc" }],
    });
    return res.json({ items: images.map(publicImage) });
  } catch (error) {
    return sendError(res, error, "Failed to load gallery images.");
  }
}

async function listAdmin(_req, res) {
  try {
    const images = await prisma.gallery_images.findMany({
      orderBy: [{ sort_order: "asc" }, { id: "desc" }],
    });
    return res.json({ items: images.map(adminImage) });
  } catch (error) {
    return sendError(res, error, "Failed to load gallery images.");
  }
}

async function create(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "An image file is required." });
  }

  try {
    const image = await prisma.gallery_images.create({
      data: {
        image_url: req.file.path,
        public_id: req.file.filename,
        alt_text: validateAltText(req.body.alt_text),
        category: validateCategory(req.body.category),
        sort_order: validateSortOrder(req.body.sort_order),
      },
    });
    return res.status(201).json({ success: true, item: adminImage(image) });
  } catch (error) {
    await cleanupUploadedFile(req.file);
    return sendError(res, error, "Failed to add gallery image.");
  }
}

function parseId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw Object.assign(new Error("Invalid gallery image ID."), { statusCode: 400 });
  }
  return id;
}

async function update(req, res) {
  let uploadedFile = req.file;
  try {
    const id = parseId(req.params.id);
    const existing = await prisma.gallery_images.findUnique({ where: { id } });
    if (!existing) {
      await cleanupUploadedFile(uploadedFile);
      return res.status(404).json({ success: false, message: "Gallery image not found." });
    }

    const data = {};
    if (req.body.alt_text !== undefined) data.alt_text = validateAltText(req.body.alt_text);
    if (req.body.category !== undefined) data.category = validateCategory(req.body.category);
    if (req.body.sort_order !== undefined) data.sort_order = validateSortOrder(req.body.sort_order);
    if (req.body.is_published !== undefined) {
      data.is_published = validatePublished(req.body.is_published);
    }
    if (uploadedFile) {
      data.image_url = uploadedFile.path;
      data.public_id = uploadedFile.filename;
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, message: "No gallery fields were provided." });
    }

    const image = await prisma.gallery_images.update({ where: { id }, data });
    if (uploadedFile && existing.public_id) {
      try {
        await removeCloudinaryAsset(existing.public_id);
      } catch (error) {
        console.error("[gallery] Previous image cleanup failed:", { code: error.code });
        return res.json({
          success: true,
          item: adminImage(image),
          warning: "The image was replaced, but the previous Cloudinary asset could not be removed.",
        });
      }
    }
    uploadedFile = null;
    return res.json({ success: true, item: adminImage(image) });
  } catch (error) {
    await cleanupUploadedFile(uploadedFile);
    if (error?.statusCode === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error?.code === "P2025") {
      return res.status(404).json({ success: false, message: "Gallery image not found." });
    }
    return sendError(res, error, "Failed to update gallery image.");
  }
}

async function remove(req, res) {
  try {
    const id = parseId(req.params.id);
    const image = await prisma.gallery_images.findUnique({ where: { id } });
    if (!image) {
      return res.status(404).json({ success: false, message: "Gallery image not found." });
    }

    try {
      await removeCloudinaryAsset(image.public_id);
    } catch (error) {
      console.error("[gallery] Cloudinary deletion failed:", { code: error.code });
      return res.status(502).json({
        success: false,
        message: "Could not delete the image from Cloudinary. The gallery record was not removed.",
      });
    }

    try {
      await prisma.gallery_images.delete({ where: { id } });
    } catch (error) {
      console.error("[gallery] Database deletion failed after Cloudinary deletion:", {
        code: error.code,
      });
      return res.status(500).json({
        success: false,
        message: "The image file was removed, but its gallery record could not be deleted. Retry the delete.",
      });
    }

    return res.json({ success: true });
  } catch (error) {
    if (error?.statusCode === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }
    return sendError(res, error, "Failed to delete gallery image.");
  }
}

module.exports = { listPublished, listAdmin, create, update, remove };
