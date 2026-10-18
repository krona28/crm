// «Сегодня»: что горит, задачи, заявки с сайта, загрузка мастеров и лента событий.
import {store} from '../store.js';
import {esc, ic, avatar, thumb, due, cname, pname, stagePill, paidSum, empty, toast, fail} from '../ui.js';
import {isActive, inWork, stage, daysTo, daysSince, money, short, ago, dmy, today, plural, phoneNice} from '../const.js';
import {newOrder, taskForm} from './forms.js';

export const title = 'Сегодня';
let allTasks = false;

function attention(){
  const pre = store.settings.prepay / 100, out = [];
  for (const o of store.t('orders').filter(isActive)) {
    const d = daysTo(o.deadline), st = stage(o.stage), stuck = daysSince(o.stage_at);
    if (d != null && d < 0 && st.group !== 'sale') out.push([0, o, 'late', `Просрочен на ${-d} ${plural(-d, 'день', 'дня', 'дней')}`]);
    else if (d != null && d <= 3 && st.group !== 'sale') out.push([1, o, 'soon', d === 0 ? 'Сдать сегодня' : `Сдать через ${d} ${plural(d, 'день', 'дня', 'дней')}`]);
    if (store.boss && o.stage === 'agreed' && o.price && paidSum(o.id) < o.price * pre) out.push([2, o, 'pay', 'Ждём предоплату']);
    if (o.stage === 'approve' && stuck >= 2) out.push([2, o, 'wait', `Клиент молчит ${stuck} дн — напомнить про фото`]);
    if (st.group === 'work' && stuck >= 7) out.push([3, o, 'stuck', `${stuck} дн на этапе «${st.name}»`]);
    if (st.group === 'work' && !o.assignee_id) out.push([3, o, 'who', 'В цеху без мастера']);
    if (o.stage === 'lead' && daysSince(o.created_at) >= 1) out.push([2, o, 'lead', `Заявка без ответа ${daysSince(o.created_at)} дн`]);
  }
  return out.sort((a, b) => a[0] - b[0]);
}

