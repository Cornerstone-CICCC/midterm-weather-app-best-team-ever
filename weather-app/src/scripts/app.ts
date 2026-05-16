import { getWeather, type OpenMeteoForecast } from "./weather";
import { searchCities } from "./places";
import {
  formatObservationTime,
  formatWindLine,
  labelForWmoCode,
} from "./weatherCondition";

const VANCOUVER = {
  name: "Vancouver",
  lat: 49.2827,
  lon: -123.1207,
};

let selectedCity = VANCOUVER;

type SavedCity = { name: string; lat: number; lon: number };

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

async function loadWeather(cityName: string, lat: number, lon: number) {
  try {
    selectedCity = { name: cityName, lat, lon };

    const data = await getWeather(lat, lon);

    renderCurrentWeather(cityName, data);
    renderDailyForecast(data);
    renderHourlyForecast(data, data.daily.time[0]);
  } catch (error) {
    console.error("Weather error:", error);
    showCurrentWeatherError(cityName);
  }
}

function setCurrentWeatherState(state: "loading" | "ready" | "error") {
  const panel = document.querySelector(".current-weather") as HTMLElement | null;
  if (panel) panel.dataset.state = state;
}

function showCurrentWeatherError(cityName: string) {
  setCurrentWeatherState("error");

  const cityEl = document.querySelector("#current-city-heading");
  const tempEl = document.querySelector("#currentTemp");
  const summaryEl = document.querySelector("#currentSummary");
  const windEl = document.querySelector("#currentWind");
  const updatedEl = document.querySelector("#currentUpdated");

  if (cityEl) cityEl.textContent = cityName;
  if (tempEl) tempEl.textContent = "—";
  if (summaryEl) summaryEl.textContent = "Weather data unavailable. Try again soon.";
  if (windEl) windEl.textContent = "—";
  if (updatedEl) updatedEl.textContent = "—";
}

function renderCurrentWeather(cityName: string, data: OpenMeteoForecast) {
  const cw = data.current_weather;

  const cityElement = document.querySelector("#current-city-heading");
  const tempElement = document.querySelector("#currentTemp");
  const summaryElement = document.querySelector("#currentSummary");
  const windElement = document.querySelector("#currentWind");
  const updatedElement = document.querySelector("#currentUpdated");

  if (
    !cityElement ||
    !tempElement ||
    !summaryElement ||
    !windElement ||
    !updatedElement
  ) {
    return;
  }

  cityElement.textContent = cityName;
  tempElement.textContent = `${Math.round(cw.temperature)}°C`;
  summaryElement.textContent = labelForWmoCode(cw.weathercode);
  windElement.textContent = formatWindLine(cw.windspeed, cw.winddirection);
  updatedElement.textContent = formatObservationTime(cw.time);
  setCurrentWeatherState("ready");
  syncFavoriteButton();
}

function renderDailyForecast(data: OpenMeteoForecast) {
  const container = document.querySelector("#dailyForecast");

  if (!container) return;

  container.innerHTML = "";

  data.daily.time.forEach((day: string, index: number) => {
    const card = document.createElement("button");

    card.className = "card daily-card";

    card.innerHTML = `
      <h3>${day}</h3>
      <p>Max: ${data.daily.temperature_2m_max[index]}°C</p>
      <p>Min: ${data.daily.temperature_2m_min[index]}°C</p>
    `;

    card.addEventListener("click", () => {
      renderHourlyForecast(data, day);
    });

    container.appendChild(card);
  });
}

function renderHourlyForecast(data: OpenMeteoForecast, selectedDay: string) {
  const container = document.querySelector("#hourlyForecast");

  if (!container) return;

  container.innerHTML = "";

  data.hourly.time.forEach((time: string, index: number) => {
    if (time.startsWith(selectedDay)) {
      const hour = new Date(time).getHours();

      if (hour % 3 === 0) {
        const card = document.createElement("div");

        card.className = "card hourly-card";

        card.innerHTML = `
          <p>${hour}:00</p>
          <p>${data.hourly.temperature_2m[index]}°C</p>
        `;

        container.appendChild(card);
      }
    }
  });
}

function getPlaceName(place: any) {
  return (
    place.name ||
    place.city ||
    place.label ||
    place.displayName ||
    "Selected City"
  );
}

function getPlaceLatitude(place: any) {
  return (
    place.coordinates?.lat ??
    place.coordinates?.latitude ??
    place.lat ??
    place.latitude ??
    place.geometry?.location?.lat
  );
}

