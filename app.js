'use strict';
(() => {
const CFG = window.APP_CONFIG || {};
const FORCE_DEMO = /[?&]demo=1\b/.test(location.search);
const DEMO = FORCE_DEMO || !CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY || !window.supabase;
const $ = s => document.querySelector(s);

/* ---------- DOM helper (no innerHTML of user data) ---------- */
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k in el && k !== 'list' && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(9)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
const SVGNS = 'http://www.w3.org/2000/svg';
function svgFrom(markup) { // only for our own static constant markup
  const t = document.createElementNS(SVGNS, 'svg');
  t.setAttribute('viewBox', '0 0 24 24'); t.setAttribute('fill', 'none'); t.setAttribute('stroke', 'currentColor');
  t.setAttribute('stroke-width', '2'); t.setAttribute('stroke-linecap', 'round'); t.setAttribute('stroke-linejoin', 'round');
  t.innerHTML = markup; return t;
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200); }

/* ---------- Icons ---------- */
const ICONS = {
  pin: ['位置', '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'],
  excl: ['感叹', '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.6v.01"/>'],
  heart: ['爱心', '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 3c0 5.4-7.5 10-7.5 10z"/>'],
  star: ['星星', '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>'],
  sparkle: ['闪光', '<path d="M11 3c.6 4.5 2.5 6.4 7 7-4.5.6-6.4 2.5-7 7-.6-4.5-2.5-6.4-7-7 4.5-.6 6.4-2.5 7-7zM19 15.5v5M16.5 18h5"/>'],
  wing: ['翅膀', '<path d="M3 15c2-6 8-10 18-10-1 2.2-3 3.4-5.5 3.8 2 .3 3.4 1 4.5 2.2-2 1.2-4.3 1.6-6.7 1.5 1.3.8 2.2 1.8 2.7 3-3.6.8-7.6.2-10.5-1.4L3 15z"/>'],
  halo: ['光环', '<ellipse cx="12" cy="9" rx="8" ry="3"/><path d="M12 15.5v4M10 17.5h4"/>'],
  music: ['音乐', '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'],
  camera: ['相机', '<rect x="3" y="7" width="18" height="13" rx="3"/><path d="M8.5 7l1.5-2.5h4L15.5 7"/><circle cx="12" cy="13.5" r="3.5"/>'],
  cal: ['日历', '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'],
  clock: ['时间', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'],
  mail: ['邮件', '<rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="M4 7.5l8 6 8-6"/>'],
  link: ['链接', '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'],
  check: ['完成', '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.7 2.7L16 9.5"/>'],
  warn: ['注意', '<path d="M12 4L2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17v.01"/>'],
  arrow: ['箭头', '<path d="M5 12h14M13 6l6 6-6 6"/>'],
  cloud: ['云朵', '<path d="M7 18.5a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 17.8 9a4.75 4.75 0 0 1-.3 9.5z"/>'],
  moon: ['月亮', '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>']
};
function iconEl(name, editable) {
  if (name === 'flower') { const e = iconEl('wing', editable); e.dataset.ic = 'flower'; return e; } // legacy token
  const s = h('span', { class: 'ic', 'data-ic': name, title: ICONS[name][0] });
  if (editable) s.setAttribute('contenteditable', 'false');
  s.append(svgFrom(ICONS[name][1])); return s;
}

/* ---------- Sanitizer: allowlist -> rebuilt DOM ---------- */
const COLOR_RE = /^(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\))$/i;
const TOKEN_RE = /:(pin|excl|heart|star|sparkle|flower|wing|halo|music|camera|cal|clock|mail|link|check|warn|arrow|cloud|moon):/g;
function cleanColor(c) { c = (c || '').trim(); return COLOR_RE.test(c) ? c : ''; }
// html string -> safe fragment. icons: render tokens as icon spans
function sanitize(html, editable) {
  const doc = new DOMParser().parseFromString('<body>' + (html || '') + '</body>', 'text/html');
  const out = document.createDocumentFragment();
  let count = 0;
  const walk = (src, dst) => {
    for (const n of src.childNodes) {
      if (++count > 5000) return;
      if (n.nodeType === 3) { appendText(dst, n.nodeValue, editable); continue; }
      if (n.nodeType !== 1) continue;
      const tag = n.tagName.toLowerCase();
      if (['script', 'style', 'iframe', 'object', 'svg', 'math', 'template', 'noscript'].includes(tag)) continue;
      if (tag === 'span' && n.dataset && (ICONS[n.dataset.ic] || n.dataset.ic === 'flower')) { dst.append(editable ? iconEl(n.dataset.ic, true) : iconEl(n.dataset.ic)); continue; }
      let el = null;
      if (tag === 'br') { dst.append(document.createElement('br')); continue; }
      if (tag === 'b' || tag === 'strong') el = document.createElement('b');
      else if (tag === 'i' || tag === 'em') el = document.createElement('i');
      else if (tag === 'p' || tag === 'div') el = document.createElement('p');
      const col = cleanColor(tag === 'font' ? n.getAttribute('color') : (n.style && n.style.color));
      if (col) { const sp = document.createElement('span'); sp.style.color = col; if (el) { el.append(sp); dst.append(el); walk(n, sp); } else { dst.append(sp); walk(n, sp); } continue; }
      if (el) { dst.append(el); walk(n, el); } else walk(n, dst);
    }
  };
  walk(doc.body, out);
  return out;
}
function appendText(dst, text, editable) {
  let last = 0; TOKEN_RE.lastIndex = 0; let m;
  while ((m = TOKEN_RE.exec(text))) {
    if (m.index > last) dst.append(document.createTextNode(text.slice(last, m.index)));
    dst.append(iconEl(m[1], editable)); last = m.index + m[0].length;
  }
  if (last < text.length) dst.append(document.createTextNode(text.slice(last)));
}
// editor DOM -> stored html (icons become :tokens:), then re-sanitized to string
function serialize(root) {
  const c = root.cloneNode(true);
  c.querySelectorAll('.ic[data-ic]').forEach(e => e.replaceWith(document.createTextNode(':' + e.dataset.ic + ':')));
  const frag = sanitize(c.innerHTML, false);
  const box = document.createElement('div'); box.append(frag);
  box.querySelectorAll('.ic[data-ic]').forEach(e => e.replaceWith(document.createTextNode(':' + e.dataset.ic + ':')));
  return box.innerHTML.slice(0, 8000);
}

/* ---------- Platforms ---------- */
const PLATFORMS = [
  ['x', 'X', '#1D2A35', 'X', /(^|\.)(x|twitter)\.com$/],
  ['instagram', 'Instagram', '#D9628F', 'IG', /(^|\.)instagram\.com$/],
  ['weibo', '微博', '#E0614F', '微', /(^|\.)weibo\.(com|cn)$/],
  ['bilibili', 'bilibili', '#5FB3E0', 'B', /(^|\.)(bilibili\.com|b23\.tv)$/],
  ['xhs', '小红书', '#E5505F', '红', /(^|\.)(xiaohongshu\.com|xhslink\.com)$/],
  ['douyin', '抖音', '#2B2B38', '抖', /(^|\.)(douyin|iesdouyin)\.com$/],
  ['tiktok', 'TikTok', '#2B2B38', 'T', /(^|\.)tiktok\.com$/],
  ['youtube', 'YouTube', '#E25B5B', '▶', /(^|\.)(youtube\.com|youtu\.be)$/],
  ['github', 'GitHub', '#3D4552', 'GH', /(^|\.)github\.(com|io)$/],
  ['pixiv', 'pixiv', '#4C9BE0', 'P', /(^|\.)pixiv\.(net|me)$/],
  ['qq', 'QQ', '#4FA6DE', 'Q', /(^|\.)(qq\.com|qm\.qq\.com)$/],
  ['wechat', '微信', '#4CB97A', '微信', /(^|\.)(weixin\.qq\.com|wechat\.com)$/],
  ['line', 'LINE', '#4CC46A', 'L', /(^|\.)(line\.me|lin\.ee)$/],
  ['discord', 'Discord', '#7783E0', 'D', /(^|\.)(discord\.(gg|com)|discordapp\.com)$/],
  ['steam', 'Steam', '#3E5C7E', 'S', /(^|\.)(steamcommunity|steampowered)\.com$/]
];
function platformOf(url) {
  let host = ''; try { host = new URL(url).hostname.toLowerCase(); } catch { }
  for (const p of PLATFORMS) if (p[4].test(host)) {
    if (p[0] === 'qq' && /weixin/.test(host)) continue;
    return { id: p[0], name: p[1], color: p[2], abbr: p[3] };
  }
  return { id: 'web', name: '网站', color: '#7FA3C2', abbr: '' };
}
function pfBadge(p) {
  const b = h('span', { class: 'pf', style: 'background:' + p.color });
  if (p.abbr) { b.textContent = p.abbr; if (p.abbr.length > 1) b.style.fontSize = '8px'; } else b.append(svgFrom('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>'));
  return b;
}
function safeUrl(u) {
  u = (u || '').trim(); if (!u) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u;
  try { const x = new URL(u); if (x.protocol !== 'https:' && x.protocol !== 'http:') return null; if (!x.hostname.includes('.')) return null; return x.href; } catch { return null; }
}

/* ---------- Pretty QR (qrcode-generator core, custom SVG render) ---------- */
function qrSvg(text, theme, plat) {
  const qr = qrcode(0, 'H'); qr.addData(unescape(encodeURIComponent(text)), 'Byte'); qr.make();
  const n = qr.getModuleCount(), q = 3, size = n + q * 2;
  const st = getComputedStyle(document.documentElement);
  const dark = theme.qr, eye = theme.qrEye;
  const logo = Math.ceil(n * 0.22) | 1, l0 = (n - logo) / 2;
  const inFinder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  const inLogo = (r, c) => r >= l0 - .5 && r < l0 + logo + .5 && c >= l0 - .5 && c < l0 + logo + .5;
  let dots = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
    if (qr.isDark(r, c) && !inFinder(r, c) && !inLogo(r, c)) dots += `M${c + q + .3},${r + q + .04}h.4a.26,.26 0 0 1 .26,.26v.4a.26,.26 0 0 1 -.26,.26h-.4a.26,.26 0 0 1 -.26,-.26v-.4a.26,.26 0 0 1 .26,-.26z`;
  const tint = theme.qrTint; const eyeAt = (x, y) => `<rect fill="${tint}" x="${x + 1}" y="${y + 1}" width="5" height="5" rx="1.2"/><path fill="${dark}" fill-rule="evenodd" d="M${x + 2},${y}h3a2,2 0 0 1 2,2v3a2,2 0 0 1 -2,2h-3a2,2 0 0 1 -2,-2v-3a2,2 0 0 1 2,-2zM${x + 2},${y + 1}a1,1 0 0 0 -1,1v3a1,1 0 0 0 1,1h3a1,1 0 0 0 1,-1v-3a1,1 0 0 0 -1,-1z"/><rect fill="${dark}" x="${x + 2}" y="${y + 2}" width="3" height="3" rx="1"/>`;
  let center = '';
  const cx = q + l0, cs = logo;
  center = `<rect x="${cx}" y="${cx}" width="${cs}" height="${cs}" rx="${cs * .3}" fill="#fff"/><circle cx="${cx + cs / 2}" cy="${cx + cs / 2}" r="${cs * .38}" fill="${plat.color}"/>`;
  const svg = `<svg xmlns="${SVGNS}" viewBox="0 0 ${size} ${size}" shape-rendering="geometricPrecision"><rect width="${size}" height="${size}" fill="#fff"/><path fill="${dark}" d="${dots}"/>${eyeAt(q, q)}${eyeAt(q + n - 7, q)}${eyeAt(q, q + n - 7)}${center}</svg>`;
  const wrap = h('div', { class: 'qr', role: 'img', 'aria-label': '二维码' });
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml'); // constant markup + validated theme colors only
  const el = document.importNode(doc.documentElement, true);
  if (plat.abbr) {
    const t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('x', cx + cs / 2); t.setAttribute('y', cx + cs / 2); t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'central');
    t.setAttribute('fill', '#fff'); t.setAttribute('font-size', cs * (plat.abbr.length > 1 ? .26 : .4)); t.setAttribute('font-weight', '700'); t.setAttribute('font-family', 'QLatin,sans-serif');
    t.textContent = plat.abbr; el.append(t);
  } else {
    const g = document.createElementNS(SVGNS, 'circle');
    g.setAttribute('cx', cx + cs / 2); g.setAttribute('cy', cx + cs / 2); g.setAttribute('r', cs * .17); g.setAttribute('fill', 'none'); g.setAttribute('stroke', '#fff'); g.setAttribute('stroke-width', cs * .06); el.append(g);
  }
  wrap.append(el); return wrap;
}

