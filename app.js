// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered', reg))
            .catch(err => console.error('Service Worker registration failed', err));
    });
}

// Data Management
let logs = JSON.parse(localStorage.getItem('mileageLogs')) || [];
const STORAGE_KEY = 'mileageLogs';
const CORS_PROXY = 'https://corsproxy.io/?';
const JSONBLOB_API = 'https://jsonblob.com/api/jsonBlob';

// DOM Elements
const formContainer = document.getElementById('formContainer');
const importCsvInput = document.getElementById('importCsvInput');
const importDataBtn = document.getElementById('importDataBtn');
const exportDataBtn = document.getElementById('exportDataBtn');
const clearDataBtn = document.getElementById('clearDataBtn');
const logList = document.getElementById('logList');

// Sync Elements
const cloudBackupIdInput = document.getElementById('cloudBackupId');
const saveToCloudBtn = document.getElementById('saveToCloudBtn');
const loadFromCloudBtn = document.getElementById('loadFromCloudBtn');

// Edit Modal Elements
const editModal = document.getElementById('editModal');
const editLogForm = document.getElementById('editLogForm');
const editOdo = document.getElementById('editOdo');
const editFuel = document.getElementById('editFuel');
const editLogId = document.getElementById('editLogId');
const closeEditBtn = document.getElementById('closeEditBtn');
const deleteLogBtn = document.getElementById('deleteLogBtn');
const editFuelGroup = document.getElementById('editFuelGroup');

const elAvgL100 = document.getElementById('avgL100');
const elAvgKmL = document.getElementById('avgKmL');
const elTotalKm = document.getElementById('totalKm');

// Chart Instance
let efficiencyChart = null;

// Initialize
function init() {
    initChart();
    updateUI();

    importDataBtn.addEventListener('click', () => importCsvInput.click());
    importCsvInput.addEventListener('change', handleImportCSV);
    exportDataBtn.addEventListener('click', handleExportCSV);
    clearDataBtn.addEventListener('click', handleClearData);

    // Sync listeners
    if (saveToCloudBtn) {
        saveToCloudBtn.addEventListener('click', handleSaveToCloud);
        loadFromCloudBtn.addEventListener('click', handleLoadFromCloud);

        const savedCloudId = localStorage.getItem('mileageCloudBackupId');
        if (savedCloudId) {
            cloudBackupIdInput.value = savedCloudId;
        }
    }

    // Modal listeners
    closeEditBtn.addEventListener('click', () => editModal.close());
    editLogForm.addEventListener('submit', handleEditLogSubmit);
    deleteLogBtn.addEventListener('click', handleDeleteLog);
}

// Global Form Handlers are attached dynamically on render
function renderForm() {
    formContainer.innerHTML = '';

    if (logs.length === 0) {
        // Render Initial Odometer Form
        formContainer.innerHTML = `
            <h2>הגדרת פרופיל רכב</h2>
            <form id="baseLogForm">
                <div class="input-group">
                    <label for="baseOdo">מד מרחק נוכחי (ק"מ)</label>
                    <input type="number" id="baseOdo" step="0.1" required placeholder="לדוגמה, 50000">
                    <div class="helper-text">קבע את הקילומטראז' ההתחלתי. עדיין אין צורך בדלק.</div>
                </div>
                <button type="submit" class="btn-primary">
                    <span>הגדר מד מרחק התחלתי</span>
                </button>
            </form>
        `;
        document.getElementById('baseLogForm').addEventListener('submit', handleSetBase);
    } else {
        // Render Standard Refuel Form
        const lastOdo = logs[0].odometer;
        formContainer.innerHTML = `
            <h2>תיעוד תדלוק</h2>
            <form id="refuelLogForm">
                <div class="input-group">
                    <label for="currentOdo">מד מרחק נוכחי (ק"מ)</label>
                    <input type="number" id="currentOdo" step="0.1" required placeholder="חייב להיות > ${lastOdo}">
                    <div class="helper-text">מד מרחק קודם: ${lastOdo} ק"מ</div>
                </div>
                <div class="input-group">
                    <label for="fuelAmt">דלק שנוסף (ליטרים)</label>
                    <input type="number" id="fuelAmt" step="0.01" required placeholder="לדוגמה, 40.2">
                </div>
                <button type="submit" class="btn-primary">
                    <span>שמור תיעוד תדלוק</span>
                </button>
            </form>
        `;
        document.getElementById('refuelLogForm').addEventListener('submit', handleRefuelLog);
    }
}

function handleSetBase(e) {
    e.preventDefault();
    const odo = parseFloat(document.getElementById('baseOdo').value);

    if (isNaN(odo) || odo < 0) {
        alert("אנא הכנס קריאת מד מרחק חיובית ותקינה.");
        return;
    }

    const newLog = {
        id: Date.now(),
        date: new Date().toISOString(),
        odometer: odo,
        distance: 0, // Base has 0 distance
        fuel: 0,     // Base has 0 fuel
        l100km: 0,
        kmL: 0,
        isBase: true
    };

    logs.unshift(newLog);
    saveLogs();
    updateUI();
}

