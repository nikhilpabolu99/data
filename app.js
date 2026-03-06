// app.js - Movie Collections Website
// Enhanced version with navbar country filtering, movie explorer, and latest file loader

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
   Navbar Functionality
   ======================= */
const NavbarManager = {
  init: () => {
    const navbarToggle = document.getElementById('navbarToggle');
    const navbarMenu = document.getElementById('navbarMenu');
    if (navbarToggle && navbarMenu) {
      navbarToggle.addEventListener('click', () => {
        navbarToggle.classList.toggle('active');
        navbarMenu.classList.toggle('active');
      });
    }
    document.querySelectorAll('.navbar-link, .dropdown-item').forEach(link => {
      link.addEventListener('click', () => {
        navbarToggle?.classList.remove('active');
        navbarMenu?.classList.remove('active');
      });
    });

    // Country dropdown handler
    document.querySelectorAll('.dropdown-menu .dropdown-item').forEach(item => {
      const parentDropdown = item.closest('.dropdown');
      if (parentDropdown?.querySelector('.navbar-link.dropdown-toggle')?.textContent.includes('Country')) {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          const country = item.getAttribute('href').replace('#','').toLowerCase();
          Explorer.showMoviesByCountry(country);
        });
      }
    });

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({behavior: 'smooth', block: 'start'});
        }
      });
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
          menu.style.opacity = '0';
          menu.style.visibility = 'hidden';
        });
      }
    });
    let lastScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
      const navbar = document.querySelector('.navbar');
      const currentScrollY = window.scrollY;
      if (navbar) {
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          navbar.style.transform = 'translateY(-100%)';
        } else {
          navbar.style.transform = 'translateY(0)';
        }
        lastScrollY = currentScrollY;
      }
    });
  }
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
    loading.innerHTML = `<div style="text-align:center;padding:50px;">
      <div class="loading-spinner" style="margin-bottom:20px;"></div>
      <p style="color:#666;font-size:1.1rem;">${text}</p>
    </div>`;
    return loading;
  },
  createErrorElement: (title, message) => {
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `<div class="error">
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
  },
  showToast: (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      background: ${type === 'error' ? '#ff6b6b' : type === 'success' ? '#28a745' : '#4facfe'};
      color: white;
      padding: 15px 25px;
      border-radius: 10px;
      z-index: 10000;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
      font-weight: 600;
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    }, 100);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  },
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};

/* =======================
   GitHub API Helpers
   ======================= */
const GitHubAPI = {
  getHeaders: () => {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'MeherNolan-Explorer-App'
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
        if (response.status === 404)
          throw new Error(`Repository not found (404). Check ${CONFIG.owner}/${CONFIG.repo}.`);
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
    if (container) {
      container.innerHTML = '';
      Explorer.loadFolders("", "explorer", true);
    }
  },
  reattachEventListeners: () => {
    const container = document.getElementById('explorer');
    if (!container) return;
    container.querySelectorAll('.back-button').forEach(btn => {
      btn.onclick = () => Navigation.goBack();
    });
    const moviesBtn = container.querySelector('.explorer-button[data-action="movies"]');
    if (moviesBtn) moviesBtn.onclick = () => UI.showAlphabetNavigation();
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
    if (!container) return;
    const loading = Utils.createLoadingElement('Testing repository access...');
    container.innerHTML = '';
    container.appendChild(loading);
    try {
      const accessTest = await GitHubAPI.testAccess();
      container.removeChild(loading);

      if (!accessTest.success) {
        const error = Utils.createErrorElement("Repository Access Error", accessTest.error);
        container.appendChild(error);
        Utils.showToast('Failed to access repository', 'error');
        return;
      }
      Utils.showToast('Repository connected successfully', 'success');
      Explorer.loadFolders("", "explorer", true);
    } catch (err) {
      if (container.contains(loading)) container.removeChild(loading);
      const error = Utils.createErrorElement("Initialization Error", err.message);
      container.appendChild(error);
      Utils.showToast('Failed to initialize explorer', 'error');
    }
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
          `Could not find the '${CONFIG.moviesFolder}' folder in ${CONFIG.owner}/${CONFIG.repo}.`
        );
        container.appendChild(error);
      }
    } catch (err) {
      const error = Utils.createErrorElement("Error Loading Repository", err.message);
      container.appendChild(error);
      Utils.showToast('Error loading data', 'error');
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
    if (!container) return;
    Navigation.pushState(`letter-${letter}`);
    UI.clearAndShowHeader(container, `← Back to Letters`, `Movies starting with "${letter}"`);
    const loading = Utils.createLoadingElement('Loading movies...');
    container.appendChild(loading);

    try {
      const data = await GitHubAPI.fetchFolderContents(CONFIG.moviesFolder);
      if (container.contains(loading)) container.removeChild(loading);

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
      if (container.contains(loading)) container.removeChild(loading);
      const error = Utils.createErrorElement("Error Loading Movies", err.message);
      container.appendChild(error);
      Utils.showToast('Failed to load movies', 'error');
    }
  },

  showMovieFolder: async (path, folderName) => {
    const container = document.getElementById('explorer');
    if (!container) return;
    Navigation.pushState(`movie-${path}`);
    UI.clearAndShowHeader(container, `← Back to Movies`, folderName);
    const loading = Utils.createLoadingElement('Loading folder contents...');
    container.appendChild(loading);
    try {
      const data = await GitHubAPI.fetchFolderContents(path);
      if (container.contains(loading)) container.removeChild(loading);
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
      if (container.contains(loading)) container.removeChild(loading);
      const error = Utils.createErrorElement("Error Loading Folder", err.message);
      container.appendChild(error);
    }
  },

  showSubFolder: async (path, folderName) => {
    const container = document.getElementById('explorer');
    if (!container) return;
    Navigation.pushState(`folder-${path}`);
    UI.clearAndShowHeader(container, `← Back`, folderName);
    const loading = Utils.createLoadingElement('Loading folder contents...');
    container.appendChild(loading);

    try {
      const data = await GitHubAPI.fetchFolderContents(path);
      if (container.contains(loading)) container.removeChild(loading);
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
      if (container.contains(loading)) container.removeChild(loading);
      const error = Utils.createErrorElement("Error Loading Folder", err.message);
      container.appendChild(error);
    }
  },

  // ----- COUNTRY FILTERING -----
  showMoviesByCountry: async function(country) {
    const container = document.getElementById('explorer');
    if (!container) return;
    Navigation.pushState(`country-${country}`);
    UI.clearAndShowHeader(container, `← Back to Country Selection`, `Movies with "${country.toUpperCase()}" Collections`);
    const loading = Utils.createLoadingElement(`Searching for "${country}" data...`);
    container.appendChild(loading);

    try {
      const movies = await GitHubAPI.fetchFolderContents(CONFIG.moviesFolder);
      if (container.contains(loading)) container.removeChild(loading);
      const availableMovies = [];
      for (const movie of movies) {
        if (movie.type === 'dir') {
          const countries = await GitHubAPI.fetchFolderContents(`${CONFIG.moviesFolder}/${movie.name}`);
          if (countries.some(f => f.type === 'dir' && f.name.toLowerCase() === country)) {
            availableMovies.push(movie.name);
          }
        }
      }
      if (availableMovies.length === 0) {
        UI.showNoData(container, `No movies have collections for "${country}"`);
      } else {
        availableMovies.forEach(movieName => {
          const btn = UI.createButton(movieName, "explorer-button");
          btn.onclick = () => Explorer.showLatestCountryData(movieName, country);
          container.appendChild(btn);
        });
      }
    } catch (err) {
      if (container.contains(loading)) container.removeChild(loading);
      const error = Utils.createErrorElement("Error Loading Country", err.message);
      container.appendChild(error);
      Utils.showToast('Failed to load country data', 'error');
    }
  },

  showLatestCountryData: async function(movieName, country) {
    const container = document.getElementById('explorer');
    if (!container) return;
    Navigation.pushState(`movie-${movieName}-country-${country}`);
    UI.clearAndShowHeader(container, `← Back to Countries`, `${movieName} – ${country.toUpperCase()} Latest Collection`);
    const loading = Utils.createLoadingElement(`Loading latest collection for ${movieName} (${country})...`);
    container.appendChild(loading);

    try {
      const countryFolder = `${CONFIG.moviesFolder}/${movieName}/${country}`;
      const dateFolders = await GitHubAPI.fetchFolderContents(countryFolder);
      const latestDateFolder = dateFolders
        .filter(f => f.type === 'dir' && /^\d{8}$/.test(f.name))
        .sort((a, b) => b.name.localeCompare(a.name))[0];
      if (!latestDateFolder) {
        if (container.contains(loading)) container.removeChild(loading);
        UI.showNoData(container, "No datewise data available for this movie in this country.");
        return;
      }
      const files = await GitHubAPI.fetchFolderContents(`${countryFolder}/${latestDateFolder.name}`);
      const latestJson = files
        .filter(f => f.type === 'file' && f.name.endsWith('.json'))
        .sort((a, b) => b.name.localeCompare(a.name))[0];
      if (!latestJson) {
        if (container.contains(loading)) container.removeChild(loading);
        UI.showNoData(container, "No collection file found for the latest date.");
        return;
      }
      if (container.contains(loading)) container.removeChild(loading);
      JsonViewer.openJsonViewer(latestJson.download_url, latestJson.name);
    } catch (err) {
      if (container.contains(loading)) container.removeChild(loading);
      const error = Utils.createErrorElement("Error Loading Data", err.message);
      container.appendChild(error);
      Utils.showToast('Failed to load latest collection', 'error');
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
      titleDiv.style.marginTop = "20px";
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
    noData.className = "no-data";
    noData.textContent = message;
    container.appendChild(noData);
  },

  showAlphabetNavigation: () => {
    const container = document.getElementById('explorer');
    if (!container) return;

    Navigation.pushState('alphabet');

    UI.clearAndShowHeader(container, "← Back", "Movies by 1st Letter");

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
   Latest Releases
   ======================= */
const LatestReleases = {
  load: () => {
    const data = [
      {
        "movie": "Dhurandhar2",
        //"image": "https://via.placeholder.com/200x300/4facfe/white?text=OG",
         "image": "images/Dhurandhar2.jpg",
        //"url": "https://raw.githubusercontent.com/nikhilpabolu99/data/main/movies/og/usa/20250907/og_usa_20250907.json"
         movieFolderName: "dhur",
         movieDisplayName: "Dhurandhar2"
      },
     {
        "movie": "Ustaad Bhagath Singh",
         "image": "images/ubs.jpg",
         movieFolderName: "ubs",
         movieDisplayName: "UstaadBhagatSingh"
      }  
    ];

    const container = document.getElementById('latestReleases');
    if (!container) return;

    container.innerHTML = '';
    
    data.forEach(item => {
      const movieCard = document.createElement('div');
      movieCard.style.cssText = `
        position: relative;
        cursor: pointer;
        transition: all 0.3s ease;
        //width: 140px;            
  //margin: 8px;
      `;
      
      const img = document.createElement('img');
      img.src = item.image;
      img.alt = item.movie + ' Movie Poster';
      img.style.cssText = `
        width: 100px;
        height: 160px;
        border-radius: 15px;
        object-fit: cover;
        box-shadow: 0 8px 20px rgba(0,0,0,0.15);
      `;
      
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(transparent, rgba(0,0,0,0.8));
        color: white;
        padding: 20px 15px 15px;
        border-radius: 0 0 15px 15px;
        font-weight: 600;
        text-align: center;
      `;
      overlay.textContent = item.movie;
      
      movieCard.appendChild(img);
      movieCard.appendChild(overlay);
      
      //movieCard.onclick = () => JsonViewer.openJsonViewer(item.url, item.movie);
      //movieCard.onclick = () => Explorer.showMovieFolder(`movies/${item.movieFolderName}`, item.movieDisplayName);
      // movieCard.onclick = () => Explorer.showMovieFolder(`movies/${item.folder}`, item.movie);
    movieCard.onclick = async () => {
  await Explorer.showMovieFolder(`movies/${item.movieFolderName}`, item.movieDisplayName);
  const explorerContainer = document.getElementById('explorer');
  if (explorerContainer) {
    // Get the vertical position of the container relative to the viewport plus current scroll offset
    const topPos = explorerContainer.getBoundingClientRect().top + window.pageYOffset;

    // Scroll to position with smooth behavior and slightly offset for better view
    window.scrollTo({ 
      top: topPos - 20, // offset 20px above container for nicer visual spacing
      behavior: 'smooth' 
    });
  }
};



      container.appendChild(movieCard);
    });
  }
};

