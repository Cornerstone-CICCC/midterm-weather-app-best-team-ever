const PLACEKIT_API_KEY =
  import.meta.env.PUBLIC_PLACEKIT_API_KEY?.trim() ?? "";

export type PlaceKitResult = {
  name?: string;
  city?: string;
  country?: string;
  countrycode?: string;
  countryCode?: string;
  lat?: number;
  lng?: number;
  coordinates?: string;
  type?: string;
};

export type PlaceKitSearchResponse = {
  results?: PlaceKitResult[];
};

export async function searchCities(
  query: string,
  signal?: AbortSignal
): Promise<PlaceKitSearchResponse> {
  if (!PLACEKIT_API_KEY) {
    throw new Error("Missing PUBLIC_PLACEKIT_API_KEY in .env");
  }

  const response = await fetch("https://api.placekit.co/search", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "x-placekit-api-key": PLACEKIT_API_KEY,
    },
    body: JSON.stringify({
      query,
      types: ["city"],
      maxResults: 5,
      language: "en",
    }),
  });

  if (!response.ok) {
    throw new Error(`PlaceKit request failed (${response.status})`);
  }

  return (await response.json()) as PlaceKitSearchResponse;
}
