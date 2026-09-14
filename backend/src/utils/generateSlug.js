'use strict';

const { CoupleProfile, WeddingCard } = require('../models');

/**
 * Convert a string to a URL-safe slug.
 * @param {string} str - Input string
 * @returns {string} URL-safe slug
 */
const slugify = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')   // remove non-word chars except hyphen
    .replace(/[\s_]+/g, '-')    // replace spaces/underscores with hyphen
    .replace(/-+/g, '-')        // collapse multiple hyphens
    .replace(/^-+|-+$/g, '');   // trim leading/trailing hyphens
};

/**
 * Generate a unique slug from couple names.
 * Appends a random 4-character hex suffix if the slug already exists.
 * @param {string} brideName
 * @param {string} groomName
 * @returns {Promise<string>} Unique slug
 */
const generateSlug = async (brideName = '', groomName = '') => {
  const base = slugify(`${brideName}-and-${groomName}`) || 'our-wedding';
  let slug = base;
  let attempt = 0;

  while (attempt < 10) {
    const existing = await CoupleProfile.findOne({ where: { custom_slug: slug } });
    if (!existing) return slug;
    // Append random 4-char hex suffix
    const suffix = Math.random().toString(16).slice(2, 6);
    slug = `${base}-${suffix}`;
    attempt++;
  }

  // Fallback: base + timestamp
  return `${base}-${Date.now()}`;
};

/**
 * Generate a unique slug for a wedding card (separate namespace from
 * website slugs, checked against WeddingCard.custom_slug).
 * @param {string} brideName
 * @param {string} groomName
 * @returns {Promise<string>} Unique slug
 */
const generateCardSlug = async (brideName = '', groomName = '') => {
  const base = slugify(`${brideName}-and-${groomName}`) || 'our-card';
  let slug = base;
  let attempt = 0;

  while (attempt < 10) {
    const existing = await WeddingCard.findOne({ where: { custom_slug: slug } });
    if (!existing) return slug;
    const suffix = Math.random().toString(16).slice(2, 6);
    slug = `${base}-${suffix}`;
    attempt++;
  }

  return `${base}-${Date.now()}`;
};

module.exports = { generateSlug, generateCardSlug, slugify };
