"use strict";

const ALLOWED_FAMILY_RELATIONSHIPS = Object.freeze([
  "Parent",
  "Mother",
  "Father",
  "Spouse",
  "Guardian",
  "Brother",
  "Sister",
  "Son",
  "Daughter",
  "Other",
]);

function isAllowedFamilyRelationship(value) {
  if (!value) return false;
  return ALLOWED_FAMILY_RELATIONSHIPS.includes(String(value).trim());
}

module.exports = {
  ALLOWED_FAMILY_RELATIONSHIPS,
  isAllowedFamilyRelationship,
};
