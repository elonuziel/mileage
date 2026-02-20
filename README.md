# FuelTrack: Mileage & Maintenance Tracker

FuelTrack is a modern, responsive Progressive Web Application (PWA) designed to track vehicle mileage and fuel efficiency without relying on server-side infrastructure.

## Features
- **Privacy First (Offline by Design)**: Powered by a Service Worker and standard Web Technologies. Your data never leaves your device and runs completely offline once installed. 
- **Odometer Tracking**: Input your current odometer and fuel volume; FuelTrack automatically calculates driven distance from your previous entry.
- **Instant Efficiency Metrics**: Computes liters per 100 kilometers (L/100km) and kilometers per liter (km/L).
- **Interactive Visualization**: Automatically charts fuel efficiency trends chronologically via Chart.js.
- **Export Data**: Easily export all mileage data into a CSV file compatible with Excel and Google Sheets.
- **Premium Design**: Boasts a stunning "Light Mode" glassmorphism UI leveraging vanilla CSS variables and smooth transitions.

## How to Install/Run
1. Simply clone this repository.
2. Open `index.html` in your web browser. 
3. *Optional*: Use your browser's "Add to Home Screen" command to install it locally as an offline PWA app on your desktop or mobile device.

## Usage
1. Provide a base odometer reading to initialize your vehicle's profile.
2. Every time you refuel, input your new dashboard odometer reading and the amount of fuel pumped.
3. Observe your average consumption and graphical history.
4. Export your history at any time using the "Export CSV" button.

## Architecture
- `index.html`: Core structure
- `styles.css`: Visual design logic & tokenized CSS Variables
- `app.js`: Application state and calculation logics
- `sw.js` / `manifest.json`: Offline PWA capability configurations

## License
Provided under the MIT License.
