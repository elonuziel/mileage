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

// DOM Elements
const formContainer = document.getElementById('formContainer');
const importCsvInput = document.getElementById('importCsvInput');
const importDataBtn = document.getElementById('importDataBtn');
const exportDataBtn = document.getElementById('exportDataBtn');
const clearDataBtn = document.getElementById('clearDataBtn');
const logList = document.getElementById('logList');

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
}

// Global Form Handlers are attached dynamically on render
function renderForm() {
    formContainer.innerHTML = '';

    if (logs.length === 0) {
        // Render Initial Odometer Form
        formContainer.innerHTML = `
            <h2>Setup Vehicle Profile</h2>
            <form id="baseLogForm">
                <div class="input-group">
                    <label for="baseOdo">Current Odometer (km)</label>
                    <input type="number" id="baseOdo" step="0.1" required placeholder="e.g., 50000">
                    <div class="helper-text">Establish your starting mileage. No fuel needed yet.</div>
                </div>
                <button type="submit" class="btn-primary">
                    <span>Set Base Odometer</span>
                </button>
            </form>
        `;
        document.getElementById('baseLogForm').addEventListener('submit', handleSetBase);
    } else {
        // Render Standard Refuel Form
        const lastOdo = logs[0].odometer;
        formContainer.innerHTML = `
            <h2>Log Refueling</h2>
            <form id="refuelLogForm">
                <div class="input-group">
                    <label for="currentOdo">Current Odometer (km)</label>
                    <input type="number" id="currentOdo" step="0.1" required placeholder="Must be > ${lastOdo}">
                    <div class="helper-text">Previous Odometer: ${lastOdo} km</div>
                </div>
                <div class="input-group">
                    <label for="fuelAmt">Fuel Added (Liters)</label>
                    <input type="number" id="fuelAmt" step="0.01" required placeholder="e.g., 40.2">
                </div>
                <button type="submit" class="btn-primary">
                    <span>Save Refuel Log</span>
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
        alert("Please enter a valid positive odometer reading.");
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
        alert("Please enter valid numbers. Fuel must be positive.");
        return;
    }

    if (currentOdo <= lastLog.odometer) {
        alert(`Odometer must be strictly greater than your previous reading (${lastLog.odometer} km).`);
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
    saveLogs();
    updateUI();
}

function handleClearData() {
    if (confirm("Are you sure you want to clear all data? This cannot be undone.")) {
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
        if (lines.length < 2) throw new Error("File empty or missing header");

        // Ensure header matches expected format loosely
        const header = lines[0].toLowerCase();
        if (!header.includes("odometer") || !header.includes("distance") || !header.includes("fuel")) {
            throw new Error("CSV Header does not match correct format.");
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
            // Sort merged array so newest is at the top ([0])
            logs = [...logs, ...importedLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
            // Remove exact duplicates by ID (or just save the whole merged list)
            const uniqueLogs = Array.from(new Map(logs.map(log => [log.id, log])).values());
            logs = uniqueLogs;

            saveLogs();
            updateUI();
            alert(`Successfully imported ${importedLogs.length} logs!`);
        } else {
            alert("No valid data rows found in CSV.");
        }

    } catch (err) {
        alert("Error importing CSV: " + err.message);
    }
}

function handleExportCSV() {
    if (logs.length === 0) {
        alert("No data to export.");
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
        logList.innerHTML = '<div class="empty-state">No logs yet. Add your first entry above.</div>';
        return;
    }

    logs.forEach(log => {
        const dateObj = new Date(log.date);
        const dateString = dateObj.toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric'
        });

        const typeBadge = log.isBase ? `<span style="font-size:0.7rem;background:rgba(0,0,0,0.05);padding:2px 6px;border-radius:4px;">Base</span>` : '';
        const effMarkup = log.isBase ?
            `<span class="l100">---</span>` :
            `<span class="l100" style="color:var(--accent-1); font-size:1.2rem; font-weight:700;">${log.kmL} km/L</span><span class="kml" style="opacity:0.6;">${log.l100km} L/100</span>`;
        const metricsMarkup = log.isBase ?
            `${log.odometer}km` :
            `${log.odometer}km • +${log.distance}km • ${log.fuel}L`;

        const el = document.createElement('div');
        el.className = 'log-item';
        el.innerHTML = `
            <div class="log-date">
                <span class="date">${dateString} ${typeBadge}</span>
                <span class="values">${metricsMarkup}</span>
            </div>
            <div class="log-eff">
                ${effMarkup}
            </div>
        `;
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
                    label: 'km/L',
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
        return new Date(l.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    });

    const dataKmL = chronologicalLogs.map(l => l.kmL);

    efficiencyChart.data.labels = labels;
    efficiencyChart.data.datasets[0].data = dataKmL;

    efficiencyChart.update();
}

// Start app
document.addEventListener('DOMContentLoaded', init);
