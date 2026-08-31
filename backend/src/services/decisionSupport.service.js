"use strict";

const rules = require("../config/dssClinicalRules");

const SEVERITY_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2 };

/**
 * @param {string|null|undefined} a
 * @param {string|null|undefined} b
 */
function maxSeverity(a, b) {
  const left = SEVERITY_RANK[a] ?? 0;
  const right = SEVERITY_RANK[b] ?? 0;
  return left >= right ? a : b;
}

/**
 * @param {string|null|undefined} text
 */
function normalizeText(text) {
  return String(text ?? "").trim().toLowerCase();
}

/**
 * @param {string|null|undefined} symptomsText
 */
function parseSymptomCount(symptomsText) {
  const raw = String(symptomsText ?? "").trim();
  if (!raw) return 0;
  return raw.split(";").map((part) => part.trim()).filter(Boolean).length;
}

/**
 * @param {string|null|undefined} symptomsText
 */
function detectCrisisFlags(symptomsText) {
  const haystack = String(symptomsText ?? "");
  const matched = [];

  for (const entry of rules.CRISIS_SYMPTOM_PATTERNS) {
    if (entry.pattern.test(haystack)) {
      matched.push(entry.label);
    }
  }

  return {
    urgentFlag: matched.length > 0,
    crisisLabels: matched,
  };
}

/**
 * @param {number} symptomCount
 */
function severityFromSymptomCount(symptomCount) {
  for (const rule of rules.SEVERITY_BY_SYMPTOM_COUNT) {
    if (symptomCount >= rule.min) {
      return rule.level;
    }
  }
  return "MEDIUM";
}

/**
 * @param {string|null|undefined} medicalHistory
 * @param {number} symptomCount
 * @param {string} currentSeverity
 */
function applyHistorySeverityRules(medicalHistory, symptomCount, currentSeverity) {
  let severity = currentSeverity;
  const haystack = String(medicalHistory ?? "");

  for (const rule of rules.HISTORY_SEVERITY_RULES) {
    if (!rule.pattern.test(haystack)) continue;
    severity = maxSeverity(severity, rule.floor);
    if (
      rule.highIfSymptomCountAtLeast != null
      && symptomCount >= rule.highIfSymptomCountAtLeast
    ) {
      severity = maxSeverity(severity, "HIGH");
    }
  }

  return severity;
}

/**
 * @param {string|null|undefined} conditionText
 */
function resolveConditionDefinition(conditionText) {
  const normalized = normalizeText(conditionText);
  if (!normalized) {
    return {
      value: null,
      label: "Rehabilitation support",
      conditionType: rules.DEFAULT_CONDITION_TYPE,
      pathwayKey: rules.DEFAULT_PATHWAY_KEY,
      severityFloor: null,
    };
  }

  for (const def of rules.CONDITION_DEFINITIONS) {
    if (normalized === normalizeText(def.value) || normalized === normalizeText(def.label)) {
      return def;
    }
  }

  for (const def of rules.CONDITION_DEFINITIONS) {
    const label = normalizeText(def.label);
    if (normalized.includes(label) || label.includes(normalized)) {
      return def;
    }
  }

  for (const resolver of rules.OTHER_CONDITION_RESOLVER) {
    if (resolver.pattern.test(String(conditionText ?? ""))) {
      return {
        value: "__other__",
        label: String(conditionText).trim(),
        conditionType: resolver.conditionType,
        pathwayKey: resolver.pathwayKey,
        severityFloor: null,
      };
    }
  }

  return {
    value: "__other__",
    label: String(conditionText).trim(),
    conditionType: rules.DEFAULT_CONDITION_TYPE,
    pathwayKey: rules.DEFAULT_PATHWAY_KEY,
    severityFloor: null,
  };
}

/**
 * @param {string} template
 * @param {Record<string, string|number>} vars
 */
function fillTemplate(template, vars) {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value)),
    template,
  );
}

/**
 * @param {object} input
 * @param {string} input.condition
 * @param {string} [input.symptoms]
 * @param {string} [input.medicalHistory]
 * @param {string} [input.serviceTitle]
 */
