const ICONS = {
  instagram: `<svg viewBox="0 0 24 24"><path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm9 2h-9A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4z"/><path d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/><path d="M17.6 6.3a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2z"/></svg>`,
  youtube: `<svg viewBox="0 0 24 24"><path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.8 4.6 12 4.6 12 4.6s-5.8 0-7.5.5A3 3 0 0 0 2.4 7.2 31 31 0 0 0 2 12a31 31 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.7.5 7.5.5 7.5.5s5.8 0 7.5-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22 12a31 31 0 0 0-.4-4.8zM10 15.3V8.7L16 12l-6 3.3z"/></svg>`,
  website: `<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm7.9 9h-3.1a15.6 15.6 0 0 0-1.3-6A8 8 0 0 1 19.9 11zM12 4c.9 1.2 1.9 3.3 2.4 7H9.6c.5-3.7 1.5-5.8 2.4-7zM4.1 13h3.1c.2 2.2.8 4.2 1.3 6A8 8 0 0 1 4.1 13zm3.1-2H4.1a8 8 0 0 1 4.4-6c-.6 1.8-1.1 3.8-1.3 6zm2.4 2h4.8c-.5 3.7-1.5 5.8-2.4 7-.9-1.2-1.9-3.3-2.4-7zm7.2 0h3.1a8 8 0 0 1-4.4 6c.6-1.8 1.1-3.8 1.3-6zm-1.4 0H8.6c-.2-1.4-.3-2.8-.3-4s.1-2.6.3-4h6.8c.2 1.4.3 2.8.3 4s-.1 2.6-.3 4z"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM0.5 8.5h4V23h-4V8.5zM8.5 8.5h3.8v2h.1c.5-1 1.9-2.1 3.9-2.1 4.2 0 5 2.8 5 6.4V23h-4v-6.6c0-1.6 0-3.6-2.2-3.6-2.2 0-2.6 1.7-2.6 3.5V23h-4V8.5z"/></svg>`
};

const SOCIAL_TYPES = ["instagram", "website", "linkedin", "youtube"];

const $ = (id) => document.getElementById(id);

let state = null;

function setStatus(msg){
  $("status").textContent = msg || "";
}

function safeClone(obj){ return JSON.parse(JSON.stringify(obj)); }

function defaultState(){
  return {
    profile: { name: "The BFA Group", avatar: "./assets/logo.png", bio: "" },
    socials: [{ type: "instagram", url: "" }, { type: "website", url: "" }],
    links: [{ title: "Website", subtitle: "", url: "", thumb: "", badge: "" }],
    footerText: ""
  };
}

