const prisma = require("../lib/prisma");

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parsePagination(query) {
  const page = Math.max(1, Number(query?.page) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(query?.limit) || DEFAULT_PAGE_SIZE));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function buildPaginatedResponse(items, total, page, limit) {
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasMore: page * limit < total,
    },
  };
}

async function mine(req, res) {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { type } = req.query ?? {};
    const where = { user_id: req.user.id };
    if (type && String(type).toLowerCase() !== "all") {
      where.type = String(type).toUpperCase();
    }

    const [notifications, total] = await Promise.all([
      prisma.notifications.findMany({
        where,
        orderBy: { sent_date: "desc" },
        skip,
        take: limit,
      }),
      prisma.notifications.count({ where }),
    ]);

    return res.json(buildPaginatedResponse(notifications, total, page, limit));
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

async function listAll(req, res) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [notifications, total] = await Promise.all([
      prisma.notifications.findMany({
        orderBy: { sent_date: "desc" },
        skip,
        take: limit,
        include: {
          users: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.notifications.count(),
    ]);
    return res.json(buildPaginatedResponse(notifications, total, page, limit));
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

async function adminStats(req, res) {
  try {
    const [total, unread, sent, failed, pending] = await Promise.all([
      prisma.notifications.count(),
      prisma.notifications.count({
        where: { OR: [{ status: { not: "read" } }, { is_read: false }, { is_read: null }] },
      }),
      prisma.notifications.count({ where: { status: "sent" } }),
      prisma.notifications.count({ where: { status: "failed" } }),
      prisma.notifications.count({ where: { status: "pending" } }),
    ]);
    return res.json({ total, unread, sent, failed, pending });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

async function adminHistory(req, res) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { status, type } = req.query ?? {};
    const where = {};
    if (status) where.status = String(status);
    if (type) where.type = String(type).toUpperCase();

    const [notifications, total] = await Promise.all([
      prisma.notifications.findMany({
        where,
        orderBy: { sent_date: "desc" },
        skip,
        take: limit,
        include: {
          users: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.notifications.count({ where }),
    ]);
    return res.json(buildPaginatedResponse(notifications, total, page, limit));
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

async function create(req, res) {
  try {
    const notification = await prisma.notifications.create({
      data: {
        user_id: req.body?.user_id || req.body?.userId || null,
        type: req.body?.type || null,
        title: req.body?.title ? String(req.body.title).slice(0, 200) : null,
        message: String(req.body?.message || req.body?.body || ""),
        status: String(req.body?.status || "unread"),
        sent_date: new Date(),
        created_at: new Date(),
      },
    });
    return res.status(201).json({ id: notification.id });
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
}

async function markRead(req, res) {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  try {
    const id = String(req.params.id);

    const existing = await prisma.notifications.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Notification not found" });

    const isAdmin = req.user.role === "ADMIN";
    if (!isAdmin && existing.user_id !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const notification = await prisma.notifications.update({
      where: { id },
      data: { status: "read", is_read: true },
    });

    return res.json({ ok: true, id: notification.id });
  } catch (e) {
    if (e.code === "P2025") {
      return res.status(404).json({ message: "Notification not found" });
    }
    return res.status(500).json({ message: e.message });
  }
}

async function deleteOne(req, res) {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  try {
    const id = String(req.params.id);

    const existing = await prisma.notifications.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Notification not found" });

    const isAdmin = req.user.role === "ADMIN";
    if (!isAdmin && existing.user_id !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await prisma.notifications.delete({ where: { id } });
    return res.json({ ok: true, id });
  } catch (e) {
    if (e.code === "P2025") {
      return res.status(404).json({ message: "Notification not found" });
    }
    return res.status(500).json({ message: e.message });
  }
}

async function markAllRead(req, res) {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  try {
    await prisma.notifications.updateMany({
      where: { user_id: req.user.id },
      data: { status: "read", is_read: true },
    });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

async function markAllReadAdmin(req, res) {
  try {
    const result = await prisma.notifications.updateMany({
      where: {
        OR: [{ status: { not: "read" } }, { is_read: false }, { is_read: null }],
      },
      data: { status: "read", is_read: true },
    });
    return res.json({ ok: true, count: result.count });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

async function unreadCount(req, res) {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  try {
    const count = await prisma.notifications.count({
      where: {
        user_id: req.user.id,
        OR: [{ status: { not: "read" } }, { is_read: false }],
      },
    });
    return res.json({ count });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

module.exports = {
  mine,
  listAll,
  adminStats,
  adminHistory,
  create,
  markRead,
  deleteOne,
  markAllRead,
  markAllReadAdmin,
  unreadCount,
};
