import { getWeather } from "./weather";
import { searchCities } from "./places";

const VANCOUVER = {
  name: "Vancouver",
  lat: 49.2827,
  lon: -123.1207,
};

let selectedCity = VANCOUVER;

async function loadWeather(cityName: string, lat: number, lon: number) {
  try {
    selectedCity = { name: cityName, lat, lon };

    const data = await getWeather(lat, lon);

    renderCurrentWeather(cityName, data);
    renderDailyForecast(data);
    renderHourlyForecast(data, data.daily.time[0]);
  } catch (error) {
    console.error("Weather error:", error);
  }
}

function renderCurrentWeather(cityName: string, data: any) {
  const cityElement = document.querySelector("#cityName");
  const tempElement = document.querySelector("#currentTemp");
  const conditionElement = document.querySelector("#currentCondition");

  if (!cityElement || !tempElement || !conditionElement) return;

  cityElement.textContent = cityName;
  tempElement.textContent = `${data.current_weather.temperature}°C`;
  conditionElement.textContent = `Wind: ${data.current_weather.windspeed} km/h`;
}

function renderDailyForecast(data: any) {
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

function renderHourlyForecast(data: any, selectedDay: string) {
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
  const input = document.querySelector("#cityInput") as HTMLInputElement;
  const suggestions = document.querySelector("#suggestions");

  if (!input || !suggestions) return;

  input.addEventListener("input", async () => {
    const query = input.value.trim();

    suggestions.innerHTML = "";

    if (query.length < 2) return;

    try {
      const data = await searchCities(query);

      data.results.forEach((place: any) => {
        const button = document.createElement("button");

        const cityName = getPlaceName(place);
        const country = place.country || place.countryCode || "";

        button.className = "suggestion-item";
        button.textContent = country ? `${cityName}, ${country}` : cityName;

        button.addEventListener("click", () => {
          const lat = getPlaceLatitude(place);
          const lon = getPlaceLongitude(place);

          console.log("Selected place:", place);
          console.log("Coordinates:", lat, lon);

          if (!lat || !lon) {
            console.error("Missing coordinates from PlaceKit result:", place);
            return;
          }

          input.value = cityName;
          suggestions.innerHTML = "";

          loadWeather(cityName, Number(lat), Number(lon));
        });

        suggestions.appendChild(button);
      });
    } catch (error) {
      console.error("PlaceKit error:", error);
    }
  });
}

function getFavorites() {
  return JSON.parse(localStorage.getItem("favorites") || "[]");
}

function saveFavorite() {
  const favorites = getFavorites();

  const exists = favorites.some((city: any) => city.name === selectedCity.name);

  if (!exists) {
    favorites.push(selectedCity);
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }

  renderFavorites();
}

function renderFavorites() {
  const dropdown = document.querySelector("#favoritesDropdown") as HTMLSelectElement;

  if (!dropdown) return;

  const favorites = getFavorites();

  dropdown.innerHTML = `<option value="">Favorite Cities</option>`;

  favorites.forEach((city: any) => {
    const option = document.createElement("option");

    option.value = JSON.stringify(city);
    option.textContent = city.name;

    dropdown.appendChild(option);
  });
}

function setupFavorites() {
  const favoriteBtn = document.querySelector("#favoriteBtn");
  const dropdown = document.querySelector("#favoritesDropdown") as HTMLSelectElement;

  if (favoriteBtn) {
    favoriteBtn.addEventListener("click", saveFavorite);
  }

  if (dropdown) {
    dropdown.addEventListener("change", () => {
      if (!dropdown.value) return;

      const city = JSON.parse(dropdown.value);

      loadWeather(city.name, city.lat, city.lon);
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