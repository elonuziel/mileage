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
const JSONBIN_API = 'https://api.jsonbin.io/v3/b';
let unitPreference = localStorage.getItem('unitPreference') || 'kmL'; // 'kmL' or 'l100km'

// DOM Elements
const formContainer = document.getElementById('formContainer');
const importCsvInput = document.getElementById('importCsvInput');
const importDataBtn = document.getElementById('importDataBtn');
const exportDataBtn = document.getElementById('exportDataBtn');
const clearDataBtn = document.getElementById('clearDataBtn');
const logList = document.getElementById('logList');

// Sync Elements
const cloudBackupIdInput = document.getElementById('cloudBackupId');
const cloudAccessKeyInput = document.getElementById('cloudAccessKey');
const saveToCloudBtn = document.getElementById('saveToCloudBtn');
const loadFromCloudBtn = document.getElementById('loadFromCloudBtn');

// Settings Modal Elements
const openSettingsBtn = document.getElementById('openSettingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const toggleKeyVisibilityBtn = document.getElementById('toggleKeyVisibility');
const unitKmLRadio = document.getElementById('unitKmL');
const unitL100kmRadio = document.getElementById('unitL100km');

// Edit Modal Elements
const editModal = document.getElementById('editModal');
const editLogForm = document.getElementById('editLogForm');
const editOdo = document.getElementById('editOdo');
const editFuel = document.getElementById('editFuel');
const editCarKmL = document.getElementById('editCarKmL');
const editLogId = document.getElementById('editLogId');
const closeEditBtn = document.getElementById('closeEditBtn');
const deleteLogBtn = document.getElementById('deleteLogBtn');
const editFuelGroup = document.getElementById('editFuelGroup');
const editCarKmLGroup = document.getElementById('editCarKmLGroup');

const elAvgL100 = document.getElementById('avgL100');
const elAvgKmL = document.getElementById('avgKmL');
const elTotalKm = document.getElementById('totalKm');
const elCarDiff = document.getElementById('carDiff');
const carComparisonCard = document.getElementById('carComparisonCard');

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
        const savedCloudKey = localStorage.getItem('mileageCloudAccessKey');
        if (savedCloudKey) {
            cloudAccessKeyInput.value = savedCloudKey;
        }
    }

    // Modal listeners
    closeEditBtn.addEventListener('click', () => editModal.close());
    editLogForm.addEventListener('submit', handleEditLogSubmit);
    deleteLogBtn.addEventListener('click', handleDeleteLog);

    // Settings listeners
    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', () => {
            settingsModal.showModal();
            // Load current unit preference
            if (unitPreference === 'l100km') {
                unitL100kmRadio.checked = true;
            } else {
                unitKmLRadio.checked = true;
            }
        });
        closeSettingsBtn.addEventListener('click', () => settingsModal.close());
        
        // Unit preference change listeners
        if (unitKmLRadio && unitL100kmRadio) {
            unitKmLRadio.addEventListener('change', handleUnitChange);
            unitL100kmRadio.addEventListener('change', handleUnitChange);
        }

        const eyeIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        const eyeOffIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

        toggleKeyVisibilityBtn.addEventListener('click', () => {
            if (cloudAccessKeyInput.type === 'password') {
                cloudAccessKeyInput.type = 'text';
                toggleKeyVisibilityBtn.innerHTML = eyeOffIcon;
            } else {
                cloudAccessKeyInput.type = 'password';
                toggleKeyVisibilityBtn.innerHTML = eyeIcon;
            }
        });
    }
}

