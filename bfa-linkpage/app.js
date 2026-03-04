
async function loadJsonWithFallback(){
  if (location.protocol === "file:"){
    throw new Error("Opened as file://. Please open via GitHub Pages (…github.io/…) or run a local server.");
  }
  if (location.hostname === "github.com"){
    throw new Error("Opened on github.com. Please open the GitHub Pages URL (…github.io/…) for this site.");
  }

  const ts = Date.now();
  const here = new URL(location.href);

  let base;
  if (here.pathname.endsWith("/")){
    base = here;
  } else if (here.pathname.endsWith(".html")){
    base = new URL(".", here);
  } else {
    base = new URL(here.pathname + "/", here);
  }
  base = new URL(".", base);

  const candidates = [
    new URL("links.json", base).toString() + "?ts=" + ts,
    "./links.json?ts=" + ts,
    "links.json?ts=" + ts
  ];

  let lastErr = null;
  for (const url of candidates){
    try{
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const text = await res.text();
      if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")){
        throw new Error(`Got HTML instead of JSON for ${url}`);
      }
      try { return JSON.parse(text); } catch(parseErr){ throw new Error(`JSON parse error for ${url}: ${parseErr.message}`); }
    }catch(err){
      lastErr = err;
    }
  }
  throw lastErr || new Error("Could not load links.json");
}

const $ = (id) => document.getElementById(id);

// ------------------------
// EN / FR language toggle
// ------------------------
// You keep editing links.json in English.
// Index page can show French via a toggle:
// 1) If a field has an override like title_fr / subtitle_fr / bio_fr, we use it.
// 2) Otherwise we auto-translate (dictionary + free public translator) and cache in localStorage.

const LANG_KEY = "bfa_index_lang";

function getLang(){
  const q = (new URLSearchParams(location.search)).get("lang");
  if(q === "en" || q === "fr") return q;
  const stored = localStorage.getItem(LANG_KEY);
  if(stored === "en" || stored === "fr") return stored;
  const nav = (navigator.language || "en").toLowerCase();
  return nav.startsWith("fr") ? "fr" : "en";
}

let CURRENT_LANG = getLang();
document.documentElement.lang = CURRENT_LANG;

const UI = {
  loading: { en: "Loading…", fr: "Chargement…" },
  loadFail: { en: "Could not load links.json", fr: "Impossible de charger links.json" },
  expected: { en: "Expected:", fr: "Attendu :" },
  tip: {
    en: "Tip: If links.json opens in a tab, your JSON might be invalid (trailing comma). Re-export from editor.",
    fr: "Astuce : si links.json s’ouvre dans un onglet, votre JSON est peut-être invalide (virgule finale). Réexportez depuis l’éditeur."
  }
};

function tUI(key){
  return (UI[key] && (UI[key][CURRENT_LANG] || UI[key].en)) || "";
}

const FR_DICT = {
  "dealers": "Concessionnaires",
  "monthly deals": "Offres mensuelles",
  "parts & service": "Pièces et service",
  "parts and service": "Pièces et service",
  "live chat": "Clavardage en direct",
  "google reviews": "Avis Google",
  "video installation": "Installation vidéo",
  "click here": "Cliquez ici",
  "new": "Nouveau",
  "website": "Site web"
};

function norm(s){
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'");
}

function dictTranslate(en){
  const k = norm(en);
  if(!k) return "";
  if(FR_DICT[k]) return FR_DICT[k];
  // simple word hints (best-effort)
  let out = k;
  out = out.replace(/\bdeals\b/g, "offres");
  out = out.replace(/\bdeal\b/g, "offre");
  out = out.replace(/\bparts\b/g, "pièces");
  out = out.replace(/\breviews\b/g, "avis");
  out = out.replace(/\bvideo\b/g, "vidéo");
  if(out !== k){
    return out.charAt(0).toUpperCase() + out.slice(1);
  }
  return "";
}

function loadFrCache(){
  try{ return JSON.parse(localStorage.getItem("bfa_fr_cache_v1") || "{}") || {}; }
  catch(_){ return {}; }
}

function saveFrCache(cache){
  try{ localStorage.setItem("bfa_fr_cache_v1", JSON.stringify(cache)); }catch(_){ }
}

