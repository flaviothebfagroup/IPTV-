// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const bucket = admin.storage().bucket();

// ── Limit who can run backups/restores (put your emails here)
const ALLOWED_EMAILS = new Set([
  "gorodscyflavio@gmail.com",
  // "someone@yourcompany.com",
]);

// ── GitHub repo to zip (for code snapshot)
const CFG = {
  githubOwner: "flaviothebfagroup",
  githubRepo: "IPTV-",
  githubBranch: "main",
  githubToken: (functions.config()?.backup?.github_token) || null, // optional for private repo
};

function assertAuth(context) {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Sign in required");
  const email = context.auth.token.email || "";
  if (ALLOWED_EMAILS.size && !ALLOWED_EMAILS.has(email)) {
    throw new functions.https.HttpsError("permission-denied", `Not allowed: ${email}`);
  }
  return email;
}

function tsId() { return new Date().toISOString().replace(/[:.]/g, "-"); }

async function signedUrl(path) {
  const [url] = await bucket.file(path).getSignedUrl({
    action: "read",
    expires: Date.now() + 1000 * 60 * 60 * 24 * 14, // 14 days
  });
  return url;
}

async function saveBuffer(path, buf, contentType) {
  await bucket.file(path).save(buf, { contentType, resumable: false, public: false });
  const [meta] = await bucket.file(path).getMetadata();
  return { path, size: Number(meta.size || 0), contentType, url: await signedUrl(path) };
}

// ── BACKUP: RTDB JSON + GitHub ZIP
exports.backupNow = functions.region("us-central1").https.onCall(async (_data, context) => {
  const email = assertAuth(context);
  const id = tsId();
  const base = `backups/${id}/`;

  // 1) RTDB JSON
  let rt;
  try {
    const snap = await admin.database().ref("/").get();
    const json = JSON.stringify(snap.val(), null, 2);
    rt = await saveBuffer(base + "realtime-db.json", Buffer.from(json, "utf8"), "application/json");
  } catch (e) {
    throw new functions.https.HttpsError("internal", `RTDB export failed: ${e.message || e}`);
  }

  // 2) GitHub ZIP via fetch (Node 20)
  let gh;
  try {
    const url = `https://api.github.com/repos/${CFG.githubOwner}/${CFG.githubRepo}/zipball/${CFG.githubBranch}`;
    const headers = { "User-Agent": "BFA-Backup" };
    if (CFG.githubToken) headers["Authorization"] = `token ${CFG.githubToken}`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) throw new Error(`GitHub ${resp.status} ${resp.statusText}`);
    const buf = Buffer.from(await resp.arrayBuffer());
    gh = await saveBuffer(base + `github-${CFG.githubRepo}-${CFG.githubBranch}.zip`, buf, "application/zip");
  } catch (e) {
    throw new functions.https.HttpsError("internal", `GitHub download failed: ${e.message || e}`);
  }

  // 3) Manifest
  const manifestObj = { id, timestamp: new Date().toISOString(), by: email,
    github: { owner: CFG.githubOwner, repo: CFG.githubRepo, branch: CFG.githubBranch },
    files: { realtime: rt, github: gh }, note: "Created by backupNow." };
  await saveBuffer(base + "manifest.json", Buffer.from(JSON.stringify(manifestObj, null, 2), "utf8"), "application/json");

  return { id, files: { realtime: rt, github: gh }, message: "Backup complete" };
});

