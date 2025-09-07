// Configuration - Easy to modify
const CONFIG = {
  owner: "nikhilpabolu99",
  repo: "data",
  branch: "main",
  moviesFolder: "movies",
  // GitHub token for higher rate limits (5000 requests/hour vs 60)
  // Set to null to use without authentication (60 requests/hour limit)
  githubToken: null, 
  
  // Configure which fields to show in Moviewise Summary
  // Set to null to show all fields, or specify an array of field names
  moviewiseSummaryFields: [
    "MOVIE",
    "TOTALSTATES",
    "TOTALSHOWS",
    "BOOKEDSEATS",
    "TOTALGROSS",
    "OCCUPANCY",
    "LASTUPDATEDON"
  ]
  // Examples of other possible fields you might want to include:
  // "genre", "director", "studio", "rating", "runtime", "screens"
};

const API_BASE = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents`;

// Application State
const AppState = {
  // Navigation
  navigationStack: [],
  currentView: 'root',
  
  // JSON Viewer
  jsonData: {},
  currentDataKey: null,
  originalData: [],
  filteredData: [],
  currentSort: { column: null, direction: 'asc' }
};

// Utility Functions
const Utils = {
  // Create alphabet array for navigation
  getAlphabetArray: () => ['0-9', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
  
  // Check if character matches letter filter
  matchesLetter: (char, letter) => {
    const upperChar = char.toUpperCase();
    return letter === '0-9' ? /[0-9]/.test(upperChar) : upperChar === letter;
  },
  
  // Format display text
  formatDisplayText: (text) => text.replace(/_/g, ' ').toUpperCase(),
  
  // Clean JSON text (remove NaN values)
  cleanJsonText: (text) => text.replace(/:\s*NaN/g, ': null'),
  
  // Create loading element
  createLoadingElement: (text = 'Loading...') => {
    const loading = document.createElement('div');
    loading.innerHTML = `
      <div style="text-align: center; padding: 30px;">
        <div class="loading-spinner" style="margin-bottom: 15px;"></div>
        <p>${text}</p>
      </div>
    `;
    return loading;
  },
  
  // Create error element
  createErrorElement: (title, message) => {
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
      <div class="error" style="margin: 20px 0;">
        <h3>${title}</h3>
        <p>${message}</p>
      </div>
    `;
    return errorDiv;
  },

  // Format value for display
  formatValue: (value) => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
};

// GitHub API Functions
const GitHubAPI = {
  // Get headers for API requests
  getHeaders: () => {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GitHub-Explorer-App'
    };
    
    if (CONFIG.githubToken) {
      headers['Authorization'] = `token ${CONFIG.githubToken}`;
    }
    
    return headers;
  },
  
  // Check API rate limit
  checkRateLimit: async () => {
    try {
      const response = await fetch('https://api.github.com/rate_limit', {
        headers: GitHubAPI.getHeaders()
      });
      const data = await response.json();
      console.log('GitHub API Rate Limit:', data.rate);
      return data.rate;
    } catch (error) {
      console.warn('Could not check rate limit:', error);
      return null;
    }
  },
  
  // Fetch folder contents with retry logic
  fetchFolderContents: async (path = "", retryCount = 0) => {
    const url = `${API_BASE}/${path}?ref=${CONFIG.branch}`;
    console.log("Fetching:", url);
    
    try {
      const response = await fetch(url, {
        headers: GitHubAPI.getHeaders()
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(`Authentication failed (401). The GitHub token is invalid, expired, or has insufficient permissions. Please check your token or remove it to use anonymous access.`);
        }
        if (response.status === 403) {
          const rateLimit = await GitHubAPI.checkRateLimit();
          if (rateLimit && rateLimit.remaining === 0) {
            const resetTime = new Date(rateLimit.reset * 1000);
            throw new Error(`GitHub API rate limit exceeded. Limit resets at ${resetTime.toLocaleTimeString()}. Consider adding a valid GitHub token to CONFIG.githubToken for higher limits.`);
          }
          throw new Error(`Access forbidden (403). The repository might be private, you've hit the rate limit, or your token lacks permissions.`);
        }
        if (response.status === 404) {
          throw new Error(`Repository not found (404). Please check that '${CONFIG.owner}/${CONFIG.repo}' exists and is accessible.`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      // Retry once after a short delay for network errors
      if (retryCount === 0 && (error.name === 'TypeError' || error.message.includes('fetch'))) {
        console.log('Retrying request after network error...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return GitHubAPI.fetchFolderContents(path, 1);
      }
      throw error;
    }
  },
  
  // Fetch and parse JSON file with retry logic
  fetchJsonFile: async (url, retryCount = 0) => {
    try {
      const response = await fetch(url, {
        headers: GitHubAPI.getHeaders()
      });
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(`Access forbidden (403). You may have hit the GitHub API rate limit.`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const rawText = await response.text();
      const cleanedText = Utils.cleanJsonText(rawText);
      return JSON.parse(cleanedText);
    } catch (error) {
      // Retry once for network errors
      if (retryCount === 0 && (error.name === 'TypeError' || error.message.includes('fetch'))) {
        console.log('Retrying JSON fetch after network error...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return GitHubAPI.fetchJsonFile(url, 1);
      }
      throw error;
    }
  },
  
  // Test repository access
  testAccess: async () => {
    try {
      await GitHubAPI.fetchFolderContents("");
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Navigation Functions
const Navigation = {
  // Push current state to navigation stack
  pushState: (view, content) => {
    AppState.navigationStack.push({
      view: AppState.currentView,
      content: content || document.getElementById('explorer').innerHTML
    });
    AppState.currentView = view;
  },
  
  // Go back to previous state
  goBack: () => {
    if (AppState.navigationStack.length > 0) {
      const previousState = AppState.navigationStack.pop();
      AppState.currentView = previousState.view;
      document.getElementById('explorer').innerHTML = previousState.content;
      Navigation.reattachEventListeners();
    } else {
      Navigation.goToRoot();
    }
  },
  
  // Go back to root
  goToRoot: () => {
    AppState.navigationStack = [];
    AppState.currentView = 'root';
    const container = document.getElementById('explorer');
    container.innerHTML = '';
    Explorer.loadFolders("", "explorer", true);
  },
  
  // Re-attach event listeners after restoring content
  reattachEventListeners: () => {
    const container =
