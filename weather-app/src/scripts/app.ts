import { updateBackgroundVideo } from "./backgroundVideo";
import { getCityImage } from "./cityImage";
import { setupFortuneButton, updateLuckyForecast } from "./lucky";
import { searchCities, type PlaceKitResult } from "./places";
import { getWeather, type OpenMeteoForecast } from "./weather";
import {
  formatObservationTime,
  formatWindLine,
  labelForWmoCode,
} from "./weatherCondition";

type SavedCity = {
  name: string;
  lat: number;
  lon: number;
  location?: string;
};

const VANCOUVER: SavedCity = {
  name: "Vancouver",
  lat: 49.2827,
  lon: -123.1207,
  location: "British Columbia, Canada",
};

let selectedCity: SavedCity = VANCOUVER;
let dailyAirQuality = new Map<string, number>();
let currentUser: string | null = null;
let sessionTimeoutId: number | null = null;
let draggedFavoriteIndex: number | null = null;
const SESSION_TIMEOUT_MS = 5 * 60 * 60 * 1000;

function saveUserSession(username: string) {
  const now = Date.now();
  localStorage.setItem(
    "userSession",
    JSON.stringify({ username, lastActive: now })
  );
}

function clearUserSession() {
  localStorage.removeItem("userSession");
  currentUser = null;
}

function loadUserSession() {
  const raw = localStorage.getItem("userSession");
  if (!raw) return;

  try {
    const session = JSON.parse(raw) as { username: string; lastActive: number };
    if (!session.username || !session.lastActive) return;

    const age = Date.now() - session.lastActive;
    if (age > SESSION_TIMEOUT_MS) {
      clearUserSession();
      return;
    }

    currentUser = session.username;
    updateGreeting();
    resetSessionTimeout();
  } catch {
    clearUserSession();
  }
}

function updateSessionActivity() {
  const raw = localStorage.getItem("userSession");
  if (!raw) return;

  try {
    const session = JSON.parse(raw) as { username: string; lastActive: number };
    session.lastActive = Date.now();
    localStorage.setItem("userSession", JSON.stringify(session));
    resetSessionTimeout();
  } catch {
    clearUserSession();
  }
}

function resetSessionTimeout() {
  if (sessionTimeoutId) {
    window.clearTimeout(sessionTimeoutId);
  }
  sessionTimeoutId = window.setTimeout(() => {
    clearUserSession();
    updateGreeting();
    window.location.reload();
  }, SESSION_TIMEOUT_MS);
}

function listenUserActivity() {
  const events = ["click", "keydown", "mousemove", "touchstart"];
  events.forEach((eventName) => {
    window.addEventListener(eventName, updateSessionActivity);
  });
}