function readFileAsDataURL(file){
  return new Promise((resolve, reject)=>{
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function createTextField(label, value, onInput, placeholder=""){
  const wrap = document.createElement("div");
  wrap.className = "field";
  const l = document.createElement("label");
  l.textContent = label;
  const i = document.createElement("input");
  i.value = value || "";
  i.placeholder = placeholder;
  i.addEventListener("input", () => onInput(i.value));
  wrap.appendChild(l);
  wrap.appendChild(i);
  return wrap;
}

function createSelectField(label, value, options, onChange){
  const wrap = document.createElement("div");
  wrap.className = "field";
  const l = document.createElement("label");
  l.textContent = label;
  const s = document.createElement("select");
  options.forEach(opt => {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    if(opt === value) o.selected = true;
    s.appendChild(o);
  });
  s.addEventListener("change", () => onChange(s.value));
  wrap.appendChild(l);
  wrap.appendChild(s);
  return wrap;
}

function itemHeader(title, buttons=[]){
  const head = document.createElement("div");
  head.className = "itemHead";

  const t = document.createElement("div");
  t.className = "itemTitle";
  t.textContent = title;

  const btnWrap = document.createElement("div");
  btnWrap.className = "miniBtns";
  buttons.forEach(b => btnWrap.appendChild(b));

  head.appendChild(t);
  head.appendChild(btnWrap);
  return head;
}

function miniButton(text, onClick){
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = text;
  b.addEventListener("click", onClick);
  return b;
}

function renderForm(){
  // profile
  $("p_name").value = state.profile?.name || "";
  $("p_avatar").value = state.profile?.avatar || "";
  $("p_bio").value = state.profile?.bio || "";

  // socials
  const sWrap = $("socialList");
  sWrap.innerHTML = "";
  state.socials = state.socials || [];
  state.socials.forEach((s, idx) => {
    const card = document.createElement("div");
    card.className = "itemCard";

    const btnDel = miniButton("Remove", () => { state.socials.splice(idx,1); renderAll(); });
    const head = itemHeader(`Social #${idx+1}`, [btnDel]);

    const row = document.createElement("div");
    row.className = "row";
    row.appendChild(createSelectField("Type", s.type || "website", SOCIAL_TYPES, (v)=>{ state.socials[idx].type=v; renderAll(false); }));
    row.appendChild(createTextField("URL", s.url || "", (v)=>{ state.socials[idx].url=v; renderAll(false); }, "https://..."));

    card.appendChild(head);
    card.appendChild(row);
    sWrap.appendChild(card);
  });

  // links
  const lWrap = $("linksList");
  lWrap.innerHTML = "";
  state.links = state.links || [];
  state.links.forEach((l, idx) => {
    const card = document.createElement("div");
    card.className = "itemCard";

    const up = miniButton("↑", () => {
      if(idx===0) return;
      const tmp = state.links[idx-1];
      state.links[idx-1] = state.links[idx];
      state.links[idx] = tmp;
      renderAll();
    });
    const down = miniButton("↓", () => {
      if(idx===state.links.length-1) return;
      const tmp = state.links[idx+1];
      state.links[idx+1] = state.links[idx];
      state.links[idx] = tmp;
      renderAll();
    });
    const del = miniButton("Remove", () => { state.links.splice(idx,1); renderAll(); });

    const head = itemHeader(`Link #${idx+1}`, [up, down, del]);

    const row1 = document.createElement("div");
    row1.className = "row";
    row1.appendChild(createTextField("Title", l.title || "", (v)=>{ state.links[idx].title=v; renderAll(false); }, "Instagram"));
    row1.appendChild(createTextField("Subtitle", l.subtitle || "", (v)=>{ state.links[idx].subtitle=v; renderAll(false); }, "@handle or short text"));

    const row2 = document.createElement("div");
    row2.className = "row";
    row2.appendChild(createTextField("URL", l.url || "", (v)=>{ state.links[idx].url=v; renderAll(false); }, "https://..."));
    row2.appendChild(createTextField("Badge (optional)", l.badge || "", (v)=>{ state.links[idx].badge=v; renderAll(false); }, "YouTube"));

    const row3 = document.createElement("div");
    row3.className = "row";
    row3.appendChild(createTextField("Thumbnail path (optional)", l.thumb || "", (v)=>{ state.links[idx].thumb=v; renderAll(false); }, "./assets/thumbs/retail.jpg"));
    row3.appendChild(document.createElement("div"));

    card.appendChild(head);
    card.appendChild(row1);
    card.appendChild(row2);
    card.appendChild(row3);

    lWrap.appendChild(card);
  });
}

function createSocialEl({type,url}){
  const a = document.createElement("a");
  a.className = "social";
  a.href = url || "#";
  a.target = "_blank";
  a.rel = "noopener";
  a.setAttribute("aria-label", type || "social");
  a.innerHTML = ICONS[type] || ICONS.website;
  if(!url) a.style.opacity = "0.45";
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
    thumb.src = item.thumb;
    thumb.alt = "";
    thumb.loading = "lazy";
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
  av.src = state.profile?.avatar || "";
  av.alt = (state.profile?.name || "Profile") + " logo";

  const sWrap = $("v_socials");
  sWrap.innerHTML = "";
  (state.socials || []).forEach(s => sWrap.appendChild(createSocialEl(s)));

  const lWrap = $("v_links");
  lWrap.innerHTML = "";
  (state.links || []).forEach(l => lWrap.appendChild(createLinkEl(l)));
}

function renderAll(full=true){
  if(full) renderForm();
  renderPreview();
  setStatus("");
}

function downloadJson(){
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

async function copyJson(){
  const dataStr = JSON.stringify(state, null, 2);
  try{
    await navigator.clipboard.writeText(dataStr);
    setStatus("Copied JSON to clipboard.");
  }catch(e){
    setStatus("Could not copy. Your browser may block clipboard.");
  }
}

async function loadInitial(){
  try{
    const res = await fetch("./links.json", { cache: "no-store" });
    state = await res.json();
  }catch(e){
    state = defaultState();
  }
  state = state || defaultState();
  renderAll(true);
}

function wire(){
  $("p_name").addEventListener("input", (e)=>{ state.profile.name = e.target.value; renderAll(false); });
  $("p_avatar").addEventListener("input", (e)=>{ state.profile.avatar = e.target.value; renderAll(false); });
  const avatarFile = document.getElementById("p_avatar_file");
  if (avatarFile){
    avatarFile.addEventListener("change", async (e)=>{
      const file = e.target.files?.[0];
      if(!file) return;
      try{
        const dataUrl = await readFileAsDataURL(file);
        state.profile.avatar = dataUrl;
        document.getElementById("p_avatar").value = dataUrl;
        renderAll(false);
        setStatus("Logo embedded into links.json. Click Download links.json and upload it to GitHub.");
      }catch(err){
        setStatus("Could not read image file.");
      }finally{
        e.target.value = "";
      }
    });
  }

  $("p_bio").addEventListener("input", (e)=>{ state.profile.bio = e.target.value; renderAll(false); });

  $("addSocial").addEventListener("click", ()=>{
    state.socials.push({ type: "website", url: "" });
    renderAll(true);
  });

  $("addLink").addEventListener("click", ()=>{
    state.links.push({ title: "New link", subtitle: "", url: "", thumb: "", badge: "" });
    renderAll(true);
  });

  $("download").addEventListener("click", downloadJson);
  $("copy").addEventListener("click", copyJson);

  $("import").addEventListener("change", async (e)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    try{
      const text = await file.text();
      const obj = JSON.parse(text);
      state = obj;
      renderAll(true);
      setStatus("Imported links.json successfully.");
    }catch(err){
      setStatus("Import failed: not valid JSON.");
    }finally{
      e.target.value = "";
    }
  });
}

wire();
loadInitial();
