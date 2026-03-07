// app.js — MeherNolan Box Office Intelligence
// Optimized, modernized version

/* ===========================
   CONFIG & STATE
=========================== */
const CONFIG = {
  owner: "nikhilpabolu99",
  repo: "data",
  branch: "main",
  moviesFolder: "movies",
  githubToken: null,
  moviewiseSummaryFields: [
    "MOVIE","TOTALSTATES","TOTALSHOWS",
    "BOOKEDSEATS","TOTALGROSS","OCCUPANCY","LASTUPDATEDON"
  ],
  excludedKeys: new Set(['hf_unres_results','status_400_failures','finaldf'])
};

const API_BASE = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents`;

const AppState = {
  navigationStack: [],
  currentView: 'root',
  jsonData: {},
  currentDataKey: null,
  originalData: [],
  filteredData: [],
  currentSort: { column: null, direction: 'asc' }
};

/* ===========================
   UTILS
=========================== */
const Utils = {
  ALPHABET: ['0-9','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'],

  matchesLetter(char, letter) {
    const c = (char || '').toUpperCase();
    return letter === '0-9' ? /[0-9]/.test(c) : c === letter;
  },

  formatDisplayText: (text) => String(text || '').replace(/_/g, ' ').toUpperCase(),
  cleanJsonText: (text) => text.replace(/:\s*NaN/g, ': null'),

  formatValue(value) {
    if (value == null) return 'N/A';
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  },

  showToast(message, type = 'info') {
    const wrapper = document.getElementById('toastWrapper');
    if (!wrapper) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: '✓', error: '✕', info: '◈' };
    toast.innerHTML = `<span>${icons[type] || '◈'}</span>${message}`;
    wrapper.appendChild(toast);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('show'));
    });
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 350);
    }, 3000);
  },

  debounce(fn, wait) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  },

  createLoading(text = 'Loading…') {
    const el = document.createElement('div');
    el.className = 'loading';
    el.style.display = 'block';
    el.innerHTML = `<div class="loading-spinner"></div><p>${text}</p>`;
    return el;
  },

  createError(title, msg) {
    const el = document.createElement('div');
    el.innerHTML = `<div class="error"><h3>${title}</h3><p>${msg}</p></div>`;
    return el;
  }
};

/* ===========================
   GITHUB API
=========================== */
const GitHubAPI = {
  getHeaders() {
    const h = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'MeherNolan-App' };
    if (CONFIG.githubToken) h['Authorization'] = `token ${CONFIG.githubToken}`;
    return h;
  },

  async _fetch(url, retry = 0) {
    try {
      const res = await fetch(url, { headers: this.getHeaders() });
      if (!res.ok) {
        if (res.status === 401) throw new Error('Authentication failed (401).');
        if (res.status === 403) throw new Error('Access forbidden — possible rate limit (403).');
        if (res.status === 404) throw new Error(`Not found (404): ${url}`);
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return res;
    } catch (err) {
      if (retry === 0 && (err.name === 'TypeError' || err.message.includes('fetch'))) {
        await new Promise(r => setTimeout(r, 1000));
        return this._fetch(url, 1);
      }
      throw err;
    }
  },

  async fetchFolderContents(path = '') {
    const res = await this._fetch(`${API_BASE}/${path}?ref=${CONFIG.branch}`);
    return res.json();
  },

  async fetchJsonFile(url) {
    const res = await this._fetch(url);
    const text = await res.text();
    return JSON.parse(Utils.cleanJsonText(text));
  },

  async testAccess() {
    try { await this.fetchFolderContents(''); return { success: true }; }
    catch (err) { return { success: false, error: err.message }; }
  }
};

/* ===========================
   NAVIGATION
=========================== */
const Navigation = {
  pushState(view) {
    AppState.navigationStack.push({
      view: AppState.currentView,
      content: document.getElementById('explorer').innerHTML
    });
    AppState.currentView = view;
  },

  goBack() {
    if (AppState.navigationStack.length > 0) {
      const prev = AppState.navigationStack.pop();
      AppState.currentView = prev.view;
      const ex = document.getElementById('explorer');
      ex.innerHTML = prev.content;
      // Reattach back buttons
      ex.querySelectorAll('.back-button').forEach(btn => btn.onclick = () => Navigation.goBack());
    } else {
      this.goToRoot();
    }
  },

  goToRoot() {
    AppState.navigationStack = [];
    AppState.currentView = 'root';
    const el = document.getElementById('explorer');
    if (el) { el.innerHTML = ''; Explorer.loadFolders('', 'explorer', true); }
  }
};

/* ===========================
   UI HELPERS
=========================== */
const UI = {
  clearAndShowHeader(container, backText, title) {
    container.innerHTML = '';
    const back = this.btn(backText, 'explorer-button back-button');
    back.onclick = () => Navigation.goBack();
    container.appendChild(back);
    if (title) {
      const h = document.createElement('div');
      h.className = 'section-title';
      h.style.cssText = 'margin: 24px 0 16px; font-size: 1.4rem;';
      h.textContent = title;
      container.appendChild(h);
    }
  },

  btn(text, cls = 'explorer-button') {
    const b = document.createElement('button');
    b.textContent = text; b.className = cls;
    return b;
  },

  noData(container, msg) {
    const d = document.createElement('div');
    d.className = 'no-data'; d.style.padding = '40px 20px'; d.textContent = msg;
    container.appendChild(d);
  },

  showAlphabetNavigation() {
    const container = document.getElementById('explorer');
    if (!container) return;
    Navigation.pushState('alphabet');
    this.clearAndShowHeader(container, '← Back', 'Browse by First Letter');
    const grid = document.createElement('div');
    grid.className = 'alphabet-grid';
    Utils.ALPHABET.forEach(letter => {
      const btn = this.btn(letter, 'explorer-button alphabet-button');
      btn.setAttribute('data-letter', letter);
      btn.onclick = () => Explorer.showMoviesByLetter(letter);
      grid.appendChild(btn);
    });
    container.appendChild(grid);
  }
};

/* ===========================
   EXPLORER
=========================== */
const Explorer = {
  async initialize() {
    AppState.navigationStack = [];
    AppState.currentView = 'root';
    const container = document.getElementById('explorer');
    if (!container) return;
    const loading = Utils.createLoading('Connecting to repository…');
    container.appendChild(loading);
    const access = await GitHubAPI.testAccess();
    loading.remove();
    if (!access.success) {
      container.appendChild(Utils.createError('Repository Access Error', access.error));
      Utils.showToast('Failed to connect to repository', 'error');
      return;
    }
    Utils.showToast('Connected successfully', 'success');
    this.loadFolders('', 'explorer', true);
  },

  async loadFolders(path = '', containerId = 'explorer', isRoot = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    try {
      const data = await GitHubAPI.fetchFolderContents(path);
      data.forEach(item => {
        if (isRoot && item.type === 'dir' && item.name !== CONFIG.moviesFolder) return;
        if (item.type === 'dir') {
          const btn = UI.btn('📂 ' + item.name);
          if (item.name === CONFIG.moviesFolder && isRoot) {
            btn.onclick = () => UI.showAlphabetNavigation();
          } else {
            btn.onclick = () => this.expandFolder(item, container);
          }
          container.appendChild(btn);
        }
        if (item.type === 'file' && item.name.endsWith('.json')) {
          const depth = path.split('/').filter(Boolean).length;
          if (path.startsWith(`${CONFIG.moviesFolder}/`) && depth >= 1) {
            const btn = UI.btn('📄 ' + item.name, 'explorer-button file-button');
            btn.onclick = () => JsonViewer.open(item.download_url, item.name);
            container.appendChild(btn);
          }
        }
      });
    } catch (err) {
      container.appendChild(Utils.createError('Error Loading Repository', err.message));
      Utils.showToast('Error loading data', 'error');
    }
  },

  expandFolder(item, container) {
    let sub = document.getElementById(item.path);
    if (!sub) {
      sub = document.createElement('div');
      sub.id = item.path; sub.className = 'folder';
      container.appendChild(sub);
    } else sub.innerHTML = '';
    this.loadFolders(item.path, item.path, false);
  },

  async showMoviesByLetter(letter) {
    const container = document.getElementById('explorer');
    if (!container) return;
    Navigation.pushState(`letter-${letter}`);
    UI.clearAndShowHeader(container, '← Back to Letters', `Movies — "${letter}"`);
    const loading = Utils.createLoading('Loading movies…');
    container.appendChild(loading);
    try {
      const data = await GitHubAPI.fetchFolderContents(CONFIG.moviesFolder);
      loading.remove();
      const filtered = data.filter(i => i.type === 'dir' && Utils.matchesLetter(i.name.charAt(0), letter));
      if (!filtered.length) { UI.noData(container, `No movies found for "${letter}"`); return; }
      filtered.forEach(item => {
        const btn = UI.btn('📂 ' + item.name);
        btn.onclick = () => this.showMovieFolder(item.path, item.name);
        container.appendChild(btn);
      });
    } catch (err) {
      loading.remove();
      container.appendChild(Utils.createError('Error', err.message));
    }
  },

  async showMovieFolder(path, name) {
    await this._showFolder(path, name, `← Back to Movies`);
  },

  async showSubFolder(path, name) {
    await this._showFolder(path, name, '← Back');
  },

  async _showFolder(path, name, backText) {
    const container = document.getElementById('explorer');
    if (!container) return;
    Navigation.pushState(`folder-${path}`);
    UI.clearAndShowHeader(container, backText, name);
    const loading = Utils.createLoading('Loading…');
    container.appendChild(loading);
    try {
      const data = await GitHubAPI.fetchFolderContents(path);
      loading.remove();
      if (!data.length) { UI.noData(container, 'This folder is empty'); return; }
      data.forEach(item => {
        if (item.type === 'dir') {
          const btn = UI.btn('📂 ' + item.name);
          btn.onclick = () => this.showSubFolder(item.path, item.name);
          container.appendChild(btn);
        } else if (item.type === 'file' && item.name.endsWith('.json')) {
          const btn = UI.btn('📄 ' + item.name, 'explorer-button file-button');
          btn.onclick = () => JsonViewer.open(item.download_url, item.name);
          container.appendChild(btn);
        }
      });
    } catch (err) {
      loading.remove();
      container.appendChild(Utils.createError('Error', err.message));
    }
  },

  // Country filtering
  async showMoviesByCountry(country) {
    const container = document.getElementById('explorer');
    if (!container) return;
    Navigation.pushState(`country-${country}`);
    UI.clearAndShowHeader(container, '← Back', `${country.toUpperCase()} Collections`);
    const loading = Utils.createLoading(`Searching "${country}" data…`);
    container.appendChild(loading);
    try {
      const movies = await GitHubAPI.fetchFolderContents(CONFIG.moviesFolder);
      const results = [];
      for (const movie of movies) {
        if (movie.type !== 'dir') continue;
        const sub = await GitHubAPI.fetchFolderContents(`${CONFIG.moviesFolder}/${movie.name}`);
        if (sub.some(f => f.type === 'dir' && f.name.toLowerCase() === country)) {
          results.push(movie.name);
        }
      }
      loading.remove();
      if (!results.length) { UI.noData(container, `No movies have "${country}" collections`); return; }
      results.forEach(name => {
        const btn = UI.btn(name);
        btn.onclick = () => this.showLatestCountryData(name, country);
        container.appendChild(btn);
      });
    } catch (err) {
      loading.remove();
      container.appendChild(Utils.createError('Error', err.message));
    }
  },

  async showLatestCountryData(movieName, country) {
    const container = document.getElementById('explorer');
    if (!container) return;
    Navigation.pushState(`country-data-${movieName}-${country}`);
    UI.clearAndShowHeader(container, '← Back', `${movieName} — ${country.toUpperCase()}`);
    const loading = Utils.createLoading('Loading latest collection…');
    container.appendChild(loading);
    try {
      const countryPath = `${CONFIG.moviesFolder}/${movieName}/${country}`;
      const dates = await GitHubAPI.fetchFolderContents(countryPath);
      const latest = dates
        .filter(f => f.type === 'dir' && /^\d{8}$/.test(f.name))
        .sort((a, b) => b.name.localeCompare(a.name))[0];
      if (!latest) { loading.remove(); UI.noData(container, 'No datewise data available.'); return; }
      const files = await GitHubAPI.fetchFolderContents(`${countryPath}/${latest.name}`);
      const json = files.filter(f => f.type === 'file' && f.name.endsWith('.json'))
        .sort((a, b) => b.name.localeCompare(a.name))[0];
      loading.remove();
      if (!json) { UI.noData(container, 'No collection file found.'); return; }
      JsonViewer.open(json.download_url, json.name);
    } catch (err) {
      loading.remove();
      container.appendChild(Utils.createError('Error', err.message));
    }
  }
};

/* ===========================
   LATEST RELEASES
=========================== */
const LatestReleases = {
  data: [
    { movie: "dhur", image: "images/Dhurandhar2.jpg", movieFolderName: "dhur", movieDisplayName: "Dhurandhar2" },
    { movie: "ubs",  image: "images/ubs.jpg",          movieFolderName: "ubs",  movieDisplayName: "UBS"         }
  ],

  load() {
    const container = document.getElementById('latestReleases');
    if (!container) return;
    container.innerHTML = '';
    this.data.forEach(item => {
      const card = document.createElement('div');
      card.className = 'movie-card';
      card.innerHTML = `
        <img src="${item.image}" alt="${item.movie} Poster" loading="lazy" />
        <div class="movie-card-overlay">
          <div class="movie-card-title">${item.movieDisplayName}</div>
          <div class="movie-card-badge">Live Data</div>
        </div>`;
      card.onclick = async () => {
        // If JSON viewer is open, close it first
        document.getElementById('jsonViewerSection')?.classList.remove('show');
        document.getElementById('explorerSection')?.classList.remove('hidden');
        JsonViewer._reset();

        // Reset navigation so we're starting fresh (not mid-stack)
        AppState.navigationStack = [];
        AppState.currentView = 'root';

        // Now load the movie folder into the explorer
        await Explorer.showMovieFolder(`movies/${item.movieFolderName}`, item.movieDisplayName);

        // Scroll to explorer section
        const sec = document.getElementById('explorerSection');
        if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      container.appendChild(card);
    });
  }
};

/* ===========================
   SUMMARY DISPLAY
=========================== */
const SummaryDisplay = {
  create(jsonData) {
    const display = document.getElementById('summaryDisplay');
    const grid = document.getElementById('summaryGrid');
    if (!display || !grid) return;
    grid.innerHTML = '';

    const key = Object.keys(jsonData).find(k => k.toLowerCase().includes('moviewise') && k.toLowerCase().includes('summary'));

    if (key && Array.isArray(jsonData[key]) && jsonData[key].length > 0) {
      const title = document.querySelector('.summary-title');
      if (title) title.textContent = 'Moviewise Summary';
      const data = jsonData[key];
      data.length === 1 ? this._selectedFields(data[0], grid) : this._aggregate(data, grid);
    } else {
      this._general(jsonData, grid);
    }
    display.classList.add('show');
  },

  _selectedFields(record, container) {
    const fields = CONFIG.moviewiseSummaryFields
      .map(f => Object.keys(record).find(k => k.toLowerCase() === f.toLowerCase()))
      .filter(Boolean);

    (fields.length ? fields : Object.keys(record)).forEach(key => {
      const el = document.createElement('div');
      el.className = 'summary-item';
      el.innerHTML = `<div class="summary-key">${Utils.formatDisplayText(key)}</div>
                      <div class="summary-value">${Utils.formatValue(record[key])}</div>`;
      container.appendChild(el);
    });
  },

  _aggregate(data, container) {
    const allKeys = new Set(data.flatMap(item => typeof item === 'object' ? Object.keys(item) : []));
    const keys = CONFIG.moviewiseSummaryFields
      .map(f => Array.from(allKeys).find(k => k.toLowerCase() === f.toLowerCase()))
      .filter(Boolean);

    const totalEl = document.createElement('div');
    totalEl.className = 'summary-item';
    totalEl.innerHTML = `<div class="summary-key">Total Movies</div><div class="summary-value">${data.length}</div>`;
    container.appendChild(totalEl);

    keys.forEach(key => {
      const vals = data.map(i => i[key]).filter(v => v != null);
      if (!vals.length) return;
      let display = '';
      if (vals.every(v => !isNaN(Number(v)))) {
        const nums = vals.map(Number);
        const total = nums.reduce((s, n) => s + n, 0);
        display = `Total: ${total.toLocaleString()} · Avg: ${Math.round(total / nums.length).toLocaleString()}`;
      } else {
        const unique = [...new Set(vals)].slice(0, 3);
        display = unique.join(', ') + (vals.length > unique.length ? ` +${vals.length - unique.length}` : '');
      }
      const el = document.createElement('div');
      el.className = 'summary-item';
      el.innerHTML = `<div class="summary-key">${Utils.formatDisplayText(key)}</div><div class="summary-value">${display}</div>`;
      container.appendChild(el);
    });
  },

  _general(jsonData, container) {
    const title = document.querySelector('.summary-title');
    if (title) title.textContent = 'Data Summary';
    const arrays = Object.entries(jsonData).filter(([, v]) => Array.isArray(v));
    if (arrays.length) {
      [
        { key: 'Total Records', value: arrays.reduce((s, [, a]) => s + a.length, 0).toLocaleString() },
        { key: 'Data Tables', value: arrays.length }
      ].forEach(({ key, value }) => {
        const el = document.createElement('div');
        el.className = 'summary-item';
        el.innerHTML = `<div class="summary-key">${key}</div><div class="summary-value">${value}</div>`;
        container.appendChild(el);
      });
    }
    Object.entries(jsonData)
      .filter(([, v]) => !Array.isArray(v) && typeof v !== 'object')
      .forEach(([k, v]) => {
        const el = document.createElement('div');
        el.className = 'summary-item';
        el.innerHTML = `<div class="summary-key">${Utils.formatDisplayText(k)}</div><div class="summary-value">${Utils.formatValue(v)}</div>`;
        container.appendChild(el);
      });
  },

  hide() { document.getElementById('summaryDisplay')?.classList.remove('show'); }
};

/* ===========================
   JSON VIEWER
=========================== */
const JsonViewer = {
  showExplorer() {
    document.getElementById('explorerSection')?.classList.remove('hidden');
    document.getElementById('jsonViewerSection')?.classList.remove('show');
    this._reset();
  },

  show() {
    document.getElementById('explorerSection')?.classList.add('hidden');
    document.getElementById('jsonViewerSection')?.classList.add('show');
  },

  _reset() {
    document.getElementById('loadingSection').style.display = 'none';
    document.getElementById('errorSection').style.display = 'none';
    document.getElementById('buttonsContainer')?.classList.remove('show');
    document.getElementById('dataDisplay')?.classList.remove('show');
    document.getElementById('filterSection')?.classList.remove('show');
    const noData = document.getElementById('noData');
    if (noData) noData.style.display = 'block';
    const table = document.getElementById('dataTable');
    if (table) table.style.display = 'none';
    SummaryDisplay.hide();
  },

  async open(url, filename) {
    this.show();
    const loading = document.getElementById('loadingSection');
    const errorSec = document.getElementById('errorSection');
    const btns = document.getElementById('buttonsContainer');
    const display = document.getElementById('dataDisplay');

    loading.style.display = 'block';
    errorSec.style.display = 'none';
    btns?.classList.remove('show');
    display?.classList.remove('show');
    SummaryDisplay.hide();

    try {
      AppState.jsonData = await GitHubAPI.fetchJsonFile(url);
      if (!AppState.jsonData || typeof AppState.jsonData !== 'object') throw new Error('Invalid JSON structure');
      if (!Object.values(AppState.jsonData).some(v => Array.isArray(v))) throw new Error('No array data found in file');

      loading.style.display = 'none';
      btns?.classList.add('show');
      display?.classList.add('show');

      SummaryDisplay.create(AppState.jsonData);
      this._buildButtons();
      this._resetDisplay();
      Utils.showToast('Data loaded successfully', 'success');
    } catch (err) {
      loading.style.display = 'none';
      errorSec.innerHTML = `<div class="error"><h3>Error Loading Data</h3><p>${err.message}</p></div>`;
      errorSec.style.display = 'block';
      Utils.showToast('Failed to load data', 'error');
    }
  },

  _buildButtons() {
    const grid = document.getElementById('buttonGrid');
    if (!grid) return;
    grid.innerHTML = '';
    Object.keys(AppState.jsonData).forEach(key => {
      if (CONFIG.excludedKeys.has(key)) return;
      if (!Array.isArray(AppState.jsonData[key])) return;
      const isMoviewise = key.toLowerCase().includes('moviewise') && key.toLowerCase().includes('summary');
      const btn = document.createElement('button');
      btn.className = `data-button${isMoviewise ? ' moviewise-summary' : ''}`;
      btn.innerHTML = `<div>${Utils.formatDisplayText(key)}</div><span class="record-count">${AppState.jsonData[key].length} records</span>`;
      btn.addEventListener('click', e => DataTable.showData(key, e));
      grid.appendChild(btn);
    });
  },

  _resetDisplay() {
    document.getElementById('filterSection')?.classList.remove('show');
    const noData = document.getElementById('noData');
    if (noData) noData.style.display = 'block';
    const table = document.getElementById('dataTable');
    if (table) table.style.display = 'none';
  }
};

/* ===========================
   DATA TABLE
=========================== */
const DataTable = {
  showData(key, e) {
    document.querySelectorAll('.data-button').forEach(b => b.classList.remove('active'));
    e?.target?.closest('.data-button')?.classList.add('active');

    AppState.currentDataKey = key;
    const data = AppState.jsonData[key];

    if (!Array.isArray(data) || !data.length) {
      this._empty(key); return;
    }

    AppState.originalData = [...data];
    AppState.filteredData = [...data];
    AppState.currentSort = { column: null, direction: 'asc' };

    document.getElementById('dataTitle').textContent = Utils.formatDisplayText(key);
    document.getElementById('dataCount').textContent = `${data.length} records`;
    document.getElementById('downloadTableBtn').style.display = 'block';
    document.getElementById('filterSection')?.classList.add('show');
    this._buildColumnFilter(data);

    document.getElementById('noData').style.display = 'none';
    document.getElementById('dataTable').style.display = 'table';
    this._render(AppState.filteredData);
  },

  _empty(key) {
    document.getElementById('dataTitle').textContent = Utils.formatDisplayText(key);
    document.getElementById('dataCount').textContent = '0 records';
    document.getElementById('filterSection')?.classList.remove('show');
    document.getElementById('downloadTableBtn').style.display = 'none';
    const noData = document.getElementById('noData');
    if (noData) { noData.style.display = 'block'; noData.textContent = 'No data in this table'; }
    document.getElementById('dataTable').style.display = 'none';
  },

  _getKeys(data) {
    const keys = new Set();
    data.forEach(item => { if (typeof item === 'object' && item) Object.keys(item).forEach(k => keys.add(k)); });
    return Array.from(keys);
  },

  _render(data) {
    const head = document.getElementById('tableHead');
    const body = document.getElementById('tableBody');
    head.innerHTML = ''; body.innerHTML = '';

    if (!data.length) {
      body.innerHTML = '<tr><td colspan="100%" class="no-data" style="padding:30px;text-align:center;">No matching records</td></tr>';
      return;
    }

    const keys = this._getKeys(data);
    const hr = document.createElement('tr');
    keys.forEach(k => {
      const th = document.createElement('th');
      th.textContent = Utils.formatDisplayText(k);
      th.title = 'Click to sort';
      th.onclick = () => this.sort(k);
      hr.appendChild(th);
    });
    head.appendChild(hr);

    const frag = document.createDocumentFragment();
    data.forEach(item => {
      const row = document.createElement('tr');
      keys.forEach(k => {
        const td = document.createElement('td');
        const val = item[k];
        if (val == null) { td.textContent = '—'; td.style.color = 'var(--text-muted)'; }
        else if (typeof val === 'number') td.textContent = val.toLocaleString();
        else if (typeof val === 'object') td.textContent = JSON.stringify(val);
        else td.textContent = String(val);
        row.appendChild(td);
      });
      frag.appendChild(row);
    });
    body.appendChild(frag);
  },

  _buildColumnFilter(data) {
    const sel = document.getElementById('columnFilter');
    if (!sel) return;
    sel.innerHTML = '<option value="">All Columns</option>';
    this._getKeys(data).sort().forEach(k => {
      const opt = document.createElement('option');
      opt.value = k; opt.textContent = Utils.formatDisplayText(k);
      sel.appendChild(opt);
    });
  },

  sort(column) {
    const s = AppState.currentSort;
    if (s.column === column) s.direction = s.direction === 'asc' ? 'desc' : 'asc';
    else { s.column = column; s.direction = 'asc'; }

    AppState.filteredData.sort((a, b) => {
      let av = a[column], bv = b[column];
      if (av == null && bv == null) return 0;
      if (av == null) return 1; if (bv == null) return -1;
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      const cmp = av > bv ? 1 : av < bv ? -1 : 0;
      return s.direction === 'asc' ? cmp : -cmp;
    });
    this._render(AppState.filteredData);
  },

  // For image download
  createFullTable(data) {
    if (!data?.length) return null;
    const keys = this._getKeys(data);
    const table = document.createElement('table');
    Object.assign(table.style, {
      width: 'auto', borderCollapse: 'collapse',
      fontFamily: "'DM Sans', sans-serif", fontSize: '12px',
      background: '#0e0e12', color: '#f0ede6', margin: '20px'
    });
    const thead = document.createElement('thead');
    const hr = document.createElement('tr');
    keys.forEach(k => {
      const th = document.createElement('th');
      th.textContent = Utils.formatDisplayText(k);
      Object.assign(th.style, {
        padding: '10px 14px', border: '1px solid rgba(201,168,76,0.2)',
        background: '#13131a', fontWeight: '600', textAlign: 'left',
        whiteSpace: 'nowrap', fontSize: '11px', color: '#c9a84c'
      });
      hr.appendChild(th);
    });
    thead.appendChild(hr); table.appendChild(thead);
    const tbody = document.createElement('tbody');
    data.forEach((item, i) => {
      const row = document.createElement('tr');
      if (i % 2) row.style.background = 'rgba(201,168,76,0.03)';
      keys.forEach(k => {
        const td = document.createElement('td');
        const val = item[k];
        td.textContent = val == null ? '—' : typeof val === 'number' ? val.toLocaleString() : typeof val === 'object' ? JSON.stringify(val) : String(val);
        Object.assign(td.style, {
          padding: '8px 12px', border: '1px solid rgba(255,255,255,0.06)',
          whiteSpace: 'nowrap', fontSize: '11px'
        });
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    return table;
  }
};

/* ===========================
   FILTERS
=========================== */
const Filters = {
  apply() {
    const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const col = document.getElementById('columnFilter')?.value || '';

    AppState.filteredData = AppState.originalData.filter(item => {
      if (!search) return true;
      if (col) return item[col] != null && String(item[col]).toLowerCase().includes(search);
      return Object.values(item).some(v => v != null && String(v).toLowerCase().includes(search));
    });

    if (AppState.currentSort.column) DataTable.sort(AppState.currentSort.column);
    else DataTable._render(AppState.filteredData);

    const count = document.getElementById('dataCount');
    if (count) count.textContent = `${AppState.filteredData.length} records`;
  },

  clear() {
    const search = document.getElementById('searchInput');
    const col = document.getElementById('columnFilter');
    if (search) search.value = '';
    if (col) col.value = '';
    AppState.currentSort = { column: null, direction: 'asc' };
    AppState.filteredData = [...AppState.originalData];
    DataTable._render(AppState.filteredData);
    const count = document.getElementById('dataCount');
    if (count) count.textContent = `${AppState.filteredData.length} records`;
  }
};

/* ===========================
   DOWNLOAD
=========================== */
async function downloadTableAsImage() {
  const btn = document.getElementById('downloadTableBtn');
  if (!btn) return;
  btn.disabled = true; btn.textContent = 'Generating…';
  try {
    if (!AppState.originalData?.length) throw new Error('No data to download');
    const table = DataTable.createFullTable(AppState.originalData);
    if (!table) throw new Error('Could not create table');

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;left:-9999px;top:0;background:#070709;padding:30px;';
    const title = document.createElement('h2');
    title.textContent = document.getElementById('dataTitle')?.textContent || 'Export';
    Object.assign(title.style, { margin: '0 0 20px', color: '#c9a84c', fontFamily: 'serif', textAlign: 'center' });
    const wm = document.createElement('div');
    wm.textContent = '@TheCineNation';
    Object.assign(wm.style, {
      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-35deg)',
      fontSize: '3em', fontWeight: 'bold', color: 'rgba(201,168,76,0.06)', pointerEvents: 'none',
      zIndex: '10', whiteSpace: 'nowrap', fontFamily: 'serif'
    });
    wrap.appendChild(title); wrap.appendChild(table); wrap.appendChild(wm);
    document.body.appendChild(wrap);

    const canvas = await html2canvas(wrap, {
      backgroundColor: '#070709', scale: 2, useCORS: true,
      scrollX: 0, scrollY: 0
    });
    document.body.removeChild(wrap);

    const a = document.createElement('a');
    a.download = `${AppState.currentDataKey || 'table'}_${new Date().toISOString().slice(0,10)}.png`;
    a.href = canvas.toDataURL('image/png');
    document.body.appendChild(a); a.click(); a.remove();

    btn.textContent = '✓ Downloaded';
    Utils.showToast('Table downloaded', 'success');
  } catch (err) {
    btn.textContent = 'Error';
    Utils.showToast('Download failed', 'error');
  }
  setTimeout(() => { btn.textContent = 'Download Table'; btn.disabled = false; }, 2000);
}

/* ===========================
   NAVBAR
=========================== */
const NavbarManager = {
  init() {
    const toggle = document.getElementById('navbarToggle');
    const menu = document.getElementById('navbarMenu');

    toggle?.addEventListener('click', () => {
      toggle.classList.toggle('active');
      menu?.classList.toggle('active');
    });

    // Close on link click (mobile)
    menu?.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        toggle?.classList.remove('active');
        menu.classList.remove('active');
      });
    });

    // Country dropdown
    document.querySelectorAll('.dropdown-menu .dropdown-item').forEach(item => {
      const parent = item.closest('.dropdown');
      if (parent?.querySelector('.dropdown-toggle')?.textContent.toLowerCase().includes('country')) {
        item.addEventListener('click', e => {
          e.preventDefault();
          const country = item.getAttribute('href').replace('#', '').toLowerCase();
          Explorer.showMoviesByCountry(country);
          // scroll to explorer
          document.getElementById('explorerSection')?.scrollIntoView({ behavior: 'smooth' });
        });
      }
    });

    // Mobile dropdown toggle
    document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
      toggle.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
          e.preventDefault();
          this.closest('.dropdown')?.classList.toggle('open');
        }
      });
    });

    // Smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', function(e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      });
    });

    // Navbar hide on scroll down
    let lastY = window.scrollY;
    window.addEventListener('scroll', () => {
      const navbar = document.getElementById('navbar');
      if (!navbar) return;
      const y = window.scrollY;
      navbar.style.transform = (y > lastY && y > 100) ? 'translateY(-100%)' : 'translateY(0)';
      lastY = y;
    }, { passive: true });
  }
};

/* ===========================
   INIT
=========================== */
document.addEventListener('DOMContentLoaded', () => {
  NavbarManager.init();
  Explorer.initialize();
  LatestReleases.load();

  document.getElementById('backButton')?.addEventListener('click', () => JsonViewer.showExplorer());
  document.getElementById('downloadTableBtn')?.addEventListener('click', downloadTableAsImage);
  document.getElementById('clearFiltersBtn')?.addEventListener('click', Filters.clear);

  const debouncedFilter = Utils.debounce(() => Filters.apply(), 250);
  document.getElementById('searchInput')?.addEventListener('input', debouncedFilter);
  document.getElementById('columnFilter')?.addEventListener('change', debouncedFilter);

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (AppState.currentView !== 'root') Navigation.goBack();
      else if (document.getElementById('jsonViewerSection')?.classList.contains('show')) JsonViewer.showExplorer();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      const input = document.getElementById('searchInput');
      if (input) { e.preventDefault(); input.focus(); }
    }
  });
});

/* ===========================
   GLOBAL COMPAT
=========================== */
const showExplorer = () => JsonViewer.showExplorer();
const applyFilters = () => Filters.apply();
const clearFilters = () => Filters.clear();
