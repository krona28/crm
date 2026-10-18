// Окна создания и правки: заказ, клиент, оплата, задача, материал, дизайнер.
import {store} from '../store.js';
import {$, $$, esc, attr, ic, modal, toast, fail, woodChip} from '../ui.js';
import {ITEMS, WOODS, CATS, SOURCES, PAY_KINDS, METHODS, STAGES, today, addDays, phoneDigits, phoneNice, money} from '../const.js';

const staffOptions = (sel, roles = ['owner', 'manager', 'master']) => `<option value="">— не назначен —</option>` +
  store.t('profiles').filter(p => roles.includes(p.role)).map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
const opts = (list, sel) => list.map(([v, t]) => `<option value="${attr(v)}" ${v === sel ? 'selected' : ''}>${esc(t)}</option>`).join('');
const designerOptions = sel => `<option value="">— без дизайнера —</option>` + store.t('designers').map(d => `<option value="${d.id}" ${d.id === sel ? 'selected' : ''}>${esc(d.name)}${d.studio ? ' · ' + esc(d.studio) : ''}</option>`).join('');
const num = v => Number(String(v || '').replace(/\s/g, '').replace(',', '.')) || 0;

// ── новый заказ ──
export function newOrder(pre = {}){
  const s = {cat: pre.cat || 'mirror', item_id: pre.item_id || '', wood: pre.wood || '', client_id: pre.client_id || ''};
  const c0 = store.get('clients', s.client_id);
  const m = modal(`
    <form class="form" id="nf">
      <div class="modal-head"><h2>Новый заказ</h2><button type="button" class="icon-btn" data-close aria-label="Закрыть">${ic('x')}</button></div>

      <div class="f full rel"><span class="lbl">Клиент</span>
        <input name="client_q" id="cq" placeholder="Имя или телефон — найдём или создадим" autocomplete="off" value="${attr(c0?.name || pre.name || '')}" ${c0 ? 'readonly' : 'autofocus'}>
        <div class="suggest" id="sug" hidden></div>
      </div>
      <div class="grid2" id="newc" ${c0 ? 'hidden' : ''}>
        <label class="f"><span class="lbl">Телефон</span><input name="phone" type="tel" inputmode="tel" value="${attr(pre.phone || '')}" placeholder="+7 …"></label>
        <label class="f"><span class="lbl">Город</span><input name="city" value="${attr(pre.city || '')}" placeholder="Благовещенск"></label>
      </div>

      <div class="f full"><span class="lbl">Что делаем</span><div class="chips" id="cats">${Object.entries(CATS).map(([k, c]) => `<button type="button" class="chip ${k === s.cat ? 'on' : ''}" data-cat="${k}">${c.name}</button>`).join('')}</div></div>
      <div class="f full" id="pick-wrap"><span class="lbl">Модель из коллекции <i class="muted">— или по эскизу, тогда пропустите</i></span><div class="picker" id="pick"></div></div>

      <label class="f full"><span class="lbl">Название заказа</span><input name="title" id="title-in" required value="${attr(pre.title || '')}" placeholder="Например, зеркало «Белла» чуть уже образца"></label>
      <div class="f full"><span class="lbl">Порода</span><div class="chips" id="woods">${Object.keys(WOODS).map(k => `<button type="button" class="chip wood-chip ${k === s.wood ? 'on' : ''}" data-wood="${k}">${woodChip(k)}</button>`).join('')}</div></div>

      <div class="grid3">
        <label class="f"><span class="lbl">Размер</span><input name="size" id="size-in" value="${attr(pre.size || '')}" placeholder="160 × 80 см"></label>
        ${store.boss ? `<label class="f"><span class="lbl">Цена, ₽</span><input name="price" inputmode="numeric" placeholder="0 — посчитаем позже"></label>` : ''}
        <label class="f"><span class="lbl">Срок сдачи</span><input name="deadline" id="dl" type="date" value="${addDays(today(), CATS[s.cat].days)}"></label>
      </div>
      <div class="grid3">
        <label class="f"><span class="lbl">Этап</span><select name="stage">${opts(STAGES.slice(0, 4).map(x => [x.id, x.name]), pre.stage || 'lead')}</select></label>
        <label class="f"><span class="lbl">Мастер</span><select name="assignee_id">${staffOptions('', ['owner', 'master'])}</select></label>
        <label class="f"><span class="lbl">Откуда пришёл</span><select name="source">${opts(SOURCES.map(x => [x, x]), pre.source || c0?.source || 'Instagram')}</select></label>
      </div>
      ${store.boss && store.t('designers').length ? `<label class="f full"><span class="lbl">Дизайнер-партнёр</span><select name="designer_id">${designerOptions(c0?.designer_id)}</select></label>` : ''}
      <label class="f full"><span class="lbl">Заметки</span><textarea name="notes" rows="2" placeholder="Пожелания по тону, покрытию, доставке">${esc(pre.notes || '')}</textarea></label>
      <div class="row end gap"><button type="button" class="btn ghost" data-close>Отмена</button><button class="btn">${ic('check')}Создать заказ</button></div>
    </form>`, {wide: true});
  const f = m.el.querySelector('#nf'), q = f.querySelector('#cq'), sug = f.querySelector('#sug');

  const drawPicker = () => {
    const list = ITEMS.filter(i => i.cat === s.cat);
    f.querySelector('#pick-wrap').hidden = !list.length;
    f.querySelector('#pick').innerHTML = list.map(i => `<button type="button" class="pk ${i.id === s.item_id ? 'on' : ''}" data-item="${i.id}"><img src="img/items/${i.id}.webp" alt=""><span>${esc(i.name)}</span></button>`).join('');
  };
  drawPicker();
  f.querySelector('#cats').onclick = e => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    s.cat = b.dataset.cat; s.item_id = '';
    $$('[data-cat]', f).forEach(x => x.classList.toggle('on', x === b));
    f.querySelector('#dl').value = addDays(today(), CATS[s.cat].days);
    drawPicker();
  };
  f.querySelector('#pick').onclick = e => {
    const b = e.target.closest('[data-item]'); if (!b) return;
    const it = ITEMS.find(i => i.id === b.dataset.item);
    s.item_id = s.item_id === it.id ? '' : it.id;
    if (s.item_id) {
      f.querySelector('#title-in').value = `${CATS[it.cat].name} «${it.name}»`;
      if (it.size && !f.querySelector('#size-in').value) f.querySelector('#size-in').value = it.size;
      if (it.w?.[0]) { s.wood = it.w[0]; $$('[data-wood]', f).forEach(x => x.classList.toggle('on', x.dataset.wood === s.wood)); }
    }
    drawPicker();
  };
  f.querySelector('#woods').onclick = e => {
    const b = e.target.closest('[data-wood]'); if (!b) return;
    s.wood = s.wood === b.dataset.wood ? '' : b.dataset.wood;
    $$('[data-wood]', f).forEach(x => x.classList.toggle('on', x.dataset.wood === s.wood));
  };
  // поиск клиента
  q.oninput = () => {
    s.client_id = ''; f.querySelector('#newc').hidden = false;
    const v = q.value.trim().toLowerCase(), d = v.replace(/\D/g, '');
    const hits = v.length < 2 ? [] : store.t('clients').filter(c => c.name.toLowerCase().includes(v) || (d.length > 3 && phoneDigits(c.phone).includes(d))).slice(0, 6);
    sug.hidden = !hits.length;
    sug.innerHTML = hits.map(c => `<button type="button" data-c="${c.id}"><b>${esc(c.name)}</b><small>${esc([phoneNice(c.phone), c.city].filter(Boolean).join(' · '))}</small></button>`).join('');
  };
  sug.onclick = e => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    const c = store.get('clients', b.dataset.c);
    s.client_id = c.id; q.value = c.name; sug.hidden = true; f.querySelector('#newc').hidden = true;
    if (c.source) f.elements.source.value = c.source;
    if (c.designer_id && f.elements.designer_id) f.elements.designer_id.value = c.designer_id;
  };
  f.onsubmit = async e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(f));
    try {
      let client_id = s.client_id;
      if (!client_id && v.client_q.trim()) {
        const c = await store.insert('clients', {name: v.client_q.trim(), phone: v.phone, city: v.city, source: v.source, designer_id: v.designer_id || null, address: '', notes: ''});
        client_id = c.id;
      }
      const o = await store.insert('orders', {
        title: v.title.trim(), client_id: client_id || null, designer_id: v.designer_id || null, item_id: s.item_id, cat: s.cat, wood: s.wood,
        size: v.size, finish: '', stage: v.stage, price: num(v.price), cost: 0, deadline: v.deadline || null,
        started: ['board'].includes(v.stage) ? today() : null, assignee_id: v.assignee_id || null, priority: false,
        delivery: '', source: v.source, notes: v.notes, pos: Date.now() / 1e10,
      });
      store.log(o.id, 'create', 'Заказ создан');
      m.close();
      toast(`Заказ №${o.num} создан`);
      location.hash = `#/order/${o.id}`;
    } catch (x) { fail(x); }
  };
}

