"use strict";

/** Predefined security questions users can choose from (SRS-19). */
const SECURITY_QUESTION_CATALOG = [
  { key: "first_pet", label: "What was the name of your first pet?" },
  { key: "birth_city", label: "What city were you born in?" },
  { key: "mother_maiden", label: "What is your mother's maiden name?" },
  { key: "elementary_school", label: "What was the name of your elementary school?" },
  { key: "favorite_book", label: "What is your favorite book?" },
  { key: "childhood_friend", label: "What is the first name of your childhood best friend?" },
];

const REQUIRED_QUESTION_COUNT = 2;

const VALID_KEYS = new Set(SECURITY_QUESTION_CATALOG.map((q) => q.key));

function getQuestionLabel(key) {
  return SECURITY_QUESTION_CATALOG.find((q) => q.key === key)?.label ?? key;
}

function normalizeAnswer(answer) {
  return String(answer ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

module.exports = {
  SECURITY_QUESTION_CATALOG,
  REQUIRED_QUESTION_COUNT,
  VALID_KEYS,
  getQuestionLabel,
  normalizeAnswer,
};
