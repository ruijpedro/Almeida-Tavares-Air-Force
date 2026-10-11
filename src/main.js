import './styles.css';
import { APP_NAME, APP_SUBTITLE, APP_VERSION, CITY_ZONES, STORAGE_KEY } from './config.js';

const root = document.getElementById('app');
const MOTTO = 'Sempre no ar. Se faltar a potência, há sempre um comprimido azul.';
const LOGO_URL = location.pathname.endsWith('/preview.html') ? './public/icons/brand-emblem.png' : `${import.meta.env.BASE_URL}icons/brand-emblem.png`;
const emblem = (cls='brand-image') => `<img class="${cls}" src="${LOGO_URL}" alt="Emblema CR: avião em ascensão e cápsula azul" />`;
const defaultData = () => ({ roster: [], flights: [], notes: [], settings: { fontSize: 'normal' } });
const validTypes = ['Voo', 'Reserva', 'Folga', 'Férias', 'Formação', 'Outro'];
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
const id = () => globalThis.crypto?.randomUUID?.() ?? `cr${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
const pad = num => String(num).padStart(2, '0');
const nowLocal = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const dateLocal = () => nowLocal().slice(0, 10);
const toMinutes = hm => { const m = /^(\d{1,3}):([0-5]\d)$/.exec(String(hm)); return m ? Number(m[1])*60+Number(m[2]) : null; };
const asHM = minutes => `${Math.floor(minutes/60)}:${pad(minutes % 60)}`;
const validDateTime = v => typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(v) && Number.isFinite(new Date(v).getTime());
const validDay = v => typeof v === 'string' && /^\d{4}-\d\d-\d\d$/.test(v) && Number.isFinite(new Date(`${v}T12:00`).getTime());
const upperAirport = v => String(v || '').trim().toUpperCase().slice(0, 4);

function sanitiseRecord(value, kind) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const rec = { id: /^[A-Za-z0-9_-]{3,90}$/.test(String(value.id || '')) ? String(value.id) : id() };
  if (kind === 'roster') {
    if (!validDateTime(value.start) || !validDateTime(value.end) || value.end <= value.start) return null;
    return { ...rec, type: validTypes.includes(value.type) ? value.type : 'Outro', start: value.start, end: value.end, route: String(value.route || '').slice(0, 130), note: String(value.note || '').slice(0, 600) };
  }
  if (kind === 'flights') {
    if (!validDay(value.date) || !/^[A-Z]{3,4}$/.test(upperAirport(value.from)) || !/^[A-Z]{3,4}$/.test(upperAirport(value.to))) return null;
    const minutes = Number(value.minutes);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 7200) return null;
    return { ...rec, date: value.date, from: upperAirport(value.from), to: upperAirport(value.to), minutes, aircraft: String(value.aircraft || '').slice(0, 48), note: String(value.note || '').slice(0, 600) };
  }
  if (kind === 'notes') {
    if (!String(value.city || '').trim()) return null;
    return { ...rec, city: String(value.city).trim().slice(0, 90), title: String(value.title || '').slice(0, 90), details: String(value.details || '').slice(0, 1800) };
  }
  return null;
}
function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed || typeof parsed !== 'object') return defaultData();
    return {
      roster: Array.isArray(parsed.roster) ? parsed.roster.slice(0, 2500).map(x => sanitiseRecord(x, 'roster')).filter(Boolean) : [],
      flights: Array.isArray(parsed.flights) ? parsed.flights.slice(0, 5000).map(x => sanitiseRecord(x, 'flights')).filter(Boolean) : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes.slice(0, 1500).map(x => sanitiseRecord(x, 'notes')).filter(Boolean) : [],
      settings: { fontSize: ['normal','grande','extra'].includes(parsed.settings?.fontSize) ? parsed.settings.fontSize : 'normal' }
    };
  } catch { return defaultData(); }
}
let data = load();
let ui = { screen: 'home', editing: null, month: new Date().getMonth(), year: new Date().getFullYear(), filter: 'Todos', toast: '' };
let timerToast;
let deferredInstall = null;
const store = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return true; } catch { notice('Não foi possível guardar. Exporte uma cópia de segurança.'); return false; } };
const titleDate = value => { if (!value) return '—'; const [y,m,d] = value.slice(0,10).split('-'); return `${d}/${m}/${y}`; };
const dayTime = value => `${titleDate(value)} · ${value.slice(11,16)}`;
const timeZoneText = (zone, options = {}) => new Intl.DateTimeFormat('pt-PT', { timeZone:zone, hour:'2-digit', minute:'2-digit', hourCycle:'h23', ...options }).format(new Date());
const dayZoneText = zone => new Intl.DateTimeFormat('pt-PT', { timeZone:zone, weekday:'short', day:'2-digit', month:'short' }).format(new Date());
const plural = (n, singular, multiple) => `${n} ${n === 1 ? singular : multiple}`;

function icon(name, size=20) {
  const paths = {
    plane:'<path d="M21 3 3 10l7.2 2.6L13 20l2.1-6.3L21 3Z"/><path d="m10.2 12.6 4.9 1.1"/>',
    home:'<path d="m3 10 9-7 9 7v10H3V10Z"/><path d="M9 20v-7h6v7"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
    log:'<path d="M7 3h11a2 2 0 0 1 2 2v15H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c6 5 6 13 0 18M12 3c-6 5-6 13 0 18"/>',
    pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    ticket:'<path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V6Z"/><path d="M12 6v2m0 3v2m0 3v2"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M10 2h4l.5 2.6 2.3.9 2.2-1.5 2.8 2.8-1.5 2.2.9 2.3L24 12l-2.8 1.1-.9 2.3 1.5 2.2-2.8 2.8-2.2-1.5-2.3.9L14 22h-4l-.5-2.6-2.3-.9L5 20l-2.8-2.8 1.5-2.2-.9-2.3L0 12l2.8-1.1.9-2.3-1.5-2.2L5 3.6l2.2 1.5 2.3-.9L10 2Z" transform="translate(1 1) scale(.92)"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    chevron:'<path d="m9 18 6-6-6-6"/>',
    down:'<path d="m6 9 6 6 6-6"/>',
    arrow:'<path d="m5 12 14 0m-6-6 6 6-6 6"/>',
    edit:'<path d="M12 20H4v-8l11-9 6 6-9 11Z"/><path d="m13 5 6 6"/>',
    trash:'<path d="M4 7h16m-14 0 1 14h10l1-14M9 7V4h6v3M10 11v6m4-6v6"/>',
    download:'<path d="M12 3v13m-5-5 5 5 5-5M4 18v3h16v-3"/>',
    upload:'<path d="M12 17V4m-5 5 5-5 5 5M4 17v4h16v-4"/>',
    gift:'<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M12 9v12M3 13h18M4 9V6h16v3M12 9c-8 0-9-6-5-6 3 0 5 4 5 6Zm0 0c8 0 9-6 5-6-3 0-5 4-5 6Z"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check:'<path d="m4 12 5 5 11-11"/>',
    more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
    print:'<path d="M6 8V3h12v5M6 18H4V9h16v9h-2M6 15h12v6H6v-6Z"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
    refresh:'<path d="M20 6v5h-5M4 18v-5h5"/><path d="M5 9a8 8 0 0 1 14-3m0 9A8 8 0 0 1 5 18"/>'
  };
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.plane}</svg>`;
}
const navItems = [
  ['home','Início','home'], ['roster','Escalas','calendar'], ['logbook','Diário','log'], ['clock','Fusos','globe'],
  ['notes','Destinos','pin'], ['gift','O bilhete','ticket'], ['settings','Definições','settings']
];
function navButton(item, mobile=false) {
  const [screen,label,ic] = item;
  const active = ui.screen === screen || (screen === 'more' && ['notes','gift','settings','more'].includes(ui.screen));
  return `<button class="${mobile ? 'bottom-link' : 'side-link'} ${active ? 'active' : ''}" data-action="navigate" data-screen="${screen}" ${active ? 'aria-current="page"' : ''}>${icon(ic, mobile ? 20 : 19)}<span>${label}</span></button>`;
}
function notice(msg) {
  ui.toast = msg;
  clearTimeout(timerToast);
  const toast = document.getElementById('toast');
  if (toast) { toast.textContent = msg; toast.classList.add('show'); }
  timerToast = setTimeout(() => { const target = document.getElementById('toast'); if (target) target.classList.remove('show'); ui.toast = ''; }, 3500);
}
function navigate(screen) {
  ui.screen = screen;
  ui.editing = null;
  render();
  window.scrollTo({ top:0, behavior:'instant' });
}
function statValue() {
  const mins = data.flights.reduce((sum,x) => sum+x.minutes, 0);
  const destinations = new Set(data.flights.flatMap(x => [x.from,x.to]));
  return { flights:data.flights.length, mins, hours:asHM(mins), airports:destinations.size, duties:data.roster.length };
}
function planeArt() {
  return `<svg class="hero-art" viewBox="0 0 430 240" fill="none" aria-hidden="true"><defs><linearGradient id="planegrad" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#DCEEF2"/><stop offset="1" stop-color="#63DCEB"/></linearGradient></defs><circle cx="226" cy="130" r="88" stroke="#5CCDE3" opacity=".22"/><circle cx="226" cy="130" r="117" stroke="#5CCDE3" opacity=".13" stroke-dasharray="4 9"/><path d="M21 173c110-56 190-29 313-108" stroke="#68D4EB" stroke-dasharray="7 9" stroke-width="1.6" opacity=".6"/><path d="M358 35c-10 5-20 15-29 28l-86 30-65-27-11 12 50 34-56 29-38-10-9 10 39 25 32-13 48-26 105-57c14-8 30-25 32-35-1-7-6-6-12 0Z" fill="url(#planegrad)"/><path d="m218 113 21-10m-61-37 10 8" stroke="#10283B" stroke-width="2"/><circle cx="92" cy="180" r="3.5" fill="#E8D099"/><circle cx="380" cy="61" r="3" fill="#80E3F5"/></svg>`;
}
function badge(label, type='') { return `<span class="chip ${type}">${esc(label)}</span>`; }
function emptyState(heading, detail, symbol='plane') { return `<div class="empty">${icon(symbol,32)}<strong>${heading}</strong><span>${detail}</span></div>`; }
function summaryCard(label, value, sub, mark) { return `<div class="stat-card"><span class="stat-label">${esc(label)}</span><div class="stat-value">${esc(value)}</div><span class="stat-sub">${icon(mark,14)} ${esc(sub)}</span></div>`; }
function rosterRow(x, controls=true) {
  return `<div class="list-row"><span class="date-tile"><strong>${esc(x.start.slice(8,10))}</strong><small>${esc(new Intl.DateTimeFormat('pt-PT',{month:'short'}).format(new Date(`${x.start.slice(0,7)}-01T12:00`)))}</small></span><div class="list-core"><div class="list-title">${badge(x.type, x.type==='Voo'?'cyan':x.type==='Folga'?'gold':'')} <strong>${esc(x.route || x.type)}</strong></div><p>${esc(x.start.slice(11,16))}–${esc(x.end.slice(11,16))} · ${esc(titleDate(x.start))}${x.note ? ` · ${esc(x.note)}` : ''}</p></div>${controls ? `<div class="row-actions"><button title="Editar escala" aria-label="Editar escala" data-action="edit-roster" data-id="${esc(x.id)}">${icon('edit',17)}</button><button title="Apagar escala" aria-label="Apagar escala" data-action="delete-roster" data-id="${esc(x.id)}">${icon('trash',17)}</button></div>` : icon('chevron',16)}</div>`;
}
function flightRow(x) {
  return `<div class="list-row"><span class="flight-route-icon">${icon('plane',22)}</span><div class="list-core"><div class="list-title"><strong>${esc(x.from)} <span class="muted-inline">→</span> ${esc(x.to)}</strong>${badge(asHM(x.minutes)+' h','cyan')}</div><p>${esc(titleDate(x.date))}${x.aircraft ? ' · '+esc(x.aircraft) : ''}${x.note ? ' · '+esc(x.note) : ''}</p></div><div class="row-actions"><button title="Editar voo" aria-label="Editar voo" data-action="edit-flight" data-id="${esc(x.id)}">${icon('edit',17)}</button><button title="Apagar voo" aria-label="Apagar voo" data-action="delete-flight" data-id="${esc(x.id)}">${icon('trash',17)}</button></div></div>`;
}
function home() {
  const stats=statValue();
  const upcoming=data.roster.filter(x => x.end >= nowLocal()).sort((a,b)=>a.start.localeCompare(b.start)).slice(0,3);
  const latest=[...data.flights].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);
  return `<div class="home-page">
    <div class="hero panel"><div class="hero-copy"><div class="eyebrow"><span class="star">✦</span> EDIÇÃO ESPECIAL · SEMPRE 20 ANOS</div><h1>O céu não é<br>o limite. <em>É casa.</em></h1><p>${esc(MOTTO)}</p><div class="hero-actions"><button class="primary" data-action="navigate" data-screen="gift">${icon('ticket',18)} Ver o teu bilhete</button><button class="outline" data-action="navigate" data-screen="roster">Abrir escalas ${icon('arrow',17)}</button></div></div>${planeArt()}<span class="hero-coordinate">CR — SEMPRE NO AR / 001</span></div>
    <div class="metrics-grid">${summaryCard('Voos registados', stats.flights, 'Diário pessoal', 'plane')}${summaryCard('Horas de voo', stats.hours, 'Registo próprio', 'clock')}${summaryCard('Aeroportos', stats.airports, 'Locais distintos', 'pin')}${summaryCard('Serviços', stats.duties, 'Na tua agenda', 'calendar')}</div>
    <div class="two-col"><section class="panel section-card"><div class="section-head"><div><span class="mini-label">PRÓXIMOS PASSOS</span><h2>As tuas escalas</h2></div><button class="text-button" data-action="navigate" data-screen="roster">Ver todas ${icon('arrow',16)}</button></div>${upcoming.length ? upcoming.map(x=>rosterRow(x,false)).join('') : emptyState('Agenda pronta para descolar', 'Acrescenta um serviço ou importa um ficheiro CSV.', 'calendar')}<button class="secondary wide" data-action="add-roster">${icon('plus',16)} Adicionar escala</button></section>
    <section class="panel section-card"><div class="section-head"><div><span class="mini-label">MEMÓRIAS DE VOO</span><h2>Últimos registos</h2></div><button class="text-button" data-action="navigate" data-screen="logbook">Ver diário ${icon('arrow',16)}</button></div>${latest.length ? latest.map(x=>`<div class="mini-flight"><span>${icon('plane',17)}</span><strong>${esc(x.from)} → ${esc(x.to)}</strong><small>${esc(titleDate(x.date))} · ${esc(asHM(x.minutes))} h</small></div>`).join('') : emptyState('Cada voo conta uma história', 'Regista aqui as tuas melhores viagens.', 'log')}<button class="secondary wide" data-action="add-flight">${icon('plus',16)} Registar voo</button></section></div>
    <section class="panel world-strip"><div><span class="mini-label">UM MUNDO DE HORAS</span><h2>O mundo ao teu ritmo</h2></div><div class="world-mini"><div><small>UTC</small><strong data-clock="UTC">--:--</strong></div><div><small>LISBOA</small><strong data-clock="Europe/Lisbon">--:--</strong></div><div><small>NOVA IORQUE</small><strong data-clock="America/New_York">--:--</strong></div><div><small>LUANDA</small><strong data-clock="Africa/Luanda">--:--</strong></div></div><button class="icon-button" data-action="navigate" data-screen="clock" aria-label="Ver fusos horários">${icon('arrow',21)}</button></section>
  </div>`;
}
function formRoster(item) {
  return `<div class="form-frame panel"><div class="section-head"><div><span class="mini-label">AGENDA PESSOAL</span><h2>${item ? 'Editar serviço' : 'Novo serviço'}</h2></div><button class="icon-button" data-action="cancel-edit" aria-label="Fechar">✕</button></div><form id="roster-form" data-id="${esc(item?.id || '')}"><div class="form-grid"><label>Tipo de serviço<select name="type" required>${validTypes.map(type=>`<option ${item?.type===type?'selected':''}>${esc(type)}</option>`).join('')}</select></label><label>Trajeto / identificação<input name="route" maxlength="130" placeholder="Ex.: LIS — PAR" value="${esc(item?.route || '')}" /></label><label>Início (hora local)<input type="datetime-local" name="start" required value="${esc(item?.start || nowLocal())}" /></label><label>Fim (hora local)<input type="datetime-local" name="end" required value="${esc(item?.end || nowLocal())}" /></label></div><label>Notas pessoais<textarea name="note" maxlength="600" rows="2" placeholder="Informações úteis, lembretes...">${esc(item?.note || '')}</textarea></label><div class="form-actions"><button class="outline" type="button" data-action="cancel-edit">Cancelar</button><button class="primary" type="submit">${icon('check',17)} Guardar serviço</button></div></form></div>`;
}
function calendarPanel() {
  const first = new Date(ui.year,ui.month,1);
  const offset=(first.getDay()+6)%7;
  const days=new Date(ui.year,ui.month+1,0).getDate();
  const months=new Intl.DateTimeFormat('pt-PT',{month:'long',year:'numeric'}).format(first);
  const marks=new Map();
  data.roster.forEach(x=>{ const day=x.start.slice(0,10); marks.set(day, (marks.get(day)||0)+1); });
  const today=dateLocal();
  let cells='';
  for(let i=0;i<offset;i++) cells+='<span class="cal-blank"></span>';
  for(let d=1;d<=days;d++) {
    const day=`${ui.year}-${pad(ui.month+1)}-${pad(d)}`;
    cells+=`<button class="cal-day ${today===day?'today':''} ${marks.has(day)?'has-duty':''}" data-action="select-day" data-day="${day}" title="${marks.get(day)||0} serviços em ${day}"><span>${d}</span>${marks.has(day)?'<i></i>':''}</button>`;
  }
  return `<div class="panel calendar-panel"><div class="calendar-top"><h2>${esc(months)}</h2><div><button data-action="prev-month" aria-label="Mês anterior">‹</button><button data-action="next-month" aria-label="Mês seguinte">›</button></div></div><div class="calendar-grid">${['S','T','Q','Q','S','S','D'].map(n=>`<span class="cal-heading">${n}</span>`).join('')}${cells}</div><div class="legend"><span class="legend-dot"></span> Dias com serviços · Toca num dia para filtrar</div></div>`;
}
function roster() {
  const filtered=[...data.roster].filter(x=>ui.filter==='Todos'||x.start.slice(0,10)===ui.filter).sort((a,b)=>a.start.localeCompare(b.start));
  return `<div class="page-header"><div><span class="mini-label">PLANEAMENTO PESSOAL</span><h1>Escalas & agenda</h1><p>Organiza turnos, folgas e compromissos sem depender de sistemas externos.</p></div><button class="primary" data-action="add-roster">${icon('plus',18)} Novo serviço</button></div>
  ${ui.editing?.kind==='roster'?formRoster(data.roster.find(x=>x.id===ui.editing.id)):''}
  <div class="roster-layout">${calendarPanel()}<section class="panel section-card"><div class="section-head"><div><span class="mini-label">LISTA DE SERVIÇOS</span><h2>${ui.filter==='Todos'?'Todos os serviços':titleDate(ui.filter)}</h2></div>${ui.filter!=='Todos'?'<button class="text-button" data-action="clear-day">Limpar filtro ✕</button>':''}</div>${filtered.length ? filtered.map(x=>rosterRow(x)).join('') : emptyState('Ainda sem serviços', 'Adiciona manualmente ou importa um CSV de escalas.', 'calendar')}</section></div>
  <section class="panel tools-card"><div><strong>Importar ou exportar a agenda</strong><p>Usa o modelo CSV (separador «;»). Podes também exportar para o calendário (.ics), com horas locais.</p></div><div class="button-cluster"><button class="outline" data-action="csv-template">${icon('download',16)} Modelo CSV</button><button class="outline" data-action="import-csv">${icon('upload',16)} Importar CSV</button><button class="outline" data-action="export-ics">${icon('calendar',16)} Exportar .ics</button></div></section>`;
}
function formFlight(item) {
  return `<div class="panel form-frame"><div class="section-head"><div><span class="mini-label">DIÁRIO PESSOAL</span><h2>${item?'Editar registo':'Registar voo'}</h2></div><button class="icon-button" data-action="cancel-edit" aria-label="Fechar">✕</button></div><form id="flight-form" data-id="${esc(item?.id || '')}"><div class="form-grid"><label>Data<input type="date" name="date" required value="${esc(item?.date || dateLocal())}" /></label><label>Duração (h:mm)<input name="duration" required pattern="[0-9]{1,3}:[0-5][0-9]" placeholder="02:35" value="${esc(item ? asHM(item.minutes) : '')}" /></label><label>Aeroporto de origem (IATA/ICAO)<input name="from" maxlength="4" minlength="3" required placeholder="LIS" value="${esc(item?.from || '')}" class="uppercase" /></label><label>Aeroporto de destino (IATA/ICAO)<input name="to" maxlength="4" minlength="3" required placeholder="LHR" value="${esc(item?.to || '')}" class="uppercase" /></label><label class="full">Aeronave (opcional)<input name="aircraft" maxlength="48" placeholder="Modelo ou matrícula — se quiseres" value="${esc(item?.aircraft || '')}" /></label></div><label>Notas<textarea name="note" maxlength="600" rows="2" placeholder="Uma memória deste voo...">${esc(item?.note || '')}</textarea></label><p class="fineprint">Registo pessoal. Não substitui o diário de voo oficial ou os registos do operador.</p><div class="form-actions"><button type="button" class="outline" data-action="cancel-edit">Cancelar</button><button type="submit" class="primary">${icon('check',17)} Guardar voo</button></div></form></div>`;
}
function chartMonths() {
  const months=[];
  for(let i=5;i>=0;i--){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i); const key=`${d.getFullYear()}-${pad(d.getMonth()+1)}`;const mins=data.flights.filter(x=>x.date.startsWith(key)).reduce((t,x)=>t+x.minutes,0);months.push({label:new Intl.DateTimeFormat('pt-PT',{month:'short'}).format(d),mins}); }
  const max=Math.max(60,...months.map(x=>x.mins));
  return `<div class="bars">${months.map(x=>`<div class="bar-column" title="${esc(x.label)}: ${esc(asHM(x.mins))} horas"><strong>${x.mins?asHM(x.mins):'–'}</strong><div class="bar-rail"><div style="height:${Math.max(x.mins ? 7 : 0, Math.round((x.mins/max)*100))}%"></div></div><span>${esc(x.label)}</span></div>`).join('')}</div>`;
}
function logbook() {
  const stat=statValue();
  const sorted=[...data.flights].sort((a,b)=>b.date.localeCompare(a.date));
  const freq={};data.flights.forEach(x=>{freq[x.from]=(freq[x.from]||0)+1;freq[x.to]=(freq[x.to]||0)+1;});
  const popular=Object.entries(freq).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';
  return `<div class="page-header"><div><span class="mini-label">O TEU PERCURSO</span><h1>Diário de voo</h1><p>Guarda memórias, percursos e horas, à tua maneira.</p></div><button class="primary" data-action="add-flight">${icon('plus',18)} Registar voo</button></div>${ui.editing?.kind==='flights'?formFlight(data.flights.find(x=>x.id===ui.editing.id)):''}
    <div class="metrics-grid three">${summaryCard('Voos',stat.flights,'Registos pessoais','plane')}${summaryCard('Horas acumuladas',stat.hours,'Formato h:mm','clock')}${summaryCard('Aeroporto frequente',popular,'Entre os registados','pin')}</div>
    <div class="two-col logbook-grid"><section class="panel section-card"><div class="section-head"><div><span class="mini-label">HISTÓRICO</span><h2>Os teus voos</h2></div></div>${sorted.length?sorted.map(flightRow).join(''):emptyState('Ainda não há voos registados','Começa por um voo que te tenha marcado.','plane')}</section><section class="panel section-card"><span class="mini-label">ÚLTIMOS 6 MESES</span><h2>Horas de voo por mês</h2>${chartMonths()}<p class="fineprint">Gráfico feito apenas com os registos introduzidos nesta aplicação.</p><button class="secondary wide" data-action="export-flights-csv">${icon('download',17)} Exportar diário CSV</button></section></div>`;
}
function worldClock() {
  return `<div class="page-header"><div><span class="mini-label">WORLD TIME</span><h1>Fusos horários</h1><p>Relógios locais atualizados com as regras de hora de verão do dispositivo.</p></div>${badge('Hora local · Indicativa','cyan')}</div>
    <div class="utc-banner panel"><div><span class="mini-label">TEMPO UNIVERSAL COORDENADO</span><h2>UTC / Zulu</h2></div><strong data-clock="UTC" data-with-seconds="true">--:--:--</strong><span data-date-zone="UTC"></span></div>
    <div class="clock-grid">${CITY_ZONES.filter(x=>x.zone!=='UTC').map(x=>`<div class="panel clock-card"><div class="clock-card-top"><span class="flag">${x.flag}</span><small>${esc(x.code)}</small></div><h3>${esc(x.name)}</h3><strong data-clock="${esc(x.zone)}">--:--</strong><p data-date-zone="${esc(x.zone)}">--</p></div>`).join('')}</div><p class="fineprint">Não usar para determinar horários operacionais, limites de serviço ou tempos regulamentares. Confirma sempre informações de escala nos sistemas oficiais.</p>`;
}
function noteForm(item) {
  return `<div class="panel form-frame"><div class="section-head"><div><span class="mini-label">CADERNO DE VIAGEM</span><h2>${item?'Editar nota':'Nova nota de destino'}</h2></div><button class="icon-button" data-action="cancel-edit" aria-label="Fechar">✕</button></div><form id="note-form" data-id="${esc(item?.id||'')}"><div class="form-grid"><label>Cidade ou local<input name="city" maxlength="90" required placeholder="Ex.: Nova Iorque" value="${esc(item?.city||'')}" /></label><label>Título<input name="title" maxlength="90" placeholder="Ex.: Restaurante preferido" value="${esc(item?.title||'')}" /></label></div><label>Notas e recomendações<textarea name="details" maxlength="1800" rows="4" placeholder="Moradas, sítios a visitar, pequenas memórias...">${esc(item?.details||'')}</textarea></label><div class="form-actions"><button class="outline" type="button" data-action="cancel-edit">Cancelar</button><button class="primary" type="submit">${icon('check',17)} Guardar nota</button></div></form></div>`;
}
function notesPage() {
  const sorted=[...data.notes].sort((a,b)=>a.city.localeCompare(b.city,'pt'));
  return `<div class="page-header"><div><span class="mini-label">O MUNDO É PEQUENO</span><h1>Os teus destinos</h1><p>Um caderno privado com os teus lugares favoritos em cada escala.</p></div><button class="primary" data-action="add-note">${icon('plus',18)} Nova nota</button></div>${ui.editing?.kind==='notes'?noteForm(data.notes.find(x=>x.id===ui.editing.id)):''}
    ${sorted.length?`<div class="notes-grid">${sorted.map(n=>`<section class="panel note-card"><div class="note-head">${icon('pin',20)} <strong>${esc(n.city)}</strong><div class="row-actions"><button data-action="edit-note" data-id="${esc(n.id)}" aria-label="Editar nota">${icon('edit',17)}</button><button data-action="delete-note" data-id="${esc(n.id)}" aria-label="Apagar nota">${icon('trash',17)}</button></div></div><h2>${esc(n.title || 'Notas de viagem')}</h2><p>${esc(n.details || 'Sem descrição adicional.')}</p><a class="text-button" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(n.city)}" target="_blank" rel="noopener noreferrer">Ver cidade no mapa ${icon('arrow',15)}</a></section>`).join('')}</div>`:emptyState('O mundo à tua espera','Cria uma nota para cada cidade e guarda os teus lugares especiais.','pin')}`;
}
function boardingPass() {
  return `<article class="boarding-pass" id="boarding-ticket" aria-label="Cartão simbólico de César Ricardo"><div class="ticket-top"><div class="ticket-brand">${emblem('ticket-logo')} <div><strong>AT / AIR FORCE</strong><span>SEMPRE NO AR</span></div></div><div class="ticket-kicker">BOARDING PASS <span>EDIÇÃO SEMPRE 20 ANOS</span></div></div><div class="ticket-main"><div class="ticket-route"><span class="big-route">CR</span><div><span>✦</span><i></i>${icon('plane',23)}<i></i><span>✦</span></div><span class="big-route">∞</span></div><div class="ticket-route-label"><span>ORIGEM<br><strong>TEMPOS DA UNIVERSIDADE</strong></span><span>DESTINO<br><strong>MUITOS ANOS NO AR</strong></span></div><div class="ticket-name"><small>PASSAGEIRO / PASSENGER</small><strong>CÉSAR RICARDO</strong></div><div class="ticket-fields"><div><small>CLASSE</small><strong>SEMPRE 20 ANOS</strong></div><div><small>PORTA</small><strong>BOA DISPOSIÇÃO</strong></div><div><small>VALIDADE</small><strong>PARA SEMPRE</strong></div></div><div class="ticket-message">${esc(MOTTO)}</div></div><div class="ticket-foot"><span>${icon('plane',19)} PARA MUITOS ANOS NO AR</span><span>CR · 001 / SEMPRE NO AR</span></div></article>`;
}
function gift() {
  return `<div class="gift-page"><div class="gift-intro"><span class="mini-label">DOS TEMPOS DA UNIVERSIDADE AOS CÉUS</span><h1>Sempre 20 anos.<br><em>Sempre no ar.</em></h1><p>Os anos passam, mas a amizade, as histórias e o espírito dos 20 ficam connosco. Esta viagem ainda agora começou.</p></div>${boardingPass()}<div class="gift-actions"><button class="primary" data-action="print-gift">${icon('print',18)} Imprimir o bilhete</button><button class="outline" data-action="share-gift">${icon('share',18)} Partilhar mensagem</button></div><p class="gift-disclaimer">Cartão simbólico entre amigos · Não é um título de transporte · Sem validade para embarque</p></div>`;
}
function settingsPage() {
  return `<div class="page-header"><div><span class="mini-label">CONTROLOS</span><h1>Definições</h1><p>O teu espaço, os teus dados. Tudo guardado localmente no dispositivo.</p></div></div><div class="two-col"><section class="panel section-card"><span class="mini-label">ACESSIBILIDADE</span><h2>Tamanho de letra</h2><p class="subtle">Ajusta a leitura ao teu gosto.</p><div class="choice-buttons">${[['normal','Normal'],['grande','Grande'],['extra','Extra grande']].map(([v,label])=>`<button class="choice ${data.settings.fontSize===v?'selected':''}" data-action="font-size" data-size="${v}">${label}</button>`).join('')}</div></section>
  <section class="panel section-card"><span class="mini-label">SEGURANÇA DOS DADOS</span><h2>Cópias de segurança</h2><p class="subtle">Exporta e importa todos os teus serviços, voos e notas num ficheiro JSON.</p><div class="settings-buttons"><button class="outline" data-action="export-json">${icon('download',16)} Exportar backup</button><button class="outline" data-action="import-json">${icon('upload',16)} Importar backup</button></div><p class="fineprint">A importação substitui os dados existentes. Faz uma cópia antes.</p></section></div>
  <section class="panel section-card about"><span class="mini-label">A TUA APP</span><h2>${esc(APP_NAME)} <em>— ${esc(APP_SUBTITLE)}</em></h2><p>Versão ${APP_VERSION} · Edição Sempre 20 Anos · WebApp/PWA + Android</p><p class="fineprint">Ferramenta de organização e recordação pessoal. Não associada, certificada ou aprovada pela TAP nem por autoridades aeronáuticas. Não usar durante operações de voo nem como substituto de documentação ou sistemas autorizados.</p><button class="danger" data-action="clear-all">${icon('trash',16)} Apagar todos os dados pessoais</button></section>`;
}
function morePage() {
  return `<div class="page-header"><div><span class="mini-label">MAIS OPÇÕES</span><h1>O teu espaço</h1><p>Mais ferramentas e um bilhete especial.</p></div></div><div class="more-grid">${[['notes','Destinos','Guarda os teus lugares favoritos','pin'],['gift','O teu bilhete','O bilhete da amizade','ticket'],['settings','Definições','Cópias de segurança e preferências','settings']].map(([screen,title,desc,ic])=>`<button class="panel more-tile" data-action="navigate" data-screen="${screen}">${icon(ic,27)}<span><strong>${title}</strong><small>${desc}</small></span>${icon('chevron',19)}</button>`).join('')}</div>`;
}
function render() {
  document.documentElement.dataset.fontSize = data.settings.fontSize;
  const titles={home:'Visão geral',roster:'As tuas escalas',logbook:'Diário pessoal',clock:'Horas do mundo',notes:'Destinos favoritos',gift:'O teu bilhete',settings:'Preferências',more:'Mais opções'};
  const pages={home,roster,logbook,clock:worldClock,notes:notesPage,gift,settings:settingsPage,more:morePage};
  root.innerHTML=`<div class="app-shell"><aside class="sidebar"><div class="side-brand"><span class="brand-mark">${emblem()}</span><div><strong>ALMEIDA TAVARES</strong><small>AIR FORCE · SEMPRE NO AR</small></div></div><div class="sidebar-nav"><span class="nav-caption">PAINEL PESSOAL</span>${navItems.map(item=>navButton(item)).join('')}</div><div class="side-bottom"><span class="side-quote">"${esc(MOTTO)}"</span><div class="side-edition">✦ SEMPRE 20 ANOS <span>V${APP_VERSION}</span></div></div></aside>
    <div class="main-area"><header class="topbar"><div class="mobile-brand">${emblem('mobile-logo')} <strong>ALMEIDA TAVARES</strong><small>AIR FORCE · SEMPRE NO AR</small></div><div class="breadcrumbs">PAINEL DE BORDO <span>/</span> ${esc(titles[ui.screen])}</div><div class="top-right"><span class="status-dot"></span><span>OFFLINE READY</span><span class="top-rule"></span><strong data-clock="UTC">--:--</strong><small>UTC</small></div></header><main class="content">${(pages[ui.screen]||home)()}</main><footer class="footer">FEITO PARA CÉSAR RICARDO <span>✦</span> ALMEIDA TAVARES AIR FORCE · ${APP_VERSION}</footer></div>
    <nav class="bottom-nav" aria-label="Navegação principal">${[['home','Início','home'],['roster','Escalas','calendar'],['logbook','Diário','log'],['clock','Fusos','globe'],['more','Mais','more']].map(x=>navButton(x,true)).join('')}</nav>
    <input id="import-csv-input" type="file" accept=".csv,text/csv,text/plain" hidden /><input id="import-json-input" type="file" accept=".json,application/json" hidden /><div role="status" aria-live="polite" id="toast" class="toast">${esc(ui.toast)}</div></div>`;
  updateClocks();
  if(ui.editing) document.querySelector('.form-frame')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function updateClocks() {
  root.querySelectorAll('[data-clock]').forEach(node => {
    const zone=node.dataset.clock;
    try { node.textContent=timeZoneText(zone,node.hasAttribute('data-with-seconds')?{second:'2-digit'}:{}); } catch { node.textContent='--:--'; }
  });
  root.querySelectorAll('[data-date-zone]').forEach(node=>{try{node.textContent=dayZoneText(node.dataset.dateZone);}catch {node.textContent='—';}});
}
function download(name, content, type) {
  const objectUrl=URL.createObjectURL(new Blob([content],{type}));
  const a=document.createElement('a');a.href=objectUrl;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),30000);
}
const csvValue = value => `"${String(value??'').replaceAll('"','""')}"`;
function exportFlights() {
  const rows=[['Data','Origem','Destino','Duração (h:mm)','Aeronave','Notas'],...data.flights.map(x=>[x.date,x.from,x.to,asHM(x.minutes),x.aircraft,x.note])];
  download('Cesar_Ricardo_Diario_de_Voos.csv','\uFEFF'+rows.map(cols=>cols.map(csvValue).join(';')).join('\r\n'),'text/csv;charset=utf-8');
  notice('Diário CSV exportado.');
}
function exportIcs() {
  const escapeIcs=v=>String(v??'').replaceAll('\\','\\\\').replaceAll(';','\\;').replaceAll(',','\\,').replaceAll(/\r?\n/g,'\\n');
  const compact=v=>v.replaceAll('-','').replaceAll(':','');
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//RJP//Cesar Ricardo Sempre no Ar//PT','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:César Ricardo - Escalas'];
  data.roster.forEach(x=>lines.push('BEGIN:VEVENT',`UID:${x.id}@cesarricardo.local`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART:${compact(x.start)}00`,`DTEND:${compact(x.end)}00`,`SUMMARY:${escapeIcs(`${x.type}${x.route?' | '+x.route:''}`)}`,`DESCRIPTION:${escapeIcs('Agenda pessoal. Confirmar sempre escalas oficiais.\n'+x.note)}`,'END:VEVENT'));
  lines.push('END:VCALENDAR');
  download('Cesar_Ricardo_Escalas.ics',lines.join('\r\n')+'\r\n','text/calendar;charset=utf-8');
  notice(data.roster.length ? 'Calendário exportado.' : 'Calendário vazio exportado.');
}
function parseCsv(raw) {
  const input=raw.replace(/^\uFEFF/,'');
  const first=input.split(/\r?\n/,1)[0]||'';
  const sep=(first.match(/;/g)||[]).length >= (first.match(/,/g)||[]).length ? ';' : ',';
  const rows=[];let row=[];let cell='';let quote=false;
  for(let i=0;i<input.length;i++) {
    const c=input[i];
    if(c==='"') { if(quote && input[i+1]==='"'){cell+='"';i++;} else quote=!quote; }
    else if(c===sep&&!quote){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&input[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(cell || row.length){row.push(cell);if(row.some(x=>x.trim())) rows.push(row);}
  if(!rows.length) return [];
  const header=rows.shift().map(x=>x.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''));
  return rows.map(cols=>Object.fromEntries(header.map((h,i)=>[h,(cols[i]||'').trim()])));
}
function importCsv(txt) {
  const entries=parseCsv(txt);
  let added=0;
  entries.forEach(entry=>{
    const type=validTypes.find(t=>t.toLowerCase()===String(entry.tipo||'').toLowerCase())||'Outro';
    const item=sanitiseRecord({type,start:entry.inicio,end:entry.fim,route:entry.trajeto,note:entry.nota},'roster');
    if(item){data.roster.push(item);added++;}
  });
  if(added){store();navigate('roster');}notice(`${added} ${added===1?'serviço importado':'serviços importados'}. ${entries.length-added} linhas ignoradas.`);
}
async function importJson(file) {
  const txt=await file.text();
  const parsed=JSON.parse(txt);
  if(!parsed || typeof parsed!=='object' || !Array.isArray(parsed.roster) || !Array.isArray(parsed.flights) || !Array.isArray(parsed.notes))throw Error('Backup inválido.');
  if(!confirm('Esta operação substitui todos os teus dados atuais. Continuar?'))return;
  data={roster:parsed.roster.slice(0,2500).map(x=>sanitiseRecord(x,'roster')).filter(Boolean),flights:parsed.flights.slice(0,5000).map(x=>sanitiseRecord(x,'flights')).filter(Boolean),notes:parsed.notes.slice(0,1500).map(x=>sanitiseRecord(x,'notes')).filter(Boolean),settings:{fontSize:['normal','grande','extra'].includes(parsed.settings?.fontSize)?parsed.settings.fontSize:'normal'}};
  store();navigate('home');notice('Cópia de segurança importada com sucesso.');
}
function formAsObject(form) {return Object.fromEntries(new FormData(form).entries());}
root.addEventListener('submit', event => {
  const form=event.target;
  if(!['roster-form','flight-form','note-form'].includes(form.id))return;
  event.preventDefault();
  const value=formAsObject(form);
  const existingId=form.dataset.id;
  let kind, item;
  if(form.id==='roster-form') {
    kind='roster'; item=sanitiseRecord({ id:existingId||id(), type:value.type,start:value.start,end:value.end,route:value.route,note:value.note }, kind);
    if(!item){notice('Verifica as datas: o fim deve ser posterior ao início.');return;}
  } else if(form.id==='flight-form') {
    kind='flights';const minutes=toMinutes(value.duration);
    if(minutes===null||minutes<1||minutes>7200){notice('Indica uma duração válida, por exemplo 02:35.');return;}
    item=sanitiseRecord({id:existingId||id(),date:value.date,from:value.from,to:value.to,minutes,aircraft:value.aircraft,note:value.note},kind);
    if(!item){notice('Indica uma data e códigos de aeroporto com 3 ou 4 letras.');return;}
  } else {
    kind='notes';item=sanitiseRecord({id:existingId||id(),city:value.city,title:value.title,details:value.details},kind);
    if(!item){notice('Indica uma cidade.');return;}
  }
  const index=data[kind].findIndex(x=>x.id===item.id);
  if(index>=0)data[kind][index]=item;else data[kind].push(item);
  store();ui.editing=null;render();notice('Guardado com sucesso.');
});
root.addEventListener('click', async event => {
  const button=event.target.closest('[data-action]');
  if(!button)return;
  const action=button.dataset.action;
  if(action==='navigate'){navigate(button.dataset.screen);return;}
  if(action==='cancel-edit'){ui.editing=null;render();return;}
  if(action==='add-roster'||action==='add-flight'||action==='add-note'){
    const kind=action==='add-roster'?'roster':action==='add-flight'?'flights':'notes';ui.editing={kind,id:null};ui.screen=kind==='roster'?'roster':kind==='flights'?'logbook':'notes';render();return;
  }
  if(action.startsWith('edit-')){
    const kind=action==='edit-roster'?'roster':action==='edit-flight'?'flights':'notes';
    ui.editing={kind,id:button.dataset.id};ui.screen=kind==='roster'?'roster':kind==='flights'?'logbook':'notes';render();return;
  }
  if(action.startsWith('delete-')){
    const kind=action==='delete-roster'?'roster':action==='delete-flight'?'flights':'notes';
    if(confirm('Queres mesmo apagar este registo?')){data[kind]=data[kind].filter(x=>x.id!==button.dataset.id);store();render();notice('Registo apagado.');}return;
  }
  if(action==='prev-month'||action==='next-month'){const d=new Date(ui.year,ui.month+(action==='next-month'?1:-1),1);ui.year=d.getFullYear();ui.month=d.getMonth();ui.filter='Todos';render();return;}
  if(action==='select-day'){ui.filter=button.dataset.day;render();return;}
  if(action==='clear-day'){ui.filter='Todos';render();return;}
  if(action==='font-size'){data.settings.fontSize=button.dataset.size;store();render();return;}
  if(action==='csv-template'){
    download('Escalas_Modelo_Cesar_Ricardo.csv','\uFEFFtipo;inicio;fim;trajeto;nota\r\nVoo;2026-11-03T09:30;2026-11-03T16:00;LIS - PAR;EXEMPLO FICTÍCIO\r\n','text/csv;charset=utf-8');notice('Modelo CSV exportado.');return;
  }
  if(action==='import-csv'){document.getElementById('import-csv-input').click();return;}
  if(action==='import-json'){document.getElementById('import-json-input').click();return;}
  if(action==='export-ics'){exportIcs();return;}
  if(action==='export-flights-csv'){exportFlights();return;}
  if(action==='export-json'){
    download(`Cesar_Ricardo_Backup_${dateLocal()}.json`,JSON.stringify({ ...data,exportedAt:new Date().toISOString(),app:APP_NAME,version:APP_VERSION },null,2),'application/json;charset=utf-8');notice('Cópia de segurança exportada.');return;
  }
  if(action==='clear-all'){
    if(confirm('Apagar TODOS os serviços, voos e notas guardados neste dispositivo? Não pode ser desfeito sem uma cópia de segurança.')){data=defaultData();store();navigate('home');notice('Dados pessoais apagados.');}return;
  }
  if(action==='print-gift'){window.print();return;}
  if(action==='share-gift'){
    const msg=`César Ricardo — ${MOTTO} ✈️ Sempre 20 anos!`;
    try{if(navigator.share)await navigator.share({text:msg,title:'Almeida Tavares Air Force — Sempre no Ar'});else if(navigator.clipboard) {await navigator.clipboard.writeText(msg);notice('Mensagem copiada.');}else notice('Partilha não disponível neste dispositivo.');}
    catch(err){if(err.name!=='AbortError')notice('Não foi possível partilhar.');}return;
  }
});
root.addEventListener('change', async event => {
  const input=event.target;
  if(input.id==='import-csv-input'&&input.files?.[0]){
    try{if(input.files[0].size>2_000_000)throw Error('Ficheiro demasiado grande.');importCsv(await input.files[0].text());}
    catch(e){notice(e.message||'Falha na leitura do CSV.');}finally{input.value='';}
  }
  if(input.id==='import-json-input'&&input.files?.[0]){
    try{if(input.files[0].size>4_000_000)throw Error('Ficheiro demasiado grande.');await importJson(input.files[0]);}
    catch(e){notice(e.message||'Falha na importação do backup.');}finally{input.value='';}
  }
});
window.addEventListener('beforeinstallprompt', event => {event.preventDefault();deferredInstall=event;});
render();
setInterval(updateClocks,1000);
if('serviceWorker' in navigator && location.protocol!=='file:') {
  window.addEventListener('load',()=>navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(()=>{}));
}
