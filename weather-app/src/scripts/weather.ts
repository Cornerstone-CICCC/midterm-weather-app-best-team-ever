export type OpenMeteoCurrent = {
  time: string;
  temperature_2m: number;
  relative_humidity_2m: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  weather_code: number;
};

export type OpenMeteoForecast = {
  current: OpenMeteoCurrent;

  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
    uv_index_max: number[];
    sunrise: string[];
    sunset: string[];
    wind_speed_10m_max: number[];
    wind_direction_10m_dominant: number[];
  };

  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability: number[];
    visibility: number[];
  };
};

export async function getWeather(
  lat: number,
  lon: number
): Promise<OpenMeteoForecast> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code` +
    `&hourly=temperature_2m,weather_code,precipitation_probability,visibility` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code,uv_index_max,sunrise,sunset,wind_speed_10m_max,wind_direction_10m_dominant` +
    `&forecast_days=5&timezone=auto`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Weather fetch failed");
  }

  return (await response.json()) as OpenMeteoForecast;
}