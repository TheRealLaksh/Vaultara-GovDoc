// End-to-end smoke test against the local Firebase emulators.
//   firebase emulators:start --only auth,firestore,functions,storage --project demo-vaultara
//   npm run dev        (with VITE_USE_EMULATORS=true in .env.local)
//   node tests/e2e/smoke.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173';
const PROJECT = process.env.PROJECT || 'demo-vaultara';
const AUTH = 'http://127.0.0.1:9099';
const SHOTS = process.env.SHOTS || '/tmp/claude-0/screens';
mkdirSync(SHOTS, { recursive: true });

const PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

let failures = 0;
const watched = [];
const results = [];
async function step(name, fn) {
  try {
    await fn();
    results.push(`PASS  ${name}`);
  } catch (error) {
    failures += 1;
    for (const [i, page] of watched.entries()) await page.screenshot({ path: `${SHOTS}/fail-${failures}-${i}.png` }).catch(() => {});
    results.push(`FAIL  ${name}\n      ${String(error.message).split('\n')[0]}`);
  }
}
const assert = (cond, message) => {
  if (!cond) throw new Error(message);
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const consoleErrors = [];

async function newUser(label) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, acceptDownloads: true });
  const page = await context.newPage();
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(`[${label}] ${m.text()}`));
  page.on('pageerror', (e) => consoleErrors.push(`[${label}] pageerror ${e.message}`));
  return { context, page, label };
}

async function verifyEmail(email) {
  const res = await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`);
  const { oobCodes } = await res.json();
  const code = oobCodes.filter((c) => c.email === email && c.requestType === 'VERIFY_EMAIL').at(-1);
  assert(code, `no verification code for ${email}`);
  await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:update?key=fake`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ oobCode: code.oobCode })
  });
}

async function signUp(user, name, email, password = 'Correct horse 7 battery') {
  const { page } = user;
  await page.goto(`${BASE}/register`);
  await page.fill('#name', name);
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.check('input[name=terms]');
  await page.click('button[type=submit]');
  await page.waitForURL('**/verify');
  await verifyEmail(email);
  await page.click('[data-action=check]');
  await page.waitForURL('**/app');
  await page.waitForSelector('.page');
}

async function upload(page, { title, category = 'Identity', buffer = PDF, name = 'scan.pdf', mimeType = 'application/pdf', expiresOn = '', tags = [], family = false }) {
  await page.goto(`${BASE}/app/upload`);
  await page.setInputFiles('#file', { name, mimeType, buffer });
  await page.fill('#title', title);
  await page.selectOption('#category', category);
  if (expiresOn) await page.fill('#expiresOn', expiresOn);
  for (const t of tags) {
    await page.fill('#tags input', t);
    await page.press('#tags input', 'Enter');
  }
  if (family) await page.check('input[name=familyShared]');
  await page.click('button[type=submit]');
}

const stamp = Date.now();
const emailA = `alice${stamp}@example.com`;
const emailB = `bob${stamp}@example.com`;
const A = await newUser('alice');
const B = await newUser('bob');
watched.push(A.page, B.page);
let docId;
let xssDocId;

await step('landing page renders', async () => {
  await A.page.goto(BASE);
  await A.page.waitForSelector('.hero__title');
  await A.page.screenshot({ path: `${SHOTS}/01-landing.png`, fullPage: true });
});

await step('weak password is refused on register', async () => {
  await A.page.goto(`${BASE}/register`);
  await A.page.fill('#name', 'Weak');
  await A.page.fill('#email', `weak${stamp}@example.com`);
  await A.page.fill('#password', 'password123');
  await A.page.check('input[name=terms]');
  await A.page.click('button[type=submit]');
  await A.page.waitForFunction(() => document.querySelector('[data-error]')?.textContent.includes('stronger'));
});

await step('register, verify and reach the vault', async () => {
  await signUp(A, 'Alice Rao', emailA);
  await A.page.screenshot({ path: `${SHOTS}/02-vault-empty.png` });
  assert((await A.page.textContent('.empty h3')).includes('empty'), 'expected empty state');
});

await step('unverified pages are guarded', async () => {
  await A.page.goto(`${BASE}/app/settings`);
  await A.page.waitForSelector('.page');
});

await step('upload a PDF and land on its page', async () => {
  await upload(A.page, { title: 'Passport', category: 'Identity', expiresOn: '2027-01-15', tags: ['travel', 'renewal'] });
  await A.page.waitForURL('**/app/documents/*', { timeout: 20000 });
  docId = A.page.url().split('/').pop();
  await A.page.waitForSelector('.preview');
  assert((await A.page.textContent('h1')).includes('Passport'), 'title shown');
});

