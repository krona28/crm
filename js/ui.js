// Общие кирпичики интерфейса: экранирование, иконки, всплывашки, окна, аватары, метки этапов.
import {store} from './store.js';
import {CLIENT_PAGE} from './config.js';
import {stage, item, CATS, WOODS, daysTo, dshort, dmy, initials, isActive, money} from './const.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
export const attr = esc;

// иконки: тонкая линия 1.6, в цвет текста
const P = {
  today:'<path d="M4 6h16M4 12h10M4 18h7"/><circle cx="18" cy="16" r="3"/>',
  board:'<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="10" rx="1.5"/><rect x="17" y="4" width="4" height="13" rx="1.5"/>',
  clients:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.6.8 2.6 2.5 3 5.2"/>',
  calendar:'<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  partners:'<path d="M12 21s-7-4.4-7-10.2A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 7 2.8C19 16.6 12 21 12 21z"/>',
  stock:'<path d="M3 8l9-4.5L21 8v10l-9 4.5L3 18z"/><path d="M3 8l9 4.5L21 8M12 12.5v10"/>',
  money:'<path d="M4 19V11M10 19V5M16 19v-6M22 19H2"/>',
  team:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.2 4.2-6.5 8-6.5s7 2.3 8 6.5"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', search:'<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>', check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>', chevron:'<path d="M9 6l6 6-6 6"/>', back:'<path d="M15 6l-6 6 6 6"/>',
  phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  wa:'<path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.4z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .8a5 5 0 0 1-2.7-2.7l.8-1-1-2z"/>',
  tg:'<path d="M21 4L3 11l6 2.2L18 7l-7 7.2.3 5.8 3-3.8 4.2 3z"/>',
  camera:'<path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.6"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', flame:'<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.6 3-5.3 3.8-9.3 2.4 1.6 3.4 3.8 3.4 5.9 1-.6 1.7-1.7 1.9-3 1.9 1.6 3.9 4.1 3.9 6.6C18.5 18.4 15.9 21 12 21z"/>',
  ruble:'<path d="M8 20V4h5.5a4 4 0 0 1 0 8H6M6 16h8"/>', inbox:'<path d="M3 13l2.6-7.4A2 2 0 0 1 7.5 4.3h9a2 2 0 0 1 1.9 1.3L21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 13h5l1.5 2.5h5L16 13h5"/>',
  print:'<path d="M7 9V3.5h10V9M7 17H4.5a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 4.5 9h15a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17"/><rect x="7" y="14" width="10" height="7"/>',
  trash:'<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>', share:'<path d="M12 15V3.5M7.5 8L12 3.5 16.5 8"/><path d="M5 12v7.5h14V12"/>',
  note:'<path d="M5 4h14v11l-5 5H5z"/><path d="M14 20v-5h5"/>', list:'<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  logout:'<path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15M10 16.5L5.5 12 10 7.5M5.5 12H15"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>', star:'<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>',
  alert:'<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>', truck:'<path d="M2.5 6.5h11v10h-11zM13.5 10h4l3 3.2v3.3h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  download:'<path d="M12 4v11.5M7.5 11L12 15.5 16.5 11M5 20h14"/>', eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.2 4.2-6.5 8-6.5s7 2.3 8 6.5"/>',
};
export const ic = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || ''}</svg>`;

// ── всплывающее сообщение (с «Отменить») ──
export function toast(text, undo){
  const host = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${esc(text)}</span>${undo ? '<button type="button">Отменить</button>' : ''}`;
  host.append(el);
  requestAnimationFrame(() => el.classList.add('in'));
  const close = () => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); };
  if (undo) el.querySelector('button').onclick = () => { undo(); close(); };
  setTimeout(close, undo ? 6000 : 3200);
}
export const fail = e => { console.error(e); toast('Не сохранилось: ' + (e?.message || 'нет связи. Проверьте интернет')); };

