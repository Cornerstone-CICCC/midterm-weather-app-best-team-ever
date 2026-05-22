## Pat's Part

## Mame's Part

## Keisei's Part

### My Role
Member 3 — **Current weather**, **search**, and **favorites**

### What I Managed
These parts match the **README** requirements:

- **Current weather** — city name, temperature, weather text, wind, and time  
  - On first load: use **geolocation**; if the user says no → show **Vancouver** (required in the README)
- **Search** — user types a city → we call **PlaceKit** → user picks a city → we call **Open-Meteo** with `fetch`
- **Favorites** — **star** saves the city in **localStorage** → **dropdown** loads that city’s weather again

**Main files I worked on:**
- `CurrentWeather.astro` — layout for the current weather card
- `weather.ts` — get weather from Open-Meteo
- `places.ts` — get cities from PlaceKit
- `app.ts` — connect buttons, search, and favorites to the screen

### Challenges
- **Git merge** — `main` and my branch both changed `app.ts`, so I had to fix conflicts
- **Search did not work** — the API key file (`.env`) must be inside **`weather-app/`**, then restart `npm run dev`
- **One shared file** — search, favorites, and weather updates all use `app.ts`, so we had to plan carefully with the team

### What I Learned
- We need **two APIs**: PlaceKit finds the city (lat/lng), Open-Meteo shows the weather
- Put the API key in **`.env`** with `PUBLIC_` at the start — do **not** push the key to GitHub
- **TypeScript types** help us use the API data safely
- **Team work** — feature branch, pull request, and merge with `main`

## Togo's Part - Project Manager

### My Role
CEO

### What I Managed
Everything

### Challenges
Sleepy

### What I Learned
Time is money.

![Miku](presentation-assets/Miku.png)