/* ---------- Themes ---------- */
const THEMES = {
  sky: { name: '天空蓝粉', pv: ['#CFE6F7', '#F9DCE8', '#4FA6DE'], qr: '#3E6E9A', qrEye: '#EFA0BE', qrTint: '#FCE3EC' },
  mint: { name: '薄荷奶糖', pv: ['#CDEFE3', '#FFE7D6', '#3E9E86'], qr: '#2F7462', qrEye: '#E8A893', qrTint: '#FBE9E2' },
  lavender: { name: '薰衣草雾', pv: ['#DCD5F5', '#F8DDEB', '#7D6CC8'], qr: '#5A4C9C', qrEye: '#D7A0C8', qrTint: '#F5E5F1' },
  peach: { name: '蜜桃汽水', pv: ['#FFD9CC', '#FFE9C9', '#E0915A'], qr: '#8A4F45', qrEye: '#F0A69F', qrTint: '#FDE7E4' },
  night: { name: '夜空星河', pv: ['#233A55', '#3B3150', '#8CC7F0'], qr: '#2E3F5C', qrEye: '#E795B5', qrTint: '#FBE1EB' }
};
function applyTheme(t) { document.documentElement.dataset.theme = THEMES[t] ? t : 'sky'; drawFlowers(); }
const WING = '<path class="wb" d="M2 18C6 6 20 1 38 3c-3 4-7 6-11 7 4 .5 7 2 9 4-4 2-8 2.5-12 2.5 3 1 5 2.5 6.5 4.5-5.5 1.5-11.5 1-16.5-.5-4 2.5-8 2.5-12-2.5z"/><path class="wa" d="M2 18C7 10 16 6.5 27 6c-3 2-6.5 3.5-10 4.3 3 .6 5.5 1.7 7.5 3.2-3.5 1.4-7 1.9-10.5 1.8 2 .9 3.6 2 4.8 3.4-4 .6-8 .3-11.8-.7z"/>';
const HALO = '<ellipse class="hl" cx="20" cy="7" rx="16" ry="4.6" fill="none" stroke-width="3.2"/>';
const FEATHER = '<path class="wb" d="M20 2C11 3 5 9.5 5 18.5 13 17.5 18.5 11 20 2z"/><path class="wa" d="M20 2C14 6 9 11 6.5 17.5 12 15 17 10 20 2z"/><path class="ql" d="M3 21.5 14.5 8" fill="none" stroke-width="1.4" stroke-linecap="round"/>';
const WHEART = '<g class="wb"><path d="M34 14c3-6.5 8-8.5 13.5-8-1 2.5-3 3.6-5.5 4.2 2 .4 3.4 1.3 4.3 2.6-3.4 1.4-7 1.6-10.6 1.2z"/><path transform="translate(48 0) scale(-1 1)" d="M34 14c3-6.5 8-8.5 13.5-8-1 2.5-3 3.6-5.5 4.2 2 .4 3.4 1.3 4.3 2.6-3.4 1.4-7 1.6-10.6 1.2z"/></g><path class="hp" d="M24 27c-8-5.6-11-10-11-14a5.5 5.5 0 0 1 11-1.6A5.5 5.5 0 0 1 35 13c0 4-3 8.4-11 14z"/>';
function art(vb, markup, cls) { const s = document.createElementNS(SVGNS, 'svg'); s.setAttribute('viewBox', vb); s.setAttribute('aria-hidden', 'true'); if (cls) s.setAttribute('class', cls); s.innerHTML = markup; return s; }
function drawFlowers() {
  const box = $('.flowers'); if (box.childNodes.length) return;
  const spots = [[6,8,30],[58,6,26],[91,20,28],[10,27,24],[84,39,24],[5,50,28],[94,55,24],[8,72,26],[88,76,28],[22,92,24],[79,92,26]];
  spots.forEach(([x, y, s], i) => {
    const f = i % 3 === 1 ? art('0 0 48 30', WHEART, 'wh') : art('0 0 24 24', FEATHER, 'fe');
    f.style.cssText = `left:${x}%;top:${y}%;width:${i % 3 === 1 ? s * 1.5 : s}px;height:${s}px;animation-delay:${-i * 1.3}s;animation-duration:${9 + i % 4 * 2}s`;
    box.append(f);
  });
  [[30,14,14],[70,30,10],[4,40,12],[96,66,14],[48,88,10],[66,62,9],[30,70,11]].forEach(([x, y, s], i) => { const e = svgFrom(SPARK); e.setAttribute('class', 'sp'); e.style.cssText = `left:${x}%;top:${y}%;width:${s}px;height:${s}px;animation-delay:${-i * .5}s`; box.append(e); });
  [[2,16,90],[78,12,70],[86,60,100],[0,84,80]].forEach(([x, y, s], i) => { const e = svgFrom(CLOUD); e.setAttribute('class', 'cl'); e.style.cssText = `left:${x}%;top:${y}%;width:${s}px;height:${s * .6}px;animation-delay:${-i * 3}s`; box.append(e); });
}

