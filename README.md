# FuelTrack: Mileage & Maintenance Tracker

FuelTrack is a modern, responsive Progressive Web Application (PWA) designed to track vehicle mileage and fuel efficiency without relying on server-side infrastructure.

## Features
- **Privacy First (Offline by Design)**: Powered by a Service Worker and standard Web Technologies. Your data never leaves your device and runs completely offline once installed. 
- **Odometer Tracking**: Input your current odometer and fuel volume; FuelTrack automatically calculates driven distance from your previous entry.
- **Log Editing & Recalculation**: Edit or delete past entries; FuelTrack ripples corrections through all subsequent logs to maintain mathematical accuracy.
- **Hebrew Localization**: Full RTL support and Hebrew translation for a native user experience.
- **Instant Efficiency Metrics**: Computes liters per 100 kilometers (L/100km) and kilometers per liter (km/L) with a focus on km/L.
- **Interactive Visualization**: Automatically charts fuel efficiency trends (km/L) chronologically via Chart.js.
- **Export & Import Data**: Easily migrate or backup your mileage data using CSV files.
- **Premium Design**: Boasts a stunning "Light Mode" glassmorphism UI leveraging vanilla CSS variables and smooth transitions.

## How to Install/Run
### Mobile Installation (Easy Download)
For the easiest way to get the app on your phone, you can download the pre-packaged application:
[**Download FuelTrack_App.zip**](FuelTrack_App.zip)

1. Download the ZIP file to your computer or phone.
2. Extract the contents into a folder.
3. Open `index.html` in your mobile browser.
4. Use your browser's "Add to Home Screen" command for a full offline app experience.

### Developers/Git Users
1. Simply clone this repository.
2. Open `index.html` in your web browser. 
3. *Optional*: Serve it via GitHub Pages for easy cloud access.

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
