const ICONS = {
  instagram: "📸",
  youtube: "▶",
  website: "🌐",
  linkedin: "💼",
  tiktok: "🎵",
  facebook: "📘",
  other: "🔗"
};

const SOCIAL_TYPES = ["instagram", "website", "linkedin", "youtube", "tiktok", "facebook"];

const $ = (id) => document.getElementById(id);
const LS_KEY = "bfa_links_draft_friendly_v1";

let state = null;
let saveTimer = null;

function setStatus(msg){
  const s = $("status");
  if (s) s.textContent = msg || "";
  const ms = $("mobileStatus");
  if (ms) ms.textContent = msg || "Ready";
}

function defaultState(){
  return {
    profile: { name: "The BFA Group", avatar: "./assets/logo.png", bio: "" },
    socials: [{ type: "instagram", url: "" }, { type: "website", url: "" }],
    links: [{ title: "Website", subtitle: "", url: "", thumb: "", badge: "" }],
    footerText: ""
  };
}

function normalizeAssetPath(p){
  if (!p) return "";
  const s = String(p).trim();
  if (s.startsWith("/assets/")) return "." + s;
  return s;
}

function guessTypeFromUrl(url){
  if (!url) return "other";
  try{
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("instagram.com")) return "instagram";
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    if (host.includes("linkedin.com")) return "linkedin";
    if (host.includes("tiktok.com")) return "tiktok";
    if (host.includes("facebook.com")) return "facebook";
    return "website";
  }catch{
    return "other";
  }
}

function debounceSave(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try{
      localStorage.setItem(LS_KEY, JSON.stringify(state));
      setStatus("Draft saved. Download links.json when ready.");
    }catch{
      setStatus("Could not auto-save draft (browser blocked storage).");
    }
  }, 350);
}

function readFileAsDataURL(file){
  return new Promise((resolve, reject)=>{
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* ---------- Preview rendering ---------- */
function createSocialEl({type,url}){
  const a = document.createElement("a");
  a.className = "social";
  a.href = url || "#";
  a.target = "_blank";
  a.rel = "noopener";
  a.setAttribute("aria-label", type || "social");
  a.innerHTML = `<span style="font-size:16px">${ICONS[type] || ICONS.other}</span>`;
  if(!url) a.style.opacity = "0.55";
  return a;
}

function createLinkEl(item){
  const a = document.createElement("a");
  a.className = "link";
  a.href = item.url || "#";
  a.target = "_blank";
  a.rel = "noopener";
  if(!item.url) a.style.opacity = "0.75";

  const thumb = document.createElement(item.thumb ? "img" : "div");
  thumb.className = "thumb";
  if (item.thumb) {
    thumb.src = normalizeAssetPath(item.thumb);
    thumb.alt = "";
    thumb.loading = "lazy";
  } else {
    const t = guessTypeFromUrl(item.url);
    thumb.style.display = "grid";
    thumb.style.placeItems = "center";
    thumb.style.fontSize = "18px";
    thumb.style.color = "rgba(10,10,12,0.70)";
    thumb.textContent = ICONS[t] || ICONS.other;
  }

  const main = document.createElement("div");
  main.className = "linkMain";

  const titleRow = document.createElement("div");
  titleRow.className = "titleRow";

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = item.title || "Untitled";
  titleRow.appendChild(title);

  if (item.badge) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = item.badge;
    titleRow.appendChild(badge);
  }

  main.appendChild(titleRow);

  if (item.subtitle) {
    const sub = document.createElement("div");
    sub.className = "subtitle";
    sub.textContent = item.subtitle;
    main.appendChild(sub);
  }

  const chev = document.createElement("div");
  chev.className = "chev";
  chev.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`;

  a.appendChild(thumb);
  a.appendChild(main);
  a.appendChild(chev);
  return a;
}

function renderPreview(){
  $("v_name").textContent = state.profile?.name || "Links";
  $("v_bio").textContent = state.profile?.bio || "";
  $("v_footer").textContent = state.footerText || "";

  const av = $("v_avatar");
  av.src = normalizeAssetPath(state.profile?.avatar || "");
  av.alt = (state.profile?.name || "Profile") + " logo";

  const sWrap = $("v_socials");
  sWrap.innerHTML = "";
  (state.socials || []).forEach(s => sWrap.appendChild(createSocialEl(s)));

  const lWrap = $("v_links");
  lWrap.innerHTML = "";
  (state.links || []).forEach(l => lWrap.appendChild(createLinkEl(l)));
}

/* ---------- UI ---------- */
function renderProfile(){
  $("p_name").value = state.profile?.name || "";
  $("p_avatar").value = state.profile?.avatar || "";
  $("p_bio").value = state.profile?.bio || "";
}

function renderSocials(){
  const wrap = $("socialList");
  wrap.innerHTML = "";

  (state.socials || []).forEach((s, idx) => {
    const card = document.createElement("div");
    card.className = "linkCard";

    const head = document.createElement("div");
    head.className = "linkCardHead";

    const left = document.createElement("div");
    left.className = "linkLeft";

    const emoji = document.createElement("div");
    emoji.className = "linkEmoji";
    emoji.textContent = ICONS[s.type] || ICONS.other;

    const name = document.createElement("div");
    name.className = "linkName";
    name.textContent = `Icon #${idx+1}`;

    left.appendChild(emoji);
    left.appendChild(name);

    const btns = document.createElement("div");
    btns.className = "miniBtns";

    const remove = document.createElement("button");
    remove.className = "btnMini btnMiniDanger";
    remove.type = "button";
    remove.textContent = "Remove";
    remove.onclick = () => {
      state.socials.splice(idx, 1);
      renderAll();
      debounceSave();
    };

    btns.appendChild(remove);

    head.appendChild(left);
    head.appendChild(btns);

    const grid = document.createElement("div");
    grid.className = "grid2";

    // type
    const fType = document.createElement("div");
    fType.className = "field";
    const l1 = document.createElement("label");
    l1.textContent = "Type";
    const sel = document.createElement("select");
    SOCIAL_TYPES.forEach(t => {
      const o = document.createElement("option");
      o.value = t;
      o.textContent = `${ICONS[t] || "🔗"} ${t}`;
      if (t === (s.type || "website")) o.selected = true;
      sel.appendChild(o);
    });
    sel.onchange = () => {
      state.socials[idx].type = sel.value;
      renderAll(false);
      debounceSave();
    };
    fType.appendChild(l1);
    fType.appendChild(sel);

    // url
    const fUrl = document.createElement("div");
    fUrl.className = "field";
    const l2 = document.createElement("label");
    l2.textContent = "URL";
    const input = document.createElement("input");
    input.placeholder = "https://...";
    input.value = s.url || "";
    input.oninput = () => {
      state.socials[idx].url = input.value;
      renderPreview();
      debounceSave();
    };
    fUrl.appendChild(l2);
    fUrl.appendChild(input);

    grid.appendChild(fType);
    grid.appendChild(fUrl);

    card.appendChild(head);
    card.appendChild(grid);
    wrap.appendChild(card);
  });
}

