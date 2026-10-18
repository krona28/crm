// Клиенты: список с поиском и карточка клиента со всеми его заказами.
import {store} from '../store.js';
import {esc, attr, ic, thumb, stagePill, due, paidSum, empty, confirmBox, toast, fail} from '../ui.js';
import {isActive, money, dmy, phoneDigits, phoneNice, initials, plural} from '../const.js';
import {clientForm, newOrder} from './forms.js';

export const title = r => r.name === 'client' ? (store.get('clients', r.args[0])?.name || 'Клиент') : 'Клиенты';
export const newClient = () => clientForm({}, c => location.hash = `#/client/${c.id}`);
let q = '', sort = 'recent';

const stats = c => {
  const os = store.t('orders').filter(o => o.client_id === c.id);
  const done = os.filter(o => o.stage !== 'lost');
  return {os, active: os.filter(isActive).length, total: done.reduce((s, o) => s + (+o.price || 0), 0), paid: done.reduce((s, o) => s + paidSum(o.id), 0),
    last: os.reduce((m, o) => o.updated_at > m ? o.updated_at : m, c.created_at)};
};

function list(){
  const s = q.trim().toLowerCase(), d = s.replace(/\D/g, '');
  const rows = store.t('clients').filter(c => !s || `${c.name} ${c.city} ${c.notes}`.toLowerCase().includes(s) || (d.length > 3 && phoneDigits(c.phone).includes(d)))
    .map(c => ({c, ...stats(c)}))
    .sort((a, b) => sort === 'value' ? b.total - a.total : sort === 'name' ? a.c.name.localeCompare(b.c.name, 'ru') : b.last.localeCompare(a.last));
  return rows.length ? `<div class="clients">${rows.map(({c, os, active, total}) => `
    <a class="client" href="#/client/${c.id}">
      <span class="av lg">${esc(initials(c.name))}</span>
      <span class="grow"><b>${esc(c.name)}</b><small>${esc([phoneNice(c.phone), c.city].filter(Boolean).join(' · '))}</small></span>
      <span class="cl-stat">${os.length} ${plural(os.length, 'заказ', 'заказа', 'заказов')}${active ? ` <i class="gold">· ${active} в работе</i>` : ''}${store.boss && total ? `<small>${money(total)}</small>` : ''}</span>
    </a>`).join('')}</div>` : empty('Клиентов не нашлось');
}

export function render(r){
  if (r.name === 'client') return page(r.args[0]);
  return `
  <div class="toolbar">
    <label class="search-in">${ic('search')}<input id="cq" type="search" placeholder="Имя, телефон, город" value="${attr(q)}"></label>
    <div class="seg">${[['recent', 'Недавние'], ['value', 'По сумме'], ['name', 'А–Я']].filter(x => store.boss || x[0] !== 'value').map(([k, t]) => `<button class="${sort === k ? 'on' : ''}" data-sort="${k}">${t}</button>`).join('')}</div>
    <span class="grow"></span>
    <button class="btn sm" id="cadd">${ic('plus')}Клиент</button>
  </div>
  <div id="clist">${list()}</div>`;
}

function page(id){
  const c = store.get('clients', id);
  if (!c) return empty('Клиент не найден');
  const {os, total, paid} = stats(c);
  const des = store.get('designers', c.designer_id), wa = phoneDigits(c.phone);
  return `
  <a class="back" href="#/clients">${ic('back')}Клиенты</a>
  <section class="cl-hero card">
    <span class="av xl">${esc(initials(c.name))}</span>
    <div class="grow">
      <h2>${esc(c.name)}</h2>
      <p class="muted">${esc([phoneNice(c.phone), c.city, c.address].filter(Boolean).join(' · '))}</p>
      <p class="small muted">Клиент с ${dmy(c.created_at)}${c.source ? ` · пришёл: ${esc(c.source)}` : ''}${des ? ` · дизайнер ${esc(des.name)}` : ''}</p>
      ${c.notes ? `<p class="cl-notes">${esc(c.notes)}</p>` : ''}
    </div>
    <div class="cl-act">
      ${c.phone ? `<a class="btn ghost sm" href="tel:+${wa}">${ic('phone')}Позвонить</a><a class="btn ghost sm" href="https://wa.me/${wa}" target="_blank" rel="noopener">${ic('wa')}WhatsApp</a>` : ''}
      <button class="btn ghost sm" id="cedit">Изменить</button>
    </div>
  </section>
  ${store.boss ? `<section class="kpis three">
    <div class="kpi"><span>Заказов</span><b>${os.length}</b></div>
    <div class="kpi"><span>На сумму</span><b>${money(total)}</b></div>
    <div class="kpi ${total - paid > 0 ? 'warn' : ''}"><span>Долг</span><b>${money(Math.max(0, total - paid))}</b></div>
  </section>` : ''}
  <section class="card">
    <div class="card-h"><h3>Заказы</h3><button class="btn sm" id="cnew">${ic('plus')}Новый заказ</button></div>
    ${os.length ? `<div class="list">${os.sort((a, b) => b.created_at.localeCompare(a.created_at)).map(o => `
      <a class="row-it" href="#/order/${o.id}">${thumb(o, 'sm')}<span class="grow"><b>№${o.num} ${esc(o.title)}</b><small>${dmy(o.created_at)}${store.boss && o.price ? ' · ' + money(o.price) : ''}</small></span>${due(o)}${stagePill(o.stage)}</a>`).join('')}</div>` : '<p class="muted">Заказов пока нет.</p>'}
  </section>
  ${store.boss && !os.length ? '<p class="center"><button class="linkbtn dim" id="cdel">Удалить клиента</button></p>' : ''}`;
}

export function bind(root, r){
  if (r.name === 'client') {
    const c = store.get('clients', r.args[0]); if (!c) return;
    root.querySelector('#cedit').onclick = () => clientForm(c);
    root.querySelector('#cnew').onclick = () => newOrder({client_id: c.id});
    root.querySelector('#cdel')?.addEventListener('click', async () => {
      if (!(await confirmBox(`Удалить клиента «${c.name}»?`))) return;
      await store.remove('clients', c.id).catch(fail); location.hash = '#/clients'; toast('Клиент удалён');
    });
    return;
  }
  const inp = root.querySelector('#cq');
  inp.oninput = () => { q = inp.value; root.querySelector('#clist').innerHTML = list(); };
  root.querySelectorAll('[data-sort]').forEach(b => b.onclick = () => { sort = b.dataset.sort; dispatchEvent(new Event('crm:render')); });
  root.querySelector('#cadd').onclick = newClient;
}
