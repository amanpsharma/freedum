const $ = id => document.getElementById(id);

// ── State ──────────────────────────────────────────────
let currentUrl = '';
let barShown   = true;
let hideTimer  = null;
let tStartY    = 0;
let overlayTimer = null;

// ── Bar show / hide ────────────────────────────────────
function showBar() {
  if (barShown) return;
  barShown = true;
  $('topBar').classList.remove('bar-hidden');
  $('peekPill').classList.remove('visible');
  clearTimeout(hideTimer);
  enableOverlay();
}

function hideBar() {
  if (!barShown || $('wv').classList.contains('hidden')) return;
  barShown = false;
  clearTimeout(hideTimer);
  $('topBar').classList.add('bar-hidden');
  $('peekPill').classList.add('visible');
  enableOverlay();
}

$('topBar').addEventListener('mouseenter', () => clearTimeout(hideTimer));

// ── Scroll overlay (captures swipe over iframe) ────────
function enableOverlay() {
  const ov = $('scrollOverlay');
  ov.style.pointerEvents = 'all';
  clearTimeout(overlayTimer);
  overlayTimer = setTimeout(() => { ov.style.pointerEvents = 'none'; }, 600);
}

$('scrollOverlay').addEventListener('touchstart', e => {
  tStartY = e.touches[0].clientY;
}, { passive: true });

$('scrollOverlay').addEventListener('touchmove', e => {
  const dy = e.touches[0].clientY - tStartY;
  if      (dy >  30) showBar();
  else if (dy < -30) hideBar();
  clearTimeout(overlayTimer);
  overlayTimer = setTimeout(() => { $('scrollOverlay').style.pointerEvents = 'none'; }, 100);
}, { passive: true });

window.addEventListener('wheel', e => {
  if ($('wv').classList.contains('hidden')) return;
  if      (e.deltaY >  8) hideBar();
  else if (e.deltaY < -8) showBar();
}, { passive: true });

// ── Load article ───────────────────────────────────────
function loadArticle() {
  let val = $('urlInput').value.trim();
  if (!val) return;
  if (!val.startsWith('http')) val = 'https://' + val;
  currentUrl = val;

  $('frame').src = 'https://freedium-mirror.cfd/' + val;
  $('wv').classList.remove('hidden');
  $('empty').classList.add('hidden');
  $('saveBtn').style.display = 'flex';
  updateSaveIcon();
  hideBar();
}

$('urlInput').addEventListener('keypress', e => {
  if (e.key === 'Enter') loadArticle();
});

// ── Drawer ─────────────────────────────────────────────
function toggleDrawer(open) {
  $('drawer').classList.toggle('open', open);
  $('drawerOverlay').classList.toggle('open', open);
}
const openDrawer  = () => toggleDrawer(true);
const closeDrawer = () => toggleDrawer(false);

// ── Storage ────────────────────────────────────────────
const getLinks = () => { try { return JSON.parse(localStorage.getItem('fd_links') || '[]'); } catch { return []; } };
const putLinks  = arr => localStorage.setItem('fd_links', JSON.stringify(arr));

// ── Saved links ────────────────────────────────────────
function toTitle(url) {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    const clean = (parts.at(-1) || '').replace(/-[a-f0-9]{8,}$/, '').replace(/-/g, ' ');
    return clean.trim() ? clean[0].toUpperCase() + clean.slice(1) : new URL(url).hostname;
  } catch { return url.slice(0, 55); }
}

const isSaved = () => currentUrl && getLinks().some(l => l.url === currentUrl);

function updateSaveIcon() {
  const ic = $('saveIcon');
  const saved = isSaved();
  ic.style.fill   = saved ? '#4ade80' : 'none';
  ic.style.stroke = saved ? '#4ade80' : '';
}

function popIcon() {
  const ic = $('saveIcon');
  ic.classList.remove('pop');
  void ic.offsetWidth;
  ic.classList.add('pop');
}

function saveLink() {
  if (!currentUrl) return;
  const links = getLinks();
  if (links.find(l => l.url === currentUrl)) { popIcon(); return; }
  links.unshift({ url: currentUrl, title: toTitle(currentUrl), at: Date.now() });
  putLinks(links);
  renderLinks();
  updateSaveIcon();
  popIcon();
}

function openLink(i) {
  const l = getLinks()[i];
  if (!l) return;
  currentUrl = l.url;
  $('urlInput').value = l.url;
  $('frame').src = 'https://freedium-mirror.cfd/' + l.url;
  $('wv').classList.remove('hidden');
  $('empty').classList.add('hidden');
  $('saveBtn').style.display = 'flex';
  updateSaveIcon();
  closeDrawer();
  hideBar();
}

function deleteLink(i, e) {
  e.stopPropagation();
  const links = getLinks();
  links.splice(i, 1);
  putLinks(links);
  renderLinks();
  updateSaveIcon();
}

const esc = s => s.replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

function renderLinks() {
  const links = getLinks();
  $('savedList').innerHTML = links.length ? links.map((l, i) => `
    <div class="group flex items-start gap-2 px-2.5 py-2.5 rounded-xl hover:bg-white/5 active:bg-white/10 cursor-pointer transition-colors" onclick="openLink(${i})">
      <div class="mt-[3px] flex-shrink-0 text-cyan-400 opacity-80">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-white leading-snug break-words">${esc(l.title)}</p>
        <p class="text-[10px] text-zinc-500 truncate mt-0.5">${esc(l.url)}</p>
      </div>
      <button onclick="deleteLink(${i},event)" class="mt-0.5 flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/>
        </svg>
      </button>
    </div>`).join('') : `
    <div class="flex flex-col items-center justify-center gap-3 mt-10 text-zinc-600 px-4 text-center">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
      <p class="text-xs leading-relaxed">No saved links yet.<br/>Tap the bookmark button after loading an article.</p>
    </div>`;
}

// ── Init ───────────────────────────────────────────────
renderLinks();

function syncPad() {
  $('main').style.paddingTop = $('topBar').offsetHeight + 'px';
}
syncPad();
window.addEventListener('resize', syncPad);
