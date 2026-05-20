/** WMO codes from Open-Meteo: https://open-meteo.com/en/docs */

export function labelForWmoCode(code: number): string {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45) return "Fog";
  if (code === 48) return "Icy fog";
  if (code >= 51 && code <= 55) return "Drizzle";
  if (code === 56 || code === 57) return "Freezing drizzle";
  if (code >= 61 && code <= 65) return "Rain";
  if (code === 66 || code === 67) return "Freezing rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code === 85 || code === 86) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if (code === 96 || code === 99) return "Thunderstorm with hail";

  return "Mixed conditions";
}

function compassFromDegrees(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const i = ((Math.round(deg / 45) % 8) + 8) % 8;
  return dirs[i];
}

export function formatWindLine(speedKmh: number, directionDeg: number): string {
  const speed = Math.round(speedKmh);
  const dir = compassFromDegrees(directionDeg);
  return `${speed} km/h · ${dir}`;
}

export function formatObservationTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
