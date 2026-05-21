function getVideoQuery(weatherCode: number) {
  if ([61, 63, 65, 80, 81, 82, 51, 53, 55].includes(weatherCode)) {
    return "rain city night";
  }

  if ([95, 96, 99].includes(weatherCode)) {
    return "storm clouds lightning";
  }

  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
    return "snow falling city";
  }

  if ([0, 1].includes(weatherCode)) {
    return "sunny sky clouds";
  }

  if ([2, 3, 45, 48].includes(weatherCode)) {
    return "cloudy sky cinematic";
  }

  return "cinematic sky";
}

export async function updateBackgroundVideo(weatherCode: number) {
  const apiKey = import.meta.env.PUBLIC_PEXELS_API_KEY;

  if (!apiKey) return;

  const video = document.querySelector(
    "#backgroundVideo"
  ) as HTMLVideoElement | null;

  if (!video) return;

  try {
    const query = getVideoQuery(weatherCode);

    const response = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(
        query
      )}&per_page=1`,
      {
        headers: {
          Authorization: apiKey,
        },
      }
    );

    if (!response.ok) return;

    const data = await response.json();

    const videoUrl =
      data.videos?.[0]?.video_files?.find(
        (v: { width: number }) => v.width >= 1280
      )?.link ?? data.videos?.[0]?.video_files?.[0]?.link;

    if (!videoUrl) return;

    video.src = videoUrl;
    video.load();

    await video.play();
  } catch (error) {
    console.error("Pexels background video error:", error);
  }
}