function renderLinks(){
  const wrap = $("linksList");
  wrap.innerHTML = "";

  (state.links || []).forEach((l, idx) => {
    const card = document.createElement("div");
    card.className = "linkCard";

    const head = document.createElement("div");
    head.className = "linkCardHead";

    const left = document.createElement("div");
    left.className = "linkLeft";

    const emoji = document.createElement("div");
    emoji.className = "linkEmoji";
    emoji.textContent = ICONS[guessTypeFromUrl(l.url)] || ICONS.other;

    const name = document.createElement("div");
    name.className = "linkName";
    name.textContent = l.title || `Button #${idx+1}`;

    left.appendChild(emoji);
    left.appendChild(name);

    const pill = document.createElement("span");
    const missing = !String(l.url || "").trim();
    pill.className = "pill " + (missing ? "pillWarn" : "pillOk");
    pill.textContent = missing ? "Missing URL" : "OK";

    const btns = document.createElement("div");
    btns.className = "miniBtns";

    const up = document.createElement("button");
    up.className = "btnMini";
    up.type = "button";
    up.textContent = "↑";
    up.disabled = idx === 0;
    up.onclick = () => moveLink(idx, -1);

    const down = document.createElement("button");
    down.className = "btnMini";
    down.type = "button";
    down.textContent = "↓";
    down.disabled = idx === state.links.length - 1;
    down.onclick = () => moveLink(idx, +1);

    const remove = document.createElement("button");
    remove.className = "btnMini btnMiniDanger";
    remove.type = "button";
    remove.textContent = "Remove";
    remove.onclick = () => {
      state.links.splice(idx, 1);
      renderAll();
      debounceSave();
    };

    btns.appendChild(up);
    btns.appendChild(down);
    btns.appendChild(remove);

    head.appendChild(left);
    head.appendChild(pill);
    head.appendChild(btns);

    const grid = document.createElement("div");
    grid.className = "grid2";

    grid.appendChild(makeField("Title", l.title || "", "e.g. Instagram", (v)=>{
      state.links[idx].title = v;
      renderLinks();
      renderPreview();
      debounceSave();
    }));

    grid.appendChild(makeField("URL", l.url || "", "https://...", (v)=>{
      state.links[idx].url = v;
      renderLinks();
      renderPreview();
      debounceSave();
    }));

    grid.appendChild(makeField("Subtitle (optional)", l.subtitle || "", "@handle or short text", (v)=>{
      state.links[idx].subtitle = v;
      renderPreview();
      debounceSave();
    }));

    grid.appendChild(makeField("Badge (optional)", l.badge || "", "YouTube", (v)=>{
      state.links[idx].badge = v;
      renderPreview();
      debounceSave();
    }));

    grid.appendChild(makeField("Thumbnail (optional)", l.thumb || "", "./assets/thumbs/retail.png", (v)=>{
      state.links[idx].thumb = normalizeAssetPath(v);
      renderPreview();
      debounceSave();
    }));

    card.appendChild(head);
    card.appendChild(grid);

    wrap.appendChild(card);
  });
}

