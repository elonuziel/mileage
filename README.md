# FuelTrack: Mileage & Fuel Tracker

A lightweight, privacy-first Progressive Web Application (PWA) to track vehicle mileage and fuel efficiency.

## Key Features
- **Privacy First**: Works entirely offline; your data never leaves your device.
- **Auto-Recalculation**: Edits to past entries automatically ripple through the logs to maintain accuracy.
- **Smart Tracking**: Calculates distance and efficiency (km/L, L/100km) between readings.
- **Interactive Charts**: Visualize fuel consumption trends over time.
- **Easy Backup**: Export and import your data via CSV.
- **Cloud Backup**: Save and load your data to the cloud for free using JSONBin.io.
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
A single-file version of the application that requires no local web server.

1. Clone or download the repository.
2. Open `mileage_standalone.html` directly in any modern web browser.

## Built With
- Vanilla HTML/CSS/JavaScript
- [Chart.js](https://www.chartjs.org/) (Data visualization)
- Service Workers (Offline capability)

## License
MIT License
