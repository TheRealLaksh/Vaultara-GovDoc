// Gives quick, honest feedback on password quality. Not a substitute for the
// server side checks, only a guide for the person typing.
const COMMON = ['password', '123456', 'qwerty', 'letmein', 'welcome', 'admin', 'iloveyou', 'abc123', 'india', 'vaultara'];

export function passwordStrength(password, email = '') {
  const checks = {
    length: password.length >= 10,
    mixed: /[a-z]/.test(password) && /[A-Z]/.test(password),
    digit: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password)
  };
  let score = Object.values(checks).filter(Boolean).length;
  if (password.length >= 14) score += 1;
  const lower = password.toLowerCase();
  const local = email.split('@')[0]?.toLowerCase();
  if (COMMON.some((word) => lower.includes(word)) || (local && local.length > 3 && lower.includes(local))) score = Math.min(score, 1);
  if (/^(.)\1+$/.test(password)) score = 0;
  const level = score <= 1 ? 0 : score <= 3 ? 1 : score === 4 ? 2 : 3;
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  return { level, label: labels[level], ok: checks.length && level >= 1 && !(COMMON.some((w) => lower.includes(w))), checks };
}
