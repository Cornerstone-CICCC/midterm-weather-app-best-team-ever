import { getWeather } from "./weather";
import { searchCities } from "./places";

const VANCOUVER = {
  name: "Vancouver",
  lat: 49.2827,
  lon: -123.1207,
};

let selectedCity = VANCOUVER;
let currentUser: string | null = null;
let sessionTimeoutId: number | null = null;
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
setupAuthModal();