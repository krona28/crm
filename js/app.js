// Оболочка CRM: вход, меню, маршруты (#/orders, #/order/<id> …), поиск по Ctrl+K, живое обновление экранов.
import {store} from './store.js';
import {$, $$, esc, ic, toast, modal, avatar, stagePill, thumb, cname, human} from './ui.js';
import {ROLES, phoneDigits} from './const.js';
import * as today from './views/today.js';
import * as orders from './views/orders.js';
import * as order from './views/order.js';
import * as clients from './views/clients.js';
import * as calendar from './views/calendar.js';
import * as partners from './views/partners.js';
import * as stock from './views/stock.js';
import * as money from './views/money.js';
import * as team from './views/team.js';
import * as settings from './views/settings.js';
import {newOrder} from './views/forms.js';

const VIEWS = {today, orders, order, clients, client: clients, calendar, partners, stock, money, team, settings};
const NAV = [
  ['today', 'Сегодня', 'today'], ['orders', 'Заказы', 'board'], ['clients', 'Клиенты', 'clients'], ['calendar', 'Календарь', 'calendar'],
  ['partners', 'Дизайнеры', 'partners', 'boss'], ['stock', 'Склад', 'stock'], ['money', 'Деньги', 'money', 'boss'],
  ['team', 'Команда', 'team'], ['settings', 'Настройки', 'settings', 'boss'],
];
const app = $('#app');
let route = {name: 'today', args: []};

const parse = () => { const [name, ...args] = location.hash.replace(/^#\/?/, '').split('/'); return {name: VIEWS[name] ? name : 'today', args: args.map(decodeURIComponent)}; };
const allowed = n => { const it = NAV.find(x => x[0] === n); return !it || !it[3] || store.boss; };

// ── вход ──
function authScreen(kind = 'login', note = ''){
  document.body.className = 'auth';
  const pending = kind === 'pending';
  app.innerHTML = `
    <div class="auth-box">
      <img class="auth-logo" src="img/logo-full.webp" alt="Крона">
      <div class="eyebrow">Мастерская · рабочее пространство</div>
      ${pending ? `
        <h1>Почти готово</h1>
        <p class="muted">Учётная запись <b>${esc(store.me?.email || '')}</b> создана. Руководитель должен открыть вам доступ в разделе «Команда» — после этого обновите страницу.</p>
        <div class="row gap"><button class="btn" onclick="location.reload()">Обновить</button><button class="btn ghost" id="out">Выйти</button></div>`
      : `
        <h1>${kind === 'signup' ? 'Регистрация' : kind === 'reset' || kind === 'newpass' ? 'Новый пароль' : 'Вход в CRM'}</h1>
        ${note ? `<p class="note">${esc(note)}</p>` : ''}
        <form id="auth" class="stack">
          ${kind === 'signup' ? '<label class="f"><span>Как вас зовут</span><input name="name" required autocomplete="name" placeholder="Имя"></label>' : ''}
          ${kind !== 'newpass' ? '<label class="f"><span>Почта</span><input name="email" type="email" required autocomplete="email" placeholder="name@mail.ru"></label>' : ''}
          ${kind !== 'reset' ? `<label class="f"><span>Пароль</span><input name="password" type="password" required minlength="6" autocomplete="${kind === 'login' ? 'current-password' : 'new-password'}"${kind === 'newpass' ? ' placeholder="Не меньше 6 символов"' : ''}></label>` : ''}
          <button class="btn wide">${kind === 'signup' ? 'Создать учётную запись' : kind === 'reset' ? 'Прислать ссылку' : kind === 'newpass' ? 'Сохранить пароль и войти' : 'Войти'}</button>
          <p class="err" id="auth-err" hidden></p>
        </form>
        <div class="auth-links">
          ${kind === 'login' ? '<a href="#" data-k="signup">Я новый сотрудник</a><a href="#" data-k="reset">Забыли пароль?</a>' : kind !== 'newpass' ? '<a href="#" data-k="login">← Ко входу</a>' : ''}
        </div>`}
    </div>`;
  $('#out')?.addEventListener('click', () => store.signOut());
  $$('[data-k]').forEach(a => a.onclick = e => { e.preventDefault(); authScreen(a.dataset.k); });
  $('#auth')?.addEventListener('submit', async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target)), btn = e.target.querySelector('button'), err = $('#auth-err');
    btn.disabled = true; err.hidden = true;
    try {
      if (kind === 'reset') { await store.resetPassword(f.email); return authScreen('login', 'Письмо отправлено. Оно придёт от «Supabase Auth» на английском — нажмите в нём ссылку «Reset password» и придумайте новый пароль. Ссылка действует 1 час и открывается один раз.'); }
      if (kind === 'newpass') { await store.setPassword(f.password); location.hash = ''; return location.reload(); }
      const st = kind === 'signup' ? await store.signUp(f.name, f.email, f.password) : await store.signIn(f.email, f.password);
      if (st === 'confirm') return authScreen('login', 'Мы отправили письмо — подтвердите почту и войдите.');
      start(st);
    } catch (x) {
      const t = human(x); err.textContent = t[0].toUpperCase() + t.slice(1);
      err.hidden = false; btn.disabled = false;
    }
  });
}

