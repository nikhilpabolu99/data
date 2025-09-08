:root{
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --secondary-gradient: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  --danger-gradient: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  --success-gradient: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  --light-bg: linear-gradient(135deg, #f8f9ff 0%, #e6f3ff 100%);
  --font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-family);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 20px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  backdrop-filter: blur(10px);
}

.header {
  background: var(--secondary-gradient);
  color: white;
  text-align: center;
  padding: 30px 20px;
}

.header h1 {
  font-size: 2.5em;
  margin-bottom: 10px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.header p {
  font-size: 1.1em;
  opacity: 0.9;
}

/* Explorer Styles */
.explorer-section {
  padding: 30px;
  border-bottom: 1px solid #eee;
  display: block;
}

.explorer-section.hidden {
  display: none;
}

.explorer-section h2 {
  color: #333;
  margin-bottom: 20px;
  font-size: 1.8em;
  text-align: center;
}

.explorer-button {
  display: block;
  margin: 8px 0;
  padding: 12px 18px;
  border: none;
  background: var(--primary-gradient);
  color: white;
  font-size: 16px;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  width: fit-content;
  min-width: 220px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  position: relative;
  overflow: hidden;
}

.explorer-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s;
}
.explorer-button:hover::before { left: 100%; }
.explorer-button:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(102,126,234,0.4); }