function handleRefuelLog(e) {
    e.preventDefault();

    const lastLog = logs[0];
    const currentOdo = parseFloat(document.getElementById('currentOdo').value);
    const fuel = parseFloat(document.getElementById('fuelAmt').value);

    if (isNaN(currentOdo) || isNaN(fuel) || fuel <= 0) {
        alert("אנא הכנס מספרים תקינים. כמות הדלק חייבת להיות חיובית.");
        return;
    }

    if (currentOdo <= lastLog.odometer) {
        alert(`מד המרחק חייב להיות גדול מהקריאה הקודמת שלך (${lastLog.odometer} ק"מ).`);
        return;
    }

    const distance = currentOdo - lastLog.odometer;
    const l100km = (fuel / distance) * 100;
    const kmL = distance / fuel;

    const newLog = {
        id: Date.now(),
        date: new Date().toISOString(),
        odometer: currentOdo,
        distance: parseFloat(distance.toFixed(1)),
        fuel: fuel,
        l100km: parseFloat(l100km.toFixed(2)),
        kmL: parseFloat(kmL.toFixed(2)),
        isBase: false
    };

    logs.unshift(newLog); // Add to beginning
    recalculateLogs();
    saveLogs();
    updateUI();
}

function recalculateLogs() {
    if (logs.length === 0) return;

    // Sort chronologically (oldest first)
    logs.sort((a, b) => new Date(a.date) - new Date(b.date));

    // First entry becomes the base
    const firstLog = logs[0];
    firstLog.isBase = true;
    firstLog.distance = 0;

    for (let i = 1; i < logs.length; i++) {
        const prev = logs[i - 1];
        const curr = logs[i];

        curr.isBase = false;
        const distance = curr.odometer - prev.odometer;
        curr.distance = parseFloat(distance.toFixed(1));

        if (distance > 0 && curr.fuel > 0) {
            const l100 = (curr.fuel / distance) * 100;
            const kml = distance / curr.fuel;
            curr.l100km = parseFloat(l100.toFixed(2));
            curr.kmL = parseFloat(kml.toFixed(2));
        } else {
            curr.l100km = 0;
            curr.kmL = 0;
        }
    }

    // Sort back to reverse chronological (newest first)
    logs.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function openEditModal(id) {
    const log = logs.find(l => l.id === id);
    if (!log) return;

    editLogId.value = log.id;
    editOdo.value = log.odometer;

    if (log.isBase) {
        editFuelGroup.style.display = 'none';
        editFuel.removeAttribute('required');
        editFuel.value = '';
    } else {
        editFuelGroup.style.display = 'flex';
        editFuel.setAttribute('required', 'true');
        editFuel.value = log.fuel;
    }

    editModal.showModal();
}

function handleEditLogSubmit(e) {
    e.preventDefault();
    const id = parseInt(editLogId.value);
    const log = logs.find(l => l.id === id);
    if (!log) return;

    const newOdo = parseFloat(editOdo.value);
    if (isNaN(newOdo) || newOdo < 0) {
        alert("אנא הכנס קריאת מד מרחק תקינה.");
        return;
    }

    log.odometer = newOdo;

    if (!log.isBase) {
        const newFuel = parseFloat(editFuel.value);
        if (isNaN(newFuel) || newFuel <= 0) {
            alert("אנא הכנס כמות דלק תקינה.");
            return;
        }
        log.fuel = newFuel;
    }

    editModal.close();
    recalculateLogs();
    saveLogs();
    updateUI();
}

function handleDeleteLog() {
    const id = parseInt(editLogId.value);
    if (confirm("האם אתה בטוח שברצונך למחוק רשומה זו?")) {
        logs = logs.filter(l => l.id !== id);
        editModal.close();
        recalculateLogs();
        saveLogs();
        updateUI();
    }
}

function handleClearData() {
    if (confirm("האם אתה בטוח שברצונך לנקות את כל הנתונים? לא ניתן לבטל פעולה זו.")) {
        logs = [];
        saveLogs();
        updateUI();
    }
}

function handleImportCSV(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        const text = event.target.result;
        parseCSV(text);

        // Reset input so the same file can be selected again if needed
        importCsvInput.value = '';
    };
    reader.readAsText(file);
}

