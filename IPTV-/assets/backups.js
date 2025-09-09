import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";

// ===== YOUR CONFIG (filled) =====
export const firebaseConfig = {
  apiKey: "AIzaSyBLSRS9PELXoI0wRafYKG5tx_UoRSawQaY",
  authDomain: "iptv-bfa.firebaseapp.com",
  databaseURL: "https://iptv-bfa-default-rtdb.firebaseio.com",
  projectId: "iptv-bfa",
  storageBucket: "iptv-bfa.appspot.com",
  messagingSenderId: "838790935867",
  appId: "1:838790935867:web:1860eac7dbeb7159e1b31e"
};
export const CF_REGION = "us-central1";
// =================================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app, CF_REGION);

// Callables
const backupNow         = httpsCallable(functions, "backupNow");
const listBackups       = httpsCallable(functions, "listBackups");
const restoreFromBackup = httpsCallable(functions, "restoreFromBackup");
const restoreFromJson   = httpsCallable(functions, "restoreFromJson");

// UI elements
const authDot   = document.getElementById("authDot");
const authText  = document.getElementById("authText");
const userText  = document.getElementById("userText");
const signinBtn = document.getElementById("signinBtn");
const signoutBtn= document.getElementById("signoutBtn");
const bkDot     = document.getElementById("bkDot");
const bkText    = document.getElementById("bkText");
const backupBtn = document.getElementById("backupBtn");
const refreshBtn= document.getElementById("refreshBtn");
const rows      = document.getElementById("rows");
const logEl     = document.getElementById("log");
const restoreSelectedBtn = document.getElementById("restoreFromSelectedBtn");
const restoreFromFileBtn = document.getElementById("restoreFromFileBtn");
const jsonFileInput      = document.getElementById("jsonFile");

let selectedBackupId = null;

function log(msg){
  const time = new Date().toLocaleTimeString();
  logEl.textContent += `[${time}] ${msg}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

function setBusy(b){
  backupBtn.disabled = b; refreshBtn.disabled = b; restoreSelectedBtn.disabled = b || !selectedBackupId;
  bkDot.className = "dot " + (b ? "warn" : "ok");
  bkText.textContent = b ? "Working…" : "Ready";
}

// Auth wiring
onAuthStateChanged(auth, user => {
  if (user){
    authDot.className = "dot ok";
    authText.textContent = "Signed in";
    userText.textContent = user.email || user.uid;
    signinBtn.hidden = true; signoutBtn.hidden = false;
    loadBackups();
  } else {
    authDot.className = "dot err";
    authText.textContent = "Not signed in";
    userText.textContent = "Please sign in to use backups";
    signinBtn.hidden = false; signoutBtn.hidden = true;
    rows.innerHTML = "";
  }
});

signinBtn?.addEventListener("click", async () => {
  try{ await signInWithPopup(auth, new GoogleAuthProvider()); }
  catch(e){ alert(e.message); }
});

signoutBtn?.addEventListener("click", async () => { await signOut(auth); });

// Actions
backupBtn?.addEventListener("click", async () => {
  setBusy(true); log("Starting backup…");
  try{
    const { data } = await backupNow();
    log("Backup complete: " + data.id);
    await loadBackups();
  }catch(e){
    console.error(e);
    alert(e.message || "Backup failed");
    log("Error: " + (e.message || e));
  }finally{ setBusy(false); }
});

refreshBtn?.addEventListener("click", loadBackups);

// Restore selected
restoreSelectedBtn?.addEventListener("click", async () => {
  if (!selectedBackupId) return;
  if (!confirm(`Restore backup ${selectedBackupId}?\nThis overwrites the entire database.`)) return;
  setBusy(true); log(`Restoring from backup ${selectedBackupId}…`);
  try{
    await restoreFromBackup({ id: selectedBackupId });
    log("Restore complete.");
    alert("Restore complete.");
  }catch(e){
    console.error(e); log("Error: " + (e.message || e)); alert(e.message || "Restore failed");
  }finally{ setBusy(false); }
});

// Restore from JSON file
restoreFromFileBtn?.addEventListener("click", () => jsonFileInput.click());
jsonFileInput?.addEventListener("change", async (ev) => {
  const file = ev.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  if (!confirm("Restore from selected JSON file?\nThis overwrites the entire database.")) return;
  setBusy(true); log("Restoring from uploaded JSON…");
  try{
    await restoreFromJson({ json: text }); // note: ~10MB payload limit
    log("Restore complete.");
    alert("Restore complete.");
  }catch(e){
    console.error(e); log("Error: " + (e.message || e)); alert(e.message || "Restore failed");
  }finally{ setBusy(false); ev.target.value = ""; }
});

async function loadBackups(){
  setBusy(true);
  try{
    const { data } = await listBackups();
    const items = data.items || [];
    rows.innerHTML = "";
    document.getElementById("countText").textContent = items.length + " total";
    for (const b of items){
      const tr = document.createElement("tr");
      const when = new Date(b.timestamp).toLocaleString();
      const sizes = `${fmtSize(b.files.realtime?.size)} • ${fmtSize(b.files.github?.size)}`;
      tr.innerHTML = `
        <td>${when}</td>
        <td>
          <div>RTDB JSON</div>
          <div>GitHub ZIP</div>
          <div class="muted">${b.id}</div>
        </td>
        <td>${sizes}</td>
        <td>
          <div class="actions">
            <a class="btn" href="${b.files.realtime?.url}" target="_blank" rel="noreferrer">DB</a>
            <a class="btn" href="${b.files.github?.url}" target="_blank" rel="noreferrer">Code</a>
            <a class="btn" href="${b.files.manifest?.url}" target="_blank" rel="noreferrer">Info</a>
          </div>
        </td>
        <td>
          <input type="radio" name="pick" value="${b.id}" aria-label="Select ${b.id}">
        </td>`;
      rows.appendChild(tr);
    }
    if (!items.length){
      rows.innerHTML = `<tr><td colspan="5" class="muted">No backups yet.</td></tr>`;
    }
    rows.addEventListener("change", (e) => {
      const r = e.target;
      if (r && r.name === "pick"){
        selectedBackupId = r.value;
        restoreSelectedBtn.disabled = false;
      }
    }, { once: true });
  }catch(e){
    console.error(e);
    alert(e.message || "Failed to load backups");
  }finally{ setBusy(false); }
}

function fmtSize(n){
  if(!n && n!==0) return "—";
  const KB=1024, MB=KB*1024;
  return n>MB? (n/MB).toFixed(1)+" MB" : n>KB? (n/KB).toFixed(1)+" KB" : n+" B";
}
