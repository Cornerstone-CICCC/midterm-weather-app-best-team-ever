const PLACEKIT_API_KEY =
  import.meta.env.PUBLIC_PLACEKIT_API_KEY;

export async function searchCities(
  query: string
) {
  const response = await fetch(
    "https://api.placekit.co/search",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",

        "x-placekit-api-key":
          PLACEKIT_API_KEY,
      },

      body: JSON.stringify({
        query,
        types: ["city"],
        maxResults: 5,
        language: "en",
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      "Failed to fetch cities"
    );
  }

  return await response.json();
}