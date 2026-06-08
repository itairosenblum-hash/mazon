// ─────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────
const THEME_KEY = 'catering_theme';

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeLabel(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  updateThemeLabel(next);
  if (currentPage === 'dashboard') renderDashboard();
}

function updateThemeLabel(theme) {
  const el = document.getElementById('themeLabel');
  if (el) el.textContent = theme === 'dark' ? 'מצב כהה' : 'מצב בהיר';
  updateTopbarTheme(theme);
}

initTheme();

// ─────────────────────────────────────────────
// MOBILE DRAWER
// ─────────────────────────────────────────────
function toggleDrawer() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('drawerOverlay');
  const isOpen = sidebar.classList.contains('open');
  if (isOpen) closeDrawer();
  else { sidebar.classList.add('open'); overlay.classList.add('open'); }
}
function closeDrawer() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
}
function updateTopbarTheme(theme) {
  const btn = document.querySelector('.topbar-theme');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ─────────────────────────────────────────────
// ROLE EMOJIS
// ─────────────────────────────────────────────
const ROLE_EMOJIS = {
  'שף': '👨‍🍳', 'טבח': '🧑‍🍳', 'קונדיטור': '🎂',
  'חדר אוכל': '🍽', 'שוטף כלים': '🫧', 'מנהל תחנה': '📋',
};
function roleEmoji(role) { return ROLE_EMOJIS[role] || '👤'; }

// ─────────────────────────────────────────────
// STATE & PERSISTENCE
// ─────────────────────────────────────────────
const STORAGE_KEY = 'catering_tracker_v1';
const SESSION_KEY = 'catering_session';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return defaultState();
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function defaultState() {
  return {
    roles: ['שף', 'טבח', 'קונדיטור', 'חדר אוכל', 'שוטף כלים', 'מנהל תחנה'],
    stations: [
      { id: 's1', name: 'מטבח תל אביב מרכז', minStaff: { 'שף':1,'טבח':2,'קונדיטור':1,'חדר אוכל':3,'שוטף כלים':1,'מנהל תחנה':1 } },
      { id: 's2', name: 'מטבח רמת גן',       minStaff: { 'שף':1,'טבח':2,'קונדיטור':1,'חדר אוכל':2,'שוטף כלים':1,'מנהל תחנה':1 } },
      { id: 's3', name: 'מטבח ירושלים',      minStaff: { 'שף':1,'טבח':1,'קונדיטור':0,'חדר אוכל':2,'שוטף כלים':1,'מנהל תחנה':1 } },
    ],
    users: [
      { id: 'u0', username: 'admin', password: 'admin123', role: 'admin', name: 'מנהל ראשי', stationIds: [] },
    ],
    entries: []
  };
}

let state = loadState();

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
let currentUser = null;

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const uid = JSON.parse(raw);
      currentUser = state.users.find(u => u.id === uid) || null;
    }
  } catch(e) {}
}

function saveSession() {
  if (currentUser) sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser.id));
  else sessionStorage.removeItem(SESSION_KEY);
}

function isAdmin() { return currentUser && currentUser.role === 'admin'; }

function login(username, password) {
  const user = state.users.find(u => u.username === username && u.password === password);
  if (!user) return false;
  currentUser = user;
  saveSession();
  return true;
}

function logout() {
  currentUser = null;
  saveSession();
  showLoginScreen();
}

// ─────────────────────────────────────────────
// LOGIN SCREEN
// ─────────────────────────────────────────────
function showLoginScreen() {
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginError').textContent = '';
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  setTimeout(() => document.getElementById('loginUsername').focus(), 100);
}

function showAppShell() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';
  updateUserBadge();
  updateNavForRole();
}

function updateUserBadge() {
  const el = document.getElementById('userBadge');
  if (!el || !currentUser) return;
  el.textContent = currentUser.name + (isAdmin() ? ' 👑' : ' 👤');
}

function updateNavForRole() {
  // Admin sees everything; station user sees limited nav
  const adminOnly = document.querySelectorAll('[data-admin-only]');
  adminOnly.forEach(el => {
    el.style.display = isAdmin() ? '' : 'none';
  });

  // If station user, pre-lock the station selector in entry
  if (!isAdmin() && currentUser.stationIds && currentUser.stationIds.length === 1) {
    // will be handled in renderEntry
  }
}

