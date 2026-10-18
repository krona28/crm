// Хранилище: Supabase (общая база команды) или демо-режим в браузере, если ключи не заданы.
// Все экраны работают только через этот модуль и держат данные в памяти: store.t('orders').
import {SUPABASE_URL, SUPABASE_KEY} from './config.js';
import {DEFAULT_SETTINGS} from './const.js';
import {seed} from './demo.js';

const TABLES = ['profiles', 'designers', 'clients', 'orders', 'payments', 'tasks', 'events', 'photos', 'materials', 'inbox', 'settings'];
const DEMO_KEY = 'krona-crm-demo-v2';
const data = Object.fromEntries(TABLES.map(t => [t, []]));
const subs = new Set();
const urlCache = new Map();
let sb = null, demo = null;
let notifyTimer = 0;
// цена и себестоимость лежат в отдельной таблице order_money (её видит только руководство);
// пока supabase/03-hardening.sql не выполнен, они остаются в самих заказах
let split = false;
const MONEY = ['price', 'cost'];
const pick = (o, keys) => Object.fromEntries(keys.filter(k => k in o).map(k => [k, o[k]]));
const omit = (o, keys) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

const uid = () => crypto.randomUUID ? crypto.randomUUID() : 'x' + Math.random().toString(36).slice(2) + Date.now().toString(36);
const key = t => t === 'settings' ? 'key' : 'id';

function notify(){ clearTimeout(notifyTimer); notifyTimer = setTimeout(() => subs.forEach(f => f()), 30); }
function put(t, row){
  const k = key(t), list = data[t], i = list.findIndex(r => r[k] === row[k]);
  if (i < 0) list.push(row); else list[i] = {...list[i], ...row};
}
function drop(t, id){ const k = key(t); data[t] = data[t].filter(r => r[k] !== id); }
// PostgREST отдаёт не больше 1000 строк за раз — читаем страницами
async function fetchAll(t){
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const {data: page, error} = await sb.from(t).select('*').order(key(t)).range(from, from + 999);
    if (error) throw error;
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}
function putMoney(m){ const o = data.orders.find(x => x.id === m.order_id); if (o) Object.assign(o, pick(m, MONEY)); }
async function saveMoney(order_id, patch){
  if (!store.boss || !Object.keys(patch).length) return;
  const o = data.orders.find(x => x.id === order_id) || {};
  const {error} = await sb.from('order_money').upsert({order_id, price: +o.price || 0, cost: +o.cost || 0, ...patch});
  if (error) throw error;
}
function saveDemo(){ try { localStorage.setItem(DEMO_KEY, JSON.stringify({data, me: demo.me})); } catch (e) { console.warn('Демо-данные не сохранились', e); } }

