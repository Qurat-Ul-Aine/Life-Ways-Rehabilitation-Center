const INTERN_INCLUDE = {
  users: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      is_active: true,
      user_phones: { select: { phone: true } },
    },
  },
  internee_degrees: { select: { id: true, degree_program: true } },
  internee_universities: { select: { id: true, university_name: true } },
  doctors: {
    select: {
      id: true,
      specialization: true,
      users: { select: { id: true, name: true, email: true } },
    },
  },
};

function resolveApplicationStatus(row) {
  const status = String(row.application_status ?? "").toUpperCase();
  if (status) return status;
  if (!row.is_active) return "INACTIVE";
  const now = new Date();
  if (row.internship_end && new Date(row.internship_end) < now) return "COMPLETED";
  if (row.internship_start && new Date(row.internship_start) > now) return "PENDING";
  return "ACTIVE";
}

function mapIntern(row) {
  if (!row) return null;
  const phone = row.users?.user_phones?.[0]?.phone ?? "";
  const education = row.internee_degrees?.[0]?.degree_program ?? "";
  const university = row.internee_universities?.[0]?.university_name ?? "";
  return {
    id: row.id,
    userId: row.user_id,
    name: row.users?.name ?? "",
    email: row.users?.email ?? "",
    phone,
    education,
    university,
    degree: education,
    department: row.department ?? "",
    gender: row.gender ?? "",
    dateOfBirth: row.date_of_birth
      ? row.date_of_birth.toISOString().slice(0, 10)
      : null,
    address: row.address ?? "",
    cnic: row.cnic ?? "",
    semester: row.semester ?? "",
    emergencyContact: row.emergency_contact ?? "",
    skills: row.skills ?? "",
    notes: row.notes ?? "",
    requiredHours: row.required_hours ? Number(row.required_hours) : 480,
    applicationStatus: resolveApplicationStatus(row),
    internshipStart: row.internship_start
      ? row.internship_start.toISOString().slice(0, 10)
      : null,
    internshipEnd: row.internship_end
      ? row.internship_end.toISOString().slice(0, 10)
      : null,
    mentorId: row.mentor_id ?? null,
    mentor: row.doctors
      ? {
          id: row.doctors.id,
          name: row.doctors.users?.name ?? "",
          email: row.doctors.users?.email ?? "",
          specialization: row.doctors.specialization ?? "",
        }
      : null,
    isActive: row.is_active ?? true,
    is_active: row.users?.is_active ?? true,
  };
}

function mapTrainingLog(log) {
  return {
    id: log.id,
    internId: log.intern_id,
    hoursWorked: log.hours_worked ? Number(log.hours_worked) : 0,
    tasksCompleted: log.tasks_completed ?? "",
    learningNotes: log.learning_notes ?? "",
    skillsLearned: log.skills_learned ?? "",
    challenges: log.challenges ?? "",
    mentorRemarks: log.mentor_remarks ?? "",
    logType: log.log_type ?? "daily",
    status: log.status ?? "submitted",
    logDate: log.log_date ? log.log_date.toISOString().slice(0, 10) : null,
    createdAt: log.created_at ? log.created_at.toISOString() : null,
    createdBy: log.created_by ?? null,
    reviewedBy: log.reviewed_by ?? null,
    reviewedAt: log.reviewed_at ? log.reviewed_at.toISOString() : null,
    updatedAt: log.updated_at ? log.updated_at.toISOString() : null,
  };
}

function mapAttendance(record) {
  return {
    id: record.id,
    internId: record.intern_id,
    recordDate: record.record_date
      ? record.record_date.toISOString().slice(0, 10)
      : null,
    checkIn: record.check_in ?? "",
    checkOut: record.check_out ?? "",
    hoursWorked: record.hours_worked ? Number(record.hours_worked) : 0,
    status: record.status ?? "present",
    remarks: record.remarks ?? "",
    createdBy: record.created_by ?? null,
    approvedBy: record.approved_by ?? null,
    approvedAt: record.approved_at ? record.approved_at.toISOString() : null,
    createdAt: record.created_at ? record.created_at.toISOString() : null,
    updatedAt: record.updated_at ? record.updated_at.toISOString() : null,
  };
}

function mapEvaluation(row) {
  return {
    id: row.id,
    internId: row.intern_id,
    mentorId: row.mentor_id ?? null,
    rating: row.rating ?? null,
    comments: row.comments ?? "",
    criteria: row.criteria ?? null,
    evaluatedAt: row.evaluated_at ? row.evaluated_at.toISOString() : null,
    createdBy: row.created_by ?? null,
    mentor: row.doctors
      ? {
          id: row.doctors.id,
          name: row.doctors.users?.name ?? "",
          specialization: row.doctors.specialization ?? "",
        }
      : null,
  };
}

function mapAuditLog(row) {
  return {
    id: row.id,
    internId: row.intern_id,
    action: row.action ?? "",
    changedBy: row.changed_by ?? null,
    timestamp: row.timestamp ? row.timestamp.toISOString() : null,
    previousData: row.previous_data ?? null,
    newData: row.new_data ?? null,
  };
}

module.exports = {
  INTERN_INCLUDE,
  mapIntern,
  mapTrainingLog,
  mapAttendance,
  mapEvaluation,
  mapAuditLog,
  resolveApplicationStatus,
};
