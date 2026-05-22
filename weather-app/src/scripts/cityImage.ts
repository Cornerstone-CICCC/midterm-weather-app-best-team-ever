export async function getCityImage(city: string): Promise<string | null> {
  const accessKey = import.meta.env.PUBLIC_UNSPLASH_ACCESS_KEY;

  if (!accessKey) return null;

  try {
    const query = encodeURIComponent(`${city} skyline city`);

    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${query}&orientation=landscape&per_page=1&client_id=${accessKey}`
    );

    if (!response.ok) return null;

    const data = await response.json();

    return data.results?.[0]?.urls?.regular ?? null;
  } catch {
    return null;
  }
}