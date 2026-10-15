// Input validation shared by every callable. Pure functions, no I/O.
export const CATEGORIES = ['Identity', 'Education', 'Health', 'Finance', 'Property', 'Other'];
export const PERMISSIONS = ['view', 'download'];
export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_TAGS = 8;

export class ValidationError extends Error {}

const CONTROL = /[\u0000-\u001f\u007f‪-‮⁦-⁩]/g; // control and bidi override characters

export function cleanText(value, { min = 1, max = 120, field = 'Value' } = {}) {
  const text = String(value ?? '').replace(CONTROL, '').replace(/\s+/g, ' ').trim();
  if (text.length < min) throw new ValidationError(`${field} is required.`);
  if (text.length > max) throw new ValidationError(`${field} must be at most ${max} characters.`);
  return text;
}

export function cleanCategory(value) {
  if (!CATEGORIES.includes(value)) throw new ValidationError('Choose a valid category.');
  return value;
}

export function cleanTags(value) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new ValidationError('Tags must be a list.');
  const out = [];
  for (const raw of value) {
    const tag = String(raw).toLowerCase().replace(CONTROL, '').replace(/[^a-z0-9 \-]/g, '').trim().slice(0, 24);
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out.slice(0, MAX_TAGS);
}

export function cleanEmail(value) {
  const email = String(value ?? '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new ValidationError('Enter a valid email address.');
  }
  return email;
}

export function cleanPermission(value) {
  if (!PERMISSIONS.includes(value)) throw new ValidationError('Choose a valid permission.');
  return value;
}

// Accepts YYYY-MM-DD or empty. Returns a Date at the end of that day (UTC).
export function cleanExpiryDate(value) {
  if (value == null || value === '') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ValidationError('Expiry must be a date.');
  const date = new Date(`${value}T23:59:59.000Z`);
  if (Number.isNaN(date.getTime())) throw new ValidationError('Expiry must be a real date.');
  const year = date.getUTCFullYear();
  if (year < 1990 || year > 2100) throw new ValidationError('Expiry year looks wrong.');
  return date;
}

export function cleanShareDays(value) {
  if (value == null || value === '' || value === 0) return null; // no expiry
  const days = Number(value);
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new ValidationError('Share duration must be between 1 and 365 days.');
  }
  return days;
}

export function cleanId(value, field = 'Id') {
  const id = String(value ?? '');
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(id)) throw new ValidationError(`${field} is invalid.`);
  return id;
}

export function cleanInviteCode(value) {
  const code = String(value ?? '').toUpperCase().replace(/[\s-]/g, '');
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) throw new ValidationError('That invite code is not valid.');
  return code;
}

// Make a safe download filename from a title and extension.
export function safeFileName(title, ext) {
  const stem = String(title).replace(/[^\p{L}\p{N} _.\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'document';
  return `${stem}.${ext}`;
}
