// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const { PassThrough } = require("stream");

admin.initializeApp();
const bucket = admin.storage().bucket();

// ---- GitHub repo to zip ----
const CFG = {
  githubOwner: "flaviothebfagroup",
  githubRepo: "IPTV-",
  githubBranch: "main",
  // If your repo is private, set functions config backup.github_token and it will be used:
  githubToken: (functions.config()?.backup?.github_token) || null,
};

function tsId(){
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function signedUrl(path){
  const [url] = await bucket.file(path).getSignedUrl({
    action: "read",
    expires: Date.now() + 1000*60*60*24*14, // 14 days
  });
  return url;
}

async function saveBuffer(path, buf, contentType){
  await bucket.file(path).save(buf, { contentType, resumable: false, public: false });
  const [meta] = await bucket.file(path).getMetadata();
  return { path, size: Number(meta.size||0), contentType, url: await signedUrl(path) };
}

async function streamToGCS(path, stream, contentType){
  const dest = bucket.file(path).createWriteStream({ metadata: { contentType } });
  return new Promise((resolve, reject)=>{
    stream.pipe(dest)
      .on("error", reject)
      .on("finish", async ()=>{
        try{
          const [meta] = await bucket.file(path).getMetadata();
          resolve({ path, size: Number(meta.size||0), contentType, url: await signedUrl(path) });
        }catch(e){ reject(e); }
      });
  });
}

exports.backupNow = functions.region("us-central1").https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in required");
  }

  const id = tsId();
  const base = `backups/${id}/`;

  // 1) Realtime Database JSON
  const snap = await admin.database().ref("/").get();
  const json = JSON.stringify(snap.val(), null, 2);
  const rt = await saveBuffer(base + "realtime-db.json", Buffer.from(json), "application/json");

  // 2) GitHub ZIP
  const zipUrl = `https://api.github.com/repos/${CFG.githubOwner}/${CFG.githubRepo}/zipball/${CFG.githubBranch}`;
  const headers = { "User-Agent": "BFA-Backup" };
  if (CFG.githubToken) headers["Authorization"] = `token ${CFG.githubToken}`;
  const resp = await axios.get(zipUrl, { responseType: "stream", headers });
  const gh = await streamToGCS(
    base + `github-${CFG.githubRepo}-${CFG.githubBranch}.zip`,
    resp.data.pipe(new PassThrough()),
    "application/zip"
  );

  // 3) Manifest
  const manifestObj = {
    id,
    timestamp: new Date().toISOString(),
    github: { owner: CFG.githubOwner, repo: CFG.githubRepo, branch: CFG.githubBranch },
    files: { realtime: rt, github: gh },
    note: "Created by backupNow callable function."
  };
  const manifest = await saveBuffer(base + "manifest.json", Buffer.from(JSON.stringify(manifestObj, null, 2)), "application/json");

  return { id, files: { realtime: rt, github: gh, manifest }, message: "Backup complete" };
});

exports.listBackups = functions.region("us-central1").https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in required");
  }

  const [files] = await bucket.getFiles({ prefix: "backups/" });
  const map = new Map();
  for (const f of files){
    const m = f.name.match(/^backups\/(.+?)\//);
    if (!m) continue;
    const id = m[1];
    if (!map.has(id)) map.set(id, { id, files: {} });
    if (f.name.endsWith("realtime-db.json")) map.get(id).files.realtime = f.name;
    else if (f.name.endsWith(".zip")) map.get(id).files.github = f.name;
    else if (f.name.endsWith("manifest.json")) map.get(id).files.manifest = f.name;
  }

  const items = [];
  for (const [id, obj] of map){
    const filesMeta = {};
    for (const [k, path] of Object.entries(obj.files)){
      const [meta] = await bucket.file(path).getMetadata();
      filesMeta[k] = {
        path,
        size: Number(meta.size||0),
        contentType: meta.contentType,
        url: await signedUrl(path),
      };
    }
    let timestamp = new Date(id.replace(/-/g, ":")).toISOString();
    if (filesMeta.manifest){
      try{
        const [buf] = await bucket.file(filesMeta.manifest.path).download();
        const man = JSON.parse(buf.toString("utf8"));
        timestamp = man.timestamp || timestamp;
      }catch(e){}
    }
    items.push({ id, timestamp, files: filesMeta });
  }

  items.sort((a,b)=> new Date(b.timestamp) - new Date(a.timestamp));
  return { items };
});