// ── каркас ──
function shell(){
  document.body.className = 'in';
  const me = store.me;
  app.innerHTML = `
    <aside class="side">
      <a class="brand" href="#/today"><img src="img/mark.webp" alt=""><span>КРОНА</span></a>
      <nav class="nav" id="nav"></nav>
      <div class="side-foot">
        <button class="me" id="me">${avatar(me.id)}<span><b>${esc(me.name)}</b><small>${esc(ROLES[me.role])}</small></span></button>
      </div>
    </aside>
    <div class="main">
      <header class="bar">
        <button class="icon-btn only-m" id="menu" aria-label="Меню">${ic('menu')}</button>
        <h1 class="bar-title" id="title"></h1>
        <button class="search-btn" id="search">${ic('search')}<span>Поиск заказов и клиентов</span><kbd>Ctrl K</kbd></button>
        <button class="btn sm" id="add">${ic('plus')}<span>Заказ</span></button>
      </header>
      ${store.mode === 'demo' ? `<div class="demo-bar">${ic('eye')}<span>Демо-режим: данные вымышленные и хранятся только в этом браузере.</span>
        <label>Смотреть как <select id="act-as">${store.t('profiles').map(p => `<option value="${p.id}" ${p.id === me.id ? 'selected' : ''}>${esc(p.name)} — ${ROLES[p.role]}</option>`).join('')}</select></label></div>` : ''}
      <div class="net-bar" id="net" hidden>${ic('alert')}<span></span></div>
      <main id="view" tabindex="-1"></main>
    </div>
    <nav class="tabbar" id="tabbar"></nav>`;
  $('#search').onclick = palette;
  $('#add').onclick = () => newOrder();
  $('#me').onclick = meMenu;
  $('#menu').onclick = moreMenu;
  $('#act-as')?.addEventListener('change', e => { store.actAs(e.target.value); shell(); render(); });
  netBar();
}
// полоса сверху: нет интернета или часть данных не загрузилась
function netBar(){
  const bar = $('#net'); if (!bar) return;
  const text = !navigator.onLine ? 'Нет интернета. Изменения не сохранятся, пока связь не вернётся.' : store.error;
  bar.hidden = !text; bar.querySelector('span').textContent = text || '';
}
addEventListener('online', netBar); addEventListener('offline', netBar);