export const store = {
  // ?demo в адресе — посмотреть CRM на вымышленных данных, не трогая настоящую базу
  mode: SUPABASE_URL && SUPABASE_KEY && !new URLSearchParams(location.search).has('demo') ? 'cloud' : 'demo',
  me: null,
  error: '',
  get role(){ return this.me?.role || 'pending'; },
  get boss(){ return ['owner', 'manager'].includes(this.role); },
  get owner(){ return this.role === 'owner'; },

  t: name => data[name],
  get: (name, id) => id ? data[name].find(r => r[key(name)] === id) : null,
  subscribe(fn){ subs.add(fn); return () => subs.delete(fn); },

  get settings(){
    const s = data.settings.find(r => r.key === 'main')?.value || {};
    return {...DEFAULT_SETTINGS, ...s};
  },
  saveSettings(patch){
    const value = {...(data.settings.find(r => r.key === 'main')?.value || {}), ...patch};
    return this.upsertSettings(value);
  },

  // ── вход ──
  async init(){
    if (this.mode === 'demo') {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(DEMO_KEY) || 'null'); } catch (e) {}
      if (!saved) saved = {data: seed(), me: null};
      for (const t of TABLES) data[t] = saved.data[t] || [];
      demo = {me: saved.me || data.profiles.find(p => p.role === 'owner')?.id};
      this.me = data.profiles.find(p => p.id === demo.me);
      saveDemo();
      return 'ready';
    }
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {auth: {persistSession: true}});
    const {data: {session}} = await sb.auth.getSession();
    if (!session) return 'login';
    return this.afterLogin(session.user);
  },
  async afterLogin(user){
    const {data: me} = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
    this.me = me || {id: user.id, name: user.email, role: 'pending'};
    this.me.email = user.email;
    if (this.role === 'pending') return 'pending';
    await this.loadAll();
    this.listen();
    return 'ready';
  },
  async loadAll(){
    const fails = [];
    await Promise.all(TABLES.map(async t => {
      try { data[t] = await fetchAll(t); } catch (e) { console.warn(t, e); fails.push(t); }
    }));
    try {
      const money = await fetchAll('order_money');
      split = true;
      for (const o of data.orders) { o.price = 0; o.cost = 0; }
      money.forEach(putMoney);
    } catch (e) {
      // нет таблицы — база ещё старая; другая ошибка (сеть) — оставляем как было
      if (/order_money|PGRST205|42P01/.test(`${e.code} ${e.message}`)) split = false; else fails.push('order_money');
    }
    this.error = fails.length ? 'Часть данных не загрузилась. Проверьте интернет.' : '';
    this.lastLoad = Date.now();
    notify();
  },
  listen(){
    sb.channel('crm').on('postgres_changes', {event: '*', schema: 'public'}, p => {
      if (p.table === 'order_money') { if (p.eventType !== 'DELETE') { putMoney(p.new); notify(); } return; }
      if (!TABLES.includes(p.table)) return;
      if (p.table === 'orders' && p.eventType === 'INSERT' && !data.orders.some(o => o.id === p.new.id)) {
        if (split) Object.assign(p.new, {price: 0, cost: 0});
        if (p.new.stage === 'lead') dispatchEvent(new CustomEvent('crm:lead', {detail: p.new}));
      }
      if (p.eventType === 'DELETE') drop(p.table, p.old[key(p.table)]);
      else put(p.table, p.new);
      if (p.table === 'profiles' && p.new?.id === this.me?.id) Object.assign(this.me, p.new);
      notify();
    }).subscribe();
    // после сна телефона догружаем пропущенное (не чаще раза в минуту)
    document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - this.lastLoad > 6e4) this.loadAll(); });
    addEventListener('online', () => this.loadAll());
  },
  async signIn(email, password){
    const {data: r, error} = await sb.auth.signInWithPassword({email, password});
    if (error) throw error;
    return this.afterLogin(r.user);
  },
  async signUp(name, email, password){
    const {data: r, error} = await sb.auth.signUp({email, password, options: {data: {name}, emailRedirectTo: location.href.split('#')[0]}});
    if (error) throw error;
    if (!r.session) return 'confirm';
    return this.afterLogin(r.user);
  },
  async resetPassword(email){
    const {error} = await sb.auth.resetPasswordForEmail(email, {redirectTo: location.href.split('#')[0]});
    if (error) throw error;
  },
  async setPassword(password){ const {error} = await sb.auth.updateUser({password}); if (error) throw error; },
  async signOut(){
    if (sb) await sb.auth.signOut();
    location.hash = ''; location.reload();
  },
  onAuth(fn){ if (sb) sb.auth.onAuthStateChange(fn); },

  // в демо можно посмотреть CRM глазами любого сотрудника
  actAs(id){ demo.me = id; this.me = data.profiles.find(p => p.id === id); saveDemo(); notify(); },
  resetDemo(){ localStorage.removeItem(DEMO_KEY); location.reload(); },

  // ── запись ──
  async insert(t, row){
    row = {...row};
    if (t !== 'settings' && !row.id) row.id = uid();
    if (!row.created_at && t !== 'settings') row.created_at = new Date().toISOString();
    if (t === 'orders') {
      row.updated_at = row.stage_at = row.created_at;
      if (!row.num) row.num = Math.max(0, ...data.orders.map(o => o.num || 0)) + 1;
      if (demo && !row.token) row.token = (uid() + uid()).replace(/-/g, '');
    }
    if (['tasks', 'events'].includes(t)) row[t === 'tasks' ? 'created_by' : 'author_id'] ??= this.me?.id;
    put(t, row); notify();
    if (demo) { saveDemo(); return row; }
    let send = {...row}; if (t === 'orders') delete send.num;
    if (t === 'orders' && split) send = omit(send, MONEY);
    const {data: saved, error} = await sb.from(t).insert(send).select().single();
    if (error) { drop(t, row.id); notify(); throw error; }
    if (t === 'orders' && split) { Object.assign(saved, {price: +row.price || 0, cost: +row.cost || 0}); await saveMoney(saved.id, pick(row, MONEY)).catch(e => console.warn(e)); }
    put(t, saved); notify();
    return data[t].find(r => r[key(t)] === saved[key(t)]);
  },
  async update(t, id, patch){
    const old = this.get(t, id); if (!old) return;
    const before = {...old};
    patch = {...patch};
    if (t === 'orders') {
      patch.updated_at = new Date().toISOString();
      if (patch.stage && patch.stage !== old.stage) patch.stage_at = patch.updated_at;
    }
    put(t, {...old, ...patch}); notify();
    if (demo) { saveDemo(); return; }
    delete patch.updated_at; delete patch.stage_at;   // их ставит база
    try {
      if (t === 'orders' && split) {
        await saveMoney(id, pick(patch, MONEY));
        patch = omit(patch, MONEY);
        if (!Object.keys(patch).length) return;
      }
      const {error} = await sb.from(t).update(patch).eq(key(t), id);
      if (error) throw error;
    } catch (e) { put(t, before); notify(); throw e; }
  },
  async remove(t, id){
    const old = this.get(t, id);
    drop(t, id); notify();
    if (demo) {
      // каскад как в базе
      if (t === 'orders') for (const c of ['payments', 'tasks', 'events', 'photos']) data[c] = data[c].filter(r => r.order_id !== id);
      saveDemo(); return;
    }
    const {error} = await sb.from(t).delete().eq(key(t), id);
    if (error) { put(t, old); notify(); throw error; }
  },
  async upsertSettings(value){
    put('settings', {key: 'main', value}); notify();
    if (demo) { saveDemo(); return; }
    const {error} = await sb.from('settings').upsert({key: 'main', value});
    if (error) throw error;
  },
  log(order_id, type, text){ return this.insert('events', {order_id, type, text}).catch(() => {}); },

  // ── фото ──
  async upload(order_id, file, caption = ''){
    const blob = await shrink(file, demo ? 900 : 2000, demo ? .72 : .85);
    if (demo) {
      const path = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
      return this.insert('photos', {order_id, path, caption});
    }
    const path = `${order_id}/${uid()}.jpg`;
    const {error} = await sb.storage.from('photos').upload(path, blob, {contentType: 'image/jpeg'});
    if (error) throw error;
    return this.insert('photos', {order_id, path, caption});
  },
  async photoUrl(p){
    if (p.path.startsWith('data:') || p.path.startsWith('img/')) return p.path;
    if (urlCache.has(p.path)) return urlCache.get(p.path);
    const {data: r} = await sb.storage.from('photos').createSignedUrl(p.path, 3600 * 12);
    urlCache.set(p.path, r?.signedUrl || '');
    return r?.signedUrl || '';
  },
  async removePhoto(p){
    if (!demo && !p.path.startsWith('data:')) await sb.storage.from('photos').remove([p.path]);
    return this.remove('photos', p.id);
  },

  backup(){ return JSON.stringify({exported: new Date().toISOString(), data}, null, 1); },
};

// фото с телефона весят по 5–10 МБ: уменьшаем перед загрузкой
async function shrink(file, max, q){
  try {
    const bmp = await createImageBitmap(file, {imageOrientation: 'from-image'});
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = Object.assign(document.createElement('canvas'), {width: Math.round(bmp.width * k), height: Math.round(bmp.height * k)});
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(r, 'image/jpeg', q));
  } catch (e) { return file; }
}