/* ---------- Backends (same interface) ---------- */
const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
function demoBackend() {
  const ld = k => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch { return {}; } };
  const sv = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const hash = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('pp:' + s)))].map(b => b.toString(16).padStart(2, '0')).join('');
  return {
    demo: true,
    async user() { const s = ld('pp_session'); return s.id ? { id: s.id, email: s.email } : null; },
    async signUp(email, pw) {
      const users = ld('pp_users'); if (users[email]) throw new Error('该邮箱已注册');
      const id = crypto.randomUUID(); users[email] = { id, pw: await hash(pw) }; sv('pp_users', users); sv('pp_session', { id, email }); return { id, email };
    },
    async signIn(email, pw) {
      const u = ld('pp_users')[email]; if (!u || u.pw !== await hash(pw)) throw new Error('邮箱或密码不正确');
      sv('pp_session', { id: u.id, email }); return { id: u.id, email };
    },
    async signOut() { localStorage.removeItem('pp_session'); },
    async byHandle(handle) { return Object.values(ld('pp_profiles')).find(p => p.handle === handle) || null; },
    async byId(id) { return ld('pp_profiles')[id] || null; },
    async save(p) {
      const all = ld('pp_profiles');
      if (Object.values(all).some(o => o.handle === p.handle && o.id !== p.id)) throw new Error('这个页面 ID 已被使用');
      all[p.id] = { ...p, updated_at: new Date().toISOString() }; sv('pp_profiles', all); return all[p.id];
    },
    async uploadAvatar(uid, blob) { return await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); }); }
  };
}
function supaBackend() {
  const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  const chk = ({ data, error }) => { if (error) throw new Error(zhErr(error.message)); return data; };
  const cols = 'id,handle,display_name,avatar_url,gender,birthday,show_year,tags,bio_html,theme,links,updated_at';
  return {
    demo: false,
    async user() { const { data } = await sb.auth.getSession(); return data.session ? data.session.user : null; },
    async signUp(email, password) {
      const d = chk(await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } }));
      if (!d.session) throw new Error('注册成功！请先去邮箱点击确认链接，然后再登录');
      return d.user;
    },
    async signIn(email, password) { return chk(await sb.auth.signInWithPassword({ email, password })).user; },
    async signOut() { await sb.auth.signOut(); },
    async byHandle(handle) { return chk(await sb.from('profiles').select(cols).eq('handle', handle).maybeSingle()); },
    async byId(id) { return chk(await sb.from('profiles').select(cols).eq('id', id).maybeSingle()); },
    async save(p) { const row = { ...p }; delete row.updated_at; return chk(await sb.from('profiles').upsert(row).select(cols).single()); },
    async uploadAvatar(uid, blob) {
      const path = `${uid}/avatar-${Date.now()}.webp`;
      chk(await sb.storage.from('avatars').upload(path, blob, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' }));
      return sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    }
  };
}
function zhErr(m) {
  if (/duplicate key|profiles_handle/i.test(m)) return '这个页面 ID 已被使用';
  if (/Invalid login/i.test(m)) return '邮箱或密码不正确';
  if (/already registered/i.test(m)) return '该邮箱已注册';
  if (/Email not confirmed/i.test(m)) return '邮箱还没确认，请先点击邮件里的链接';
  if (/Password should be/i.test(m)) return '密码至少 6 位';
  if (/rate limit/i.test(m)) return '操作太频繁，请稍后再试';
  return m;
}
const API = DEMO ? demoBackend() : supaBackend();