function parseCSV(csvText) {
    try {
        const lines = csvText.split('\n').filter(l => l.trim() !== '');
        if (lines.length < 2) throw new Error("הקובץ ריק או שחסרה שורת כותרת");

        // Ensure header matches expected format loosely
        const header = lines[0].toLowerCase();
        if (!header.includes("odometer") || !header.includes("distance") || !header.includes("fuel")) {
            throw new Error("כותרת ה-CSV אינה תואמת לפורמט התקין.");
        }

        const importedLogs = [];

        // Parse rows
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            if (cols.length < 7) continue;

            const dateParsed = Date.parse(cols[0]);
            if (isNaN(dateParsed)) continue;

            importedLogs.push({
                id: Date.now() + i,
                date: new Date(dateParsed).toISOString(),
                odometer: parseFloat(cols[1]),
                distance: parseFloat(cols[2]),
                fuel: parseFloat(cols[3]),
                l100km: parseFloat(cols[4]),
                kmL: parseFloat(cols[5]),
                isBase: cols[6].trim() === "Base Reading"
            });
        }

        if (importedLogs.length > 0) {
            // Merge arrays
            logs = [...logs, ...importedLogs];

            // Remove exact duplicates by ID
            const uniqueLogs = Array.from(new Map(logs.map(log => [log.id, log])).values());
            logs = uniqueLogs;

            recalculateLogs(); // This will properly sort and fix all distances/bases
            saveLogs();
            updateUI();
            alert(`יובאו בהצלחה ${importedLogs.length} רשומות!`);
        } else {
            alert("לא נמצאו שורות נתונים תקינות בקובץ ה-CSV.");
        }

    } catch (err) {
        alert("שגיאה בייבוא CSV: " + err.message);
    }
}