// ── клиент ──
export function clientForm(c = {}, after){
  const m = modal(`
    <form class="form" id="cf">
      <div class="modal-head"><h2>${c.id ? 'Клиент' : 'Новый клиент'}</h2><button type="button" class="icon-btn" data-close>${ic('x')}</button></div>
      <label class="f full"><span class="lbl">Имя или название компании</span><input name="name" required value="${attr(c.name || '')}" autofocus></label>
      <div class="grid2">
        <label class="f"><span class="lbl">Телефон</span><input name="phone" type="tel" value="${attr(c.phone || '')}"></label>
        <label class="f"><span class="lbl">Город</span><input name="city" value="${attr(c.city || '')}"></label>
      </div>
      <label class="f full"><span class="lbl">Адрес доставки</span><input name="address" value="${attr(c.address || '')}"></label>
      <div class="grid2">
        <label class="f"><span class="lbl">Откуда пришёл</span><select name="source">${opts(SOURCES.map(x => [x, x]), c.source || 'Instagram')}</select></label>
        ${store.boss ? `<label class="f"><span class="lbl">Дизайнер</span><select name="designer_id">${designerOptions(c.designer_id)}</select></label>` : ''}
      </div>
      <label class="f full"><span class="lbl">Заметки</span><textarea name="notes" rows="3">${esc(c.notes || '')}</textarea></label>
      <div class="row end gap"><button type="button" class="btn ghost" data-close>Отмена</button><button class="btn">Сохранить</button></div>
    </form>`);
  m.el.querySelector('#cf').onsubmit = async e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    if ('designer_id' in v) v.designer_id = v.designer_id || null;
    try {
      const r = c.id ? (await store.update('clients', c.id, v), c) : await store.insert('clients', v);
      m.close(); after?.(r);
    } catch (x) { fail(x); }
  };
}