function analyzeClinicalProfile(input) {
  const conditionDef = resolveConditionDefinition(input.condition);
  const symptomCount = parseSymptomCount(input.symptoms);
  const crisis = detectCrisisFlags(input.symptoms);

  let severityLevel = severityFromSymptomCount(symptomCount);
  if (conditionDef.severityFloor) {
    severityLevel = maxSeverity(severityLevel, conditionDef.severityFloor);
  }
  severityLevel = applyHistorySeverityRules(
    input.medicalHistory,
    symptomCount,
    severityLevel,
  );

  if (crisis.urgentFlag) {
    severityLevel = "HIGH";
  }

  const conditionLabel = conditionDef.label || String(input.condition ?? "Rehabilitation support");
  const urgentNote = crisis.urgentFlag
    ? " Immediate clinical review is recommended."
    : "";

  const summaryTemplate =
    rules.SUMMARY_TEMPLATES[conditionDef.conditionType]
    ?? rules.SUMMARY_TEMPLATES[rules.DEFAULT_CONDITION_TYPE];

  const summary = fillTemplate(summaryTemplate, {
    conditionLabel,
    conditionType: conditionDef.conditionType,
    severity: severityLevel,
    symptomCount,
    urgentNote,
  }).slice(0, 500);

  const urgentSuffix = crisis.urgentFlag
    ? " with urgent safety flags requiring prompt clinical attention"
    : "";
  const reasoning =
    `Rule-based clinical triage: ${conditionDef.conditionType} pathway selected for `
    + `${conditionLabel}. Severity ${severityLevel} based on ${symptomCount} reported `
    + `symptom(s)${urgentSuffix}.`.slice(0, 1000);

  return {
    conditionType: conditionDef.conditionType,
    severityLevel,
    summary,
    reasoning,
    source: rules.ANALYSIS_SOURCE,
    urgentFlag: crisis.urgentFlag,
    symptomCount,
    pathwayKey: conditionDef.pathwayKey,
    conditionLabel,
    crisisLabels: crisis.crisisLabels,
  };
}

/**
 * @param {object} input
 * @param {string} [input.pathwayKey]
 * @param {string} [input.conditionType]
 * @param {string} [input.severityLevel]
 * @param {boolean} [input.urgentFlag]
 * @param {string} [input.condition]
 * @param {string} [input.doctorSpecialization]
 */
function generateRecoveryJourney(input) {
  let pathwayKey = input.pathwayKey;
  let conditionLabel = input.conditionLabel;

  if (!pathwayKey && input.condition) {
    const def = resolveConditionDefinition(input.condition);
    pathwayKey = def.pathwayKey;
    conditionLabel = def.label;
  }

  const pathway =
    rules.RECOVERY_PATHWAYS[pathwayKey]
    ?? rules.RECOVERY_PATHWAYS[rules.DEFAULT_PATHWAY_KEY];

  const severity = String(input.severityLevel ?? "MEDIUM").toUpperCase();
  const isHigh = severity === "HIGH";
  const isUrgent = Boolean(input.urgentFlag);

  let estimatedDuration = pathway.durationDefault;
  if (isUrgent && pathway.durationUrgent) {
    estimatedDuration = pathway.durationUrgent;
  } else if (isHigh && pathway.durationHigh) {
    estimatedDuration = pathway.durationHigh;
  }

  const label = conditionLabel || input.condition || "your condition";
  const specialization = String(input.doctorSpecialization ?? "specialist care");

  const recoveryJourney = pathway.milestones.map((milestone) => ({
    timeframe: milestone.timeframe,
    title: milestone.title,
    description: fillTemplate(milestone.description, {
      conditionLabel: label,
      doctorSpecialization: specialization,
    }).slice(0, 400),
  }));

  return {
    recoveryJourney,
    estimatedDuration: String(estimatedDuration).slice(0, 80),
    source: rules.ANALYSIS_SOURCE,
  };
}

module.exports = {
  analyzeClinicalProfile,
  generateRecoveryJourney,
  // Exported for unit-style verification / future tests
  resolveConditionDefinition,
  parseSymptomCount,
  detectCrisisFlags,
};