function handleUnitChange(e) {
    unitPreference = e.target.value;
    localStorage.setItem('unitPreference', unitPreference);
    updateUI();
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
                <div class="input-group">
                    <label for="carKmL">ק"מ/ליטר לפי מחשב הרכב (אופציונלי)</label>
                    <input type="number" id="carKmL" step="0.1" placeholder="לדוגמה, 12.5">
                    <div class="helper-text">הזן את הממוצע שמציג מחשב הרכב בזמן התדלוק להשוואה</div>
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
    const carKmLInput = document.getElementById('carKmL').value;
    const carKmL = carKmLInput ? parseFloat(carKmLInput) : null;

    if (isNaN(currentOdo) || isNaN(fuel) || fuel <= 0) {
        alert("אנא הכנס מספרים תקינים. כמות הדלק חייבת להיות חיובית.");
        return;
    }

    if (currentOdo <= lastLog.odometer) {
        alert(`מד המרחק חייב להיות גדול מהקריאה הקודמת שלך (${lastLog.odometer} ק"מ).`);
        return;
    }

    if (carKmL !== null && (isNaN(carKmL) || carKmL <= 0)) {
        alert("ק\"מ/ליטר של מחשב הרכב חייב להיות מספר חיובי.");
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
        carKmL: carKmL,
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
        editCarKmLGroup.style.display = 'none';
        editCarKmL.value = '';
    } else {
        editFuelGroup.style.display = 'flex';
        editFuel.setAttribute('required', 'true');
        editFuel.value = log.fuel;
        editCarKmLGroup.style.display = 'flex';
        editCarKmL.value = log.carKmL || '';
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
        
        const carKmLInput = editCarKmL.value;
        const carKmLValue = carKmLInput ? parseFloat(carKmLInput) : null;
        if (carKmLValue !== null && (isNaN(carKmLValue) || carKmLValue <= 0)) {
            alert("ק\"מ/ליטר של מחשב הרכב חייב להיות מספר חיובי.");
            return;
        }
        log.carKmL = carKmLValue;
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

            // Check if we have the 8th column (carKmL) - backward compatible
            const carKmL = cols.length >= 8 && cols[6].trim() !== '' ? parseFloat(cols[6]) : null;
            const typeCol = cols.length >= 8 ? cols[7] : cols[6];

            importedLogs.push({
                id: Date.now() + i,
                date: new Date(dateParsed).toISOString(),
                odometer: parseFloat(cols[1]),
                distance: parseFloat(cols[2]),
                fuel: parseFloat(cols[3]),
                l100km: parseFloat(cols[4]),
                kmL: parseFloat(cols[5]),
                carKmL: carKmL,
                isBase: typeCol.trim() === "Base Reading"
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
    csvContent += "Date,Odometer (km),Distance Driven (km),Fuel (L),L/100km,km/L,Car km/L,Type\n";

    // Export in chronological order (oldest first)
    const exportLogs = [...logs].reverse();

    exportLogs.forEach(row => {
        const typeStr = row.isBase ? "Base Reading" : "Refuel";
        const carKmLStr = row.carKmL || '';
        const rowStr = `${new Date(row.date).toLocaleDateString()},${row.odometer},${row.distance},${row.fuel},${row.l100km},${row.kmL},${carKmLStr},${typeStr}`;
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
    const accessKey = cloudAccessKeyInput.value.trim();

    if (!accessKey) {
        alert("אנא הכנס מפתח גישה (X-Access-Key). מזהה גיבוי (Bin ID) נחוץ רק לעדכון גיבוי קיים.");
        return;
    }

    saveToCloudBtn.disabled = true;
    saveToCloudBtn.innerHTML = '<span>שומר...</span>';

    try {
        let url = JSONBIN_API;
        let method = 'POST'; // Default to creating a new Bin

        if (backupId) {
            url = `${JSONBIN_API}/${backupId}`;
            method = 'PUT'; // Update existing Bin
        }

        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-Access-Key': accessKey,
                'X-Bin-Name': 'MileageTrackerBackup' // Optional name for the bin
            },
            body: JSON.stringify(logs)
        });

        if (!res.ok) throw new Error("שגיאה בפעולת הגיבוי. בדוק את המזהה ואת מפתח הגישה.");

        const data = await res.json();

        let savedBinId = backupId;
        if (method === 'POST') {
            // JSONBin returns the new ID in data.metadata.id
            savedBinId = data.metadata.id;
            cloudBackupIdInput.value = savedBinId;
            alert(`גיבוי חדש נוצר בהצלחה!\nמזהה ה-Bin החדש שלך הוא: \n\n${savedBinId}\n\nהוא נשמר אוטומטית בהגדרות.`);
        } else {
            alert("הנתונים עודכנו בענן בהצלחה!");
        }

        localStorage.setItem('mileageCloudBackupId', savedBinId);
        localStorage.setItem('mileageCloudAccessKey', accessKey);
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
    const accessKey = cloudAccessKeyInput.value.trim();
    if (!backupId || !accessKey) {
        alert("אנא הכנס מזהה גיבוי (Bin ID) ומפתח גישה (X-Access-Key) כדי לטעון נתונים.");
        return;
    }


    loadFromCloudBtn.disabled = true;
    loadFromCloudBtn.textContent = 'טוען...';

    try {
        const res = await fetch(`${JSONBIN_API}/${backupId}`, {
            headers: {
                'X-Access-Key': accessKey
            }
        });
        if (!res.ok) {
            if (res.status === 404) throw new Error("גיבוי לא נמצא. בדוק את המזהה שלך.");
            if (res.status === 401 || res.status === 403) throw new Error("מפתח הגישה אינו חוקי או שאין לו הרשאות מתאימות.");
            throw new Error("שגיאה בטעינת נתונים מחשבון הענן.");
        }

        const json = await res.json();
        const importedLogs = json.record;

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
    if (elAvgKmL && elAvgKmL.parentElement) {
        const cardAvgKmL = elAvgKmL.parentElement;
        const cardAvgL100 = elAvgL100.parentElement;
        if (unitPreference === 'l100km') {
            cardAvgKmL.style.display = 'none';
            cardAvgL100.style.display = 'flex';
            cardAvgL100.style.opacity = '1';
            cardAvgL100.style.transform = 'none';
        } else {
            cardAvgKmL.style.display = 'flex';
            cardAvgL100.style.display = 'none';
        }
    }

    // Need at least one refuel log to calculate averages
    const refuelLogs = logs.filter(l => !l.isBase);

    if (refuelLogs.length === 0) {
        elAvgL100.textContent = '-';
        elAvgKmL.textContent = '-';
        elTotalKm.textContent = '0';
        if (carComparisonCard) carComparisonCard.style.display = 'none';
        return;
    }

    const totalDistance = refuelLogs.reduce((sum, log) => sum + log.distance, 0);
    const totalFuel = refuelLogs.reduce((sum, log) => sum + log.fuel, 0);

    const avgL100 = (totalFuel / totalDistance) * 100;
    const avgKmL = totalDistance / totalFuel;

    elAvgL100.textContent = avgL100.toFixed(2);
    elAvgKmL.textContent = avgKmL.toFixed(2);
    elTotalKm.textContent = totalDistance.toFixed(1);
    
    // Calculate car comparison if we have car data
    const logsWithCarData = refuelLogs.filter(l => l.carKmL);
    if (logsWithCarData.length > 0 && carComparisonCard && elCarDiff) {
        const avgCarKmL = logsWithCarData.reduce((sum, log) => sum + log.carKmL, 0) / logsWithCarData.length;
        const diff = avgKmL - avgCarKmL;
        const percentDiff = ((diff / avgCarKmL) * 100);
        const diffSign = diff >= 0 ? '+' : '';
        const diffColor = Math.abs(diff) < 0.2 ? 'var(--text-secondary)' : (diff > 0 ? 'var(--success)' : 'var(--error)');
        
        elCarDiff.textContent = `${diffSign}${diff.toFixed(2)}`;
        elCarDiff.style.color = diffColor;
        carComparisonCard.style.display = 'flex';
    } else if (carComparisonCard) {
        carComparisonCard.style.display = 'none';
    }
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
        
        let effMarkup = '';
        if (log.isBase) {
            effMarkup = `<span class="l100">---</span>`;
        } else {
            // Check if there's any efficiency data
            const hasEffData = log.l100km > 0 || log.kmL > 0;
            if (!hasEffData) {
                effMarkup = `<span class="kml" style="color:var(--error); font-size:0.8rem;">שגיאת יחס</span>`;
            } else if (log.carKmL) {
                // Show comparison when car data exists
                let calcValue, carValue, diff, percentDiff, unit;
                
                if (unitPreference === 'l100km') {
                    calcValue = log.l100km;
                    // Convert car kmL to l100km
                    carValue = log.carKmL ? (100 / log.carKmL) : null;
                    diff = carValue - calcValue; // Inverted: lower is better for L/100km
                    percentDiff = ((diff / carValue) * 100);
                    unit = 'ל/100';
                } else {
                    calcValue = log.kmL;
                    carValue = log.carKmL;
                    diff = calcValue - carValue;
                    percentDiff = ((diff / carValue) * 100);
                    unit = 'ק"מ/ל';
                }
                
                const diffSign = diff >= 0 ? '+' : '';
                const tolerance = unitPreference === 'l100km' ? 0.2 : 0.2;
                const diffColor = Math.abs(diff) < tolerance ? 'var(--text-secondary)' : (diff > 0 ? 'var(--success)' : 'var(--error)');
                const diffIcon = Math.abs(diff) < tolerance ? '≈' : (diff > 0 ? '✅' : '⚠️');
                
                effMarkup = `
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:0.75rem; color:var(--text-secondary);">חישוב:</span>
                            <span style="color:var(--accent-1); font-size:1.1rem; font-weight:700;">${calcValue.toFixed(2)} ${unit}</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:0.75rem; color:var(--text-secondary);">רכב:</span>
                            <span style="color:var(--text-primary); font-size:1rem; font-weight:600;">${carValue ? carValue.toFixed(2) : 'N/A'} ${unit}</span>
                        </div>
                        <div style="font-size:0.8rem; color:${diffColor};">
                            <span>${diffIcon} ${diffSign}${diff.toFixed(2)} (${diffSign}${percentDiff.toFixed(1)}%)</span>
                        </div>
                    </div>
                `;
            } else {
                // No car data, show regular display based on unit preference
                if (unitPreference === 'l100km') {
                    effMarkup = `<span class="l100" style="color:var(--accent-1); font-size:1.2rem; font-weight:700;">${log.l100km} ליטר/100</span>`;
                } else {
                    effMarkup = `<span class="l100" style="color:var(--accent-1); font-size:1.2rem; font-weight:700;">${log.kmL} ק"מ/ליטר</span>`;
                }
            }
        }
        
        const metricsMarkup = log.isBase ?
            `${log.odometer}ק"מ` :
            `${log.odometer}ק"מ • +${log.distance}ק"מ • ${log.fuel}ליטר`;

        const el = document.createElement('div');
        el.className = 'log-item';

        el.innerHTML = `
            <div class="log-date">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span class="date">${dateString} ${typeBadge}</span>
                    <button class="btn-text edit-btn" style="color:var(--accent-1); font-size:0.8rem;" aria-label="ערוך רשומה">ערוך ✏️</button>
                </div>
                <span class="values">${metricsMarkup}</span>
            </div>
            <div class="log-eff">
                ${effMarkup}
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
                    label: 'חישוב',
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
                },
                {
                    label: 'מחשב רכב',
                    data: [],
                    borderColor: '#ff9500',
                    backgroundColor: 'rgba(255, 149, 0, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: false,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#ff9500',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    yAxisID: 'y',
                    borderDash: [5, 5]
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
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        boxWidth: 12,
                        boxHeight: 12,
                        padding: 10,
                        font: {
                            size: 11
                        },
                        usePointStyle: true
                    }
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

    let dataCalc, dataCarCalc;
    if (unitPreference === 'l100km') {
        dataCalc = chronologicalLogs.map(l => l.l100km);
        dataCarCalc = chronologicalLogs.map(l => l.carKmL ? (100 / l.carKmL) : null);
    } else {
        dataCalc = chronologicalLogs.map(l => l.kmL);
        dataCarCalc = chronologicalLogs.map(l => l.carKmL || null);
    }

    efficiencyChart.data.labels = labels;
    efficiencyChart.data.datasets[0].data = dataCalc;
    efficiencyChart.data.datasets[1].data = dataCarCalc;

    // Check if we have any car data to show the second line
    const hasCarData = dataCarCalc.some(v => v !== null);
    efficiencyChart.data.datasets[1].hidden = !hasCarData;

    efficiencyChart.update();
}

// Start app
document.addEventListener('DOMContentLoaded', init);