// ── оплата ──
export function paymentForm(o){
  const paid = store.t('payments').filter(p => p.order_id === o.id).reduce((s, p) => s + +p.amount, 0);
  const pre = Math.round(o.price * store.settings.prepay / 100), left = Math.max(0, o.price - paid);
  const sug = paid === 0 && pre ? ['prepay', pre] : ['final', left];
  const m = modal(`
    <form class="form" id="pf">
      <div class="modal-head"><h2>Оплата по заказу №${o.num}</h2><button type="button" class="icon-btn" data-close>${ic('x')}</button></div>
      ${o.price ? `<p class="muted">Цена ${money(o.price)} · оплачено ${money(paid)} · осталось <b class="gold">${money(left)}</b></p>` : '<p class="muted">У заказа ещё нет цены.</p>'}
      <div class="grid2">
        <label class="f"><span class="lbl">Сумма, ₽</span><input name="amount" inputmode="numeric" required value="${sug[1] || ''}" autofocus></label>
        <label class="f"><span class="lbl">Дата</span><input name="paid_on" type="date" value="${today()}"></label>
      </div>
      <div class="grid2">
        <label class="f"><span class="lbl">Что это</span><select name="kind">${opts(Object.entries(PAY_KINDS), sug[0])}</select></label>
        <label class="f"><span class="lbl">Способ</span><select name="method">${opts(METHODS.map(x => [x, x]), 'Перевод')}</select></label>
      </div>
      <label class="f full"><span class="lbl">Комментарий</span><input name="note"></label>
      <div class="row end gap"><button type="button" class="btn ghost" data-close>Отмена</button><button class="btn">${ic('ruble')}Записать оплату</button></div>
    </form>`);
  m.el.querySelector('#pf').onsubmit = async e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    v.amount = num(v.amount);
    if (!v.amount) return;
    try {
      await store.insert('payments', {...v, order_id: o.id});
      store.log(o.id, 'pay', `Оплата ${money(v.amount)} — ${PAY_KINDS[v.kind].toLowerCase()}`);
      m.close(); toast('Оплата записана');
      // получили предоплату на этапе «Предоплата» — предлагаем сразу запустить в цех
      if (o.stage === 'agreed' && paid + v.amount >= pre) toast('Предоплата получена — можно запускать в цех');
    } catch (x) { fail(x); }
  };
}

