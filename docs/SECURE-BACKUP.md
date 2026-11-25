# Encrypted private backup and authenticated recovery

The repository provides a dependency-free Node.js CLI for **AES-256-GCM** encryption of the existing private database export. It authenticates the encrypted contents and format, rejects tampering/wrong keys and restores into isolated in-memory SQLite before reporting success. It never writes decrypted data to disk or uploads a backup to another service.

This improves the previous checksum-only file: the encrypted artifact is authenticated by the holder's secret key. It is not a digital signature or proof of authorship against another holder of that key. Offsite custody, independent key escrow, scheduled backups, retention decisions and managed hosted recovery remain separate requirements.

## Commands

Use an owned local directory on macOS/Linux. Key, source and encrypted files must be regular owner-only files, not symlinks or hard links. Parent directories may not be shared-writable or symlinked. New files use mode `0600`; existing files are never overwritten. Do not use a network filesystem for this guarantee.

```bash
mkdir -m 700 /private/path/backup-keys
mkdir -m 700 /private/path/backup-artifacts
npm run backup:secure -- keygen --key-file /private/path/backup-keys/showcase.backup.key
npm run backup:secure -- capture \
  --key-file /private/path/backup-keys/showcase.backup.key \
  --operator-key-file /private/path/operator-key.txt \
  --output /private/path/backup-artifacts/showcase.sealed-backup.json
npm run backup:secure -- verify \
  --key-file /private/path/backup-keys/showcase.backup.key \
  --input /private/path/backup-artifacts/showcase.sealed-backup.json
```

`capture` contacts only the existing production Site's protected `/api/backup`, with redirect rejection, timeout and streamed byte limits. The operator credential is read from its private file, never a CLI argument value or output. It validates the export, encrypts with a fresh random 96-bit nonce and 128-bit authentication tag, verifies an isolated restore, writes the encrypted artifact and then re-reads/authenticates/restores that actual file. Console output contains only verification metadata, row counts, source/checksum and budget totals.

For an existing trusted private JSON export, replace `capture` with `seal --input /private/path/export.json`, omit `--operator-key-file`, and keep the key/output flags. The plaintext source already existed; the CLI does not delete it. It never exports or overwrites production data during verification.

## Key custody

Keep the generated 32-byte key separate from the encrypted backup. Do not commit, print, email or upload it to an unapproved destination. Losing the only key makes recovery impossible; storing it beside every backup defeats independent custody. A separate folder on the same Mac is local separation, not offsite disaster recovery or key escrow.

The authorized local release verification uses a key in the owner's private configuration directory and an encrypted artifact in ignored `exports/secure-backups`. Neither is committed. No new cloud account, paid storage, external message, cleanup job or deletion schedule is created.

The export retains the existing limits of 1,000 rows/table and a five-MB table payload. Encryption adds bounded overhead; it does not remove those limits. Application-level recovery verifies schema, every restored row count and the lifetime credit ledger. A future hosted restore must preserve the ledger and run in an approved isolated destination first; this tool does not provide a D1 restore API.

References: [Node.js authenticated encryption](https://nodejs.org/docs/latest-v24.x/api/crypto.html), [deployment/recovery operations](PRODUCTION-DEPLOYMENT.md).
