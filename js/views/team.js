// Команда: роли и доступ, приглашение новых сотрудников, кто чем занят.
import {store} from '../store.js';
import {esc, attr, ic, avatar, modal, toast, fail, confirmBox} from '../ui.js';
import {ROLES, COLORS, isActive, inWork} from '../const.js';

export const title = 'Команда';
const ABOUT = {owner: 'Видит и меняет всё, открывает доступ сотрудникам', manager: 'Заказы, клиенты, деньги и дизайнеры', master: 'Свои заказы, задачи, фото и склад — без денег'};

export function render(){
  const ps = store.t('profiles').slice().sort((a, b) => Object.keys(ROLES).indexOf(a.role) - Object.keys(ROLES).indexOf(b.role));
  const pend = ps.filter(p => p.role === 'pending');
  return `
  ${store.owner && pend.length ? `<section class="card warn-card"><div class="card-h"><h3>${ic('alert')}Ждут доступа</h3></div>
    <div class="list">${pend.map(p => `<div class="row-it">${avatar(p.id)}<span class="grow"><b>${esc(p.name)}</b><small>зарегистрировался и ждёт</small></span>
      <button class="btn sm" data-grant="${p.id}" data-role="master">Мастер</button><button class="btn ghost sm" data-grant="${p.id}" data-role="manager">Менеджер</button><button class="icon-btn" data-kick="${p.id}" aria-label="Отклонить">${ic('x')}</button></div>`).join('')}</div></section>` : ''}
  <div class="toolbar"><p class="muted">${store.mode === 'cloud' ? 'Новый сотрудник открывает CRM, нажимает «Я новый сотрудник» и регистрируется — потом руководитель выдаёт ему роль здесь.' : 'В демо-режиме можно добавить сотрудника и посмотреть CRM его глазами через «Смотреть как» вверху.'}</p>
    <span class="grow"></span>${store.mode === 'cloud' ? `<button class="btn sm" id="invite">${ic('copy')}Ссылка для сотрудника</button>` : store.owner ? `<button class="btn sm" id="padd">${ic('plus')}Сотрудник</button>` : ''}</div>
  <div class="team">${ps.filter(p => p.role !== 'pending').map(p => {
    const os = store.t('orders').filter(o => o.assignee_id === p.id && isActive(o));
    const ts = store.t('tasks').filter(t => t.assignee_id === p.id && !t.done);
    const editable = store.owner || p.id === store.me.id;
    return `<section class="card member">
      <div class="row gap">${avatar(p.id, 'xl')}<div class="grow"><b>${esc(p.name)}</b>${p.id === store.me.id ? ' <span class="muted small">— это вы</span>' : ''}<div class="muted small">${esc(ROLES[p.role])}</div></div>
        ${editable ? `<button class="linkbtn dim" data-edit="${p.id}">Изменить</button>` : ''}</div>
      <p class="small muted">${ABOUT[p.role] || ''}</p>
      <div class="p-stats"><div><span>В цеху</span><b>${os.filter(inWork).length}</b></div><div><span>Всего заказов</span><b>${os.length}</b></div><div><span>Задач</span><b>${ts.length}</b></div></div>
    </section>`; }).join('')}</div>`;
}

function editMember(p){
  const m = modal(`<form class="form" id="pf">
    <div class="modal-head"><h2>${p.id ? 'Сотрудник' : 'Новый сотрудник'}</h2><button type="button" class="icon-btn" data-close>${ic('x')}</button></div>
    <div class="grid2"><label class="f"><span class="lbl">Имя</span><input name="name" required value="${attr(p.name || '')}" autofocus></label>
      <label class="f"><span class="lbl">Телефон</span><input name="phone" type="tel" value="${attr(p.phone || '')}"></label></div>
    ${store.owner && p.id !== store.me.id ? `<label class="f full"><span class="lbl">Роль</span><select name="role">${['manager', 'master', 'owner'].map(r => `<option value="${r}" ${p.role === r ? 'selected' : ''}>${ROLES[r]} — ${ABOUT[r].toLowerCase()}</option>`).join('')}</select></label>` : ''}
    <div class="f full"><span class="lbl">Цвет</span><div class="chips">${COLORS.map(c => `<label class="swatch"><input type="radio" name="color" value="${c}" ${c === (p.color || COLORS[0]) ? 'checked' : ''}><i style="background:${c}"></i></label>`).join('')}</div></div>
    <div class="row end gap">${store.owner && p.id && p.id !== store.me.id ? '<button type="button" class="btn ghost danger-t" id="pdel">Закрыть доступ</button><span class="grow"></span>' : ''}<button type="button" class="btn ghost" data-close>Отмена</button><button class="btn">Сохранить</button></div>
  </form>`);
  m.el.querySelector('#pf').onsubmit = async e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    try {
      if (p.id) { await store.update('profiles', p.id, v); if (p.id === store.me.id) Object.assign(store.me, v); }
      else await store.insert('profiles', {...v, role: v.role || 'master'});
      m.close();
    } catch (x) { fail(x); }
  };
  m.el.querySelector('#pdel')?.addEventListener('click', async () => {
    if (!(await confirmBox(`Закрыть доступ для «${p.name}»? Его заказы и задачи останутся.`, 'Закрыть доступ'))) return;
    m.close(); store.update('profiles', p.id, {role: 'pending'}).catch(fail);
  });
}

export function bind(root){
  root.addEventListener('click', async e => {
    const ed = e.target.closest('[data-edit]'); if (ed) editMember(store.get('profiles', ed.dataset.edit));
    const g = e.target.closest('[data-grant]');
    if (g) { await store.update('profiles', g.dataset.grant, {role: g.dataset.role}).catch(fail); toast('Доступ открыт'); }
    const k = e.target.closest('[data-kick]');
    if (k && await confirmBox('Отклонить заявку на доступ?', 'Отклонить')) store.remove('profiles', k.dataset.kick).catch(fail);
  });
  root.querySelector('#padd')?.addEventListener('click', () => editMember({role: 'master'}));
  root.querySelector('#invite')?.addEventListener('click', async () => {
    const link = location.href.split('#')[0];
    try { await navigator.clipboard.writeText(link); toast('Ссылка скопирована — отправьте её сотруднику'); } catch (x) { toast(link); }
  });
}