function getPlaceLongitude(place: any) {
  return (
    place.coordinates?.lng ??
    place.coordinates?.lon ??
    place.coordinates?.longitude ??
    place.lng ??
    place.lon ??
    place.longitude ??
    place.geometry?.location?.lng
  );
}

function setupSearch() {
  const input = document.querySelector("#cityInput") as HTMLInputElement | null;
  const listEl = document.querySelector("#suggestions") as HTMLElement | null;
  const searchRoot = input?.closest(".search") ?? null;

  if (!input || !listEl) return;

  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", "suggestions");
  input.setAttribute("aria-expanded", "false");

  listEl.setAttribute("role", "listbox");
  listEl.setAttribute("aria-label", "City suggestions");

  const placekitOk = Boolean(import.meta.env.PUBLIC_PLACEKIT_API_KEY);

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let fetchAbort: AbortController | undefined;
  let suggestionPlaces: unknown[] = [];
  let activeIndex = -1;

  function setListOpen(open: boolean) {
    input.setAttribute("aria-expanded", open ? "true" : "false");
    listEl.hidden = !open;
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

  function applySelection(place: unknown) {
    const cityName = getPlaceName(place);
    const lat = getPlaceLatitude(place);
    const lon = getPlaceLongitude(place);

    if (lat == null || lon == null) {
      console.warn("PlaceKit result missing coordinates:", place);
      return;
    }

    input.value = cityName;
    clearSuggestionsUi();
    loadWeather(cityName, Number(lat), Number(lon));
  }

  function renderSuggestionButtons(places: unknown[]) {
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
      const country =
        (place as { country?: string }).country ||
        (place as { countryCode?: string }).countryCode ||
        "";

      button.type = "button";
      button.className = "suggestion-item";
      button.setAttribute("role", "option");
      button.dataset.index = String(index);
      button.id = `suggestion-${index}`;
      button.textContent = country ? `${cityName}, ${country}` : cityName;
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
      console.warn(
        "PlaceKit: set PUBLIC_PLACEKIT_API_KEY in .env for city search."
      );
      clearSuggestionsUi();
      return;
    }

    fetchAbort?.abort();
    fetchAbort = new AbortController();

    try {
      const data = await searchCities(query, fetchAbort.signal);

      const results = Array.isArray(data.results) ? data.results : [];

      renderSuggestionButtons(results);
    } catch (error) {
      if ((error as Error).name === "AbortError") return;

      console.error("PlaceKit error:", error);
      clearSuggestionsUi();
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

function getFavorites(): SavedCity[] {
  try {
    const raw = localStorage.getItem("favorites");
    if (!raw) return [];
    const list = JSON.parse(raw) as unknown;
    return Array.isArray(list) ? (list as SavedCity[]) : [];
  } catch {
    return [];
  }
}

function setFavorites(cities: SavedCity[]) {
  localStorage.setItem("favorites", JSON.stringify(cities));
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

function renderFavorites() {
  const dropdown = document.querySelector("#favoritesDropdown") as HTMLSelectElement;

  if (!dropdown) return;

  const favorites = getFavorites();

  dropdown.innerHTML = `<option value="">Favorite Cities</option>`;

  favorites.forEach((city) => {
    const option = document.createElement("option");

    option.value = JSON.stringify(city);
    option.textContent = city.name;

    dropdown.appendChild(option);
  });

  syncFavoriteButton();
}

function setupFavorites() {
  const favoriteBtn = document.querySelector("#favoriteBtn");
  const dropdown = document.querySelector("#favoritesDropdown") as HTMLSelectElement;

  if (favoriteBtn) {
    favoriteBtn.addEventListener("click", toggleFavorite);
  }

  if (dropdown) {
    dropdown.addEventListener("change", () => {
      if (!dropdown.value) return;

      const city = JSON.parse(dropdown.value) as SavedCity;

      loadWeather(city.name, city.lat, city.lon);
      dropdown.value = "";
    });
  }

  renderFavorites();
}

function loadDefaultCity() {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      loadWeather(
        "Your Location",
        position.coords.latitude,
        position.coords.longitude
      );
    },
    () => {
      loadWeather(VANCOUVER.name, VANCOUVER.lat, VANCOUVER.lon);
    }
  );
}

loadDefaultCity();
setupSearch();
setupFavorites();