export function render(){
  const me = store.me, os = store.t('orders'), active = os.filter(isActive);
  const mine = store.role === 'master' ? active.filter(o => o.assignee_id === me.id) : active;
  const week = mine.filter(o => o.deadline && daysTo(o.deadline) >= 0 && daysTo(o.deadline) <= 7 && stage(o.stage).group !== 'sale');
  const late = mine.filter(o => o.deadline && daysTo(o.deadline) < 0 && stage(o.stage).group !== 'sale');
  const work = mine.filter(inWork);
  const h = new Date().getHours();
  const hello = h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
  const d = new Date();

  // деньги
  let kpiMoney = '';
  if (store.boss) {
    const month = today().slice(0, 7);
    const got = store.t('payments').filter(p => p.paid_on?.startsWith(month)).reduce((s, p) => s + +p.amount, 0);
    const owed = active.filter(o => o.price && stage(o.stage).group !== 'sale').reduce((s, o) => s + Math.max(0, o.price - paidSum(o.id)), 0);
    const pipe = active.filter(o => stage(o.stage).group === 'sale').reduce((s, o) => s + (+o.price || 0), 0);
    kpiMoney = `
      <a class="kpi" href="#/money"><span>Получено в ${['январе','феврале','марте','апреле','мае','июне','июле','августе','сентябре','октябре','ноябре','декабре'][d.getMonth()]}</span><b>${short(got)}<small> ₽</small></b><i>по оплатам</i></a>
      <a class="kpi" href="#/money"><span>Ждём от клиентов</span><b>${short(owed)}<small> ₽</small></b><i>остатки по заказам в работе</i></a>
      <a class="kpi" href="#/orders"><span>В переговорах</span><b>${short(pipe)}<small> ₽</small></b><i>расчёты и предоплаты</i></a>`;
  }

  const tasks = store.t('tasks').filter(t => !t.done && (allTasks || t.assignee_id === me.id)).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
  const att = attention().filter(([, o]) => store.role !== 'master' || o.assignee_id === me.id);
  const inbox = store.t('inbox').filter(i => !i.handled).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const masters = store.t('profiles').filter(p => p.role === 'master' || (p.role === 'owner' && active.some(o => o.assignee_id === p.id && inWork(o))));
  const events = store.t('events').slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 12);

  return `
  <section class="hero">
    <div>
      <div class="eyebrow">${d.toLocaleDateString('ru-RU', {weekday: 'long', day: 'numeric', month: 'long'})}</div>
      <h2>${hello}, <em>${esc(me.name.split(' ')[0] === 'Андрей' ? me.name : me.name.split(' ')[0])}</em></h2>
      <p class="muted">${work.length ? `В цеху ${work.length} ${plural(work.length, 'заказ', 'заказа', 'заказов')}` : 'В цеху пока пусто'}${week.length ? `, на этой неделе сдаём ${week.length}` : ''}${late.length ? `. <span class="late-t">Просрочено: ${late.length}</span>` : '.'}</p>
    </div>
  </section>

  <section class="kpis">
    <a class="kpi" href="#/orders"><span>${store.role === 'master' ? 'Мои заказы в цеху' : 'В цеху'}</span><b>${work.length}</b><i>${short(mine.filter(o => stage(o.stage).group === 'sale').length)} в продаже</i></a>
    <a class="kpi ${late.length ? 'warn' : ''}" href="#/calendar"><span>Сдать за 7 дней</span><b>${week.length}</b><i>${late.length ? `и ${late.length} просрочено` : 'без просрочек'}</i></a>
    ${kpiMoney}
  </section>

  <div class="cols">
    <div class="col">
      ${inbox.length ? `<section class="card">
        <div class="card-h"><h3>${ic('inbox')}Новые заявки с сайта <span class="count">${inbox.length}</span></h3></div>
        <div class="list">${inbox.map(i => `
          <div class="lead">
            <div class="grow"><b>${esc(i.name || 'Без имени')}</b> · <a href="tel:${esc(i.phone)}">${esc(phoneNice(i.phone))}</a>
              <p>${esc([i.kind, i.model, i.wood !== 'Подскажите' ? i.wood : '', i.size, i.city].filter(Boolean).join(' · '))}</p>
              ${i.msg ? `<p class="muted">«${esc(i.msg)}»</p>` : ''}
              <small class="muted">${ago(i.created_at)}</small></div>
            <div class="lead-act"><button class="btn sm" data-take="${i.id}">В работу</button><button class="linkbtn dim" data-hide="${i.id}">Скрыть</button></div>
          </div>`).join('')}</div>
      </section>` : ''}

      <section class="card">
        <div class="card-h"><h3>${ic('flame')}Требует внимания</h3></div>
        ${att.length ? `<div class="list">${att.slice(0, 9).map(([, o, k, t]) => `
          <a class="row-it" href="#/order/${o.id}">${thumb(o, 'sm')}
            <span class="grow"><b>№${o.num} ${esc(o.title)}</b><small>${esc(cname(o.client_id))} · ${esc(stage(o.stage).name)}</small></span>
            <span class="flag f-${k}">${esc(t)}</span></a>`).join('')}</div>` : empty('Всё под контролем', 'Нет просрочек, зависших этапов и неотвеченных заявок.')}
      </section>

      <section class="card">
        <div class="card-h"><h3>${ic('check')}${allTasks ? 'Задачи команды' : 'Мои задачи'}</h3>
          <div class="row gap"><button class="linkbtn dim" id="tasks-all">${allTasks ? 'Только мои' : 'Все задачи'}</button><button class="icon-btn" id="task-add" aria-label="Добавить задачу">${ic('plus')}</button></div></div>
        ${tasks.length ? `<div class="list">${tasks.map(t => taskRow(t, allTasks)).join('')}</div>` : empty('Задач нет', 'Добавьте задачу кнопкой «+».')}
      </section>
    </div>

    <div class="col">
      <section class="card">
        <div class="card-h"><h3>${ic('team')}Загрузка цеха</h3></div>
        <div class="load">${masters.map(p => {
          const list = active.filter(o => o.assignee_id === p.id && inWork(o)).sort((a, b) => (a.deadline || '9').localeCompare(b.deadline || '9'));
          return `<div class="load-row">${avatar(p.id)}<div class="grow"><div class="row between"><b>${esc(p.name)}</b><span class="muted">${list.length} ${plural(list.length, 'заказ', 'заказа', 'заказов')}</span></div>
            <div class="meter"><i style="width:${Math.min(100, list.length * 25)}%"></i></div>
            <div class="load-items">${list.map(o => `<a href="#/order/${o.id}" title="№${o.num} ${esc(o.title)} — ${esc(stage(o.stage).name)}">${thumb(o, 'xs')}</a>`).join('')}</div></div></div>`;
        }).join('') || empty('Мастеров пока нет', 'Пригласите их в разделе «Команда».')}</div>
      </section>

      <section class="card">
        <div class="card-h"><h3>${ic('note')}Что происходит</h3></div>
        <div class="feed">${events.map(e => {
          const o = store.get('orders', e.order_id);
          return `<a class="ev" href="${o ? '#/order/' + o.id : '#/today'}">${avatar(e.author_id, 'sm')}<span><b>${esc(pname(e.author_id) || 'Система')}</b> ${o ? `· №${o.num} ${esc(o.title)}` : ''}<p>${esc(e.text)}</p><small>${ago(e.created_at)}</small></span></a>`;
        }).join('') || empty('Пока тихо')}</div>
      </section>
    </div>
  </div>`;
}