const FR_CACHE = loadFrCache();
const FR_PENDING = Object.create(null);

function shouldTranslate(en){
  const s = String(en || "").trim();
  if(!s) return false;
  if(/^https?:\/\//i.test(s)) return false;
  if(/^[0-9\s\-_.\/()]+$/.test(s)) return false;
  return true;
}

async function translateOnline(en){
  // Free public translator. If it fails (rate limits), we fall back to English.
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(en)}&langpair=en|fr`;
  const res = await fetch(url, { cache: "no-store" });
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  const js = await res.json();
  const out = js && js.responseData && js.responseData.translatedText;
  return typeof out === "string" ? out : "";
}

async function toFrench(en){
  const src = String(en || "").trim();
  if(!src) return "";
  if(FR_CACHE[src]) return FR_CACHE[src];
  const d = dictTranslate(src);
  if(d){
    FR_CACHE[src] = d;
    saveFrCache(FR_CACHE);
    return d;
  }
  if(!shouldTranslate(src)) return "";
  if(!FR_PENDING[src]){
    FR_PENDING[src] = (async()=>{
      try{
        const online = await translateOnline(src);
        const cleaned = (online || "").trim();
        if(cleaned){
          FR_CACHE[src] = cleaned;
          saveFrCache(FR_CACHE);
          return cleaned;
        }
      }catch(_){
        // ignore
      }
      return "";
    })();
  }
  return FR_PENDING[src];
}

function updateLangToggleUI(){
  const wrap = $("langToggle");
  if(!wrap) return;
  wrap.querySelectorAll(".langBtn").forEach(btn=>{
    btn.classList.toggle("active", btn.dataset.lang === CURRENT_LANG);
  });
}

function setLang(lang){
  if(lang !== "en" && lang !== "fr") return;
  CURRENT_LANG = lang;
  document.documentElement.lang = lang;
  try{ localStorage.setItem(LANG_KEY, lang); }catch(_){ }
  updateLangToggleUI();
  if(LAST_DATA) renderFromData(LAST_DATA);
}

function setupLangToggle(){
  const wrap = $("langToggle");
  if(!wrap) return;
  wrap.addEventListener("click", (e)=>{
    const btn = e.target.closest("button[data-lang]");
    if(!btn) return;
    setLang(btn.dataset.lang);
  });
  updateLangToggleUI();
}

function getOverrideFr(obj, key){
  if(!obj) return "";
  const v1 = obj[`${key}_fr`];
  const v2 = obj[`${key}Fr`];
  if(typeof v1 === "string" && v1.trim()) return v1.trim();
  if(typeof v2 === "string" && v2.trim()) return v2.trim();
  const v = obj[key];
  if(v && typeof v === "object" && typeof v.fr === "string" && v.fr.trim()) return v.fr.trim();
  return "";
}

function getEn(obj, key, fallback=""){
  if(!obj) return fallback;
  const v = obj[key];
  if(v == null) return fallback;
  if(v && typeof v === "object"){
    if(typeof v.en === "string") return v.en;
    if(typeof v.fr === "string") return v.fr;
  }
  return String(v);
}

function setLocalizedText(el, obj, key, fallback=""){
  if(!el) return;
  el.removeAttribute("data-needs-fr");
  el.removeAttribute("data-en");
  const en = getEn(obj, key, fallback);
  if(CURRENT_LANG === "en"){
    el.textContent = en;
    return;
  }
  const frOvr = getOverrideFr(obj, key);
  if(frOvr){
    el.textContent = frOvr;
    return;
  }
  const cached = FR_CACHE[en] || dictTranslate(en);
  if(cached){
    if(cached && cached !== en){
      FR_CACHE[en] = cached;
      saveFrCache(FR_CACHE);
    }
    el.textContent = cached || en;
    return;
  }
  // Render EN now, replace async.
  el.textContent = en;
  if(shouldTranslate(en)){
    el.dataset.en = en;
    el.dataset.needsFr = "1";
  }
}

async function translateMissingInDom(){
  if(CURRENT_LANG !== "fr") return;
  const els = Array.from(document.querySelectorAll("[data-needs-fr='1'][data-en]"));
  const unique = Array.from(new Set(els.map(e=>e.dataset.en).filter(Boolean)));
  for(const en of unique){
    const fr = await toFrench(en);
    if(!fr) continue;
    els.forEach(el=>{
      if(el.dataset.en === en){
        el.textContent = fr;
        el.removeAttribute("data-needs-fr");
      }
    });
  }
}

let LAST_DATA = null;

const ICONS = {
  instagram: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm9 2h-9A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4z"/><path d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/><path d="M17.6 6.3a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2z"/></svg>`,
  youtube: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.8 4.6 12 4.6 12 4.6s-5.8 0-7.5.5A3 3 0 0 0 2.4 7.2 31 31 0 0 0 2 12a31 31 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.7.5 7.5.5 7.5.5s5.8 0 7.5-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22 12a31 31 0 0 0-.4-4.8zM10 15.3V8.7L16 12l-6 3.3z"/></svg>`,
  website: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm7.9 9h-3.1a15.6 15.6 0 0 0-1.3-6A8 8 0 0 1 19.9 11zM12 4c.9 1.2 1.9 3.3 2.4 7H9.6c.5-3.7 1.5-5.8 2.4-7zM4.1 13h3.1c.2 2.2.8 4.2 1.3 6A8 8 0 0 1 4.1 13zm3.1-2H4.1a8 8 0 0 1 4.4-6c-.6 1.8-1.1 3.8-1.3 6zm2.4 2h4.8c-.5 3.7-1.5 5.8-2.4 7-.9-1.2-1.9-3.3-2.4-7zm7.2 0h3.1a8 8 0 0 1-4.4 6c.6-1.8 1.1-3.8 1.3-6zm-1.4 0H8.6c-.2-1.4-.3-2.8-.3-4s.1-2.6.3-4h6.8c.2 1.4.3 2.8.3 4s-.1 2.6-.3 4z"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM0.5 8.5h4V23h-4V8.5zM8.5 8.5h3.8v2h.1c.5-1 1.9-2.1 3.9-2.1 4.2 0 5 2.8 5 6.4V23h-4v-6.6c0-1.6 0-3.6-2.2-3.6-2.2 0-2.6 1.7-2.6 3.5V23h-4V8.5z"/></svg>`
};

const ICON_SVGS = {
  website: `<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M2 12h20"/><path d="M12 2c2.5 2.7 4 6.2 4 10s-1.5 7.3-4 10c-2.5-2.7-4-6.2-4-10S9.5 4.7 12 2z"/></svg>`,
  link: `<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1"/><path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24"><path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2z"/><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/><path d="M17.5 6.5h.01"/></svg>`,
  youtube: `<svg viewBox="0 0 24 24"><path d="M21 12s0-4-1-5-4-1-8-1-7 0-8 1-1 5-1 5 0 4 1 5 4 1 8 1 7 0 8-1 1-5 1-5z"/><path d="M10 9.5l5 2.5-5 2.5z"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24"><path d="M4 9h4v11H4z"/><path d="M6 4.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/><path d="M10 9h4v1.8c.6-1.1 1.9-2 3.8-2 3 0 4.2 2 4.2 5v6.2h-4v-5.6c0-1.6-.4-2.8-2-2.8-1.2 0-2 .8-2 2.3V20h-4z"/></svg>`
};

