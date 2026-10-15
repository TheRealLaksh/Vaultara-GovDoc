# Privacy notes

Last updated October 2026. These notes describe what the code in this repository does. If you run your own deployment you are the operator and must publish your own policy.

## What is stored

- Your email address and the name you give.
- Your documents, encrypted, and their details: title, category, tags, expiry date, size, file type and a SHA-256 fingerprint.
- Shares you create or receive, with the other person's email, permission and end date.
- Your family membership, if any.
- An activity trail: sign ins, views, downloads, shares, edits, deletions and family changes, each with a time, a masked network address (last part removed) and a short browser name.
- Short-lived counters used to rate limit actions.

## What is not stored

- No advertising identifiers, analytics or tracking scripts.
- No plaintext copies of your files. The upload inbox copy is deleted as soon as the encrypted file is written.
- No payment details.

## Who can see what

| Person | Can see |
|---|---|
| You | Everything you own, everything shared with you, and the trail of actions on your documents |
| Someone you shared with | That document, until the end date, as view only or view and download |
| Your family | Documents you mark as visible to the family |
| Operators of the deployment | Metadata. They can technically decrypt files because the server holds the keys, so restrict and log that access. |

## Your controls

- Edit or delete any document. Deleting removes the encrypted file, its key and its shares.
- Revoke any share. Leave or disband a family.
- Export your records as JSON from Settings.
- Delete your account from Settings. This removes your documents, keys, shares, profile, family membership and the activity entries you created, and then your sign in.

## Retention

Documents and records stay until you delete them. Expired shares and invites are removed within an hour. Activity entries stay until the account is deleted.

## Where data lives

Google Firebase services. Functions run in the Mumbai region (`asia-south1`) by default. Firestore and Cloud Storage live in the location chosen when the project was created.

## Children

Vaultara is not designed for children under 13.

## Contact

Open an issue on the repository for privacy questions.