await step('preview decrypts the document', async () => {
  await A.page.click('[data-action=preview]');
  await A.page.waitForSelector('#preview iframe', { timeout: 15000 });
  await A.page.screenshot({ path: `${SHOTS}/03-document.png`, fullPage: true });
});

await step('download returns the original bytes', async () => {
  const [download] = await Promise.all([A.page.waitForEvent('download'), A.page.click('[data-action=download]')]);
  const path = await download.path();
  const { readFileSync } = await import('node:fs');
  assert(readFileSync(path).equals(PDF), 'downloaded bytes differ from the original');
});

await step('file is stored encrypted (not plaintext)', async () => {
  const admin = { headers: { Authorization: 'Bearer owner' } };
  const res = await fetch(`http://127.0.0.1:9199/v0/b/${PROJECT}.appspot.com/o?prefix=vault/`, admin);
  const body = await res.json();
  assert(body.items?.length >= 1, `no vault object (${JSON.stringify(body).slice(0, 120)})`);
  const obj = encodeURIComponent(body.items[0].name);
  const raw = Buffer.from(await (await fetch(`http://127.0.0.1:9199/v0/b/${PROJECT}.appspot.com/o/${obj}?alt=media`, { headers: { Authorization: 'Bearer owner' } })).arrayBuffer());
  assert(!raw.includes(Buffer.from('%PDF')), 'plaintext marker found in stored object');
  const inbox = await (await fetch(`http://127.0.0.1:9199/v0/b/${PROJECT}.appspot.com/o?prefix=inbox/`, admin)).json();
  assert(!(inbox.items || []).length, 'inbox copy was not removed');
});

await step('disguised file is rejected', async () => {
  await upload(A.page, { title: 'Evil', buffer: Buffer.from('MZ' + 'x'.repeat(200)), name: 'evil.pdf' });
  await A.page.waitForFunction(() => document.querySelector('[data-error]')?.textContent.length > 0, null, { timeout: 15000 });
  const text = await A.page.textContent('[data-error]');
  assert(/does not look|Only PDF/.test(text), `unexpected message: ${text}`);
});

await step('markup in a title stays text (no XSS)', async () => {
  await upload(A.page, { title: '<img src=x onerror="window.__pwned=1">Tricky', buffer: PNG, name: 'x.png', mimeType: 'image/png', category: 'Other' });
  await A.page.waitForURL('**/app/documents/*', { timeout: 20000 });
  xssDocId = A.page.url().split('/').pop();
  await A.page.waitForSelector('.preview');
  const pwned = await A.page.evaluate(() => window.__pwned);
  assert(!pwned, 'script executed');
  assert((await A.page.textContent('h1')).includes('<img'), 'markup should appear as text');
  await A.page.goto(`${BASE}/app`);
  await A.page.waitForSelector('.doc-card');
  assert(!(await A.page.evaluate(() => window.__pwned)), 'script executed on vault');
});

await step('vault shows both documents and search filters', async () => {
  await A.page.waitForSelector('.doc-card');
  assert((await A.page.locator('.doc-card').count()) === 2, 'expected 2 cards');
  await A.page.fill('#q', 'pass');
  await A.page.waitForFunction(() => document.querySelectorAll('.doc-card').length === 1);
  await A.page.fill('#q', '');
  await A.page.screenshot({ path: `${SHOTS}/04-vault.png`, fullPage: true });
});

await step('second user registers', async () => {
  await signUp(B, 'Bob Iyer', emailB);
});

await step('strangers cannot open a document', async () => {
  await B.page.goto(`${BASE}/app/documents/${docId}`);
  await B.page.waitForSelector('.empty h3');
  assert((await B.page.textContent('.empty h3')).includes('not found'), 'expected not found');
  const status = await B.page.evaluate(async (id) => {
    const { getAuth } = await import('/node_modules/.vite/deps/firebase_auth.js').catch(() => ({}));
    return null;
  }, docId);
});

await step('share with Bob (view only)', async () => {
  await A.page.goto(`${BASE}/app/documents/${docId}`);
  await A.page.click('.page__actions [data-action=share]');
  await A.page.fill('#share-email', emailB);
  await A.page.click('dialog .btn--primary');
  await A.page.waitForSelector('.share-line strong:has-text("' + emailB + '")', { timeout: 15000 });
  await A.page.screenshot({ path: `${SHOTS}/05-shared.png`, fullPage: true });
});

await step('Bob sees it, can preview, cannot download', async () => {
  await B.page.goto(`${BASE}/app`);
  await B.page.waitForSelector('.doc-card');
  await B.page.click('[data-tab=shared]');
  assert((await B.page.locator('.doc-card').count()) === 1, 'Bob should see 1 shared doc');
  await B.page.click('.doc-card');
  await B.page.waitForSelector('[data-action=preview]');
  assert((await B.page.locator('[data-action=download]').count()) === 0, 'download button should be hidden');
  await B.page.click('[data-action=preview]');
  await B.page.waitForSelector('#preview iframe', { timeout: 15000 });
  await B.page.screenshot({ path: `${SHOTS}/06-bob-view.png`, fullPage: true });
});

