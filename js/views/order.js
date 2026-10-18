// Карточка заказа: этапы, детали с правкой на месте, клиент и сообщения, деньги, задачи, фото, история, бланк в цех.
import {store} from '../store.js';
import {$, $$, esc, attr, ic, avatar, thumb, due, pname, paidSum, woodChip, toast, fail, modal, confirmBox, empty, fillTemplate} from '../ui.js';
import {DEFAULT_SETTINGS, STAGES, GROUPS, CATS, WOODS, ITEMS, SOURCES, PAY_KINDS, stage, stageIdx, isActive, money, dmy, ago, daysTo, phoneDigits, phoneNice, item, today, plural} from '../const.js';
import {paymentForm, taskForm, clientForm} from './forms.js';
import {taskRow, bindTasks} from './today.js';
import {moveStage} from './orders.js';
import {CLIENT_PAGE} from '../config.js';

export const title = r => { const o = store.get('orders', r.args[0]); return o ? `Заказ №${o.num}` : 'Заказ'; };
const sel = (name, list, v) => `<select data-f="${name}">${list.map(([k, t]) => `<option value="${attr(k)}" ${String(k) === String(v ?? '') ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;

export function render({args: [id]}){
  const o = store.get('orders', id);
  if (!o) return empty('Заказ не найден', 'Возможно, его удалили.') + '<p class="center"><a class="btn ghost" href="#/orders">К заказам</a></p>';
  const c = store.get('clients', o.client_id);
  const it = item(o.item_id);
  const idx = stageIdx(o.stage), active = isActive(o);
  const next = active ? STAGES[idx + 1] : null;
  const pays = store.t('payments').filter(p => p.order_id === o.id).sort((a, b) => a.paid_on.localeCompare(b.paid_on));
  const paid = paidSum(o.id), left = Math.max(0, (+o.price || 0) - paid), pre = Math.round((+o.price || 0) * store.settings.prepay / 100);
  const tasks = store.t('tasks').filter(t => t.order_id === o.id).sort((a, b) => a.done - b.done || (a.due || '9').localeCompare(b.due || '9'));
  const photos = store.t('photos').filter(p => p.order_id === o.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const evs = store.t('events').filter(e => e.order_id === o.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const mats = store.t('materials').filter(m => m.reserved_for === o.id);
  const des = store.get('designers', o.designer_id);
  const staff = store.t('profiles').filter(p => p.role !== 'pending');
  const wa = phoneDigits(c?.phone);
  const tpl = store.settings.templates;

  return `
  <div class="o-head">
    <a class="back" href="#/orders">${ic('back')}Заказы</a>
    <div class="o-title">
      ${thumb(o, 'lg')}
      <div class="grow">
        <div class="eyebrow">Заказ №${o.num} · ${esc(CATS[o.cat]?.name || '')} · создан ${dmy(o.created_at)}</div>
        <input class="title-in" data-f="title" value="${attr(o.title)}" aria-label="Название заказа">
        <div class="row gap wrap">${due(o)}${woodChip(o.wood)}${o.size ? `<span class="muted">${esc(o.size)}</span>` : ''}</div>
      </div>
      <div class="o-actions">
        <button class="icon-btn ${o.priority ? 'on' : ''}" id="prio" title="${o.priority ? 'Снять срочность' : 'Срочный заказ'}">${ic('star')}</button>
        <button class="icon-btn" id="print" title="Бланк в цех">${ic('print')}</button>
        ${store.boss ? `<button class="icon-btn" id="del" title="Удалить заказ">${ic('trash')}</button>` : ''}
      </div>
    </div>
  </div>

  <section class="stepper">${STAGES.slice(0, -1).map((s, i) => `<button class="step ${i < idx && active ? 'past' : ''} ${s.id === o.stage ? 'cur' : ''} g-${s.group}" data-stage="${s.id}" title="${GROUPS[s.group]}"><i></i><span>${esc(s.name)}</span></button>`).join('')}</section>
  <div class="step-act">
    ${o.stage === 'lost' ? `<span class="pill st-closed">Отказ</span><button class="btn ghost sm" data-stage="lead">Вернуть в работу</button>` :
      o.stage === 'lead' ? `<button class="btn" data-stage="calc">${ic('check')}Подтвердить заявку</button>` :
      next && next.id !== 'lost' ? `<button class="btn" data-stage="${next.id}">${next.id === 'done' ? ic('check') + 'Заказ сдан' : 'Дальше: ' + esc(next.name)} ${next.id !== 'done' ? ic('chevron') : ''}</button>` :
      o.stage === 'done' ? `<span class="pill st-work">Сдан ${dmy(o.stage_at)}</span>` : ''}
    ${active && stage(o.stage).group === 'sale' ? `<button class="linkbtn dim" data-stage="lost">Клиент отказался</button>` : ''}
    <span class="muted small">${o.stage === 'lead' ? 'Созвонитесь с клиентом, уточните детали и подтвердите — он увидит это на странице заказа' : 'На этапе с ' + dmy(o.stage_at)}</span>
  </div>
  ${o.client_ok === true ? `<div class="client-said ok">${ic('check')}Клиент посмотрел фото: всё нравится, можно упаковывать</div>` : o.client_ok === false ? `<div class="client-said">${ic('alert')}Клиент задал вопрос по фото — смотрите историю ниже</div>` : ''}

  <div class="o-grid">
    <div class="col">
      <section class="card">
        <div class="card-h"><h3>Изделие</h3></div>
        <div class="fields">
          <label class="f"><span class="lbl">Что</span>${sel('cat', Object.entries(CATS).map(([k, v]) => [k, v.name]), o.cat)}</label>
          <label class="f"><span class="lbl">Модель из коллекции</span>${sel('item_id', [['', '— по эскизу —'], ...ITEMS.filter(i => i.cat === o.cat || i.id === o.item_id).map(i => [i.id, i.name])], o.item_id)}</label>
          <label class="f"><span class="lbl">Порода</span>${sel('wood', [['', '— не выбрана —'], ...Object.entries(WOODS)], o.wood)}</label>
          <label class="f"><span class="lbl">Размер</span><input data-f="size" value="${attr(o.size)}" placeholder="160 × 80 см"></label>
          <label class="f"><span class="lbl">Покрытие, тон</span><input data-f="finish" value="${attr(o.finish)}" placeholder="Лак полуматовый, без тонировки"></label>
          <label class="f"><span class="lbl">Срок сдачи</span><input type="date" data-f="deadline" value="${attr(o.deadline || '')}"></label>
          <label class="f"><span class="lbl">Мастер</span>${sel('assignee_id', [['', '— не назначен —'], ...staff.map(p => [p.id, p.name])], o.assignee_id)}</label>
          <label class="f"><span class="lbl">Откуда пришёл</span>${sel('source', SOURCES.map(s => [s, s]), o.source)}</label>
          ${store.boss ? `<label class="f"><span class="lbl">Дизайнер</span>${sel('designer_id', [['', '— без дизайнера —'], ...store.t('designers').map(d => [d.id, d.name])], o.designer_id)}</label>` : ''}
          <label class="f"><span class="lbl">Доставка и монтаж</span><input data-f="delivery" value="${attr(o.delivery)}" placeholder="ТК во Владивосток, монтаж наш"></label>
          <label class="f full"><span class="lbl">Пожелания клиента <i class="muted">— их видит клиент</i></span><textarea data-f="wishes" rows="2" placeholder="Что хочет клиент: форма, тон, где будет стоять">${esc(o.wishes || '')}</textarea></label>
          <label class="f full"><span class="lbl">Заметки для цеха <i class="muted">— клиент не видит</i></span><textarea data-f="notes" rows="3" placeholder="Всё, что важно мастеру: рисунок, тон, нюансы">${esc(o.notes)}</textarea></label>
        </div>
        ${it ? `<a class="site-link" href="https://krona28.github.io/collection/${it.id}/" target="_blank" rel="noopener">${ic('eye')}Образец «${esc(it.name)}» на сайте${it.size ? ` · ${esc(it.size)}` : ''}</a>` : ''}
      </section>

      <section class="card">
        <div class="card-h"><h3>${ic('camera')}Фото <span class="count">${photos.length || ''}</span></h3>
          <div class="row gap"><label class="btn ghost sm">${ic('camera')}Снять / добавить<input type="file" accept="image/*" multiple id="up" hidden></label></div></div>
        ${photos.length ? `<div class="photos">${photos.map(p => `<button class="ph" data-ph="${p.id}"><img data-src="${p.id}" alt="${attr(p.caption)}">${p.for_client ? `<span class="ph-client" title="Видит клиент">${ic('eye')}</span>` : ''}<small>${ago(p.created_at)}</small></button>`).join('')}</div>`
          : `<label class="drop">${ic('camera')}<b>Добавьте фото процесса</b><span>Подбор доски, заготовки, готовое изделие — клиенту можно будет отправить прямо отсюда.</span><input type="file" accept="image/*" multiple id="up2" hidden></label>`}
      </section>

      <section class="card">
        <div class="card-h"><h3>${ic('note')}История и комментарии</h3></div>
        <form class="comment" id="cmt"><textarea name="t" rows="1" placeholder="Комментарий: что сделано, что сказал клиент…"></textarea><button class="btn sm">Добавить</button></form>
        <div class="feed">${evs.map(e => `<div class="ev ev-${e.type}">${avatar(e.author_id, 'sm')}<span><b>${esc(e.type === 'client' ? 'Клиент' : pname(e.author_id) || 'Система')}</b><p>${esc(e.text.replace(/^Клиент: /, ''))}</p><small>${ago(e.created_at)}</small></span></div>`).join('')}</div>
      </section>
    </div>

    <div class="col">
      <section class="card client-card">
        <div class="card-h"><h3>Клиент</h3>${c ? `<a class="linkbtn dim" href="#/client/${c.id}">Карточка</a>` : '<button class="linkbtn" id="set-client">Указать</button>'}</div>
        ${c ? `<b class="cl-name">${esc(c.name)}</b>
          <div class="muted">${esc([phoneNice(c.phone), c.city].filter(Boolean).join(' · '))}</div>
          ${des ? `<div class="muted small">через дизайнера: ${esc(des.name)}${des.studio ? ', ' + esc(des.studio) : ''}</div>` : ''}
          <div class="contact-btns">
            ${c.phone ? `<a class="btn ghost sm" href="tel:+${wa}">${ic('phone')}Позвонить</a><a class="btn ghost sm" href="https://wa.me/${wa}" target="_blank" rel="noopener">${ic('wa')}WhatsApp</a>` : ''}
          </div>
          ${o.token ? `<div class="track"><span class="lbl">Страница заказа для клиента</span>
            <p class="small muted">Клиент видит по ссылке этапы, срок${store.boss ? ', цену и оплату' : ''} и фото с пометкой «видит клиент». Входить никуда не нужно.</p>
            <div class="row gap wrap"><a class="btn ghost sm" href="${CLIENT_PAGE + o.token}" target="_blank" rel="noopener">${ic('eye')}Открыть</a><button class="btn ghost sm" id="copy-track">${ic('copy')}Ссылка</button>${c.phone ? `<button class="btn ghost sm" data-tpl="track">${ic('wa')}Отправить</button>` : ''}</div></div>` : ''}
          ${c.phone ? `<div class="tpl"><span class="lbl">Написать по шаблону</span><div class="tpl-list">${tpl.map(t => `<button class="chip" data-tpl="${attr(t.id)}">${esc(t.name)}</button>`).join('')}</div></div>` : ''}` : '<p class="muted">Клиент не указан.</p>'}
      </section>

      ${store.boss ? `<section class="card">
        <div class="card-h"><h3>${ic('ruble')}Деньги</h3><button class="btn sm" id="pay">${ic('plus')}Оплата</button></div>
        <div class="money-top">
          <label class="f"><span class="lbl">Цена</span><input data-f="price" data-num inputmode="numeric" value="${o.price || ''}" placeholder="0"></label>
          <label class="f"><span class="lbl">Себестоимость</span><input data-f="cost" data-num inputmode="numeric" value="${o.cost || ''}" placeholder="материалы, работа"></label>
        </div>
        ${o.price ? `<div class="paybar"><i style="width:${Math.min(100, paid / o.price * 100)}%"></i><b style="left:${store.settings.prepay}%" title="Предоплата ${store.settings.prepay}%"></b></div>
          <div class="row between small"><span>Оплачено <b>${money(paid)}</b></span><span>${left ? `Осталось <b class="gold">${money(left)}</b>` : '<b class="ok">Оплачен полностью</b>'}</span></div>
          ${paid < pre ? `<p class="hint">${ic('alert')}Предоплата ${store.settings.prepay}% — ${money(pre)}${paid ? `, не хватает ${money(pre - paid)}` : ''}</p>` : ''}
          ${o.cost ? `<p class="small muted">Маржа ${money(o.price - o.cost - (des ? o.price * des.commission / 100 : 0))} (${Math.round((o.price - o.cost - (des ? o.price * des.commission / 100 : 0)) / o.price * 100)}%)${des ? ` с учётом ${des.commission}% дизайнеру` : ''}</p>` : des ? `<p class="small muted">Дизайнеру ${des.commission}% — ${money(o.price * des.commission / 100)}</p>` : ''}` : ''}
        ${pays.length ? `<div class="pays">${pays.map(p => `<div class="pay"><span>${dmy(p.paid_on)}</span><span class="grow">${esc(PAY_KINDS[p.kind] || p.kind)}${p.method ? ' · ' + esc(p.method) : ''}${p.note ? ' · ' + esc(p.note) : ''}</span><b>${money(p.amount)}</b><button class="icon-btn xs" data-unpay="${p.id}" aria-label="Удалить оплату">${ic('x')}</button></div>`).join('')}</div>` : ''}
      </section>` : ''}

      <section class="card">
        <div class="card-h"><h3>${ic('check')}Задачи</h3><button class="icon-btn" id="task-add" aria-label="Добавить задачу">${ic('plus')}</button></div>
        ${tasks.length ? `<div class="list">${tasks.map(t => taskRow(t, true, false)).join('')}</div>` : '<p class="muted small">Нет задач по заказу.</p>'}
      </section>

      ${mats.length ? `<section class="card"><div class="card-h"><h3>${ic('stock')}Отложено со склада</h3></div>
        <div class="list">${mats.map(m => `<a class="row-it" href="#/stock">${woodChip(m.wood)}<span class="grow">${esc(m.form)} ${esc(m.dims)}</span><b>${m.qty} ${esc(m.unit)}</b></a>`).join('')}</div></section>` : ''}
    </div>
  </div>

  <div class="print-sheet">
    <div class="ps-head"><img src="img/logo-full.webp" alt=""><div><h1>Заказ №${o.num}</h1><p>Бланк в цех · ${dmy(today())}</p></div></div>
    <h2>${esc(o.title)}</h2>
    ${it ? `<img class="ps-img" src="img/items/${it.id}.webp" alt="">` : ''}
    <table>
      <tr><th>Изделие</th><td>${esc(CATS[o.cat]?.name || '')}${it ? ` · модель «${esc(it.name)}»` : ' · по эскизу'}</td></tr>
      <tr><th>Порода</th><td>${esc(WOODS[o.wood] || '—')}</td></tr>
      <tr><th>Размер</th><td>${esc(o.size || '—')}</td></tr>
      <tr><th>Покрытие, тон</th><td>${esc(o.finish || '—')}</td></tr>
      <tr><th>Срок сдачи</th><td><b>${o.deadline ? dmy(o.deadline) : '—'}</b></td></tr>
      <tr><th>Мастер</th><td>${esc(pname(o.assignee_id) || '—')}</td></tr>
      <tr><th>Доставка</th><td>${esc(o.delivery || '—')}</td></tr>
    </table>
    <h3>Заметки</h3><p class="ps-notes">${esc(o.notes || ' ')}</p>
    <h3>Этапы</h3>
    <div class="ps-steps">${STAGES.filter(s => s.group === 'work' || s.id === 'approve').map(s => `<div><span>☐</span>${esc(s.name)}<i>дата, подпись</i></div>`).join('')}</div>
  </div>`;
}

export function bind(root, {args: [id]}){
  const o = store.get('orders', id); if (!o) return;
  bindTasks(root);
  const cur = root.querySelector('.step.cur'), sp = root.querySelector('.stepper');
  if (cur && sp.scrollWidth > sp.clientWidth) sp.scrollLeft = cur.offsetLeft - sp.offsetLeft - sp.clientWidth / 2 + cur.offsetWidth / 2;
  // правка полей на месте
  root.addEventListener('change', e => {
    const el = e.target.closest('[data-f]'); if (!el) return;
    let v = el.value;
    if (el.dataset.num !== undefined) v = Number(v.replace(/\s/g, '').replace(',', '.')) || 0;
    if (['assignee_id', 'designer_id', 'deadline'].includes(el.dataset.f)) v ||= null;
    const patch = {[el.dataset.f]: v};
    if (el.dataset.f === 'item_id' && v) { const it = item(v); if (it?.w?.[0] && !o.wood) patch.wood = it.w[0]; if (it?.size && !o.size) patch.size = it.size; }
    if (el.dataset.f === 'assignee_id') store.log(o.id, 'note', v ? `Назначен мастер: ${pname(v)}` : 'Мастер снят');
    if (el.dataset.f === 'price' && v !== o.price) store.log(o.id, 'note', `Цена: ${money(v)}`);
    if (el.dataset.f === 'deadline' && v !== o.deadline) store.log(o.id, 'note', `Срок сдачи: ${v ? dmy(v) : 'не задан'}`);
    store.update('orders', o.id, patch).catch(fail);
    el.classList.add('saved'); setTimeout(() => el.classList.remove('saved'), 900);
  });
  root.querySelector('.title-in').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });

  root.addEventListener('click', async e => {
    const st = e.target.closest('[data-stage]');
    if (st) {
      const to = st.dataset.stage;
      if (to === 'lost' && !(await confirmBox('Отметить, что клиент отказался?', 'Да, отказ'))) return;
      moveStage(o.id, to);
    }
    const tp = e.target.closest('[data-tpl]');
    if (tp) sendTemplate(store.get('orders', id), tp.dataset.tpl);
    const ph = e.target.closest('[data-ph]');
    if (ph) viewPhoto(store.get('photos', ph.dataset.ph));
    const up = e.target.closest('[data-unpay]');
    if (up && await confirmBox('Удалить эту оплату?')) {
      const p = store.get('payments', up.dataset.unpay);
      store.remove('payments', p.id).catch(fail);
      toast('Оплата удалена', () => store.insert('payments', p));
    }
  });
  root.querySelector('#copy-track')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(CLIENT_PAGE + o.token); toast('Ссылка для клиента скопирована'); } catch (x) { toast(CLIENT_PAGE + o.token); }
  });
  root.querySelector('#prio').onclick = () => store.update('orders', o.id, {priority: !o.priority}).catch(fail);
  root.querySelector('#print').onclick = () => print();
  root.querySelector('#pay')?.addEventListener('click', () => paymentForm(store.get('orders', id)));
  root.querySelector('#task-add').onclick = () => taskForm({}, o.id);
  root.querySelector('#set-client')?.addEventListener('click', () => clientForm({}, c => store.update('orders', o.id, {client_id: c.id})));
  root.querySelector('#del')?.addEventListener('click', async () => {
    if (!(await confirmBox(`Удалить заказ №${o.num} со всеми оплатами, задачами и фото?`))) return;
    await store.remove('orders', o.id).catch(fail);
    location.hash = '#/orders'; toast(`Заказ №${o.num} удалён`);
  });
  const cmt = root.querySelector('#cmt');
  cmt.t.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) cmt.requestSubmit(); });
  cmt.t.addEventListener('input', () => { cmt.t.style.height = 'auto'; cmt.t.style.height = cmt.t.scrollHeight + 'px'; });
  cmt.onsubmit = e => { e.preventDefault(); const t = cmt.t.value.trim(); if (!t) return; cmt.t.value = ''; cmt.t.blur(); store.log(o.id, 'note', t); };

  // фото
  const upload = async files => {
    const list = [...files]; if (!list.length) return;
    toast(`Загружаем ${list.length} фото…`);
    try { for (const f of list) await store.upload(o.id, f); store.log(o.id, 'photo', `Добавлено фото: ${list.length}`); toast('Фото добавлены'); } catch (x) { fail(x); }
  };
  for (const inp of root.querySelectorAll('#up, #up2')) inp.onchange = () => upload(inp.files);
  root.querySelectorAll('img[data-src]').forEach(async img => { img.src = await store.photoUrl(store.get('photos', img.dataset.src)); });
}