/* =======================
   Summary Display
   ======================= */
const SummaryDisplay = {
  createSummary: (jsonData) => {
    const summaryDisplay = document.getElementById('summaryDisplay');
    const summaryGrid = document.getElementById('summaryGrid');
    
    if (!summaryDisplay || !summaryGrid) return;
    
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
    const titleElement = document.querySelector('.summary-title');
    if (titleElement) titleElement.textContent = 'Moviewise Summary Data';
    
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
  },

  displayGeneralSummary: (jsonData, container) => {
    const titleElement = document.querySelector('.summary-title');
    if (titleElement) titleElement.textContent = 'Data Summary';
    
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
    const summaryDisplay = document.getElementById('summaryDisplay');
    if (summaryDisplay) summaryDisplay.classList.remove('show');
  }
};

/* =======================
   JSON Viewer
   ======================= */
const JsonViewer = {
  showExplorer: () => {
    document.getElementById('explorerSection')?.classList.remove('hidden');
    document.getElementById('jsonViewerSection')?.classList.remove('show');
    JsonViewer.reset();
  },

  show: () => {
    document.getElementById('explorerSection')?.classList.add('hidden');
    document.getElementById('jsonViewerSection')?.classList.add('show');
  },

  reset: () => {
    const elements = {
      loadingSection: document.getElementById('loadingSection'),
      errorSection: document.getElementById('errorSection'),
      buttonsContainer: document.getElementById('buttonsContainer'),
      dataDisplay: document.getElementById('dataDisplay'),
      filterSection: document.getElementById('filterSection'),
      noData: document.getElementById('noData'),
      dataTable: document.getElementById('dataTable')
    };

    if (elements.loadingSection) elements.loadingSection.style.display = 'none';
    if (elements.errorSection) elements.errorSection.style.display = 'none';
    if (elements.buttonsContainer) elements.buttonsContainer.classList.remove('show');
    if (elements.dataDisplay) elements.dataDisplay.classList.remove('show');
    if (elements.filterSection) elements.filterSection.classList.remove('show');
    if (elements.noData) elements.noData.style.display = 'block';
    if (elements.dataTable) elements.dataTable.style.display = 'none';
    
    SummaryDisplay.hide();
  },

  openJsonViewer: async (url, filename) => {
    JsonViewer.show();
    
    const elements = {
      loadingSection: document.getElementById('loadingSection'),
      errorSection: document.getElementById('errorSection'),
      buttonsContainer: document.getElementById('buttonsContainer'),
      dataDisplay: document.getElementById('dataDisplay')
    };

    if (elements.loadingSection) elements.loadingSection.style.display = 'block';
    if (elements.errorSection) elements.errorSection.style.display = 'none';
    if (elements.buttonsContainer) elements.buttonsContainer.classList.remove('show');
    if (elements.dataDisplay) elements.dataDisplay.classList.remove('show');
    
    SummaryDisplay.hide();

    try {
      AppState.jsonData = await GitHubAPI.fetchJsonFile(url);
      
      if (!AppState.jsonData || typeof AppState.jsonData !== 'object') {
        throw new Error('Invalid JSON data structure');
      }

      const hasArrayData = Object.values(AppState.jsonData).some(v => Array.isArray(v));
      if (!hasArrayData) {
        throw new Error('No array data found in JSON file');
      }

      if (elements.loadingSection) elements.loadingSection.style.display = 'none';
      if (elements.buttonsContainer) elements.buttonsContainer.classList.add('show');
      if (elements.dataDisplay) elements.dataDisplay.classList.add('show');

      SummaryDisplay.createSummary(AppState.jsonData);
      JsonViewer.createDataButtons();
      JsonViewer.resetDataDisplay();
      
      Utils.showToast('Data loaded successfully', 'success');

    } catch (error) {
      console.error('Error loading JSON:', error);
      JsonViewer.showError(error);
      Utils.showToast('Failed to load data', 'error');
    }
  },

  showError: (error) => {
    const elements = {
      loadingSection: document.getElementById('loadingSection'),
      errorSection: document.getElementById('errorSection')
    };

    if (elements.loadingSection) elements.loadingSection.style.display = 'none';

    let errorMessage = '';
    if (error.name === 'SyntaxError') {
      errorMessage = `
        <div class="error">
          <h3>Invalid JSON Format</h3>
          <p>The JSON file contains invalid syntax.</p>
        </div>`;
    } else {
      errorMessage = `
        <div class="error">
          <h3>Error Loading Data</h3>
          <p>${error.message}</p>
        </div>`;
    }

    if (elements.errorSection) {
      elements.errorSection.innerHTML = errorMessage;
      elements.errorSection.style.display = 'block';
    }
  },

  createDataButtons: () => {
    const buttonGrid = document.getElementById('buttonGrid');
    if (!buttonGrid) return;
    
    buttonGrid.innerHTML = '';

 const excludedKeys = new Set(['hf_unres_results', 'status_400_failures', 'finaldf']);

Object.keys(AppState.jsonData).forEach(key => {
  if (excludedKeys.has(key)) return; // skip excluded keys
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
    
    button.addEventListener('click', (e) => DataTable.showData(key, e));
    buttonGrid.appendChild(button);
  }
});

  },

  resetDataDisplay: () => {
    const elements = {
      filterSection: document.getElementById('filterSection'),
      noData: document.getElementById('noData'),
      dataTable: document.getElementById('dataTable')
    };

    if (elements.filterSection) elements.filterSection.classList.remove('show');
    if (elements.noData) elements.noData.style.display = 'block';
    if (elements.dataTable) elements.dataTable.style.display = 'none';
  }
};