document.getElementById('loginBtn').addEventListener('click', doLogin);
document.getElementById('loginPassword').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});
document.getElementById('loginUsername').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('loginPassword').focus();
});

function doLogin() {
  const u = document.getElementById('loginUsername').value.trim();
  const p = document.getElementById('loginPassword').value;
  if (!u || !p) { document.getElementById('loginError').textContent = 'יש להזין שם משתמש וסיסמה'; return; }
  if (login(u, p)) {
    showAppShell();
    navigate('dashboard');
  } else {
    document.getElementById('loginError').textContent = 'שם משתמש או סיסמה שגויים';
    document.getElementById('loginPassword').value = '';
  }
}

document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('logoutBtnMobile').addEventListener('click', logout);

// ─────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────
let currentPage = 'dashboard';
let editingStationId = null;

function navigate(page) {
  // Non-admin: block admin-only pages
  if (!isAdmin() && ['stations','settings','users'].includes(page)) {
    page = 'dashboard';
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  const link = document.querySelector(`[data-page="${page}"]`);
  if (link) link.classList.add('active');
  currentPage = page;
  renderPage(page);
}

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    navigate(link.dataset.page);
    closeDrawer();
    document.querySelectorAll('.bottom-nav-item').forEach(b =>
      b.classList.toggle('active', b.dataset.page === link.dataset.page));
  });
});

// ─────────────────────────────────────────────
// RENDER DISPATCHER
// ─────────────────────────────────────────────
function renderPage(page) {
  if (page === 'dashboard') renderDashboard();
  if (page === 'entry')     renderEntry();
  if (page === 'history')   renderHistory();
  if (page === 'stations')  renderStations();
  if (page === 'settings')  renderSettings();
  if (page === 'users')     renderUsers();
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function uid() { return 'u' + Math.random().toString(36).slice(2, 9); }
function formatDate(d) {
  if (!d) return '';
  const [y,m,day] = d.split('-');
  return `${day}/${m}/${y}`;
}
function today() { return new Date().toISOString().slice(0,10); }
function getStation(id) { return state.stations.find(s => s.id === id); }

function allowedStations() {
  if (isAdmin()) return state.stations;
  if (!currentUser) return [];
  if (!currentUser.stationIds || currentUser.stationIds.length === 0) return [];
  return state.stations.filter(s => currentUser.stationIds.includes(s.id));
}

function entriesInPeriod(days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  let entries = state.entries.filter(e => new Date(e.date) >= cutoff);
  if (!isAdmin()) entries = entries.filter(e => currentUser.stationIds.includes(e.stationId));
  return entries;
}
function totalForEntry(entry) {
  return Object.values(entry.counts || {}).reduce((a,b) => a+b, 0);
}

function getChartColors() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  return {
    grid: isDark ? '#2a2a2a' : '#e8e0d0',
    tick: isDark ? '#9a9690' : '#6b5f4e',
    palette: ['#e8c547','#52c07a','#5aa0e0','#9b7fe8','#e05252','#e07a3a','#3acbb0','#c07a52'],
  };
}

