# Compliance notes

Vaultara is not certified against any standard and has not been audited by a third party. This page maps its design to common expectations so that a deployer can see what is covered and what is not. It is not legal advice.

## Principles followed

| Expectation | How Vaultara addresses it | Gap |
|---|---|---|
| Data minimisation | Stores only what the features need. No analytics. | None known |
| Purpose limitation | Data is used to run the vault and its audit trail only | Operator must publish a policy |
| Access control | Default-deny rules, owner, share and family checks on server and rules | Operator access to keys is broad unless restricted |
| Encryption at rest | AES-256-GCM per file with wrapped keys, plus Google's storage encryption | Not end-to-end, key rotation job not shipped |
| Encryption in transit | HTTPS everywhere, HSTS | None |
| Accountability | Server-written audit trail visible to actors and owners | Trail is deleted with the account |
| Individual rights | Export, correction (edit), deletion in Settings | No automated handling of third-party requests |
| Breach readiness | Logs in Cloud Logging, rate limits | No incident response runbook shipped |

## Laws a deployer should review

- India: Digital Personal Data Protection Act, 2023 and the IT Act, 2000 and its rules. Identity documents are sensitive, so consent, notice, purpose and breach reporting duties need legal review.
- EU or UK users: GDPR principles apply if you serve them.
- Storing copies of identity documents may be restricted by sector rules. Check before you offer this to the public.

## Before going live

1. Publish a privacy policy and terms for your deployment, and name a contact.
2. Enable App Check, MFA enforcement, Google Cloud audit logs, budget alerts and secret access alerts.
3. Write a short incident response plan and rehearse a key rotation.
4. Run an independent security review and a staging test of `storage.rules`.
5. Decide data residency (Firestore and Storage location) with legal advice.
