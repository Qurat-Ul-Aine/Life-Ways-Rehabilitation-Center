"use strict";

/**
 * Rule-based clinical decision support configuration for Find My Doctor.
 * Edit this file to update mappings, severity rules, summaries, and pathways
 * without changing service logic.
 */

const CONDITION_TYPE_LABELS = [
  "Psychiatric Care",
  "Addiction Recovery",
  "Neurodiversity Support",
  "Physiotherapy",
  "General Rehabilitation",
];

/** @type {Array<{ value: string; label: string; conditionType: string; pathwayKey: string; severityFloor?: string|null }>} */
const CONDITION_DEFINITIONS = [
  { value: "anxiety", label: "Anxiety Disorder", conditionType: "Psychiatric Care", pathwayKey: "psychiatric_mood" },
  { value: "depression", label: "Depression", conditionType: "Psychiatric Care", pathwayKey: "psychiatric_mood" },
  { value: "bipolar", label: "Bipolar Disorder", conditionType: "Psychiatric Care", pathwayKey: "psychiatric_severe", severityFloor: "MEDIUM" },
  { value: "ptsd_trauma", label: "PTSD / Trauma", conditionType: "Psychiatric Care", pathwayKey: "psychiatric_trauma" },
  { value: "addiction_substance", label: "Addiction / Substance Use", conditionType: "Addiction Recovery", pathwayKey: "addiction_general", severityFloor: "MEDIUM" },
  { value: "alcohol_dependency", label: "Alcohol Dependency", conditionType: "Addiction Recovery", pathwayKey: "addiction_alcohol", severityFloor: "MEDIUM" },
  { value: "opioid_dependency", label: "Opioid Dependency", conditionType: "Addiction Recovery", pathwayKey: "addiction_opioid", severityFloor: "MEDIUM" },
  { value: "psychotic_disorder", label: "Schizophrenia / Psychotic Disorder", conditionType: "Psychiatric Care", pathwayKey: "psychiatric_severe", severityFloor: "MEDIUM" },
  { value: "adhd", label: "ADHD", conditionType: "Neurodiversity Support", pathwayKey: "neuro_adhd" },
  { value: "autism_neurodiversity", label: "Autism / Neurodiversity", conditionType: "Neurodiversity Support", pathwayKey: "neuro_developmental" },
  { value: "eating_disorder", label: "Eating Disorder", conditionType: "Psychiatric Care", pathwayKey: "psychiatric_eating", severityFloor: "MEDIUM" },
  { value: "sleep_disorder", label: "Insomnia / Sleep Disorder", conditionType: "Psychiatric Care", pathwayKey: "psychiatric_sleep" },
  { value: "chronic_pain", label: "Chronic Pain", conditionType: "Physiotherapy", pathwayKey: "physio_pain" },
  { value: "mobility_rehab", label: "Mobility / Physical Rehabilitation", conditionType: "Physiotherapy", pathwayKey: "physio_mobility" },
  { value: "stroke_recovery", label: "Stroke Recovery", conditionType: "Physiotherapy", pathwayKey: "physio_stroke" },
  { value: "speech_communication", label: "Speech / Communication Disorder", conditionType: "Neurodiversity Support", pathwayKey: "neuro_speech" },
  { value: "child_behavioral", label: "Child Behavioral Concerns", conditionType: "Neurodiversity Support", pathwayKey: "neuro_developmental" },
  { value: "grief_loss", label: "Grief & Loss", conditionType: "General Rehabilitation", pathwayKey: "general_grief" },
  { value: "stress_burnout", label: "Stress & Burnout", conditionType: "General Rehabilitation", pathwayKey: "general_burnout" },
];

/** Free-text resolver for "Other" or unrecognized conditions (first match wins). */
const OTHER_CONDITION_RESOLVER = [
  { pattern: /addiction|alcohol|opioid|substance|\bdrug\b/i, conditionType: "Addiction Recovery", pathwayKey: "addiction_general" },
  { pattern: /autism|adhd|speech|child|neuro/i, conditionType: "Neurodiversity Support", pathwayKey: "neuro_developmental" },
  { pattern: /stroke|mobility|physio|\bpain\b|physical/i, conditionType: "Physiotherapy", pathwayKey: "physio_mobility" },
  {
    pattern: /psychiat|schizo|bipolar|depression|anxiety|trauma|ptsd|eating|sleep|mental/i,
    conditionType: "Psychiatric Care",
    pathwayKey: "psychiatric_mood",
  },
  { pattern: /grief|loss|bereav/i, conditionType: "General Rehabilitation", pathwayKey: "general_grief" },
  { pattern: /stress|burnout|exhaust/i, conditionType: "General Rehabilitation", pathwayKey: "general_burnout" },
];

