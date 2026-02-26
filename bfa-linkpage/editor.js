const ICONS = {
  instagram: "📸",
  youtube: "▶",
  website: "🌐",
  linkedin: "💼",
  tiktok: "🎵",
  facebook: "📘",
  email: "✉️",
  phone: "📞",
  other: "🔗"
};

const SOCIAL_TYPES = ["instagram", "website", "linkedin", "youtube", "tiktok", "facebook"];

const $ = (id) => document.getElementById(id);

const LS_KEY = "bfa_links_draft_v2";
let state = null;
let saveTimer = null;

function setStatus(msg){
  const s = $("status");
  if (s) s.textContent = msg || "";
  const sticky = $("stickyMsg");
  if (sticky) sticky.textContent = msg || "Ready";
}

function setDot(kind){
  const dot = $("dot");
  if (!dot) return;
  dot.classList.remove("dotOk","dotWarn");
  if (kind === "warn") dot.classList.add("dotWarn");
  else dot.classList.add("dotOk");
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

  // If user typed "/assets/..." convert to "./assets/..."
  if (s.startsWith("/assets/")) return "." + s;

  return s;
}

function guessTypeFromUrl(url){
  if (!url) return "other";
  const u = String(url).toLowerCase().trim();

  if (u.startsWith("mailto:")) return "email";
  if (u.startsWith("tel:")) return "phone";

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

function debounceSaveLocal(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try{
      localStorage.setItem(LS_KEY, JSON.stringify(state));
      setDot("ok");
      setStatus("Draft saved (on this browser). Download when ready.");
    }catch{
      setDot("warn");
      setStatus("Could not save draft in browser (storage blocked).");
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

function el(tag, cls, text){
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function miniButton(text, onClick, cls="btnMini"){
  const b = el("button", cls, text);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}

/* ---------- RENDER SOCIALS ---------- */
function renderSocials(){
  const wrap = $("socialList");
  wrap.innerHTML = "";

  state.socials = state.socials || [];

  state.socials.forEach((s, idx) => {
    const card = el("div", "itemCard");

    const head = el("div", "itemHead");
    const left = el("div", "itemLeft");
    left.appendChild(el("div", "itemEmoji", ICONS[s.type] || ICONS.other));
    left.appendChild(el("div", "itemTitle", `Social #${idx+1}`));
    head.appendChild(left);

    const btns = el("div", "miniBtns");
    btns.appendChild(miniButton("Remove", () => {
      state.socials.splice(idx, 1);
      renderAll();
    }, "btnMini btnMiniDanger"));
    head.appendChild(btns);

    const row = el("div", "grid2");

    // type select
    const typeField = el("div", "field");
    typeField.appendChild(el("label", "", "Type"));
    const sel = document.createElement("select");
    SOCIAL_TYPES.forEach(t => {
      const o = document.createElement("option");
      o.value = t;
      o.textContent = `${ICONS[t] || "🔗"} ${t}`;
      if (t === (s.type || "website")) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", () => {
      state.socials[idx].type = sel.value;
      renderAll(false);
      debounceSaveLocal();
    });
    typeField.appendChild(sel);

    // url
    const urlField = el("div", "field");
    urlField.appendChild(el("label", "", "URL"));
    const input = document.createElement("input");
    input.placeholder = "https://...";
    input.value = s.url || "";
    input.addEventListener("input", () => {
      state.socials[idx].url = input.value;
      renderPreview();
      debounceSaveLocal();
    });
    urlField.appendChild(input);

    row.appendChild(typeField);
    row.appendChild(urlField);

    card.appendChild(head);
    card.appendChild(row);

    wrap.appendChild(card);
  });
}

/* ---------- RENDER LINKS ---------- */
function renderLinks(){
  const wrap = $("linksList");
  wrap.innerHTML = "";

  state.links = state.links || [];

  state.links.forEach((l, idx) => {
    const details = document.createElement("details");
    details.className = "linkDetails";
    details.open = idx === 0; // keep first open

    const summary = document.createElement("summary");
    summary.className = "linkSummary";

    const iconType = guessTypeFromUrl(l.url) || "other";
    const icon = el("span", "linkSummaryIcon", ICONS[iconType] || ICONS.other);
    const title = el("span", "linkSummaryTitle", l.title || `Link #${idx+1}`);

    const status = el("span", "pill");
    const missing = !String(l.url || "").trim();
    status.textContent = missing ? "Missing URL" : "OK";
    status.className = missing ? "pill pillWarn" : "pill pillOk";

    const rightBtns = el("span", "linkSummaryBtns");
    rightBtns.appendChild(miniButton("↑", () => moveLink(idx, -1)));
    rightBtns.appendChild(miniButton("↓", () => moveLink(idx, +1)));
    rightBtns.appendChild(miniButton("Remove", () => removeLink(idx), "btnMini btnMiniDanger"));

    summary.appendChild(icon);
    summary.appendChild(title);
    summary.appendChild(status);
    summary.appendChild(rightBtns);

    const body = el("div", "linkBody");

    // BIG SIMPLE FIELDS
    body.appendChild(makeInput(idx, "Title", "title", "Instagram"));
    body.appendChild(makeInput(idx, "URL", "url", "https://..."));

    body.appendChild(makeInput(idx, "Subtitle (optional)", "subtitle", "@handle or short text"));

    // ADVANCED (collapsed)
    const adv = document.createElement("details");
    adv.className = "advanced";
    const advSum = document.createElement("summary");
    advSum.textContent = "Advanced (optional)";
    adv.appendChild(advSum);

    const advGrid = el("div", "grid2");
    advGrid.appendChild(makeInput(idx, "Badge (optional)", "badge", "YouTube"));
    advGrid.appendChild(makeInput(idx, "Thumbnail path (optional)", "thumb", "./assets/thumbs/retail.png", true));
    adv.appendChild(advGrid);

    body.appendChild(adv);

    details.appendChild(summary);
    details.appendChild(body);
    wrap.appendChild(details);
  });
}

function makeInput(idx, labelText, key, placeholder, normalizeAsset=false){
  const field = el("div", "field");
  const lab = el("label", "", labelText);

  const input = document.createElement(key === "bio" ? "textarea" : "input");
  input.placeholder = placeholder || "";
  input.value = state.links[idx][key] || "";

  input.addEventListener("input", () => {
    let v = input.value;
    if (normalizeAsset) v = normalizeAssetPath(v);
    state.links[idx][key] = v;
    renderPreview();
    debounceSaveLocal();
    // update summary pills quickly
    renderLinks();
  });

  field.appendChild(lab);
  field.appendChild(input);
  return field;
}

function moveLink(idx, dir){
  const n = idx + dir;
  if (n < 0 || n >= state.links.length) return;
  const tmp = state.links[n];
  state.links[n] = state.links[idx];
  state.links[idx] = tmp;
  renderAll();
  debounceSaveLocal();
}

function removeLink(idx){
  state.links.splice(idx, 1);
  renderAll();
  debounceSaveLocal();
}

/* ---------- PREVIEW ---------- */
function createSocialEl({type,url}){
  const a = document.createElement("a");
  a.className = "social";
  a.href = url || "#";
  a.target = "_blank";
  a.rel = "noopener";
  a.setAttribute("aria-label", type || "social");
  a.innerHTML = `<span class="emoji">${ICONS[type] || ICONS.other}</span>`;
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
    thumb.innerHTML = `<div class="thumbIcon">${ICONS[t] || ICONS.other}</div>`;
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

function renderAll(full=true){
  if (full){
    // Profile fields
    $("p_name").value = state.profile?.name || "";
    $("p_avatar").value = state.profile?.avatar || "";
    $("p_bio").value = state.profile?.bio || "";
    renderSocials();
    renderLinks();
  }
  renderPreview();
}

/* ---------- DOWNLOAD / IMPORT / RESET ---------- */
function downloadJson(){
  // normalize asset paths
  if (state.profile) state.profile.avatar = normalizeAssetPath(state.profile.avatar);
  (state.links || []).forEach(l => { l.thumb = normalizeAssetPath(l.thumb); });

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
  setDot("ok");
  setStatus("Downloaded links.json — upload/replace it in your GitHub repo.");
}

async function copyJson(){
  try{
    await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
    setDot("ok");
    setStatus("Copied JSON to clipboard.");
  }catch{
    setDot("warn");
    setStatus("Could not copy (browser blocked clipboard).");
  }
}

async function loadInitial(){
  // 1) try local draft
  try{
    const saved = localStorage.getItem(LS_KEY);
    if (saved){
      state = JSON.parse(saved);
      setDot("ok");
      setStatus("Loaded saved draft from this browser.");
      renderAll(true);
      return;
    }
  }catch{}

  // 2) else fetch links.json
  try{
    const res = await fetch("./links.json", { cache: "no-store" });
    state = await res.json();
    setDot("ok");
    setStatus("Loaded current links.json from the site.");
  }catch{
    state = defaultState();
    setDot("warn");
    setStatus("Could not load links.json. Using a new draft.");
  }

  renderAll(true);
}

function wire(){
  // Large text toggle
  $("toggleSize").addEventListener("click", ()=>{
    const on = document.body.classList.toggle("editorLarge");
    $("toggleSize").setAttribute("aria-pressed", on ? "true" : "false");
  });

  // Profile bindings
  $("p_name").addEventListener("input", (e)=>{
    state.profile.name = e.target.value;
    renderPreview();
    debounceSaveLocal();
  });

  $("p_avatar").addEventListener("input", (e)=>{
    state.profile.avatar = normalizeAssetPath(e.target.value);
    renderPreview();
    debounceSaveLocal();
  });

  $("p_bio").addEventListener("input", (e)=>{
    state.profile.bio = e.target.value;
    renderPreview();
    debounceSaveLocal();
  });

  // Upload logo
  const avatarFile = $("p_avatar_file");
  if (avatarFile){
    avatarFile.addEventListener("change", async (e)=>{
      const file = e.target.files?.[0];
      if(!file) return;
      try{
        const dataUrl = await readFileAsDataURL(file);
        state.profile.avatar = dataUrl;
        $("p_avatar").value = dataUrl;
        renderPreview();
        debounceSaveLocal();
        setStatus("Logo embedded into links.json. Download when ready.");
      }catch{
        setDot("warn");
        setStatus("Could not read image file.");
      }finally{
        e.target.value = "";
      }
    });
  }

  // Social add
  $("addSocial").addEventListener("click", ()=>{
    state.socials.push({ type: "website", url: "" });
    renderAll(true);
    debounceSaveLocal();
  });

  // Link add
  $("addLink").addEventListener("click", ()=>{
    state.links.push({ title: "New link", subtitle: "", url: "", thumb: "", badge: "" });
    renderAll(true);
    debounceSaveLocal();
  });

  // Quick add buttons
  $("qa_website").addEventListener("click", ()=>{
    state.links.push({ title: "Website", subtitle: "", url: "https://", thumb: "", badge: "" });
    renderAll(true); debounceSaveLocal();
  });
  $("qa_instagram").addEventListener("click", ()=>{
    state.links.push({ title: "Instagram", subtitle: "@", url: "https://www.instagram.com/", thumb: "", badge: "" });
    renderAll(true); debounceSaveLocal();
  });
  $("qa_youtube").addEventListener("click", ()=>{
    state.links.push({ title: "YouTube", subtitle: "", url: "https://www.youtube.com/", thumb: "", badge: "YouTube" });
    renderAll(true); debounceSaveLocal();
  });
  $("qa_linkedin").addEventListener("click", ()=>{
    state.links.push({ title: "LinkedIn", subtitle: "", url: "https://www.linkedin.com/company/", thumb: "", badge: "" });
    renderAll(true); debounceSaveLocal();
  });

  // Export/import
  $("download").addEventListener("click", downloadJson);
  $("download2").addEventListener("click", downloadJson);
  $("copy").addEventListener("click", copyJson);

  $("import").addEventListener("change", async (e)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    try{
      const text = await file.text();
      state = JSON.parse(text);
      localStorage.setItem(LS_KEY, JSON.stringify(state));
      setDot("ok");
      setStatus("Imported links.json successfully.");
      renderAll(true);
    }catch{
      setDot("warn");
      setStatus("Import failed: not valid JSON.");
    }finally{
      e.target.value = "";
    }
  });

  $("resetLocal").addEventListener("click", ()=>{
    try{ localStorage.removeItem(LS_KEY); }catch{}
    state = defaultState();
    renderAll(true);
    setDot("ok");
    setStatus("Draft reset. Now download and upload when ready.");
  });
}

wire();
loadInitial();