function guessIconKey(url){
  try{
    const host = new URL(url).hostname.replace(/^www\./,"");
    if (host.includes("instagram.com")) return "instagram";
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    if (host.includes("linkedin.com")) return "linkedin";
    return "website";
  }catch{
    return "link";
  }
}


function applyTheme(theme){
  const t = theme || {};
  const type = t.type || "default";
  const color = t.color || "#f6f7fb";
  const image = t.image || "";

  const body = document.body;

  // reset
  body.style.background = "";
  body.style.backgroundImage = "";
  body.style.backgroundSize = "";
  body.style.backgroundPosition = "";
  body.style.backgroundRepeat = "";
  body.style.backgroundAttachment = "";

  if (type === "color"){
    body.style.background = color;
    return;
  }
  if (type === "gradient"){
    body.style.background = `radial-gradient(900px 520px at 25% -120px, rgba(255,149,0,0.20), transparent 60%), radial-gradient(700px 420px at 90% 10%, rgba(0,122,255,0.10), transparent 55%), ${color}`;
    return;
  }
  if (type === "image" && image){
    body.style.background = color;
    body.style.backgroundImage = `url("${image}")`;
    body.style.backgroundSize = "cover";
    body.style.backgroundPosition = "center";
    body.style.backgroundRepeat = "no-repeat";
    body.style.backgroundAttachment = "fixed";
    return;
  }
  // default: keep CSS background from styles.css
}
function createSocial(obj) {
  const { type, url, iconImage } = obj || {};
  const a = document.createElement("a");
  a.className = "social";
  a.href = url || "#";
  a.target = "_blank";
  a.rel = "noopener";
  a.setAttribute("aria-label", type || "social");

  if (iconImage) {
    const img = document.createElement("img");
    img.src = iconImage;
    img.alt = "";
    img.style.width = "18px";
    img.style.height = "18px";
    img.style.objectFit = "contain";
    a.appendChild(img);
  } else {
    a.innerHTML = ICONS[type] || ICONS.website;
  }
  if (!url) a.style.opacity = "0.55";
  return a;
}

