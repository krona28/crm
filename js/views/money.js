// Деньги и аналитика (только руководителю и менеджеру): поступления, долги, средний чек, откуда приходят клиенты.
import {store} from '../store.js';
import {esc, ic, thumb, cname, paidSum, stagePill, empty} from '../ui.js';
import {CATS, WOODS, PAY_KINDS, MON, MONTHS, isActive, money, short, dmy, today, daysTo, plural} from '../const.js';

export const title = 'Деньги';

function months(n){
  const out = [], d = new Date(); d.setDate(1);
  for (let i = n - 1; i >= 0; i--) { const z = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(`${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}`); }
  return out;
}

// столбики по месяцам: одна серия, подписи значений при наведении
function barChart(rows){
  const W = 720, H = 220, pad = {l: 8, r: 8, t: 16, b: 28};
  const max = Math.max(1, ...rows.map(r => r.v));
  const step = (W - pad.l - pad.r) / rows.length, bw = Math.min(38, step * .62);
  const y = v => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = [0, .5, 1].map(k => max * k);
  return `<div class="chart" data-chart>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Поступления по месяцам">
      ${ticks.map(t => `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/>`).join('')}
      ${rows.map((r, i) => { const x = pad.l + step * i + (step - bw) / 2, top = y(r.v), h = H - pad.b - top;
        return `<g class="bar ${r.cur ? 'cur' : ''}" data-tip="${esc(r.tip)}">
          <rect class="hit" x="${pad.l + step * i}" y="${pad.t}" width="${step}" height="${H - pad.t - pad.b}"/>
          ${h > 0 ? `<path d="M${x},${H - pad.b} V${top + Math.min(4, h)} q0,-4 4,-4 h${bw - 8} q4,0 4,4 V${H - pad.b} Z"/>` : ''}
          <text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${r.label}</text></g>`; }).join('')}
    </svg>
    <div class="ticks">${ticks.reverse().map(t => `<span>${short(t)}</span>`).join('')}</div>
    <div class="tip" hidden></div>
  </div>`;
}
const hbars = (rows, fmt = money) => { const max = Math.max(1, ...rows.map(r => r.v)); return `<div class="hbars">${rows.map(r => `
  <div class="hb"><span class="hb-l">${r.icon || ''}${esc(r.label)}</span><span class="hb-t"><i style="width:${Math.max(1.5, r.v / max * 100)}%"></i></span><b>${fmt(r.v)}</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</div>`).join('')}</div>`; };

