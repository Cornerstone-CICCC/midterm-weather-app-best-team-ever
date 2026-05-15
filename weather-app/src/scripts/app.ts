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

  const weather = getWeatherInfo(data.current.weather_code);

  cityElement.textContent = cityName;
  tempElement.textContent = `${Math.round(data.current.temperature_2m)}°C`;
  conditionElement.textContent = `${weather.icon} ${weather.label} • Wind: ${Math.round(
    data.current.wind_speed_10m
  )} km/h`;
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

function renderDailyForecast(data: any) {
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

function renderHourlyForecast(data: any, selectedDay: string) {
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

function getPlaceName(place: any) {
  return place.name || place.city || place.label || "Selected City";
}

function getPlaceLatitude(place: any) {
  return place.coordinates?.lat ?? place.lat ?? place.latitude;
}

function getPlaceLongitude(place: any) {
  return (
    place.coordinates?.lng ??
    place.coordinates?.lon ??
    place.lng ??
    place.lon ??
    place.longitude
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

          if (!lat || !lon) {
            console.error("Missing coordinates:", place);
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