function createLink(item) {
  const a = document.createElement("a");
  a.className = "link";
  a.href = item.url || "#";
  a.target = "_blank";
  a.rel = "noopener";

  // Thumb container is ALWAYS a DIV (fixed size). This prevents huge/broken images from expanding the card.
  const thumb = document.createElement("div");
  thumb.className = "thumb";

  if (item.thumb) {
    const img = document.createElement("img");
    img.src = item.thumb;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.className = "thumbImg";
    img.addEventListener("error", () => {
      // fallback to icon
      thumb.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.className = "thumbIconWrap";
      const iconKey = item.icon || guessIconKey(item.url);
      wrap.innerHTML = ICON_SVGS[iconKey] || ICON_SVGS.link;
      thumb.appendChild(wrap);
    }, { once: true });
    thumb.appendChild(img);
  } else if (item.iconImage) {
    const img = document.createElement("img");
    img.src = item.iconImage;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.className = "thumbIconImg";
    applyIconCfg(img, item.iconCfg);
    img.addEventListener("error", () => {
      thumb.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.className = "thumbIconWrap";
      const iconKey = item.icon || guessIconKey(item.url);
      wrap.innerHTML = ICON_SVGS[iconKey] || ICON_SVGS.link;
      thumb.appendChild(wrap);
    }, { once: true });
    thumb.appendChild(img);
  } else {
    const wrap = document.createElement("div");
    wrap.className = "thumbIconWrap";
    const iconKey = item.icon || guessIconKey(item.url);
    wrap.innerHTML = ICON_SVGS[iconKey] || ICON_SVGS.link;
    thumb.appendChild(wrap);
  }

  const main = document.createElement("div");
  main.className = "linkMain";

  const titleRow = document.createElement("div");
  titleRow.className = "titleRow";

  const title = document.createElement("div");
  title.className = "title";
  setLocalizedText(title, item, "title", "Untitled");
  titleRow.appendChild(title);

  if (item.badge) {
    const badge = document.createElement("span");
    badge.className = "badge";
    setLocalizedText(badge, item, "badge", "");
    titleRow.appendChild(badge);
  }

  main.appendChild(titleRow);

  if (item.subtitle) {
    const sub = document.createElement("div");
    sub.className = "subtitle";
    setLocalizedText(sub, item, "subtitle", "");
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




function applyIconCfg(imgEl, cfg){
  if (!imgEl) return;
  const c = cfg || {};
  const scale = Number(c.scale ?? 1);
  const fit = c.fit || "contain";
  imgEl.style.objectFit = fit;
  const x = Number(c.x ?? 0);
  const y = Number(c.y ?? 0);
  imgEl.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  imgEl.style.transformOrigin = "center";
}

function ensureAvatarShell(imgEl){
  if (!imgEl) return { shell: null, img: null };
  // Already wrapped?
  if (imgEl.parentElement && imgEl.parentElement.classList.contains("avatarShell")){
    imgEl.classList.add("avatarImg");
    return { shell: imgEl.parentElement, img: imgEl };
  }
  const shell = document.createElement("div");
  shell.className = "avatarShell";
  imgEl.parentNode.insertBefore(shell, imgEl);
  shell.appendChild(imgEl);
  imgEl.classList.add("avatarImg");
  return { shell, img: imgEl };
}
function applyAvatar(imgEl, profile){
  const p = profile || {};
  const w = Number(p.w ?? p.avatarW ?? p.avatarSize ?? 54);
  const h = Number(p.h ?? p.avatarH ?? p.avatarSize ?? 54);
  const pad  = Number(p.pad ?? p.avatarPadding ?? 8);
  const fit  = (p.fit ?? p.avatarFit ?? "contain");
  const rad  = Number(p.radius ?? p.avatarRadius ?? 16);
  const scale = Number(p.scale ?? p.avatarScale ?? 1);
  const x = Number(p.x ?? p.avatarX ?? 0);
  const y = Number(p.y ?? p.avatarY ?? 0);

  const show = (p.show ?? p.avatarShow) !== false;
  const bgIsTransparent = !!(p.bgTransparent ?? p.avatarBgTransparent);
  const bg = p.bg ?? p.avatarBg ?? "rgba(255,255,255,0.65)";
  const borderOn = (p.border ?? p.avatarBorder) !== false;

  const { shell, img } = ensureAvatarShell(imgEl);
  if (!shell || !img) return;

  shell.style.width = `${w}px`;
  shell.style.height = `${h}px`;
  shell.style.padding = `${pad}px`;
  shell.style.borderRadius = `${rad}px`;
  shell.style.boxSizing = "border-box";
  shell.style.display = show ? "" : "none";
  shell.style.background = bgIsTransparent ? "transparent" : bg;
  shell.style.border = borderOn ? "1px solid rgba(10,10,12,0.10)" : "none";

  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = fit;
  img.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  img.style.transformOrigin = "center";
}
function renderFromData(data) {

  // Apply background/theme from links.json
  applyTheme(data.theme || data.background);

  setLocalizedText($("name"), data.profile || {}, "name", "Links");
  const avatar = $("avatar");
  avatar.src = data.profile?.avatar || "";
  avatar.alt = (data.profile?.name || "Profile") + " logo";
  applyAvatar(avatar, data.profile);

  setLocalizedText($("bio"), data.profile || {}, "bio", "");

  const socialsWrap = $("socials");
  socialsWrap.innerHTML = "";
  (data.socials || []).filter(s => s && s.enabled !== false).forEach(s => socialsWrap.appendChild(createSocial(s)));

  const linksWrap = $("links");
  linksWrap.innerHTML = "";
  (data.links || []).filter(l => l && l.enabled !== false).forEach(l => linksWrap.appendChild(createLink(l)));

  setLocalizedText($("footerText"), data || {}, "footerText", "");

  // Async translation pass (FR)
  setTimeout(() => {
    translateMissingInDom().catch(() => {});
  }, 0);
}

async function init() {
  setupLangToggle();
  const nameEl0 = $("name");
  if (nameEl0) nameEl0.textContent = tUI("loading");

  const isPreview = new URLSearchParams(location.search).get("preview") === "1";

  // If we're in preview mode, listen for editor updates and render them.
  if (isPreview){
    window.addEventListener("message", (e)=>{
      const msg = e && e.data;
      if (!msg || msg.type !== "previewState") return;
      try{
        LAST_DATA = msg.state;
        renderFromData(msg.state);
      }catch(err){
        console.error(err);
      }
    });

    // Also try loading links.json as a fallback (in case no message arrives)
    try{
      const data = await loadJsonWithFallback();
      LAST_DATA = data;
      renderFromData(data);
      return;
    }catch(err){
      // fall through to error handler
      throw err;
    }
  }

  const data = await loadJsonWithFallback();
  LAST_DATA = data;
  renderFromData(data);
}

init().catch(err => {
  console.error(err);
  const msg = (err && err.message) ? err.message : String(err);

  const nameEl = $("name");
  if (nameEl) nameEl.textContent = tUI("loadFail");

  const errEl = $("loadError");
  if (errEl){
    const here = new URL(location.href);
    const base = here.pathname.endsWith(".html") ? new URL(".", here) : new URL(".", new URL(here.pathname.endsWith("/") ? here.pathname : (here.pathname + "/"), here));
    const expected = new URL("links.json", base).toString();
    errEl.hidden = false;
    errEl.textContent = `${tUI("expected")} ${expected}

Error: ${msg}

${tUI("tip")}`;
  }
});
