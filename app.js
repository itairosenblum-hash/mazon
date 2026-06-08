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
  if (isOpen) { closeDrawer(); } else {
    sidebar.classList.add('open');
    overlay.classList.add('open');
  }
}
function closeDrawer() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
}

// Update topbar theme icon
function updateTopbarTheme(theme) {
  const btn = document.querySelector('.topbar-theme');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}


// ─────────────────────────────────────────────
// ROLE EMOJIS
// ─────────────────────────────────────────────
const ROLE_EMOJIS = {
  'שף': '👨‍🍳',
  'טבח': '🧑‍🍳',
  'קונדיטור': '🎂',
  'חדר אוכל': '🍽',
  'שוטף כלים': '🫧',
  'מנהל תחנה': '📋',
};
function roleEmoji(role) {
  return ROLE_EMOJIS[role] || '👤';
}

// ─────────────────────────────────────────────
// STATE & PERSISTENCE
// ─────────────────────────────────────────────
const STORAGE_KEY = 'catering_tracker_v1';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return defaultState();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function defaultState() {
  return {
    roles: ['שף', 'טבח', 'קונדיטור', 'חדר אוכל', 'שוטף כלים', 'מנהל תחנה'],
    stations: [
      { id: 's1', name: 'מטבח תל אביב מרכז', minStaff: { 'שף': 1, 'טבח': 2, 'קונדיטור': 1, 'חדר אוכל': 3, 'שוטף כלים': 1, 'מנהל תחנה': 1 } },
      { id: 's2', name: 'מטבח רמת גן',       minStaff: { 'שף': 1, 'טבח': 2, 'קונדיטור': 1, 'חדר אוכל': 2, 'שוטף כלים': 1, 'מנהל תחנה': 1 } },
      { id: 's3', name: 'מטבח ירושלים',      minStaff: { 'שף': 1, 'טבח': 1, 'קונדיטור': 0, 'חדר אוכל': 2, 'שוטף כלים': 1, 'מנהל תחנה': 1 } },
    ],
    entries: []
  };
}

let state = loadState();

// ─────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────
let currentPage = 'dashboard';
let editingStationId = null;

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  currentPage = page;
  renderPage(page);
}

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    navigate(link.dataset.page);
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
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function uid() { return 's' + Math.random().toString(36).slice(2, 9); }
function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}
function today() { return new Date().toISOString().slice(0, 10); }
function getStation(id) { return state.stations.find(s => s.id === id); }
function entriesInPeriod(days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return state.entries.filter(e => new Date(e.date) >= cutoff);
}
function totalForEntry(entry) {
  return Object.values(entry.counts || {}).reduce((a, b) => a + b, 0);
}