function handleExportCSV() {
    if (logs.length === 0) {
        alert("אין נתונים לייצוא.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Odometer (km),Distance Driven (km),Fuel (L),L/100km,km/L,Type\n";

    // Export in chronological order (oldest first)
    const exportLogs = [...logs].reverse();

    exportLogs.forEach(row => {
        const typeStr = row.isBase ? "Base Reading" : "Refuel";
        const rowStr = `${new Date(row.date).toLocaleDateString()},${row.odometer},${row.distance},${row.fuel},${row.l100km},${row.kmL},${typeStr}`;
        csvContent += rowStr + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "mileage_export.csv");
    document.body.appendChild(link); // Required for FF

    link.click();
    link.remove();
}

function saveLogs() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

async function handleSaveToCloud() {
    if (logs.length === 0) {
        alert("אין נתונים לשמירה.");
        return;
    }

    const backupId = cloudBackupIdInput.value.trim();
    if (!backupId) {
        alert("אנא הכנס מזהה גיבוי (Backup ID) כדי לשמור נתונים.");
        return;
    }


    saveToCloudBtn.disabled = true;
    saveToCloudBtn.innerHTML = '<span>שומר...</span>';

    try {
        const res = await fetch(`${CORS_PROXY}${encodeURIComponent(JSONBLOB_API + '/' + backupId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logs)
        });
        if (!res.ok) throw new Error("שגיאה בעדכון הגיבוי. בדוק את המזהה.");
        localStorage.setItem('mileageCloudBackupId', backupId);
        alert("הנתונים עודכנו בענן בהצלחה!");
    } catch (err) {
        if (err.message === 'Failed to fetch') {
            alert("שגיאת רשת: לא ניתן להתחבר לשרת הגיבוי.\n\nבדוק את חיבור האינטרנט שלך.");
        } else {
            alert(err.message);
        }
    } finally {
        saveToCloudBtn.disabled = false;
        saveToCloudBtn.innerHTML = '<span>שמור לענן</span>';
    }
}

async function handleLoadFromCloud() {
    const backupId = cloudBackupIdInput.value.trim();
    if (!backupId) {
        alert("אנא הכנס מזהה גיבוי (Backup ID) כדי לטעון נתונים.");
        return;
    }


    loadFromCloudBtn.disabled = true;
    loadFromCloudBtn.textContent = 'טוען...';

    try {
        const res = await fetch(`${CORS_PROXY}${encodeURIComponent(JSONBLOB_API + '/' + backupId)}`);
        if (!res.ok) {
            if (res.status === 404) throw new Error("גיבוי לא נמצא. בדוק את המזהה שלך.");
            throw new Error("שגיאה בטעינת נתונים מחשבון הענן.");
        }

        const importedLogs = await res.json();

        if (!Array.isArray(importedLogs)) {
            throw new Error("הנתונים בענן אינם תקינים.");
        }

        if (importedLogs.length > 0) {
            if (confirm(`נמצאו ${importedLogs.length} רשומות בענן. האם למזג אותן עם הנתונים הקיימים שלך? (כן = למזג, לא = להחליף לגמרי)`)) {
                logs = [...logs, ...importedLogs];
                // Remove exact duplicates by ID
                const uniqueLogs = Array.from(new Map(logs.map(log => [log.id, log])).values());
                logs = uniqueLogs;
            } else {
                logs = importedLogs;
            }

            localStorage.setItem('mileageCloudBackupId', backupId);
            recalculateLogs();
            saveLogs();
            updateUI();
            alert("הנתונים נטענו בהצלחה!");
        } else {
            alert("אין רשומות בגיבוי זה.");
        }

    } catch (err) {
        alert(err.message);
    } finally {
        loadFromCloudBtn.disabled = false;
        loadFromCloudBtn.textContent = 'טען מענן';
    }
}

// UI Updates
function updateUI() {
    renderForm();
    renderStats();
    renderList();
    updateChart();
}

function renderStats() {
    // Need at least one refuel log to calculate averages
    const refuelLogs = logs.filter(l => !l.isBase);

    if (refuelLogs.length === 0) {
        elAvgL100.textContent = '-';
        elAvgKmL.textContent = '-';
        elTotalKm.textContent = '0';
        return;
    }

    const totalDistance = refuelLogs.reduce((sum, log) => sum + log.distance, 0);
    const totalFuel = refuelLogs.reduce((sum, log) => sum + log.fuel, 0);

    const avgL100 = (totalFuel / totalDistance) * 100;
    const avgKmL = totalDistance / totalFuel;

    elAvgL100.textContent = avgL100.toFixed(2);
    elAvgKmL.textContent = avgKmL.toFixed(2);
    elTotalKm.textContent = totalDistance.toFixed(1);
}

function renderList() {
    logList.innerHTML = '';

    if (logs.length === 0) {
        logList.innerHTML = '<div class="empty-state">אין רשומות עדיין. הוסף את הרשומה הראשונה למעלה.</div>';
        return;
    }

    logs.forEach(log => {
        const dateObj = new Date(log.date);
        const dateString = dateObj.toLocaleDateString('he-IL', {
            month: 'short', day: 'numeric', year: 'numeric'
        });

        const typeBadge = log.isBase ? `<span style="font-size:0.7rem;background:rgba(0,0,0,0.05);padding:2px 6px;border-radius:4px;">בסיס</span>` : '';
        const effMarkup = log.isBase ?
            `<span class="l100">---</span>` :
            `<span class="l100" style="color:var(--accent-1); font-size:1.2rem; font-weight:700;">${log.kmL} ק"מ/ליטר</span><span class="kml" style="opacity:0.6;">${log.l100km} ליטר/100</span>`;
        const metricsMarkup = log.isBase ?
            `${log.odometer}ק"מ` :
            `${log.odometer}ק"מ • +${log.distance}ק"מ • ${log.fuel}ליטר`;

        const el = document.createElement('div');
        el.className = 'log-item';
        // Check if there's any efficiency data, otherwise show simple view
        const hasEffData = log.l100km > 0 || log.kmL > 0;

        let displayEffMarkup = effMarkup;
        if (!log.isBase && !hasEffData) {
            displayEffMarkup = `<span class="kml" style="color:var(--error); font-size:0.8rem;">שגיאת יחס</span>`;
        }

        el.innerHTML = `
            <div class="log-date">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span class="date">${dateString} ${typeBadge}</span>
                    <button class="btn-text edit-btn" style="color:var(--accent-1); font-size:0.8rem;" aria-label="ערוך רשומה">ערוך ✏️</button>
                </div>
                <span class="values">${metricsMarkup}</span>
            </div>
            <div class="log-eff">
                ${displayEffMarkup}
            </div>
        `;

        el.querySelector('.edit-btn').addEventListener('click', () => openEditModal(log.id));
        logList.appendChild(el);
    });
}

// Charting
function initChart() {
    const ctx = document.getElementById('efficiencyChart');
    if (!ctx) return;

    Chart.defaults.color = '#8792a2'; // light text muted
    Chart.defaults.font.family = "system-ui, -apple-system, sans-serif";

    efficiencyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'ק"מ/ליטר',
                    data: [],
                    borderColor: '#00c6ff',
                    backgroundColor: 'rgba(0, 198, 255, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#00c6ff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    yAxisID: 'y'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 31, 54, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#00c6ff',
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    }
                }
            }
        }
    });
}

function updateChart() {
    if (!efficiencyChart) return;

    // Only chart refuel logs
    const refuelLogs = logs.filter(l => !l.isBase);

    // Reverse logs for chronological order left-to-right
    const chronologicalLogs = [...refuelLogs].reverse();

    const labels = chronologicalLogs.map(l => {
        return new Date(l.date).toLocaleDateString('he-IL', { month: 'short', day: 'numeric' });
    });

    const dataKmL = chronologicalLogs.map(l => l.kmL);

    efficiencyChart.data.labels = labels;
    efficiencyChart.data.datasets[0].data = dataKmL;

    efficiencyChart.update();
}

// Start app
document.addEventListener('DOMContentLoaded', init);
