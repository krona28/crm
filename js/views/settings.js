// Настройки: процент предоплаты, шаблоны сообщений клиентам, выгрузка данных.
import {store} from '../store.js';
import {esc, attr, ic, toast, fail, confirmBox, cname, pname, paidSum} from '../ui.js';
import {DEFAULT_SETTINGS, CATS, WOODS, stage} from '../const.js';

export const title = 'Настройки';
const KEYS = ['имя', 'изделие', 'порода', 'размер', 'цена', 'срок', 'номер', 'предоплата', 'остаток', 'ссылка'];

export function render(){
  const s = store.settings;
  return `
  <section class="card">
    <div class="card-h"><h3>Условия</h3></div>
    <div class="fields">
      <label class="f"><span class="lbl">Предоплата, %</span><input id="prepay" inputmode="numeric" value="${s.prepay}"></label>
      <div class="f full muted small">Сроки по умолчанию: ${Object.values(CATS).map(c => `${c.name.toLowerCase()} — ${c.days} дн`).join(', ')}. Срок можно поменять в каждом заказе.</div>
    </div>
  </section>

  <section class="card">
    <div class="card-h"><h3>Шаблоны сообщений</h3><button class="btn sm" id="tadd">${ic('plus')}Шаблон</button></div>
    <p class="small muted">Подставляются сами: ${KEYS.map(k => `<code>{${k}}</code>`).join(' ')}</p>
    <div class="tpls">${s.templates.map((t, i) => `
      <div class="tpl-ed" data-i="${i}">
        <div class="row gap"><input class="tpl-name" value="${attr(t.name)}" aria-label="Название шаблона"><button class="icon-btn" data-tdel="${i}" aria-label="Удалить шаблон">${ic('trash')}</button></div>
        <textarea class="tpl-text" rows="3">${esc(t.text)}</textarea>
      </div>`).join('')}</div>
    <div class="row end"><button class="linkbtn dim" id="treset">Вернуть стандартные</button></div>
  </section>

  <section class="card">
    <div class="card-h"><h3>Данные</h3></div>
    <div class="row gap wrap">
      <button class="btn ghost sm" id="csv">${ic('download')}Заказы в Excel (CSV)</button>
      <button class="btn ghost sm" id="json">${ic('download')}Полная копия (JSON)</button>
      ${store.mode === 'demo' ? `<button class="btn ghost sm" id="reset">${ic('trash')}Сбросить демо-данные</button>` : ''}
    </div>
    <p class="small muted">${store.mode === 'cloud' ? 'Данные хранятся в облачной базе Supabase, копию стоит выгружать раз в месяц.' : 'Сейчас демо-режим: данные хранятся только в этом браузере.'}</p>
  </section>`;
}

const save = patch => store.saveSettings(patch).then(() => toast('Сохранено')).catch(fail);
const download = (name, text, type) => { const a = Object.assign(document.createElement('a'), {href: URL.createObjectURL(new Blob([text], {type})), download: name}); a.click(); };

export function bind(root){
  root.querySelector('#prepay').onchange = e => save({prepay: Math.min(100, Math.max(0, +e.target.value || 0))});
  const collect = () => [...root.querySelectorAll('.tpl-ed')].map((el, i) => ({id: store.settings.templates[i]?.id || 't' + Date.now(), name: el.querySelector('.tpl-name').value, text: el.querySelector('.tpl-text').value}));
  root.querySelector('.tpls').addEventListener('change', () => save({templates: collect()}));
  root.querySelector('#tadd').onclick = () => save({templates: [...store.settings.templates, {id: 't' + Date.now(), name: 'Новый шаблон', text: 'Здравствуйте, {имя}! '}]});
  root.addEventListener('click', async e => { const d = e.target.closest('[data-tdel]'); if (d && await confirmBox('Удалить шаблон?')) save({templates: store.settings.templates.filter((_, i) => i !== +d.dataset.tdel)}); });
  root.querySelector('#treset').onclick = async () => { if (await confirmBox('Вернуть стандартные шаблоны? Ваши правки пропадут.', 'Вернуть')) save({templates: DEFAULT_SETTINGS.templates}); };
  root.querySelector('#json').onclick = () => download(`krona-crm-${new Date().toISOString().slice(0, 10)}.json`, store.backup(), 'application/json');
  root.querySelector('#csv').onclick = () => {
    const head = ['№', 'Заказ', 'Клиент', 'Телефон', 'Изделие', 'Порода', 'Размер', 'Этап', 'Мастер', 'Срок', 'Цена', 'Оплачено', 'Источник', 'Создан'];
    const rows = store.t('orders').slice().sort((a, b) => a.num - b.num).map(o => [o.num, o.title, cname(o.client_id), store.get('clients', o.client_id)?.phone || '', CATS[o.cat]?.name, WOODS[o.wood] || '', o.size, stage(o.stage).name, pname(o.assignee_id), o.deadline || '', o.price || 0, paidSum(o.id), o.source, o.created_at.slice(0, 10)]);
    const csv = '﻿' + [head, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
    download(`krona-zakazy-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv');
  };
  root.querySelector('#reset')?.addEventListener('click', async () => { if (await confirmBox('Сбросить все демо-данные к исходным?', 'Сбросить')) store.resetDemo(); });
}
