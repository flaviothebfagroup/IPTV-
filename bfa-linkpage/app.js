const $ = (id) => document.getElementById(id);

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

  const thumb = document.createElement((item.thumb || item.iconImage) ? "img" : "div");
  thumb.className = "thumb";
  if (item.thumb) {
    thumb.src = item.thumb;
    thumb.alt = "";
    thumb.loading = "lazy";
  } else if (item.iconImage) {
    thumb.src = item.iconImage;
    thumb.alt = "";
    thumb.loading = "lazy";
    thumb.classList.add("thumbIconImg");
    applyIconCfg(thumb, l.iconCfg);
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




function applyIconCfg(imgEl, cfg){
  if (!imgEl) return;
  const c = cfg || {};
  const scale = Number(c.scale ?? 1);
  const fit = c.fit || "contain";
  imgEl.style.objectFit = fit;
  imgEl.style.transform = `scale(${scale})`;
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
async function init() {
  const res = await fetch("./links.json", { cache: "no-store" });
  const data = await res.json();

  // Apply background/theme from links.json
  applyTheme(data.theme || data.background);

  $("name").textContent = data.profile?.name || "Links";
  const avatar = $("avatar");
  avatar.src = data.profile?.avatar || "";
  avatar.alt = (data.profile?.name || "Profile") + " logo";
  applyAvatar(avatar, data.profile);

  $("bio").textContent = data.profile?.bio || "";

  const socialsWrap = $("socials");
  socialsWrap.innerHTML = "";
  (data.socials || []).filter(s => s && s.enabled !== false).forEach(s => socialsWrap.appendChild(createSocial(s)));

  const linksWrap = $("links");
  linksWrap.innerHTML = "";
  (data.links || []).filter(l => l && l.enabled !== false).forEach(l => linksWrap.appendChild(createLink(l)));

  $("footerText").textContent = data.footerText || "";
}

init().catch(err => {
  console.error(err);
  $("name").textContent = "Could not load links.json";
});
