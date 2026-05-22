const WORLD_PEACE_QUERY = "world peace";
const WORLD_PEACE_OVERLAY_MS = 5000;

let animationTimer: number | null = null;

function showWorldPeaceOverlay() {
  let overlay = document.querySelector(".world-peace-overlay") as HTMLElement | null;

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "world-peace-overlay";
    overlay.setAttribute("aria-hidden", "true");

    const image = document.createElement("img");
    image.src = "/world_people_circle.png";
    image.alt = "";

    overlay.appendChild(image);
    document.body.appendChild(overlay);
  }

  if (animationTimer) {
    window.clearTimeout(animationTimer);
  }

  overlay.classList.remove("world-peace-overlay--show");
  void overlay.offsetWidth;
  overlay.classList.add("world-peace-overlay--show");

  animationTimer = window.setTimeout(() => {
    overlay?.classList.remove("world-peace-overlay--show");
    animationTimer = null;
  }, WORLD_PEACE_OVERLAY_MS);
}

export function showWorldPeaceOverlayForQuery(query: string) {
  if (query.trim().toLowerCase() === WORLD_PEACE_QUERY) {
    showWorldPeaceOverlay();
  }
}