export function taskRow(t, showWho = true, showOrder = true){
  const o = showOrder && store.get('orders', t.order_id), d = daysTo(t.due);
  return `<div class="task ${t.done ? 'done' : ''}">
    <button class="tick" data-tick="${t.id}" aria-label="Отметить">${ic('check')}</button>
    <button class="grow task-t" data-task="${t.id}"><span>${esc(t.title)}</span>
      <small>${o ? `№${o.num} ${esc(o.title)} · ` : ''}${t.due ? `<span class="${d < 0 && !t.done ? 'late-t' : d === 0 ? 'gold' : ''}">${d === 0 ? 'сегодня' : d === 1 ? 'завтра' : d < 0 ? 'просрочено, ' + dmy(t.due) : dmy(t.due)}</span>` : ''}</small></button>
    ${showWho ? avatar(t.assignee_id, 'sm') : ''}
  </div>`;
}
export function bindTasks(root){
  root.addEventListener('click', e => {
    const tk = e.target.closest('[data-tick]');
    if (tk) {
      const t = store.get('tasks', tk.dataset.tick);
      store.update('tasks', t.id, {done: !t.done}).catch(fail);
      if (!t.done) toast('Готово', () => store.update('tasks', t.id, {done: false}));
    }
    const tt = e.target.closest('[data-task]');
    if (tt) taskForm(store.get('tasks', tt.dataset.task));
  });
}

export function bind(root){
  bindTasks(root);
  root.querySelector('#tasks-all').onclick = () => { allTasks = !allTasks; dispatchEvent(new Event('crm:render')); };
  root.querySelector('#task-add').onclick = () => taskForm();
  root.addEventListener('click', e => {
    const tk = e.target.closest('[data-take]');
    if (tk) {
      const i = store.get('inbox', tk.dataset.take);
      const cat = {'Зеркало':'mirror', 'Стол':'table', 'Дверь':'door', 'Кухня':'kitchen', 'Подоконник или откосы':'sill'}[i.kind] || 'other';
      const wood = {'Карагач':'karagach', 'Чёрный орех':'walnut', 'Дуб':'oak', 'Сосна':'pine', 'Клён':'maple'}[i.wood] || '';
      newOrder({inbox_id: i.id, name: i.name, phone: i.phone, city: i.city, cat, wood, size: i.size, source: 'Сайт',
        title: i.model || `${i.kind || 'Изделие'} по заявке с сайта`, notes: i.msg});
    }
    const hd = e.target.closest('[data-hide]');
    if (hd) { store.update('inbox', hd.dataset.hide, {handled: true}).catch(fail); toast('Заявка скрыта', () => store.update('inbox', hd.dataset.hide, {handled: false})); }
  });
}
