<script type="module">
// ---------- Firebase (CDN ESM) ----------
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getAuth, setPersistence, browserLocalPersistence, signInWithEmailAndPassword,
  onAuthStateChanged, sendPasswordResetEmail, signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  getDatabase, ref, get, set, update, remove, query, orderByChild, equalTo
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// ---------- Config (same as your project) ----------
export const firebaseConfig = {
  apiKey: "AIzaSyBLSRS9PELXoI0wRafYKG5tx_UoRSawQaY",
  authDomain: "iptv-bfa.firebaseapp.com",
  databaseURL: "https://iptv-bfa-default-rtdb.firebaseio.com",
  projectId: "iptv-bfa",
  storageBucket: "iptv-bfa.firebasestorage.app",
  messagingSenderId: "838790935867",
  appId: "1:838790935867:web:1860eac7dbeb7159e1b31e"
};

export const LOGO_URL = "https://flaviothebfagroup.github.io/IPTV-/icons/icon-512.png";

// ---------- Singletons ----------
export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getDatabase(app);

// ---------- Tiny helpers ----------
export const $  = (s)=>document.querySelector(s);
export const $$ = (s)=>document.querySelectorAll(s);
export function htmlEscape(s){ return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
export function toast(msg, err=false){ const t=$('#toast'); if(!t){ alert(msg); return; } t.textContent=msg; t.className='toast show'+(err?' err':''); setTimeout(()=>t.classList.remove('show'),2200); }
export function makeDealerId(name){ const base=(name||'').toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,24); return base || ('dealer_' + Date.now()); }

// ---------- Chrome (topbar/theme/buttons) ----------
export function initChrome(){
  $('#brandLogo')?.style && ($('#brandLogo').style.backgroundImage=`url("${LOGO_URL}")`);
  const savedTheme = localStorage.getItem('iptv_theme') || 'light';
  document.body.classList.toggle('light', savedTheme==='light');
  $('#themeBtn')?.addEventListener('click', ()=>{
    const isLight = !document.body.classList.contains('light');
    document.body.classList.toggle('light', isLight);
    localStorage.setItem('iptv_theme', isLight ? 'light' : 'dark');
  });
  $('#reloadBtn')?.addEventListener('click', ()=>location.reload());
  $('#signOutBtn')?.addEventListener('click', ()=>signOut(auth));
}

// ---------- Admin gate (reuse on each page) ----------
export async function requireAdmin(){
  return new Promise((resolve)=>{
    $('#loginBtn')?.addEventListener('click', async ()=>{
      const email=$('#email').value.trim(), pass=$('#password').value;
      if(!email||!pass) return toast('Fill email & password', true);
      try{ await setPersistence(auth, browserLocalPersistence); await signInWithEmailAndPassword(auth,email,pass); }
      catch(e){ console.error(e); toast('Sign-in failed', true); }
    });
    $('#resetBtn')?.addEventListener('click', async ()=>{
      const email=$('#email').value.trim(); if(!email) return toast('Enter email', true);
      try{ await sendPasswordResetEmail(auth,email); toast('Reset sent'); }catch(e){ toast('Reset failed', true); }
    });

    onAuthStateChanged(auth, async (user)=>{
      if(!user){
        $('#adminEmail') && ($('#adminEmail').textContent='');
        $('#loginBox') && ($('#loginBox').style.display='block');
        $('#pageRoot') && ($('#pageRoot').style.display='none'); 
        return;
      }
      $('#adminEmail') && ($('#adminEmail').textContent=user.email||user.uid);
      try{
        const uSnap=await get(ref(db,`user/${user.uid}`));
        if((uSnap.val()||{}).role==='admin'){
          $('#loginBox') && ($('#loginBox').style.display='none');
          $('#pageRoot') && ($('#pageRoot').style.display='block');
          resolve(user);
        }else{
          // not admin
          $('#loginBox') && ($('#loginBox').style.display='none');
          $('#pageRoot') && ($('#pageRoot').innerHTML='<div class="card"><h2>Not authorized</h2><div class="muted small">Ask an admin to grant role <b>admin</b>.</div></div>');
        }
      }catch(e){ console.error(e); toast('Admin check failed', true); }
    });
  });
}

// ---------- Dealership utilities (used by dealerships.html) ----------
export async function getDealersMap(){
  let map={};
  try{ const pub=await get(ref(db,'dealershipPublic')); if(pub.exists()) map=pub.val(); }catch(_){}
  if(!Object.keys(map).length){
    try{ const d=await get(ref(db,'dealership')); if(d.exists()){ const raw=d.val(); for(const id of Object.keys(raw)) map[id]={name:raw[id]?.name||id}; } }catch(_){}
  }
  return map; // {id:{name}}
}

export async function countDisplaysForDealer(did){
  let n=0;
  try{
    const m=await get(ref(db,`dealership/${did}/displays`)); if(m.exists()) n=Object.keys(m.val()||{}).length;
    if(n===0){ const qRef=query(ref(db,'displays'),orderByChild('dealership'),equalTo(did)); const q=await get(qRef); if(q.exists()) n=Object.keys(q.val()||{}).length; }
  }catch(_){}
  return n;
}

export async function createDealership(name){
  const id = makeDealerId(name);
  const dealer = { name, createdAt: Date.now(), createdBy: auth.currentUser?.email || 'admin', displays:{} };
  await set(ref(db,`dealership/${id}`), dealer);
  try{ await set(ref(db,`dealershipPublic/${id}`), { name }); }catch(_){}
  return id;
}