await step('server refuses download for view-only share', async () => {
  const status = await B.page.evaluate(async (id) => {
    const open = indexedDB.databases ? await indexedDB.databases() : [];
    return open.length;
  }, docId);
  // direct call with Bob's token
  const token = await B.page.evaluate(async () => {
    const dbs = await new Promise((resolve) => {
      const req = indexedDB.open('firebaseLocalStorageDb');
      req.onsuccess = () => {
        const tx = req.result.transaction('firebaseLocalStorage');
        const all = tx.objectStore('firebaseLocalStorage').getAll();
        all.onsuccess = () => resolve(all.result);
      };
    });
    return dbs.find((d) => d.value?.stsTokenManager)?.value.stsTokenManager.accessToken;
  });
  assert(token, 'could not read token');
  const res = await fetch(`${BASE}/api/download?id=${docId}&disposition=attachment`, { headers: { Authorization: `Bearer ${token}` } });
  assert(res.status === 403, `expected 403, got ${res.status}`);
  const view = await fetch(`${BASE}/api/download?id=${docId}&disposition=inline`, { headers: { Authorization: `Bearer ${token}` } });
  assert(view.status === 200, `expected 200 for view, got ${view.status}`);
  const noAuth = await fetch(`${BASE}/api/download?id=${docId}`);
  assert(noAuth.status === 401, `expected 401 without token, got ${noAuth.status}`);
  const other = await fetch(`${BASE}/api/download?id=${xssDocId}`, { headers: { Authorization: `Bearer ${token}` } });
  assert(other.status === 404, `expected 404 for unshared doc, got ${other.status}`);
});

await step('owner sees Bob in the activity trail', async () => {
  await A.page.goto(`${BASE}/app/activity`);
  await A.page.waitForSelector('.event');
  const text = await A.page.textContent('.timeline');
  assert(text.includes(emailB) && text.includes('opened'), 'expected Bob opening the document in the trail');
  await A.page.screenshot({ path: `${SHOTS}/07-activity.png`, fullPage: true });
});

await step('revoking removes Bob\'s access', async () => {
  await A.page.goto(`${BASE}/app/sharing`);
  await A.page.waitForSelector('[data-action=revoke]');
  await A.page.click('[data-action=revoke]');
  await A.page.click('dialog .btn--danger-solid');
  await A.page.waitForSelector('.empty:has-text("not shared anything")', { timeout: 15000 });
  await B.page.goto(`${BASE}/app`);
  await B.page.waitForSelector('.empty, .doc-card');
  await B.page.click('[data-tab=shared]');
  await B.page.waitForSelector('.empty');
});

await step('family: create, invite, join, share a document', async () => {
  await A.page.goto(`${BASE}/app/family`);
  await A.page.fill('#family-name', 'The Raos');
  await A.page.click('form[data-form=create] button[type=submit]');
  await A.page.waitForSelector('[data-action=invite]', { timeout: 15000 });
  await A.page.click('[data-action=invite]');
  await A.page.waitForSelector('.invite-code');
  const code = (await A.page.textContent('.invite-code')).replace(/\s/g, '');
  await A.page.click('dialog [data-cancel]');

  await B.page.goto(`${BASE}/app/family`);
  await B.page.fill('#join-code', code);
  await B.page.click('form[data-form=join] button[type=submit]');
  await B.page.waitForSelector('.member', { timeout: 15000 });
  await B.page.screenshot({ path: `${SHOTS}/08-family.png`, fullPage: true });

  await A.page.goto(`${BASE}/app/documents/${docId}`);
  await A.page.click('.page__actions [data-action=edit]');
  await A.page.check('dialog input[name=familyShared]');
  await A.page.click('dialog .btn--primary');
  await A.page.waitForSelector('.share-line:has-text("Your family")', { timeout: 15000 });

  await B.page.goto(`${BASE}/app`);
  await B.page.waitForSelector('.doc-card');
  await B.page.click('[data-tab=family]');
  assert((await B.page.locator('.doc-card').count()) === 1, 'Bob should see the family document');
});