/* =======================
   Data Table
   ======================= */
const DataTable = {
  showData: (key, clickEvent) => {
    // Update active button
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

    const elements = {
      dataTitle: document.getElementById('dataTitle'),
      dataCount: document.getElementById('dataCount'),
      downloadBtn: document.getElementById('downloadTableBtn'),
      filterSection: document.getElementById('filterSection'),
      noData: document.getElementById('noData'),
      dataTable: document.getElementById('dataTable')
    };

    if (elements.dataTitle) elements.dataTitle.textContent = Utils.formatDisplayText(key);
    if (elements.dataCount) elements.dataCount.textContent = `${data.length} records`;
    if (elements.downloadBtn) elements.downloadBtn.style.display = 'block';
    if (elements.filterSection) elements.filterSection.classList.add('show');

    DataTable.setupColumnFilter(data);

    if (elements.noData) elements.noData.style.display = 'none';
    if (elements.dataTable) elements.dataTable.style.display = 'table';

    DataTable.createTable(AppState.filteredData);
  },

  showNoData: (key) => {
    const elements = {
      dataTitle: document.getElementById('dataTitle'),
      dataCount: document.getElementById('dataCount'),
      filterSection: document.getElementById('filterSection'),
      downloadBtn: document.getElementById('downloadTableBtn'),
      noData: document.getElementById('noData'),
      dataTable: document.getElementById('dataTable')
    };

    if (elements.dataTitle) elements.dataTitle.textContent = Utils.formatDisplayText(key);
    if (elements.dataCount) elements.dataCount.textContent = '0 records';
    if (elements.filterSection) elements.filterSection.classList.remove('show');
    if (elements.downloadBtn) elements.downloadBtn.style.display = 'none';

    if (elements.noData) {
      elements.noData.style.display = 'block';
      elements.noData.textContent = 'No data available for this table';
    }

    if (elements.dataTable) elements.dataTable.style.display = 'none';
  },

  createTable: (data) => {
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');
    
    if (!tableHead || !tableBody) return;
    
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';

    if (data.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="100%" class="no-data">No records match your filters</td></tr>';
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
    if (!columnFilter) return;
    
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
   Filters
   ======================= */
const Filters = {
  apply: () => {
    const searchInput = document.getElementById('searchInput');
    const columnFilter = document.getElementById('columnFilter');
    
    if (!searchInput || !columnFilter) return;
    
    const searchValue = searchInput.value.toLowerCase();
    const columnValue = columnFilter.value;

    AppState.filteredData = AppState.originalData.filter(item => {
      let matchesSearch = true;
      if (searchValue) {
        if (columnValue) {
          const value = item[columnValue];
          matchesSearch = value != null && String(value).toLowerCase().includes(searchValue);
        } else {
          matchesSearch = Object.values(item).some(value =>
            value != null && String(value).toLowerCase().includes(searchValue)
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

    const dataCount = document.getElementById('dataCount');
    if (dataCount) dataCount.textContent = `${AppState.filteredData.length} records`;
  },

  clear: () => {
    const searchInput = document.getElementById('searchInput');
    const columnFilter = document.getElementById('columnFilter');
    const dataCount = document.getElementById('dataCount');
    
    if (searchInput) searchInput.value = '';
    if (columnFilter) columnFilter.value = '';
    
    AppState.currentSort = { column: null, direction: 'asc' };
    AppState.filteredData = [...AppState.originalData];
    DataTable.createTable(AppState.filteredData);
    
    if (dataCount) dataCount.textContent = `${AppState.filteredData.length} records`;
  }
};

/* =======================
   Download Functionality
   ======================= */
async function downloadTableAsImage() {
  const downloadBtn = document.getElementById('downloadTableBtn');
  if (!downloadBtn) return;
  
  downloadBtn.disabled = true;
  downloadBtn.innerHTML = 'Generating...';

  try {
    const dataToCapture = AppState.originalData;
    if (!dataToCapture || dataToCapture.length === 0) {
      throw new Error('No data available to download');
    }

    const fullTable = DataTable.createFullTable(dataToCapture);
    if (!fullTable) {
      throw new Error('Failed to create table for capture');
    }

    const captureContainer = document.createElement('div');
    captureContainer.style.cssText = `position:absolute;left:-9999px;top:0;background:white;padding:20px;z-index:-1;`;
    
    const title = document.createElement('h2');
    const dataTitle = document.getElementById('dataTitle');
    title.textContent = dataTitle ? dataTitle.textContent : 'Data Export';
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

    downloadBtn.innerHTML = 'Downloaded!';
    Utils.showToast('Table downloaded successfully', 'success');
    
    setTimeout(() => { 
      downloadBtn.innerHTML = 'Download Table'; 
      downloadBtn.disabled = false; 
    }, 2000);

  } catch (error) {
    console.error('Error downloading table:', error);
    downloadBtn.innerHTML = 'Error';
    Utils.showToast('Failed to download table', 'error');
    
    setTimeout(() => { 
      downloadBtn.innerHTML = 'Download Table'; 
      downloadBtn.disabled = false; 
    }, 2000);
  }
}

/* =======================
   Event Listeners & Initialization
   ======================= */
document.addEventListener('DOMContentLoaded', () => {
  NavbarManager.init();
  Explorer.initialize();
  LatestReleases.load();

  const backButton = document.getElementById('backButton');
  if (backButton) {
    backButton.addEventListener('click', () => JsonViewer.showExplorer());
  }
  const downloadBtn = document.getElementById('downloadTableBtn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadTableAsImage);
  }
  const clearBtn = document.getElementById('clearFiltersBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', Filters.clear);
  }
  const columnFilter = document.getElementById('columnFilter');
  if (columnFilter) {
    columnFilter.addEventListener('change', () => {
      debounceApplyFilters();
    });
  }
  let debounceTimer = null;
  window.debounceApplyFilters = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      Filters.apply();
      debounceTimer = null;
    }, 250);
  };
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      debounceApplyFilters();
    });
  }
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const tableContainer = document.getElementById('tableContainer');
      if (tableContainer && tableContainer.style.display !== 'none') {
        tableContainer.style.display = 'none';
        setTimeout(() => {
          tableContainer.style.display = 'block';
        }, 10);
      }
    }, 250);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (AppState.currentView !== 'root') {
        Navigation.goBack();
      } else if (document.getElementById('jsonViewerSection')?.classList.contains('show')) {
        JsonViewer.showExplorer();
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'f' && document.getElementById('searchInput')) {
      e.preventDefault();
      document.getElementById('searchInput').focus();
    }
  });
  window.addEventListener('unhandledrejection', (event) => {
    Utils.showToast('An unexpected error occurred', 'error');
  });
  window.addEventListener('error', (event) => {
    Utils.showToast('An unexpected error occurred', 'error');
  });
});

/* =======================
   Global Functions (for backward compatibility)
   ======================= */
function showExplorer() { 
  JsonViewer.showExplorer(); 
}

function applyFilters() { 
  Filters.apply(); 
}

function clearFilters() { 
  Filters.clear(); 
}

/* =======================
   Additional Utility Functions
   ======================= */
const Analytics = {
  trackPageView: (page) => {
    // Placeholder for analytics tracking
    console.log(`Page view: ${page}`);
  },
  
  trackEvent: (category, action, label) => {
    // Placeholder for event tracking
    console.log(`Event: ${category} - ${action} - ${label}`);
  }
};

const Performance = {
  measureTime: (name, fn) => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
    return result;
  }
};

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CONFIG,
    AppState,
    Utils,
    GitHubAPI,
    Navigation,
    Explorer,
    UI,
    JsonViewer,
    DataTable,
    Filters,
    SummaryDisplay,
    LatestReleases,
    NavbarManager
  };
}


















