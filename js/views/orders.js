// Заказы: доска по этапам (перетаскивание мышью) и таблица с сортировкой.
import {store} from '../store.js';
import {esc, attr, ic, avatar, thumb, due, cname, stagePill, moneyLine, paidSum, woodChip, toast, fail, empty} from '../ui.js';
import {STAGES, GROUPS, CATS, stage, isActive, money, short, today, daysTo} from '../const.js';

export const title = 'Заказы';
const pref = (() => { try { return JSON.parse(localStorage.getItem('krona-crm-orders') || '{}'); } catch (e) { return {}; } })();
const f = {q: '', who: '', cat: '', view: pref.view || (innerWidth < 760 ? 'list' : 'board'), archive: false, sort: 'deadline', dir: 1};
const savePref = () => { try { localStorage.setItem('krona-crm-orders', JSON.stringify({view: f.view})); } catch (e) {} };

function filtered(){
  const q = f.q.trim().toLowerCase();
  return store.t('orders').filter(o =>
    (f.archive ? !isActive(o) : isActive(o)) &&
    (!f.who || (f.who === 'none' ? !o.assignee_id : o.assignee_id === f.who)) &&
    (!f.cat || o.cat === f.cat) &&
    (!q || `${o.num} ${o.title} ${cname(o.client_id)} ${o.size} ${o.notes}`.toLowerCase().includes(q)));
}

export function card(o){
  const tasks = store.t('tasks').filter(t => t.order_id === o.id && !t.done).length;
  const photos = store.t('photos').filter(p => p.order_id === o.id).length;
  return `<a class="ocard ${o.priority ? 'prio' : ''}" href="#/order/${o.id}" draggable="true" data-id="${o.id}">
    <div class="oc-top">${thumb(o)}<div class="grow">
      <div class="oc-num">№${o.num}${o.priority ? ` ${ic('star', 'star')}` : ''}</div>
      <b>${esc(o.title)}</b><small>${esc(cname(o.client_id))}</small></div></div>
    <div class="oc-meta">${woodChip(o.wood)}${moneyLine(o)}</div>
    <div class="oc-foot">${due(o)}<span class="grow"></span>
      ${tasks ? `<span class="mini" title="Открытые задачи">${ic('check')}${tasks}</span>` : ''}${photos ? `<span class="mini" title="Фото">${ic('camera')}${photos}</span>` : ''}
      ${avatar(o.assignee_id, 'sm')}</div>
  </a>`;
}

function board(list){
  const cols = (f.archive ? STAGES.slice(-2) : STAGES.slice(0, -2));
  let lastGroup = '';
  return `<div class="board-scroll"><div class="board">${cols.map(s => {
    const items = list.filter(o => o.stage === s.id).sort((a, b) => (b.priority - a.priority) || (a.deadline || '9').localeCompare(b.deadline || '9'));
    const sum = items.reduce((t, o) => t + (+o.price || 0), 0);
    const head = s.group !== lastGroup ? `<div class="grp g-${s.group}">${GROUPS[s.group]}</div>` : '<div class="grp"></div>';
    lastGroup = s.group;
    return `<div class="col-wrap">${head}<section class="bcol st-${s.group}" data-stage="${s.id}">
      <header><b>${esc(s.name)}</b><span>${items.length}${store.boss && sum ? ` · ${short(sum)} ₽` : ''}</span></header>
      <div class="bcol-list">${items.map(card).join('') || '<div class="drop-hint">Перетащите сюда</div>'}</div>
    </section></div>`;
  }).join('')}</div></div>`;
}

