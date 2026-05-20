import { getWeather, type OpenMeteoForecast } from "./weather";
import { searchCities, type PlaceKitResult } from "./places";
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

function showCurrentWeatherLoading(cityName: string) {
  setCurrentWeatherState("loading");

  const cityEl = document.querySelector("#current-city-heading");
  const tempEl = document.querySelector("#currentTemp");
  const summaryEl = document.querySelector("#currentSummary");
  const windEl = document.querySelector("#currentWind");
  const updatedEl = document.querySelector("#currentUpdated");

  if (cityEl) cityEl.textContent = cityName;
  if (tempEl) tempEl.textContent = "—";
  if (summaryEl) summaryEl.textContent = "Loading…";
  if (windEl) windEl.textContent = "—";
  if (updatedEl) updatedEl.textContent = "—";
}

async function loadWeather(cityName: string, lat: number, lon: number) {
  if (!isValidCoords(lat, lon)) {
    console.error("Invalid coordinates:", lat, lon);
    showCurrentWeatherError(cityName);
    return;
  }

  selectedCity = { name: cityName, lat, lon };
  showCurrentWeatherLoading(cityName);

  try {
    const data = await getWeather(lat, lon);

    if (!data.current || !data.daily?.time?.length) {
      throw new Error("Unexpected weather API response");
    }

    renderCurrentWeather(cityName, data);
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
  if (code === 0) {
    return { icon: "☀️", label: "Sunny" };
  }

  if ([1, 2, 3].includes(code)) {
    return { icon: "⛅", label: "Partly Cloudy" };
  }

  if ([45, 48].includes(code)) {
    return { icon: "🌫️", label: "Foggy" };
  }

  if ([51, 53, 55].includes(code)) {
    return { icon: "🌦️", label: "Drizzle" };
  }

  if ([61, 63, 65, 80, 81, 82].includes(code)) {
    return { icon: "🌧️", label: "Rainy" };
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return { icon: "❄️", label: "Snowy" };
  }

  if ([95, 96, 99].includes(code)) {
    return { icon: "⛈️", label: "Stormy" };
  }

  return { icon: "🌤️", label: "Weather" };
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
  syncFavoriteButton();
  syncFavoritesDropdownSelection();
}

function renderCurrentWeather(cityName: string, data: OpenMeteoForecast) {
  const current = data.current;
  if (!current) {
    showCurrentWeatherError(cityName);
    return;
  }

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

  const weather = getWeatherInfo(current.weather_code);

  cityElement.textContent = cityName;
  tempElement.textContent = `${Math.round(current.temperature_2m)}°C`;
  summaryElement.textContent = `${weather.icon} ${labelForWmoCode(current.weather_code)}`;
  windElement.textContent = formatWindLine(
    current.wind_speed_10m,
    current.wind_direction_10m
  );
  updatedElement.textContent = formatObservationTime(current.time);
  setCurrentWeatherState("ready");
  syncFavoriteButton();
}

function renderDailyForecast(data: OpenMeteoForecast) {
  const container = document.querySelector("#dailyForecast");

  if (!container) return;

  container.innerHTML = "";

  data.daily.time.forEach((day: string, index: number) => {
    const weather = getWeatherInfo(data.daily.weather_code[index]);

    const card = document.createElement("button");
    card.className = "daily-day";

    if (index === 0) {
      card.classList.add("active");
    }

    const date = new Date(day);

    const weekday = date.toLocaleDateString("en-US", {
      weekday: "long",
    });

    const formattedDate = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    card.innerHTML = `
      <h3>${weekday}</h3>

      <p class="date">${formattedDate}</p>

      <div class="weather-icon">${weather.icon}</div>

      <p class="weather-label">${weather.label}</p>

      <p class="daily-temp">
        ${Math.round(data.daily.temperature_2m_min[index])}–${Math.round(
          data.daily.temperature_2m_max[index]
        )}°C
      </p>
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

    const card = document.createElement("div");
    card.className = "hourly-item";

    card.innerHTML = `
      <p class="hour">${time.split("T")[1].slice(0, 5)}</p>

      <div class="weather-icon small">${weather.icon}</div>

      <p class="weather-label">${weather.label}</p>

      <p class="hourly-temp">
        ${Math.round(data.hourly.temperature_2m[index])}°C
      </p>
    `;

    container.appendChild(card);
  });
}

function getPlaceName(place: PlaceKitResult) {
  return place.city || place.name || "Selected City";
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
  const searchRoot = input.closest(".search");

  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", "suggestions");
  input.setAttribute("aria-expanded", "false");

  listEl.setAttribute("role", "listbox");
  listEl.setAttribute("aria-label", "City suggestions");

  const placekitOk = Boolean(
    import.meta.env.PUBLIC_PLACEKIT_API_KEY?.trim()
  );

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
      const country = place.country || place.countryCode || place.countrycode || "";

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
      showSearchMessage(
        "Could not load suggestions. Check your API key and network."
      );
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

  syncFavoritesDropdownSelection();
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

      try {
        const city = JSON.parse(dropdown.value) as SavedCity;

        if (!isValidSavedCity(city)) {
          console.error("Invalid favorite entry:", city);
          syncFavoritesDropdownSelection();
          return;
        }

        void loadWeather(city.name, city.lat, city.lon);
      } catch (error) {
        console.error("Could not read favorite:", error);
        syncFavoritesDropdownSelection();
      }
    });
  }

  sanitizeFavoritesStorage();
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