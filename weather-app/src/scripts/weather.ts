export async function getWeather(
  lat: number,
  lon: number
) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,windspeed_10m&daily=temperature_2m_max,temperature_2m_min&forecast_days=5&timezone=auto`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Weather fetch failed");
  }

  return await response.json();
}