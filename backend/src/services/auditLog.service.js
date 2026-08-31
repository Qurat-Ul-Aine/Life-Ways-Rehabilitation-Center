"use strict";

const prisma = require("../lib/prisma");

function mapActor(user) {
  if (!user) {
    return { actor_user_id: null, actor_name: "System", actor_role: "system" };
  }
  return {
    actor_user_id: user.id ?? null,
    actor_name: user.name ?? "Unknown",
    actor_role: String(user.role ?? "unknown").toLowerCase(),
  };
}

async function recordAudit({
  action,
  entityType,
  entityId = null,
  patientId = null,
  actor = null,
  summary = null,
  metadata = null,
}) {
  const actorFields = mapActor(actor);
  return prisma.audit_logs.create({
    data: {
      action: String(action),
      entity_type: String(entityType),
      entity_id: entityId != null ? String(entityId) : null,
      patient_id: patientId != null ? String(patientId) : null,
      summary,
      metadata: metadata ?? undefined,
      ...actorFields,
    },
  });
}

async function listPatientAuditLogs(patientId, limit = 50) {
  const rows = await prisma.audit_logs.findMany({
    where: { patient_id: String(patientId) },
    orderBy: { created_at: "desc" },
    take: Math.min(Math.max(Number(limit) || 50, 1), 200),
  });

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    patientId: row.patient_id,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    summary: row.summary,
    metadata: row.metadata,
    timestamp: row.created_at?.toISOString?.() ?? row.created_at,
  }));
}

module.exports = {
  recordAudit,
  listPatientAuditLogs,
};
