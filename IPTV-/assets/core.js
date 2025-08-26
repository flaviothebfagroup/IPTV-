// Core shared: Firebase init, theme, auth-guard, helpers
export const LOGO_URL = "https://flaviothebfagroup.github.io/IPTV-/icons/icon-512.png";
export const DEFAULT_LINKS = [
  { emoji:'🔥', title:'Firebase — Overview', href:'https://console.firebase.google.com/project/iptv-bfa/overview', desc:'Console home' },
  { emoji:'🗄️', title:'Firebase — Database', href:'https://console.firebase.google.com/project/iptv-bfa/database/iptv-bfa-default-rtdb/data', desc:'Realtime DB data' },
  { emoji:'👤', title:'Firebase — Auth', href:'https://console.firebase.google.com/project/iptv-bfa/authentication/users', desc:'Users & providers' },
  { emoji:'🐙', title:'GitHub Repo', href:'https://github.com/flaviothebfagroup/IPTV-', desc:'Source code' },
  { emoji:'🌐', title:'GitHub Pages (Remote)', href:'https://flaviothebfagroup.github.io/IPTV-/remote-control.html', desc:'Open remote' },
  { emoji:'📧', title:'Gmail', href:'https://mail.google.com/mail/u/0/#inbox', desc:'Primary inbox' },
  { emoji:'📧', title:'Outlook', href:'https://outlook.office.com/mail/', desc:'Office 365 inbox' },
  { emoji:'✅', title:'Trello — Digital Team', href:'https://trello.com/b/jHjTIrZG/digital-team', desc:'Board' },
  { emoji:'🎛️', title:'BSN.cloud', href:'https://app.bsn.cloud/#/dashboard', desc:'BrightSign dashboard' },
  { emoji:'🖥️', title:'Signagelive', href:'https://login.signagelive.com/', desc:'CMS login' },
  { emoji:'📁', title:'Google Drive', href:'https://drive.google.com/drive/u/0/', desc:'My Drive' }
];

export const firebaseConfig = {
  apiKey: "AIzaSyBLSRS9PELXoI0wRafYKG5tx_UoRSawQaY",
  authDomain: "iptv-bfa.firebaseapp.com",
  databaseURL: "https://iptv-bfa-default-rtdb.firebaseio.com",
  projectId: "iptv-bfa",
  storageBucket: "iptv-bfa.firebasestorage.app",
  messagingSenderId: "838790935867",
  appId: "1:838790935867:web:1860eac7dbeb7159e1b31e"
};

// Import Firebase CDN modules
import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getAuth, setPersistence, browserLocalPersistence, signInWithEmailAndPassword,
  onAuthStateChanged, sendPasswordResetEmail, signOut, createUserWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  getDatabase, ref, get, set, update, remove, onValue, query, orderByChild, equalTo
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Boot
export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getDatabase(app);

// Helpers
export const $  = s => document.querySelector(s);
export const $$ = s => document.querySelectorAll(s);
export function htmlEscape(s){ return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
export function toast(msg, err=false){ const t=$('#toast'); if(!t) return alert(msg); t.textContent=msg; t.className='toast show'+(err?' err':''); setTimeout(()=>t.classList.remove('show'),2200); }
export const debounce = (fn,ms)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; };

export function initialsFromName(name){ const raw=(name||'').trim(); if(!raw) return 'DS'; let parts=raw.match(/[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]*/g)||raw.match(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g)||[]; let a=parts[0]||'', b=parts[1]||''; let p=(a? a[0]:'')+(b? b[0]:''); if(p.length<2 && a.length>=2) p=a.slice(0,2); return p.toUpperCase(); }
export function nextSuffix(list,pref){ let max=0; list.forEach(id=>{ const m=id.match(new RegExp('^'+pref+'-(\\d{3})$')); if(m){ const n=parseInt(m[1],10); if(n>max) max=n; }}); return max+1; }
export function makeDealerId(name){ const base=(name||'').toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,24); return base || ('dealer_' + Date.now()); }