// новая заявка с сайта: всплывашка, звук и уведомление, если CRM свёрнута
function newLead(o){
  if (!store.boss) return;
  const name = o.contact_name || store.get('clients', o.client_id)?.name || 'клиент';
  toast(`Новая заявка: ${name} · ${o.title}`);
  try {
    const a = new AudioContext(), g = a.createGain(); g.connect(a.destination);
    [880, 1320].forEach((f, i) => { const v = a.createOscillator(); v.frequency.value = f; v.connect(g); v.start(a.currentTime + i * .16); v.stop(a.currentTime + i * .16 + .14); });
    g.gain.value = .06;
  } catch (e) {}
  if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
    const n = new Notification('Новая заявка с сайта', {body: `${name}: ${o.title}`, icon: 'icons/icon-192.png', tag: o.id});
    n.onclick = () => { focus(); location.hash = `#/order/${o.id}`; n.close(); };
  }
}
function navHtml(){
  const inbox = store.boss ? store.t('orders').filter(o => o.stage === 'lead').length : 0;
  document.title = (inbox ? `(${inbox}) ` : '') + 'Крона · CRM';
  const nav = NAV.filter(n => !n[3] || store.boss);
  $('#nav').innerHTML = nav.map(([id, name, icon]) => `<a href="#/${id}" class="${route.name === id || (id === 'orders' && route.name === 'order') || (id === 'clients' && route.name === 'client') ? 'on' : ''}">${ic(icon)}<span>${name}</span>${id === 'today' && inbox ? `<em>${inbox}</em>` : ''}</a>`).join('');
  const tab = ['today', 'orders', null, 'calendar', 'clients'];
  $('#tabbar').innerHTML = tab.map(id => id ? (() => { const n = NAV.find(x => x[0] === id); return `<a href="#/${id}" class="${route.name === id || (id === 'orders' && route.name === 'order') ? 'on' : ''}">${ic(n[2])}<span>${n[1]}</span></a>`; })()
    : `<button class="fab" id="fab" aria-label="Новый заказ">${ic('plus')}</button>`).join('');
  $('#fab').onclick = () => newOrder();
}

function render(){
  const old = $('#view'); if (!old) return;
  // новый узел на каждую отрисовку — обработчики экранов не копятся
  const view = old.cloneNode(false); old.replaceWith(view);
  if (!allowed(route.name)) { location.hash = '#/today'; return; }
  const V = VIEWS[route.name];
  $('#title').textContent = typeof V.title === 'function' ? V.title(route) : V.title;
  navHtml();
  netBar();
  view.innerHTML = V.render(route);
  V.bind?.(view, route);
}
// живое обновление: не перерисовываем, пока человек что-то печатает
let pending = false;
function refresh(){
  const a = document.activeElement;
  if (a && $('#view')?.contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) {
    if (!pending) { pending = true; a.addEventListener('blur', () => { pending = false; setTimeout(refresh, 50); }, {once: true}); }
    return;
  }
  const y = window.scrollY, sx = $('.board-scroll')?.scrollLeft;
  render();
  window.scrollTo(0, y);
  if (sx != null && $('.board-scroll')) $('.board-scroll').scrollLeft = sx;
}

function go(){
  const prev = route.name;
  route = parse();
  render();
  if (prev !== route.name) { window.scrollTo(0, 0); }
  $('.side')?.classList.remove('open');
}

// ── поиск ──
function palette(){
  const m = modal(`<div class="pal"><div class="pal-in">${ic('search')}<input id="pq" placeholder="Номер заказа, клиент, телефон, изделие…" autocomplete="off" autofocus></div><div class="pal-res" id="pres"></div></div>`, {wide: true});
  const q = m.el.querySelector('#pq'), res = m.el.querySelector('#pres');
  let sel = 0, items = [];
  const draw = () => {
    const s = q.value.trim().toLowerCase(), digits = phoneDigits(s);
    const os = store.t('orders').filter(o => !s || `${o.num} №${o.num} ${o.title} ${cname(o.client_id)} ${o.size}`.toLowerCase().includes(s)
      || (digits.length > 3 && phoneDigits(store.get('clients', o.client_id)?.phone).includes(s.replace(/\D/g, ''))))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 7);
    const cs = s ? store.t('clients').filter(c => `${c.name} ${c.city} ${c.phone}`.toLowerCase().includes(s) || (s.replace(/\D/g, '').length > 3 && phoneDigits(c.phone).includes(s.replace(/\D/g, '')))).slice(0, 5) : [];
    const acts = [['Новый заказ', 'plus', () => newOrder()], ['Новый клиент', 'clients', () => clients.newClient()], ['Календарь сроков', 'calendar', () => location.hash = '#/calendar']]
      .filter(a => !s || a[0].toLowerCase().includes(s));
    items = [...os.map(o => ({h: `${thumb(o, 'xs')}<span><b>№${o.num} ${esc(o.title)}</b><small>${esc(cname(o.client_id))}</small></span>${stagePill(o.stage)}`, go: () => location.hash = `#/order/${o.id}`})),
      ...cs.map(c => ({h: `<span class="av">${ic('user')}</span><span><b>${esc(c.name)}</b><small>${esc([c.city, c.phone].filter(Boolean).join(' · '))}</small></span>`, go: () => location.hash = `#/client/${c.id}`})),
      ...acts.map(a => ({h: `<span class="av">${ic(a[1])}</span><span><b>${a[0]}</b></span>`, go: a[2]}))];
    sel = Math.min(sel, items.length - 1);
    res.innerHTML = items.length ? items.map((it, i) => `<button class="pal-it ${i === sel ? 'on' : ''}" data-i="${i}">${it.h}</button>`).join('') : '<p class="muted pad">Ничего не нашлось</p>';
  };
  const pick = i => { m.close(); items[i]?.go(); };
  q.oninput = () => { sel = 0; draw(); };
  q.onkeydown = e => {
    if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); draw(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
    if (e.key === 'Enter') pick(sel);
  };
  res.onclick = e => { const b = e.target.closest('[data-i]'); if (b) pick(+b.dataset.i); };
  draw();
}

