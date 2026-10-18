// Склад древесины: что есть по породам, что отложено под заказы.
import {store} from '../store.js';
import {esc, ic, empty} from '../ui.js';
import {WOODS, money} from '../const.js';
import {materialForm} from './forms.js';

export const title = 'Склад';

export function render(){
  const ms = store.t('materials');
  const value = ms.reduce((s, m) => s + (+m.qty || 0) * (+m.cost || 0), 0);
  return `
  <div class="toolbar"><p class="muted">Доски, слэбы и щиты по породам. Отложенное под заказ видно и в карточке заказа.</p><span class="grow"></span><button class="btn sm" id="madd">${ic('plus')}Поступление</button></div>
  ${store.boss && ms.length ? `<section class="kpis three"><div class="kpi"><span>Позиций</span><b>${ms.length}</b></div><div class="kpi"><span>Стоимость склада</span><b>${money(value)}</b></div><div class="kpi"><span>Отложено под заказы</span><b>${ms.filter(m => m.reserved_for).length}</b></div></section>` : ''}
  ${ms.length ? Object.keys(WOODS).filter(k => ms.some(m => m.wood === k)).map(k => `
    <section class="card stock">
      <div class="stock-h" style="--tex:url(../img/wood/${k}.webp)"><h3>${esc(WOODS[k])}</h3><span>${ms.filter(m => m.wood === k).length} поз.</span></div>
      <div class="list">${ms.filter(m => m.wood === k).map(m => { const o = store.get('orders', m.reserved_for); return `
        <button class="row-it" data-m="${m.id}"><span class="grow"><b>${esc(m.form)} ${esc(m.dims)}</b><small>${esc([m.place, m.notes].filter(Boolean).join(' · '))}</small></span>
          ${o ? `<span class="pill st-work">под №${o.num}</span>` : ''}${store.boss && m.cost ? `<span class="muted small">${money(m.cost)}/${esc(m.unit)}</span>` : ''}<b class="qty ${+m.qty === 0 ? 'late-t' : ''}">${String(m.qty).replace('.', ',')} ${esc(m.unit)}</b></button>`; }).join('')}</div>
    </section>`).join('') : empty('Склад пуст', 'Добавьте первую поставку древесины.')}`;
}

export function bind(root){
  root.querySelector('#madd').onclick = () => materialForm();
  root.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) materialForm(store.get('materials', b.dataset.m)); });
}
