// Демо-данные: правдоподобная мастерская за последний год, чтобы показать CRM до подключения базы.
// Даты считаются от сегодняшнего дня, поэтому демо всегда «живое».
import {today, addDays} from './const.js';

export function seed(){
  let n = 0;
  const id = p => `${p}-${++n}`;
  const t0 = today();
  const at = (days, h = 11) => { const d = new Date(addDays(t0, days) + 'T00:00'); d.setHours(h, (n * 17) % 60); return d.toISOString(); };

  const profiles = [
    {id:'u-andrey', name:'Андрей Владимирович', phone:'+79682462464', role:'owner', color:'#c9a66b'},
    {id:'u-olga', name:'Ольга', phone:'', role:'manager', color:'#8fb3a5'},
    {id:'u-sergey', name:'Сергей', phone:'', role:'master', color:'#c98d6b'},
    {id:'u-dmitry', name:'Дмитрий', phone:'', role:'master', color:'#7fa3c9'},
    {id:'u-ivan', name:'Иван', phone:'', role:'master', color:'#a59bc9'},
  ].map(p => ({...p, created_at: at(-400)}));

  const designers = [
    {id:'d-1', name:'Мария Ковалёва', studio:'Студия «Линия»', city:'Владивосток', phone:'+79140000001', commission:10, notes:'Премиальные квартиры на Эгершельде. Любит карагач.'},
    {id:'d-2', name:'Артём Ли', studio:'Бюро «Север»', city:'Владивосток', phone:'+79140000002', commission:12, notes:'Коммерческие интерьеры: кафе, салоны.'},
    {id:'d-3', name:'Елена Широкова', studio:'Частный дизайнер', city:'Благовещенск', phone:'+79140000003', commission:10, notes:''},
  ].map(d => ({...d, created_at: at(-300)}));

  const C = [
    ['Наталья Морозова','+79246710011','Благовещенск','Instagram'], ['Игорь Савченко','+79145520312','Благовещенск','Рекомендация'],
    ['Кафе «Терраса»','+79098101220','Благовещенск','Телефон'], ['Анна и Павел Ким','+79242299310','Владивосток','Дизайнер','d-1'],
    ['Виктор Ерёмин','+79622850044','Благовещенск','Сайт'], ['Светлана Тихонова','+79140081176','Хабаровск','Instagram'],
    ['Олег Буров','+79246609015','Благовещенск','Повторный'], ['Ирина Чжан','+79241113367','Владивосток','Дизайнер','d-2'],
    ['Дмитрий Полищук','+79145071890','Белогорск','WhatsApp'], ['Юлия Абрамова','+79098223401','Благовещенск','Сайт'],
    ['Салон «Шёлк»','+79622290111','Владивосток','Дизайнер','d-2'], ['Ксения Белова','+79140502233','Благовещенск','Выставка'],
    ['Роман Гаврилов','+79246633908','Свободный','Instagram'], ['Татьяна Лаврова','+79145574412','Благовещенск','Рекомендация','d-3'],
    ['Алексей Нестеров','+79098455620','Владивосток','Сайт'], ['Марина Осипова','+79242200981','Благовещенск','Instagram'],
  ];
  const clients = C.map(([name, phone, city, source, designer_id], i) => ({
    id:`c-${i + 1}`, name, phone, city, source, designer_id: designer_id || null, address:'', notes:'', created_at: at(-380 + i * 22),
  }));
  clients[0].notes = 'Предпочитает связь в WhatsApp после 18:00.';
  clients[2].notes = 'Коммерческий объект, оплата по счёту.';

  // [клиент, название, изделие, кат, порода, размер, этап, цена, дней назад начали, срок через (дней), мастер, оплачено (доля)]
  const O = [
    [1,'Зеркало «Белла»','bella','mirror','karagach','180 × 75 см','coat',78000,-12,3,'u-sergey',.3],
    [2,'Стол «Луссо» 180 см','lusso','table','walnut','180 × 90 × 76 см','form',265000,-16,15,'u-dmitry',.3],
    [3,'Столешницы для кафе, 6 шт','','table','oak','120 × 70 см','prep',312000,-9,24,'u-ivan',.5],
    [4,'Зеркало «Грация»','gracia','mirror','karagach','190 × 70 см','approve',92000,-15,-1,'u-sergey',.3],
    [4,'Обеденный стол «Филин»','filin','table','karagach','160 × 85 × 76 см','board',184000,-3,27,'u-dmitry',.3],
    [5,'Межкомнатная дверь «Волна»','wave','door','oak','2000 × 800 мм','finish',148000,-11,2,'u-ivan',.3],
    [6,'Зеркало «Капля»','drop','mirror','karagach','80 × 50 см','delivery',38000,-20,-2,'u-sergey',1],
    [7,'Зеркало «Арт»','art','mirror','walnut','80 × 60 см','agreed',54000,-2,16,null,0],
    [8,'Зеркало «Дипломат»','diplomat','mirror','walnut','160 × 85 см','calc',0,0,null,null,0],
    [9,'Подоконники, 3 окна','','sill','oak','1600 × 350 мм','calc',0,-1,null,null,0],
    [10,'Стол «Густо»','gusto','table','walnut','190 × 80 × 80 см','lead',0,0,null,null,0],
    [11,'Ресепшн и зеркала для салона','','furniture','karagach','по проекту','agreed',420000,-4,40,null,.3],
    [12,'Зеркало «Аура»','aura','mirror','karagach','170 × 70 см','lead',0,0,null,null,0],
    [13,'Дубовая накладка на входную дверь','','door','oak','2050 × 880 мм','form',86000,-8,7,'u-ivan',.3],
    [14,'Детская кровать и тумбы','','furniture','pine','90 × 190 см','prep',138000,-6,30,'u-dmitry',.3],
    [16,'Зеркало «Аморэ» в подарок','amore','mirror','karagach','70 × 90 см','finish',46000,-10,1,'u-sergey',.5],
    [15,'Кухонные фасады','','kitchen','oak','по проекту','lost',0,-40,null,null,0],
  ];
  const orders = [], payments = [], events = [], tasks = [];
  const pay = (o, amount, kind, d, method = 'Перевод') => payments.push({id:id('p'), order_id:o.id, amount, kind, method, paid_on:d, note:'', created_at:at(0)});
  O.forEach(([ci, title, item_id, cat, wood, size, st, price, start, due, master, paid], i) => {
    const created = at(start - 5 - (i % 4));
    const o = {id:`o-${i + 1}`, num: 48 + i, title, client_id:`c-${ci}`, designer_id: clients[ci - 1].designer_id, item_id, cat, wood, size,
      finish: cat === 'door' ? 'Масло-воск, 2 слоя' : 'Лак, полуматовый', stage: st, price, cost: Math.round(price * .32),
      deadline: due == null ? null : addDays(t0, due), started: price ? addDays(t0, start) : null, assignee_id: master,
      priority: i === 3 || i === 5, delivery: clients[ci - 1].city === 'Благовещенск' ? 'Самовывоз / доставка по городу' : 'Транспортная компания',
      source: clients[ci - 1].source, notes:'', pos: i, created_at: created, updated_at: at(-1), stage_at: at(st === 'coat' ? -2 : st === 'prep' ? -9 : -1)};
    o.token = `demo${i}`.padEnd(32, '0'); o.wishes = ''; o.client_ok = null;
    orders.push(o);
    events.push({id:id('e'), order_id:o.id, author_id:'u-olga', type:'create', text:'Заказ создан', created_at: created});
    if (paid) {
      pay(o, Math.round(price * Math.min(paid, .3)), 'prepay', addDays(t0, start));
      if (paid > .3) pay(o, Math.round(price * (paid - .3)), paid >= 1 ? 'final' : 'part', addDays(t0, start + 8));
    }
  });
  orders[0].notes = 'Клиентка просила тон чуть светлее, чем у образца в мастерской.';
  orders[3].client_ok = true;
  orders[10].wishes = 'Хочу в гостиную, чтобы помещалось 8 человек. Можно ли ножки потемнее?';
  orders[12].wishes = 'Хочу в спальню, можно ли чуть уже образца?';
  orders[12].created_at = at(0, 9);
  orders[2].notes = 'Кромка с фаской 3 мм, покрытие — износостойкий лак для общепита.';
  orders[1].notes = 'Светлые прожилки заболони — по центру, как у образца.';

  // история: сданные заказы за год для аналитики
  const H = [
    ['bella','mirror','karagach',74000],['lusso','table','walnut',240000],['kamelot','table','oak',210000],['koko','mirror','karagach',42000],
    ['wave','door','oak',155000],['ideal','mirror','karagach',88000],['alma','mirror','pine',96000],['favorit','mirror','karagach',69000],
    ['gusto','table','walnut',198000],['drop','mirror','karagach',36000],['rays','door','oak',176000],['aura','mirror','karagach',84000],
    ['filin','table','karagach',152000],['amore','mirror','karagach',44000],['diplomat','mirror','walnut',72000],['stand','table','walnut',39000],
    ['circles','door','oak',168000],['art','mirror','walnut',52000],['gracia','mirror','karagach',90000],['bella','mirror','karagach',78000],
    ['','sill','oak',64000],['','kitchen','oak',380000],['','furniture','karagach',126000],
  ];
  const NAMES = {bella:'Зеркало «Белла»', lusso:'Стол «Луссо»', kamelot:'Стол «Камелот»', koko:'Зеркало «Коко»', wave:'Дверь «Волна»', ideal:'Зеркало «Идеал»',
    alma:'Зеркало «Альма»', favorit:'Зеркало «Фаворит»', gusto:'Стол «Густо»', drop:'Зеркало «Капля»', rays:'Дверь «Лучи»', aura:'Зеркало «Аура»',
    filin:'Стол «Филин»', amore:'Зеркало «Аморэ»', diplomat:'Зеркало «Дипломат»', stand:'Приставной столик', circles:'Дверь «Круги»', art:'Зеркало «Арт»', gracia:'Зеркало «Грация»'};
  H.forEach(([item_id, cat, wood, price], i) => {
    const end = -350 + i * 15, start = end - (cat === 'mirror' ? 16 : 32);
    const ci = (i * 5) % clients.length;
    const o = {id:`h-${i + 1}`, num: 25 + i, title: NAMES[item_id] || {sill:'Подоконники', kitchen:'Кухня из дуба', furniture:'Шкаф в прихожую'}[cat],
      client_id: clients[ci].id, designer_id: clients[ci].designer_id, item_id, cat, wood, size:'', finish:'Лак', stage:'done', price, cost: Math.round(price * .3),
      deadline: addDays(t0, end + 1), started: addDays(t0, start), assignee_id: ['u-sergey', 'u-dmitry', 'u-ivan'][i % 3], priority:false,
      delivery:'', source: clients[ci].source, notes:'', pos: 100 + i, created_at: at(start - 6), updated_at: at(end), stage_at: at(end)};
    orders.push(o);
    pay(o, Math.round(price * .3), 'prepay', addDays(t0, start));
    pay(o, price - Math.round(price * .3), 'final', addDays(t0, end));
  });

  const T = [
    ['o-1','Второй слой лака, проверить тон по образцу','u-sergey',0], ['o-4','Снять фото и видео, отправить клиенту','u-olga',0],
    ['o-2','Подобрать доски ореха с заболонью по центру','u-dmitry',-1], ['o-8','Выставить счёт на предоплату','u-olga',1],
    ['o-9','Позвонить, уточнить размеры и тон','u-olga',0], ['o-10','Съездить на замер подоконников','u-andrey',2],
    ['o-6','Упаковать и сдать в ТК','u-sergey',0], ['o-3','Заказать износостойкий лак','u-andrey',3],
    ['o-12','Согласовать эскиз ресепшн с дизайнером','u-andrey',1], [null,'Обновить фото образцов в шоуруме','u-olga',6],
  ];
  T.forEach(([order_id, title, who, due]) => tasks.push({id:id('t'), order_id, title, assignee_id:who, due:addDays(t0, due), done:false, created_by:'u-andrey', created_at:at(-2)}));
  tasks.push({id:id('t'), order_id:'o-1', title:'Шлифовка зерном 240', assignee_id:'u-sergey', due:addDays(t0, -4), done:true, created_by:'u-andrey', created_at:at(-6)});

  const E = [
    ['o-1','stage','Этап: Ручная доводка → Покрытие','u-sergey',-2], ['o-1','note','Первый слой лака лёг ровно, завтра второй.','u-sergey',-1],
    ['o-2','note','Доски ореха с хорошей заболонью нашлись, рисунок будет как у образца.','u-dmitry',-3],
    ['o-4','stage','Этап: Покрытие → Фото на одобрение','u-sergey',-1], ['o-4','note','Дизайнер просит отправить фото в дневном свете.','u-olga',0],
    ['o-6','pay','Оплата 26 600 ₽ — остаток','u-olga',-1], ['o-3','note','Кафе просит сдать до открытия летней веранды, не позже срока.','u-andrey',-4],
    ['o-12','note','Дизайнер прислала проект, нужно 3 зеркала + стойка.','u-olga',-3],
    ['o-4','client','Клиент: всё нравится, можно упаковывать',null,0], ['o-13','client','Заявка с сайта от Ксении Беловой',null,0],
  ];
  E.forEach(([order_id, type, text, who, d]) => events.push({id:id('e'), order_id, type, text, author_id:who, created_at:at(d, 15)}));

  const materials = [
    ['karagach','Слэб','2400 × 520 × 60 мм',2,'шт',18000,'Стеллаж 1'], ['karagach','Доска','2000 × 180 × 40 мм',14,'шт',3200,'Стеллаж 1'],
    ['walnut','Доска','2200 × 200 × 45 мм',6,'шт',14500,'Сушилка','o-2'], ['walnut','Доска','1800 × 150 × 30 мм',9,'шт',8900,'Стеллаж 2'],
    ['oak','Щит','2000 × 600 × 40 мм',4,'шт',21000,'Стеллаж 3','o-3'], ['oak','Брус','2000 × 100 × 100 мм',0.6,'м³',95000,'Склад'],
    ['pine','Доска','3000 × 200 × 50 мм',22,'шт',1400,'Склад'], ['maple','Доска','2000 × 120 × 25 мм',3,'шт',6200,'Стеллаж 2'],
  ].map(([wood, form, dims, qty, unit, cost, place, reserved_for]) => ({id:id('m'), wood, form, dims, qty, unit, cost, place, reserved_for: reserved_for || null, notes:'', created_at:at(-30)}));


  return {profiles, designers, clients, orders, payments, tasks, events, photos: [], materials, inbox: [], settings: []};
}
