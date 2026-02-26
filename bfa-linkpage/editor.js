const $ = (id) => document.getElementById(id);

const LS_KEY = "bfa_linktree_editor_draft_v8";
const SOCIAL_TYPES = ["instagram","website","linkedin","youtube","tiktok","facebook"];

// Simple line icons (stroke SVG)
const ICON_SVGS = {
  website: `<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M2 12h20"/><path d="M12 2c2.5 2.7 4 6.2 4 10s-1.5 7.3-4 10c-2.5-2.7-4-6.2-4-10S9.5 4.7 12 2z"/></svg>`,
  link: `<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1"/><path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24"><path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2z"/><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/><path d="M17.5 6.5h.01"/></svg>`,
  youtube: `<svg viewBox="0 0 24 24"><path d="M21 12s0-4-1-5-4-1-8-1-7 0-8 1-1 5-1 5 0 4 1 5 4 1 8 1 7 0 8-1 1-5 1-5z"/><path d="M10 9.5l5 2.5-5 2.5z"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24"><path d="M4 9h4v11H4z"/><path d="M6 4.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/><path d="M10 9h4v1.8c.6-1.1 1.9-2 3.8-2 3 0 4.2 2 4.2 5v6.2h-4v-5.6c0-1.6-.4-2.8-2-2.8-1.2 0-2 .8-2 2.3V20h-4z"/></svg>`,
  edit: `<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M7 6l1 14h8l1-14"/></svg>`,
  up: `<svg viewBox="0 0 24 24"><path d="M12 5v14"/><path d="M6 11l6-6 6 6"/></svg>`,
  down: `<svg viewBox="0 0 24 24"><path d="M12 5v14"/><path d="M6 13l6 6 6-6"/></svg>`
};

let state = null;
let saveTimer = null;
let isSorting = false;

// One-time sortable attachment guard
const sortableAttached = new WeakSet();

function defaultState(){
  return {
    profile: { name: "The BFA Group", avatar: "./assets/logo.png", bio: "", avatarSize: 54, avatarPadding: 8, avatarFit: "contain", avatarRadius: 16, avatarScale: 1 },
    theme: { type: "default", color: "#f6f7fb", image: "" },
    socials: [{ type: "instagram", url: "", enabled: true, iconImage: "" }, { type: "website", url: "", enabled: true, iconImage: "" }],
    links: [{ title: "Website", subtitle: "", url: "", thumb: "", badge: "", enabled: true, icon: "", iconImage: "" }],
    footerText: ""
  };
}

function normalizeAssetPath(p){
  if (!p) return "";
  const s = String(p).trim();
  if (s.startsWith("/assets/")) return "." + s;
  return s;
}

