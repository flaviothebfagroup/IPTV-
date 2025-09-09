// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Admin with your project's default bucket & RTDB
admin.initializeApp();
const bucket = admin.storage().bucket();

// ---- GitHub repo to zip ----
const CFG = {
  githubOwner: "flaviothebfagroup",
  githubRepo: "IPTV-",
  githubBranch: "main",
  // If private, set: firebase functions:config:set backup.github_token="ghp_..."
  githubToken: (functions.config()?.backup?.github_token) || null,
};

function tsId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function signedUrl(path) {
  const [url] = await bucket.file(path).getSignedUrl({
    action: "read",
    expires: Date.now() + 1000 * 60 * 60 * 24 * 14, // 14 days
  });
  return url;
}

async function saveBuffer(path, buf, contentType) {
  await bucket.file(path).save(buf, {
    contentType,
    resumable: false,
    public: false,
  });
  const [meta] = await bucket.file(path).getMetadata();
  return {
    path,
    size: Number(meta.size || 0),
    contentType,
    url: await signedUrl(path),
  };
}

exports.backupNow = functions
  .region("us-central1")
  .https.onCall(async (_data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Sign in required");
    }

    const id = tsId();
    const base = `backups/${id}/`;

    // 1) Realtime Database JSON
    let rt;
    try {
      const snap = await admin.database().ref("/").get();
      const json = JSON.stringify(snap.val(), null, 2);
      rt = await saveBuffer(
        base + "realtime-db.json",
        Buffer.from(json, "utf8"),
        "application/json"
      );
    } catch (e) {
      throw new functions.https.HttpsError(
        "internal",
        `RTDB export failed: ${e.message || e}`
      );
    }

    // 2) GitHub ZIP (no axios; use native fetch in Node 20)
    let gh;
    try {
      const url = `https://api.github.com/repos/${CFG.githubOwner}/${CFG.githubRepo}/zipball/${CFG.githubBranch}`;
      const headers = { "User-Agent": "BFA-Backup" };
      if (CFG.githubToken) headers["Authorization"] = `token ${CFG.githubToken}`;

      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        throw new Error(`GitHub ${resp.status} ${resp.statusText}`);
      }
      const buf = Buffer.from(await resp.arrayBuffer());
      gh = await saveBuffer(
        base + `github-${CFG.githubRepo}-${CFG.githubBranch}.zip`,
        buf,
        "application/zip"
      );
    } catch (e) {
      throw new functions.https.HttpsError(
        "internal",
        `GitHub download failed: ${e.message || e}`
      );
    }

    // 3) Manifest
    try {
      const manifestObj = {
        id,
        timestamp: new Date().toISOString(),
        github: {
          owner: CFG.githubOwner,
          repo: CFG.githubRepo,
          branch: CFG.githubBranch,
        },
        files: { realtime: rt, github: gh },
        note: "Created by backupNow callable function.",
      };
      await saveBuffer(
        base + "manifest.json",
        Buffer.from(JSON.stringify(manifestObj, null, 2), "utf8"),
        "application/json"
      );
    } catch (e) {
      throw new functions.https.HttpsError(
        "internal",
        `Manifest write failed: ${e.message || e}`
      );
    }

    return { id, files: { realtime: rt, github: gh }, message: "Backup complete" };
  });

exports.listBackups = functions
  .region("us-central1")
  .https.onCall(async (_data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Sign in required");
    }

    const [files] = await bucket.getFiles({ prefix: "backups/" });
    const map = new Map();
    for (const f of files) {
      const m = f.name.match(/^backups\/(.+?)\//);
      if (!m) continue;
      const id = m[1];
      if (!map.has(id)) map.set(id, { id, files: {} });
      if (f.name.endsWith("realtime-db.json")) map.get(id).files.realtime = f.name;
      else if (f.name.endsWith(".zip")) map.get(id).files.github = f.name;
      else if (f.name.endsWith("manifest.json")) map.get(id).files.manifest = f.name;
    }

    const items = [];
    for (const [id, obj] of map) {
      const entry = { id, files: {} };
      for (const [k, path] of Object.entries(obj.files)) {
        const [meta] = await bucket.file(path).getMetadata();
        entry.files[k] = {
          path,
          size: Number(meta.size || 0),
          contentType: meta.contentType,
          url: await signedUrl(path),
        };
      }
      // Pick timestamp from manifest if present; else derive from id
      entry.timestamp = new Date(id.replace(/-/g, ":")).toISOString();
      if (entry.files.manifest) {
        try {
          const [buf] = await bucket.file(entry.files.manifest.path).download();
          const man = JSON.parse(buf.toString("utf8"));
          entry.timestamp = man.timestamp || entry.timestamp;
        } catch {}
      }
      items.push(entry);
    }

    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return { items };
  });