// chart colors — dark/light aware
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
  document.getElementById('sidebarDate').textContent =
    `יום ${days[d.getDay()]}\n${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
updateSidebarDate();

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────
let chartStation = null, chartRole = null, chartTrend = null;

function renderDashboard() {
  const period = parseInt(document.getElementById('dashboardPeriod').value) || 30;
  document.getElementById('chartPeriodLabel').textContent = period + ' ימים';
  const entries = entriesInPeriod(period);
  const C = getChartColors();

  const totalPresence = entries.reduce((s, e) => s + totalForEntry(e), 0);
  const avgPerDay = entries.length ? (totalPresence / period).toFixed(1) : 0;
  const stationsActive = new Set(entries.map(e => e.stationId)).size;

  let compliant = 0, total = 0;
  entries.forEach(entry => {
    const station = getStation(entry.stationId);
    if (!station) return;
    state.roles.forEach(role => {
      const min = (station.minStaff || {})[role] || 0;
      if (min > 0) {
        total++;
        if ((entry.counts[role] || 0) >= min) compliant++;
      }
    });
  });
  const compliancePct = total ? Math.round((compliant / total) * 100) : 100;
  const compColor = compliancePct >= 90 ? '#52c07a' : compliancePct >= 70 ? '#e07a3a' : '#e05252';

  const cards = [
    { label: 'סה"כ עובדים', value: totalPresence, sub: period + ' ימים', color: '#e8c547', icon: '🍽' },
    { label: 'ממוצע ליום', value: avgPerDay, sub: 'כלל התחנות', color: '#5aa0e0', icon: '📅' },
    { label: 'תחנות פעילות', value: stationsActive + '/' + state.stations.length, sub: 'דיווחו בתקופה', color: '#9b7fe8', icon: '🏪' },
    { label: 'עמידה בדרישות', value: compliancePct + '%', sub: 'כוח אדם מינימלי', color: compColor, icon: '✅' },
  ];

  document.getElementById('summaryCards').innerHTML = cards.map(c => `
    <div class="summary-card" style="--card-color:${c.color}">
      <div class="summary-label">${c.label}</div>
      <div class="summary-value">${c.value}</div>
      <div class="summary-sub">${c.sub}</div>
      <div class="food-deco">${c.icon}</div>
    </div>`).join('');

  // Bar chart by station
  const stationTotals = state.stations.map(s => ({
    name: s.name,
    total: entries.filter(e => e.stationId === s.id).reduce((sum, e) => sum + totalForEntry(e), 0)
  }));
  destroyChart(chartStation);
  chartStation = new Chart(document.getElementById('chartByStation'), {
    type: 'bar',
    data: {
      labels: stationTotals.map(s => s.name),
      datasets: [{
        label: 'נוכחות',
        data: stationTotals.map(s => s.total),
        backgroundColor: C.palette.map(c => c + 'bb'),
        borderColor: C.palette,
        borderWidth: 1,
        borderRadius: 5
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: C.tick, font: { family: 'Heebo' } }, grid: { color: C.grid } },
        y: { ticks: { color: C.tick }, grid: { color: C.grid } }
      }
    }
  });

  // Doughnut by role
  const roleTotals = state.roles.map(role => ({
    role, emoji: roleEmoji(role),
    total: entries.reduce((s, e) => s + (e.counts[role] || 0), 0)
  })).filter(r => r.total > 0);

  destroyChart(chartRole);
  chartRole = new Chart(document.getElementById('chartByRole'), {
    type: 'doughnut',
    data: {
      labels: roleTotals.map(r => r.emoji + ' ' + r.role),
      datasets: [{
        data: roleTotals.map(r => r.total),
        backgroundColor: roleTotals.map((_, i) => C.palette[i % C.palette.length] + 'bb'),
        borderColor: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#161616',
        borderWidth: 2,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true, position: 'bottom',
          labels: { color: C.tick, font: { family: 'Heebo', size: 11 }, padding: 8, boxWidth: 12 }
        }
      }
    }
  });

  // Line trend
  const days = [];
  for (let i = period - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const trendData = days.map(date => ({
    date,
    total: state.entries.filter(e => e.date === date).reduce((s, e) => s + totalForEntry(e), 0)
  }));

  destroyChart(chartTrend);
  chartTrend = new Chart(document.getElementById('chartTrend'), {
    type: 'line',
    data: {
      labels: days.map(d => formatDate(d)),
      datasets: [{
        label: 'עובדים',
        data: trendData.map(d => d.total),
        borderColor: '#e8c547',
        backgroundColor: 'rgba(232,197,71,0.07)',
        fill: true, tension: 0.35,
        pointRadius: 3, pointBackgroundColor: '#e8c547'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: C.tick, maxTicksLimit: 10, font: { family: 'Heebo' } }, grid: { color: C.grid } },
        y: { ticks: { color: C.tick }, grid: { color: C.grid } }
      }
    }
  });

  // Summary table
  document.getElementById('stationSummaryTable').innerHTML = `<table>
    <thead><tr>
      <th>תחנה</th>
      ${state.roles.map(r => `<th>${roleEmoji(r)} ${r}</th>`).join('')}
      <th>סה"כ</th><th>ציות</th>
    </tr></thead>
    <tbody>
    ${state.stations.map(station => {
      const stEntries = entries.filter(e => e.stationId === station.id);
      const roleSums = {}; let sTotal = 0, sCompliant = 0, sReqTotal = 0;
      state.roles.forEach(role => {
        const sum = stEntries.reduce((s, e) => s + (e.counts[role] || 0), 0);
        roleSums[role] = sum; sTotal += sum;
        const min = (station.minStaff || {})[role] || 0;
        if (min > 0) { sReqTotal++; if (sum / Math.max(stEntries.length, 1) >= min) sCompliant++; }
      });
      const pct = sReqTotal ? Math.round((sCompliant / sReqTotal) * 100) : 100;
      const cls = pct >= 90 ? 'badge-ok' : pct >= 70 ? 'badge-warn' : 'badge-danger';
      return `<tr>
        <td><strong>${station.name}</strong></td>
        ${state.roles.map(r => `<td>${roleSums[r] || 0}</td>`).join('')}
        <td><strong>${sTotal}</strong></td>
        <td><span class="badge ${cls}">${pct}%</span></td>
      </tr>`;
    }).join('')}
    </tbody>
  </table>`;
}

function destroyChart(chart) {
  if (chart) { try { chart.destroy(); } catch(e) {} }
}

document.getElementById('dashboardPeriod').addEventListener('change', renderDashboard);

// ─────────────────────────────────────────────
// ENTRY PAGE
// ─────────────────────────────────────────────
function renderEntry() {
  const dateInput = document.getElementById('entryDate');
  if (!dateInput.value) dateInput.value = today();

  const stationSel = document.getElementById('entryStation');
  const prevVal = stationSel.value;
  stationSel.innerHTML = '<option value="">— בחר תחנה —</option>' +
    state.stations.map(s => `<option value="${s.id}"${s.id === prevVal ? ' selected' : ''}>${s.name}</option>`).join('');

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
  const existing = state.entries.find(e => e.stationId === stationId && e.date === date);

  container.innerHTML = state.roles.map(role => {
    const min = station ? ((station.minStaff || {})[role] || 0) : 0;
    const val = existing ? (existing.counts[role] || 0) : '';
    return `<div class="role-input-card">
      <div class="role-input-info">
        <span class="role-emoji">${roleEmoji(role)}</span>
        <div>
          <div class="role-name">${role}</div>
          ${min > 0 ? `<div class="role-required">מינימום: ${min}</div>` : ''}
        </div>
      </div>
      <input class="role-count-input" type="number" min="0" max="99" value="${val}" placeholder="0" data-role="${role}" />
    </div>`;
  }).join('');
}

document.getElementById('entryStation').addEventListener('change', renderRoleInputs);
document.getElementById('entryDate').addEventListener('change', renderRoleInputs);

document.getElementById('btnSaveEntry').addEventListener('click', () => {
  const date = document.getElementById('entryDate').value;
  const stationId = document.getElementById('entryStation').value;
  if (!date || !stationId) { showMsg('saveMsg', 'יש לבחור תאריך ותחנה', '#e05252'); return; }

  const counts = {};
  document.querySelectorAll('.role-count-input').forEach(input => {
    counts[input.dataset.role] = parseInt(input.value) || 0;
  });

  state.entries = state.entries.filter(e => !(e.stationId === stationId && e.date === date));
  state.entries.push({ id: uid(), date, stationId, counts });
  saveState();
  showMsg('saveMsg', '✓ הנוכחות נשמרה בהצלחה');
  renderRecentEntries();
});

function showMsg(id, msg, color = '#52c07a') {
  const el = document.getElementById(id);
  el.style.color = color;
  el.textContent = msg;
  setTimeout(() => { el.textContent = ''; }, 3000);
}

function renderRecentEntries() {
  const sorted = [...state.entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  const container = document.getElementById('recentEntries');
  if (!sorted.length) {
    container.innerHTML = '<div class="empty-state"><span class="emoji">📭</span>אין הזנות עדיין</div>';
    return;
  }
  container.innerHTML = sorted.map(e => {
    const s = getStation(e.stationId);
    const pills = state.roles.filter(r => e.counts[r] > 0)
      .map(r => `<span class="role-pill">${roleEmoji(r)} ${r}: ${e.counts[r]}</span>`).join('');
    return `<div class="recent-entry">
      <div>
        <div class="recent-entry-station">${s ? s.name : '?'}</div>
        <div class="recent-entry-info">${formatDate(e.date)} • סה"כ: ${totalForEntry(e)}</div>
      </div>
      <div class="recent-roles-pills">${pills}</div>
    </div>`;
  }).join('');
}

// ─────────────────────────────────────────────
// HISTORY PAGE
// ─────────────────────────────────────────────
function renderHistory() {
  const stationSel = document.getElementById('historyStation');
  const prevSt = stationSel.value;
  stationSel.innerHTML = '<option value="">כל התחנות</option>' +
    state.stations.map(s => `<option value="${s.id}"${s.id === prevSt ? ' selected' : ''}>${s.name}</option>`).join('');

  const monthInput = document.getElementById('historyMonth');
  if (!monthInput.value) {
    const now = new Date();
    monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  renderHistoryTable();
}

function renderHistoryTable() {
  const stationId = document.getElementById('historyStation').value;
  const month = document.getElementById('historyMonth').value;

  let filtered = [...state.entries];
  if (stationId) filtered = filtered.filter(e => e.stationId === stationId);
  if (month) filtered = filtered.filter(e => e.date.startsWith(month));
  filtered.sort((a, b) => b.date.localeCompare(a.date));

  const container = document.getElementById('historyTable');
  if (!filtered.length) {
    container.innerHTML = '<div class="empty-state"><span class="emoji">🔍</span>אין נתונים לתקופה זו</div>';
    return;
  }

  container.innerHTML = `<div class="chart-card full" style="margin-top:0"><table>
    <thead><tr>
      <th>תאריך</th><th>תחנה</th>
      ${state.roles.map(r => `<th>${roleEmoji(r)} ${r}</th>`).join('')}
      <th>סה"כ</th>
    </tr></thead>
    <tbody>
    ${filtered.map(e => {
      const s = getStation(e.stationId);
      return `<tr>
        <td>${formatDate(e.date)}</td>
        <td><strong>${s ? s.name : '?'}</strong></td>
        ${state.roles.map(r => {
          const val = e.counts[r] || 0;
          const st = getStation(e.stationId);
          const min = st ? ((st.minStaff || {})[r] || 0) : 0;
          const ok = min === 0 || val >= min;
          return `<td style="color:${val === 0 ? 'var(--text3)' : ok ? 'var(--text)' : 'var(--red)'}">${val}</td>`;
        }).join('')}
        <td><strong>${totalForEntry(e)}</strong></td>
      </tr>`;
    }).join('')}
    </tbody>
  </table></div>`;
}

document.getElementById('historyStation').addEventListener('change', renderHistoryTable);
document.getElementById('historyMonth').addEventListener('change', renderHistoryTable);

// ─────────────────────────────────────────────
// STATIONS PAGE
// ─────────────────────────────────────────────
function renderStations() {
  const container = document.getElementById('stationsList');
  if (!state.stations.length) {
    container.innerHTML = '<div class="empty-state"><span class="emoji">🏪</span>אין תחנות. הוסף תחנה חדשה.</div>';
    return;
  }
  container.innerHTML = `<div class="stations-grid">${state.stations.map(s => {
    const pills = state.roles.filter(r => ((s.minStaff || {})[r] || 0) > 0)
      .map(r => `<span>${roleEmoji(r)} ${r}: ${s.minStaff[r]}</span>`).join('');
    return `<div class="station-card">
      <div class="station-card-name">🏪 ${s.name}</div>
      <div class="station-roles-mini">${pills || '<span style="color:var(--text3)">לא הוגדרו מינימומים</span>'}</div>
      <div class="station-card-actions">
        <button class="btn-icon" onclick="openStationModal('${s.id}')">✏ עריכה</button>
        <button class="btn-icon danger" onclick="deleteStation('${s.id}')">✕ מחק</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}

document.getElementById('btnAddStation').addEventListener('click', () => openStationModal(null));

function openStationModal(stationId) {
  editingStationId = stationId;
  const station = stationId ? getStation(stationId) : null;
  document.getElementById('modalTitle').textContent = station ? 'עריכת תחנה' : 'תחנה חדשה';
  document.getElementById('modalStationName').value = station ? station.name : '';

  document.getElementById('modalRolesMin').innerHTML = `<div class="roles-min-grid">
    ${state.roles.map(role => {
      const min = station ? ((station.minStaff || {})[role] || 0) : 0;
      return `<label class="roles-min-label">${roleEmoji(role)} ${role}</label>
        <input class="roles-min-input" type="number" min="0" max="99" value="${min}" data-role="${role}" />`;
    }).join('')}
  </div>`;

  document.getElementById('stationModal').style.display = 'flex';
}

document.getElementById('btnSaveStation').addEventListener('click', () => {
  const name = document.getElementById('modalStationName').value.trim();
  if (!name) return alert('יש להזין שם תחנה');

  const minStaff = {};
  document.querySelectorAll('.roles-min-input').forEach(input => {
    minStaff[input.dataset.role] = parseInt(input.value) || 0;
  });

  if (editingStationId) {
    const s = getStation(editingStationId);
    s.name = name; s.minStaff = minStaff;
  } else {
    state.stations.push({ id: uid(), name, minStaff });
  }
  saveState(); closeStationModal(); renderStations();
});

document.getElementById('btnCancelStation').addEventListener('click', closeStationModal);
document.getElementById('stationModal').addEventListener('click', e => {
  if (e.target === document.getElementById('stationModal')) closeStationModal();
});

function closeStationModal() {
  document.getElementById('stationModal').style.display = 'none';
  editingStationId = null;
}

function deleteStation(id) {
  if (!confirm('למחוק תחנה זו?')) return;
  state.stations = state.stations.filter(s => s.id !== id);
  saveState(); renderStations();
}

// ─────────────────────────────────────────────
// SETTINGS PAGE
// ─────────────────────────────────────────────
function renderSettings() {
  document.getElementById('rolesList').innerHTML = state.roles.map((role, i) => `
    <div class="roles-list-item">
      <span><span class="r-emoji">${roleEmoji(role)}</span>${role}</span>
      <button class="btn-icon danger" style="padding:4px 10px;font-size:0.75rem" onclick="deleteRole(${i})">✕</button>
    </div>`).join('');
}

function deleteRole(index) {
  if (!confirm(`למחוק תפקיד "${state.roles[index]}"?`)) return;
  state.roles.splice(index, 1);
  saveState(); renderSettings();
}

document.getElementById('btnAddRole').addEventListener('click', () => {
  const input = document.getElementById('newRoleName');
  const name = input.value.trim();
  if (!name) return;
  if (state.roles.includes(name)) { alert('תפקיד זה כבר קיים'); return; }
  state.roles.push(name); saveState(); input.value = ''; renderSettings();
});

document.getElementById('newRoleName').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btnAddRole').click();
});

document.getElementById('btnExport').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `catering_backup_${today()}.json`;
  a.click();
});

document.getElementById('btnImport').addEventListener('click', () => {
  document.getElementById('importFile').click();
});
document.getElementById('importFile').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const imported = JSON.parse(ev.target.result);
      if (!imported.roles || !imported.stations) throw new Error('פורמט לא תקין');
      if (!confirm('ייבוא יחליף את כל הנתונים הנוכחיים. להמשיך?')) return;
      state = imported; saveState(); alert('הנתונים יובאו בהצלחה!');
      renderPage(currentPage);
    } catch(err) { alert('שגיאה בקובץ: ' + err.message); }
  };
  reader.readAsText(file); e.target.value = '';
});

document.getElementById('btnReset').addEventListener('click', () => {
  if (!confirm('האם למחוק את כל הנתונים?')) return;
  if (!confirm('בטוח? כל ההיסטוריה תמחק.')) return;
  state = defaultState(); saveState(); renderPage(currentPage); alert('הנתונים נמחקו.');
});

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────

// Bottom nav clicks
document.querySelectorAll('.bottom-nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    navigate(btn.dataset.page);
    document.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    closeDrawer();
  });
});

// Also close drawer on sidebar nav clicks on mobile
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    closeDrawer();
    // sync bottom nav
    const page = link.dataset.page;
    document.querySelectorAll('.bottom-nav-item').forEach(b => {
      b.classList.toggle('active', b.dataset.page === page);
    });
  });
});

navigate('dashboard');
