// app.js — refactored from inline index.html script
// Functionality kept identical to your original file.
// - Moved CSS and JS to separate files
// - Replaced inline onclicks with addEventListener
// - Small reliability fix: pass click events when needed
// - Debounced search input (250ms)

/* =======================
   Configuration & State
   ======================= */
const CONFIG = {
  owner: "nikhilpabolu99",
  repo: "data",
  branch: "main",
  moviesFolder: "movies",
  githubToken: null,
  moviewiseSummaryFields: [
    "MOVIE",
    "TOTALSTATES",
    "TOTALSHOWS",
    "BOOKEDSEATS",
    "TOTALGROSS",
    "OCCUPANCY",
    "LASTUPDATEDON"
  ]
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

/* =======================
   Utility Functions
   ======================= */
const Utils = {
  getAlphabetArray: () => ['0-9', 'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'],
  matchesLetter: (char, letter) => {
    const upperChar = (char || '').toUpperCase();
    return letter === '0-9' ? /[0-9]/.test(upperChar) : upperChar === letter;
  },
  formatDisplayText: (text) => String(text || '').replace(/_/g, ' ').toUpperCase(),
  cleanJsonText: (text) => text.replace(/:\s*NaN/g, ': null'),
  createLoadingElement: (text = 'Loading...') => {
    const loading = document.createElement('div');
    loading.innerHTML = `
      <div style="text-align:center;padding:30px;">
        <div class="loading-spinner" style="margin-bottom:15px;"></div>
        <p>${text}</p>
      </div>`;
    return loading;
  },
  createErrorElement: (title, message) => {
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
      <div class="error" style="margin:20px 0;">
        <h3>${title}</h3>
        <p>${message}</p>
      </div>`;
    return errorDiv;
  },
  formatValue: (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
};

/* =======================
   GitHub API Helpers
   ======================= */
const GitHubAPI = {
  getHeaders: () => {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GitHub-Explorer-App'
    };
    if (CONFIG.githubToken) headers['Authorization'] = `token ${CONFIG.githubToken}`;
    return headers;
  },

  checkRateLimit: async () => {
    try {
      const resp = await fetch('https://api.github.com/rate_limit', { headers: GitHubAPI.getHeaders() });
      return await resp.json();
    } catch (err) {
      console.warn('Could not check rate limit:', err);
      return null;
    }
  },

  fetchFolderContents: async (path = "", retryCount = 0) => {
    const url = `${API_BASE}/${path}?ref=${CONFIG.branch}`;
    try {
      const response = await fetch(url, { headers: GitHubAPI.getHeaders() });
      if (!response.ok) {
        if (response.status === 401) throw new Error(`Authentication failed (401). The GitHub token may be invalid.`);
        if (response.status === 403) {
          const rateLimit = await GitHubAPI.checkRateLimit();
          if (rateLimit && rateLimit.rate && rateLimit.rate.remaining === 0) {
            const resetTime = new Date(rateLimit.rate.reset * 1000);
            throw new Error(`GitHub API rate limit exceeded. Reset at ${resetTime.toLocaleTimeString()}.`);
          }
          throw new Error(`Access forbidden (403).`);
        }
        if (response.status === 404) throw new Error(`Repository not found (404). Check ${CONFIG.owner}/${CONFIG.repo}.`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      if (retryCount === 0 && (error.name === 'TypeError' || error.message.includes('fetch'))) {
        await new Promise(r => setTimeout(r, 1000));
        return GitHubAPI.fetchFolderContents(path, 1);
      }
      throw error;
    }
  },

  fetchJsonFile: async (url, retryCount = 0) => {
    try {
      const response = await fetch(url, { headers: GitHubAPI.getHeaders() });
      if (!response.ok) {
        if (response.status === 403) throw new Error(`Access forbidden (403). You may have hit the rate limit.`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const rawText = await response.text();
      const cleaned = Utils.cleanJsonText(rawText);
      return JSON.parse(cleaned);
    } catch (error) {
      if (retryCount === 0 && (error.name === 'TypeError' || error.message.includes('fetch'))) {
        await new Promise(r => setTimeout(r, 1000));
        return GitHubAPI.fetchJsonFile(url, 1);
      }
      throw error;
    }
  },

  testAccess: async () => {
    try {
      await GitHubAPI.fetchFolderContents("");
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};

/* =======================
   Navigation
   ======================= */
const Navigation = {
  pushState: (view, content) => {
    AppState.navigationStack.push({
      view: AppState.currentView,
      content: content || document.getElementById('explorer').innerHTML
    });
    AppState.currentView = view;
  },

  goBack: () => {
    if (AppState.navigationStack.length > 0) {
      const previous = AppState.navigationStack.pop();
      AppState.currentView = previous.view;
      document.getElementById('explorer').innerHTML = previous.content;
      Navigation.reattachEventListeners();
    } else {
      Navigation.goToRoot();
    }
  },

  goToRoot: () => {
    AppState.navigationStack = [];
    AppState.currentView = 'root';
    const container = document.getElementById('explorer');
    container.innerHTML = '';
    Explorer.loadFolders("", "explorer", true);
  },

  reattachEventListeners: () => {
    const container = document.getElementById('explorer');

    // Back buttons
    container.querySelectorAll('.back-button').forEach(btn => {
      btn.onclick = () => Navigation.goBack();
    });

    // Movies button
    const moviesBtn = container.querySelector('.explorer-button[data-action="movies"]');
    if (moviesBtn) moviesBtn.onclick = () => UI.showAlphabetNavigation();

    // Alphabet buttons
    Utils.getAlphabetArray().forEach(letter => {
      const btn = container.querySelector(`[data-letter="${letter}"]`);
      if (btn) btn.onclick = () => Explorer.showMoviesByLetter(letter);
    });
  }
};

/* =======================
   Explorer
   ======================= */
const Explorer = {
  initialize: async () => {
    AppState.navigationStack = [];
    AppState.currentView = 'root';

    const container = document.getElementById('explorer');
    container.innerHTML = '<div style="text-align:center;padding:20px;">🔍 Testing repository access...</div>';

    const accessTest = await GitHubAPI.testAccess();
    if (!accessTest.success) {
      container.innerHTML = '';
      const error = Utils.createErrorElement("❌ Repository Access Error", accessTest.error);
      container.appendChild(error);
      return;
    }

    container.innerHTML = '';
    Explorer.loadFolders("", "explorer", true);
  },

  loadFolders: async (path = "", containerId = "explorer", isRoot = false) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const data = await GitHubAPI.fetchFolderContents(path);
      let itemsAdded = 0;

      data.forEach(item => {
        if (isRoot && item.type === "dir" && item.name !== CONFIG.moviesFolder) return;

        if (item.type === "dir") {
          const btn = document.createElement("button");
          btn.textContent = "📂 " + item.name;
          btn.className = "explorer-button";

          if (item.name === CONFIG.moviesFolder && isRoot) {
            btn.setAttribute('data-action', 'movies');
            btn.onclick = () => UI.showAlphabetNavigation();
          } else {
            btn.onclick = () => Explorer.expandFolder(item, container);
          }

          container.appendChild(btn);
          itemsAdded++;
        }

        if (item.type === "file" && item.name.endsWith(".json")) {
          const depth = path.split("/").filter(p => p).length;
          if (path.startsWith(`${CONFIG.moviesFolder}/`) && depth >= 1) {
            const btn = document.createElement("button");
            btn.textContent = "📄 " + item.name;
            btn.className = "explorer-button file-button";
            btn.onclick = () => JsonViewer.openJsonViewer(item.download_url, item.name);
            container.appendChild(btn);
            itemsAdded++;
          }
        }
      });

      if (itemsAdded === 0 && isRoot) {
        const error = Utils.createErrorElement(
          "No Movies Folder Found",
          `Could not find the '${CONFIG.moviesFolder}' folder in ${CONFIG.owner}/${CONFIG.repo}. Make sure the repository is public and the folder exists.`
        );
        container.appendChild(error);
      }

    } catch (err) {
      console.error("Error loading folders:", err);
      const error = Utils.createErrorElement("Error Loading Repository", err.message);
      container.appendChild(error);
    }
  },

  expandFolder: (item, container) => {
    let subContainer = document.getElementById(item.path);
    if (!subContainer) {
      subContainer = document.createElement("div");
      subContainer.id = item.path;
      subContainer.classList.add("folder");
      container.appendChild(subContainer);
    } else {
      subContainer.innerHTML = '';
    }
    Explorer.loadFolders(item.path, item.path, false);
  },

  showMoviesByLetter: async (letter) => {
    const container = document.getElementById('explorer');
    Navigation.pushState(`letter-${letter}`);

    UI.clearAndShowHeader(container, `← Back to Letters`, `Movies starting with "${letter}"`);
    const loading = Utils.createLoadingElement('Loading movies...');
    container.appendChild(loading);

    try {
      const data = await GitHubAPI.fetchFolderContents(CONFIG.moviesFolder);
      container.removeChild(loading);

      const filteredFolders = data.filter(item => {
        if (item.type !== "dir") return false;
        return Utils.matchesLetter(item.name.charAt(0), letter);
      });

      if (filteredFolders.length === 0) {
        UI.showNoData(container, `No movies found starting with "${letter}"`);
      } else {
        filteredFolders.forEach(item => {
          const btn = UI.createButton("📂 " + item.name, "explorer-button");
          btn.onclick = () => Explorer.showMovieFolder(item.path, item.name);
          container.appendChild(btn);
        });
      }
    } catch (err) {
      console.error("Error loading movies by letter:", err);
      container.removeChild(loading);
      const error = Utils.createErrorElement("Error Loading Movies", err.message);
      container.appendChild(error);
    }
  },

  showMovieFolder: async (path, folderName) => {
    const container = document.getElementById('explorer');
    Navigation.pushState(`movie-${path}`);

    UI.clearAndShowHeader(container, `← Back to Movies`, folderName);

    const loading = Utils.createLoadingElement('Loading folder contents...');
    container.appendChild(loading);

    try {
      const data = await GitHubAPI.fetchFolderContents(path);
      container.removeChild(loading);

      if (data.length === 0) {
        UI.showNoData(container, "This folder is empty");
        return;
      }

      data.forEach(item => {
        if (item.type === "dir") {
          const btn = UI.createButton("📂 " + item.name, "explorer-button");
          btn.onclick = () => Explorer.showSubFolder(item.path, item.name);
          container.appendChild(btn);
        } else if (item.type === "file" && item.name.endsWith(".json")) {
          const btn = UI.createButton("📄 " + item.name, "explorer-button file-button");
          btn.onclick = () => JsonViewer.openJsonViewer(item.download_url, item.name);
          container.appendChild(btn);
        }
      });
    } catch (err) {
      console.error("Error loading movie folder:", err);
      container.removeChild(loading);
      const error = Utils.createErrorElement("Error Loading Folder", err.message);
      container.appendChild(error);
    }
  },

  showSubFolder: async (path, folderName) => {
    const container = document.getElementById('explorer');
    Navigation.pushState(`folder-${path}`);

    UI.clearAndShowHeader(container, `← Back`, folderName);

    const loading = Utils.createLoadingElement('Loading folder contents...');
    container.appendChild(loading);

    try {
      const data = await GitHubAPI.fetchFolderContents(path);
      container.removeChild(loading);

      if (data.length === 0) {
        UI.showNoData(container, "This folder is empty");
        return;
      }

      data.forEach(item => {
        if (item.type === "dir") {
          const btn = UI.createButton("📂 " + item.name, "explorer-button");
          btn.onclick = () => Explorer.showSubFolder(item.path, item.name);
          container.appendChild(btn);
        } else if (item.type === "file" && item.name.endsWith(".json")) {
          const btn = UI.createButton("📄 " + item.name, "explorer-button file-button");
          console.log(item)
          btn.onclick = () => JsonViewer.openJsonViewer(item.download_url, item.name);
          container.appendChild(btn);
        }
      });

    } catch (err) {
      console.error("Error loading folder:", err);
      container.removeChild(loading);
      const error = Utils.createErrorElement("Error Loading Folder", err.message);
      container.appendChild(error);
    }
  }
};

/* =======================
   UI Helpers
   ======================= */
const UI = {
  clearAndShowHeader: (container, backText, title) => {
    container.innerHTML = '';

    const backBtn = UI.createButton(backText, "explorer-button back-button");
    backBtn.onclick = () => Navigation.goBack();
    container.appendChild(backBtn);

    if (title) {
      const titleDiv = document.createElement("div");
      titleDiv.className = "section-title";
      titleDiv.textContent = title;
      container.appendChild(titleDiv);
    }
  },

  createButton: (text, className = "explorer-button") => {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.className = className;
    return btn;
  },

  showNoData: (container, message) => {
    const noData = document.createElement("div");
    noData.style.cssText = `text-align:center;padding:30px;color:#666;font-style:italic;`;
    noData.textContent = message;
    container.appendChild(noData);
  },

  showAlphabetNavigation: () => {
    const container = document.getElementById('explorer');
    Navigation.pushState('alphabet');

    UI.clearAndShowHeader(container, "← Back", "Select Starting Letter");

    const buttonGrid = document.createElement("div");
    buttonGrid.className = "alphabet-grid";

    Utils.getAlphabetArray().forEach(letter => {
      const btn = UI.createButton(letter, "explorer-button alphabet-button");
      btn.setAttribute('data-letter', letter);
      btn.onclick = () => Explorer.showMoviesByLetter(letter);
      buttonGrid.appendChild(btn);
    });

    container.appendChild(buttonGrid);
  }
};

/* =======================
   Summary Display
   ======================= */
const SummaryDisplay = {
  createSummary: (jsonData) => {
    const summaryDisplay = document.getElementById('summaryDisplay');
    const summaryGrid = document.getElementById('summaryGrid');
    summaryGrid.innerHTML = '';

    const moviewiseSummaryKey = SummaryDisplay.findMoviewiseSummaryKey(jsonData);

    if (moviewiseSummaryKey && Array.isArray(jsonData[moviewiseSummaryKey]) && jsonData[moviewiseSummaryKey].length > 0) {
      SummaryDisplay.displayMoviewiseSummaryData(jsonData[moviewiseSummaryKey], summaryGrid);
    } else {
      SummaryDisplay.displayGeneralSummary(jsonData, summaryGrid);
    }
    summaryDisplay.classList.add('show');
  },

  findMoviewiseSummaryKey: (jsonData) => {
    return Object.keys(jsonData).find(key => {
      const lowerKey = key.toLowerCase();
      return lowerKey.includes('moviewise') && lowerKey.includes('summary');
    });
  },

  displayMoviewiseSummaryData: (summaryData, container) => {
    document.querySelector('.summary-title').textContent = '📊 Moviewise Summary Data';
    if (summaryData.length > 0) {
      const firstRecord = summaryData[0];
      if (summaryData.length === 1 && typeof firstRecord === 'object') {
        SummaryDisplay.displaySelectedFields(firstRecord, container);
      } else {
        SummaryDisplay.displayAggregateMovieDataFiltered(summaryData, container);
      }
    }
  },

  displaySelectedFields: (record, container) => {
    let fieldsToShow = [];
    if (CONFIG.moviewiseSummaryFields && Array.isArray(CONFIG.moviewiseSummaryFields)) {
      fieldsToShow = CONFIG.moviewiseSummaryFields.filter(field =>
        record.hasOwnProperty(field) || record.hasOwnProperty(field.toLowerCase()) ||
        Object.keys(record).some(key => key.toLowerCase() === field.toLowerCase())
      );

      fieldsToShow = fieldsToShow.map(field => {
        const exactMatch = Object.keys(record).find(key => key === field);
        if (exactMatch) return exactMatch;
        const caseInsensitiveMatch = Object.keys(record).find(key => key.toLowerCase() === field.toLowerCase());
        return caseInsensitiveMatch || field;
      }).filter(field => record.hasOwnProperty(field));
    } else {
      fieldsToShow = Object.keys(record);
    }

    fieldsToShow.forEach(key => {
      const summaryItem = document.createElement('div');
      summaryItem.className = 'summary-item';
      summaryItem.innerHTML = `
        <div class="summary-key">${Utils.formatDisplayText(key)}</div>
        <div class="summary-value">${Utils.formatValue(record[key])}</div>
      `;
      container.appendChild(summaryItem);
    });

    if (fieldsToShow.length === 0) {
      const noDataItem = document.createElement('div');
      noDataItem.className = 'summary-item';
      noDataItem.innerHTML = `
        <div class="summary-key">Notice</div>
        <div class="summary-value">No matching fields found. Check CONFIG.moviewiseSummaryFields.</div>
      `;
      container.appendChild(noDataItem);
    }
  },

  displayAggregateMovieDataFiltered: (summaryData, container) => {
    let keysToShow = [];

    if (CONFIG.moviewiseSummaryFields && Array.isArray(CONFIG.moviewiseSummaryFields)) {
      const allKeys = new Set();
      summaryData.forEach(item => {
        if (typeof item === 'object' && item !== null) {
          Object.keys(item).forEach(k => allKeys.add(k));
        }
      });

      keysToShow = CONFIG.moviewiseSummaryFields.filter(field => {
        return Array.from(allKeys).some(key => key.toLowerCase() === field.toLowerCase());
      }).map(field => Array.from(allKeys).find(key => key.toLowerCase() === field.toLowerCase())).filter(Boolean);
    } else {
      const allKeys = new Set();
      summaryData.forEach(item => {
        if (typeof item === 'object' && item !== null) {
          Object.keys(item).forEach(k => allKeys.add(k));
        }
      });
      keysToShow = Array.from(allKeys);
    }

    const countItem = document.createElement('div');
    countItem.className = 'summary-item';
    countItem.innerHTML = `<div class="summary-key">Total Movies</div><div class="summary-value">${summaryData.length}</div>`;
    container.appendChild(countItem);

    keysToShow.forEach(key => {
      const values = summaryData.map(item => item[key]).filter(v => v != null);
      if (values.length > 0) {
        let displayValue = '';
        if (values.every(val => typeof val === 'number' || !isNaN(Number(val)))) {
          const numValues = values.map(val => Number(val));
          const total = numValues.reduce((s,v) => s+v, 0);
          const avg = total / numValues.length;
          displayValue = `Total: ${total.toLocaleString()}, Avg: ${Math.round(avg).toLocaleString()}`;
        } else {
          const uniqueValues = [...new Set(values)].slice(0,3);
          displayValue = uniqueValues.join(', ');
          if (values.length > uniqueValues.length) displayValue += ` (+${values.length - uniqueValues.length} more)`;
        }

        const summaryItem = document.createElement('div');
        summaryItem.className = 'summary-item';
        summaryItem.innerHTML = `
          <div class="summary-key">${Utils.formatDisplayText(key)}</div>
          <div class="summary-value">${displayValue}</div>
        `;
        container.appendChild(summaryItem);
      }
    });

    if (keysToShow.length === 0 && CONFIG.moviewiseSummaryFields) {
      const noDataItem = document.createElement('div');
      noDataItem.className = 'summary-item';
      noDataItem.innerHTML = `
        <div class="summary-key">Notice</div>
        <div class="summary-value">No matching fields found. Check CONFIG.moviewiseSummaryFields configuration.</div>
      `;
      container.appendChild(noDataItem);
    }
  },

  displayGeneralSummary: (jsonData, container) => {
    document.querySelector('.summary-title').textContent = '📊 Data Summary';
    const summaryItems = [];

    Object.keys(jsonData).forEach(key => {
      if (Array.isArray(jsonData[key])) {
        summaryItems.push({ key: Utils.formatDisplayText(key), value: `${jsonData[key].length} records` });
      } else if (typeof jsonData[key] !== 'object') {
        summaryItems.push({ key: Utils.formatDisplayText(key), value: Utils.formatValue(jsonData[key]) });
      }
    });

    const totalArrays = Object.values(jsonData).filter(v => Array.isArray(v)).length;
    const totalRecords = Object.values(jsonData).filter(v => Array.isArray(v)).reduce((s,arr) => s + arr.length, 0);

    if (totalArrays > 0) {
      summaryItems.unshift({ key: 'Total Data Tables', value: totalArrays.toString() });
      summaryItems.unshift({ key: 'Total Records', value: totalRecords.toLocaleString() });
    }

    summaryItems.forEach(item => {
      const summaryItem = document.createElement('div');
      summaryItem.className = 'summary-item';
      summaryItem.innerHTML = `<div class="summary-key">${item.key}</div><div class="summary-value">${item.value}</div>`;
      container.appendChild(summaryItem);
    });
  },

  hide: () => {
    document.getElementById('summaryDisplay').classList.remove('show');
  }
};

/* =======================
   JSON Viewer
   ======================= */
const JsonViewer = {
  showExplorer: () => {
    document.getElementById('explorerSection').classList.remove('hidden');
    document.getElementById('jsonViewerSection').classList.remove('show');
    JsonViewer.reset();
  },

  show: () => {
    document.getElementById('explorerSection').classList.add('hidden');
    document.getElementById('jsonViewerSection').classList.add('show');
  },

  reset: () => {
    document.getElementById('loadingSection').style.display = 'none';
    document.getElementById('errorSection').style.display = 'none';
    document.getElementById('buttonsContainer').classList.remove('show');
    document.getElementById('dataDisplay').classList.remove('show');
    document.getElementById('filterSection').classList.remove('show');
    document.getElementById('noData').style.display = 'block';
    document.getElementById('dataTable').style.display = 'none';
    SummaryDisplay.hide();
  },

  openJsonViewer: async (url, filename) => {
    JsonViewer.show();
    console.log(url, filename);
    const loadingSection = document.getElementById('loadingSection');
    const errorSection = document.getElementById('errorSection');
    const buttonsContainer = document.getElementById('buttonsContainer');
    const dataDisplay = document.getElementById('dataDisplay');

    loadingSection.style.display = 'block';
    errorSection.style.display = 'none';
    buttonsContainer.classList.remove('show');
    dataDisplay.classList.remove('show');
    SummaryDisplay.hide();

    try {
      AppState.jsonData = await GitHubAPI.fetchJsonFile(url);
      if (!AppState.jsonData || typeof AppState.jsonData !== 'object') throw new Error('Invalid JSON data structure');

      const hasArrayData = Object.values(AppState.jsonData).some(v => Array.isArray(v));
      if (!hasArrayData) throw new Error('No array data found in JSON file');

      loadingSection.style.display = 'none';
      buttonsContainer.classList.add('show');
      dataDisplay.classList.add('show');

      document.querySelector('.header p').textContent = `Viewing: ${filename}`;

      SummaryDisplay.createSummary(AppState.jsonData);
      JsonViewer.createDataButtons();
      JsonViewer.resetDataDisplay();

    } catch (error) {
      console.error('Error loading JSON:', error);
      JsonViewer.showError(error);
    }
  },

  showError: (error) => {
    const loadingSection = document.getElementById('loadingSection');
    const errorSection = document.getElementById('errorSection');

    loadingSection.style.display = 'none';

    let errorMessage = '';
    if (error.name === 'SyntaxError') {
      errorMessage = `
        <div class="error">
          <h3>📄 Invalid JSON Format</h3>
          <p>The JSON file contains invalid syntax.</p>
        </div>`;
    } else {
      errorMessage = `
        <div class="error">
          <h3>❌ Error Loading Data</h3>
          <p>${error.message}</p>
        </div>`;
    }

    errorSection.innerHTML = errorMessage;
    errorSection.style.display = 'block';
  },

  createDataButtons: () => {
    const buttonGrid = document.getElementById('buttonGrid');
    buttonGrid.innerHTML = '';

    Object.keys(AppState.jsonData).forEach(key => {
      if (Array.isArray(AppState.jsonData[key])) {
        const button = document.createElement('button');
        const isMoviewiseSummary = key.toLowerCase().includes('moviewise') && key.toLowerCase().includes('summary');

        button.className = isMoviewiseSummary ? 'data-button moviewise-summary' : 'data-button';

        const title = document.createElement('div');
        title.textContent = Utils.formatDisplayText(key);

        const count = document.createElement('span');
        count.className = 'record-count';
        count.textContent = `${AppState.jsonData[key].length} records`;

        button.appendChild(title);
        button.appendChild(count);
        // pass event so DataTable.showData can mark the clicked button active reliably
        button.addEventListener('click', (e) => DataTable.showData(key, e));
        buttonGrid.appendChild(button);
      }
    });
  },

  resetDataDisplay: () => {
    document.getElementById('filterSection').classList.remove('show');
    document.getElementById('noData').style.display = 'block';
    document.getElementById('dataTable').style.display = 'none';
  }
};

/* =======================
   Data Table
   ======================= */
const DataTable = {
  showData: (key, clickEvent) => {
    // Update active button - reliable via clickEvent
    document.querySelectorAll('.data-button').forEach(btn => btn.classList.remove('active'));
    if (clickEvent && clickEvent.target) {
      const btn = clickEvent.target.closest('.data-button');
      if (btn) btn.classList.add('active');
    }

    AppState.currentDataKey = key;
    const data = AppState.jsonData[key];

    if (!Array.isArray(data) || data.length === 0) {
      DataTable.showNoData(key);
      return;
    }

    AppState.originalData = [...data];
    AppState.filteredData = [...data];
    AppState.currentSort = { column: null, direction: 'asc' };

    document.getElementById('dataTitle').textContent = Utils.formatDisplayText(key);
    document.getElementById('dataCount').textContent = `${data.length} records`;
    document.getElementById('downloadTableBtn').style.display = 'block';
    document.getElementById('filterSection').classList.add('show');

    DataTable.setupColumnFilter(data);

    document.getElementById('noData').style.display = 'none';
    document.getElementById('dataTable').style.display = 'table';

    DataTable.createTable(AppState.filteredData);
  },

  showNoData: (key) => {
    document.getElementById('dataTitle').textContent = Utils.formatDisplayText(key);
    document.getElementById('dataCount').textContent = '0 records';
    document.getElementById('filterSection').classList.remove('show');
    document.getElementById('downloadTableBtn').style.display = 'none';

    const noData = document.getElementById('noData');
    noData.style.display = 'block';
    noData.textContent = 'No data available for this table';

    document.getElementById('dataTable').style.display = 'none';
  },

  createTable: (data) => {
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';

    if (data.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="100%" style="text-align:center;padding:30px;color:#666;">No records match your filters</td></tr>';
      return;
    }

    const allKeys = new Set();
    data.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(k => allKeys.add(k));
      }
    });
    const keys = Array.from(allKeys);

    const headerRow = document.createElement('tr');
    keys.forEach(key => {
      const th = document.createElement('th');
      th.textContent = Utils.formatDisplayText(key);
      th.onclick = () => DataTable.sortTable(key);
      headerRow.appendChild(th);
    });
    tableHead.appendChild(headerRow);

    data.forEach(item => {
      const row = document.createElement('tr');
      keys.forEach(key => {
        const td = document.createElement('td');
        let value = item[key];

        if (value === null || value === undefined) {
          td.textContent = '-';
          td.style.color = '#999';
        } else if (typeof value === 'number') {
          td.textContent = value.toLocaleString();
        } else if (typeof value === 'object') {
          td.textContent = JSON.stringify(value);
        } else {
          td.textContent = String(value);
        }

        row.appendChild(td);
      });
      tableBody.appendChild(row);
    });
  },

  setupColumnFilter: (data) => {
    const columnFilter = document.getElementById('columnFilter');
    columnFilter.innerHTML = '<option value="">All Columns</option>';
    if (data.length === 0) return;

    const allKeys = new Set();
    data.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(k => allKeys.add(k));
      }
    });

    Array.from(allKeys).sort().forEach(key => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = Utils.formatDisplayText(key);
      columnFilter.appendChild(option);
    });
  },

  sortTable: (column) => {
    if (AppState.currentSort.column === column) {
      AppState.currentSort.direction = AppState.currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      AppState.currentSort.column = column;
      AppState.currentSort.direction = 'asc';
    }

    AppState.filteredData.sort((a,b) => {
      let aVal = a[column];
      let bVal = b[column];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      let comparison = 0;
      if (aVal > bVal) comparison = 1;
      else if (aVal < bVal) comparison = -1;

      return AppState.currentSort.direction === 'asc' ? comparison : -comparison;
    });

    DataTable.createTable(AppState.filteredData);
  },

  createFullTable: (data) => {
    if (!data || data.length === 0) return null;

    const allKeys = new Set();
    data.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(k => allKeys.add(k));
      }
    });
    const keys = Array.from(allKeys);

    const table = document.createElement('table');
    table.style.cssText = `
      width:auto;border-collapse:collapse;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size:12px;background:white;margin:20px;position:relative;
    `;

    const watermark = document.createElement('div');
    watermark.textContent = '@nikhilntr9';
    watermark.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);
      font-size:3em;font-weight:bold;color:rgba(79,172,254,0.2);pointer-events:none;z-index:10;white-space:nowrap;
    `;
    table.appendChild(watermark);

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    keys.forEach(key => {
      const th = document.createElement('th');
      th.textContent = Utils.formatDisplayText(key);
      th.style.cssText = `
        padding:10px 12px;border:1px solid #ddd;background:linear-gradient(135deg,#f8f9ff 0%,#e6f3ff 100%);font-weight:600;text-align:left;white-space:nowrap;font-size:11px;position:relative;
      `;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    data.forEach((item, index) => {
      const row = document.createElement('tr');
      if (index % 2 === 0) row.style.backgroundColor = 'rgba(248,251,255,0.5)';

      keys.forEach(key => {
        const td = document.createElement('td');
        let value = item[key];
        if (value === null || value === undefined) { td.textContent = '-'; td.style.color = '#999'; }
        else if (typeof value === 'number') td.textContent = value.toLocaleString();
        else if (typeof value === 'object') td.textContent = JSON.stringify(value);
        else td.textContent = String(value);

        td.style.cssText = `padding:8px 10px;border:1px solid #ddd;white-space:nowrap;font-size:11px;position:relative;`;
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    return table;
  }
};

