import type { OpenMeteoForecast } from "./weather";

let latestForecast: OpenMeteoForecast | null = null;
let latestCityName = "";

export function updateLuckyForecast(data: OpenMeteoForecast, cityName: string) {
  latestForecast = data;
  latestCityName = cityName;
}

function getTodaysFortune(): string {
  const fortunes = [
    "Great luck. Do the thing you have been postponing.",
    "Good luck. A small detour will work better than the straight path.",
    "Steady luck. Keep it simple and you will win the day.",
    "Mysterious luck. Trust the first idea, but check the details.",
    "Tiny chaos luck. Avoid overthinking and bring a backup plan.",
  ];

  if (!latestForecast?.current) {
    return "The sky is still loading your fortune. Try again in a moment.";
  }

  const { temperature_2m, weather_code } = latestForecast.current;
  const seed =
    new Date().getDate() +
    latestCityName.length +
    Math.round(temperature_2m) +
    weather_code;
  const base = fortunes[Math.abs(seed) % fortunes.length];

  if ([61, 63, 65, 80, 81, 82, 95, 96, 99].includes(weather_code)) {
    return `${base} Rainy bonus: say yes to indoor plans.`;
  }

  if (weather_code === 0) {
    return `${base} Sunny bonus: start something visible.`;
  }

  if ([71, 73, 75, 77, 85, 86].includes(weather_code)) {
    return `${base} Snow bonus: move slowly, decide clearly.`;
  }

  return `${base} Weather bonus: one extra snack improves accuracy.`;
}

export function setupFortuneButton() {
  const button = document.querySelector("#fortuneButton") as HTMLButtonElement | null;
  const result = document.querySelector("#fortuneResult") as HTMLElement | null;

  if (!button || !result) return;

  button.addEventListener("click", () => {
    result.textContent = getTodaysFortune();
    result.hidden = false;
  });
}