// Theme
export function setupTheme(){
  const saved = localStorage.getItem('iptv_theme') || 'light';
  document.body.classList.toggle('light', saved==='light');
  $('#themeBtn')?.addEventListener('click', ()=>{
    const isLight = !document.body.classList.contains('light');
    document.body.classList.toggle('light', isLight);
    localStorage.setItem('iptv_theme', isLight ? 'light' : 'dark');
  });
  const logo = $('#brandLogo'); if(logo) logo.style.backgroundImage = `url("${LOGO_URL}")`;
}

// Auth guard (redirect to home if not logged or not admin when needed)
export function guardAdminOrRedirect(){
  return new Promise(resolve=>{
    onAuthStateChanged(auth, async (user)=>{
      if(!user){ location.href='home.html'; return; }
      $('#adminEmail') && ($('#adminEmail').textContent = user.email || user.uid);
      try{
        const uSnap = await get(ref(db, `user/${user.uid}`));
        const u = uSnap.val() || {};
        if(u.role !== 'admin'){ location.href='home.html'; return; }
      }catch(e){ /* fallback to home */ location.href='home.html'; return; }
      resolve(user);
    });
  });
}

// Simple login used on home.html
export async function doLogin(email, pass){
  if(!email||!pass) { toast('Fill email & password', true); return; }
  try{
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth,email,pass);
  }catch(e){ console.error(e); toast('Sign-in failed', true); }
}

export function signOutNow(){ signOut(auth); }

// Dealer rename (migrate)
export async function migrateDealerId(oldId,newId,name){
  const exists=await get(ref(db,`dealership/${newId}`)); if(exists.exists()) throw new Error('Target ID exists');
  const pubName=name || (await get(ref(db,`dealershipPublic/${oldId}`))).val()?.name || oldId;
  await set(ref(db,`dealershipPublic/${newId}`),{name:pubName});
  const idxSnap=await get(ref(db,`dealership/${oldId}/displays`)); const idxMap=idxSnap.val()||{};
  if(Object.keys(idxMap).length){ await set(ref(db,`dealership/${newId}/displays`),idxMap); }
  const qRef=query(ref(db,'displays'),orderByChild('dealership'),equalTo(oldId)); const ds=await get(qRef); const dispMap=ds.val()||{};
  for(const did of Object.keys(dispMap)){ await update(ref(db,`displays/${did}`),{dealership:newId,timestamp:Date.now()}); }
  const us=await get(ref(db,'user')); const users=us.val()||{};
  for(const uid of Object.keys(users)){ if(users[uid]?.dealershipId===oldId){ await update(ref(db,`user/${uid}`),{dealershipId:newId,dealershipName:pubName}); } }
  await remove(ref(db,`dealership/${oldId}`)); await remove(ref(db,`dealershipPublic/${oldId}`));
}

// Backup snapshot helper
export async function snapshot(){
  const [dealersPubSnap, displaysSnap, usersSnap] = await Promise.all([
    get(ref(db,'dealershipPublic')).catch(()=>({val:()=>null})),
    get(ref(db,'displays')).catch(()=>({val:()=>null})),
    get(ref(db,'user')).catch(()=>({val:()=>null}))
  ]);
  const compactUsers={}; const u = usersSnap?.val?.() || {};
  Object.entries(u).forEach(([uid,v])=>{
    compactUsers[uid] = { email:v.email||null, name:v.name||null, role:v.role||'user', dealershipId:v.dealershipId||null };
  });
  return {
    meta: { generatedAt:new Date().toISOString(), by: auth.currentUser?.email||'admin', format:'iptv-bfa@1' },
    dealersPublic: dealersPubSnap?.val?.() || {},
    displays:      displaysSnap?.val?.()      || {},
    users:         compactUsers
  };
}

// Expose modules needed by pages
export const fb = { initializeApp, deleteApp, getAuth, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signOut, createUserWithEmailAndPassword, getDatabase, ref, get, set, update, remove, onValue, query, orderByChild, equalTo };
