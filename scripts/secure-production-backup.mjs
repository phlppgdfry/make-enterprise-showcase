import fs from "node:fs";
import path from "node:path";
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { pathToFileURL } from "node:url";
import { validateBackup } from "../production/src/backup.js";
import { verifyRestore } from "./verify-production-backup.mjs";

const MAX_PLAIN = 6 * 1024 * 1024;
const MAX_SEALED = 9 * 1024 * 1024;
const HEADER = {
  format: "make-enterprise-sealed-backup",
  version: 1,
  algorithm: "aes-256-gcm",
};
const AAD = Buffer.from(JSON.stringify(HEADER));
const ORIGIN =
  "https://make-enterprise-workbench-phlppgdfry.kippieg.chatgpt.site";
function requireKey(key) {
  if (!Buffer.isBuffer(key) || key.length !== 32)
    throw Error("A 32-byte backup key is required");
}
export async function sealBackup(backup, key) {
  requireKey(key);
  await validateBackup(backup);
  const plain = Buffer.from(JSON.stringify(backup));
  if (plain.length > MAX_PLAIN)
    throw Error("Backup exceeds the encryption size limit");
  try {
    const iv = randomBytes(12),
      cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
    cipher.setAAD(AAD);
    const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
    return {
      ...HEADER,
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    };
  } finally {
    plain.fill(0);
  }
}
function base64(value, size) {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(value))
    throw Error("Unsupported encrypted backup");
  const decoded = Buffer.from(value, "base64");
  if (decoded.toString("base64") !== value || (size && decoded.length !== size))
    throw Error("Unsupported encrypted backup");
  return decoded;
}
export async function openBackup(envelope, key) {
  requireKey(key);
  if (
    !envelope ||
    Object.keys(envelope).sort().join(",") !==
      "algorithm,ciphertext,format,iv,tag,version" ||
    Object.entries(HEADER).some(([k, v]) => envelope[k] !== v) ||
    typeof envelope.ciphertext !== "string" ||
    envelope.ciphertext.length > MAX_SEALED
  )
    throw Error("Unsupported encrypted backup");
  const iv = base64(envelope.iv, 12),
    tag = base64(envelope.tag, 16),
    ciphertext = base64(envelope.ciphertext);
  if (ciphertext.length > MAX_PLAIN)
    throw Error("Encrypted backup exceeds the size limit");
  let plain;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv, {
      authTagLength: 16,
    });
    decipher.setAAD(AAD);
    decipher.setAuthTag(tag);
    plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw Error("Backup authentication failed; no data accepted");
  }
  try {
    const value = JSON.parse(plain.toString("utf8"));
    await validateBackup(value);
    return value;
  } finally {
    plain.fill(0);
  }
}
function parentIsPrivate(file) {
  if (typeof process.getuid !== "function" || !fs.constants.O_NOFOLLOW)
    throw Error("Secure backup files require a POSIX filesystem");
  const parent = path.dirname(path.resolve(file)),
    stat = fs.statSync(parent);
  if (
    fs.realpathSync(parent) !== parent ||
    stat.uid !== process.getuid() ||
    stat.mode & 0o022
  )
    throw Error(
      "Use an owned local directory without symlinks or shared write permission",
    );
}
export function readPrivateFile(file, maxBytes) {
  parentIsPrivate(file);
  const fd = fs.openSync(
    file,
    fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK,
  );
  try {
    const st = fs.fstatSync(fd);
    if (
      !st.isFile() ||
      st.nlink !== 1 ||
      st.uid !== process.getuid() ||
      st.mode & 0o077 ||
      st.size > maxBytes
    )
      throw Error(
        "Input must be an owner-only regular file within the size limit",
      );
    const data = Buffer.alloc(maxBytes + 1);
    let n = 0,
      read;
    while (
      n <= maxBytes &&
      (read = fs.readSync(fd, data, n, data.length - n, null)) > 0
    )
      n += read;
    if (n > maxBytes) throw Error("Input exceeds the size limit");
    return data.subarray(0, n);
  } finally {
    fs.closeSync(fd);
  }
}
export function writePrivateFile(file, data) {
  parentIsPrivate(file);
  const fd = fs.openSync(
    file,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL |
      fs.constants.O_NOFOLLOW,
    0o600,
  );
  try {
    fs.writeFileSync(fd, data);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}
async function capture(operatorKey, fetcher = fetch) {
  const response = await fetcher(ORIGIN + "/api/backup", {
    headers: { Authorization: "Bearer " + operatorKey },
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw Error(
      "Authorized backup export failed (HTTP " + response.status + ")",
    );
  }
  if (!response.headers.get("content-type")?.startsWith("application/json")) {
    await response.body?.cancel();
    throw Error("Backup export did not return JSON");
  }
  const chunks = [],
    reader = response.body.getReader();
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_PLAIN) throw Error("Backup export exceeds the size limit");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const bytes = Buffer.concat(chunks);
  try {
    return JSON.parse(bytes.toString("utf8"));
  } finally {
    bytes.fill(0);
  }
}
export async function main(args = process.argv.slice(2)) {
  const [command, ...rest] = args,
    flags = {};
  if (
    !["keygen", "seal", "capture", "verify"].includes(command) ||
    rest.length % 2
  )
    throw Error(
      "Use keygen, seal, capture or verify with documented file flags",
    );
  const allowed = {
    keygen: ["--key-file"],
    seal: ["--key-file", "--input", "--output"],
    capture: ["--key-file", "--operator-key-file", "--output"],
    verify: ["--key-file", "--input"],
  }[command];
  for (let i = 0; i < rest.length; i += 2) {
    if (
      !allowed.includes(rest[i]) ||
      flags[rest[i]] ||
      !rest[i + 1] ||
      rest[i + 1].startsWith("--")
    )
      throw Error("Unknown or duplicate backup option");
    flags[rest[i]] = rest[i + 1];
  }
  if (allowed.some((k) => !flags[k]))
    throw Error("Missing required backup file option");
  if (command === "keygen") {
    const key = randomBytes(32);
    try {
      writePrivateFile(flags["--key-file"], key);
    } finally {
      key.fill(0);
    }
    return {
      created: true,
      keyPrinted: false,
      mode: "0600",
      note: "Keep this key separate from encrypted backups; losing it makes recovery impossible.",
    };
  }
  const key = readPrivateFile(flags["--key-file"], 32);
  requireKey(key);
  try {
    if (command === "verify") {
      const envelope = JSON.parse(
        readPrivateFile(flags["--input"], MAX_SEALED).toString("utf8"),
      );
      return {
        ...(await verifyRestore(await openBackup(envelope, key))),
        authenticatedEncryption: true,
        plaintextFileWritten: false,
      };
    }
    let backup;
    if (command === "capture") {
      const credential = readPrivateFile(flags["--operator-key-file"], 512);
      try {
        const token = credential.toString("utf8").trim();
        if (token.length < 20 || /[\r\n]/.test(token))
          throw Error("Invalid operator key file");
        backup = await capture(token);
      } finally {
        credential.fill(0);
      }
    } else
      backup = JSON.parse(
        readPrivateFile(flags["--input"], MAX_PLAIN).toString("utf8"),
      );
    const envelope = await sealBackup(backup, key);
    const verified = await verifyRestore(await openBackup(envelope, key));
    writePrivateFile(flags["--output"], JSON.stringify(envelope) + "\n");
    // Re-read the actual stored artifact, authenticate it and restore in isolation.
    const stored = JSON.parse(
      readPrivateFile(flags["--output"], MAX_SEALED).toString("utf8"),
    );
    await verifyRestore(await openBackup(stored, key));
    return {
      ...verified,
      authenticatedEncryption: true,
      plaintextFileWritten: false,
      storedArtifactVerified: true,
      offsiteCopyCreated: false,
      scheduledDeletionActivated: false,
    };
  } finally {
    key.fill(0);
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main()
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch(() => {
      console.error(
        "Secure backup failed. No plaintext or credentials were printed. Check file permissions, format, authentication and connectivity; existing files are never overwritten.",
      );
      process.exitCode = 1;
    });
}
