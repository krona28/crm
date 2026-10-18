// Дизайнеры-партнёры: кого привели, на какую сумму и сколько им причитается.
import {store} from '../store.js';
import {esc, ic, thumb, stagePill, empty} from '../ui.js';
import {isActive, money, phoneDigits, phoneNice, initials} from '../const.js';
import {designerForm} from './forms.js';

export const title = 'Дизайнеры';

export function render(){
  const rows = store.t('designers').map(d => {
    const os = store.t('orders').filter(o => o.designer_id === d.id && o.stage !== 'lost');
    const done = os.filter(o => o.stage === 'done'), act = os.filter(isActive);
    const fee = list => list.reduce((s, o) => s + (+o.price || 0) * (+d.commission || 0) / 100, 0);
    return {d, os, act, sum: os.reduce((s, o) => s + (+o.price || 0), 0), earned: fee(done), coming: fee(act)};
  }).sort((a, b) => b.sum - a.sum);
  const tot = rows.reduce((s, r) => s + r.sum, 0);
  return `
  <div class="toolbar"><p class="muted">Процент за каждого приведённого клиента. Заказы, где указан дизайнер, считаются здесь сами.</p><span class="grow"></span><button class="btn sm" id="dadd">${ic('plus')}Партнёр</button></div>
  ${rows.length ? `<section class="kpis three">
    <div class="kpi"><span>Партнёров</span><b>${rows.length}</b></div>
    <div class="kpi"><span>Заказы через дизайнеров</span><b>${money(tot)}</b></div>
    <div class="kpi"><span>Вознаграждение к выплате</span><b>${money(rows.reduce((s, r) => s + r.coming, 0))}</b><i>по заказам в работе</i></div>
  </section>
  <div class="partners">${rows.map(({d, os, act, sum, earned, coming}) => `
    <section class="card partner">
      <div class="row gap"><span class="av lg">${esc(initials(d.name))}</span><div class="grow"><b>${esc(d.name)}</b><div class="small muted">${esc([d.studio, d.city].filter(Boolean).join(' · '))}</div></div>
        <button class="linkbtn dim" data-edit="${d.id}">Изменить</button></div>
      <div class="p-stats"><div><span>Заказов</span><b>${os.length}</b></div><div><span>На сумму</span><b>${money(sum)}</b></div><div><span>Заработал</span><b>${money(earned)}</b></div><div><span>Ожидает</span><b class="gold">${money(coming)}</b></div></div>
      <div class="small muted">Вознаграждение ${d.commission}%${d.notes ? ' · ' + esc(d.notes) : ''}</div>
      ${act.length ? `<div class="list">${act.map(o => `<a class="row-it" href="#/order/${o.id}">${thumb(o, 'xs')}<span class="grow">№${o.num} ${esc(o.title)}</span>${stagePill(o.stage)}</a>`).join('')}</div>` : ''}
      ${d.phone ? `<div class="contact-btns"><a class="btn ghost sm" href="tel:+${phoneDigits(d.phone)}">${ic('phone')}${esc(phoneNice(d.phone))}</a><a class="btn ghost sm" href="https://wa.me/${phoneDigits(d.phone)}" target="_blank" rel="noopener">${ic('wa')}WhatsApp</a></div>` : ''}
    </section>`).join('')}</div>` : empty('Партнёров пока нет', 'Добавьте дизайнеров, с которыми работаете: CRM сама посчитает их заказы и вознаграждение.')}`;
}

export function bind(root){
  root.querySelector('#dadd').onclick = () => designerForm();
  root.addEventListener('click', e => { const b = e.target.closest('[data-edit]'); if (b) designerForm(store.get('designers', b.dataset.edit)); });
}