function table(list){
  const cols = [['num', '№'], ['title', 'Заказ'], ['client', 'Клиент'], ['stage', 'Этап'], ['who', 'Мастер'], ['deadline', 'Срок'], ...(store.boss ? [['price', 'Цена'], ['debt', 'Долг']] : [])];
  const val = (o, k) => ({num: o.num, title: o.title, client: cname(o.client_id), stage: STAGES.findIndex(s => s.id === o.stage), who: store.get('profiles', o.assignee_id)?.name || 'я',
    deadline: o.deadline || '9999', price: +o.price || 0, debt: (+o.price || 0) - paidSum(o.id)})[k];
  const rows = list.slice().sort((a, b) => { const x = val(a, f.sort), y = val(b, f.sort); return (x > y ? 1 : x < y ? -1 : 0) * f.dir; });
  return `<div class="table-wrap"><table class="tbl">
    <thead><tr>${cols.map(([k, t]) => `<th data-sort="${k}" class="${f.sort === k ? 'on' : ''} ${['price', 'debt'].includes(k) ? 'r' : ''}">${t}${f.sort === k ? (f.dir > 0 ? ' ↑' : ' ↓') : ''}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(o => { const debt = (+o.price || 0) - paidSum(o.id); return `<tr data-href="#/order/${o.id}">
      <td class="muted">${o.num}</td><td><div class="cell-o">${thumb(o, 'xs')}<b>${esc(o.title)}</b>${o.priority ? ic('star', 'star') : ''}</div></td>
      <td>${esc(cname(o.client_id))}</td><td>${stagePill(o.stage)}</td><td>${avatar(o.assignee_id, 'sm')}</td><td>${due(o)}</td>
      ${store.boss ? `<td class="r">${o.price ? money(o.price) : '<span class="muted">—</span>'}</td><td class="r ${debt > 0 ? 'gold' : 'muted'}">${o.price ? (debt > 0 ? money(debt) : 'оплачен') : ''}</td>` : ''}
    </tr>`; }).join('')}</tbody></table>${rows.length ? '' : empty('Ничего не нашлось', 'Попробуйте изменить фильтры.')}</div>`;
}

let seenRole = '';
export function render(){
  // мастер по умолчанию видит свои заказы
  if (seenRole !== store.role) { seenRole = store.role; f.who = store.role === 'master' ? store.me.id : ''; }
  const list = filtered();
  const staff = store.t('profiles').filter(p => p.role !== 'pending');
  return `
  <div class="toolbar">
    <label class="search-in">${ic('search')}<input id="oq" type="search" placeholder="Поиск по заказам" value="${attr(f.q)}"></label>
    <select id="ow" aria-label="Мастер"><option value="">Все мастера</option>${staff.map(p => `<option value="${p.id}" ${f.who === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}<option value="none" ${f.who === 'none' ? 'selected' : ''}>Без мастера</option></select>
    <select id="oc" aria-label="Категория"><option value="">Все изделия</option>${Object.entries(CATS).map(([k, c]) => `<option value="${k}" ${f.cat === k ? 'selected' : ''}>${c.name}</option>`).join('')}</select>
    <button class="chip ${f.archive ? 'on' : ''}" id="oa">Архив</button>
    <span class="grow"></span>
    <div class="seg"><button class="${f.view === 'board' ? 'on' : ''}" data-v="board">${ic('board')}Доска</button><button class="${f.view === 'list' ? 'on' : ''}" data-v="list">${ic('list')}Список</button></div>
  </div>
  <div id="olist">${f.view === 'board' ? board(list) : table(list)}</div>`;
}

export function bind(root){
  const set = (k, v) => { f[k] = v; dispatchEvent(new Event('crm:render')); };
  const q = root.querySelector('#oq');
  // поиск перерисовывает только список, чтобы поле не теряло фокус
  q.oninput = () => { f.q = q.value; root.querySelector('#olist').innerHTML = f.view === 'board' ? board(filtered()) : table(filtered()); };
  root.querySelector('#ow').onchange = e => set('who', e.target.value);
  root.querySelector('#oc').onchange = e => set('cat', e.target.value);
  root.querySelector('#oa').onclick = () => set('archive', !f.archive);
  root.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { f.view = b.dataset.v; savePref(); set('view', f.view); });
  root.addEventListener('click', e => {
    const th = e.target.closest('[data-sort]');
    if (th) { if (f.sort === th.dataset.sort) f.dir *= -1; else { f.sort = th.dataset.sort; f.dir = 1; } set('sort', f.sort); }
    const tr = e.target.closest('tr[data-href]');
    if (tr) location.hash = tr.dataset.href;
  });

  // перетаскивание карточек между этапами
  let dragId = null;
  root.addEventListener('dragstart', e => { const c = e.target.closest('.ocard'); if (!c) return; dragId = c.dataset.id; c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); });
  root.addEventListener('dragend', e => { e.target.closest('.ocard')?.classList.remove('dragging'); root.querySelectorAll('.bcol.over').forEach(c => c.classList.remove('over')); });
  root.addEventListener('dragover', e => { const col = e.target.closest('.bcol'); if (!col || !dragId) return; e.preventDefault(); root.querySelectorAll('.bcol.over').forEach(c => c !== col && c.classList.remove('over')); col.classList.add('over'); });
  root.addEventListener('drop', e => {
    const col = e.target.closest('.bcol'); if (!col || !dragId) return;
    e.preventDefault();
    moveStage(dragId, col.dataset.stage);
    dragId = null;
  });
}

// смена этапа с записью в историю и «Отменить»
export function moveStage(id, to){
  const o = store.get('orders', id); if (!o || o.stage === to) return;
  const from = o.stage, patch = {stage: to};
  if (stage(to).group === 'work' && !o.started) patch.started = today();
  store.update('orders', id, patch).then(() => store.log(id, 'stage', `Этап: ${stage(from).name} → ${stage(to).name}`)).catch(fail);
  toast(`№${o.num} → ${stage(to).name}`, () => store.update('orders', id, {stage: from}).catch(fail));
  if (to === 'board' && store.boss && o.price && paidSum(id) < o.price * store.settings.prepay / 100) setTimeout(() => toast('Внимание: предоплата ещё не получена'), 400);
}
