# FuelTrack: Mileage & Fuel Tracker

A lightweight, Progressive Web Application (PWA) to track vehicle mileage and fuel efficiency.

## Key Features
- **Privacy First**: Works entirely offline; your data never leaves your device.
- **Auto-Recalculation**: Edits to past entries automatically ripple through the logs to maintain accuracy.
- **Smart Tracking**: Calculates distance and efficiency (km/L, L/100km) between readings.
- **Interactive Charts**: Visualize fuel consumption trends over time.
- **Easy Backup**: Export and import your data via CSV.
- **Cloud Backup**: Multiple cloud sync options:
  - **JSONBin.io** (`mileage_standalone.html`) — Industry-standard JSON storage with versioning.
  - **JSONHosting.com** (`mileage_standalone_jsonhosting.html`) — Free, no-signup JSON hosting. The app auto-creates an ID and Edit Key for you.
- **Hebrew Support**: Full RTL localization.

## Getting Started

You have two options to run FuelTrack locally:

### 1. Full PWA Edition
This version includes Chart.js, a Service Worker for offline support, and a complete directory structure.

1. Clone or download the repository.
2. Serve the `app/` directory using a local web server (e.g., `npx http-server app/` or via a live server extension).
3. Access it in your browser.
4. Select **"Add to Home Screen"** or **"Install App"** via your browser's menu for the full offline experience.

### 2. Standalone Edition (Recommended for ease-of-use)
Single-file versions of the application that require no local web server.

1. Clone or download the repository.
2. Open one of the standalone files directly in any modern web browser:
   - **`mileage_standalone.html`** — Cloud sync via JSONBin.io
   - **`mileage_standalone_jsonhosting.html`** — Cloud sync via JSONHosting.com (no account needed)

### Cloud Backup (JSONHosting Edition)
The JSONHosting standalone version allows you to back up your data to the cloud **without creating an account**:

1. Open Settings (gear icon).
2. Leave the **ID** and **Edit Key** fields empty.
3. Click **"שמור לענן"** (Save to cloud).
4. The app will auto-create a new cloud storage and fill in your ID & Edit Key.
5. **⚠️ Save your ID and Edit Key somewhere safe** — without them you cannot access your backup from another device.

## Built With
- Vanilla HTML/CSS/JavaScript
- [Chart.js](https://www.chartjs.org/) (Data visualization)
- Service Workers (Offline capability)
- [JSONHosting.com](https://jsonhosting.com/) / [JSONBin.io](https://jsonbin.io/) (Cloud storage)

## License
MIT License
