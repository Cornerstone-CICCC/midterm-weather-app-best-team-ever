export type OpenMeteoCurrentWeather = {
  temperature: number;
  windspeed: number;
  winddirection: number;
  weathercode: number;
  is_day: number;
  time: string;
};

export type OpenMeteoForecast = {
  current_weather: OpenMeteoCurrentWeather;
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    windspeed_10m: number[];
  };
};

export async function getWeather(
  lat: number,
  lon: number
): Promise<OpenMeteoForecast> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,windspeed_10m&daily=temperature_2m_max,temperature_2m_min&forecast_days=5&timezone=auto`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Weather fetch failed");
  }

  return (await response.json()) as OpenMeteoForecast;
}