/* ---------- Helpers ---------- */
const ZODIAC = [['摩羯座', 120], ['水瓶座', 219], ['双鱼座', 321], ['白羊座', 420], ['金牛座', 521], ['双子座', 622], ['巨蟹座', 723], ['狮子座', 823], ['处女座', 923], ['天秤座', 1024], ['天蝎座', 1123], ['射手座', 1222], ['摩羯座', 1232]];
function zodiac(b) { const [, m, d] = b.split('-').map(Number); const v = m * 100 + d; return ZODIAC.find(z => v < z[1])[0]; }
function bdayText(b, showYear) { const [y, m, d] = b.split('-').map(Number); return (showYear ? y + '年' : '') + m + '月' + d + '日'; }
const fmtDate = s => { const d = s ? new Date(s) : new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const GENDERS = { male: '♂ 男', female: '♀ 女', secret: '', custom: '' };
function emptyProfile(uid, handle) { return { id: uid, handle, display_name: '', avatar_url: '', gender: 'secret', birthday: null, show_year: false, tags: [], bio_html: '', theme: 'sky', links: [] }; }
async function makeAvatar(file) {
  if (!/^image\//.test(file.type)) throw new Error('请选择图片文件');
  if (file.size > 15e6) throw new Error('图片太大了（最大 15MB）');
  const bmp = await createImageBitmap(file);
  const s = Math.min(bmp.width, bmp.height), c = document.createElement('canvas'); c.width = c.height = 256;
  c.getContext('2d').drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, 256, 256);
  return await new Promise(r => c.toBlob(r, 'image/webp', .85));
}

/* ---------- State & routing ---------- */
const S = { user: null, mine: null, edit: false, preview: null };
async function route() {
  const hash = location.hash || '#/';
  const app = $('#app');
  S.user = await API.user();
  S.mine = S.user ? await API.byId(S.user.id).catch(() => null) : null;
  let view;
  const m = hash.match(/^#\/u\/([a-z0-9_]{1,20})/);
  try {
    if (m) view = await pageView(m[1]);
    else if (hash === '#/setup') view = S.user ? (S.mine ? (location.hash = '#/u/' + S.mine.handle, null) : setupView()) : authView('signup');
    else if (hash === '#/login') view = authView('login');
    else if (hash === '#/signup') view = authView('signup');
    else if (S.user) { location.hash = S.mine ? '#/u/' + S.mine.handle : '#/setup'; return; }
    else view = authView('login');
  } catch (e) { view = msgView('出错了', e.message); }
  if (!view) return;
  app.replaceChildren(view);
  window.scrollTo({ top: 0 });
}
const BOW = '<path d="M12 12c-3-4-8-6-9.5-3.5S5 15 12 12zM12 12c3-4 8-6 9.5-3.5S19 15 12 12z" fill="currentColor" stroke="none" opacity=".85"/><path d="M11 12.5l-3 6.5 2.4-.6 1.1 1.8 1-7.2M13 12.5l3 6.5-2.4-.6-1.1 1.8-1-7.2" fill="currentColor" stroke="none" opacity=".7"/><circle cx="12" cy="12" r="1.9" fill="#fff" stroke="none"/>';
const SPARK = '<path d="M12 2c.8 5.6 4.4 9.2 10 10-5.6.8-9.2 4.4-10 10-.8-5.6-4.4-9.2-10-10 5.6-.8 9.2-4.4 10-10z" fill="currentColor" stroke="none"/>';
const CLOUD = '<path d="M6.5 19a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 17.6 8.6 5.2 5.2 0 0 1 17.5 19z" fill="currentColor" stroke="none"/>';
function deco(cls, markup) { const s = svgFrom(markup); s.setAttribute('class', 'deco ' + cls); s.setAttribute('aria-hidden', 'true'); return s; }
function divider() { return h('div', { class: 'divider', 'aria-hidden': 'true' }, h('i'), art('0 0 40 26', '<g transform="translate(40 0) scale(-1 1)">' + WING + '</g>', 'dl'), art('0 0 40 14', HALO, 'dh'), art('0 0 40 26', WING, 'dr'), h('i')); }
function shell(tabs, body) { return h('div', { class: 'view' }, h('nav', { class: 'tabs' }, tabs), h('section', { class: 'card' }, h('span', { class: 'deco tape', 'aria-hidden': 'true' }), art('0 0 48 30', WHEART, 'deco bow'), body)); }
function tab(label, on, onclick) { return h('button', { class: 'tab' + (on ? ' on' : ''), onclick }, on ? h('i', { class: 'dot' }) : null, label); }
function msgView(t, d) { applyTheme('sky'); return shell([tab('NOTICE', true)], h('div', { class: 'hero' }, h('h1', { class: 'disp' }, t), h('p', null, d), h('button', { class: 'btn main', onclick: () => location.hash = '#/' }, '回到首页'))); }

/* ---------- Auth ---------- */
function authView(mode) {
  applyTheme('sky');
  const email = h('input', { class: 'in', type: 'email', autocomplete: 'email', placeholder: 'you@example.com', maxlength: 120 });
  const pw = h('input', { class: 'in', type: 'password', autocomplete: mode === 'login' ? 'current-password' : 'new-password', placeholder: '至少 6 位', maxlength: 72 });
  const err = h('div', { class: 'err' });
  const go = h('button', { class: 'btn main', style: 'width:100%;justify-content:center;padding:12px', onclick: submit }, mode === 'login' ? '登录' : '注册并创建我的页面');
  async function submit() {
    err.textContent = ''; const e = email.value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return err.textContent = '请输入正确的邮箱';
    if (pw.value.length < 6) return err.textContent = '密码至少 6 位';
    go.disabled = true;
    try { mode === 'login' ? await API.signIn(e, pw.value) : await API.signUp(e, pw.value); location.hash = '#/'; if (location.hash === '#/') route(); }
    catch (x) { err.textContent = x.message; } finally { go.disabled = false; }
  }
  pw.addEventListener('keydown', e => e.key === 'Enter' && submit());
  return shell([tab('LOGIN', mode === 'login', () => location.hash = '#/login'), tab('SIGN UP', mode === 'signup', () => location.hash = '#/signup')],
    h('div', { class: 'auth stag' },
      h('div', { class: 'hero' }, API.demo ? h('span', { class: 'demo' }, '本地演示模式 · 数据只存在这台设备') : null,
        h('h1', { class: 'disp' }, '云朵名片'), h('p', null, '一页放下你的名字、简介和所有社交账号')),
      h('div', { class: 'fld' }, h('label', null, '邮箱'), email),
      h('div', { class: 'fld' }, h('label', null, '密码'), pw), err, go,
      h('p', { class: 'foot' }, mode === 'login' ? '还没有账号？' : '已经有账号了？', h('a', { href: mode === 'login' ? '#/signup' : '#/login' }, mode === 'login' ? '去注册' : '去登录'))));
}
function setupView() {
  applyTheme('sky');
  const hd = h('input', { class: 'in', placeholder: '例如 xiajing_01', maxlength: 20, autocapitalize: 'off', spellcheck: false });
  const nm = h('input', { class: 'in', placeholder: '想让大家怎么称呼你', maxlength: 40 });
  const err = h('div', { class: 'err' });
  const prev = h('div', { class: 'meta', style: 'margin-top:6px' }, '你的页面地址：…/#/u/');
  hd.addEventListener('input', () => { hd.value = hd.value.toLowerCase().replace(/[^a-z0-9_]/g, ''); prev.textContent = '你的页面地址：…/#/u/' + hd.value; });
  const go = h('button', { class: 'btn main', style: 'width:100%;justify-content:center;padding:12px', async onclick() {
    err.textContent = '';
    if (!HANDLE_RE.test(hd.value)) return err.textContent = '页面 ID 需 3–20 位，只能用小写字母、数字和下划线';
    if (!nm.value.trim()) return err.textContent = '请填写名字';
    go.disabled = true;
    try {
      if (await API.byHandle(hd.value)) throw new Error('这个页面 ID 已被使用');
      const p = emptyProfile(S.user.id, hd.value); p.display_name = nm.value.trim();
      await API.save(p); S.edit = true; location.hash = '#/u/' + hd.value;
    } catch (x) { err.textContent = x.message; go.disabled = false; }
  } }, '创建我的页面');
  return shell([tab('NEW PAGE', true)], h('div', { class: 'auth stag' },
    h('div', { class: 'hero' }, h('h1', { class: 'disp' }, '创建你的页面'), h('p', null, '页面 ID 会出现在网址里，创建后可以分享给任何人')),
    h('div', { class: 'fld' }, h('label', null, '页面 ID'), hd, prev),
    h('div', { class: 'fld' }, h('label', null, '名字'), nm), err, go,
    h('p', { class: 'foot' }, h('a', { href: '#/', onclick: async e => { e.preventDefault(); await API.signOut(); location.hash = '#/login'; } }, '退出登录'))));
}

/* ---------- Profile page ---------- */
async function pageView(handle) {
  const p = await API.byHandle(handle);
  if (!p) return msgView('找不到这个页面', '页面 ID「' + handle + '」还没有人使用');
  const owner = S.user && S.user.id === p.id;
  if (!owner) S.edit = false;
  if (S.edit && owner) return editView(p);
  const theme = S.preview && THEMES[S.preview] ? S.preview : (THEMES[p.theme] ? p.theme : 'sky');
  applyTheme(theme);
  const bar = h('div', { class: 'bar' });
  if (owner) bar.append(
    h('button', { class: 'btn sm main', onclick: () => { S.edit = true; S.preview = null; route(); } }, svgIco('<path d="M4 20h4L19 9l-4-4L4 16z"/>'), '编辑资料'),
    h('button', { class: 'btn sm', onclick: () => share(p) }, '复制链接'),
    h('button', { class: 'btn sm ghost', onclick: async () => { await API.signOut(); S.edit = false; route(); } }, '退出'));
  else if (!S.user) bar.append(h('a', { class: 'btn sm', href: '#/signup', style: 'text-decoration:none' }, '我也要做一个'));
  else if (S.mine) bar.append(h('a', { class: 'btn sm', href: '#/u/' + S.mine.handle, style: 'text-decoration:none' }, '我的页面'));
  const body = h('div', { class: 'stag' }, bar, headBlock(p),
    h('div', { class: 'sec', id: 'about' }, h('div', { class: 'meta' }, fmtDate(p.updated_at) + ' 更新'), h('h2', { class: 'htitle disp' }, '#关于我#'),
      p.bio_html ? h('div', { class: 'bio' }, sanitize(p.bio_html)) : h('div', { class: 'empty' }, '这个人很神秘，还没有写简介～')),
    divider(),
    h('div', { class: 'sec', id: 'links' }, h('div', { class: 'meta' }, (p.links || []).length + ' 个账号 · 扫码或点名称访问'), h('h2', { class: 'htitle disp' }, '#社交链接#'),
      (p.links || []).length ? h('div', { class: 'links' }, p.links.map(l => linkCard(l, THEMES[theme]))) : h('div', { class: 'empty' }, '还没有添加链接')),
    h('div', { class: 'foot' }, h('div', { class: 'lbl', style: 'margin-bottom:8px' }, owner ? '预览配色（保存请进入编辑）' : '换个配色预览'),
      h('div', { class: 'swatches', style: 'justify-content:center' }, Object.entries(THEMES).map(([k, t]) => h('button', { class: 'sw' + (k === theme ? ' on' : ''), title: t.name, 'aria-label': t.name, style: `background:${t.pv[0]};box-shadow:inset -10px -10px 0 ${t.pv[1]}`, onclick: () => { S.preview = k; route(); } }))),
      h('p', null, '云朵名片', API.demo ? ' · 演示模式' : '')));
  return shell([tab('ABOUT', true, () => $('#about').scrollIntoView({ behavior: 'smooth' })), tab('LINKS', false, () => $('#links').scrollIntoView({ behavior: 'smooth' })), tab('@' + p.handle, false, () => share(p))], body);
}
function svgIco(m) { const s = svgFrom(m); s.setAttribute('width', 14); s.setAttribute('height', 14); return s; }
function share(p) {
  const url = location.origin + location.pathname + '#/u/' + p.handle;
  (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('链接已复制'), () => toast(url));
}
function headBlock(p) {
  const av = h('div', { class: 'avatar' });
  if (p.avatar_url && (/^https:\/\//.test(p.avatar_url) || /^data:image\/(webp|png|jpeg);base64,/.test(p.avatar_url))) av.append(h('img', { src: p.avatar_url, alt: '头像', referrerpolicy: 'no-referrer' }));
  else { const f = art('0 0 48 30', WHEART, 'ph'); av.append(f); }
  const chips = h('div', { class: 'chips' });
  const g = p.gender === 'male' || p.gender === 'female' ? GENDERS[p.gender] : (p.gender && !['secret', 'custom'].includes(p.gender) ? p.gender : '');
  if (g) chips.append(h('span', { class: 'chip' }, g));
  if (p.birthday) { chips.append(h('span', { class: 'chip' }, iconEl('cal'), bdayText(p.birthday, p.show_year)), h('span', { class: 'chip pk' }, iconEl('star'), zodiac(p.birthday))); }
  const tags = (p.tags || []).length ? h('div', { class: 'chips' }, p.tags.map(t => h('span', { class: 'chip pk' }, '# ' + t))) : null;
  return h('div', { class: 'head' }, h('div', { class: 'av-wrap' }, art('0 0 40 26', '<g transform="translate(40 0) scale(-1 1)">' + WING + '</g>', 'awl'), art('0 0 40 26', WING, 'awr'), art('0 0 40 14', HALO, 'ahalo'), av, deco('s2', SPARK)), h('div', { class: 'hinfo' }, h('h1', { class: 'name disp' }, p.display_name || p.handle), h('div', { class: 'handle' }, '@' + p.handle), chips, tags));
}
function linkCard(l, theme) {
  const url = safeUrl(l.url); if (!url) return null;
  const plat = platformOf(url);
  return h('div', { class: 'lk' },
    h('a', { href: url, target: '_blank', rel: 'noopener noreferrer nofollow', title: l.name }, pfBadge(plat), h('span', { class: 't' }, l.name || plat.name)),
    qrSvg(url, theme, plat));
}

/* ---------- Edit mode ---------- */
function editView(orig) {
  const p = JSON.parse(JSON.stringify(orig)); p.links = p.links || []; p.tags = p.tags || [];
  applyTheme(p.theme);
  let avatarBlob = null;
  const err = h('div', { class: 'err' });
  // avatar
  const avBox = h('div', { class: 'avatar' }); const paintAv = src => { avBox.replaceChildren(); if (src) avBox.append(h('img', { src, alt: '头像' })); else avBox.append(art('0 0 48 30', WHEART, 'ph')); };
  paintAv(p.avatar_url);
  const file = h('input', { type: 'file', accept: 'image/*', hidden: true, async onchange() {
    try { avatarBlob = await makeAvatar(file.files[0]); paintAv(URL.createObjectURL(avatarBlob)); toast('头像已裁成正方形，保存后生效'); } catch (e) { toast(e.message); }
  } });
  // basic
  const name = h('input', { class: 'in', value: p.display_name, maxlength: 40, placeholder: '名字' });
  const handleIn = h('input', { class: 'in', value: p.handle, maxlength: 20 });
  handleIn.addEventListener('input', () => handleIn.value = handleIn.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  const custom = h('input', { class: 'in', maxlength: 12, placeholder: '自定义性别', value: ['male', 'female', 'secret'].includes(p.gender) ? '' : (p.gender === 'custom' ? '' : p.gender || ''), style: 'margin-top:8px' });
  let gsel = ['male', 'female', 'secret'].includes(p.gender) ? p.gender : 'custom';
  const seg = h('div', { class: 'seg' }, [['male', '男'], ['female', '女'], ['secret', '不公开'], ['custom', '自定义']].map(([k, t]) => h('button', { class: k === gsel ? 'on' : '', 'data-k': k, onclick: e => { gsel = k; seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.k === k)); custom.style.display = k === 'custom' ? '' : 'none'; } }, t)));
  custom.style.display = gsel === 'custom' ? '' : 'none';
  const bday = h('input', { class: 'in', type: 'date', value: p.birthday || '', max: fmtDate() });
  const zchip = h('span', { class: 'chip pk' });
  const showY = h('input', { type: 'checkbox', checked: !!p.show_year });
  const updZ = () => { zchip.replaceChildren(); if (bday.value) zchip.append(iconEl('star'), zodiac(bday.value)); zchip.style.display = bday.value ? '' : 'none'; };
  bday.addEventListener('input', updZ); updZ();
  // tags
  const tagBox = h('div', { class: 'chips' });
  const tagIn = h('input', { class: 'in', maxlength: 16, placeholder: '输入标签后按回车，例如 画画' });
  const paintTags = () => tagBox.replaceChildren(...p.tags.map((t, i) => h('span', { class: 'chip pk' }, '# ' + t, h('button', { class: 'x', 'aria-label': '删除', onclick: () => { p.tags.splice(i, 1); paintTags(); } }, '×'))));
  const addTag = () => { const v = tagIn.value.trim().replace(/^#+/, ''); if (!v) return; if (p.tags.length >= 12) return toast('最多 12 个标签'); if (!p.tags.includes(v)) p.tags.push(v); tagIn.value = ''; paintTags(); };
  tagIn.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); addTag(); } });
  paintTags();
  // bio editor
  const ed = h('div', { class: 'editor', contenteditable: 'true', spellcheck: 'false', 'aria-label': '简介' });
  ed.append(sanitize(p.bio_html, true));
  ed.addEventListener('paste', e => { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData.getData('text/plain') || '').slice(0, 2000)); });
  let saved = null;
  const keep = () => { const s = getSelection(); if (s.rangeCount && ed.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange(); };
  document.addEventListener('selectionchange', keep);
  const restore = () => { ed.focus(); if (saved) { const s = getSelection(); s.removeAllRanges(); s.addRange(saved); } };
  const color = c => { restore(); document.execCommand('styleWithCSS', false, true); document.execCommand('foreColor', false, c); keep(); };
  const PAL = ['#4E6478', '#F0A3C0', '#F7BCD2', '#4FA6DE', '#2E9C8F', '#8B7BC8', '#E08A5B', '#8EA2B4'];
  const tb = h('div', { class: 'tb', onmousedown: e => { if (e.target.tagName !== 'INPUT') e.preventDefault(); } },
    h('span', { class: 'lbl', style: 'margin:0 2px 0 0' }, '选中文字改色'),
    PAL.map(c => h('button', { class: 'sw', title: c, style: 'background:' + c, onclick: () => color(c) })),
    h('input', { type: 'color', value: '#C2577F', title: '自定义颜色', onchange: e => color(e.target.value) }),
    h('i', { class: 'sep' }),
    h('button', { class: 'ib tx', title: '加粗', onclick: () => { restore(); document.execCommand('bold'); } }, 'B'),
    h('button', { class: 'ib tx', title: '斜体', style: 'font-style:italic', onclick: () => { restore(); document.execCommand('italic'); } }, 'I'),
    h('button', { class: 'ib tx', title: '清除颜色', onclick: () => { restore(); document.execCommand('removeFormat'); } }, '⌫'),
    h('i', { class: 'sep' }),
    Object.keys(ICONS).filter(k => k !== 'flower').map(k => h('button', { class: 'ib', title: '插入' + ICONS[k][0], 'data-ic': k, onclick: () => { restore(); const s = getSelection(); if (!s.rangeCount) return; const r = s.getRangeAt(0); r.deleteContents(); const ic = iconEl(k, true); r.insertNode(ic); r.setStartAfter(ic); r.collapse(true); s.removeAllRanges(); s.addRange(r); keep(); } }, svgFrom(ICONS[k][1]))));
  // links
  const linkBox = h('div');
  const paintLinks = () => linkBox.replaceChildren(...p.links.map((l, i) => {
    const badge = h('span'); const upd = () => badge.replaceChildren(pfBadge(platformOf(safeUrl(l.url) || '')));
    const nm = h('input', { class: 'in', value: l.name, maxlength: 30, placeholder: '显示名称', oninput: e => l.name = e.target.value });
    const u = h('input', { class: 'in url', value: l.url, maxlength: 500, placeholder: 'https://…', inputmode: 'url', oninput: e => { l.url = e.target.value.trim(); upd(); }, onchange: () => { if (!l.name.trim()) { const pl = platformOf(safeUrl(l.url) || ''); if (pl.id !== 'web') { l.name = pl.name; nm.value = pl.name; } } } });
    upd();
    return h('div', { class: 'lrow' }, badge, nm, u, h('div', { class: 'ops' },
      h('button', { class: 'btn sm', title: '上移', disabled: i === 0, onclick: () => { [p.links[i - 1], p.links[i]] = [p.links[i], p.links[i - 1]]; paintLinks(); } }, '↑'),
      h('button', { class: 'btn sm', title: '下移', disabled: i === p.links.length - 1, onclick: () => { [p.links[i + 1], p.links[i]] = [p.links[i], p.links[i + 1]]; paintLinks(); } }, '↓'),
      h('button', { class: 'btn sm', title: '删除', onclick: () => { p.links.splice(i, 1); paintLinks(); } }, '×')));
  }));
  paintLinks();
  // themes
  const tBox = h('div', { class: 'swatches' });
  const paintThemes = () => tBox.replaceChildren(...Object.entries(THEMES).map(([k, t]) => h('button', { class: 'tsw' + (k === p.theme ? ' on' : ''), onclick: () => { p.theme = k; applyTheme(k); paintThemes(); } }, h('span', { class: 'pv' }, t.pv.map(c => h('i', { style: 'background:' + c }))), t.name)));
  paintThemes();
  const saveBtn = h('button', { class: 'btn main', onclick: save }, '保存');
  async function save() {
    err.textContent = '';
    p.display_name = name.value.trim().slice(0, 40);
    if (!p.display_name) return fail('请填写名字');
    if (!HANDLE_RE.test(handleIn.value)) return fail('页面 ID 需 3–20 位小写字母、数字或下划线');
    p.gender = gsel === 'custom' ? (custom.value.trim().slice(0, 12) || 'secret') : gsel;
    p.birthday = bday.value || null; p.show_year = showY.checked;
    p.bio_html = serialize(ed);
    const links = [];
    for (const l of p.links) { if (!l.url && !l.name) continue; const u = safeUrl(l.url); if (!u) return fail('链接「' + (l.name || l.url) + '」不是有效的 http/https 网址'); links.push({ name: (l.name || platformOf(u).name).trim().slice(0, 30), url: u }); }
    if (links.length > 20) return fail('最多 20 个链接');
    p.links = links;
    saveBtn.disabled = true;
    try {
      if (handleIn.value !== orig.handle && await API.byHandle(handleIn.value)) throw new Error('这个页面 ID 已被使用');
      p.handle = handleIn.value;
      if (avatarBlob) p.avatar_url = await API.uploadAvatar(p.id, avatarBlob);
      await API.save(p); document.removeEventListener('selectionchange', keep);
      S.edit = false; toast('已保存 ✓');
      if (location.hash !== '#/u/' + p.handle) location.hash = '#/u/' + p.handle; else route();
    } catch (x) { fail(x.message); saveBtn.disabled = false; }
  }
  function fail(m) { err.textContent = m; toast(m); }
  const sec = (meta, title, ...kids) => h('div', { class: 'sec' }, h('div', { class: 'meta' }, meta), h('h2', { class: 'htitle disp' }, title), ...kids);
  const body = h('div', { class: 'stag' },
    h('div', { class: 'bar' }, h('span', { class: 'meta', style: 'margin-right:auto' }, '编辑模式 · 只有你能看到'), h('button', { class: 'btn sm', onclick: () => { document.removeEventListener('selectionchange', keep); S.edit = false; route(); } }, '预览 / 取消')),
    h('div', { class: 'avedit' }, avBox, h('div', null, h('button', { class: 'btn sm main', onclick: () => file.click() }, '上传头像'), h('div', { class: 'meta', style: 'margin-top:6px' }, '自动裁成正方形并压缩'), file)),
    sec('01 BASIC', '#基本资料#',
      h('div', { class: 'grid2' }, h('div', { class: 'fld' }, h('label', null, '名字'), name), h('div', { class: 'fld' }, h('label', null, '页面 ID（网址）'), handleIn)),
      h('div', { class: 'fld' }, h('label', null, '性别'), seg, custom),
      h('div', { class: 'fld' }, h('label', null, '生日'), h('div', { class: 'row' }, bday, zchip, h('label', { class: 'chip', style: 'cursor:pointer' }, showY, '显示年份'))),
      h('div', { class: 'fld' }, h('label', null, '个人标签'), h('div', { class: 'row' }, tagIn, h('button', { class: 'btn sm', onclick: addTag }, '添加')), tagBox)),
    sec('02 BIO', '#简介#', h('div', { class: 'meta', style: 'margin:-8px 0 8px' }, '选中任意文字点色块即可改色；点图标插入到光标处'), tb, ed),
    sec('03 LINKS', '#社交链接#', h('div', { class: 'meta', style: 'margin:-8px 0 8px' }, '粘贴主页链接会自动识别平台并生成二维码；访客只会看到名称和二维码'), linkBox,
      h('button', { class: 'btn sm', onclick: () => { if (p.links.length >= 20) return toast('最多 20 个链接'); p.links.push({ name: '', url: '' }); paintLinks(); linkBox.lastChild.querySelector('.url').focus(); } }, '＋ 添加链接')),
    sec('04 THEME', '#配色#', tBox),
    err, h('div', { class: 'savebar' }, saveBtn));
  return shell([tab('EDIT', true), tab('@' + orig.handle, false, () => { S.edit = false; route(); })], body);
}

/* ---------- boot ---------- */
const qs = new URLSearchParams(location.search).get('u');
if (qs && !location.hash) location.hash = '#/u/' + qs.toLowerCase();
window.addEventListener('hashchange', () => { S.preview = null; route(); });
drawFlowers();
route();
window.__pp = { DEMO, qrSvg, sanitize, serialize, safeUrl, platformOf, THEMES };
})();
