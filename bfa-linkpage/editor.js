(() => {
  const $ = (id) => document.getElementById(id);

  const BUILD = "v52";
  const LS_KEY = "bfa_linktree_editor_draft_v52";

  const ICON_SVGS = {
    website: `<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M2 12h20"/><path d="M12 2c2.5 2.7 4 6.2 4 10s-1.5 7.3-4 10c-2.5-2.7-4-6.2-4-10S9.5 4.7 12 2z"/></svg>`,
    link: `<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1"/><path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1"/></svg>`,
    instagram: `<svg viewBox="0 0 24 24"><path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2z"/><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/><path d="M17.5 6.5h.01"/></svg>`,
    youtube: `<svg viewBox="0 0 24 24"><path d="M21 12s0-4-1-5-4-1-8-1-7 0-8 1-1 5-1 5 0 4 1 5 4 1 8 1 7 0 8-1 1-5 1-5z"/><path d="M10 9.5l5 2.5-5 2.5z"/></svg>`,
    linkedin: `<svg viewBox="0 0 24 24"><path d="M4 9h4v11H4z"/><path d="M6 4.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/><path d="M10 9h4v1.8c.6-1.1 1.9-2 3.8-2 3 0 4.2 2 4.2 5v6.2h-4v-5.6c0-1.6-.4-2.8-2-2.8-1.2 0-2 .8-2 2.3V20h-4z"/></svg>`,
    up: `<svg viewBox="0 0 24 24"><path d="M12 5v14"/><path d="M6 11l6-6 6 6"/></svg>`,
    down: `<svg viewBox="0 0 24 24"><path d="M12 5v14"/><path d="M6 13l6 6 6-6"/></svg>`,
    edit: `<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z"/></svg>`,
    trash: `<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M7 6l1 14h8l1-14"/></svg>`
  };

  const SOCIAL_TYPES = ["website","instagram","linkedin","youtube","tiktok","facebook"];

  let state = null;
  let saveTimer = null;
  let isSorting = false;

  const sortableAttached = new WeakSet();

  function setStatus(msg){
    const el = $("status");
    if (el) el.textContent = msg || "Ready";
  }
  function showError(msg){
    const bar = $("errorBar");
    if (!bar) return;
    bar.hidden = !msg;
    bar.textContent = msg || "";
  }
  function safe(fn){
    try{ return fn(); }catch(err){
      console.error(err);
      showError("JS error: " + (err?.message || String(err)));
      setStatus("Error");
    }
  }

  function debounceSave(){
    clearTimeout(saveTimer);
    saveTimer = setTimeout(()=>{
      try{
        localStorage.setItem(LS_KEY, JSON.stringify(state));
        setStatus("Saved");
      }catch{
        setStatus("Can't save draft");
      }
    }, 250);
  }

  function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

  function normalizeAssetPath(p){
    if (!p) return "";
    const s = String(p).trim();
    if (s.startsWith("/assets/")) return "." + s;
    return s;
  }

  function safeHost(url){
    try{ return new URL(url).hostname.replace(/^www\./,""); }
    catch{ return (url||"").trim(); }
  }

  function guessIconFromUrl(url){
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

  function readFileAsDataURL(file){
    return new Promise((resolve, reject)=>{
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  function defaultState(){
    return {
      profile: {
        name: "The BFA Group",
        bio: "Retail Automotive Marketing • Digital Signage • IPTV",
        avatar: "./assets/logo.png",
        show: true,
        bg: "#ffffff",
        bgTransparent: false,
        border: true,
        w: 54,
        h: 54,
        pad: 8,
        radius: 16,
        fit: "contain",
        scale: 1,
        x: 0,
        y: 0
      },
      theme: { type: "default", color: "#f5f5f7", image: "" },
      icons: [
        { type: "website", url: "https://www.thebfagroup.com/", enabled: true, iconImage: "", iconCfg: { scale: 1, fit: "contain", x: 0, y: 0 } },
        { type: "instagram", url: "https://www.instagram.com/bfa.autovisiontv/", enabled: true, iconImage: "", iconCfg: { scale: 1, fit: "contain", x: 0, y: 0 } }
      ],
      links: [
        { title: "Website", subtitle: "thebfagroup.com", url: "https://www.thebfagroup.com/", badge: "", thumb: "", enabled: true, icon: "", iconImage: "", iconCfg: { scale: 1, fit: "contain", x: 0, y: 0 } }
      ],
      footerText: "",
      updatedAt: null
    };
  }

  function normalizeIncoming(raw){
    const d = defaultState();
    const s = raw || {};
    // Backward-compat mapping
    const profileIn = { ...(s.profile || {}) };
    // map old keys if present
    profileIn.avatar = profileIn.avatar ?? (s.profile?.avatar) ?? d.profile.avatar;
    const themeIn = s.theme || s.background || d.theme;

    const out = {
      profile: { ...d.profile, ...profileIn },
      theme: { ...d.theme, ...(themeIn || {}) },
      icons: (s.icons || s.socials || d.icons).map(it => ({
        enabled: true,
        iconImage: "",
        iconCfg: { scale: 1, fit: "contain", x: 0, y: 0 },
        ...it,
        iconCfg: { scale: 1, fit: "contain", ...(it.iconCfg || {}) }
      })),
      links: (s.links || d.links).map(l => ({
        enabled: true,
        icon: "",
        iconImage: "",
        iconCfg: { scale: 1, fit: "contain", x: 0, y: 0 },
        ...l,
        iconCfg: { scale: 1, fit: "contain", ...(l.iconCfg || {}) }
      })),
      footerText: s.footerText || "",
      updatedAt: s.updatedAt ?? null
    };

    // If old avatarW/avatarH exist, map
    out.profile.w = out.profile.w ?? out.profile.avatarW ?? d.profile.w;
    out.profile.h = out.profile.h ?? out.profile.avatarH ?? d.profile.h;
    out.profile.pad = out.profile.pad ?? out.profile.avatarPadding ?? d.profile.pad;
    out.profile.radius = out.profile.radius ?? out.profile.avatarRadius ?? d.profile.radius;
    out.profile.fit = out.profile.fit ?? out.profile.avatarFit ?? d.profile.fit;
    out.profile.scale = out.profile.scale ?? out.profile.avatarScale ?? d.profile.scale;
    out.profile.x = out.profile.x ?? out.profile.avatarX ?? d.profile.x;
    out.profile.y = out.profile.y ?? out.profile.avatarY ?? d.profile.y;

    out.profile.show = (out.profile.show ?? out.profile.avatarShow ?? true);
    out.profile.bg = out.profile.bg ?? out.profile.avatarBg ?? "#ffffff";
    out.profile.bgTransparent = !!(out.profile.bgTransparent ?? out.profile.avatarBgTransparent ?? false);
    out.profile.border = (out.profile.border ?? out.profile.avatarBorder ?? true);

    return out;
  }

  // Tabs
  const TAB_TITLES = {
    links: ["Links", "Click a row to edit. Drag the dots to reorder."],
    profile: ["Profile", "Logo + name + background"],
    icons: ["Icons", "Top icons under the name"],
    export: ["Export", "Download your updated links.json"]
  };

  
  const STEP_ORDER = ["profile","icons","links","export"];

  function getCurrentTab(){
    const active = document.querySelector(".navItem.isActive");
    return active?.getAttribute("data-tab") || "profile";
  }

  function updateStepperUI(){
    const tab = getCurrentTab();
    const idx = STEP_ORDER.indexOf(tab);
    const step = idx >= 0 ? idx + 1 : 1;

    const hint = $("stepHint");
    if (hint) hint.textContent = `Step ${step} of 4`;

    const nextBtn = $("stepNext");
    if (!nextBtn) return;

    if (tab === "export"){
      nextBtn.textContent = "DOWNLOAD LINKS.JSON";
    } else {
      nextBtn.textContent = "Next";
    }
  }

function setTab(tab){
    document.querySelectorAll(".navItem").forEach(b=>{
      b.classList.toggle("isActive", b.dataset.tab === tab);
    });
    document.querySelectorAll(".tab").forEach(s=>{
      s.classList.toggle("isActive", s.id === ("tab-" + tab));
    });
    $("pageTitle").textContent = TAB_TITLES[tab]?.[0] || "Links";
    $("pageHint").textContent = TAB_TITLES[tab]?.[1] || "";
  
    updateStepperUI();
  }

  
  // Preview sizing (9:16 / 16:9) + Big toggle
  const PREVIEW_KEY = "bfa_linktree_preview_prefs_v52";
  let previewPrefs = { aspect: "9:16", big: false };
  try{
    const saved = localStorage.getItem(PREVIEW_KEY);
    if (saved) previewPrefs = { ...previewPrefs, ...JSON.parse(saved) };
  }catch{}

  
  const FLOAT_KEY = "bfa_linktree_preview_float_v52";
  let floatOn = false;
  try{ floatOn = localStorage.getItem(FLOAT_KEY) === "1"; }catch{}
  function setFloat(on){
    floatOn = !!on;
    document.body.classList.toggle("previewFloat", floatOn);
    try{ localStorage.setItem(FLOAT_KEY, floatOn ? "1" : "0"); }catch{}
  }

function savePreviewPrefs(){
    try{ localStorage.setItem(PREVIEW_KEY, JSON.stringify(previewPrefs)); }catch{}
  }

  function applyPreviewSize(){
    const screen = $("phoneScreen");
    if (!screen) return;

    const aspect = previewPrefs.aspect || "9:16";
    const big = !!previewPrefs.big;

    const dock = document.getElementById("previewDock") || document.querySelector(".preview");
    const handleH = 42; // handle bar height + gap
    const pad = 24;     // approximate inner padding

    const vw = Math.max(240, (dock?.clientWidth || 420) - pad);
    const vh = Math.max(240, (dock?.clientHeight || 640) - handleH - pad);

    const ratio = (aspect === "16:9") ? (16/9) : (9/16); // width/height
    // fit rect inside vw x vh
    let w = vw;
    let h = w / ratio;
    if (h > vh){
      h = vh;
      w = h * ratio;
    }

    // "Bigger preview" reduces margins slightly
    const scale = big ? 1.08 : 1.0;
    w = Math.min(vw, w * scale);
    h = Math.min(vh, h * scale);

    screen.style.width = `${Math.round(w)}px`;
    screen.style.height = `${Math.round(h)}px`;
    screen.style.margin = "0 auto";
  }

  function setAspect(aspect){
    previewPrefs.aspect = aspect;
    savePreviewPrefs();
    $("aspect916")?.classList.toggle("isActive", aspect === "9:16");
    $("aspect169")?.classList.toggle("isActive", aspect === "16:9");
    applyPreviewSize();
  }

  function setBig(on){
    previewPrefs.big = !!on;
    savePreviewPrefs();
    applyPreviewSize();
  }

// Preview theme
  let bgToken = 0;
  function preloadImage(url){
    return new Promise((resolve, reject)=>{
      const img = new Image();
      img.onload = ()=> resolve(true);
      img.onerror = ()=> reject(new Error("load_failed"));
      img.referrerPolicy = "no-referrer";
      img.src = url;
    });
  }

  function applyThemeToPreview(){
    const screen = $("phoneScreen");
    if (!screen) return;
    const t = state.theme || {};
    const type = t.type || "default";
    const color = t.color || "#f5f5f7";
    const image = t.image || "";

    screen.style.background = "";
    screen.style.backgroundImage = "";

    if (type === "color"){
      screen.style.background = color;
      return;
    }
    if (type === "gradient"){
      screen.style.background = `radial-gradient(900px 520px at 25% -120px, rgba(255,149,0,0.18), transparent 60%), radial-gradient(900px 520px at 85% 18%, rgba(10,10,12,0.06), transparent 60%), ${color}`;
      return;
    }
    if (type === "image" && image){
      const token = ++bgToken;
      screen.style.background = color;
      preloadImage(image).then(()=>{
        if (token !== bgToken) return;
        screen.style.backgroundImage = `url("${image}")`;
        screen.style.backgroundSize = "cover";
        screen.style.backgroundPosition = "center";
      }).catch(()=>{
        if (token !== bgToken) return;
        setStatus("Background URL didn't load");
      });
      return;
    }
    screen.style.background = `radial-gradient(900px 520px at 25% -120px, rgba(255,149,0,0.14), transparent 60%), radial-gradient(900px 520px at 85% 18%, rgba(10,10,12,0.06), transparent 60%), ${color}`;
  }

  // Avatar wrapper helper
  function ensureAvatarShell(imgEl){
    if (!imgEl) return { shell:null, img:null };
    if (imgEl.parentElement && imgEl.parentElement.classList.contains("avatarShell")){
      return { shell: imgEl.parentElement, img: imgEl };
    }
    const shell = document.createElement("div");
    shell.className = "avatarShell";
    imgEl.parentNode.insertBefore(shell, imgEl);
    shell.appendChild(imgEl);
    return { shell, img: imgEl };
  }

  function applyAvatar(imgEl, p){
    const { shell, img } = ensureAvatarShell(imgEl);
    if (!shell || !img) return;

    shell.style.width = `${Number(p.w)||54}px`;
    shell.style.height = `${Number(p.h)||54}px`;
    shell.style.padding = `${Number(p.pad)||8}px`;
    shell.style.borderRadius = `${Number(p.radius)||16}px`;
    shell.style.boxSizing = "border-box";
    shell.style.display = (p.show === false) ? "none" : "";
    shell.style.background = p.bgTransparent ? "transparent" : (p.bg || "rgba(255,255,255,0.65)");
    shell.style.border = (p.border === false) ? "none" : "1px solid rgba(10,10,12,0.10)";

    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = p.fit || "contain";
    img.style.transform = `translate(${Number(p.x)||0}px, ${Number(p.y)||0}px) scale(${Number(p.scale)||1})`;
    img.style.transformOrigin = "center";
  }

  // Icon cfg
  function applyIconCfg(imgEl, cfg){
    if (!imgEl) return;
    const c = cfg || {};
    const scale = Number(c.scale ?? 1);
    const fit = c.fit || "contain";
    const x = Number(c.x ?? 0);
    const y = Number(c.y ?? 0);
    imgEl.style.objectFit = fit;
    imgEl.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    imgEl.style.transformOrigin = "center";
  }

  // Preview render
  function createIconEl(it){
    if (it.enabled === false) return null;
    const a = document.createElement("a");
    a.className = "social";
    a.href = it.url || "#";
    a.target = "_blank";
    a.rel = "noopener";

    if (it.iconImage){
      const img = document.createElement("img");
      img.src = it.iconImage;
      img.alt = "";
      img.style.width = "18px";
      img.style.height = "18px";
      img.style.display = "block";
      applyIconCfg(img, it.iconCfg);
      a.appendChild(img);
      return a;
    }

    const key = it.type || "link";
    a.innerHTML = ICON_SVGS[key] || ICON_SVGS.link;
    const svg = a.querySelector("svg");
    if (svg){
      svg.style.width = "18px";
      svg.style.height = "18px";
      svg.style.stroke = "rgba(10,10,12,0.70)";
      svg.style.fill = "none";
      svg.style.strokeWidth = "2";
      svg.style.strokeLinecap = "round";
      svg.style.strokeLinejoin = "round";
    }
    return a;
  }

  function createLinkPreview(l){
    if (l.enabled === false) return null;
    const a = document.createElement("a");
    a.className = "link";
    a.href = l.url || "#";
    a.target = "_blank";
    a.rel = "noopener";
    a.style.textDecoration = "none";
    a.style.color = "inherit";
    a.style.display = "flex";
    a.style.alignItems = "center";
    a.style.gap = "10px";
    a.style.padding = "12px";
    a.style.borderRadius = "18px";
    a.style.border = "1px solid rgba(10,10,12,0.08)";
    a.style.background = "rgba(255,255,255,0.82)";

    const icon = document.createElement("div");
    icon.style.width = "40px";
    icon.style.height = "40px";
    icon.style.borderRadius = "16px";
    icon.style.display = "grid";
    icon.style.placeItems = "center";
    icon.style.background = "rgba(245,245,247,0.9)";
    icon.style.border = "1px solid rgba(10,10,12,0.06)";
    icon.style.overflow = "hidden";

    if (l.thumb){
      const img = document.createElement("img");
      img.src = normalizeAssetPath(l.thumb);
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      icon.appendChild(img);
    } else if (l.iconImage){
      const img = document.createElement("img");
      img.src = l.iconImage;
      img.style.width = "22px";
      img.style.height = "22px";
      img.style.objectFit = "contain";
      applyIconCfg(img, l.iconCfg);
      icon.appendChild(img);
    } else {
      const key = l.icon || guessIconFromUrl(l.url);
      icon.innerHTML = ICON_SVGS[key] || ICON_SVGS.link;
      const svg = icon.querySelector("svg");
      if (svg){
        svg.style.width = "22px";
        svg.style.height = "22px";
        svg.style.stroke = "rgba(10,10,12,0.70)";
        svg.style.fill = "none";
        svg.style.strokeWidth = "2";
        svg.style.strokeLinecap = "round";
        svg.style.strokeLinejoin = "round";
      }
    }

    const main = document.createElement("div");
    main.style.flex = "1 1 auto";
    const t = document.createElement("div");
    t.style.fontWeight = "950";
    t.textContent = l.title || "Untitled";
    main.appendChild(t);

    if (l.subtitle){
      const s = document.createElement("div");
      s.style.fontSize = "12px";
      s.style.color = "rgba(10,10,12,0.58)";
      s.textContent = l.subtitle;
      main.appendChild(s);
    }

    a.appendChild(icon);
    a.appendChild(main);
    return a;
  }

  function renderPreview(){
    // Keep sidebar brand in sync
    $("brandName").textContent = state.profile?.name || "The BFA Group";

    // Update iframe preview (same code as index page)
    postPreviewState();

    // Keep preview sizing responsive
    applyPreviewSize();
  }

  // Inline icon controls UI
  function iconControls(getCfg, setCfg){
    const wrap = document.createElement("div");
    wrap.className = "iconControlsRow";

    const label = document.createElement("div");
    label.className = "iconControlsLabel";
    label.textContent = "Icon size";
    wrap.appendChild(label);

    const minus = document.createElement("button");
    minus.type = "button";
    minus.className = "ghost";
    minus.textContent = "−";

    const val = document.createElement("div");
    val.className = "iconControlsValue";

    const plus = document.createElement("button");
    plus.type = "button";
    plus.className = "ghost";
    plus.textContent = "+";

    const seg = document.createElement("div");
    seg.className = "seg";
    const cBtn = document.createElement("button");
    cBtn.type="button"; cBtn.className="segBtn"; cBtn.textContent="Contain";
    const vBtn = document.createElement("button");
    vBtn.type="button"; vBtn.className="segBtn"; vBtn.textContent="Cover";
    seg.appendChild(cBtn); seg.appendChild(vBtn);

    const reset = document.createElement("button");
    reset.type="button";
    reset.className="ghost danger";
    reset.textContent="Reset";

    const refresh = ()=>{
      const cfg = getCfg();
      val.textContent = `${Number(cfg.scale ?? 1).toFixed(2)}x`;
      cBtn.classList.toggle("isActive", (cfg.fit || "contain") === "contain");
      vBtn.classList.toggle("isActive", (cfg.fit || "contain") === "cover");
    };

    minus.addEventListener("click", (e)=>{
      e.preventDefault(); e.stopPropagation();
      const cfg = getCfg();
      cfg.scale = Number(clamp((Number(cfg.scale ?? 1) - 0.05), 0.4, 2.0).toFixed(2));
      setCfg(cfg);
      refresh();
    });
    plus.addEventListener("click", (e)=>{
      e.preventDefault(); e.stopPropagation();
      const cfg = getCfg();
      cfg.scale = Number(clamp((Number(cfg.scale ?? 1) + 0.05), 0.4, 2.0).toFixed(2));
      setCfg(cfg);
      refresh();
    });
    cBtn.addEventListener("click", (e)=>{
      e.preventDefault(); e.stopPropagation();
      const cfg = getCfg();
      cfg.fit = "contain";
      setCfg(cfg);
      refresh();
    });
    vBtn.addEventListener("click", (e)=>{
      e.preventDefault(); e.stopPropagation();
      const cfg = getCfg();
      cfg.fit = "cover";
      setCfg(cfg);
      refresh();
    });
    reset.addEventListener("click", (e)=>{
      e.preventDefault(); e.stopPropagation();
      setCfg({ scale: 1, fit: "contain", x: 0, y: 0 });
      refresh();
    });

    wrap.appendChild(minus);
    wrap.appendChild(val);
    wrap.appendChild(plus);
    wrap.appendChild(seg);
    wrap.appendChild(reset);

    refresh();
    return wrap;
  }

  // Lists render
  function iconBtn(iconKey, title, onClick, opts={}){
    const b = document.createElement("button");
    b.type = "button";
    b.className = "iconBtn" + (opts.danger ? " danger" : "");
    b.title = title || "";
    b.innerHTML = ICON_SVGS[iconKey] || ICON_SVGS.link;
    const svg = b.querySelector("svg");
    if (svg){
      svg.style.width = "18px"; svg.style.height = "18px";
      svg.style.stroke = "rgba(10,10,12,0.70)";
      svg.style.fill = "none";
      svg.style.strokeWidth = "2";
      svg.style.strokeLinecap = "round";
      svg.style.strokeLinejoin = "round";
    }
    if (opts.disabled) b.disabled = true;
    b.addEventListener("click", (e)=>{ e.stopPropagation(); safe(()=> onClick()); });
    return b;
  }

  function makeToggle(checked, onChange){
    const lab = document.createElement("label");
    lab.className = "toggle";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!checked;
    cb.addEventListener("change", (e)=>{ e.stopPropagation(); safe(()=> onChange(cb.checked)); });
    const track = document.createElement("span");
    track.className = "track";
    const knob = document.createElement("span");
    knob.className = "knob";
    track.appendChild(knob);
    lab.appendChild(cb);
    lab.appendChild(track);
    return lab;
  }

  function field(labelText, inputEl, helpText){
    const f = document.createElement("div");
    f.className = "field";
    const lab = document.createElement("label");
    lab.textContent = labelText;
    f.appendChild(lab);
    f.appendChild(inputEl);
    if (helpText){
      const h = document.createElement("div");
      h.className = "help";
      h.textContent = helpText;
      f.appendChild(h);
    }
    return f;
  }

  function inputText(value, placeholder, onInput){
    const i = document.createElement("input");
    i.value = value || "";
    i.placeholder = placeholder || "";
    i.addEventListener("input", (e)=>{ e.stopPropagation(); safe(()=> onInput(i.value)); });
    return i;
  }

  function selectIcon(value, onChange){
    const sel = document.createElement("select");
    const options = [
      ["", "Auto"],
      ["website","Website"],
      ["instagram","Instagram"],
      ["youtube","YouTube"],
      ["linkedin","LinkedIn"],
      ["link","Generic link"]
    ];
    options.forEach(([v,t])=>{
      const o = document.createElement("option");
      o.value=v; o.textContent=t;
      if ((value||"")===v) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", (e)=>{ e.stopPropagation(); safe(()=> onChange(sel.value)); });
    return sel;
  }

  function renderRowIcon(container, item){
    container.innerHTML = "";
    if (item.iconImage){
      const img = document.createElement("img");
      img.src = item.iconImage;
      img.alt = "";
      applyIconCfg(img, item.iconCfg);
      container.appendChild(img);
      return;
    }
    const key = item.icon || item.type || guessIconFromUrl(item.url);
    container.innerHTML = ICON_SVGS[key] || ICON_SVGS.link;
    const svg = container.querySelector("svg");
    if (svg){
      svg.style.width = "18px";
      svg.style.height = "18px";
      svg.style.stroke = "rgba(10,10,12,0.70)";
      svg.style.fill = "none";
      svg.style.strokeWidth = "2";
      svg.style.strokeLinecap = "round";
      svg.style.strokeLinejoin = "round";
    }
  }

  function moveInArray(arr, from, to){
    if (!arr) return;
    if (from < 0 || to < 0 || from >= arr.length || to >= arr.length) return;
    const item = arr.splice(from, 1)[0];
    arr.splice(to, 0, item);
  }

  function attachSortable(container, getArray, onAfter){
    if (sortableAttached.has(container)) return;
    sortableAttached.add(container);

    let drag = null;

    const onMove = (e)=>{
      if (!drag) return;
      const y = e.clientY - drag.offsetY;
      drag.card.style.top = `${y}px`;

      const cards = Array.from(container.children).filter(el => el !== drag.placeholder);
      let placed = false;
      for (const c of cards){
        const r = c.getBoundingClientRect();
        const mid = r.top + r.height / 2;
        if (e.clientY < mid){
          container.insertBefore(drag.placeholder, c);
          placed = true;
          break;
        }
      }
      if (!placed) container.appendChild(drag.placeholder);
    };

    const onUp = ()=>{
      if (!drag) return;
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerup", onUp, true);
      isSorting = false;

      const from = drag.fromIndex;
      const to = Array.from(container.children).indexOf(drag.placeholder);

      drag.placeholder.replaceWith(drag.card);
      drag.card.classList.remove("dragging");
      drag.card.style.position = "";
      drag.card.style.left = "";
      drag.card.style.top = "";
      drag.card.style.width = "";
      drag.card.style.zIndex = "";
      drag.card.style.pointerEvents = "";

      if (from !== to && to >= 0){
        const arr = getArray();
        moveInArray(arr, from, to);
      }

      drag = null;
      onAfter();
    };

    container.addEventListener("pointerdown", (e)=>{
      const handle = e.target.closest(".handle");
      if (!handle) return;

      const card = handle.closest(".rowCard");
      if (!card || !container.contains(card)) return;

      e.preventDefault();
      e.stopPropagation();
      isSorting = true;

      const cards = Array.from(container.querySelectorAll(".rowCard"));
      const fromIndex = cards.indexOf(card);
      if (fromIndex < 0){ isSorting = false; return; }

      const rect = card.getBoundingClientRect();
      const ph = document.createElement("div");
      ph.className = "rowCard";
      ph.style.border = "2px dashed rgba(255,149,0,0.35)";
      ph.style.background = "rgba(255,149,0,0.06)";
      ph.style.height = `${rect.height}px`;
      ph.style.borderRadius = "18px";

      card.replaceWith(ph);
      document.body.appendChild(card);

      card.classList.add("dragging");
      card.style.width = `${rect.width}px`;
      card.style.position = "fixed";
      card.style.left = `${rect.left}px`;
      card.style.top = `${rect.top}px`;
      card.style.zIndex = "9999";
      card.style.pointerEvents = "none";

      drag = { card, placeholder: ph, fromIndex, offsetY: e.clientY - rect.top };

      document.addEventListener("pointermove", onMove, true);
      document.addEventListener("pointerup", onUp, true);
    }, { passive:false });
  }

  function renderLinks(){
    const wrap = $("linksList");
    wrap.innerHTML = "";

    (state.links || []).forEach((l, idx)=>{
      const card = document.createElement("div");
      card.className = "rowCard";

      const top = document.createElement("div");
      top.className = "rowTop";

      const handle = document.createElement("div");
      handle.className = "handle";
      const dots = document.createElement("div");
      dots.className = "handleDots";
      handle.appendChild(dots);

      const iconBox = document.createElement("div");
      iconBox.className = "rowIcon";
      renderRowIcon(iconBox, { url: l.url, icon: l.icon, iconImage: l.iconImage, iconCfg: l.iconCfg });

      const main = document.createElement("div");
      main.className = "rowMain";
      const title = document.createElement("div");
      title.className = "rowTitle";
      title.textContent = l.title || "Untitled";
      const url = document.createElement("div");
      url.className = "rowUrl";
      url.textContent = l.url ? safeHost(l.url) : "No URL yet";
      main.appendChild(title);
      main.appendChild(url);

      const actions = document.createElement("div");
      actions.className = "rowActions";

      const tog = makeToggle(l.enabled !== false, (checked)=>{
        state.links[idx].enabled = checked;
        renderPreview(); debounceSave();
      });

      const up = iconBtn("up", "Move up", ()=>{
        if (idx === 0) return;
        moveInArray(state.links, idx, idx-1);
        renderLinks(); renderPreview(); debounceSave();
      }, { disabled: idx===0 });

      const down = iconBtn("down", "Move down", ()=>{
        if (idx === state.links.length - 1) return;
        moveInArray(state.links, idx, idx+1);
        renderLinks(); renderPreview(); debounceSave();
      }, { disabled: idx===state.links.length-1 });

      const del = iconBtn("trash", "Delete", ()=>{
        state.links.splice(idx, 1);
        renderLinks(); renderPreview(); debounceSave();
      }, { danger: true });

      actions.appendChild(tog);
      actions.appendChild(up);
      actions.appendChild(down);
      actions.appendChild(del);

      top.appendChild(handle);
      top.appendChild(iconBox);
      top.appendChild(main);
      top.appendChild(actions);

      top.addEventListener("click", ()=>{
        if (isSorting) return;
        document.querySelectorAll("#linksList .rowCard.isOpen").forEach(el=>{
          if (el !== card) el.classList.remove("isOpen");
        });
        card.classList.toggle("isOpen");
      });

      const edit = document.createElement("div");
      edit.className = "rowEdit";

      const g = document.createElement("div");
      g.className = "grid2";

      g.appendChild(field("Title", inputText(l.title, "Website", (v)=>{
        state.links[idx].title = v;
        title.textContent = v || "Untitled";
        renderPreview(); debounceSave();
      })));

      g.appendChild(field("URL", inputText(l.url, "https://...", (v)=>{
        state.links[idx].url = v;
        url.textContent = v ? safeHost(v) : "No URL yet";
        if (!state.links[idx].icon && !state.links[idx].iconImage) renderRowIcon(iconBox, state.links[idx]);
        renderPreview(); debounceSave();
      })));

      g.appendChild(field("Subtitle", inputText(l.subtitle, "@bfa.autovisiontv", (v)=>{
        state.links[idx].subtitle = v;
        renderPreview(); debounceSave();
      })));

      g.appendChild(field("Badge", inputText(l.badge, "New", (v)=>{
        state.links[idx].badge = v;
        renderPreview(); debounceSave();
      })));

      g.appendChild(field("Icon (line)", selectIcon(l.icon || "", (v)=>{
        state.links[idx].icon = v;
        if (!state.links[idx].iconImage) renderRowIcon(iconBox, state.links[idx]);
        renderPreview(); debounceSave();
      }), "Auto picks based on the URL."));

      const iconUrl = inputText(l.iconImage || "", "Icon image URL or ./assets/icon.png", (v)=>{
        state.links[idx].iconImage = normalizeAssetPath(v);
        renderRowIcon(iconBox, { url: state.links[idx].url, icon: state.links[idx].icon, iconImage: state.links[idx].iconImage, iconCfg: state.links[idx].iconCfg });
        renderPreview(); debounceSave();
      });
      g.appendChild(field("Custom icon image", iconUrl, "Optional."));

      const upload = document.createElement("input");
      upload.type = "file";
      upload.accept = "image/*";
      upload.addEventListener("change", async ()=>{
        const file = upload.files?.[0];
        if(!file) return;
        try{
          const dataUrl = await readFileAsDataURL(file);
          state.links[idx].iconImage = dataUrl;
          iconUrl.value = dataUrl;
          renderRowIcon(iconBox, { url: state.links[idx].url, icon: state.links[idx].icon, iconImage: dataUrl, iconCfg: state.links[idx].iconCfg });
          renderPreview(); debounceSave();
          setStatus("Icon embedded");
        }catch{ setStatus("Could not read image"); }
        finally{ upload.value = ""; }
      });

      g.appendChild(field("Upload icon", upload, "Embeds into links.json."));

      // Advanced icon positioning (move/zoom)
      const editIconBtn2 = document.createElement("button");
      editIconBtn2.type = "button";
      editIconBtn2.className = "primary";
      editIconBtn2.textContent = "Edit icon (advanced)";
      editIconBtn2.addEventListener("click", (e)=>{
        e.preventDefault(); e.stopPropagation();
        iconEditContext = { kind: "icon", index: idx };
        openIconModal();
      });
      edit.appendChild(editIconBtn2);


      // Advanced icon positioning (move/zoom)
      const editIconBtn = document.createElement("button");
      editIconBtn.type = "button";
      editIconBtn.className = "primary";
      editIconBtn.textContent = "Edit icon (advanced)";
      editIconBtn.addEventListener("click", (e)=>{
        e.preventDefault(); e.stopPropagation();
        iconEditContext = { kind: "link", index: idx };
        openIconModal();
      });
      edit.appendChild(editIconBtn);


      edit.appendChild(g);

      edit.appendChild(iconControls(
        ()=> (state.links[idx].iconCfg || (state.links[idx].iconCfg = { scale: 1, fit: "contain", x: 0, y: 0 })),
        (cfg)=>{ state.links[idx].iconCfg = cfg; renderRowIcon(iconBox, { url: state.links[idx].url, icon: state.links[idx].icon, iconImage: state.links[idx].iconImage, iconCfg: cfg }); renderPreview(); debounceSave(); }
      ));

      card.appendChild(top);
      card.appendChild(edit);
      wrap.appendChild(card);
    });

    attachSortable(wrap, ()=> state.links, ()=>{ renderLinks(); renderPreview(); debounceSave(); });
  }

  function renderIcons(){
    const wrap = $("iconsList");
    wrap.innerHTML = "";

    (state.icons || []).forEach((it, idx)=>{
      const card = document.createElement("div");
      card.className = "rowCard";

      const top = document.createElement("div");
      top.className = "rowTop";

      const handle = document.createElement("div");
      handle.className = "handle";
      const dots = document.createElement("div");
      dots.className = "handleDots";
      handle.appendChild(dots);

      const iconBox = document.createElement("div");
      iconBox.className = "rowIcon";
      renderRowIcon(iconBox, { type: it.type, url: it.url, iconImage: it.iconImage, iconCfg: it.iconCfg });

      const main = document.createElement("div");
      main.className = "rowMain";
      const title = document.createElement("div");
      title.className = "rowTitle";
      title.textContent = it.type || "icon";
      const url = document.createElement("div");
      url.className = "rowUrl";
      url.textContent = it.url ? safeHost(it.url) : "No URL yet";
      main.appendChild(title);
      main.appendChild(url);

      const actions = document.createElement("div");
      actions.className = "rowActions";

      const tog = makeToggle(it.enabled !== false, (checked)=>{
        state.icons[idx].enabled = checked;
        renderPreview(); debounceSave();
      });

      const up = iconBtn("up", "Move up", ()=>{
        if (idx === 0) return;
        moveInArray(state.icons, idx, idx-1);
        renderIcons(); renderPreview(); debounceSave();
      }, { disabled: idx===0 });

      const down = iconBtn("down", "Move down", ()=>{
        if (idx === state.icons.length - 1) return;
        moveInArray(state.icons, idx, idx+1);
        renderIcons(); renderPreview(); debounceSave();
      }, { disabled: idx===state.icons.length-1 });

      const del = iconBtn("trash", "Delete", ()=>{
        state.icons.splice(idx, 1);
        renderIcons(); renderPreview(); debounceSave();
      }, { danger:true });

      actions.appendChild(tog);
      actions.appendChild(up);
      actions.appendChild(down);
      actions.appendChild(del);

      top.appendChild(handle);
      top.appendChild(iconBox);
      top.appendChild(main);
      top.appendChild(actions);

      top.addEventListener("click", ()=>{
        if (isSorting) return;
        document.querySelectorAll("#iconsList .rowCard.isOpen").forEach(el=>{
          if (el !== card) el.classList.remove("isOpen");
        });
        card.classList.toggle("isOpen");
      });

      const edit = document.createElement("div");
      edit.className = "rowEdit";

      const g = document.createElement("div");
      g.className = "grid2";

      const sel = document.createElement("select");
      SOCIAL_TYPES.forEach(t=>{
        const o = document.createElement("option");
        o.value=t; o.textContent=t;
        if (t === (it.type || "website")) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener("change", (e)=>{
        e.stopPropagation();
        state.icons[idx].type = sel.value;
        title.textContent = sel.value;
        renderRowIcon(iconBox, { type: state.icons[idx].type, url: state.icons[idx].url, iconImage: state.icons[idx].iconImage, iconCfg: state.icons[idx].iconCfg });
        renderPreview(); debounceSave();
      });
      g.appendChild(field("Type", sel));

      g.appendChild(field("URL", inputText(it.url, "https://...", (v)=>{
        state.icons[idx].url = v;
        url.textContent = v ? safeHost(v) : "No URL yet";
        renderPreview(); debounceSave();
      })));

      const iconUrl = inputText(it.iconImage || "", "Icon image URL or ./assets/icon.png", (v)=>{
        state.icons[idx].iconImage = normalizeAssetPath(v);
        renderRowIcon(iconBox, { type: state.icons[idx].type, url: state.icons[idx].url, iconImage: state.icons[idx].iconImage, iconCfg: state.icons[idx].iconCfg });
        renderPreview(); debounceSave();
      });
      g.appendChild(field("Custom icon image", iconUrl, "Optional."));

      const upload = document.createElement("input");
      upload.type = "file";
      upload.accept = "image/*";
      upload.addEventListener("change", async ()=>{
        const file = upload.files?.[0];
        if(!file) return;
        try{
          const dataUrl = await readFileAsDataURL(file);
          state.icons[idx].iconImage = dataUrl;
          iconUrl.value = dataUrl;
          renderRowIcon(iconBox, { type: state.icons[idx].type, url: state.icons[idx].url, iconImage: dataUrl, iconCfg: state.icons[idx].iconCfg });
          renderPreview(); debounceSave();
          setStatus("Icon embedded");
        }catch{ setStatus("Could not read image"); }
        finally{ upload.value = ""; }
      });
      g.appendChild(field("Upload icon", upload, "Embeds into links.json."));

      edit.appendChild(g);

      edit.appendChild(iconControls(
        ()=> (state.icons[idx].iconCfg || (state.icons[idx].iconCfg = { scale: 1, fit: "contain", x: 0, y: 0 })),
        (cfg)=>{ state.icons[idx].iconCfg = cfg; renderRowIcon(iconBox, { type: state.icons[idx].type, url: state.icons[idx].url, iconImage: state.icons[idx].iconImage, iconCfg: cfg }); renderPreview(); debounceSave(); }
      ));

      card.appendChild(top);
      card.appendChild(edit);
      wrap.appendChild(card);
    });

    attachSortable(wrap, ()=> state.icons, ()=>{ renderIcons(); renderPreview(); debounceSave(); });
  }

  // Profile UI sync
  function renderProfileForm(){
    $("p_name").value = state.profile.name || "";
    $("p_bio").value = state.profile.bio || "";
    $("p_avatar").value = state.profile.avatar || "";

    $("logo_show").checked = (state.profile.show !== false);
    $("logo_bg").value = state.profile.bg || "#ffffff";
    $("logo_bg_transparent").checked = !!state.profile.bgTransparent;
    $("logo_border").checked = (state.profile.border !== false);

    $("bg_type").value = state.theme.type || "default";
    $("bg_color").value = state.theme.color || "#f5f5f7";
    $("bg_image").value = state.theme.image || "";
  }

  // Logo modal
  function syncLogoModal(){
    const p = state.profile;
    $("logoStageImg").src = normalizeAssetPath(p.avatar || "");
    $("logoStageImg").style.objectFit = p.fit || "contain";
    $("logoStageImg").style.transform = `translate(${p.x}px, ${p.y}px) scale(${p.scale})`;

    const shell = $("logoStageShell");
    shell.style.width = `${p.w}px`;
    shell.style.height = `${p.h}px`;
    shell.style.padding = `${p.pad}px`;
    shell.style.borderRadius = `${p.radius}px`;
    shell.style.background = p.bgTransparent ? "transparent" : (p.bg || "rgba(255,255,255,0.72)");
    shell.style.border = (p.border === false) ? "none" : "1px solid rgba(10,10,12,0.10)";

    $("fitContain").classList.toggle("isActive", (p.fit || "contain") === "contain");
    $("fitCover").classList.toggle("isActive", (p.fit || "contain") === "cover");
  }

  
  // Icon modal (for custom icon images)
  let iconEditContext = null; // { kind: "link"|"icon", index: number }

  function getIconTarget(){
    if (!iconEditContext) return null;
    const { kind, index } = iconEditContext;
    if (kind === "link") return state.links?.[index] || null;
    if (kind === "icon") return state.icons?.[index] || null;
    return null;
  }

  function ensureIconCfg(target){
    if (!target) return { scale: 1, fit: "contain", x: 0, y: 0 };
    target.iconCfg = { scale: 1, fit: "contain", x: 0, y: 0, ...(target.iconCfg || {}) };
    return target.iconCfg;
  }

  function syncIconModal(){
    const t = getIconTarget();
    const img = $("iconStageImg");
    const shell = $("iconStageShell");
    if (!t || !img || !shell){
      return;
    }
    const cfg = ensureIconCfg(t);

    // set image source (prefer iconImage)
    const src = t.iconImage || "";
    img.src = src;

    img.style.objectFit = cfg.fit || "contain";
    img.style.transform = `translate(${Number(cfg.x||0)}px, ${Number(cfg.y||0)}px) scale(${Number(cfg.scale||1)})`;

    $("iconFitContain")?.classList.toggle("isActive", (cfg.fit || "contain") === "contain");
    $("iconFitCover")?.classList.toggle("isActive", (cfg.fit || "contain") === "cover");
  }

  function openIconModal(){
    const t = getIconTarget();
    if (!t || !t.iconImage){
      setStatus("Add an icon image first");
      return;
    }
    $("iconModal")?.classList.add("isOpen");
    $("iconModal")?.setAttribute("aria-hidden","false");
    syncIconModal();
  }

  function closeIconModal(){
    $("iconModal")?.classList.remove("isOpen");
    $("iconModal")?.setAttribute("aria-hidden","true");
    iconEditContext = null;
  }

function openLogoModal(){
    $("logoModal").classList.add("isOpen");
    $("logoModal").setAttribute("aria-hidden","false");
    syncLogoModal();
  }
  function closeLogoModal(){
    $("logoModal").classList.remove("isOpen");
    $("logoModal").setAttribute("aria-hidden","true");
  }

  function wire(){
    // Tabs
    document.querySelectorAll(".navItem").forEach(btn=>{
      btn.addEventListener("click", (e)=>{
        e.preventDefault();
        setTab(btn.dataset.tab);
      });
    });

    $("downloadTop").addEventListener("click", ()=> downloadJson());
    // Stepper: Next button
    $("stepNext")?.addEventListener("click", (e)=>{
      e.preventDefault();
      const tab = getCurrentTab();
      const idx = STEP_ORDER.indexOf(tab);

      if (tab === "export"){
        downloadJson();
        return;
      }
      const nextTab = STEP_ORDER[Math.min(idx + 1, STEP_ORDER.length - 1)] || "export";
      setTab(nextTab);
      // scroll to top of the editor pane
      document.querySelector(".tabsCol")?.scrollTo({ top: 0, behavior: "smooth" });
      updateStepperUI();
    });

    $("downloadCta")?.addEventListener("click", (e)=>{ e.preventDefault(); downloadJson(); });


    // Float preview toggle (moveable)
    $("toggleFloat")?.addEventListener("click", ()=>{
      const on = !floatOn;
      $("toggleFloat").setAttribute("aria-pressed", on ? "true" : "false");
      setFloat(on);
    });

    // Drag preview when floating
    (function(){
      const handle = $("previewHandle");
      const panel = document.querySelector(".preview");
      if (!handle || !panel) return;

      let dragging = false;
      let sx=0, sy=0, startLeft=0, startTop=0;

      const down = (e)=>{
        if (!floatOn) return;
        dragging = true;
        handle.style.cursor = "grabbing";
        sx = e.clientX; sy = e.clientY;
        const r = panel.getBoundingClientRect();
        startLeft = r.left; startTop = r.top;
        handle.setPointerCapture && handle.setPointerCapture(e.pointerId);
        e.preventDefault();
      };
      const move = (e)=>{
        if (!dragging) return;
        const dx = e.clientX - sx;
        const dy = e.clientY - sy;
        const left = startLeft + dx;
        const top = startTop + dy;
        panel.style.left = left + "px";
        panel.style.top = top + "px";
        panel.style.right = "auto";
        panel.style.bottom = "auto";
      };
      const up = (e)=>{
        if (!dragging) return;
        dragging = false;
        handle.style.cursor = "grab";
        try{ handle.releasePointerCapture && handle.releasePointerCapture(e.pointerId); }catch{}
      };

      handle.addEventListener("pointerdown", down);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    })();


    // Preview iframe boot
    const frame = $("previewFrame");
    if (frame){
      frame.src = "./index.html?preview=1&ts=" + Date.now();
      frame.addEventListener("load", ()=>{ postPreviewState(); });

    // Dock resize (drag corner)
    (function(){
      const dock = document.getElementById("previewDock");
      const grip = document.getElementById("previewResize");
      if (!dock || !grip) return;

      const KEY = "bfa_preview_dock_size_v52";
      try{
        const saved = JSON.parse(localStorage.getItem(KEY) || "null");
        if (saved && saved.w){
          document.documentElement.style.setProperty("--dockW", saved.w + "px");
        }
        if (saved && saved.h){
          document.documentElement.style.setProperty("--dockH", saved.h + "px");
        }
      }catch{}

      let resizing = false;
      let sx=0, sy=0, sw=0, sh=0;

      grip.addEventListener("pointerdown", (e)=>{
        e.preventDefault(); e.stopPropagation();
        resizing = true;
        sx = e.clientX; sy = e.clientY;
        const r = dock.getBoundingClientRect();
        sw = r.width; sh = r.height;
        grip.setPointerCapture && grip.setPointerCapture(e.pointerId);
      });

      const move = (e)=>{
        if (!resizing) return;
        const dx = e.clientX - sx;
        const dy = e.clientY - sy;
        const w = Math.max(300, Math.min(720, sw + dx));
        const h = Math.max(420, Math.min(900, sh + dy));
        document.documentElement.style.setProperty("--dockW", Math.round(w) + "px");
        document.documentElement.style.setProperty("--dockH", Math.round(h) + "px");
        applyPreviewSize();
      };

      const up = (e)=>{
        if (!resizing) return;
        resizing = false;
        try{ grip.releasePointerCapture && grip.releasePointerCapture(e.pointerId); }catch{}
        try{
          const r = dock.getBoundingClientRect();
          localStorage.setItem(KEY, JSON.stringify({ w: Math.round(r.width), h: Math.round(r.height) }));
        }catch{}
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    })();
    }


    $("toggleBig").addEventListener("click", ()=>{
      const on = !previewPrefs.big;
      $("toggleBig").setAttribute("aria-pressed", on ? "true" : "false");
      setBig(on);
    });

    // Preview aspect buttons
    $("aspect916")?.addEventListener("click", (e)=>{ e.preventDefault(); setAspect("9:16"); });
    $("aspect169")?.addEventListener("click", (e)=>{ e.preventDefault(); setAspect("16:9"); });
    window.addEventListener("resize", ()=> applyPreviewSize());


    // Links/icons add
    $("addLink").addEventListener("click", ()=>{
      state.links.unshift({ title:"New link", subtitle:"", url:"", badge:"", thumb:"", enabled:true, icon:"", iconImage:"", iconCfg:{ scale:1, fit:"contain" } });
      renderLinks(); renderPreview(); debounceSave();
    });
    $("addIcon").addEventListener("click", ()=>{
      state.icons.push({ type:"website", url:"", enabled:true, iconImage:"", iconCfg:{ scale:1, fit:"contain" } });
      renderIcons(); renderPreview(); debounceSave();
    });

    // Profile inputs
    $("p_name").addEventListener("input", ()=>{
      state.profile.name = $("p_name").value;
      renderPreview(); debounceSave();
    });
    $("p_bio").addEventListener("input", ()=>{
      state.profile.bio = $("p_bio").value;
      renderPreview(); debounceSave();
    });
    $("p_avatar").addEventListener("input", ()=>{
      state.profile.avatar = normalizeAssetPath($("p_avatar").value);
      renderPreview(); debounceSave();
    });

    $("p_avatar_file").addEventListener("change", async ()=>{
      const file = $("p_avatar_file").files?.[0];
      if (!file) return;
      try{
        const dataUrl = await readFileAsDataURL(file);
        state.profile.avatar = dataUrl;
        $("p_avatar").value = dataUrl;
        renderPreview(); debounceSave();
        setStatus("Logo embedded");
      }catch{
        setStatus("Could not read logo");
      }finally{
        $("p_avatar_file").value = "";
      }
    });

    // Logo appearance
    $("logo_show").addEventListener("change", ()=>{
      state.profile.show = $("logo_show").checked;
      renderPreview(); debounceSave();
    });
    $("logo_bg").addEventListener("input", ()=>{
      state.profile.bg = $("logo_bg").value;
      state.profile.bgTransparent = false;
      $("logo_bg_transparent").checked = false;
      renderPreview(); debounceSave();
    });
    $("logo_bg_transparent").addEventListener("change", ()=>{
      state.profile.bgTransparent = $("logo_bg_transparent").checked;
      renderPreview(); debounceSave();
    });
    $("logo_border").addEventListener("change", ()=>{
      state.profile.border = $("logo_border").checked;
      renderPreview(); debounceSave();
    });

    // Background
    $("bg_type").addEventListener("change", ()=>{
      state.theme.type = $("bg_type").value;
      renderPreview(); debounceSave();
    });
    $("bg_color").addEventListener("input", ()=>{
      state.theme.color = $("bg_color").value;
      renderPreview(); debounceSave();
    });
    $("bg_image").addEventListener("input", ()=>{
      state.theme.image = normalizeAssetPath($("bg_image").value);
      renderPreview(); debounceSave();
    });
    $("bg_image_file").addEventListener("change", async ()=>{
      const file = $("bg_image_file").files?.[0];
      if (!file) return;
      try{
        const dataUrl = await readFileAsDataURL(file);
        state.theme.type = "image";
        state.theme.image = dataUrl;
        $("bg_type").value = "image";
        $("bg_image").value = dataUrl;
        renderPreview(); debounceSave();
        setStatus("Background embedded");
      }catch{
        setStatus("Could not read background");
      }finally{
        $("bg_image_file").value = "";
      }
    });

    // Export
    $("download").addEventListener("click", ()=> downloadJson());
    $("import").addEventListener("change", async ()=>{
      const file = $("import").files?.[0];
      if (!file) return;
      try{
        const txt = await file.text();
        const parsed = JSON.parse(txt);
        state = normalizeIncoming(parsed);
        localStorage.setItem(LS_KEY, JSON.stringify(state));
        setStatus("Imported");
        renderAll();
      }catch{
        setStatus("Import failed");
      }finally{
        $("import").value = "";
      }
    });
    $("resetDraft").addEventListener("click", ()=>{
      try{ localStorage.removeItem(LS_KEY); }catch{}
      state = defaultState();
      renderAll();
      setStatus("Draft reset");
    });
    $("reloadFromSite").addEventListener("click", async ()=>{
      try{ localStorage.removeItem(LS_KEY); }catch{}
      await loadInitial(true);
    });

    
    // Icon modal open/close
    $("iconModalClose")?.addEventListener("click", (e)=>{ e.preventDefault(); closeIconModal(); });
    $("iconModalBackdrop")?.addEventListener("click", (e)=>{ e.preventDefault(); closeIconModal(); });
    $("iconDoneBtn")?.addEventListener("click", (e)=>{ e.preventDefault(); closeIconModal(); });

    $("iconFitContain")?.addEventListener("click", (e)=>{
      e.preventDefault();
      const t = getIconTarget(); if(!t) return;
      const cfg = ensureIconCfg(t);
      cfg.fit = "contain";
      syncIconModal(); renderPreview(); debounceSave();
    });
    $("iconFitCover")?.addEventListener("click", (e)=>{
      e.preventDefault();
      const t = getIconTarget(); if(!t) return;
      const cfg = ensureIconCfg(t);
      cfg.fit = "cover";
      syncIconModal(); renderPreview(); debounceSave();
    });

    $("iconResetBtn")?.addEventListener("click", (e)=>{
      e.preventDefault();
      const t = getIconTarget(); if(!t) return;
      t.iconCfg = { scale: 1, fit: "contain", x: 0, y: 0 };
      syncIconModal(); renderPreview(); debounceSave();
    });

    // Drag icon to move
    (function(){
      const img = $("iconStageImg");
      if (!img) return;
      let moving = false;
      let mx=0,my=0,sx=0,sy=0;

      img.addEventListener("pointerdown", (e)=>{
        if (!iconEditContext) return;
        e.preventDefault(); e.stopPropagation();
        const t = getIconTarget(); if(!t) return;
        const cfg = ensureIconCfg(t);

        moving = true;
        mx = e.clientX; my = e.clientY;
        sx = Number(cfg.x||0); sy = Number(cfg.y||0);
        img.setPointerCapture(e.pointerId);
        img.style.cursor = "grabbing";
      });

      img.addEventListener("pointermove", (e)=>{
        if (!moving) return;
        const t = getIconTarget(); if(!t) return;
        const cfg = ensureIconCfg(t);

        const dx = e.clientX - mx;
        const dy = e.clientY - my;
        cfg.x = Math.round(sx + dx);
        cfg.y = Math.round(sy + dy);

        syncIconModal(); renderPreview();
      });

      const endMove = (e)=>{
        if (!moving) return;
        moving = false;
        img.style.cursor = "grab";
        debounceSave();
        try{ img.releasePointerCapture(e.pointerId); }catch{}
      };

      img.addEventListener("pointerup", endMove);
      img.addEventListener("pointercancel", endMove);
    })();

    // Scroll to zoom
    $("iconStageShell")?.addEventListener("wheel", (e)=>{
      if (!iconEditContext) return;
      e.preventDefault();
      const t = getIconTarget(); if(!t) return;
      const cfg = ensureIconCfg(t);
      const delta = (e.deltaY > 0) ? -0.05 : 0.05;
      cfg.scale = Number(clamp((Number(cfg.scale ?? 1) + delta), 0.4, 3.0).toFixed(2));
      syncIconModal(); renderPreview(); debounceSave();
    }, { passive:false });

// Logo modal open/close
    $("openLogoModal").addEventListener("click", (e)=>{ e.preventDefault(); openLogoModal(); });
    $("logoModalClose").addEventListener("click", (e)=>{ e.preventDefault(); closeLogoModal(); });
    $("logoModalBackdrop").addEventListener("click", (e)=>{ e.preventDefault(); closeLogoModal(); });
    $("logoDoneBtn").addEventListener("click", (e)=>{ e.preventDefault(); closeLogoModal(); });

    // Modal shape presets
    $("shapeSquare").addEventListener("click", ()=>{
      state.profile.w = 54; state.profile.h = 54;
      syncLogoModal(); renderPreview(); debounceSave();
    });
    $("shapeWide").addEventListener("click", ()=>{
      state.profile.w = 140; state.profile.h = 54;
      syncLogoModal(); renderPreview(); debounceSave();
    });
    $("shapeTall").addEventListener("click", ()=>{
      state.profile.w = 54; state.profile.h = 110;
      syncLogoModal(); renderPreview(); debounceSave();
    });

    // Modal fit
    $("fitContain").addEventListener("click", ()=>{
      state.profile.fit = "contain";
      syncLogoModal(); renderPreview(); debounceSave();
    });
    $("fitCover").addEventListener("click", ()=>{
      state.profile.fit = "cover";
      syncLogoModal(); renderPreview(); debounceSave();
    });

    $("logoResetBtn").addEventListener("click", ()=>{
      const d = defaultState().profile;
      // keep avatar
      const avatar = state.profile.avatar;
      state.profile = { ...d, avatar };
      renderProfileForm();
      syncLogoModal();
      renderPreview();
      debounceSave();
    });

    // Drag resize handle (free resize)
    const handle = $("logoResizeHandle");
    let resizing = false;
    let startX=0, startY=0, startW=0, startH=0;

    handle.addEventListener("pointerdown", (e)=>{
      e.preventDefault(); e.stopPropagation();
      resizing = true;
      startX = e.clientX; startY = e.clientY;
      startW = state.profile.w; startH = state.profile.h;
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener("pointermove", (e)=>{
      if (!resizing) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      state.profile.w = Math.round(clamp(startW + dx, 44, 220) / 2) * 2;
      state.profile.h = Math.round(clamp(startH + dy, 44, 180) / 2) * 2;
      syncLogoModal(); renderPreview();
    });
    const endResize = (e)=>{
      if (!resizing) return;
      resizing = false;
      debounceSave();
      try{ handle.releasePointerCapture(e.pointerId); }catch{}
    };
    handle.addEventListener("pointerup", endResize);
    handle.addEventListener("pointercancel", endResize);

    // Drag logo to move
    const img = $("logoStageImg");
    let moving = false;
    let mx=0,my=0,sx=0,sy=0;
    img.addEventListener("pointerdown", (e)=>{
      e.preventDefault(); e.stopPropagation();
      moving = true;
      mx = e.clientX; my = e.clientY;
      sx = state.profile.x; sy = state.profile.y;
      img.setPointerCapture(e.pointerId);
      img.style.cursor = "grabbing";
    });
    img.addEventListener("pointermove", (e)=>{
      if (!moving) return;
      const dx = e.clientX - mx;
      const dy = e.clientY - my;
      state.profile.x = Math.round(sx + dx);
      state.profile.y = Math.round(sy + dy);
      syncLogoModal(); renderPreview();
    });
    const endMove = (e)=>{
      if (!moving) return;
      moving = false;
      img.style.cursor = "grab";
      debounceSave();
      try{ img.releasePointerCapture(e.pointerId); }catch{}
    };
    img.addEventListener("pointerup", endMove);
    img.addEventListener("pointercancel", endMove);

    // Scroll to zoom
    $("logoStageShell").addEventListener("wheel", (e)=>{
      e.preventDefault();
      const delta = (e.deltaY > 0) ? -0.05 : 0.05;
      state.profile.scale = Number(clamp((state.profile.scale || 1) + delta, 0.6, 2.0).toFixed(2));
      syncLogoModal(); renderPreview(); debounceSave();
    }, { passive:false });
  }

  
  function buildExportData(){
    const out = JSON.parse(JSON.stringify(state));
    out.updatedAt = Date.now();

    // legacy keys
    out.profile.avatarShow = out.profile.show;
    out.profile.avatarBg = out.profile.bg;
    out.profile.avatarBgTransparent = out.profile.bgTransparent;
    out.profile.avatarBorder = out.profile.border;
    out.profile.avatarW = out.profile.w;
    out.profile.avatarH = out.profile.h;
    out.profile.avatarPadding = out.profile.pad;
    out.profile.avatarRadius = out.profile.radius;
    out.profile.avatarFit = out.profile.fit;
    out.profile.avatarScale = out.profile.scale;
    out.profile.avatarX = out.profile.x;
    out.profile.avatarY = out.profile.y;

    // public page expects socials
    out.socials = out.icons;
    return out;
  }

  function postPreviewState(){
    const frame = $("previewFrame");
    if (!frame) return;
    const data = buildExportData();
    try{
      frame.contentWindow && frame.contentWindow.postMessage({ type: "previewState", state: data }, "*");
    }catch{}
  }

function downloadJson(){
    // Map to compatible output keys too (so older app.js can still read if needed)
    const out = JSON.parse(JSON.stringify(state));
    out.updatedAt = Date.now();

    // Provide legacy keys
    out.profile.avatarShow = out.profile.show;
    out.profile.avatarBg = out.profile.bg;
    out.profile.avatarBgTransparent = out.profile.bgTransparent;
    out.profile.avatarBorder = out.profile.border;
    out.profile.avatarW = out.profile.w;
    out.profile.avatarH = out.profile.h;
    out.profile.avatarPadding = out.profile.pad;
    out.profile.avatarRadius = out.profile.radius;
    out.profile.avatarFit = out.profile.fit;
    out.profile.avatarScale = out.profile.scale;
    out.profile.avatarX = out.profile.x;
    out.profile.avatarY = out.profile.y;

    // Also expose socials alias
    out.socials = out.icons;

    const dataStr = JSON.stringify(out, null, 2);
    const blob = new Blob([dataStr], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "links.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus("Downloaded links.json");
  }

  async function loadInitial(forceSite=false){
    showError("");
    try{
      if (!forceSite){
        const saved = localStorage.getItem(LS_KEY);
        if (saved){
          state = normalizeIncoming(JSON.parse(saved));
          setStatus("Loaded draft");
          renderAll();
          return;
        }
      }
    }catch{}

    try{
      const res = await fetch("./links.json", { cache: "no-store" });
      const data = await res.json();
      state = normalizeIncoming(data);
      setStatus("Loaded from site");
    }catch{
      state = defaultState();
      setStatus("New draft");
    }
    renderAll();
  }

  function renderAll(){
    renderProfileForm();
    renderLinks();
    renderIcons();
    renderPreview();
  }

  // init
  safe(()=>{
    setTab("profile");
    updateStepperUI();
    wire();
    setAspect(previewPrefs.aspect || "9:16");
    $("toggleBig").setAttribute("aria-pressed", previewPrefs.big ? "true" : "false");
    setBig(!!previewPrefs.big);
    $("toggleFloat")?.setAttribute("aria-pressed", floatOn ? "true" : "false");
    setFloat(floatOn);
    loadInitial(false);
  });
})();