// ── модальное окно / нижний лист на телефоне ──
export function modal(html, {wide = false, onClose} = {}){
  const d = document.createElement('dialog');
  d.className = 'modal' + (wide ? ' wide' : '');
  d.innerHTML = `<div class="modal-in">${html}</div>`;
  document.body.append(d);
  d.showModal();
  const close = () => { if (!d.open) return; d.classList.add('out'); setTimeout(() => { d.close(); d.remove(); onClose?.(); }, 180); };
  d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) close(); });
  d.addEventListener('cancel', e => { e.preventDefault(); close(); });
  setTimeout(() => d.querySelector('[autofocus]')?.focus(), 30);
  return {el: d, close};
}
export function confirmBox(text, yes = 'Удалить'){
  return new Promise(res => {
    const m = modal(`<h3>${esc(text)}</h3><div class="row end gap"><button class="btn ghost" data-close>Отмена</button><button class="btn danger" data-yes>${esc(yes)}</button></div>`, {onClose: () => res(false)});
    m.el.querySelector('[data-yes]').onclick = () => { res(true); m.close(); };
  });
}

// ── мелкие элементы ──
export function avatar(id, size = ''){
  const p = store.get('profiles', id);
  if (!p) return `<span class="av empty ${size}" title="Не назначен">${ic('user')}</span>`;
  return `<span class="av ${size}" style="--c:${attr(p.color || '#c9a66b')}" title="${attr(p.name)}">${esc(initials(p.name))}</span>`;
}
export const pname = id => store.get('profiles', id)?.name || '';
export const cname = id => store.get('clients', id)?.name || 'Без клиента';
export const stagePill = id => { const s = stage(id); return `<span class="pill st-${s.group}">${esc(s.name)}</span>`; };
export function thumb(o, cls = ''){
  const it = item(o.item_id);
  return it ? `<span class="thumb ${cls}"><img src="img/items/${it.id}.webp" alt="" loading="lazy"></span>`
    : `<span class="thumb ${cls} cat-${attr(o.cat)}"><span>${esc((CATS[o.cat]?.name || '?')[0])}</span></span>`;
}
export const woodChip = k => WOODS[k] ? `<span class="wood"><img src="img/wood/${k}.webp" alt="">${esc(WOODS[k])}</span>` : '';
export function due(o){
  if (!o.deadline || !isActive(o)) return o.deadline ? `<span class="due">${ic('clock')}${dshort(o.deadline)}</span>` : '';
  const d = daysTo(o.deadline);
  const cls = d < 0 ? 'late' : d <= 3 ? 'soon' : '';
  const t = d < 0 ? `просрочен ${-d} дн` : d === 0 ? 'сегодня' : d === 1 ? 'завтра' : dshort(o.deadline);
  return `<span class="due ${cls}">${ic('clock')}${t}</span>`;
}
export const paidSum = oid => store.t('payments').filter(p => p.order_id === oid).reduce((s, p) => s + Number(p.amount || 0), 0);
export function moneyLine(o){
  if (!store.boss || !o.price) return '';
  const paid = paidSum(o.id), left = o.price - paid;
  return `<span class="mny">${money(o.price)}${left > 0 && paid ? ` <i>· долг ${money(left)}</i>` : paid >= o.price ? ' <i class="ok">· оплачен</i>' : ''}</span>`;
}
export const empty = (text, sub = '') => `<div class="empty-state">${ic('note')}<b>${esc(text)}</b>${sub ? `<p>${esc(sub)}</p>` : ''}</div>`;

// подстановка в шаблон сообщения
export function fillTemplate(text, o){
  const c = store.get('clients', o?.client_id) || {};
  const paid = o ? paidSum(o.id) : 0, pre = Math.round((o?.price || 0) * store.settings.prepay / 100);
  const map = {
    'имя': c.name || '', 'изделие': (o?.title || '').replace(/^./, ch => ch.toLowerCase()), 'порода': (WOODS[o?.wood] || 'порода по согласованию').toLowerCase(),
    'размер': o?.size || 'размер по согласованию', 'цена': money(o?.price), 'срок': o?.deadline ? dmy(o.deadline) : '—', 'номер': o?.num ?? '', 'ссылка': o?.token ? CLIENT_PAGE + o.token : '',
    'предоплата': money(Math.max(0, pre - paid) || pre), 'остаток': money(Math.max(0, (o?.price || 0) - paid)),
  };
  return text.replace(/\{([^}]+)\}/g, (m, k) => map[k] ?? m);
}
