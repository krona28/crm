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

const uid = () => crypto.randomUUID ? crypto.randomUUID() : 'x' + Math.random().toString(36).slice(2) + Date.now().toString(36);
const key = t => t === 'settings' ? 'key' : 'id';

function notify(){ clearTimeout(notifyTimer); notifyTimer = setTimeout(() => subs.forEach(f => f()), 30); }
function put(t, row){
  const k = key(t), list = data[t], i = list.findIndex(r => r[k] === row[k]);
  if (i < 0) list.push(row); else list[i] = {...list[i], ...row};
}
function drop(t, id){ const k = key(t); data[t] = data[t].filter(r => r[k] !== id); }
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
    await Promise.all(TABLES.map(async t => {
      const {data: rows, error} = await sb.from(t).select('*').limit(10000);
      if (!error) data[t] = rows;
    }));
    notify();
  },
  listen(){
    sb.channel('crm').on('postgres_changes', {event: '*', schema: 'public'}, p => {
      if (!TABLES.includes(p.table)) return;
      if (p.eventType === 'DELETE') drop(p.table, p.old[key(p.table)]);
      else put(p.table, p.new);
      if (p.table === 'profiles' && p.new?.id === this.me?.id) Object.assign(this.me, p.new);
      notify();
    }).subscribe();
    // после сна телефона догружаем пропущенное
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.loadAll(); });
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
    const send = {...row}; if (t === 'orders') delete send.num;
    const {data: saved, error} = await sb.from(t).insert(send).select().single();
    if (error) { drop(t, row.id); notify(); throw error; }
    put(t, saved); notify();
    return saved;
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
    const {error} = await sb.from(t).update(patch).eq(key(t), id);
    if (error) { put(t, before); notify(); throw error; }
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