function sendTemplate(o, tid){
  const t = store.settings.templates.find(x => x.id === tid) || DEFAULT_SETTINGS.templates.find(x => x.id === tid); if (!t) return;
  const c = store.get('clients', o.client_id);
  const m = modal(`<div class="form">
    <div class="modal-head"><h2>${esc(t.name)}</h2><button type="button" class="icon-btn" data-close>${ic('x')}</button></div>
    <p class="muted">Проверьте текст — его можно поправить перед отправкой.</p>
    <textarea id="msg" rows="7">${esc(fillTemplate(t.text, o))}</textarea>
    <div class="row end gap"><button class="btn ghost" id="copy">${ic('copy')}Скопировать</button><a class="btn" id="send" target="_blank" rel="noopener">${ic('wa')}Открыть WhatsApp</a></div>
  </div>`);
  const msg = m.el.querySelector('#msg'), send = m.el.querySelector('#send');
  const upd = () => send.href = `https://wa.me/${phoneDigits(c.phone)}?text=${encodeURIComponent(msg.value)}`;
  msg.oninput = upd; upd();
  send.onclick = () => { store.log(o.id, 'msg', `Отправлено сообщение «${t.name}»`); m.close(); };
  m.el.querySelector('#copy').onclick = async () => { try { await navigator.clipboard.writeText(msg.value); toast('Скопировано'); } catch (e) { msg.select(); } };
}