function openGoogleSignInPopup() {
  const popup = window.open(
    "",
    "google-signin",
    "width=500,height=650,left=200,top=100"
  );

  if (!popup) {
    alert("Unable to open Google sign-in popup.");
    return;
  }

  const html = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Google Sign In</title>
        <style>
          body { margin:0; font-family: Arial, sans-serif; background:#f2f2f2; display:flex; align-items:center; justify-content:center; height:100vh; }
          .container { width: 90%; max-width: 420px; padding: 2rem; background:white; border-radius:24px; box-shadow:0 20px 60px rgba(0,0,0,0.15); }
          h1 { margin:0 0 1rem; font-size:1.5rem; color:#202124; }
          p { color:#5f6368; margin:0 0 1.5rem; }
          button { width:100%; padding:0.9rem 1rem; border:none; border-radius:999px; background:#1a73e8; color:white; font-size:1rem; cursor:pointer; }
          .secondary { margin-top:0.85rem; background:#f8f9fa; color:#202124; border:1px solid #dadce0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Sign in with Google</h1>
          <p>Use your Google account to continue.</p>
          <button id="confirm">Continue as Google User</button>
          <button class="secondary" id="cancel">Cancel</button>
        </div>
        <script>
          const confirmButton = document.getElementById('confirm');
          const cancelButton = document.getElementById('cancel');
          confirmButton.addEventListener('click', () => {
            window.opener.postMessage({ type: 'google-signin', username: 'GoogleUser' }, '*');
            window.close();
          });
          cancelButton.addEventListener('click', () => window.close());
        </script>
      </body>
    </html>`;

  popup.document.write(html);
  popup.document.close();
}

function handleGoogleSignInMessage(event: MessageEvent) {
  if (!event.data || event.data.type !== "google-signin") return;
  const username = event.data.username || "GoogleUser";
  currentUser = username;
  saveUserSession(username);
  updateGreeting();
  window.location.reload();
}

function sendTestEmail(email: string) {
  if (!email) return;
  console.log(`Sending test email to ${email}: subject='test mail', body='This is a text mail, please dont reply'.`);
  const existing = document.querySelector(".toast-message") as HTMLElement | null;
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast-message";
  toast.textContent = `Test email sent to ${email}.`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();

  if (hour >= 0 && hour < 12) {
    return "Good morning";
  } else if (hour >= 12 && hour < 18) {
    return "Good afternoon";
  } else if (hour >= 18 && hour < 21) {
    return "Good evening";
  } else {
    return "Good night";
  }
}

function updateGreeting() {
  const greetingBase = document.querySelector<HTMLElement>(".greeting-base");
  const greetingName = document.querySelector<HTMLElement>(".greeting-name");
  const punctuation = document.querySelector<HTMLElement>(".greeting-punctuation");

  if (!greetingBase || !greetingName || !punctuation) return;

  const timeGreeting = getTimeGreeting();

  if (currentUser) {
    greetingBase.textContent = timeGreeting;
    punctuation.textContent = ",";
    greetingName.textContent = ` ${currentUser}`;
  } else {
    greetingBase.textContent = timeGreeting;
    punctuation.textContent = ".";
    greetingName.textContent = "";
  }
}

function roundCoord(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

function sameCity(a: SavedCity, b: SavedCity): boolean {
  return (
    a.name === b.name &&
    roundCoord(a.lat) === roundCoord(b.lat) &&
    roundCoord(a.lon) === roundCoord(b.lon)
  );
}

function isValidCoords(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

function getUvLabel(uv: number) {
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  return "Very High";
}

function getAirQualityLabel(aqi: number) {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  return "Unhealthy";
}

function getVisibilityLabel(km: number) {
  if (km >= 20) return "Excellent";
  if (km >= 10) return "Good";
  return "Low";
}

async function loadDailyAirQuality(lat: number, lon: number) {
  dailyAirQuality.clear();

  try {
    const response = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality` +
        `?latitude=${lat}` +
        `&longitude=${lon}` +
        `&hourly=us_aqi` +
        `&forecast_days=5` +
        `&timezone=auto`
    );

    if (!response.ok) return;

    const data = await response.json();
    const groups = new Map<string, number[]>();

    data.hourly?.time?.forEach((time: string, index: number) => {
      const day = time.split("T")[0];
      const value = data.hourly.us_aqi[index];

      if (value === undefined) return;

      if (!groups.has(day)) groups.set(day, []);
      groups.get(day)?.push(value);
    });

    groups.forEach((values, day) => {
      const average = values.reduce((sum, value) => sum + value, 0) / values.length;
      dailyAirQuality.set(day, Math.round(average));
    });
  } catch {
    dailyAirQuality.clear();
  }
}

function clearExtraCurrentWeatherFields() {
  const uvEl = document.querySelector("#currentUv");
  const airQualityEl = document.querySelector("#currentAirQuality");
  const sunriseEl = document.querySelector("#currentSunrise");
  const sunsetEl = document.querySelector("#currentSunset");

  if (uvEl) uvEl.textContent = "—";
  if (airQualityEl) airQualityEl.textContent = "—";
  if (sunriseEl) sunriseEl.textContent = "—";
  if (sunsetEl) sunsetEl.textContent = "—";
}

function showCurrentWeatherLoading(cityName: string) {
  setCurrentWeatherState("loading");

  const cityEl = document.querySelector("#current-city-heading, #cityName");
  const locationEl = document.querySelector("#currentLocation");
  const tempEl = document.querySelector("#currentTemp");
  const summaryEl = document.querySelector("#currentSummary, #currentCondition");
  const windEl = document.querySelector("#currentWind");
  const updatedEl = document.querySelector("#currentUpdated");

  if (cityEl) cityEl.textContent = cityName;
  if (locationEl) locationEl.textContent = selectedCity.location ?? "Selected city";
  if (tempEl) tempEl.textContent = "—";
  if (summaryEl) summaryEl.textContent = "Loading…";
  if (windEl) windEl.textContent = "—";
  if (updatedEl) updatedEl.textContent = "—";

  clearExtraCurrentWeatherFields();
}

async function loadWeather(
  cityName: string,
  lat: number,
  lon: number,
  location = "Selected city"
) {
  if (!isValidCoords(lat, lon)) {
    console.error("Invalid coordinates:", lat, lon);
    showCurrentWeatherError(cityName);
    return;
  }

  selectedCity = { name: cityName, lat, lon, location };
  showCurrentWeatherLoading(cityName);

  try {
    const data = await getWeather(lat, lon);

    if (!data.current || !data.daily?.time?.length) {
      throw new Error("Unexpected weather API response");
    }

    updateLuckyForecast(data, cityName);
    await loadDailyAirQuality(lat, lon);
    await renderCurrentWeather(cityName, data);
    renderDailyForecast(data);
    renderHourlyForecast(data, data.daily.time[0]);
    syncFavoritesDropdownSelection();
  } catch (error) {
    console.error("Weather error:", error);
    showCurrentWeatherError(cityName);
    syncFavoritesDropdownSelection();
  }
}

function setCurrentWeatherState(state: "loading" | "ready" | "error") {
  const panel = document.querySelector(".current-weather") as HTMLElement | null;
  if (panel) panel.dataset.state = state;
}

function getWeatherInfo(code: number) {
  if (code === 0) return { icon: "☀️", label: "Sunny" };
  if ([1, 2, 3].includes(code)) return { icon: "⛅", label: "Partly Cloudy" };
  if ([45, 48].includes(code)) return { icon: "🌫️", label: "Foggy" };
  if ([51, 53, 55].includes(code)) return { icon: "🌦️", label: "Drizzle" };
  if ([61, 63, 65, 80, 81, 82].includes(code)) return { icon: "🌧️", label: "Rainy" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: "❄️", label: "Snowy" };
  if ([95, 96, 99].includes(code)) return { icon: "⛈️", label: "Stormy" };

  return { icon: "🌤️", label: "Weather" };
}

function showCurrentWeatherError(cityName: string) {
  setCurrentWeatherState("error");

  const cityEl = document.querySelector("#current-city-heading, #cityName");
  const locationEl = document.querySelector("#currentLocation");
  const tempEl = document.querySelector("#currentTemp");
  const summaryEl = document.querySelector("#currentSummary, #currentCondition");
  const windEl = document.querySelector("#currentWind");
  const updatedEl = document.querySelector("#currentUpdated");

  if (cityEl) cityEl.textContent = cityName;
  if (locationEl) locationEl.textContent = selectedCity.location ?? "Selected city";
  if (tempEl) tempEl.textContent = "—";
  if (summaryEl) summaryEl.textContent = "Weather data unavailable. Try again soon.";
  if (windEl) windEl.textContent = "—";
  if (updatedEl) updatedEl.textContent = "—";

  clearExtraCurrentWeatherFields();
  syncFavoriteButton();
  syncFavoritesDropdownSelection();
}

async function renderCurrentWeather(cityName: string, data: OpenMeteoForecast) {
  const current = data.current;

  if (!current) {
    showCurrentWeatherError(cityName);
    return;
  }

  const cityElement = document.querySelector("#current-city-heading, #cityName");
  const locationElement = document.querySelector("#currentLocation");
  const tempElement = document.querySelector("#currentTemp");
  const summaryElement = document.querySelector("#currentSummary, #currentCondition");
  const windElement = document.querySelector("#currentWind");
  const updatedElement = document.querySelector("#currentUpdated");
  const uvElement = document.querySelector("#currentUv");
  const airQualityElement = document.querySelector("#currentAirQuality");
  const sunriseElement = document.querySelector("#currentSunrise");
  const sunsetElement = document.querySelector("#currentSunset");
  const iconElement = document.querySelector("#currentIcon");
  const statTemperatureElement = document.querySelector("#statTemperature");
  const statWindElement = document.querySelector("#statWind");
  const statHumidityElement = document.querySelector("#statHumidity");
  const statVisibilityElement = document.querySelector("#statVisibility");

  const favoritesCityElement = document.querySelector("#favoritesCurrentCity");
  const favoritesLocationElement = document.querySelector("#favoritesCurrentLocation");
  const favoritesTempElement = document.querySelector("#favoritesCurrentTemp");
  const favoritesSummaryElement = document.querySelector("#favoritesCurrentSummary");
  const favoritesWeatherIconElement = document.querySelector("#favoritesWeatherIcon");

  if (!cityElement || !tempElement || !summaryElement) {
    return;
  }

  const weather = getWeatherInfo(current.weather_code);
  const summary = labelForWmoCode(current.weather_code);

  updateBackgroundVideo(current.weather_code);

  cityElement.textContent = cityName;

  if (locationElement) locationElement.textContent = selectedCity.location ?? "Selected city";
  if (favoritesCityElement) favoritesCityElement.textContent = cityName;
  if (favoritesLocationElement) favoritesLocationElement.textContent = selectedCity.location ?? "Selected city";
  if (favoritesTempElement) favoritesTempElement.textContent = `${Math.round(current.temperature_2m)}°C`;
  if (favoritesSummaryElement) favoritesSummaryElement.textContent = summary;
  if (favoritesWeatherIconElement) favoritesWeatherIconElement.textContent = weather.icon;

  tempElement.textContent = `${Math.round(current.temperature_2m)}°C`;
  summaryElement.textContent = summary;

  if (windElement) {
    windElement.textContent = formatWindLine(
      current.wind_speed_10m,
      current.wind_direction_10m
    );
  }

  if (updatedElement) {
    updatedElement.textContent = formatObservationTime(current.time);
  }

  if (iconElement) iconElement.textContent = weather.icon;
  if (statTemperatureElement) statTemperatureElement.textContent = `${Math.round(current.temperature_2m)}°C`;
  if (statWindElement) statWindElement.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  if (statHumidityElement) statHumidityElement.textContent = `${current.relative_humidity_2m}%`;

  if (statVisibilityElement) {
    const visibilityMeters = data.hourly.visibility?.[0];
    statVisibilityElement.textContent =
      visibilityMeters !== undefined ? `${Math.round(visibilityMeters / 1000)} km` : "—";
  }

  if (uvElement) {
    uvElement.textContent =
      data.daily.uv_index_max?.[0] !== undefined
        ? `${Math.round(data.daily.uv_index_max[0])}`
        : "—";
  }

  if (sunriseElement) {
    sunriseElement.textContent = data.daily.sunrise?.[0]
      ? new Date(data.daily.sunrise[0]).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";
  }

  if (sunsetElement) {
    sunsetElement.textContent = data.daily.sunset?.[0]
      ? new Date(data.daily.sunset[0]).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";
  }

  if (airQualityElement) {
    const todayAqi = dailyAirQuality.get(data.daily.time[0]);

    airQualityElement.textContent =
      todayAqi !== undefined ? `${todayAqi} AQI` : "—";
  }

  setCurrentWeatherState("ready");
  syncFavoriteButton();
}

function renderDailyForecast(data: OpenMeteoForecast) {
  const container = document.querySelector("#dailyForecast");

  if (!container) return;

  container.innerHTML = "";

  const forecastPanel = document.querySelector(".forecast-panel") as HTMLElement | null;

  if (forecastPanel) {
    getCityImage(selectedCity.name).then((imageUrl) => {
      if (!imageUrl) return;

      forecastPanel.style.backgroundImage = `
        linear-gradient(
          145deg,
          rgba(15, 23, 42, 0.88),
          rgba(15, 23, 42, 0.66)
        ),
        url("${imageUrl}")
      `;

      forecastPanel.style.backgroundSize = "cover";
      forecastPanel.style.backgroundPosition = "center";
      forecastPanel.style.backgroundRepeat = "no-repeat";
    });
  }

  data.daily.time.forEach((day: string, index: number) => {
    const weather = getWeatherInfo(data.daily.weather_code[index]);

    const card = document.createElement("button");
    card.className = "daily-day";

    if (index === 0) {
      card.classList.add("active");
    }

    const date = new Date(day);

    const weekday =
      index === 0
        ? "Today"
        : date.toLocaleDateString("en-US", { weekday: "short" });

    const formattedDate = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const wind = Math.round(data.daily.wind_speed_10m_max[index]);
    const uv = Math.round(data.daily.uv_index_max[index]);
    const aqi = dailyAirQuality.get(day);

    const visibilityMeters = data.hourly.visibility?.find((_, hourlyIndex) =>
      data.hourly.time[hourlyIndex].startsWith(day)
    );

    const visibilityKm =
      visibilityMeters !== undefined ? Math.round(visibilityMeters / 1000) : null;

    card.innerHTML = `
      <div class="daily-day__top">
        <h3>${weekday}</h3>
        <p class="date">${formattedDate}</p>
      </div>

      <div class="weather-icon">${weather.icon}</div>

      <p class="daily-temp">
        ${Math.round(data.daily.temperature_2m_max[index])}°
        <span>/ ${Math.round(data.daily.temperature_2m_min[index])}°</span>
      </p>

      <p class="weather-label">${weather.label}</p>

      <div class="daily-details">
        <div>
          <span>💨 Wind</span>
          <strong>${wind} km/h</strong>
        </div>

        <div>
  <span>💧 Humidity</span>
  <strong>${data.current.relative_humidity_2m}%</strong>
</div>

        <div>
          <span>🍃 Air Quality</span>
          <strong>${aqi !== undefined ? `${aqi} AQI` : "—"}</strong>
          <small>${aqi !== undefined ? getAirQualityLabel(aqi) : ""}</small>
        </div>

        <div>
          <span>🔆 UV Index</span>
          <strong>${uv}</strong>
          <small>${getUvLabel(uv)}</small>
        </div>

        <div>
          <span>👁️ Visibility</span>
          <strong>${visibilityKm !== null ? `${visibilityKm} km` : "—"}</strong>
          <small>${visibilityKm !== null ? getVisibilityLabel(visibilityKm) : ""}</small>
        </div>
      </div>
    `;

    card.addEventListener("click", () => {
      document.querySelectorAll(".daily-day").forEach((item) => {
        item.classList.remove("active");
      });

      card.classList.add("active");
      renderHourlyForecast(data, day);
    });

    container.appendChild(card);
  });
}

function renderHourlyForecast(data: OpenMeteoForecast, selectedDay: string) {
  const container = document.querySelector("#hourlyForecast");
  const title = document.querySelector("#hourlyTitle");

  if (!container) return;

  container.innerHTML = "";

  if (title) {
    const date = new Date(selectedDay);

    title.textContent = `3 Hour Range - ${date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    })}`;
  }

  data.hourly.time.forEach((time: string, index: number) => {
    if (!time.startsWith(selectedDay)) return;

    const hourNumber = Number(time.split("T")[1].slice(0, 2));

    if (hourNumber % 3 !== 0) return;

    const weather = getWeatherInfo(data.hourly.weather_code[index]);
    const precipitation = data.hourly.precipitation_probability?.[index];

    const card = document.createElement("div");
    card.className = "hourly-item";

    card.innerHTML = `
      <p class="hour">${time.split("T")[1].slice(0, 5)}</p>

      <div class="weather-icon small">${weather.icon}</div>

      <p class="weather-label">${weather.label}</p>

      <p class="hourly-temp">
        ${Math.round(data.hourly.temperature_2m[index])}°C
      </p>

      <p class="hourly-rain">
        Rain: ${precipitation !== undefined ? precipitation : "—"}%
      </p>
    `;

    container.appendChild(card);
  });
}

function getPlaceName(place: PlaceKitResult) {
  return place.city || place.name || "Selected City";
}

function getPlaceLocation(place: PlaceKitResult) {
  const parts = [
    place.city,
    place.country,
    place.countryCode,
    place.countrycode,
  ].filter(Boolean);

  const unique = [...new Set(parts)];

  return unique.length > 0 ? unique.join(", ") : "Selected city";
}

function coordsFromString(value: string): { lat: number; lon: number } | null {
  const parts = value.split(",").map((s) => Number.parseFloat(s.trim()));

  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return null;

  return { lat: parts[0], lon: parts[1] };
}

function getPlaceLatitude(place: PlaceKitResult): number | null {
  if (typeof place.lat === "number") return place.lat;

  if (typeof place.coordinates === "string") {
    return coordsFromString(place.coordinates)?.lat ?? null;
  }

  return null;
}

function getPlaceLongitude(place: PlaceKitResult): number | null {
  if (typeof place.lng === "number") return place.lng;

  if (typeof place.coordinates === "string") {
    return coordsFromString(place.coordinates)?.lon ?? null;
  }

  return null;
}

function isCityResult(place: PlaceKitResult): boolean {
  if (!place.type) return true;

  return place.type === "city" || place.type === "administrative";
}

function setupSearch() {
  const inputEl = document.querySelector("#cityInput");
  const listNode = document.querySelector("#suggestions");

  if (!(inputEl instanceof HTMLInputElement) || !(listNode instanceof HTMLElement)) {
    return;
  }

  const input = inputEl;
  const listEl = listNode;
  const searchRoot = input.closest(".search-panel, .search");

  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", "suggestions");
  input.setAttribute("aria-expanded", "false");

  listEl.setAttribute("role", "listbox");
  listEl.setAttribute("aria-label", "City suggestions");

  const placekitOk = Boolean(import.meta.env.PUBLIC_PLACEKIT_API_KEY?.trim());

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let fetchAbort: AbortController | undefined;
  let suggestionPlaces: PlaceKitResult[] = [];
  let activeIndex = -1;

  function setListOpen(open: boolean) {
    input.setAttribute("aria-expanded", open ? "true" : "false");
    listEl.hidden = !open;
  }

  function showSearchMessage(message: string) {
    listEl.innerHTML = "";
    suggestionPlaces = [];
    activeIndex = -1;
    input.removeAttribute("aria-activedescendant");

    const note = document.createElement("p");
    note.className = "search-message";
    note.textContent = message;

    listEl.appendChild(note);

    setListOpen(true);
  }

  function clearSuggestionsUi() {
    listEl.innerHTML = "";
    suggestionPlaces = [];
    activeIndex = -1;

    setListOpen(false);

    input.removeAttribute("aria-activedescendant");
  }

  function setActiveIndex(next: number) {
    const buttons = listEl.querySelectorAll<HTMLButtonElement>(".suggestion-item");

    if (buttons.length === 0) return;

    activeIndex = ((next % buttons.length) + buttons.length) % buttons.length;

    buttons.forEach((btn, i) => {
      btn.classList.toggle("suggestion-item--active", i === activeIndex);
      btn.tabIndex = -1;
    });

    if (activeIndex >= 0) {
      input.setAttribute("aria-activedescendant", `suggestion-${activeIndex}`);
    } else {
      input.removeAttribute("aria-activedescendant");
    }

    buttons[activeIndex]?.scrollIntoView({ block: "nearest" });
  }

  function applySelection(place: PlaceKitResult) {
    const cityName = getPlaceName(place);
    const location = getPlaceLocation(place);
    const lat = getPlaceLatitude(place);
    const lon = getPlaceLongitude(place);

    if (lat == null || lon == null) {
      console.warn("PlaceKit result missing coordinates:", place);
      return;
    }

    input.value = cityName;
    clearSuggestionsUi();

    loadWeather(cityName, Number(lat), Number(lon), location);
  }

  function renderSuggestionButtons(places: PlaceKitResult[]) {
    listEl.innerHTML = "";
    suggestionPlaces = places;
    activeIndex = -1;

    input.removeAttribute("aria-activedescendant");

    if (places.length === 0) {
      setListOpen(false);
      return;
    }

    places.forEach((place, index) => {
      const button = document.createElement("button");
      const cityName = getPlaceName(place);
      const location = getPlaceLocation(place);

      button.type = "button";
      button.className = "suggestion-item";
      button.setAttribute("role", "option");
      button.dataset.index = String(index);
      button.id = `suggestion-${index}`;
      button.textContent =
        location && location !== "Selected city"
          ? `${cityName}, ${location}`
          : cityName;
      button.tabIndex = -1;

      button.addEventListener("mousedown", (e) => {
        e.preventDefault();
      });

      button.addEventListener("click", () => {
        applySelection(place);
      });

      listEl.appendChild(button);
    });

    setListOpen(true);
  }

  async function fetchSuggestions(query: string) {
    if (!placekitOk) {
      showSearchMessage(
        "City search needs PUBLIC_PLACEKIT_API_KEY in weather-app/.env (restart npm run dev after adding it)."
      );
      return;
    }

    fetchAbort?.abort();
    fetchAbort = new AbortController();

    try {
      const data = await searchCities(query, fetchAbort.signal);
      const results = (data.results ?? []).filter(isCityResult);

      if (results.length === 0) {
        showSearchMessage("No cities found. Try another spelling.");
        return;
      }

      renderSuggestionButtons(results);
    } catch (error) {
      if ((error as Error).name === "AbortError") return;

      console.error("PlaceKit error:", error);
      showSearchMessage("Could not load suggestions. Check your API key and network.");
    }
  }

  function scheduleFetch(raw: string) {
    const query = raw.trim();

    clearTimeout(debounceTimer);
    fetchAbort?.abort();

    if (query.length < 2) {
      clearSuggestionsUi();
      return;
    }

    debounceTimer = setTimeout(() => {
      void fetchSuggestions(query);
    }, 300);
  }

  clearSuggestionsUi();

  input.addEventListener("input", () => {
    scheduleFetch(input.value);
  });

  input.addEventListener("keydown", (e) => {
    const open = !listEl.hidden && suggestionPlaces.length > 0;

    if (e.key === "Escape") {
      clearSuggestionsUi();
      return;
    }

    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(activeIndex < 0 ? 0 : activeIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(activeIndex < 0 ? suggestionPlaces.length - 1 : activeIndex - 1);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      const place = suggestionPlaces[activeIndex];

      if (place) {
        e.preventDefault();
        applySelection(place);
      }
    }
  });

  document.addEventListener("click", (e) => {
    if (!searchRoot?.contains(e.target as Node)) {
      clearSuggestionsUi();
    }
  });
}

function isValidSavedCity(city: unknown): city is SavedCity {
  if (!city || typeof city !== "object") return false;

  const c = city as SavedCity;

  return (
    typeof c.name === "string" &&
    c.name.length > 0 &&
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lon)
  );
}

function readFavoritesFromStorage(): SavedCity[] {
  try {
    const raw = localStorage.getItem("favorites");

    if (!raw) return [];

    const list = JSON.parse(raw) as unknown;

    if (!Array.isArray(list)) return [];

    return list.filter(isValidSavedCity);
  } catch {
    return [];
  }
}

function sanitizeFavoritesStorage() {
  const valid = readFavoritesFromStorage();
  setFavorites(valid);
}

function getFavorites(): SavedCity[] {
  return readFavoritesFromStorage();
}

function setFavorites(cities: SavedCity[]) {
  localStorage.setItem("favorites", JSON.stringify(cities));
}

function getFavoriteLabel(city: SavedCity): string {
  return city.location && city.location !== "Selected city"
    ? `${city.name}, ${city.location}`
    : city.name;
}

function isFavoriteCity(city: SavedCity): boolean {
  return getFavorites().some((c) => sameCity(c, city));
}

function syncFavoriteButton() {
  const favoriteBtn = document.querySelector("#favoriteBtn") as HTMLButtonElement | null;

  if (!favoriteBtn) return;

  const saved = isFavoriteCity(selectedCity);

  favoriteBtn.textContent = saved ? "★" : "☆";
  favoriteBtn.setAttribute("aria-pressed", saved ? "true" : "false");
  favoriteBtn.setAttribute(
    "aria-label",
    saved
      ? `Remove ${selectedCity.name} from favorites`
      : `Save ${selectedCity.name} to favorites`
  );
}

function toggleFavorite() {
  const favorites = getFavorites();
  const idx = favorites.findIndex((c) => sameCity(c, selectedCity));

  if (idx === -1) {
    favorites.push(selectedCity);
  } else {
    favorites.splice(idx, 1);
  }

  setFavorites(favorites);
  renderFavorites();
}

function syncFavoritesDropdownSelection() {
  const dropdown = document.querySelector("#favoritesDropdown") as HTMLSelectElement | null;

  if (!dropdown) return;

  const match = getFavorites().find((city) => sameCity(city, selectedCity));

  dropdown.value = match ? JSON.stringify(match) : "";
}

function clearFavoriteDragState() {
  document
    .querySelectorAll(".favorite-item--dragging, .favorite-item--drag-over")
    .forEach((item) => {
      item.classList.remove("favorite-item--dragging", "favorite-item--drag-over");
    });
}

function openFavoritesModal() {
  const modal = document.querySelector("#favoritesModal") as HTMLElement | null;

  if (!modal) return;

  if (modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }

  renderFavoritesList(getFavorites());
  document.body.classList.add("modal-open");
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeFavoritesModal() {
  const modal = document.querySelector("#favoritesModal") as HTMLElement | null;

  if (!modal) return;

  draggedFavoriteIndex = null;
  clearFavoriteDragState();
  document.body.classList.remove("modal-open");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function moveFavorite(fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) return;

  const favorites = getFavorites();

  if (
    !Number.isInteger(fromIndex) ||
    !Number.isInteger(toIndex) ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= favorites.length ||
    toIndex >= favorites.length
  ) {
    return;
  }

  const [movedFavorite] = favorites.splice(fromIndex, 1);
  favorites.splice(toIndex, 0, movedFavorite);
  setFavorites(favorites);
  renderFavorites();
}

function renderFavoritesList(favorites: SavedCity[]) {
  const list = document.querySelector("#favoritesList") as HTMLElement | null;

  if (!list) return;

  list.innerHTML = "";

  favorites.forEach((city, index) => {
    const item = document.createElement("button");
    const label = getFavoriteLabel(city);

    item.type = "button";
    item.className = "favorite-item";
    item.draggable = true;
    item.setAttribute("aria-label", `Move ${label}`);

    const labelElement = document.createElement("span");
    labelElement.className = "favorite-item__label";
    labelElement.textContent = label;

    const handleElement = document.createElement("span");
    handleElement.className = "favorite-item__handle";
    handleElement.setAttribute("aria-hidden", "true");
    handleElement.textContent = "☰";

    item.append(labelElement, handleElement);

    item.addEventListener("dragstart", (event) => {
      draggedFavoriteIndex = index;
      event.dataTransfer?.setDragImage(item, item.offsetWidth / 2, item.offsetHeight / 2);
      event.dataTransfer?.setData("application/x-favorite-index", String(index));
      item.classList.add("favorite-item--dragging");
    });

    item.addEventListener("dragenter", () => {
      if (draggedFavoriteIndex !== null && draggedFavoriteIndex !== index) {
        item.classList.add("favorite-item--drag-over");
      }
    });

    item.addEventListener("dragover", (event) => {
      if (draggedFavoriteIndex === null || draggedFavoriteIndex === index) return;

      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
      item.classList.add("favorite-item--drag-over");
    });

    item.addEventListener("dragleave", () => {
      item.classList.remove("favorite-item--drag-over");
    });

    item.addEventListener("drop", (event) => {
      event.preventDefault();

      const fromIndex =
        draggedFavoriteIndex ??
        Number(event.dataTransfer?.getData("application/x-favorite-index"));

      clearFavoriteDragState();
      draggedFavoriteIndex = null;

      moveFavorite(fromIndex, index);
    });

    item.addEventListener("dragend", () => {
      draggedFavoriteIndex = null;
      clearFavoriteDragState();
    });

    list.appendChild(item);
  });
}

function renderFavorites() {
  const dropdown = document.querySelector("#favoritesDropdown") as HTMLSelectElement;
  const openFavoritesModalButton = document.querySelector("#openFavoritesModal") as HTMLButtonElement | null;
  const favoritesModal = document.querySelector("#favoritesModal") as HTMLElement | null;

  if (!dropdown) return;

  const favorites = getFavorites();

  if (openFavoritesModalButton) {
    openFavoritesModalButton.disabled = favorites.length < 2;
  }

  dropdown.innerHTML = `<option value="">Favorite Cities</option>`;

  favorites.forEach((city) => {
    const option = document.createElement("option");

    option.value = JSON.stringify(city);
    option.textContent = getFavoriteLabel(city);

    dropdown.appendChild(option);
  });

  if (favoritesModal && !favoritesModal.classList.contains("hidden")) {
    renderFavoritesList(favorites);
  }

  syncFavoritesDropdownSelection();
  syncFavoriteButton();
}

function setupFavorites() {
  const favoriteBtn = document.querySelector("#favoriteBtn");
  const dropdown = document.querySelector("#favoritesDropdown") as HTMLSelectElement;
  const openFavoritesModalButton = document.querySelector("#openFavoritesModal") as HTMLButtonElement | null;
  const favoritesModal = document.querySelector("#favoritesModal") as HTMLElement | null;
  const closeFavoritesModalButtons = document.querySelectorAll("[data-favorites-close]");

  if (favoriteBtn) {
    favoriteBtn.addEventListener("click", toggleFavorite);
  }

  if (openFavoritesModalButton) {
    openFavoritesModalButton.addEventListener("click", openFavoritesModal);
  }

  closeFavoritesModalButtons.forEach((button) => {
    button.addEventListener("click", closeFavoritesModal);
  });

  if (favoritesModal) {
    favoritesModal.addEventListener("click", (event) => {
      if (event.target === favoritesModal) {
        closeFavoritesModal();
      }
    });
  }

  if (dropdown) {
    dropdown.addEventListener("change", () => {
      if (!dropdown.value) return;

      try {
        const city = JSON.parse(dropdown.value) as SavedCity;

        if (!isValidSavedCity(city)) {
          console.error("Invalid favorite entry:", city);
          syncFavoritesDropdownSelection();
          return;
        }

        void loadWeather(
          city.name,
          city.lat,
          city.lon,
          city.location ?? "Selected city"
        );
      } catch (error) {
        console.error("Could not read favorite:", error);
        syncFavoritesDropdownSelection();
      }
    });
  }

  sanitizeFavoritesStorage();
  renderFavorites();
}

function openAuthModal(mode: "login" | "register") {
  const modal = document.querySelector("#authModal") as HTMLElement | null;
  const tabs = document.querySelectorAll<HTMLButtonElement>(".auth-tab");
  const loginPanel = document.querySelector("#loginPanel") as HTMLElement | null;
  const registerPanel = document.querySelector("#registerPanel") as HTMLElement | null;

  if (!modal || !loginPanel || !registerPanel) return;

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");

  tabs.forEach((tab) => {
    const tabMode = tab.dataset.authMode;
    const isActive = tabMode === mode;
    tab.classList.toggle("active", isActive);
  });

  loginPanel.classList.toggle("auth-panel--active", mode === "login");
  registerPanel.classList.toggle("auth-panel--active", mode === "register");
  requestAnimationFrame(updateAuthScrollIndicator);
}

function closeAuthModal() {
  const modal = document.querySelector("#authModal") as HTMLElement | null;
  if (!modal) return;

  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function updateAuthScrollIndicator() {
  const content = document.querySelector(".auth-modal-content") as HTMLElement | null;
  const indicator = document.querySelector(".auth-scroll-indicator") as HTMLElement | null;

  if (!content || !indicator) return;

  const scrollableHeight = content.scrollHeight - content.clientHeight;
  if (scrollableHeight <= 0) {
    indicator.style.opacity = "0";
    return;
  }

  const trackHeight = content.clientHeight - 36;
  const thumbHeight = Math.max((content.clientHeight / content.scrollHeight) * trackHeight, 40);
  const scrollRatio = content.scrollTop / scrollableHeight;
  const thumbTop = 18 + scrollRatio * (trackHeight - thumbHeight);

  indicator.style.opacity = "1";
  indicator.style.height = `${thumbHeight}px`;
  indicator.style.transform = `translateY(${thumbTop}px)`;
}

function setAuthMode(mode: "login" | "register") {
  const tabs = document.querySelectorAll<HTMLButtonElement>(".auth-tab");
  const loginPanel = document.querySelector("#loginPanel") as HTMLElement | null;
  const registerPanel = document.querySelector("#registerPanel") as HTMLElement | null;

  if (!loginPanel || !registerPanel) return;

  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.authMode === mode);
  });

  loginPanel.classList.toggle("auth-panel--active", mode === "login");
  registerPanel.classList.toggle("auth-panel--active", mode === "register");
  requestAnimationFrame(updateAuthScrollIndicator);
}

function handleLoginSubmit(event: Event) {
  event.preventDefault();

  const form = event.target as HTMLFormElement;
  const username = (form.querySelector("input[name='username']") as HTMLInputElement)?.value.trim();

  if (!username) {
    alert("Please enter a username to log in.");
    return;
  }

  currentUser = username;
  saveUserSession(username);
  updateGreeting();
  closeAuthModal();
  window.location.reload();
}

function handleRegisterSubmit(event: Event) {
  event.preventDefault();

  const form = event.target as HTMLFormElement;
  const username = (form.querySelector("input[name='username']") as HTMLInputElement)?.value.trim();
  const email = (form.querySelector("input[name='email']") as HTMLInputElement)?.value.trim();
  const password = (form.querySelector("input[name='password']") as HTMLInputElement)?.value;
  const confirmPassword = (form.querySelector("input[name='confirmPassword']") as HTMLInputElement)?.value;
  const wantsNotifications = (form.querySelector("input[name='notifications']") as HTMLInputElement)?.checked;

  if (!username || !email || !password || !confirmPassword) {
    alert("Please complete all fields to register.");
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  currentUser = username;
  saveUserSession(username);
  updateGreeting();
  if (wantsNotifications) {
    sendTestEmail(email);
  }
  closeAuthModal();
  window.location.reload();
}

function setupAuthModal() {
  const loginButton = document.querySelector(".open-auth-login") as HTMLElement | null;
  const registerButton = document.querySelector(".open-auth-register") as HTMLElement | null;
  const closeButtons = document.querySelectorAll("[data-close], .auth-close");
  const modal = document.querySelector("#authModal") as HTMLElement | null;
  const tabs = document.querySelectorAll<HTMLButtonElement>(".auth-tab");
  const switchLinks = document.querySelectorAll<HTMLButtonElement>(".auth-link");
  const loginForm = document.querySelector("#loginForm") as HTMLFormElement | null;
  const registerForm = document.querySelector("#registerForm") as HTMLFormElement | null;

  if (loginButton) {
    loginButton.addEventListener("click", () => openAuthModal("login"));
  }

  if (registerButton) {
    registerButton.addEventListener("click", () => openAuthModal("register"));
  }

  closeButtons.forEach((button) => {
    button.addEventListener("click", closeAuthModal);
  });

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeAuthModal();
      }
    });
  }

  const modalContent = document.querySelector(".auth-modal-content") as HTMLElement | null;
  if (modalContent) {
    modalContent.addEventListener("scroll", updateAuthScrollIndicator);
    window.addEventListener("resize", updateAuthScrollIndicator);
  }

  const googleButton = document.querySelector(".auth-google-button") as HTMLElement | null;
  if (googleButton) {
    googleButton.addEventListener("click", openGoogleSignInPopup);
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      if (tab.dataset.authMode === "login") {
        setAuthMode("login");
      } else {
        setAuthMode("register");
      }
    });
  });

  switchLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (link.dataset.switch === "login") {
        setAuthMode("login");
      } else {
        setAuthMode("register");
      }
    });
  });

  if (loginForm) {
    loginForm.addEventListener("submit", handleLoginSubmit);
  }

  if (registerForm) {
    registerForm.addEventListener("submit", handleRegisterSubmit);
  }

  window.addEventListener("message", handleGoogleSignInMessage);
  loadUserSession();
  updateGreeting();
  listenUserActivity();
}

function loadDefaultCity() {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      loadWeather(
        "Your Location",
        position.coords.latitude,
        position.coords.longitude,
        "Your current location"
      );
    },
    () => {
      loadWeather(
        VANCOUVER.name,
        VANCOUVER.lat,
        VANCOUVER.lon,
        VANCOUVER.location
      );
    },
    {
      timeout: 5000,
      maximumAge: 10 * 60 * 1000,
    }
  );
}

loadDefaultCity();
setupSearch();
setupFavorites();
setupAuthModal();
setupFortuneButton();
