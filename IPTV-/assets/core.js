<script type="module">
// assets/core.js
import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail,
  signOut, setPersistence, inMemoryPersistence
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  getDatabase, ref, get, set, update, remove, query, orderByChild, equalTo
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// ---- Firebase project (same as your working one) ----
export const firebaseConfig = {
  apiKey: "AIzaSyBLSRS9PELXoI0wRafYKG5tx_UoRSawQaY",
  authDomain: "iptv-bfa.firebaseapp.com",
  databaseURL: "https://iptv-bfa-default-rtdb.firebaseio.com",
  projectId: "iptv-bfa",
  storageBucket: "iptv-bfa.firebasestorage.app",
  messagingSenderId: "838790935867",
  appId: "1:838790935867:web:1860eac7dbeb7159e1b31e"
};

// ---- App singletons ----
export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getDatabase(app);

// ---- Tiny UI helpers (same look/feel you liked) ----
export const $  = (s, r=document) => r.querySelector(s);
export const $$ = (s, r=document) => r.querySelectorAll(s);
export function htmlEscape(s){ return String(s ?? '').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
export function toast(msg, err=false){ const t=$('#toast'); if(!t) return; t.textContent=msg; t.className='toast show'+(err?' err':''); setTimeout(()=>t.classList.remove('show'),2200); }
export const debounce = (fn,ms)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; };

// ---- Utilities reused across pages ----
export function makeDealerId(name){ const base=(name||'').toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,24); return base || ('dealer_' + Date.now()); }
export function initialsFromName(name){
  const raw=(name||'').trim(); if(!raw) return 'DS';
  let parts=raw.match(/[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]*/g)||raw.match(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g)||[];
  let a=parts[0]||'', b=parts[1]||''; let p=(a? a[0]:'')+(b? b[0]:''); if(p.length<2 && a.length>=2) p=a.slice(0,2);
  return p.toUpperCase();
}
export function nextSuffix(list,pref){
  let max=0; list.forEach(id=>{ const m=id.match(new RegExp('^'+pref+'-(\\d{3})$')); if(m){ const n=parseInt(m[1],10); if(n>max) max=n; }});
  return max+1;
}

// ---- Dealership helpers ----
export async function loadDealersMap(){
  let map={};
  try{ const pub=await get(ref(db,'dealershipPublic')); if(pub.exists()) map=Object.fromEntries(Object.entries(pub.val()).map(([k,v])=>[k,v?.name||k])); }catch(e){}
  if(!Object.keys(map).length){ try{ const d=await get(ref(db,'dealership')); if(d.exists()) map=Object.fromEntries(Object.entries(d.val()).map(([k,v])=>[k,v?.name||k])); }catch(e){} }
  return map;
}
export async function collectDisplays(did){
  const qRef=query(ref(db,'displays'),orderByChild('dealership'),equalTo(did));
  const s=await get(qRef); return Object.keys(s.val()||{});
}
export async function migrateDealerId(oldId,newId,publicNameIfKnown){
  const exists=await get(ref(db,`dealership/${newId}`)); if(exists.exists()) throw new Error('Target ID exists');
  const pubName= publicNameIfKnown ?? (await get(ref(db,`dealershipPublic/${oldId}`))).val()?.name ?? oldId;

  // copy public
  await set(ref(db,`dealershipPublic/${newId}`),{ name: pubName });

  // copy displays index
  const idxSnap=await get(ref(db,`dealership/${oldId}/displays`)); const idxMap=idxSnap.val()||{};
  if(Object.keys(idxMap).length){ await set(ref(db,`dealership/${newId}/displays`),idxMap); }

  // retag displays node
  const qRef=query(ref(db,'displays'),orderByChild('dealership'),equalTo(oldId));
  const ds=await get(qRef); const dispMap=ds.val()||{};
  for(const did of Object.keys(dispMap)){
    await update(ref(db,`displays/${did}`),{ dealership:newId, timestamp:Date.now() });
  }

  // move users to new dealership
  const us=await get(ref(db,'user')); const users=us.val()||{};
  for(const uid of Object.keys(users)){
    if(users[uid]?.dealershipId===oldId){
      await update(ref(db,`user/${uid}`),{ dealershipId:newId, dealershipName:pubName });
    }
  }

  // delete old nodes
  await remove(ref(db,`dealership/${oldId}`)).catch(()=>{});
  await remove(ref(db,`dealershipPublic/${oldId}`)).catch(()=>{});
}

// ---- User creation (fixed) ----
/**
 * Creates a Firebase Auth user with default password "123456789",
 * writes /user/{uid} in Realtime DB, and keeps the current admin logged in.
 * Returns { uid } on success.
 */
export async function createUserAdminSafe({email, name, role, dealershipId}){
  if(!email || !name || !role || !dealershipId) throw new Error('Missing fields');

  // Secondary app so we don't sign out the admin
  const tempName='admin-create-'+Date.now();
  const tempApp=initializeApp(firebaseConfig, tempName);
  const tempAuth=getAuth(tempApp);
  await setPersistence(tempAuth, inMemoryPersistence); // critical fix

  try{
    // create auth account
    const DEFAULT_PASS='123456789';
    const cred=await createUserWithEmailAndPassword(tempAuth,email,DEFAULT_PASS);
    const uid=cred.user.uid;

    // find dealer friendly name + displays
    let dname=dealershipId;
    try{ const p=await get(ref(db,`dealershipPublic/${dealershipId}`)); if(p.exists()) dname=p.val()?.name||dealershipId; }catch(e){}
    let displays=[]; const ds=await get(ref(db,`dealership/${dealershipId}/displays`)); if(ds.exists()) displays=Object.keys(ds.val()||{});

    // write user doc (minimal but complete)
    await set(ref(db,`user/${uid}`),{
      email, name, role,
      dealershipId, dealershipName:dname,
      displays,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    return { uid };
  }finally{
    try{ await signOut(tempAuth);}catch(e){}
    try{ await deleteApp(tempApp);}catch(e){}
  }
}

// ---- Expose Firebase utils you already use in page scripts ----
export {
  getAuth, sendPasswordResetEmail, signOut,
  getDatabase, ref, get, set, update, remove, query, orderByChild, equalTo
};
</script>