// ── задача ──
export function taskForm(t = {}, order_id = null){
  const m = modal(`
    <form class="form" id="tf">
      <div class="modal-head"><h2>${t.id ? 'Задача' : 'Новая задача'}</h2><button type="button" class="icon-btn" data-close>${ic('x')}</button></div>
      <label class="f full"><span class="lbl">Что сделать</span><input name="title" required value="${attr(t.title || '')}" autofocus placeholder="Например, позвонить и согласовать тон"></label>
      <div class="grid2">
        <label class="f"><span class="lbl">Кто</span><select name="assignee_id">${staffOptions(t.assignee_id || store.me.id)}</select></label>
        <label class="f"><span class="lbl">Когда</span><input name="due" type="date" value="${attr(t.due || today())}"></label>
      </div>
      ${order_id || t.order_id ? '' : `<label class="f full"><span class="lbl">По заказу</span><select name="order_id"><option value="">— общая задача —</option>${store.t('orders').filter(o => !['done', 'lost'].includes(o.stage)).sort((a, b) => b.num - a.num).map(o => `<option value="${o.id}">№${o.num} ${esc(o.title)}</option>`).join('')}</select></label>`}
      <div class="row end gap">${t.id ? '<button type="button" class="btn ghost danger-t" id="tdel">Удалить</button><span class="grow"></span>' : ''}<button type="button" class="btn ghost" data-close>Отмена</button><button class="btn">Сохранить</button></div>
    </form>`);
  m.el.querySelector('#tf').onsubmit = async e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    v.assignee_id ||= null; v.due ||= null;
    if ('order_id' in v) v.order_id ||= null; else v.order_id = t.order_id || order_id;
    try { t.id ? await store.update('tasks', t.id, v) : await store.insert('tasks', {...v, done: false}); m.close(); } catch (x) { fail(x); }
  };
  m.el.querySelector('#tdel')?.addEventListener('click', async () => { m.close(); await store.remove('tasks', t.id).catch(fail); toast('Задача удалена'); });
}