const SEVERITY_BY_SYMPTOM_COUNT = [
  { min: 4, level: "HIGH" },
  { min: 2, level: "MEDIUM" },
  { min: 1, level: "LOW" },
  { min: 0, level: "MEDIUM" },
];

/**
 * Crisis patterns — case-insensitive substring match on semicolon-separated symptom text.
 * All matches set urgentFlag: true and severity HIGH.
 */
const CRISIS_SYMPTOM_PATTERNS = [
  { pattern: /suicidal\s*thoughts|suicidal_thoughts/i, label: "suicidal thoughts" },
  { pattern: /self[- ]?harm\s*thoughts|self_harm_thoughts/i, label: "self-harm thoughts" },
  { pattern: /hallucinations|hallucination/i, label: "hallucinations" },
  { pattern: /paranoia/i, label: "paranoia" },
  { pattern: /aggression/i, label: "aggression" },
];

const HISTORY_SEVERITY_RULES = [
  {
    pattern: /previous psychiatric hospitalization|psychiatric hospitalization/i,
    floor: "MEDIUM",
    highIfSymptomCountAtLeast: 3,
  },
];

const CONFIDENCE_BY_SEVERITY = { HIGH: 0.85, MEDIUM: 0.7, LOW: 0.55 };

const SUMMARY_TEMPLATES = {
  "Psychiatric Care":
    "Assessment indicates {conditionLabel} aligned with {conditionType} at {severity} priority. "
    + "{symptomCount} symptom(s) reported.{urgentNote} A mental health rehabilitation specialist "
    + "is recommended for structured evaluation and care planning.",
  "Addiction Recovery":
    "Assessment indicates {conditionLabel} aligned with {conditionType} at {severity} priority. "
    + "{symptomCount} symptom(s) reported.{urgentNote} Addiction recovery specialists with "
    + "substance-use expertise are recommended for detox, counselling, and relapse-prevention planning.",
  "Neurodiversity Support":
    "Assessment indicates {conditionLabel} aligned with {conditionType} at {severity} priority. "
    + "{symptomCount} symptom(s) reported.{urgentNote} Developmental and neurodiversity-focused "
    + "rehabilitation services are recommended for assessment and tailored support.",
  Physiotherapy:
    "Assessment indicates {conditionLabel} aligned with {conditionType} at {severity} priority. "
    + "{symptomCount} symptom(s) reported.{urgentNote} Physical rehabilitation and mobility-focused "
    + "care are recommended to restore function and manage symptoms.",
  "General Rehabilitation":
    "Assessment indicates {conditionLabel} aligned with {conditionType} at {severity} priority. "
    + "{symptomCount} symptom(s) reported.{urgentNote} General rehabilitation support is recommended "
    + "for coping skills, wellness planning, and specialist referral as needed.",
};