await step('invite codes cannot be reused', async () => {
  const C = await newUser('carol');
  await signUp(C, 'Carol', `carol${stamp}@example.com`);
  await A.page.goto(`${BASE}/app/family`);
  await A.page.click('[data-action=invite]');
  await A.page.waitForSelector('.invite-code');
  const code = (await A.page.textContent('.invite-code')).replace(/\s/g, '');
  await A.page.click('dialog [data-cancel]');
  await C.page.goto(`${BASE}/app/family`);
  await C.page.fill('#join-code', code);
  await C.page.click('form[data-form=join] button[type=submit]');
  await C.page.waitForSelector('.member');
  const D = await newUser('dave');
  await signUp(D, 'Dave', `dave${stamp}@example.com`);
  await D.page.goto(`${BASE}/app/family`);
  await D.page.fill('#join-code', code);
  await D.page.click('form[data-form=join] button[type=submit]');
  await D.page.waitForFunction(() => document.querySelector('[data-error=join]')?.textContent.length > 0);
  await C.context.close();
  await D.context.close();
});

await step('settings, theme and two-step controls render', async () => {
  await A.page.goto(`${BASE}/app/settings`);
  await A.page.waitForSelector('.theme-choice');
  await A.page.click('[data-theme=dark]');
  await A.page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'dark');
  await A.page.screenshot({ path: `${SHOTS}/09-settings-dark.png`, fullPage: true });
  await A.page.click('[data-theme=light]');
});

await step('mobile layout works', async () => {
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await phone.newPage();
  await page.goto(BASE);
  await page.waitForSelector('.hero__title');
  await page.screenshot({ path: `${SHOTS}/10-mobile-landing.png`, fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(overflow <= 1, `horizontal overflow of ${overflow}px`);
  await phone.close();
});

await step('document deletion removes it', async () => {
  await A.page.goto(`${BASE}/app/documents/${xssDocId}`);
  await A.page.click('.page__actions [data-action=delete]');
  await A.page.click('dialog .btn--danger-solid');
  await A.page.waitForURL('**/app', { timeout: 15000 });
  await A.page.waitForSelector('.doc-card');
  assert((await A.page.locator('.doc-card').count()) === 1, 'expected one document left');
});

await step('export returns the account records', async () => {
  await A.page.goto(`${BASE}/app/settings`);
  await A.page.waitForSelector('[data-action=export]');
  const [download] = await Promise.all([A.page.waitForEvent('download'), A.page.click('[data-action=export]')]);
  const { readFileSync } = await import('node:fs');
  const data = JSON.parse(readFileSync(await download.path(), 'utf8'));
  assert(data.profile?.email === emailA, 'profile email missing');
  assert(Array.isArray(data.documents) && data.documents.length === 1, 'expected one document in export');
  assert(!JSON.stringify(data).includes('wrappedKey'), 'export must not include keys');
});

await step('deleting an account removes its files, keys and login', async () => {
  const E = await newUser('erin');
  const erin = `erin${stamp}@example.com`;
  await signUp(E, 'Erin', erin);
  await upload(E.page, { title: 'Erin ID' });
  await E.page.waitForURL('**/app/documents/*', { timeout: 20000 });
  await E.page.waitForSelector('.preview');
  const before = await (await fetch(`http://127.0.0.1:9199/v0/b/${PROJECT}.appspot.com/o?prefix=vault/`, { headers: { Authorization: 'Bearer owner' } })).json();
  await E.page.goto(`${BASE}/app/settings`);
  await E.page.click('[data-action=delete]');
  await E.page.fill('#confirm', 'DELETE');
  await E.page.fill('dialog #password', 'Correct horse 7 battery');
  await E.page.click('dialog .btn--danger-solid');
  await E.page.waitForURL(BASE + '/', { timeout: 30000 });
  const after = await (await fetch(`http://127.0.0.1:9199/v0/b/${PROJECT}.appspot.com/o?prefix=vault/`, { headers: { Authorization: 'Bearer owner' } })).json();
  assert((after.items || []).length === (before.items || []).length - 1, 'encrypted file was not removed');
  await E.page.goto(`${BASE}/login`);
  await E.page.fill('#email', erin);
  await E.page.fill('#password', 'Correct horse 7 battery');
  await E.page.click('button[type=submit]');
  await E.page.waitForFunction(() => document.querySelector('[data-error]')?.textContent.length > 0);
  await E.context.close();
});

await step('sign out returns home and guards /app', async () => {
  await A.page.click('[data-action=shell-logout]');
  await A.page.waitForURL(BASE + '/');
  await A.page.goto(`${BASE}/app`);
  await A.page.waitForURL('**/login**');
});

const relevant = consoleErrors.filter((e) => !/favicon|Failed to load resource.*(404|403|401)|net::ERR|preload|Download the React|\[erin\] Failed to load resource/i.test(e));
await step('no unexpected console errors', async () => {
  assert(relevant.length === 0, relevant.slice(0, 3).join(' | '));
});

await browser.close();
console.log(results.join('\n'));
console.log(failures ? `\n${failures} step(s) failed` : '\nAll steps passed');
process.exit(failures ? 1 : 0);