export function render(){
  const os = store.t('orders'), pays = store.t('payments');
  const ms = months(12), t0 = today();
  const byMonth = ms.map(m => ({m, v: pays.filter(p => p.paid_on?.startsWith(m)).reduce((s, p) => s + +p.amount, 0)}));
  const year = byMonth.reduce((s, r) => s + r.v, 0);
  const since = ms[0] + '-01';
  const done = os.filter(o => o.stage === 'done' && o.stage_at.slice(0, 10) >= since);
  const lost = os.filter(o => o.stage === 'lost' && o.stage_at.slice(0, 10) >= since);
  const avg = done.length ? done.reduce((s, o) => s + (+o.price || 0), 0) / done.length : 0;
  const cycle = done.filter(o => o.started).map(o => Math.max(1, Math.round((new Date(o.stage_at) - new Date(o.started + 'T12:00')) / 864e5)));
  const avgCycle = cycle.length ? Math.round(cycle.reduce((a, b) => a + b, 0) / cycle.length) : 0;
  const conv = done.length + lost.length ? Math.round(done.length / (done.length + lost.length) * 100) : 0;
  const owed = os.filter(o => isActive(o) && o.price && !['lead', 'calc'].includes(o.stage)).map(o => ({o, left: o.price - paidSum(o.id)})).filter(x => x.left > 0).sort((a, b) => (a.o.deadline || '9').localeCompare(b.o.deadline || '9'));
  const prevYear = (() => { const ms2 = months(24).slice(0, 12); return pays.filter(p => p.paid_on >= ms2[0] && p.paid_on < since).reduce((s, p) => s + +p.amount, 0); })();
  const sumBy = (key, names) => Object.entries(done.reduce((acc, o) => { const k = o[key] || 'other'; acc[k] = (acc[k] || 0) + (+o.price || 0); return acc; }, {}))
    .map(([k, v]) => ({label: names(k), v, sub: `${done.filter(o => (o[key] || 'other') === k).length} шт`})).sort((a, b) => b.v - a.v);
  const src = Object.entries(os.filter(o => o.created_at.slice(0, 10) >= since).reduce((acc, o) => { const k = o.source || 'Не указан'; acc[k] = acc[k] || {n: 0, won: 0}; acc[k].n++; if (o.stage === 'done') acc[k].won++; return acc; }, {}))
    .map(([k, v]) => ({label: k, v: v.n, sub: `сдано ${v.won}`})).sort((a, b) => b.v - a.v);
  const recent = pays.slice().sort((a, b) => b.paid_on.localeCompare(a.paid_on) || b.created_at.localeCompare(a.created_at)).slice(0, 10);

  return `
  <section class="kpis">
    <div class="kpi"><span>Поступления за 12 месяцев</span><b>${short(year)}<small> ₽</small></b><i>${prevYear > year * .25 ? `${year >= prevYear ? '+' : '−'}${Math.abs(Math.round((year / prevYear - 1) * 100))}% к прошлым 12 мес.` : 'по всем оплатам'}</i></div>
    <div class="kpi"><span>Средний чек</span><b>${short(avg)}<small> ₽</small></b><i>${done.length} ${plural(done.length, 'заказ сдан', 'заказа сдано', 'заказов сдано')}</i></div>
    <div class="kpi"><span>Изготовление</span><b>${avgCycle}<small> дн</small></b><i>в среднем от старта до сдачи</i></div>
    <div class="kpi"><span>Доходят до сдачи</span><b>${conv}<small>%</small></b><i>${lost.length} ${plural(lost.length, 'отказ', 'отказа', 'отказов')}</i></div>
  </section>

  <section class="card">
    <div class="card-h"><h3>Поступления по месяцам</h3><span class="muted small">предоплаты и остатки</span></div>
    ${barChart(byMonth.map(r => { const [y, m] = r.m.split('-').map(Number); return {v: r.v, label: MON[m - 1], cur: r.m === t0.slice(0, 7), tip: `${MONTHS[m - 1]} ${y}: ${money(r.v)}`}; }))}
    <details class="tbl-details"><summary>Таблицей</summary><table class="tbl">${byMonth.map(r => { const [y, m] = r.m.split('-').map(Number); return `<tr><td>${MONTHS[m - 1]} ${y}</td><td class="r">${money(r.v)}</td></tr>`; }).join('')}</table></details>
  </section>

  <div class="cols">
    <div class="col">
      <section class="card">
        <div class="card-h"><h3>${ic('alert')}Ждём оплату</h3><b class="gold">${money(owed.reduce((s, x) => s + x.left, 0))}</b></div>
        ${owed.length ? `<div class="list">${owed.map(({o, left}) => `<a class="row-it" href="#/order/${o.id}">${thumb(o, 'xs')}<span class="grow"><b>№${o.num} ${esc(o.title)}</b><small>${esc(cname(o.client_id))}${o.deadline ? ' · срок ' + dmy(o.deadline) : ''}</small></span>${stagePill(o.stage)}<b class="r">${money(left)}</b></a>`).join('')}</div>` : empty('Долгов нет')}
      </section>
      <section class="card">
        <div class="card-h"><h3>Последние оплаты</h3></div>
        ${recent.length ? `<div class="pays">${recent.map(p => { const o = store.get('orders', p.order_id); return `<a class="pay" href="${o ? '#/order/' + o.id : '#/money'}"><span>${dmy(p.paid_on)}</span><span class="grow">${o ? `№${o.num} ${esc(o.title)}` : ''} <small class="muted">${esc(PAY_KINDS[p.kind] || '')}</small></span><b>${money(p.amount)}</b></a>`; }).join('')}</div>` : empty('Оплат пока нет')}
      </section>
    </div>
    <div class="col">
      <section class="card"><div class="card-h"><h3>Что продаём</h3><span class="muted small">сданные за 12 мес.</span></div>${hbars(sumBy('cat', k => CATS[k]?.name || 'Другое'))}</section>
      <section class="card"><div class="card-h"><h3>Породы</h3></div>${hbars(sumBy('wood', k => WOODS[k] || 'Не указана'))}</section>
      <section class="card"><div class="card-h"><h3>Откуда приходят</h3><span class="muted small">заказов за 12 мес.</span></div>${hbars(src, v => v)}</section>
    </div>
  </div>`;
}

export function bind(root){
  // всплывающая подсказка над столбиком
  root.querySelectorAll('[data-chart]').forEach(ch => {
    const tip = ch.querySelector('.tip');
    ch.addEventListener('pointermove', e => {
      const g = e.target.closest('[data-tip]');
      ch.querySelectorAll('.bar.hover').forEach(b => b !== g && b.classList.remove('hover'));
      if (!g) { tip.hidden = true; return; }
      g.classList.add('hover');
      const r = ch.getBoundingClientRect(), br = g.getBoundingClientRect();
      tip.textContent = g.dataset.tip; tip.hidden = false;
      tip.style.left = Math.min(r.width - tip.offsetWidth, Math.max(0, br.left - r.left + br.width / 2 - tip.offsetWidth / 2)) + 'px';
    });
    ch.addEventListener('pointerleave', () => { tip.hidden = true; ch.querySelectorAll('.bar.hover').forEach(b => b.classList.remove('hover')); });
  });
}
