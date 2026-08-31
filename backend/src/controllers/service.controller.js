const prisma = require("../lib/prisma");

function mapService(s) {
  return {
    id: s.id,
    slug: s.slug,
    title: s.title,
    description: s.description ?? null,
    isActive: s.is_active,
  };
}

// GET /services
async function list(req, res) {
  try {
    const where = { is_active: true };
    if (req.query.includeInactive === "true" && req.user?.role === "ADMIN") {
      delete where.is_active;
    }

    const services = await prisma.rehabilitation_services.findMany({
      where,
      orderBy: { title: "asc" },
    });

    return res.json({ items: services.map(mapService), total: services.length });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

// GET /services/:slugOrId
async function getBySlugOrId(req, res) {
  try {
    const key = String(req.params.slugOrId ?? "").trim();
    const service = await prisma.rehabilitation_services.findFirst({
      where: {
        OR: [{ slug: key }, { id: key }],
        is_active: true,
      },
    });

    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    return res.json(mapService(service));
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = { list, getBySlugOrId };