// ── материал на складе ──
export function materialForm(x = {}){
  const m = modal(`
    <form class="form" id="mf">
      <div class="modal-head"><h2>${x.id ? 'Материал' : 'Поступление на склад'}</h2><button type="button" class="icon-btn" data-close>${ic('x')}</button></div>
      <div class="f full"><span class="lbl">Порода</span><div class="chips" id="mw">${Object.keys(WOODS).map(k => `<button type="button" class="chip wood-chip ${k === (x.wood || 'karagach') ? 'on' : ''}" data-wood="${k}">${woodChip(k)}</button>`).join('')}</div></div>
      <div class="grid3">
        <label class="f"><span class="lbl">Вид</span><select name="form">${opts(['Доска', 'Слэб', 'Щит', 'Брус', 'Шпон', 'Другое'].map(v => [v, v]), x.form || 'Доска')}</select></label>
        <label class="f"><span class="lbl">Размер</span><input name="dims" value="${attr(x.dims || '')}" placeholder="2000 × 200 × 40 мм"></label>
        <label class="f"><span class="lbl">Место</span><input name="place" value="${attr(x.place || '')}" placeholder="Стеллаж 1"></label>
      </div>
      <div class="grid3">
        <label class="f"><span class="lbl">Количество</span><input name="qty" inputmode="decimal" value="${attr(x.qty ?? 1)}"></label>
        <label class="f"><span class="lbl">Единица</span><select name="unit">${opts(['шт', 'м³', 'м²', 'п.м'].map(v => [v, v]), x.unit || 'шт')}</select></label>
        ${store.boss ? `<label class="f"><span class="lbl">Цена за ед., ₽</span><input name="cost" inputmode="numeric" value="${attr(x.cost || '')}"></label>` : ''}
      </div>
      <label class="f full"><span class="lbl">Отложено под заказ</span><select name="reserved_for"><option value="">— свободно —</option>${store.t('orders').filter(o => !['done', 'lost'].includes(o.stage)).sort((a, b) => b.num - a.num).map(o => `<option value="${o.id}" ${o.id === x.reserved_for ? 'selected' : ''}>№${o.num} ${esc(o.title)}</option>`).join('')}</select></label>
      <label class="f full"><span class="lbl">Заметки</span><input name="notes" value="${attr(x.notes || '')}" placeholder="Влажность, сорт, особенности рисунка"></label>
      <div class="row end gap">${x.id ? '<button type="button" class="btn ghost danger-t" id="mdel">Списать</button><span class="grow"></span>' : ''}<button type="button" class="btn ghost" data-close>Отмена</button><button class="btn">Сохранить</button></div>
    </form>`);
  let wood = x.wood || 'karagach';
  m.el.querySelector('#mw').onclick = e => { const b = e.target.closest('[data-wood]'); if (!b) return; wood = b.dataset.wood; $$('[data-wood]', m.el).forEach(z => z.classList.toggle('on', z === b)); };
  m.el.querySelector('#mf').onsubmit = async e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    v.qty = num(v.qty); if ('cost' in v) v.cost = num(v.cost); v.reserved_for ||= null; v.wood = wood;
    try { x.id ? await store.update('materials', x.id, v) : await store.insert('materials', v); m.close(); } catch (z) { fail(z); }
  };
  m.el.querySelector('#mdel')?.addEventListener('click', async () => { m.close(); await store.remove('materials', x.id).catch(fail); toast('Списано со склада', () => store.insert('materials', x)); });
}

// ── дизайнер-партнёр ──
export function designerForm(d = {}){
  const m = modal(`
    <form class="form" id="df">
      <div class="modal-head"><h2>${d.id ? 'Дизайнер' : 'Новый партнёр'}</h2><button type="button" class="icon-btn" data-close>${ic('x')}</button></div>
      <div class="grid2">
        <label class="f"><span class="lbl">Имя</span><input name="name" required value="${attr(d.name || '')}" autofocus></label>
        <label class="f"><span class="lbl">Студия</span><input name="studio" value="${attr(d.studio || '')}"></label>
      </div>
      <div class="grid3">
        <label class="f"><span class="lbl">Город</span><input name="city" value="${attr(d.city || 'Владивосток')}"></label>
        <label class="f"><span class="lbl">Телефон</span><input name="phone" type="tel" value="${attr(d.phone || '')}"></label>
        <label class="f"><span class="lbl">Вознаграждение, %</span><input name="commission" inputmode="decimal" value="${attr(d.commission ?? 10)}"></label>
      </div>
      <label class="f full"><span class="lbl">Заметки</span><textarea name="notes" rows="3">${esc(d.notes || '')}</textarea></label>
      <div class="row end gap"><button type="button" class="btn ghost" data-close>Отмена</button><button class="btn">Сохранить</button></div>
    </form>`);
  m.el.querySelector('#df').onsubmit = async e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target)); v.commission = num(v.commission);
    try { d.id ? await store.update('designers', d.id, v) : await store.insert('designers', v); m.close(); } catch (x) { fail(x); }
  };
}