function makeField(labelText, value, placeholder, onInput){
  const f = document.createElement("div");
  f.className = "field";
  const lab = document.createElement("label");
  lab.textContent = labelText;

  const input = document.createElement("input");
  input.value = value;
  input.placeholder = placeholder;
  input.oninput = () => onInput(input.value);

  f.appendChild(lab);
  f.appendChild(input);
  return f;
}

function moveLink(idx, dir){
  const n = idx + dir;
  if (n < 0 || n >= state.links.length) return;
  [state.links[idx], state.links[n]] = [state.links[n], state.links[idx]];
  renderAll();
  debounceSave();
}

function renderAll(full=true){
  if (full){
    renderProfile();
    renderLinks();
    renderSocials();
  }
  renderPreview();
}

/* ---------- Download / Import / Reset ---------- */
function downloadJson(){
  state.profile.avatar = normalizeAssetPath(state.profile.avatar);
  (state.links || []).forEach(l => l.thumb = normalizeAssetPath(l.thumb));

  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "links.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setStatus("Downloaded links.json — upload/replace it in your GitHub repo.");
}

async function loadInitial(){
  try{
    const saved = localStorage.getItem(LS_KEY);
    if (saved){
      state = JSON.parse(saved);
      setStatus("Loaded your saved draft from this browser.");
      renderAll(true);
      return;
    }
  }catch{}

  try{
    const res = await fetch("./links.json", { cache: "no-store" });
    state = await res.json();
    setStatus("Loaded current links.json from your site.");
  }catch{
    state = defaultState();
    setStatus("Could not load links.json. Using a new draft.");
  }

  renderAll(true);
}

function wire(){
  $("toggleBig").addEventListener("click", ()=>{
    const on = document.body.classList.toggle("edBig");
    $("toggleBig").setAttribute("aria-pressed", on ? "true" : "false");
  });

  $("p_name").addEventListener("input", (e)=>{
    state.profile.name = e.target.value;
    renderPreview();
    debounceSave();
  });

  $("p_avatar").addEventListener("input", (e)=>{
    state.profile.avatar = normalizeAssetPath(e.target.value);
    renderPreview();
    debounceSave();
  });

  $("p_bio").addEventListener("input", (e)=>{
    state.profile.bio = e.target.value;
    renderPreview();
    debounceSave();
  });

  $("p_avatar_file").addEventListener("change", async (e)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    try{
      const dataUrl = await readFileAsDataURL(file);
      state.profile.avatar = dataUrl;
      $("p_avatar").value = dataUrl;
      renderPreview();
      debounceSave();
      setStatus("Logo embedded. Download links.json when ready.");
    }catch{
      setStatus("Could not read that image file.");
    }finally{
      e.target.value = "";
    }
  });

  $("addLink").addEventListener("click", ()=>{
    state.links.push({ title: "New link", subtitle: "", url: "", thumb: "", badge: "" });
    renderAll(true);
    debounceSave();
  });

  $("qa_website").addEventListener("click", ()=>{
    state.links.push({ title: "Website", subtitle: "", url: "https://", thumb: "", badge: "" });
    renderAll(true); debounceSave();
  });
  $("qa_instagram").addEventListener("click", ()=>{
    state.links.push({ title: "Instagram", subtitle: "@", url: "https://www.instagram.com/", thumb: "", badge: "" });
    renderAll(true); debounceSave();
  });
  $("qa_youtube").addEventListener("click", ()=>{
    state.links.push({ title: "YouTube", subtitle: "", url: "https://www.youtube.com/", thumb: "", badge: "YouTube" });
    renderAll(true); debounceSave();
  });
  $("qa_linkedin").addEventListener("click", ()=>{
    state.links.push({ title: "LinkedIn", subtitle: "", url: "https://www.linkedin.com/company/", thumb: "", badge: "" });
    renderAll(true); debounceSave();
  });

  $("addSocial").addEventListener("click", ()=>{
    state.socials.push({ type: "website", url: "" });
    renderAll(true);
    debounceSave();
  });

  $("import").addEventListener("change", async (e)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    try{
      const text = await file.text();
      state = JSON.parse(text);
      localStorage.setItem(LS_KEY, JSON.stringify(state));
      setStatus("Imported links.json successfully.");
      renderAll(true);
    }catch{
      setStatus("Import failed (not valid JSON).");
    }finally{
      e.target.value = "";
    }
  });

  $("download").addEventListener("click", downloadJson);
  $("download2").addEventListener("click", downloadJson);

  $("resetDraft").addEventListener("click", ()=>{
    try{ localStorage.removeItem(LS_KEY); }catch{}
    state = defaultState();
    renderAll(true);
    setStatus("Draft reset. Download links.json when ready.");
  });
}

wire();
loadInitial();