/* =======================
   Filters (debounced)
   ======================= */
const Filters = {
  apply: () => {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const columnFilter = document.getElementById('columnFilter').value;

    AppState.filteredData = AppState.originalData.filter(item => {
      let matchesSearch = true;
      if (searchInput) {
        if (columnFilter) {
          const value = item[columnFilter];
          matchesSearch = value != null && String(value).toLowerCase().includes(searchInput);
        } else {
          matchesSearch = Object.values(item).some(value =>
            value != null && String(value).toLowerCase().includes(searchInput)
          );
        }
      }
      return matchesSearch;
    });

    if (AppState.currentSort.column) {
      DataTable.sortTable(AppState.currentSort.column);
    } else {
      DataTable.createTable(AppState.filteredData);
    }

    document.getElementById('dataCount').textContent = `${AppState.filteredData.length} records`;
  },

  clear: () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('columnFilter').value = '';
    AppState.currentSort = { column: null, direction: 'asc' };
    AppState.filteredData = [...AppState.originalData];
    DataTable.createTable(AppState.filteredData);
    document.getElementById('dataCount').textContent = `${AppState.filteredData.length} records`;
  }
};

/* =======================
   Global Functions & Handlers
   ======================= */
function showExplorer() { JsonViewer.showExplorer(); }
function applyFilters() { Filters.apply(); }
function clearFilters() { Filters.clear(); }