/** @type {Record<string, { milestones: Array<{ timeframe: string; title: string; description: string }>; durationDefault: string; durationHigh?: string; durationUrgent?: string }>} */
const RECOVERY_PATHWAYS = {
  psychiatric_mood: {
    durationDefault: "12 weeks",
    durationHigh: "16 weeks",
    milestones: [
      { timeframe: "Week 1", title: "Initial Psychiatric Assessment", description: "Comprehensive evaluation of mood, anxiety, and functional impact; establish safety and treatment goals." },
      { timeframe: "Week 2", title: "Therapy Plan Initiation", description: "Begin CBT/supportive therapy sessions; review sleep, activity, and coping strategies." },
      { timeframe: "Week 4", title: "Symptom Stabilisation", description: "Monitor mood and anxiety scores; adjust therapy frequency and self-management tools." },
      { timeframe: "Week 8", title: "Functional Recovery Review", description: "Assess return to daily activities, work/social engagement; refine relapse-prevention plan." },
      { timeframe: "Week 12", title: "Maintenance & Aftercare", description: "Transition to maintenance therapy; document triggers, supports, and follow-up schedule." },
    ],
  },
  psychiatric_severe: {
    durationDefault: "12 weeks",
    durationHigh: "16 weeks",
    durationUrgent: "16 weeks",
    milestones: [
      { timeframe: "Week 1", title: "Urgent Clinical Assessment", description: "Psychiatric evaluation including mood/psychotic symptoms, medication review, and safety planning." },
      { timeframe: "Week 2", title: "Stabilisation Phase", description: "Initiate or optimise mood-stabilising/antipsychotic regimen under specialist supervision." },
      { timeframe: "Week 4", title: "Structured Therapy Introduction", description: "Add psychoeducation and therapy when clinically stable; monitor adherence." },
      { timeframe: "Week 8", title: "Relapse Prevention Planning", description: "Identify early warning signs; family/carer involvement where appropriate." },
      { timeframe: "Week 12", title: "Long-term Care Plan", description: "Establish maintenance medication, therapy cadence, and crisis contacts." },
    ],
  },
  psychiatric_trauma: {
    durationDefault: "12 weeks",
    durationHigh: "16 weeks",
    milestones: [
      { timeframe: "Week 1", title: "Trauma-Informed Assessment", description: "Safety, grounding skills, and trauma history review with specialist." },
      { timeframe: "Week 2", title: "Stabilisation & Psychoeducation", description: "Build coping toolkit before trauma-focused work; sleep and arousal management." },
      { timeframe: "Week 4", title: "Trauma-Focused Therapy Begins", description: "Structured trauma therapy (e.g. CPT/PE approach) as clinically appropriate." },
      { timeframe: "Week 8", title: "Integration & Exposure Review", description: "Process traumatic memories with supported exposure techniques." },
      { timeframe: "Week 12", title: "Recovery Consolidation", description: "Consolidate gains; aftercare and community support linkage." },
    ],
  },
  psychiatric_eating: {
    durationDefault: "12 weeks",
    durationHigh: "16 weeks",
    milestones: [
      { timeframe: "Week 1", title: "Multidisciplinary Assessment", description: "Medical, nutritional, and psychological evaluation; safety and weight monitoring." },
      { timeframe: "Week 2", title: "Meal Planning & Monitoring", description: "Structured meal support and nutritional rehabilitation begin." },
      { timeframe: "Week 4", title: "Cognitive & Behavioural Therapy", description: "Address disordered eating cognitions and behaviours." },
      { timeframe: "Week 8", title: "Body Image & Relapse Skills", description: "Coping strategies for triggers; family therapy if indicated." },
      { timeframe: "Week 12", title: "Step-Down Aftercare", description: "Transition to outpatient maintenance with clear relapse plan." },
    ],
  },
  psychiatric_sleep: {
    durationDefault: "12 weeks",
    milestones: [
      { timeframe: "Week 1", title: "Sleep Assessment", description: "Sleep history, hygiene review, and screening for comorbid mood/anxiety." },
      { timeframe: "Week 2", title: "CBT-I Foundations", description: "Sleep schedule, stimulus control, and relaxation techniques introduced." },
      { timeframe: "Week 4", title: "Cognitive Restructuring", description: "Address sleep-related anxieties and maladaptive beliefs about sleep." },
      { timeframe: "Week 8", title: "Medication Review", description: "Optimise sleep aids if prescribed; reinforce behavioural strategies." },
      { timeframe: "Week 12", title: "Sustained Sleep Health", description: "Maintenance plan for long-term sleep quality." },
    ],
  },
  addiction_general: {
    durationDefault: "12 weeks",
    durationHigh: "16 weeks",
    durationUrgent: "16 weeks",
    milestones: [
      { timeframe: "Week 1", title: "Intake & Detox Assessment", description: "Substance use history, withdrawal risk assessment, and immediate safety planning." },
      { timeframe: "Week 2", title: "Detox / Stabilisation", description: "Medically supervised withdrawal or stabilisation as clinically indicated." },
      { timeframe: "Week 4", title: "Structured Counselling", description: "Individual and group therapy; introduction to MAT where appropriate." },
      { timeframe: "Week 8", title: "Relapse Prevention Skills", description: "Coping with cravings, trigger mapping, peer support engagement." },
      { timeframe: "Week 12", title: "Recovery Maintenance", description: "Aftercare plan, sober supports, and step-down to outpatient follow-up." },
    ],
  },
  addiction_alcohol: {
    durationDefault: "12 weeks",
    durationHigh: "16 weeks",
    durationUrgent: "16 weeks",
    milestones: [
      { timeframe: "Week 1", title: "Intake & Detox Assessment", description: "Alcohol use history, withdrawal risk (CIWA-guided), and immediate safety planning." },
      { timeframe: "Week 2", title: "Detox / Stabilisation", description: "Medically supervised alcohol withdrawal or stabilisation as clinically indicated." },
      { timeframe: "Week 4", title: "Structured Counselling", description: "Individual and group therapy; naltrexone/acamprosate evaluation per protocol." },
      { timeframe: "Week 8", title: "Relapse Prevention Skills", description: "Coping with cravings, trigger mapping, peer support and AA linkage." },
      { timeframe: "Week 12", title: "Recovery Maintenance", description: "Aftercare plan, sober supports, and step-down to outpatient follow-up." },
    ],
  },
  addiction_opioid: {
    durationDefault: "12 weeks",
    durationHigh: "16 weeks",
    durationUrgent: "16 weeks",
    milestones: [
      { timeframe: "Week 1", title: "Intake & Detox Assessment", description: "Opioid use history, withdrawal risk assessment, and immediate safety planning." },
      { timeframe: "Week 2", title: "Detox / Stabilisation", description: "Medically supervised withdrawal or stabilisation as clinically indicated." },
      { timeframe: "Week 4", title: "Structured Counselling", description: "Individual and group therapy; MAT evaluation (e.g. buprenorphine/naltrexone) per protocol." },
      { timeframe: "Week 8", title: "Relapse Prevention Skills", description: "Coping with cravings, trigger mapping, peer support engagement." },
      { timeframe: "Week 12", title: "Recovery Maintenance", description: "Aftercare plan, sober supports, and step-down to outpatient follow-up." },
    ],
  },
  neuro_adhd: {
    durationDefault: "12 weeks",
    milestones: [
      { timeframe: "Week 1", title: "Developmental Assessment", description: "ADHD symptom profiling, functional impact at work/school/home." },
      { timeframe: "Week 2", title: "Skills & Structure Planning", description: "Organisation, time management, and environmental adjustments." },
      { timeframe: "Week 4", title: "Therapy & Coaching", description: "Behavioural coaching and/or medication review with prescriber." },
      { timeframe: "Week 8", title: "Social & Executive Function", description: "Social skills, emotional regulation, and sustained strategy use." },
      { timeframe: "Week 12", title: "Long-term Support Plan", description: "Maintenance coaching cadence and school/work accommodations." },
    ],
  },
  neuro_developmental: {
    durationDefault: "16 weeks",
    milestones: [
      { timeframe: "Week 1", title: "Neurodevelopmental Assessment", description: "Strengths-based evaluation; sensory, communication, and behavioural profile." },
      { timeframe: "Week 2", title: "Individualised Support Plan", description: "Goals with family/carers; therapy modality selection (ABA, play, parent training)." },
      { timeframe: "Week 4", title: "Structured Intervention Begins", description: "Regular therapy sessions; school/home strategy alignment." },
      { timeframe: "Week 8", title: "Progress & Adjustment", description: "Review communication/behaviour goals; adjust intensity." },
      { timeframe: "Week 12", title: "Transition & Aftercare", description: "Step-down plan; community resources and ongoing supports." },
    ],
  },
  neuro_speech: {
    durationDefault: "12 weeks",
    milestones: [
      { timeframe: "Week 1", title: "Communication Assessment", description: "Speech-language evaluation; identify disorder type and severity." },
      { timeframe: "Week 2", title: "Therapy Plan Design", description: "Target sounds, language, fluency, or social communication goals set." },
      { timeframe: "Week 4", title: "Active Speech Therapy", description: "Twice-weekly sessions; home practice programme for carers." },
      { timeframe: "Week 8", title: "Mid-Programme Review", description: "Standardised re-assessment; adjust targets." },
      { timeframe: "Week 12", title: "Discharge & Maintenance", description: "Home exercise plan; referral for ongoing needs if required." },
    ],
  },
  physio_pain: {
    durationDefault: "12 weeks",
    milestones: [
      { timeframe: "Week 1", title: "Pain Assessment", description: "Pain mapping, functional limitations, and multidisciplinary review." },
      { timeframe: "Week 2", title: "Movement & Education", description: "Pain neuroscience education; gentle mobility programme begins." },
      { timeframe: "Week 4", title: "Structured Physiotherapy", description: "Graded exercise, manual therapy as indicated; pacing strategies." },
      { timeframe: "Week 8", title: "Functional Restoration", description: "Return-to-activity goals; work/home adaptation." },
      { timeframe: "Week 12", title: "Self-Management Plan", description: "Independent exercise programme and flare-up management." },
    ],
  },
  physio_mobility: {
    durationDefault: "12 weeks",
    milestones: [
      { timeframe: "Week 1", title: "Baseline Functional Assessment", description: "Mobility, balance, ADL assessment; equipment needs identified." },
      { timeframe: "Week 2", title: "Rehabilitation Plan Start", description: "Personalised physio and occupational goals; equipment provision." },
      { timeframe: "Week 4", title: "Intensive Rehab Phase", description: "Regular physio; gait/balance training; carer education." },
      { timeframe: "Week 8", title: "Functional Gains Review", description: "Re-assess mobility scores; adjust intensity toward independence." },
      { timeframe: "Week 12", title: "Community Reintegration", description: "Discharge planning; home exercise and outpatient follow-up." },
    ],
  },
  physio_stroke: {
    durationDefault: "12 weeks",
    durationHigh: "16 weeks",
    milestones: [
      { timeframe: "Week 1", title: "Baseline Functional Assessment", description: "Mobility, balance, ADL assessment; stroke severity review." },
      { timeframe: "Week 2", title: "Rehabilitation Plan Start", description: "Personalised physio and occupational goals; equipment needs." },
      { timeframe: "Week 4", title: "Intensive Rehab Phase", description: "Regular physio; gait/balance training; carer education." },
      { timeframe: "Week 8", title: "Functional Gains Review", description: "Re-assess mobility scores; adjust intensity toward independence." },
      { timeframe: "Week 12", title: "Community Reintegration", description: "Discharge planning; home exercise and outpatient follow-up." },
    ],
  },
  general_grief: {
    durationDefault: "12 weeks",
    milestones: [
      { timeframe: "Week 1", title: "Bereavement Assessment", description: "Grief impact on mood, sleep, function; safety screening." },
      { timeframe: "Week 2", title: "Supportive Counselling Begins", description: "Normalise grief; build coping and social supports." },
      { timeframe: "Week 4", title: "Meaning-Making & Processing", description: "Structured grief work; memorialisation and expression activities." },
      { timeframe: "Week 8", title: "Re-engagement with Life", description: "Gradual return to routines, roles, and social connection." },
      { timeframe: "Week 12", title: "Continuing Bonds & Aftercare", description: "Long-term grief integration plan; follow-up as needed." },
    ],
  },
  general_burnout: {
    durationDefault: "8 weeks",
    milestones: [
      { timeframe: "Week 1", title: "Burnout & Stress Assessment", description: "Work/life stressors, exhaustion, and functional impact review." },
      { timeframe: "Week 2", title: "Recovery & Boundaries Plan", description: "Rest, sleep hygiene, workload boundaries, and stress reduction goals." },
      { timeframe: "Week 4", title: "Skills Training", description: "Mindfulness, time management, and cognitive restructuring." },
      { timeframe: "Week 8", title: "Resilience Maintenance", description: "Ongoing wellness plan; prevent recurrence." },
    ],
  },
  general_default: {
    durationDefault: "12 weeks",
    milestones: [
      { timeframe: "Week 1", title: "Initial Assessment", description: "Review of {conditionLabel}, symptoms, and functional goals with rehabilitation team." },
      { timeframe: "Week 2", title: "Care Plan Initiation", description: "Begin structured support sessions aligned with your rehabilitation needs." },
      { timeframe: "Week 4", title: "Early Progress Review", description: "Monitor response to interventions; adjust plan as needed." },
      { timeframe: "Week 8", title: "Mid-Programme Evaluation", description: "Assess functional gains and refine coping or therapy strategies." },
      { timeframe: "Week 12", title: "Aftercare Planning", description: "Transition plan with follow-up schedule and community supports." },
    ],
  },
};

module.exports = {
  CONDITION_TYPE_LABELS,
  CONDITION_DEFINITIONS,
  OTHER_CONDITION_RESOLVER,
  SEVERITY_BY_SYMPTOM_COUNT,
  CRISIS_SYMPTOM_PATTERNS,
  HISTORY_SEVERITY_RULES,
  CONFIDENCE_BY_SEVERITY,
  SUMMARY_TEMPLATES,
  RECOVERY_PATHWAYS,
  DEFAULT_PATHWAY_KEY: "general_default",
  DEFAULT_CONDITION_TYPE: "General Rehabilitation",
  ANALYSIS_SOURCE: "dss",
};