async function viewPhoto(p){
  const url = await store.photoUrl(p);
  const m = modal(`<div class="photo-view"><img src="${attr(url)}" alt="">
    <div class="row between gap wrap"><label class="switch"><input type="checkbox" id="for-client" ${p.for_client ? 'checked' : ''}><i></i>Показать клиенту на странице заказа</label><div class="row gap">
      <button class="btn ghost sm" id="del-ph">${ic('trash')}Удалить</button>
      <button class="btn sm" id="share">${ic('share')}Отправить клиенту</button></div></div></div>`, {wide: true});
  m.el.querySelector('#share').onclick = async () => {
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `krona-${p.id.slice(0, 6)}.jpg`, {type: 'image/jpeg'});
      if (navigator.canShare?.({files: [file]})) await navigator.share({files: [file], title: 'Мастерская «Крона»'});
      else { const a = Object.assign(document.createElement('a'), {href: URL.createObjectURL(blob), download: file.name}); a.click(); toast('Фото скачано — отправьте его в мессенджере'); }
    } catch (e) { if (e.name !== 'AbortError') fail(e); }
  };
  m.el.querySelector('#for-client').onchange = e => {
    store.update('photos', p.id, {for_client: e.target.checked}).catch(fail);
    toast(e.target.checked ? 'Клиент увидит это фото' : 'Фото скрыто от клиента');
  };
  m.el.querySelector('#del-ph').onclick = async () => { if (await confirmBox('Удалить фото?')) { m.close(); store.removePhoto(p).catch(fail); } };
}