// ── LIST: enumerate backups in Storage
exports.listBackups = functions.region("us-central1").https.onCall(async (_data, context) => {
  assertAuth(context);
  const [files] = await bucket.getFiles({ prefix: "backups/" });
  const map = new Map();
  for (const f of files) {
    const m = f.name.match(/^backups\/(.+?)\//); if (!m) continue;
    const id = m[1]; if (!map.has(id)) map.set(id, { id, files: {} });
    if (f.name.endsWith("realtime-db.json")) map.get(id).files.realtime = f.name;
    else if (f.name.endsWith(".zip")) map.get(id).files.github = f.name;
    else if (f.name.endsWith("manifest.json")) map.get(id).files.manifest = f.name;
  }
  const items = [];
  for (const [id, obj] of map) {
    const filesMeta = {};
    for (const [k, path] of Object.entries(obj.files)) {
      const [meta] = await bucket.file(path).getMetadata();
      filesMeta[k] = { path, size: Number(meta.size || 0), contentType: meta.contentType, url: await signedUrl(path) };
    }
    let timestamp = new Date(id.replace(/-/g, ":")).toISOString();
    if (filesMeta.manifest) {
      try {
        const [buf] = await bucket.file(filesMeta.manifest.path).download();
        const man = JSON.parse(buf.toString("utf8"));
        timestamp = man.timestamp || timestamp;
      } catch {}
    }
    items.push({ id, timestamp, files: filesMeta });
  }
  items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return { items };
});

// ── RESTORE from an existing backup (Storage -> RTDB)
exports.restoreFromBackup = functions.region("us-central1").https.onCall(async (data, context) => {
  assertAuth(context);
  const id = String(data?.id || "");
  if (!id) throw new functions.https.HttpsError("invalid-argument", "Missing backup id");

  const path = `backups/${id}/realtime-db.json`;
  try {
    // Safety snapshot (current DB -> Storage)
    const now = tsId();
    const snap = await admin.database().ref("/").get();
    await saveBuffer(`restores/safety-before-${now}.json`, Buffer.from(JSON.stringify(snap.val() ?? {}, null, 2), "utf8"), "application/json");

    const [buf] = await bucket.file(path).download();
    const obj = JSON.parse(buf.toString("utf8"));
    await admin.database().ref("/").set(obj);
    return { ok: true };
  } catch (e) {
    throw new functions.https.HttpsError("internal", `Restore failed: ${e.message || e}`);
  }
});

// ── RESTORE from uploaded JSON (client -> callable -> RTDB)
exports.restoreFromJson = functions.region("us-central1").https.onCall(async (data, context) => {
  assertAuth(context);
  const json = String(data?.json || "");
  if (!json) throw new functions.https.HttpsError("invalid-argument", "Missing JSON content");
  try {
    // Safety snapshot
    const now = tsId();
    const snap = await admin.database().ref("/").get();
    await saveBuffer(`restores/safety-before-${now}.json`, Buffer.from(JSON.stringify(snap.val() ?? {}, null, 2), "utf8"), "application/json");

    const obj = JSON.parse(json);
    await admin.database().ref("/").set(obj);
    return { ok: true };
  } catch (e) {
    throw new functions.https.HttpsError("internal", `Restore failed: ${e.message || e}`);
  }
});


// ====================================================================
// ADDITIONS: ping + purgeAnonymousUsers (region: us-central1)
// ====================================================================

/** Simple connectivity test */
exports.ping = functions
  .region("us-central1")
  .https.onCall(async (_data, _context) => {
    return { pong: true, at: Date.now() };
  });

/**
 * Purge anonymous accounts older than N days.
 * Requires an allowed email (reuses assertAuth).
 * Returns scanned/deleted/kept/failed counts for transparency.
 */
exports.purgeAnonymousUsers = functions
  .region("us-central1")
  // .runWith({ timeoutSeconds: 540, memory: "256MB" }) // optional
  .https.onCall(async (data, context) => {
    try {
      // Gate: only allowed emails (consistent with your other admin ops)
      assertAuth(context);

      const olderThanDays = Number(data?.olderThanDays ?? 30);
      if (!Number.isFinite(olderThanDays) || olderThanDays < 0) {
        throw new functions.https.HttpsError("invalid-argument", "olderThanDays must be a non-negative number.");
      }

      const cutoffMs = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

      let scanned = 0;
      let deleted = 0;
      let kept = 0;
      let failed = 0;
      let nextPageToken = undefined;

      do {
        const list = await admin.auth().listUsers(1000, nextPageToken);
        for (const u of list.users) {
          scanned++;

          const isAnon = !u.providerData || u.providerData.length === 0;
          const createdMs = new Date(u.metadata.creationTime).getTime();

          if (isAnon && createdMs < cutoffMs) {
            try {
              await admin.auth().deleteUser(u.uid);
              deleted++;
            } catch (err) {
              failed++;
              console.error("deleteUser failed", u.uid, err?.message || err);
            }
          } else {
            kept++;
          }
        }
        nextPageToken = list.pageToken;
      } while (nextPageToken);

      return { ok: true, olderThanDays, scanned, deleted, kept, failed };
    } catch (err) {
      console.error("purgeAnonymousUsers error", err);
      if (err instanceof functions.https.HttpsError) throw err;
      throw new functions.https.HttpsError(
        "internal",
        err?.message || "Internal error",
        { name: err?.name, stack: err?.stack }
      );
    }
  });
