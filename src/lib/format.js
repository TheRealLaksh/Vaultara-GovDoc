const dateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });

export const toDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDate = (value, fallback = 'Not set') => {
  const date = toDate(value);
  return date ? dateFmt.format(date) : fallback;
};

export const formatDateTime = (value) => {
  const date = toDate(value);
  return date ? `${dateFmt.format(date)}, ${timeFmt.format(date)}` : 'Just now';
};

export const formatTime = (value) => {
  const date = toDate(value);
  return date ? timeFmt.format(date) : 'Just now';
};

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function daysUntil(value, now = new Date()) {
  const date = toDate(value);
  if (!date) return null;
  return Math.ceil((date.getTime() - now.getTime()) / 86400000);
}

export function relativeTime(value, now = new Date()) {
  const date = toDate(value);
  if (!date) return 'just now';
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  if (seconds < 45) return 'just now';
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} h ago`;
  if (seconds < 86400 * 7) return `${Math.round(seconds / 86400)} d ago`;
  return formatDate(date);
}

export const dayKey = (value) => {
  const date = toDate(value) || new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

export function dayLabel(key, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (key === today) return 'Today';
  if (key === today - 86400000) return 'Yesterday';
  return dateFmt.format(new Date(key));
}

export const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || '?';

// Reference number shown on each document card, derived from its id.
export const refNumber = (id = '') => `VLT-${id.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase()}`;

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// "expiry" description for a document: { tone, label } or null
export function expiryStatus(value, now = new Date()) {
  const days = daysUntil(value, now);
  if (days === null) return null;
  if (days < 0) return { tone: 'danger', label: `Expired ${Math.abs(days)} d ago`, days };
  if (days === 0) return { tone: 'danger', label: 'Expires today', days };
  if (days <= 30) return { tone: 'danger', label: `Expires in ${days} d`, days };
  if (days <= 90) return { tone: 'warn', label: `Expires in ${days} d`, days };
  return { tone: 'ok', label: `Valid until ${formatDate(value)}`, days };
}
