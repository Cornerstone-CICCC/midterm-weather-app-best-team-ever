# Deploy Link
https://sparkly-fox-7c56d8.netlify.app/

# WAD202 - Mid Term - Weather App

**Welcome!**
This challenge will help you improve your coding skills by building realistic projects.

## Submission Checklist (Read First)

- **Deploy your app** to a hosting provider (GitHub Pages, Netlify, Vercel, Hostinger, etc.). One live URL per team.
- **Create a new README** in your project repo (e.g. `README.md`) and put your **live deployment link at the very top** of it.
- Treat **this file as your guide / spec** — don't replace it. Keep it in the repo for reference and write your own README alongside it.

## The Challenge

Your challenge is to integrate with the [PlaceKit AutoComplete API](https://placekit.io/) AND Open-Mateo  [WeatherAPI](https://open-meteo.com/en/docs) to pull specific city information and it's weather data. Your users should be able to:

- <strong>Search for a city using an input field.</strong>
- <strong>Save favorite cities by clicking on a star icon.</strong>
- <strong>See the current weather info based on the selected city.</strong>
- <strong>See forecast for the next 5 days.</strong>
- <strong>See weather info for every 3 hours of each day.</strong>
- <strong>Have a good experience using desktop or mobile screen sizes.</strong>


**Wireframe**
The wireframe can be accessed with this [link](https://whimsical.com/5KrvqouiFGBcgW7RtQQMLV). You will need to use your best judgment for styles such as font size, font family, padding, margin, color pattern, etc. and decide how you want to display the information on the screen.

## Requirements

Mandatory for this project:

- **Build with [Astro](https://astro.build/).** Scaffold via `npm create astro@latest` and structure the UI as Astro components (e.g. `Search`, `CurrentWeather`, `DailyForecast`, `HourlyForecast`).
- Use the [wireframe](https://whimsical.com/5KrvqouiFGBcgW7RtQQMLV) as a structure guide; design choices (colors, icons, imagery) are yours.
- Search input: [PlaceKit](https://placekit.io/) OR [Google Places Autocomplete](https://developers.google.com/maps/documentation/places/web-service/autocomplete) for city suggestions.
- Default city = user's geolocation. If denied/blocked, fall back to **Vancouver**.
- Star icon adds a city to the "Favorite cities" dropdown; persist favorites in **localStorage** and rehydrate the dropdown on load.
- Selecting a city from the dropdown loads its weather. Use `fetch` to pull current weather + 5-day forecast.
- Clicking a card in "Daily forecast" updates the "3 hour range" section to that day.
- Styling: **SCSS**. Responsive via media queries — desktop **1440px**, mobile **375px**.
- **Presentation deck required.** Whole team presents. **10-15 min max per team**, Q&A not included.

## Workflow

The captain scaffolds the Astro project (`npm create astro@latest`), commits the base files, and sets the global design tokens (font family, color palette, spacing units) in a shared SCSS file. Teammates then clone the repo and split work.

**Suggested split for 4–5 member teams:**

- **Captain / Lead (strongest with JS):** Astro setup, project structure, shared API/fetch utilities, geolocation + Vancouver fallback.
- **Member 2:** Search input (PlaceKit/Google) + Favorite cities dropdown + localStorage.
- **Member 3:** Current weather component.
- **Member 4:** 5-day daily forecast.
- **Member 5 (or shared if 4 members):** 3-hour range component + day-card click interaction.

Order of work: **functionality first → desktop styling → mobile/responsive last** (only tweak what's needed via media queries — don't redo the design). Use the Requirements list as your checklist.

Wrap up with a presentation covering: what you built, how you split work, what you learned, and the hardest part.

## Git Control (highly recommended to follow)
- Protect your main branch.
- Work on feature branche(s)
- Regular pushes and descriptive commits

## Hints

- Agree on naming conventions (components, CSS classes, JS functions) **before** coding to avoid merge conflicts.
- Split code by section: one Astro component + SCSS partial per feature. Centralize API/fetch logic and pass data into components.
- Lean on Astro's component model + props instead of manual DOM manipulation where possible.
- Stuck? Spend max **2–3 hours** before escalating: Google → teammate → instructor.

<hr>

# APIs

### PlaceKit API
- For City Suggestion AutoComplete, you may use [PlaceKit](https://placekit.io/).
- Sign up at [app.placekit.io/auth/register](https://app.placekit.io/auth/register) to get your API key. No credit card is required — the free tier includes **10,000 requests/month**.
- PlaceKit covers **246 countries**, supports multi-language search, typo-tolerant suggestions, and is GDPR compliant.


**Call the REST endpoint directly with fetch:**

````
const response = await fetch(
  "https://api.placekit.co/search",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-placekit-api-key": PLACEKIT_API_KEY,
    },
    body: JSON.stringify({
      query: query,
      types: ["city"],
      maxResults: 5,
      language: "en",
    }),
  }
);

if (response.ok) {
  const data = await response.json();
  // data.results contains the city suggestions (with lat / lng you can pass to Open-Meteo)
} else {
  console.error('Fetch error:', response.status, response.statusText);
}
````

Where `PLACEKIT_API_KEY` is your unique key found in your PlaceKit dashboard. **Tip:** the `lat` / `lng` values returned by PlaceKit are exactly what Open-Meteo needs to fetch the weather for the selected city.

### OpenMateoWeaterAPI
- Current Weather: [Open-MateoAPI - Current Weather](https://open-meteo.com/en/docs)

- 5 days Forecast & 3hr Forecast: [Open-MateoAPI - 3 hour Forecast](https://open-meteo.com/en/docs)

## Marking Criteria & Submission

Your midterm grade is based on (not limited to):

* [functional & non-functional](https://www.geeksforgeeks.org/functional-vs-non-functional-requirements/) requirements
* GitHub contributions
* teamwork & conflict resolution
* code quality, structure, readability
* error handling
* UI/UX
* presentation

- **Each member deploys their own copy** — every teammate should have a separate live URL (GitHub Pages, Netlify, Vercel, Hostinger, etc.).
- Submission is tested by running `npm run dev` on the `main` branch of your [Midterm repo](https://classroom.github.com/a/bMXqHT2x).
- Presentation date: **09/07/24**.

<hr>

## Additional Notes:

- [PlaceKit](https://placekit.io/) gives you **10,000 free requests/month** with no credit card required, so there is no short trial window to worry about. Just keep your API key out of public commits.
- You can also use other free API(s) (e.g. Google Places Autocomplete, OpenCage, Mapbox, etc.) to complete the weather app requirements.

## Going Further (Optional)

The requirements above are the minimum. **Feel free to add more features** to make the app your own and stand out in the presentation. Some ideas:

- Toggle between °C / °F and km/h / mph units.
- Light / dark mode (or auto-switch based on system preference / time of day).
- Animated weather icons or dynamic backgrounds that match the current condition (sunny, rainy, snow, etc.).
- "Recently searched" history alongside favorites.
- Drag-and-drop reordering of favorite cities.
- Air quality, UV index, sunrise / sunset, or hourly precipitation chart (Open-Meteo supports these).
- Compare two cities side-by-side.
- A small map preview of the selected city (e.g. Leaflet + OpenStreetMap tiles).
- Share button that copies a link with the selected city as a query param.
- Loading skeletons and graceful error states (offline, API down, invalid city, location denied).
- Accessibility polish: keyboard navigation through autocomplete suggestions, ARIA labels, focus styles.
- Deploy preview screenshots / a short demo GIF in the repo's README.

Pick features that interest you — quality beats quantity. Anything extra is a great talking point during the presentation.