async function downloadTableAsImage() {
  const downloadBtn = document.getElementById('downloadTableBtn');
  downloadBtn.disabled = true;
  downloadBtn.innerHTML = '⏳ Generating...';

  try {
    const dataToCapture = AppState.originalData;
    if (!dataToCapture || dataToCapture.length === 0) throw new Error('No data available to download');

    const fullTable = DataTable.createFullTable(dataToCapture);
    if (!fullTable) throw new Error('Failed to create table for capture');

    const captureContainer = document.createElement('div');
    captureContainer.style.cssText = `position:absolute;left:-9999px;top:0;background:white;padding:20px;z-index:-1;`;
    const title = document.createElement('h2');
    title.textContent = document.getElementById('dataTitle').textContent;
    title.style.cssText = `margin:0 0 20px 0;color:#333;font-family:'Segoe UI',Tahoma,Verdana,sans-serif;text-align:center;`;
    captureContainer.appendChild(title);
    captureContainer.appendChild(fullTable);
    document.body.appendChild(captureContainer);

    const canvas = await html2canvas(captureContainer, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      scrollX: 0,
      scrollY: 0,
      width: fullTable.offsetWidth + 40,
      height: captureContainer.offsetHeight
    });

    document.body.removeChild(captureContainer);

    const link = document.createElement('a');
    link.download = `${AppState.currentDataKey || 'table'}_${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png');

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    downloadBtn.innerHTML = '✅ Downloaded!';
    setTimeout(() => { downloadBtn.innerHTML = '📥 Download Table'; downloadBtn.disabled = false; }, 2000);

  } catch (error) {
    console.error('Error downloading table:', error);
    downloadBtn.innerHTML = '❌ Error';
    setTimeout(() => { downloadBtn.innerHTML = '📥 Download Table'; downloadBtn.disabled = false; }, 2000);
    alert('Error downloading table: ' + error.message);
  }
}

/* =======================
   Event bindings (no inline handlers)
   ======================= */
document.addEventListener('DOMContentLoaded', () => {
  // Initial explorer load
  Explorer.initialize();

  // Back button
  const backButton = document.getElementById('backButton');
  if (backButton) backButton.addEventListener('click', showExplorer);

  // Download button
  const downloadBtn = document.getElementById('downloadTableBtn');
  if (downloadBtn) downloadBtn.addEventListener('click', downloadTableAsImage);

  // Clear filters button
  const clearBtn = document.getElementById('clearFiltersBtn');
  if (clearBtn) clearBtn.addEventListener('click', clearFilters);

  // Column filter
  const columnFilter = document.getElementById('columnFilter');
  if (columnFilter) columnFilter.addEventListener('change', () => {
    // apply Filters with current debounce wrapper
    debounceApplyFilters();
  });

  // Debounce wrapper around applyFilters
  let debounceTimer = null;
  window.debounceApplyFilters = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      applyFilters();
      debounceTimer = null;
    }, 250);
  };

  // Search input (debounced)
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      debounceApplyFilters();
    });
  }
});

function latestReleases(){
    // fetch('./Latest/latest_releases.json')
    //   .then(response => response.json())
    //   .then(data => {
        data = [
    {
    
    "movie": "og_usa_20250907.json",
    "image": "../images/og.jpg",
    "url" : "https://raw.githubusercontent.com/nikhilpabolu99/data/main/movies/og/usa/20250907/og_usa_20250907.json"
},
 {
    "movie": "mirai_usa_20250907.json",
    "image": "../images/mirai.jpg",
    "url" : "https://raw.githubusercontent.com/nikhilpabolu99/data/main/movies/mirai/20250907/mirai_usa_20250907.json"
}
]
        const container = document.getElementById('latestReleases');
        data.forEach(item => {
          const img = document.createElement('img');
          img.src = 'Latest/' + item.image.replace('../', '');
          img.alt = item.movie + ' Movie Poster';
          img.width = 200;
          img.style.cursor = 'pointer';
          img.onclick = () => JsonViewer.openJsonViewer(item.url, item.movie)
          container.appendChild(img);
        });
    //   });
}

latestReleases();
