(() => {
<button class="iconbtn menu-btn" aria-expanded="false" aria-controls="navlinks" aria-label="Open menu" title="Menu">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
</button>


<a class="brand" id="brand-link" href="#">
<img src="${logo}" alt=""/>
<span>BFA IPTV</span>
<span class="dot" aria-hidden="true"></span>
</a>


<div id="navlinks" class="navlinks" role="navigation">
<a class="navlink" data-file="remote.html">Remote</a>
<a class="navlink" data-file="admin.html">Admin</a>
<a class="navlink" data-file="backups.html">Backups</a>
<a class="navlink" data-file="m3u8test.html">M3U8&nbsp;Test</a>
</div>


<div class="actions">
<button class="iconbtn" id="theme-toggle" aria-label="Toggle theme" title="Toggle theme">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<path d="M12 3a9 9 0 0 0 9 9 9 9 0 1 1-9-9z"/>
</svg>
</button>
</div>
</nav>
</header>`;
}


function wireUp(root, opts={}){
// Set brand link and nav links to current directory for robust GitHub Pages paths
const dir = baseDir();
const brand = root.querySelector('#brand-link');
if (brand){ brand.href = dir + (opts.brandTo || 'remote.html'); }
root.querySelectorAll('a.navlink').forEach(a => {
const file = a.getAttribute('data-file');
a.href = dir + file;
// active state
const current = location.pathname.split('/').pop() || 'index.html';
if (current === file || (current === 'index.html' && file === 'remote.html')){
a.classList.add('active');
}
});


// Mobile menu toggle
const header = root.querySelector('.site-header');
const btn = root.querySelector('.menu-btn');
const links = root.querySelector('#navlinks');
function closeMenu(){ header.classList.remove('open'); btn.setAttribute('aria-expanded','false'); }
btn?.addEventListener('click', () => {
const open = header.classList.toggle('open');
btn.setAttribute('aria-expanded', String(open));
});
// Close on nav click (mobile)
links?.addEventListener('click', e => {
if (e.target.closest('a')) closeMenu();
});
// Close on resize > 820
window.addEventListener('resize', () => { if (window.innerWidth > 820) closeMenu(); });


// Theme toggle
const tbtn = root.querySelector('#theme-toggle');
tbtn?.addEventListener('click', () => {
const cur = document.documentElement.getAttribute('data-theme') || 'light';
applyTheme(cur === 'dark' ? 'light' : 'dark');
});
}


// Public API
window.injectHeader = function injectHeader(targetId='site-header', opts={}){
initTheme();
let mount = document.getElementById(targetId);
if (!mount){
mount = document.createElement('div');
mount.id = targetId;
document.body.prepend(mount);
}
mount.innerHTML = headerTemplate(opts);
wireUp(mount, opts);
};
})();