function meMenu(){
  const m = modal(`<div class="sheet-menu">
    <div class="row gap">${avatar(store.me.id, 'lg')}<div><b>${esc(store.me.name)}</b><div class="muted">${esc(ROLES[store.role])}${store.me.email ? ' · ' + esc(store.me.email) : ''}</div></div></div>
    <button class="menu-it" data-go="team">${ic('team')}Команда</button>
    ${store.boss ? `<button class="menu-it" data-go="settings">${ic('settings')}Настройки и шаблоны</button>` : ''}
    ${store.mode === 'cloud' ? `<button class="menu-it" id="logout">${ic('logout')}Выйти</button>` : `<button class="menu-it" id="reset">${ic('trash')}Сбросить демо-данные</button>`}
  </div>`);
  m.el.onclick = e => {
    const g = e.target.closest('[data-go]'); if (g) { m.close(); location.hash = '#/' + g.dataset.go; }
    if (e.target.closest('#logout')) store.signOut();
    if (e.target.closest('#reset')) store.resetDemo();
  };
}
function moreMenu(){ $('.side').classList.toggle('open'); }

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' || (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName))) {
    if (document.body.classList.contains('in') && !$('dialog[open]')) { e.preventDefault(); palette(); }
  }
});
document.addEventListener('click', e => { if ($('.side.open') && !e.target.closest('.side, #menu')) $('.side').classList.remove('open'); });

function start(status){
  if (status === 'login') return authScreen('login');
  if (status === 'pending') return authScreen('pending');
  shell();
  route = parse();
  render();
  store.subscribe(refresh);
  window.addEventListener('hashchange', go);
  window.addEventListener('crm:render', refresh);
  window.addEventListener('crm:lead', e => newLead(e.detail));
}

(async () => {
  try {
    // ссылка из письма устарела или уже открывалась — Supabase возвращает ошибку в адресе
    if (/error_code=|error=/.test(location.hash)) {
      const expired = /otp_expired|expired|invalid/i.test(decodeURIComponent(location.hash));
      history.replaceState(null, '', location.pathname + location.search);
      await store.init();
      return authScreen('reset', expired ? 'Ссылка из письма устарела или уже открывалась. Запросите новую — введите почту ещё раз.' : 'Не получилось открыть ссылку из письма. Запросите новую.');
    }
    if (/type=recovery/.test(location.hash)) { await store.init(); return authScreen('newpass'); }
    start(await store.init());
    store.onAuth((ev) => { if (ev === 'PASSWORD_RECOVERY') authScreen('newpass'); if (ev === 'SIGNED_OUT') location.reload(); });
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="auth-box"><h1>Нет связи с базой</h1><p class="muted">${esc(e.message)}</p><button class="btn" onclick="location.reload()">Повторить</button></div>`;
  }
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
export {toast};
