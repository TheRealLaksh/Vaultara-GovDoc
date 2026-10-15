import { html, render, delegate, forms, $ } from '../lib/dom.js';
import { icon } from '../lib/icons.js';
import { getState } from '../lib/store.js';
import { formatDate, initials, plural, relativeTime } from '../lib/format.js';
import {
  createFamily, createInvite, disbandFamily, joinFamily, leaveFamily, loadFamily, removeFamilyMember, revokeInvite
} from '../services/family.js';
import { loadVault } from '../services/vault.js';
import { openModal, confirmDialog } from '../components/modal.js';
import { toast } from '../components/toast.js';

export default async function familyView({ root }) {
  let family = null;
  let invites = [];
  let sharedCount = 0;

  const me = () => getState().user.uid;
  const isOwner = () => family?.ownerId === me();

  const paintNone = () =>
    render(
      root,
      html`<div class="page">
        <header class="page__head"><div>
          <p class="eyebrow">Households</p>
          <h1 class="page__title">Your <em>family</em></h1>
          <p class="page__lede">Put a household in one place. Family members can open the papers you choose to share with the family, and nothing else.</p>
        </div></header>
        <div class="grid-2">
          <section class="panel">
            <div class="panel__head"><div><h2 class="panel__title">Start a family</h2><p class="panel__sub">You become the owner and can invite up to seven people.</p></div></div>
            <form data-form="create" class="form-grid" novalidate>
              <div class="field"><label class="field__label" for="family-name">Family name</label>
                <input class="input" id="family-name" name="name" maxlength="60" placeholder="The Pradhwani household" required /></div>
              <div class="form-error" role="alert" data-error="create"></div>
              <button class="btn btn--primary" type="submit">${icon('family', { size: 18 })} Start family</button>
            </form>
          </section>
          <section class="panel">
            <div class="panel__head"><div><h2 class="panel__title">Join with a code</h2><p class="panel__sub">Ask the family owner for an invite code. Codes work once and expire in 48 hours.</p></div></div>
            <form data-form="join" class="form-grid" novalidate>
              <div class="field"><label class="field__label" for="join-code">Invite code</label>
                <input class="input code-input" id="join-code" name="code" maxlength="9" autocomplete="off" autocapitalize="characters" placeholder="ABCD 2345" required /></div>
              <div class="form-error" role="alert" data-error="join"></div>
              <button class="btn btn--primary" type="submit">${icon('key', { size: 18 })} Join family</button>
            </form>
          </section>
        </div>
      </div>`
    );

  const paintFamily = () => {
    const members = Object.entries(family.members || {}).sort((a, b) => (a[1].role === 'owner' ? -1 : b[1].role === 'owner' ? 1 : 0));
    render(
      root,
      html`<div class="page">
        <header class="page__head">
          <div>
            <p class="eyebrow">${plural(members.length, 'member')}</p>
            <h1 class="page__title">${family.name}</h1>
            <p class="page__lede">${sharedCount ? `${plural(sharedCount, 'document')} visible to this family.` : 'No documents are visible to the family yet. Open a document and tick "Visible to my family".'}</p>
          </div>
          <div class="page__actions">
            <a class="btn" href="/app">${icon('vault', { size: 18 })} Open vault</a>
            ${isOwner() ? html`<button class="btn btn--primary" type="button" data-action="invite">${icon('mail', { size: 18 })} Invite someone</button>` : ''}
          </div>
        </header>

        <div class="grid-2">
          <section class="panel">
            <div class="panel__head"><h2 class="panel__title">Members</h2></div>
            ${members.map(
              ([uid, m]) => html`<div class="member">
                <span class="avatar">${initials(m.name)}</span>
                <div class="member__text"><strong>${m.name}${uid === me() ? ' (you)' : ''}</strong><div class="muted">${m.email}</div></div>
                <span class="badge ${m.role === 'owner' ? 'badge--ok' : ''}">${m.role === 'owner' ? 'Owner' : 'Member'}</span>
                ${isOwner() && uid !== me()
                  ? html`<button class="btn btn--sm btn--ghost" type="button" data-action="remove" data-uid="${uid}" data-name="${m.name}" aria-label="Remove ${m.name}">${icon('close', { size: 16 })}</button>`
                  : ''}
              </div>`
            )}
          </section>

          <div class="stack">
            ${isOwner()
              ? html`<section class="panel">
                  <div class="panel__head"><div><h2 class="panel__title">Open invites</h2><p class="panel__sub">Each code works once.</p></div></div>
                  ${invites.length
                    ? invites.map(
                        (i) => html`<div class="share-line"><div><strong class="mono">${i.code}</strong><div class="muted">Expires ${relativeTime(i.expiresAt).replace(' ago', '')} · ${formatDate(i.expiresAt)}</div></div>
                          <button class="btn btn--sm btn--ghost" type="button" data-action="revoke-invite" data-code="${i.code}">Revoke</button></div>`
                      )
                    : html`<p class="muted">No open invites.</p>`}
                </section>`
              : ''}
            <section class="panel panel--danger">
              <div class="panel__head"><div><h2 class="panel__title">${isOwner() ? 'Disband or leave' : 'Leave this family'}</h2>
                <p class="panel__sub">${isOwner() ? 'Disbanding removes everyone. Documents stay with their owners.' : 'You will lose access to documents the family shared. Yours stop being visible to them.'}</p></div></div>
              <div class="row">
                ${isOwner() && members.length > 1 ? html`<button class="btn btn--danger" type="button" data-action="disband">Disband family</button>` : html`<button class="btn btn--danger" type="button" data-action="leave">Leave family</button>`}
              </div>
            </section>
          </div>
        </div>
      </div>`
    );
  };

  const paint = () => (family ? paintFamily() : paintNone());

  const load = async () => {
    ({ family, invites } = await loadFamily());
    sharedCount = 0;
    if (family) {
      try {
        sharedCount = (await loadVault()).filter((d) => d.familyShared || d.access === 'family').length;
      } catch {
        sharedCount = 0;
      }
    }
    paint();
  };

  render(root, html`<div class="page"><div class="skeleton"></div></div>`);
  try {
    await load();
  } catch (error) {
    render(root, html`<div class="page"><div class="empty"><h3>We could not load your family</h3><p>${error.message}</p></div></div>`);
    return;
  }

  const showInvite = async () => {
    try {
      const { code } = await createInvite();
      const pretty = `${code.slice(0, 4)} ${code.slice(4)}`;
      await openModal({
        title: 'Invite code ready',
        hideConfirm: true,
        cancelLabel: 'Done',
        body: html`<div class="stack">
          <div class="invite-code" aria-label="Invite code ${pretty}">${pretty}</div>
          <p class="muted">Send this code to the person you want to invite. It works once and expires in 48 hours.</p>
          <button class="btn btn--sm" type="button" data-copy="${code}">${icon('copy', { size: 16 })} Copy code</button>
        </div>`,
        onOpen: (dialog) =>
          dialog.querySelector('[data-copy]').addEventListener('click', async (event) => {
            try {
              await navigator.clipboard.writeText(event.currentTarget.dataset.copy);
              toast.ok('Code copied.');
            } catch {
              toast.error('Copy failed. Select the code and copy it by hand.');
            }
          })
      });
      await load();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const offForms = forms(root, {
    create: async (_form, data) => {
      try {
        await createFamily({ name: String(data.get('name')).trim() });
        toast.ok('Family started.');
        await load();
      } catch (error) {
        $('[data-error="create"]', root).textContent = error.message;
      }
    },
    join: async (_form, data) => {
      try {
        await joinFamily({ code: String(data.get('code')) });
        toast.ok('Welcome to the family.');
        await load();
      } catch (error) {
        $('[data-error="join"]', root).textContent = error.message;
      }
    }
  });

  const act = (title, message, confirmLabel, run, success) =>
    confirmDialog({ title, message, confirmLabel, danger: true, onConfirm: run }).then(async (ok) => {
      if (ok) {
        toast.ok(success);
        await load();
      }
    });

  const offClick = delegate(root, 'click', {
    invite: showInvite,
    'revoke-invite': async (el) => {
      try {
        await revokeInvite(el.dataset.code);
        toast.ok('Invite revoked.');
        await load();
      } catch (error) {
        toast.error(error.message);
      }
    },
    remove: (el) => act(`Remove ${el.dataset.name}?`, 'They lose access to family documents straight away.', 'Remove', () => removeFamilyMember(el.dataset.uid), 'Member removed.'),
    leave: () => act('Leave this family?', 'You will lose access to documents the family shared.', 'Leave family', () => leaveFamily(), 'You left the family.'),
    disband: () => act('Disband the family?', 'Every member is removed and family sharing stops for everyone.', 'Disband', () => disbandFamily(), 'Family disbanded.')
  });

  return () => {
    offForms();
    offClick();
  };
}