// Safe rename. If newId exists, merges old into new.
export async function migrateDealerId(oldId,newId,pubNameFromUI){
  if(!newId || newId===oldId) throw new Error('Same ID');
  const dealRef    =(id)=>ref(db,`dealership/${id}`);
  const dealPubRef =(id)=>ref(db,`dealershipPublic/${id}`);

  const pubName = pubNameFromUI || (await get(dealPubRef(oldId)).catch(()=>({val:()=>null}))).val()?.name || oldId;
  const targetExists = (await get(dealRef(newId))).exists();

  if(targetExists){
    // confirm merge is handled in page; here we just do it.
    const oldIdx = (await get(ref(db,`dealership/${oldId}/displays`))).val()||{};
    const newIdx = (await get(ref(db,`dealership/${newId}/displays`))).val()||{};
    const merged = { ...newIdx, ...oldIdx };
    if(Object.keys(merged).length){ await set(ref(db,`dealership/${newId}/displays`), merged); }

    const qRef=query(ref(db,'displays'),orderByChild('dealership'),equalTo(oldId));
    const ds=(await get(qRef)).val()||{};
    for(const did of Object.keys(ds)){ await update(ref(db,`displays/${did}`),{dealership:newId,timestamp:Date.now()}); }

    const users=(await get(ref(db,'user'))).val()||{};
    for(const uid of Object.keys(users)){ if(users[uid]?.dealershipId===oldId){ await update(ref(db,`user/${uid}`),{dealershipId:newId,dealershipName:pubName}); } }

    try{
      const current= (await get(dealPubRef(newId)).catch(()=>({val:()=>null}))).val();
      await set(dealPubRef(newId), { name: current?.name || pubName });
    }catch(_){}
    await remove(ref(db,`dealership/${oldId}`)).catch(()=>{});
    await remove(ref(db,`dealershipPublic/${oldId}`)).catch(()=>{});
    return;
  }

  // fresh rename
  try{ await set(dealPubRef(newId), { name: pubName }); }catch(_){}
  const oldIdx=(await get(ref(db,`dealership/${oldId}/displays`))).val()||{};
  if(Object.keys(oldIdx).length){ await set(ref(db,`dealership/${newId}/displays`), oldIdx); }

  const qRef=query(ref(db,'displays'),orderByChild('dealership'),equalTo(oldId));
  const ds=(await get(qRef)).val()||{};
  for(const did of Object.keys(ds)){ await update(ref(db,`displays/${did}`),{dealership:newId,timestamp:Date.now()}); }

  const users=(await get(ref(db,'user'))).val()||{};
  for(const uid of Object.keys(users)){ if(users[uid]?.dealershipId===oldId){ await update(ref(db,`user/${uid}`),{dealershipId:newId,dealershipName:pubName}); } }

  await remove(ref(db,`dealership/${oldId}`)).catch(()=>{});
  await remove(ref(db,`dealershipPublic/${oldId}`)).catch(()=>{});
}

export async function updatePublicName(id,nextName){
  try{ await set(ref(db,`dealershipPublic/${id}`),{name:nextName}); }catch(_){}
  try{ await update(ref(db,`dealership/${id}`),{name:nextName}); }catch(_){}
}

// (Optional) tiny query helper re-exports for pages if needed
export { ref, get, set, update, remove, query, orderByChild, equalTo } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';





// ===== BFA shared shell init (safe to include everywhere)
(function(){
  if (window.BFA_SHELL_INIT) return; window.BFA_SHELL_INIT = true;

  // Load logo(s) if present
  const LOGO_URL = "https://flaviothebfagroup.github.io/IPTV-/icons/icon-512.png";
  document.getElementById('brandLogo') && (document.getElementById('brandLogo').style.backgroundImage = `url("${LOGO_URL}")`);
  document.getElementById('brandLogoM') && (document.getElementById('brandLogoM').style.backgroundImage = `url("${LOGO_URL}")`);

  // Active nav pill by filename/title
  (function(){
    const file=(location.pathname.split('/').pop()||'').toLowerCase();
    const map={"":"home","/":"home","index.html":"home","home.html":"home","dealerships.html":"dealerships","displays.html":"displays","users.html":"users","links.html":"links","analytics.html":"analytics","schedule.html":"schedule"};
    let key=map[file]||(/dealer/i.test(document.title)?"dealerships":/display/i.test(document.title)?"displays":/user/i.test(document.title)?"users":/link/i.test(document.title)?"links":/analytic/i.test(document.title)?"analytics":/schedule/i.test(document.title)?"schedule":"home");
    document.querySelectorAll(`[data-page="${key}"]`).forEach(a=>a.classList.add("is-active"));
  })();

  // Mobile sheet open/close
  (function(){
    const sh=document.getElementById('sheet');
    if(!sh) return;
    const open=()=>{sh.classList.add("open"); document.body.style.overflow="hidden";};
    const close=()=>{sh.classList.remove("open"); document.body.style.overflow="";};
    document.getElementById('hamburger')?.addEventListener('click',open);
    document.getElementById('closeSheet')?.addEventListener('click',close);
    sh.querySelector('.back')?.addEventListener('click',close);

    // Sync logout
    const main=document.getElementById('logoutBtn'), mob=document.getElementById('logoutBtnM');
    if(main && mob) mob.addEventListener('click',()=>main.click());
  })();

  // Auto-compact if nav doesn’t fit
  (function(){
    const row=document.getElementById('toprow'); if(!row) return;
    const brand=row.querySelector('.brand'), nav=row.querySelector('.nav'), actions=row.querySelector('.actionsTop');
    function fit(){
      const total=row.clientWidth, avail=total-brand.offsetWidth-actions.offsetWidth-24, need=nav.scrollWidth;
      if(need>avail) row.classList.add('compact'); else row.classList.remove('compact');
    }
    window.addEventListener('resize',fit,{passive:true});
    new ResizeObserver(fit).observe(document.body);
    fit();
  })();
})();



</script>
