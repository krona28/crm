// Справочники CRM и мелкие помощники форматирования.
import {ITEMS, WOODS} from './catalog.js';
export {ITEMS, WOODS};

// путь заказа: продажа → цех (те же пять этапов, что на сайте) → сдача
export const STAGES = [
  {id:'lead',     name:'Заявка',            group:'sale'},
  {id:'calc',     name:'Расчёт и эскиз',    group:'sale'},
  {id:'agreed',   name:'Предоплата',        group:'sale'},
  {id:'board',    name:'Подбор доски',      group:'work'},
  {id:'prep',     name:'Подготовка',        group:'work'},
  {id:'form',     name:'Форма и рельеф',    group:'work'},
  {id:'finish',   name:'Ручная доводка',    group:'work'},
  {id:'coat',     name:'Покрытие',          group:'work'},
  {id:'approve',  name:'Фото на одобрение', group:'out'},
  {id:'delivery', name:'Доставка и монтаж', group:'out'},
  {id:'done',     name:'Сдан',              group:'closed'},
  {id:'lost',     name:'Отказ',             group:'closed'},
];
export const GROUPS = {sale:'Продажа', work:'В цеху', out:'Сдача', closed:'Архив'};
export const stage = id => STAGES.find(s => s.id === id) || STAGES[0];
export const stageIdx = id => STAGES.findIndex(s => s.id === id);
export const isActive = o => !['done', 'lost'].includes(o.stage);
export const inWork = o => ['work', 'out'].includes(stage(o.stage).group);

export const CATS = {
  mirror:{name:'Зеркало', days:14}, table:{name:'Стол', days:30}, door:{name:'Дверь', days:14},
  kitchen:{name:'Кухня', days:45}, furniture:{name:'Мебель', days:30}, sill:{name:'Подоконник', days:14},
  other:{name:'Другое', days:21},
};
export const SOURCES = ['Сайт', 'Instagram', 'WhatsApp', 'Телефон', 'Рекомендация', 'Дизайнер', 'Повторный', 'Выставка'];
export const PAY_KINDS = {prepay:'Предоплата', part:'Частичная', final:'Остаток', other:'Другое'};
export const METHODS = ['Перевод', 'Наличные', 'Счёт', 'Карта'];
export const ROLES = {owner:'Руководитель', manager:'Менеджер', master:'Мастер', pending:'Ждёт доступа'};
export const COLORS = ['#c9a66b', '#8fb3a5', '#c98d6b', '#a59bc9', '#7fa3c9', '#c9b46b', '#b37f8f'];

export const DEFAULT_SETTINGS = {
  prepay: 30,
  templates: [
    {id:'hello', name:'Ответ на заявку', text:'Здравствуйте, {имя}! Это мастерская «Крона». Получили вашу заявку на {изделие}. Подскажите, пожалуйста, размеры и пришлите фото места, где будет стоять изделие, — рассчитаем стоимость.'},
    {id:'calc', name:'Расчёт готов', text:'{имя}, расчёт готов: {изделие}, {порода}, {размер}. Стоимость {цена}. Срок изготовления — до {срок}. Для запуска в работу нужна предоплата {предоплата}.'},
    {id:'track', name:'Ссылка на заказ', text:'{имя}, здесь можно следить за вашим заказом №{номер}: этапы, сроки и фото из мастерской. Сохраните ссылку: {ссылка}'},
    {id:'start', name:'Запустили в работу', text:'{имя}, предоплату получили, спасибо! Заказ №{номер} запущен в работу. Фото по ходу изготовления будут появляться на странице заказа: {ссылка}'},
    {id:'ready', name:'Готово, фото на одобрение', text:'{имя}, ваше изделие готово! Фото уже на странице заказа — посмотрите и нажмите «Всё нравится» или задайте вопрос: {ссылка}. Остаток к оплате: {остаток}.'},
    {id:'ship', name:'Отправили', text:'{имя}, заказ №{номер} отправлен. Если будут вопросы по уходу за изделием — пишите, всегда на связи. Спасибо, что выбрали «Крону»!'},
    {id:'review', name:'Просьба об отзыве', text:'{имя}, как вам изделие в интерьере? Будем очень благодарны за пару слов и фото — это лучшая поддержка для нашей мастерской.'},
  ],
};

// ── форматирование ──
const nf = new Intl.NumberFormat('ru-RU');
export const money = n => n ? nf.format(Math.round(n)) + ' ₽' : '0 ₽';
export const short = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace('.', ',') + ' млн' : n >= 1e3 ? Math.round(n / 1e3) + ' тыс' : String(Math.round(n || 0));
export const MONTHS = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
export const MON = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
export const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
export const today = () => iso(new Date());
export const iso = d => { const z = new Date(d); z.setMinutes(z.getMinutes() - z.getTimezoneOffset()); return z.toISOString().slice(0, 10); };
export const addDays = (d, n) => { const z = new Date(d + 'T12:00'); z.setDate(z.getDate() + n); return iso(z); };
export const daysTo = d => d ? Math.round((new Date(d + 'T12:00') - new Date(today() + 'T12:00')) / 864e5) : null;
export const daysSince = ts => Math.floor((Date.now() - new Date(ts)) / 864e5);
export const dmy = d => { if (!d) return ''; const z = new Date(d.length === 10 ? d + 'T12:00' : d); return `${z.getDate()} ${MONTHS_GEN[z.getMonth()]}`; };
export const dshort = d => { if (!d) return ''; const z = new Date(d.length === 10 ? d + 'T12:00' : d); return `${z.getDate()} ${MON[z.getMonth()]}`; };
export const ago = ts => {
  const m = Math.round((Date.now() - new Date(ts)) / 6e4);
  if (m < 1) return 'только что'; if (m < 60) return `${m} мин назад`;
  const h = Math.round(m / 60); if (h < 24) return `${h} ч назад`;
  const d = Math.round(h / 24); if (d === 1) return 'вчера'; if (d < 7) return `${d} ${plural(d, 'день', 'дня', 'дней')} назад`;
  return dmy(ts);
};
export const plural = (n, a, b, c) => { const m = Math.abs(n) % 100, k = m % 10; return m > 10 && m < 20 ? c : k > 1 && k < 5 ? b : k === 1 ? a : c; };
export const phoneDigits = p => { let d = (p || '').replace(/\D/g, ''); if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1); if (d.length === 10) d = '7' + d; return d; };
export const phoneNice = p => { const d = phoneDigits(p); return d.length === 11 ? `+${d[0]} ${d.slice(1, 4)} ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9)}` : p || ''; };
export const item = id => ITEMS.find(i => i.id === id);
export const initials = n => (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