.folder { margin-left: 30px; padding-left: 15px; border-left: 3px solid #ddd; margin-top: 10px; }
.file-button { background: var(--secondary-gradient); margin-left: 30px; }
.file-button:hover { background: linear-gradient(135deg,#00f2fe 0%,#4facfe 100%); }
.back-button { background: var(--danger-gradient); margin-bottom: 20px; }
.back-button:hover { background: linear-gradient(135deg,#ee5a24 0%,#ff6b6b 100%); }

.alphabet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 10px;
  margin: 20px 0;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.alphabet-button { min-width: 60px; text-align: center; font-weight: bold; font-size: 1.1em; padding: 15px 10px; }

.section-title { font-size: 1.2em; font-weight: bold; margin: 20px 0; color: #333; text-align: center; }

/* Summary Display Container */
.summary-display {
  background: var(--light-bg);
  border: 2px solid #4facfe;
  border-radius: 15px;
  padding: 15px 20px;           /* slightly smaller padding */
  margin-bottom: 20px;
  display: none;
  overflow-x: auto;             /* allow horizontal scroll if needed */
  white-space: nowrap;          /* prevent wrapping */
}

.summary-display.show { 
  display: block; 
}

/* Title styling */
.summary-title {
  color: #333; 
  font-size: 1.2em;             /* slightly smaller font */
  font-weight: 600; 
  margin-bottom: 12px;
  text-align: center; 
  border-bottom: 2px solid #4facfe; 
  padding-bottom: 8px;
}

/* Layout: flex for one line */
.summary-grid {
  display: flex;                /* flex to make items horizontal */
  gap: 10px;                   /* slightly smaller gap */
  flex-wrap: nowrap;           /* no wrapping */
  overflow-x: auto;            /* scroll if overflow */
  padding-bottom: 5px;
}

/* Summary item styling */
.summary-item {
  background: white; 
  padding: 8px 12px;            /* reduced padding */
  border-radius: 8px; 
  border-left: 4px solid #4facfe;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
  transition: all 0.3s ease;
  display: inline-flex;         /* keep inline and flexible */
  flex-shrink: 0;               /* prevent shrinking */
  min-width: 120px;             /* fixed min width for readability */
  max-width: 180px;             /* limit max width */
  white-space: nowrap;          /* keep content in one line */
  overflow: hidden;
  text-overflow: ellipsis;      /* truncate with ellipsis if too long */
}

.summary-item:hover { 
  transform: translateY(-2px); 
  box-shadow: 0 4px 12px rgba(79,172,254,0.15); 
}

/* Key text */
.summary-key { 
  font-weight: 600; 
  color: #333; 
  font-size: 0.8em;              /* smaller font */
  margin-bottom: 2px; 
  text-transform: uppercase; 
  letter-spacing: 0.5px; 
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Value text */
.summary-value { 
  color: #666; 
  font-size: 0.9em;              /* slightly smaller */
  word-break: normal;            /* prevent breaking across lines */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.summary-item:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(79,172,254,0.15); }
.summary-key { font-weight: 600; color: #333; font-size: 0.9em; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
.summary-value { color: #666; font-size: 1em; word-break: break-word; }

/* JSON Viewer Styles */
.json-viewer-section { padding: 30px; display: none; }
.json-viewer-section.show { display: block; }

.loading { text-align: center; padding: 50px; color: #666; }
.loading-spinner {
  display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #4facfe;
  border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px;
}
@keyframes spin { 0%{transform:rotate(0deg);}100%{transform:rotate(360deg);} }

.error { background: var(--danger-gradient); color: white; padding: 20px; margin: 20px 0; border-radius: 10px; text-align:center; }

.buttons-container { margin-bottom: 20px; display: none; }
.buttons-container.show { display: block; }
.buttons-container h3 { color: #333; margin-bottom: 15px; text-align:center; font-size:1.3em; }

.button-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }

.data-button {
  background: var(--primary-gradient); color: white; border: none; padding: 15px; border-radius: 12px;
  font-size: 1em; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(102,126,234,0.3);
  position: relative; overflow: hidden; text-align: center;
}
.data-button:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(102,126,234,0.4); }
.data-button.active { background: var(--secondary-gradient); }
.data-button.moviewise-summary { background: var(--danger-gradient); font-weight:700; }
.data-button.moviewise-summary:hover { background: linear-gradient(135deg,#ee5a24 0%,#ff6b6b 100%); }

.record-count { display:block; font-size:0.85em; opacity:0.8; margin-top:5px; }

.data-display { margin-top: 20px; display: none; }
.data-display.show { display: block; }

.data-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:10px; }
.data-title { color:#333; font-size:1.5em; font-weight:600; }
.data-count { background: var(--secondary-gradient); color:white; padding:8px 16px; border-radius:20px; font-size:0.9em; font-weight:600; }

.data-actions { display:flex; gap:15px; align-items:center; flex-wrap:wrap; }
.download-btn {
  background: var(--success-gradient); color:white; border:none; padding:8px 16px; border-radius:20px; font-size:0.9em; font-weight:600; cursor:pointer;
  transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(40,167,69,0.3); display:flex; align-items:center; gap:8px;
}
.download-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(40,167,69,0.4); background: linear-gradient(135deg,#20c997 0%,#28a745 100%); }
.download-btn:disabled { background: #6c757d; cursor:not-allowed; transform:none; box-shadow:none; }

/* full table capture styles (hidden off-screen copy) */
.table-capture-container { position:absolute; left:-9999px; top:-9999px; background:white; z-index:-1; }
.table-capture-container table { width:auto; min-width:unset; font-size:12px; border-collapse:collapse; }
.table-capture-container th, .table-capture-container td { padding:8px 10px; border:1px solid #ddd; white-space:nowrap; font-size:11px; }

.filter-section { background: var(--light-bg); padding:20px; margin-bottom:20px; border-radius:12px; border:1px solid #e0e8ff; display: none; }
.filter-section.show { display: block; }
.filter-controls { display:flex; gap:15px; align-items:center; flex-wrap:wrap; }
.filter-group { display:flex; flex-direction:column; gap:5px; }
.filter-group label { font-size:0.9em; font-weight:600; color:#555; }
.filter-input { padding:8px 12px; border:2px solid #e0e8ff; border-radius:8px; font-size:0.9em; transition: all 0.3s ease; background:white; }
.filter-input:focus { outline:none; border-color:#4facfe; box-shadow: 0 0 0 3px rgba(79,172,254,0.1); }
.clear-filters-btn { background: var(--danger-gradient); color:white; border:none; padding:8px 16px; border-radius:8px; font-size:0.9em; cursor:pointer; transition: all 0.3s ease; align-self:flex-end; }
.clear-filters-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(255,107,107,0.3); }

.table-container {
  overflow-x:auto; background:white; border-radius:15px; box-shadow:0 4px 20px rgba(0,0,0,0.1); max-height:500px; overflow-y:auto; position:relative;
}
.table-watermark {
  position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-45deg); font-size:3em; font-weight:bold; color:rgba(79,172,254,0.15);
  pointer-events:none; z-index:10; white-space:nowrap; user-select:none; font-family: var(--font-family);
}

table { width:100%; border-collapse:collapse; min-width:600px; font-size:0.85em; }
th, td { padding:10px 12px; text-align:left; border-bottom:1px solid #eee; }
th {
  background: var(--light-bg); color:#333; font-weight:600; position:sticky; top:0; z-index:10; font-size:0.8em; cursor:pointer; user-select:none;
}
th:hover { background: linear-gradient(135deg,#e6f3ff 0%, #d0e8ff 100%); }
tr:hover { background-color: rgba(79,172,254,0.05); }
tr:nth-child(even) { background-color: rgba(248,251,255,0.5); }

.no-data { text-align:center; padding:50px; color:#666; font-size:1.1em; }

@media (max-width:768px) {
  .container { margin:10px; border-radius:15px; }
  .header h1 { font-size:2em; }
  .button-grid, .alphabet-grid { grid-template-columns: 1fr; }
  .summary-grid { grid-template-columns: 1fr; }
  .data-header { flex-direction: column; align-items:flex-start; gap:15px; }
  .filter-controls { flex-direction: column; align-items:stretch; }
  th, td { padding:8px 6px; font-size:0.8em; }
}
.latest-releases img{
    height: 200px;
    width: 200px;
    padding: 10px 10px 10px 10px;
    border-radius: 10px;
}