// ─────────────────────────────────────────────
// SIDEBAR DATE
// ─────────────────────────────────────────────
function updateSidebarDate() {
  const d = new Date();
  const days = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
  const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  const el = document.getElementById('sidebarDate');
  if (el) el.textContent = `יום ${days[d.getDay()]}\n${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
updateSidebarDate();

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────
let chartStation=null, chartRole=null, chartTrend=null;

function renderDashboard() {
  const period = parseInt(document.getElementById('dashboardPeriod').value) || 30;
  document.getElementById('chartPeriodLabel').textContent = period + ' ימים';
  const entries = entriesInPeriod(period);
  const C = getChartColors();
  const visibleStations = isAdmin() ? state.stations : allowedStations();

  const totalPresence = entries.reduce((s,e) => s + totalForEntry(e), 0);
  const avgPerDay = (totalPresence / period).toFixed(1);
  const stationsActive = new Set(entries.map(e => e.stationId)).size;

  let compliant=0, total=0;
  entries.forEach(entry => {
    const station = getStation(entry.stationId);
    if (!station) return;
    state.roles.forEach(role => {
      const min = (station.minStaff||{})[role]||0;
      if (min > 0) { total++; if ((entry.counts[role]||0) >= min) compliant++; }
    });
  });
  const compliancePct = total ? Math.round((compliant/total)*100) : 100;
  const compColor = compliancePct>=90 ? '#52c07a' : compliancePct>=70 ? '#e07a3a' : '#e05252';

  const cards = [
    { label: 'סה"כ עובדים', value: totalPresence, sub: period+' ימים', color:'#e8c547', icon:'🍽' },
    { label: 'ממוצע ליום',  value: avgPerDay,     sub: 'כלל התחנות',  color:'#5aa0e0', icon:'📅' },
    { label: 'תחנות פעילות',value: stationsActive+'/'+visibleStations.length, sub:'דיווחו', color:'#9b7fe8', icon:'🏪' },
    { label: 'עמידה בדרישות',value: compliancePct+'%', sub:'מינימום כ"א', color:compColor, icon:'✅' },
  ];

  document.getElementById('summaryCards').innerHTML = cards.map(c=>`
    <div class="summary-card" style="--card-color:${c.color}">
      <div class="summary-label">${c.label}</div>
      <div class="summary-value">${c.value}</div>
      <div class="summary-sub">${c.sub}</div>
      <div class="food-deco">${c.icon}</div>
    </div>`).join('');

  const stationTotals = visibleStations.map(s=>({
    name: s.name,
    total: entries.filter(e=>e.stationId===s.id).reduce((sum,e)=>sum+totalForEntry(e),0)
  }));
  destroyChart(chartStation);
  chartStation = new Chart(document.getElementById('chartByStation'),{
    type:'bar',
    data:{ labels:stationTotals.map(s=>s.name), datasets:[{
      label:'נוכחות', data:stationTotals.map(s=>s.total),
      backgroundColor:C.palette.map(c=>c+'bb'), borderColor:C.palette, borderWidth:1, borderRadius:5
    }]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{ x:{ticks:{color:C.tick,font:{family:'Heebo'}},grid:{color:C.grid}}, y:{ticks:{color:C.tick},grid:{color:C.grid}} }
    }
  });

  const roleTotals = state.roles.map(role=>({
    role, emoji:roleEmoji(role),
    total:entries.reduce((s,e)=>s+(e.counts[role]||0),0)
  })).filter(r=>r.total>0);
  destroyChart(chartRole);
  chartRole = new Chart(document.getElementById('chartByRole'),{
    type:'doughnut',
    data:{ labels:roleTotals.map(r=>r.emoji+' '+r.role), datasets:[{
      data:roleTotals.map(r=>r.total),
      backgroundColor:roleTotals.map((_,i)=>C.palette[i%C.palette.length]+'bb'),
      borderColor: document.documentElement.getAttribute('data-theme')==='light'?'#ffffff':'#161616',
      borderWidth:2, hoverOffset:6
    }]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:true,position:'bottom',labels:{color:C.tick,font:{family:'Heebo',size:11},padding:8,boxWidth:12}}}
    }
  });

  const daysArr = [];
  for (let i=period-1;i>=0;i--) { const d=new Date(); d.setDate(d.getDate()-i); daysArr.push(d.toISOString().slice(0,10)); }
  const trendData = daysArr.map(date=>({
    date,
    total: entries.filter(e=>e.date===date).reduce((s,e)=>s+totalForEntry(e),0)
  }));
  destroyChart(chartTrend);
  chartTrend = new Chart(document.getElementById('chartTrend'),{
    type:'line',
    data:{ labels:daysArr.map(d=>formatDate(d)), datasets:[{
      label:'עובדים', data:trendData.map(d=>d.total),
      borderColor:'#e8c547', backgroundColor:'rgba(232,197,71,0.07)',
      fill:true, tension:0.35, pointRadius:3, pointBackgroundColor:'#e8c547'
    }]},
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{ x:{ticks:{color:C.tick,maxTicksLimit:10,font:{family:'Heebo'}},grid:{color:C.grid}}, y:{ticks:{color:C.tick},grid:{color:C.grid}} }
    }
  });

  document.getElementById('stationSummaryTable').innerHTML = `<table>
    <thead><tr><th>תחנה</th>${state.roles.map(r=>`<th>${roleEmoji(r)} ${r}</th>`).join('')}<th>סה"כ</th><th>ציות</th></tr></thead>
    <tbody>${visibleStations.map(station=>{
      const stEntries=entries.filter(e=>e.stationId===station.id);
      const roleSums={}; let sTotal=0, sC=0, sR=0;
      state.roles.forEach(role=>{
        const sum=stEntries.reduce((s,e)=>s+(e.counts[role]||0),0);
        roleSums[role]=sum; sTotal+=sum;
        const min=(station.minStaff||{})[role]||0;
        if(min>0){sR++;if(sum/Math.max(stEntries.length,1)>=min)sC++;}
      });
      const pct=sR?Math.round((sC/sR)*100):100;
      const cls=pct>=90?'badge-ok':pct>=70?'badge-warn':'badge-danger';
      return `<tr><td><strong>${station.name}</strong></td>${state.roles.map(r=>`<td>${roleSums[r]||0}</td>`).join('')}<td><strong>${sTotal}</strong></td><td><span class="badge ${cls}">${pct}%</span></td></tr>`;
    }).join('')}</tbody></table>`;
}

function destroyChart(chart) { if(chart){try{chart.destroy();}catch(e){}} }
document.getElementById('dashboardPeriod').addEventListener('change', renderDashboard);

// ─────────────────────────────────────────────
// ENTRY PAGE
// ─────────────────────────────────────────────
function renderEntry() {
  const dateInput = document.getElementById('entryDate');
  if (!dateInput.value) dateInput.value = today();

  const allowed = allowedStations();
  const stationSel = document.getElementById('entryStation');
  const prevVal = stationSel.value;

  if (!isAdmin() && allowed.length === 1) {
    // Single-station user: lock the dropdown
    stationSel.innerHTML = `<option value="${allowed[0].id}">${allowed[0].name}</option>`;
    stationSel.disabled = true;
  } else {
    stationSel.disabled = false;
    stationSel.innerHTML = '<option value="">— בחר תחנה —</option>' +
      allowed.map(s=>`<option value="${s.id}"${s.id===prevVal?' selected':''}>${s.name}</option>`).join('');
  }

  renderRoleInputs();
  renderRecentEntries();
}

function renderRoleInputs() {
  const stationId = document.getElementById('entryStation').value;
  const station = getStation(stationId);
  const container = document.getElementById('entryRoles');
  if (!stationId) {
    container.innerHTML = '<div class="empty-state"><span class="emoji">👆</span>בחר תחנה להזנת נוכחות</div>';
    return;
  }
  const date = document.getElementById('entryDate').value;
  const existing = state.entries.find(e=>e.stationId===stationId && e.date===date);
  container.innerHTML = state.roles.map(role=>{
    const min = station?((station.minStaff||{})[role]||0):0;
    const val = existing?(existing.counts[role]||0):'';
    return `<div class="role-input-card">
      <div class="role-input-info">
        <span class="role-emoji">${roleEmoji(role)}</span>
        <div><div class="role-name">${role}</div>${min>0?`<div class="role-required">מינימום: ${min}</div>`:''}</div>
      </div>
      <input class="role-count-input" type="number" min="0" max="99" value="${val}" placeholder="0" data-role="${role}" />
    </div>`;
  }).join('');
}

document.getElementById('entryStation').addEventListener('change', renderRoleInputs);
document.getElementById('entryDate').addEventListener('change', renderRoleInputs);

document.getElementById('btnSaveEntry').addEventListener('click', ()=>{
  const date = document.getElementById('entryDate').value;
  const stationId = document.getElementById('entryStation').value;
  if (!date||!stationId) { showMsg('saveMsg','יש לבחור תאריך ותחנה','#e05252'); return; }
  if (!isAdmin() && !currentUser.stationIds.includes(stationId)) {
    showMsg('saveMsg','אין הרשאה לתחנה זו','#e05252'); return;
  }
  const counts={};
  document.querySelectorAll('.role-count-input').forEach(input=>{
    counts[input.dataset.role]=parseInt(input.value)||0;
  });
  state.entries = state.entries.filter(e=>!(e.stationId===stationId && e.date===date));
  state.entries.push({ id:'e'+Date.now(), date, stationId, counts, byUser: currentUser.id });
  saveState();
  showMsg('saveMsg','✓ הנוכחות נשמרה בהצלחה');
  renderRecentEntries();
});

function showMsg(id,msg,color='#52c07a') {
  const el=document.getElementById(id);
  el.style.color=color; el.textContent=msg;
  setTimeout(()=>{ el.textContent=''; },3000);
}

function renderRecentEntries() {
  const sorted=[...state.entries].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10);
  const container=document.getElementById('recentEntries');
  if(!sorted.length){container.innerHTML='<div class="empty-state"><span class="emoji">📭</span>אין הזנות עדיין</div>';return;}
  container.innerHTML=sorted.map(e=>{
    const s=getStation(e.stationId);
    const entryUser=state.users.find(u=>u.id===e.byUser);
    const pills=state.roles.filter(r=>e.counts[r]>0)
      .map(r=>`<span class="role-pill">${roleEmoji(r)} ${r}: ${e.counts[r]}</span>`).join('');
    return `<div class="recent-entry">
      <div>
        <div class="recent-entry-station">${s?s.name:'?'}</div>
        <div class="recent-entry-info">${formatDate(e.date)} • סה"כ: ${totalForEntry(e)}${entryUser?' • '+entryUser.name:''}</div>
      </div>
      <div class="recent-roles-pills">${pills}</div>
    </div>`;
  }).join('');
}

// ─────────────────────────────────────────────
// HISTORY PAGE
// ─────────────────────────────────────────────
function renderHistory() {
  const stationSel=document.getElementById('historyStation');
  const prevSt=stationSel.value;
  const allowed=allowedStations();
  stationSel.innerHTML='<option value="">כל התחנות</option>'+
    allowed.map(s=>`<option value="${s.id}"${s.id===prevSt?' selected':''}>${s.name}</option>`).join('');
  const monthInput=document.getElementById('historyMonth');
  if(!monthInput.value){const now=new Date();monthInput.value=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;}
  renderHistoryTable();
}

function renderHistoryTable() {
  const stationId=document.getElementById('historyStation').value;
  const month=document.getElementById('historyMonth').value;
  let filtered=[...state.entries];
  if(!isAdmin()) filtered=filtered.filter(e=>currentUser.stationIds.includes(e.stationId));
  if(stationId) filtered=filtered.filter(e=>e.stationId===stationId);
  if(month) filtered=filtered.filter(e=>e.date.startsWith(month));
  filtered.sort((a,b)=>b.date.localeCompare(a.date));
  const container=document.getElementById('historyTable');
  if(!filtered.length){container.innerHTML='<div class="empty-state"><span class="emoji">🔍</span>אין נתונים לתקופה זו</div>';return;}
  container.innerHTML=`<div class="chart-card full" style="margin-top:0"><table>
    <thead><tr><th>תאריך</th><th>תחנה</th>${state.roles.map(r=>`<th>${roleEmoji(r)} ${r}</th>`).join('')}<th>סה"כ</th></tr></thead>
    <tbody>${filtered.map(e=>{
      const s=getStation(e.stationId);
      return `<tr><td>${formatDate(e.date)}</td><td><strong>${s?s.name:'?'}</strong></td>${state.roles.map(r=>{
        const val=e.counts[r]||0;
        const min=s?((s.minStaff||{})[r]||0):0;
        const ok=min===0||val>=min;
        return `<td style="color:${val===0?'var(--text3)':ok?'var(--text)':'var(--red)'}">${val}</td>`;
      }).join('')}<td><strong>${totalForEntry(e)}</strong></td></tr>`;
    }).join('')}</tbody></table></div>`;
}

document.getElementById('historyStation').addEventListener('change', renderHistoryTable);
document.getElementById('historyMonth').addEventListener('change', renderHistoryTable);

// ─────────────────────────────────────────────
// STATIONS PAGE (admin only)
// ─────────────────────────────────────────────
function renderStations() {
  const container=document.getElementById('stationsList');
  if(!state.stations.length){container.innerHTML='<div class="empty-state"><span class="emoji">🏪</span>אין תחנות.</div>';return;}
  container.innerHTML=`<div class="stations-grid">${state.stations.map(s=>{
    const pills=state.roles.filter(r=>((s.minStaff||{})[r]||0)>0)
      .map(r=>`<span>${roleEmoji(r)} ${r}: ${s.minStaff[r]}</span>`).join('');
    return `<div class="station-card">
      <div class="station-card-name">🏪 ${s.name}</div>
      <div class="station-roles-mini">${pills||'<span style="color:var(--text3)">לא הוגדרו מינימומים</span>'}</div>
      <div class="station-card-actions">
        <button class="btn-icon" onclick="openStationModal('${s.id}')">✏ עריכה</button>
        <button class="btn-icon danger" onclick="deleteStation('${s.id}')">✕ מחק</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}

document.getElementById('btnAddStation').addEventListener('click',()=>openStationModal(null));

function openStationModal(stationId) {
  editingStationId=stationId;
  const station=stationId?getStation(stationId):null;
  document.getElementById('modalTitle').textContent=station?'עריכת תחנה':'תחנה חדשה';
  document.getElementById('modalStationName').value=station?station.name:'';
  document.getElementById('modalRolesMin').innerHTML=`<div class="roles-min-grid">${state.roles.map(role=>{
    const min=station?((station.minStaff||{})[role]||0):0;
    return `<label class="roles-min-label">${roleEmoji(role)} ${role}</label>
      <input class="roles-min-input" type="number" min="0" max="99" value="${min}" data-role="${role}" />`;
  }).join('')}</div>`;
  document.getElementById('stationModal').style.display='flex';
}

document.getElementById('btnSaveStation').addEventListener('click',()=>{
  const name=document.getElementById('modalStationName').value.trim();
  if(!name) return alert('יש להזין שם תחנה');
  const minStaff={};
  document.querySelectorAll('.roles-min-input').forEach(input=>{ minStaff[input.dataset.role]=parseInt(input.value)||0; });
  if(editingStationId){ const s=getStation(editingStationId); s.name=name; s.minStaff=minStaff; }
  else state.stations.push({id:'s'+Date.now(),name,minStaff});
  saveState(); closeStationModal(); renderStations();
});

document.getElementById('btnCancelStation').addEventListener('click',closeStationModal);
document.getElementById('stationModal').addEventListener('click',e=>{ if(e.target===document.getElementById('stationModal')) closeStationModal(); });
function closeStationModal(){ document.getElementById('stationModal').style.display='none'; editingStationId=null; }

function deleteStation(id){
  if(!confirm('למחוק תחנה זו?')) return;
  state.stations=state.stations.filter(s=>s.id!==id);
  saveState(); renderStations();
}

// ─────────────────────────────────────────────
// USERS PAGE (admin only)
// ─────────────────────────────────────────────
let editingUserId = null;

function renderUsers() {
  const container = document.getElementById('usersList');
  container.innerHTML = state.users.map(u => {
    const stationNames = u.role === 'admin'
      ? '<span class="badge badge-ok">כל התחנות</span>'
      : (u.stationIds||[]).map(sid => {
          const s = getStation(sid);
          return s ? `<span class="station-tag">${s.name}</span>` : '';
        }).join('') || '<span style="color:var(--text3)">ללא תחנה</span>';
    return `<div class="user-card">
      <div class="user-card-left">
        <div class="user-avatar">${u.name[0]}</div>
        <div>
          <div class="user-name">${u.name} ${u.role==='admin'?'👑':''}</div>
          <div class="user-username">@${u.username}</div>
          <div class="user-stations">${stationNames}</div>
        </div>
      </div>
      <div class="user-card-actions">
        <button class="btn-icon" onclick="openUserModal('${u.id}')">✏ עריכה</button>
        ${u.id!=='u0'?`<button class="btn-icon danger" onclick="deleteUser('${u.id}')">✕ מחק</button>`:''}
      </div>
    </div>`;
  }).join('');
}

document.getElementById('btnAddUser').addEventListener('click', ()=>openUserModal(null));

function openUserModal(userId) {
  editingUserId = userId;
  const user = userId ? state.users.find(u=>u.id===userId) : null;
  document.getElementById('userModalTitle').textContent = user ? 'עריכת משתמש' : 'משתמש חדש';
  document.getElementById('modalUserName').value = user ? user.name : '';
  document.getElementById('modalUserUsername').value = user ? user.username : '';
  document.getElementById('modalUserPassword').value = '';
  document.getElementById('modalUserPassword').placeholder = user ? 'השאר ריק לאי-שינוי' : 'סיסמה';
  document.getElementById('modalUserRole').value = user ? user.role : 'station';

  renderUserStationCheckboxes(user);
  document.getElementById('userModal').style.display = 'flex';
  toggleUserStationSection();
}

function renderUserStationCheckboxes(user) {
  const container = document.getElementById('modalUserStations');
  const selectedIds = user ? (user.stationIds||[]) : [];
  container.innerHTML = state.stations.map(s => `
    <label class="station-checkbox">
      <input type="checkbox" value="${s.id}" ${selectedIds.includes(s.id)?'checked':''} />
      ${s.name}
    </label>`).join('');
}

function toggleUserStationSection() {
  const role = document.getElementById('modalUserRole').value;
  document.getElementById('stationAssignSection').style.display = role === 'admin' ? 'none' : 'block';
}

document.getElementById('modalUserRole').addEventListener('change', toggleUserStationSection);

document.getElementById('btnSaveUser').addEventListener('click', ()=>{
  const name = document.getElementById('modalUserName').value.trim();
  const username = document.getElementById('modalUserUsername').value.trim();
  const password = document.getElementById('modalUserPassword').value;
  const role = document.getElementById('modalUserRole').value;
  const stationIds = role === 'admin' ? [] :
    [...document.querySelectorAll('#modalUserStations input:checked')].map(cb=>cb.value);

  if (!name || !username) { alert('יש למלא שם ושם משתמש'); return; }

  // Check duplicate username
  const dupCheck = state.users.find(u=>u.username===username && u.id!==editingUserId);
  if (dupCheck) { alert('שם משתמש כבר קיים'); return; }

  if (editingUserId) {
    const u = state.users.find(u=>u.id===editingUserId);
    u.name=name; u.username=username; u.role=role; u.stationIds=stationIds;
    if (password) u.password=password;
  } else {
    if (!password) { alert('יש להזין סיסמה'); return; }
    state.users.push({ id:'u'+Date.now(), username, password, role, name, stationIds });
  }
  saveState();
  closeUserModal();
  renderUsers();
});

document.getElementById('btnCancelUser').addEventListener('click', closeUserModal);
document.getElementById('userModal').addEventListener('click', e=>{
  if (e.target===document.getElementById('userModal')) closeUserModal();
});

function closeUserModal() {
  document.getElementById('userModal').style.display='none';
  editingUserId=null;
}

function deleteUser(id) {
  if (id==='u0') { alert('לא ניתן למחוק את מנהל הראשי'); return; }
  if (!confirm('למחוק משתמש זה?')) return;
  state.users=state.users.filter(u=>u.id!==id);
  saveState(); renderUsers();
}

// ─────────────────────────────────────────────
// SETTINGS PAGE (admin only)
// ─────────────────────────────────────────────
function renderSettings() {
  document.getElementById('rolesList').innerHTML = state.roles.map((role,i)=>`
    <div class="roles-list-item">
      <span><span class="r-emoji">${roleEmoji(role)}</span>${role}</span>
      <button class="btn-icon danger" style="padding:4px 10px;font-size:0.75rem" onclick="deleteRole(${i})">✕</button>
    </div>`).join('');
}

function deleteRole(index) {
  if(!confirm(`למחוק תפקיד "${state.roles[index]}"?`)) return;
  state.roles.splice(index,1); saveState(); renderSettings();
}

document.getElementById('btnAddRole').addEventListener('click',()=>{
  const input=document.getElementById('newRoleName');
  const name=input.value.trim();
  if(!name) return;
  if(state.roles.includes(name)){alert('תפקיד זה כבר קיים');return;}
  state.roles.push(name); saveState(); input.value=''; renderSettings();
});
document.getElementById('newRoleName').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('btnAddRole').click();});

document.getElementById('btnExport').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`catering_backup_${today()}.json`; a.click();
});
document.getElementById('btnImport').addEventListener('click',()=>{ document.getElementById('importFile').click(); });
document.getElementById('importFile').addEventListener('change',e=>{
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=ev=>{
    try {
      const imported=JSON.parse(ev.target.result);
      if(!imported.roles||!imported.stations) throw new Error('פורמט לא תקין');
      if(!confirm('ייבוא יחליף את כל הנתונים. להמשיך?')) return;
      state=imported; saveState(); alert('יובא בהצלחה!'); renderPage(currentPage);
    } catch(err){ alert('שגיאה: '+err.message); }
  };
  reader.readAsText(file); e.target.value='';
});
document.getElementById('btnReset').addEventListener('click',()=>{
  if(!confirm('למחוק את כל הנתונים?')) return;
  if(!confirm('בטוח?')) return;
  state=defaultState(); saveState(); renderPage(currentPage); alert('נמחק.');
});

// ─────────────────────────────────────────────
// BOTTOM NAV
// ─────────────────────────────────────────────
document.querySelectorAll('.bottom-nav-item').forEach(btn=>{
  btn.addEventListener('click',()=>{
    navigate(btn.dataset.page);
    document.querySelectorAll('.bottom-nav-item').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    closeDrawer();
  });
});

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
loadSession();
if (currentUser) { showAppShell(); navigate('dashboard'); }
else showLoginScreen();
