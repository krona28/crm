// Календарь сроков: месяц сеткой на компьютере и списком по дням на телефоне.
import {store} from '../store.js';
import {esc, ic, thumb, cname, avatar} from '../ui.js';
import {stage, isActive, iso, today, MONTHS, dmy, daysTo} from '../const.js';
import {taskForm} from './forms.js';

export const title = 'Календарь';
let cur = today().slice(0, 7), mineOnly = false;

export function render(){
  const [y, m] = cur.split('-').map(Number);
  const first = new Date(y, m - 1, 1), start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  const days = Array.from({length: 42}, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return iso(d); });
  const me = store.me.id, master = store.role === 'master';
  const mine = o => !(mineOnly || master) || o.assignee_id === me;
  const orders = store.t('orders').filter(o => o.deadline && o.stage !== 'lost' && mine(o));
  const tasks = store.t('tasks').filter(t => t.due && !t.done && (!(mineOnly || master) || t.assignee_id === me));
  const by = d => ({os: orders.filter(o => o.deadline === d), ts: tasks.filter(t => t.due === d)});
  const t0 = today();
  const chip = o => `<a class="cal-o st-${stage(o.stage).group} ${isActive(o) && daysTo(o.deadline) < 0 ? 'late' : ''}" href="#/order/${o.id}" title="${esc(o.title)} — ${esc(stage(o.stage).name)}">${thumb(o, 'xxs')}<span>№${o.num} ${esc(o.title)}</span></a>`;
  const tchip = t => `<button class="cal-t" data-task="${t.id}">${ic('check')}<span>${esc(t.title)}</span></button>`;

  const agenda = days.filter(d => d.startsWith(cur)).map(d => ({d, ...by(d)})).filter(x => x.os.length || x.ts.length);
  return `
  <div class="toolbar">
    <div class="seg"><button id="prev" aria-label="Назад">${ic('back')}</button><button id="now">Сегодня</button><button id="next" aria-label="Вперёд">${ic('chevron')}</button></div>
    <h2 class="cal-title">${MONTHS[m - 1]} <span class="muted">${y}</span></h2>
    <span class="grow"></span>
    ${master ? '' : `<button class="chip ${mineOnly ? 'on' : ''}" id="mine">Только мои</button>`}
    <span class="legend"><i class="st-sale"></i>продажа <i class="st-work"></i>в цеху <i class="st-out"></i>сдача</span>
  </div>
  <div class="cal">
    ${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => `<div class="cal-dow">${d}</div>`).join('')}
    ${days.map(d => { const {os, ts} = by(d); return `<div class="cal-d ${d.startsWith(cur) ? '' : 'out'} ${d === t0 ? 'now' : ''} ${[5, 6].includes((new Date(d + 'T12:00').getDay() + 6) % 7) ? 'we' : ''}">
      <span class="cal-n">${+d.slice(8)}</span>${os.map(chip).join('')}${ts.map(tchip).join('')}</div>`; }).join('')}
  </div>
  <div class="agenda">${agenda.length ? agenda.map(x => `<div class="ag-day ${x.d === t0 ? 'now' : ''}"><h4>${dmy(x.d)}${x.d === t0 ? ' · сегодня' : ''}</h4>${x.os.map(chip).join('')}${x.ts.map(tchip).join('')}</div>`).join('') : '<p class="muted center">В этом месяце сроков нет.</p>'}</div>`;
}

export function bind(root){
  const shift = k => { const [y, m] = cur.split('-').map(Number); const d = new Date(y, m - 1 + k, 1); cur = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; dispatchEvent(new Event('crm:render')); };
  root.querySelector('#prev').onclick = () => shift(-1);
  root.querySelector('#next').onclick = () => shift(1);
  root.querySelector('#now').onclick = () => { cur = today().slice(0, 7); dispatchEvent(new Event('crm:render')); };
  root.querySelector('#mine')?.addEventListener('click', () => { mineOnly = !mineOnly; dispatchEvent(new Event('crm:render')); });
  root.addEventListener('click', e => { const t = e.target.closest('[data-task]'); if (t) taskForm(store.get('tasks', t.dataset.task)); });
}
