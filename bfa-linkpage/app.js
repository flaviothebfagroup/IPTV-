const $ = (id) => document.getElementById(id);

const ICONS = {
  instagram: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm9 2h-9A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4z"/><path d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/><path d="M17.6 6.3a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2z"/></svg>`,
  youtube: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.8 4.6 12 4.6 12 4.6s-5.8 0-7.5.5A3 3 0 0 0 2.4 7.2 31 31 0 0 0 2 12a31 31 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.7.5 7.5.5 7.5.5s5.8 0 7.5-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22 12a31 31 0 0 0-.4-4.8zM10 15.3V8.7L16 12l-6 3.3z"/></svg>`,
  website: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm7.9 9h-3.1a15.6 15.6 0 0 0-1.3-6A8 8 0 0 1 19.9 11zM12 4c.9 1.2 1.9 3.3 2.4 7H9.6c.5-3.7 1.5-5.8 2.4-7zM4.1 13h3.1c.2 2.2.8 4.2 1.3 6A8 8 0 0 1 4.1 13zm3.1-2H4.1a8 8 0 0 1 4.4-6c-.6 1.8-1.1 3.8-1.3 6zm2.4 2h4.8c-.5 3.7-1.5 5.8-2.4 7-.9-1.2-1.9-3.3-2.4-7zm7.2 0h3.1a8 8 0 0 1-4.4 6c.6-1.8 1.1-3.8 1.3-6zm-1.4 0H8.6c-.2-1.4-.3-2.8-.3-4s.1-2.6.3-4h6.8c.2 1.4.3 2.8.3 4s-.1 2.6-.3 4z"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM0.5 8.5h4V23h-4V8.5zM8.5 8.5h3.8v2h.1c.5-1 1.9-2.1 3.9-2.1 4.2 0 5 2.8 5 6.4V23h-4v-6.6c0-1.6 0-3.6-2.2-3.6-2.2 0-2.6 1.7-2.6 3.5V23h-4V8.5z"/></svg>`
};

function createSocial({ type, url }) {
  const a = document.createElement("a");
  a.className = "social";
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  a.setAttribute("aria-label", type);
  a.innerHTML = ICONS[type] || ICONS.website;
  return a;
}

function createLink(item) {
  const a = document.createElement("a");
  a.className = "link";
  a.href = item.url;
  a.target = "_blank";
  a.rel = "noopener";

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

async function init() {
  const res = await fetch("./links.json", { cache: "no-store" });
  const data = await res.json();

  // Profile
  $("name").textContent = data.profile?.name || "Links";
  const avatar = $("avatar");
  avatar.src = data.profile?.avatar || "";
  avatar.alt = (data.profile?.name || "Profile") + " logo";

  $("bio").textContent = data.profile?.bio || "";

  // Socials
  const socialsWrap = $("socials");
  socialsWrap.innerHTML = "";
  (data.socials || []).forEach(s => socialsWrap.appendChild(createSocial(s)));

  // Links
  const linksWrap = $("links");
  linksWrap.innerHTML = "";
  (data.links || []).forEach(l => linksWrap.appendChild(createLink(l)));

  // Footer (optional)
  $("footerText").textContent = data.footerText || "";
}

init().catch(err => {
  console.error(err);
  $("name").textContent = "Could not load links.json";
});