function safeHost(url){
  try{
    const u = new URL(url);
    return u.hostname.replace(/^www\./,"");
  }catch{
    return (url || "").trim();
  }
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

function setStatus(msg){
  $("status").textContent = msg || "Ready";
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

function readFileAsDataURL(file){
  return new Promise((resolve, reject)=>{
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}



function ensureAvatarShellEditor(imgEl){
  if (!imgEl) return { shell:null, img:null };
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
function applyAvatarStyle(imgEl, profile){
  const p = profile || {};
  const size = Number(p.avatarSize ?? 54);
  const pad  = Number(p.avatarPadding ?? 8);
  const fit  = p.avatarFit || "contain";
  const rad  = Number(p.avatarRadius ?? 16);
  const scale = Number(p.avatarScale ?? 1);

  const { shell, img } = ensureAvatarShellEditor(imgEl);
  if (!shell || !img) return;

  shell.style.width = `${size}px`;
  shell.style.height = `${size}px`;
  shell.style.padding = `${pad}px`;
  shell.style.borderRadius = `${rad}px`;
  shell.style.boxSizing = "border-box";

  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = fit;
  img.style.transform = `scale(${scale})`;
  img.style.transformOrigin = "center";
}
/* Tabs */
function setTab(tab){
  document.querySelectorAll(".navItem").forEach(b=>{
    b.classList.toggle("isActive", b.dataset.tab === tab);
  });
  document.querySelectorAll(".tab").forEach(t=>{
    t.classList.toggle("isActive", t.id === "tab-" + tab);
  });

  const titles = {
    links: ["Links", "Drag the dots OR use ↑ ↓ to reorder. Click a row to edit. Toggle off to hide."],
    profile: ["Profile", "Name, logo, bio + background"],
    icons: ["Icons", "Drag the dots OR use ↑ ↓ to reorder icons under the name."],
    export: ["Export", "Download your updated links.json."]
  };
  $("pageTitle").textContent = titles[tab]?.[0] || "Links";
  $("pageHint").textContent = titles[tab]?.[1] || "";
}

/* Theme preview */
function applyThemeToPreview(){
  const screen = document.querySelector(".phoneScreen");
  if (!screen) return;

  const t = state.theme || {};
  const type = t.type || "default";
  const color = t.color || "#f6f7fb";
  const image = t.image || "";

  // Reset
  screen.style.background = "";
  screen.style.backgroundImage = "";
  screen.style.backgroundSize = "";
  screen.style.backgroundPosition = "";
  screen.style.backgroundRepeat = "";
  screen.style.backgroundAttachment = "";

  if (type === "color"){
    screen.style.background = color;
    return;
  }
  if (type === "gradient"){
    screen.style.background = `radial-gradient(900px 520px at 25% -120px, rgba(255,149,0,0.20), transparent 60%), radial-gradient(900px 520px at 85% 18%, rgba(10,10,12,0.06), transparent 60%), ${color}`;
    return;
  }
  if (type === "image" && image){
    screen.style.background = color;
    screen.style.backgroundImage = `url("${image}")`;
    screen.style.backgroundSize = "cover";
    screen.style.backgroundPosition = "center";
    screen.style.backgroundRepeat = "no-repeat";
    return;
  }
  // default: keep empty so the phone shows neutral background
}

/* Preview */
function createSocialEl(s){
  if (s.enabled === false) return null;
  const a = document.createElement("a");
  a.className = "social";
  a.href = s.url || "#";
  a.target = "_blank";
  a.rel = "noopener";

  if (s.iconImage){
    const img = document.createElement("img");
    img.src = s.iconImage;
    img.alt = "";
    img.style.width = "18px";
    img.style.height = "18px";
    img.style.objectFit = "contain";
    a.appendChild(img);
  } else {
    const key = s.type || "link";
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
  }

  if (!s.url) a.style.opacity = "0.55";
  return a;
}

function createLinkEl(l){
  if (l.enabled === false) return null;

  const a = document.createElement("a");
  a.className = "link";
  a.href = l.url || "#";
  a.target = "_blank";
  a.rel = "noopener";
  if(!l.url) a.style.opacity = "0.75";

  const thumb = document.createElement((l.thumb || l.iconImage) ? "img" : "div");
  thumb.className = "thumb";
  if (l.thumb){
    thumb.src = normalizeAssetPath(l.thumb);
    thumb.alt = "";
    thumb.loading = "lazy";
  } else if (l.iconImage){
    thumb.src = l.iconImage;
    thumb.alt = "";
    thumb.loading = "lazy";
    thumb.classList.add("thumbIconImg");
  } else {
    const wrap = document.createElement("div");
    wrap.className = "thumbIconWrap";
    const key = l.icon || guessIconFromUrl(l.url);
    wrap.innerHTML = ICON_SVGS[key] || ICON_SVGS.link;
    thumb.appendChild(wrap);
  }

  const main = document.createElement("div");
  main.className = "linkMain";

  const titleRow = document.createElement("div");
  titleRow.className = "titleRow";

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = l.title || "Untitled";
  titleRow.appendChild(title);

  if (l.badge){
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = l.badge;
    titleRow.appendChild(badge);
  }

  main.appendChild(titleRow);

  if (l.subtitle){
    const sub = document.createElement("div");
    sub.className = "subtitle";
    sub.textContent = l.subtitle;
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
  applyAvatarStyle(av, state.profile);

  const sWrap = $("v_socials");
  sWrap.innerHTML = "";
  (state.socials || []).forEach(s=>{
    const el = createSocialEl(s);
    if (el) sWrap.appendChild(el);
  });

  const lWrap = $("v_links");
  lWrap.innerHTML = "";
  (state.links || []).forEach(l=>{
    const el = createLinkEl(l);
    if (el) lWrap.appendChild(el);
  });

  applyThemeToPreview();
}

/* UI helpers */
function makeToggle(checked, onChange){
  const toggle = document.createElement("label");
  toggle.className = "toggle";
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = !!checked;
  cb.addEventListener("change", (e)=>{ e.stopPropagation(); onChange(cb.checked); });
  const track = document.createElement("span");
  track.className = "track";
  const knob = document.createElement("span");
  knob.className = "knob";
  track.appendChild(knob);
  toggle.appendChild(cb);
  toggle.appendChild(track);
  return toggle;
}

function iconBtn(iconKey, title, onClick, opts={}){
  const b = document.createElement("button");
  b.type = "button";
  b.className = "iconBtn" + (opts.danger ? " danger" : "");
  b.title = title || "";
  b.innerHTML = ICON_SVGS[iconKey] || ICON_SVGS.link;
  if (opts.disabled) b.disabled = true;
  b.addEventListener("click", (e)=>{ e.stopPropagation(); onClick(); });
  return b;
}

function field(labelText, inputEl, helpText){
  const f = document.createElement("div");
  f.className = "field";
  const lab = document.createElement("label");
  lab.textContent = labelText;
  f.appendChild(lab);
  f.appendChild(inputEl);
  if (helpText){
    const help = document.createElement("div");
    help.className = "help";
    help.textContent = helpText;
    f.appendChild(help);
  }
  return f;
}

function inputText(value, placeholder, onInput){
  const i = document.createElement("input");
  i.value = value || "";
  i.placeholder = placeholder || "";
  i.addEventListener("input", (e)=>{ e.stopPropagation(); onInput(i.value); });
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
  options.forEach(([v, t])=>{
    const o = document.createElement("option");
    o.value = v;
    o.textContent = t;
    if ((value || "") === v) o.selected = true;
    sel.appendChild(o);
  });
  sel.addEventListener("change", (e)=>{ e.stopPropagation(); onChange(sel.value); });
  return sel;
}

function renderRowIcon(container, item){
  container.innerHTML = "";
  if (item.iconImage){
    const img = document.createElement("img");
    img.src = item.iconImage;
    img.alt = "";
    container.appendChild(img);
    return;
  }
  const key = item.icon || guessIconFromUrl(item.url);
  container.innerHTML = ICON_SVGS[key] || ICON_SVGS.link;
}

/* Move helpers */
function moveInArray(arr, from, to){
  if (!arr) return;
  if (from < 0 || to < 0 || from >= arr.length || to >= arr.length) return;
  const item = arr.splice(from, 1)[0];
  arr.splice(to, 0, item);
}

/* Pointer sortable (attached once per container) */
function attachSortable(container, getArray, onAfter){
  if (sortableAttached.has(container)) return;
  sortableAttached.add(container);

  let drag = null;
  let suppressClickUntil = 0;

  const onMove = (e) => {
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

  const cleanup = () => {
    document.removeEventListener("pointermove", onMove, true);
    document.removeEventListener("pointerup", onUp, true);
    try { drag?.handle?.releasePointerCapture(drag.pointerId); } catch {}
  };

  const onUp = () => {
    if (!drag) return;

    cleanup();
    isSorting = false;
    suppressClickUntil = Date.now() + 600;

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

    document.querySelectorAll(".rowCard.isOpen").forEach(el => el.classList.remove("isOpen"));

    const cards = Array.from(container.querySelectorAll(".rowCard"));
    const fromIndex = cards.indexOf(card);
    if (fromIndex < 0) { isSorting = false; return; }

    const rect = card.getBoundingClientRect();

    const ph = document.createElement("div");
    ph.className = "placeholder";
    ph.style.height = `${rect.height}px`;
    card.replaceWith(ph);

    document.body.appendChild(card);
    card.classList.add("dragging");
    card.style.width = `${rect.width}px`;
    card.style.position = "fixed";
    card.style.left = `${rect.left}px`;
    card.style.top = `${rect.top}px`;
    card.style.zIndex = "9999";
    card.style.pointerEvents = "none";

    drag = {
      card,
      placeholder: ph,
      fromIndex,
      offsetY: e.clientY - rect.top,
      pointerId: e.pointerId,
      handle
    };

    suppressClickUntil = Date.now() + 600;

    try { handle.setPointerCapture(e.pointerId); } catch {}

    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup", onUp, true);
  }, { passive: false });

  container.addEventListener("click", (e)=>{
    if (Date.now() < suppressClickUntil) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
}


/* Lists */
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
    renderRowIcon(iconBox, l);

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

    const editBtn = iconBtn("edit", "Edit", ()=>{
      document.querySelectorAll(".rowCard.isOpen").forEach(el=>{
        if (el !== card) el.classList.remove("isOpen");
      });
      card.classList.toggle("isOpen");
    });

    const upBtn = iconBtn("up", "Move up", ()=>{
      if (idx === 0) return;
      moveInArray(state.links, idx, idx-1);
      renderLinks(); renderPreview(); debounceSave();
    }, { disabled: idx===0 });

    const downBtn = iconBtn("down", "Move down", ()=>{
      if (idx === state.links.length - 1) return;
      moveInArray(state.links, idx, idx+1);
      renderLinks(); renderPreview(); debounceSave();
    }, { disabled: idx===state.links.length-1 });

    const delBtn = iconBtn("trash", "Delete", ()=>{
      state.links.splice(idx, 1);
      renderLinks(); renderPreview(); debounceSave();
    }, { danger:true });

    actions.appendChild(tog);
    actions.appendChild(editBtn);
    actions.appendChild(upBtn);
    actions.appendChild(downBtn);
    actions.appendChild(delBtn);

    top.appendChild(handle);
    top.appendChild(iconBox);
    top.appendChild(main);
    top.appendChild(actions);

    top.addEventListener("click", () => {
      if (isSorting) return;
      document.querySelectorAll(".rowCard.isOpen").forEach(el=>{
        if (el !== card) el.classList.remove("isOpen");
      });
      card.classList.toggle("isOpen");
    });

    const edit = document.createElement("div");
    edit.className = "rowEdit";

    const grid = document.createElement("div");
    grid.className = "grid2";

    grid.appendChild(field("Title", inputText(l.title, "Instagram", (v)=>{
      state.links[idx].title = v;
      title.textContent = v || "Untitled";
      renderPreview(); debounceSave();
    })));

    grid.appendChild(field("URL", inputText(l.url, "https://...", (v)=>{
      state.links[idx].url = v;
      url.textContent = v ? safeHost(v) : "No URL yet";
      if (!state.links[idx].icon && !state.links[idx].iconImage) renderRowIcon(iconBox, state.links[idx]);
      renderPreview(); debounceSave();
    })));

    grid.appendChild(field("Subtitle (optional)", inputText(l.subtitle, "@bfa.autovisiontv", (v)=>{
      state.links[idx].subtitle = v;
      renderPreview(); debounceSave();
    })));

    grid.appendChild(field("Badge (optional)", inputText(l.badge, "YouTube", (v)=>{
      state.links[idx].badge = v;
      renderPreview(); debounceSave();
    })));

    grid.appendChild(field("Thumbnail (optional)", inputText(l.thumb, "./assets/thumbs/retail.png", (v)=>{
      state.links[idx].thumb = normalizeAssetPath(v);
      renderPreview(); debounceSave();
    }), "Leave empty if you don't want an image thumbnail."));

    const iconSel = selectIcon(l.icon || "", (v)=>{
      state.links[idx].icon = v;
      if (!state.links[idx].iconImage) renderRowIcon(iconBox, state.links[idx]);
      renderPreview(); debounceSave();
    });
    grid.appendChild(field("Icon (line)", iconSel, "Auto picks based on the URL."));

    const iconUrl = inputText(l.iconImage || "", "Icon image URL or ./assets/icon.png", (v)=>{
      state.links[idx].iconImage = normalizeAssetPath(v);
      renderRowIcon(iconBox, state.links[idx]);
      renderPreview(); debounceSave();
    });
    grid.appendChild(field("Custom icon image (URL/path)", iconUrl, "Optional. If set, it replaces the line icon."));

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
        renderRowIcon(iconBox, state.links[idx]);
        renderPreview(); debounceSave();
        setStatus("Icon embedded");
      }catch{
        setStatus("Could not read image");
      }finally{
        upload.value = "";
      }
    });
    grid.appendChild(field("Upload icon (optional)", upload, "Embeds into links.json (no extra file)."));

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "ghost";
    clearBtn.textContent = "Clear icon image";
    clearBtn.addEventListener("click", (e)=>{
      e.stopPropagation();
      state.links[idx].iconImage = "";
      iconUrl.value = "";
      renderRowIcon(iconBox, state.links[idx]);
      renderPreview(); debounceSave();
    });

    edit.appendChild(grid);
    edit.appendChild(clearBtn);

    card.appendChild(top);
    card.appendChild(edit);
    wrap.appendChild(card);
  });

  attachSortable(wrap, () => state.links, () => { renderLinks(); renderPreview(); debounceSave(); });
}

function renderSocials(){
  const wrap = $("socialList");
  wrap.innerHTML = "";

  (state.socials || []).forEach((s, idx)=>{
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
    renderRowIcon(iconBox, { url: s.url, icon: s.type, iconImage: s.iconImage });

    const main = document.createElement("div");
    main.className = "rowMain";
    const title = document.createElement("div");
    title.className = "rowTitle";
    title.textContent = s.type || "icon";
    const url = document.createElement("div");
    url.className = "rowUrl";
    url.textContent = s.url ? safeHost(s.url) : "No URL yet";
    main.appendChild(title);
    main.appendChild(url);

    const actions = document.createElement("div");
    actions.className = "rowActions";

    const tog = makeToggle(s.enabled !== false, (checked)=>{
      state.socials[idx].enabled = checked;
      renderPreview(); debounceSave();
    });

    const editBtn = iconBtn("edit", "Edit", ()=>{
      document.querySelectorAll(".rowCard.isOpen").forEach(el=>{
        if (el !== card) el.classList.remove("isOpen");
      });
      card.classList.toggle("isOpen");
    });

    const upBtn = iconBtn("up", "Move up", ()=>{
      if (idx === 0) return;
      moveInArray(state.socials, idx, idx-1);
      renderSocials(); renderPreview(); debounceSave();
    }, { disabled: idx===0 });

    const downBtn = iconBtn("down", "Move down", ()=>{
      if (idx === state.socials.length - 1) return;
      moveInArray(state.socials, idx, idx+1);
      renderSocials(); renderPreview(); debounceSave();
    }, { disabled: idx===state.socials.length-1 });

    const delBtn = iconBtn("trash", "Delete", ()=>{
      state.socials.splice(idx, 1);
      renderSocials(); renderPreview(); debounceSave();
    }, { danger:true });

    actions.appendChild(tog);
    actions.appendChild(editBtn);
    actions.appendChild(upBtn);
    actions.appendChild(downBtn);
    actions.appendChild(delBtn);

    top.appendChild(handle);
    top.appendChild(iconBox);
    top.appendChild(main);
    top.appendChild(actions);

    top.addEventListener("click", () => {
      if (isSorting) return;
      document.querySelectorAll(".rowCard.isOpen").forEach(el=>{
        if (el !== card) el.classList.remove("isOpen");
      });
      card.classList.toggle("isOpen");
    });

    const edit = document.createElement("div");
    edit.className = "rowEdit";

    const grid = document.createElement("div");
    grid.className = "grid2";

    const sel = document.createElement("select");
    SOCIAL_TYPES.forEach(t=>{
      const o = document.createElement("option");
      o.value = t;
      o.textContent = t;
      if (t === (s.type || "website")) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", (e)=>{
      e.stopPropagation();
      state.socials[idx].type = sel.value;
      title.textContent = sel.value;
      renderRowIcon(iconBox, { url: state.socials[idx].url, icon: state.socials[idx].type, iconImage: state.socials[idx].iconImage });
      renderPreview(); debounceSave();
    });
    grid.appendChild(field("Type", sel));

    grid.appendChild(field("URL", inputText(s.url, "https://...", (v)=>{
      state.socials[idx].url = v;
      url.textContent = v ? safeHost(v) : "No URL yet";
      renderPreview(); debounceSave();
    })));

    const iconUrl = inputText(s.iconImage || "", "Icon image URL or ./assets/icon.png", (v)=>{
      state.socials[idx].iconImage = normalizeAssetPath(v);
      renderRowIcon(iconBox, { url: state.socials[idx].url, icon: state.socials[idx].type, iconImage: state.socials[idx].iconImage });
      renderPreview(); debounceSave();
    });
    grid.appendChild(field("Custom icon image (URL/path)", iconUrl, "Optional. If set, it replaces the line icon."));

    const upload = document.createElement("input");
    upload.type = "file";
    upload.accept = "image/*";
    upload.addEventListener("change", async ()=>{
      const file = upload.files?.[0];
      if(!file) return;
      try{
        const dataUrl = await readFileAsDataURL(file);
        state.socials[idx].iconImage = dataUrl;
        iconUrl.value = dataUrl;
        renderRowIcon(iconBox, { url: state.socials[idx].url, icon: state.socials[idx].type, iconImage: state.socials[idx].iconImage });
        renderPreview(); debounceSave();
        setStatus("Icon embedded");
      }catch{
        setStatus("Could not read image");
      }finally{
        upload.value = "";
      }
    });
    grid.appendChild(field("Upload icon (optional)", upload, "Embeds into links.json (no extra file)."));

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "ghost";
    clearBtn.textContent = "Clear icon image";
    clearBtn.addEventListener("click", (e)=>{
      e.stopPropagation();
      state.socials[idx].iconImage = "";
      iconUrl.value = "";
      renderRowIcon(iconBox, { url: state.socials[idx].url, icon: state.socials[idx].type, iconImage: "" });
      renderPreview(); debounceSave();
    });

    edit.appendChild(grid);
    edit.appendChild(clearBtn);

    card.appendChild(top);
    card.appendChild(edit);
    wrap.appendChild(card);
  });

  attachSortable(wrap, () => state.socials, () => { renderSocials(); renderPreview(); debounceSave(); });
}

/* Profile */
function renderProfile(){
  $("p_name").value = state.profile?.name || "";
  $("p_avatar").value = state.profile?.avatar || "";
  $("p_bio").value = state.profile?.bio || "";
  $("brandName").textContent = state.profile?.name || "The BFA Group";

  // Logo controls
  if ($("logo_size")){
    $("logo_size").value = Number(state.profile?.avatarSize ?? 54);
    $("logo_size_label").textContent = $("logo_size").value;
  }
  if ($("logo_padding")){
    $("logo_padding").value = Number(state.profile?.avatarPadding ?? 8);
    $("logo_padding_label").textContent = $("logo_padding").value;
  }
  if ($("logo_fit")){
    $("logo_fit").value = state.profile?.avatarFit || "contain";
  }
  if ($("logo_scale")){
    $("logo_scale").value = Number(state.profile?.avatarScale ?? 1);
    $("logo_scale_label").textContent = Number($("logo_scale").value).toFixed(2);
  }
  
  if ($("logo_radius")){
    $("logo_radius").value = Number(state.profile?.avatarRadius ?? 16);
    $("logo_radius_label").textContent = $("logo_radius").value;
  }

  // Theme UI
  const t = state.theme || {};

  if ($("bg_type")) $("bg_type").value = t.type || "default";
  if ($("bg_color")) $("bg_color").value = t.color || "#f6f7fb";
  if ($("bg_image")) $("bg_image").value = t.image || "";
}

/* Export */
function downloadJson(){
  state.profile.avatar = normalizeAssetPath(state.profile.avatar);
  state.theme = state.theme || { type:"default", color:"#f6f7fb", image:"" };
  state.theme.image = normalizeAssetPath(state.theme.image);

  (state.links || []).forEach(l => {
    l.thumb = normalizeAssetPath(l.thumb);
    l.iconImage = l.iconImage || "";
  });
  (state.socials || []).forEach(s => { s.iconImage = s.iconImage || ""; });

  state.updatedAt = Date.now();

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
  setStatus("Downloaded links.json");
}

async function loadInitial(){
  try{
    const saved = localStorage.getItem(LS_KEY);
    if (saved){
      state = JSON.parse(saved);
      setStatus("Loaded draft");
      renderAll();
      return;
    }
  }catch{}

  try{
    const res = await fetch("./links.json", { cache: "no-store" });
    state = await res.json();
    setStatus("Loaded from site");
  }catch{
    state = defaultState();
    setStatus("New draft");
  }

  state.profile = { name:"", avatar:"", bio:"", ...(state.profile || {}) };
  state.theme = { type:"default", color:"#f6f7fb", image:"", ...(state.theme || state.background || {}) };
  state.socials = (state.socials || []).map(s => ({ enabled: true, iconImage: "", ...s }));
  state.links = (state.links || []).map(l => ({ enabled: true, icon: "", iconImage: "", ...l }));

  renderAll();
}

function renderAll(){
  renderProfile();
  renderLinks();
  renderSocials();
  renderPreview();
}

/* Wire UI */
function wire(){
  document.querySelectorAll(".navItem").forEach(btn=>{
    btn.addEventListener("click", ()=> setTab(btn.dataset.tab));
  });

  $("toggleBig").addEventListener("click", ()=>{
    const on = document.body.classList.toggle("big");
    $("toggleBig").setAttribute("aria-pressed", on ? "true" : "false");
  });

  $("p_name").addEventListener("input", (e)=>{
    state.profile.name = e.target.value;
    $("brandName").textContent = state.profile.name || "The BFA Group";
    renderPreview(); debounceSave();
  });

  $("p_avatar").addEventListener("input", (e)=>{
    state.profile.avatar = normalizeAssetPath(e.target.value);
    renderPreview(); debounceSave();
  });

  $("p_bio").addEventListener("input", (e)=>{
    state.profile.bio = e.target.value;
    renderPreview();

  // Logo controls (live preview)
  if ($("logo_size")){
    $("logo_size").addEventListener("input", (e)=>{
      state.profile.avatarSize = Number(e.target.value);
      $("logo_size_label").textContent = e.target.value;
      renderPreview(); debounceSave();
    });
  }
  if ($("logo_padding")){
    $("logo_padding").addEventListener("input", (e)=>{
      state.profile.avatarPadding = Number(e.target.value);
      $("logo_padding_label").textContent = e.target.value;
      renderPreview(); debounceSave();
    });
  }

  if ($("logo_scale")){
    $("logo_scale").addEventListener("input", (e)=>{
      state.profile.avatarScale = Number(e.target.value);
      $("logo_scale_label").textContent = Number(e.target.value).toFixed(2);
      renderPreview(); debounceSave();
    });
  }
  if ($("logo_fit")){
    $("logo_fit").addEventListener("change", (e)=>{
      state.profile.avatarFit = e.target.value;
      renderPreview(); debounceSave();
    });
  }
  if ($("logo_scale")){
    $("logo_scale").value = Number(state.profile?.avatarScale ?? 1);
    $("logo_scale_label").textContent = Number($("logo_scale").value).toFixed(2);
  }
  
  if ($("logo_radius")){
    $("logo_radius").addEventListener("input", (e)=>{
      state.profile.avatarRadius = Number(e.target.value);
      $("logo_radius_label").textContent = e.target.value;
      renderPreview(); debounceSave();
    });
  }
 debounceSave();
  });

  $("p_avatar_file").addEventListener("change", async (e)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    try{
      const dataUrl = await readFileAsDataURL(file);
      state.profile.avatar = dataUrl;
      $("p_avatar").value = dataUrl;
      renderPreview(); debounceSave();
      setStatus("Logo embedded");
    }catch{
      setStatus("Could not read image");
    }finally{
      e.target.value = "";
    }
  });

  // Theme controls (preview updates immediately)
  if ($("bg_type")) $("bg_type").addEventListener("change", (e)=>{
    state.theme = state.theme || {};
    state.theme.type = e.target.value;
    renderPreview(); debounceSave();
  });
  if ($("bg_color")) $("bg_color").addEventListener("input", (e)=>{
    state.theme = state.theme || {};
    state.theme.color = e.target.value;
    renderPreview(); debounceSave();
  });
  if ($("bg_image")) $("bg_image").addEventListener("input", (e)=>{
    state.theme = state.theme || {};
    state.theme.image = normalizeAssetPath(e.target.value);
    renderPreview(); debounceSave();
  });
  if ($("bg_image_file")) $("bg_image_file").addEventListener("change", async (e)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    try{
      const dataUrl = await readFileAsDataURL(file);
      state.theme = state.theme || {};
      state.theme.image = dataUrl;
      $("bg_image").value = dataUrl;
      state.theme.type = "image";
      if ($("bg_type")) $("bg_type").value = "image";
      renderPreview(); debounceSave();
      setStatus("Background embedded");
    }catch{
      setStatus("Could not read image");
    }finally{
      e.target.value = "";
    }
  });

  $("addLink").addEventListener("click", ()=>{
    state.links.unshift({ title: "New link", subtitle: "", url: "", thumb: "", badge: "", enabled: true, icon: "", iconImage: "" });
    renderLinks(); renderPreview(); debounceSave();
  });

  $("addSocial").addEventListener("click", ()=>{
    state.socials.push({ type: "website", url: "", enabled: true, iconImage: "" });
    renderSocials(); renderPreview(); debounceSave();
  });

  $("import").addEventListener("change", async (e)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    try{
      const text = await file.text();
      state = JSON.parse(text);
      state.profile = { name:"", avatar:"", bio:"", ...(state.profile || {}) };
      state.theme = { type:"default", color:"#f6f7fb", image:"", ...(state.theme || state.background || {}) };
      state.socials = (state.socials || []).map(s => ({ enabled: true, iconImage: "", ...s }));
      state.links = (state.links || []).map(l => ({ enabled: true, icon: "", iconImage: "", ...l }));
      localStorage.setItem(LS_KEY, JSON.stringify(state));
      setStatus("Imported");
      renderAll();
    }catch{
      setStatus("Import failed");
    }finally{
      e.target.value = "";
    }
  });

  
  // Reload from site (ignores local draft)
  const reloadBtn = $("reloadFromSite");
  if (reloadBtn){
    reloadBtn.addEventListener("click", async ()=>{
      try{ localStorage.removeItem(LS_KEY); }catch{}
      try{
        const res = await fetch("./links.json", { cache: "no-store" });
        state = await res.json();
        state.profile = { name:"", avatar:"", bio:"", ...(state.profile || {}) };
        state.theme = { type:"default", color:"#f6f7fb", image:"", ...(state.theme || state.background || {}) };
        state.socials = (state.socials || []).map(s => ({ enabled: true, iconImage: "", ...s }));
        state.links = (state.links || []).map(l => ({ enabled: true, icon: "", iconImage: "", ...l }));
        setStatus("Loaded from site");
        renderAll();
      }catch{
        setStatus("Could not load site file");
      }
    });
  }

$("download").addEventListener("click", downloadJson);
  $("download2").addEventListener("click", downloadJson);

  $("resetDraft").addEventListener("click", ()=>{
    try{ localStorage.removeItem(LS_KEY); }catch{}
    state = defaultState();
    renderAll();
    setStatus("Draft reset");
  });
}

wire();
loadInitial();
