const deck = document.querySelector("#deck");
const params = new URLSearchParams(window.location.search);
const requestedSlide = params.get("slide");
const slides = requestedSlide
  ? window.WINKTIMER_SLIDES.filter((slide) => slide.id === requestedSlide)
  : window.WINKTIMER_SLIDES;

if (requestedSlide) {
  document.body.classList.add("is-export");
}

function renderScreenshot(slide, screenshot, index) {
  const frameClass = [
    "phone-frame",
    `phone-frame--${slide.layout}`,
    slide.layout === "dual" ? `phone-frame--dual-${index + 1}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <figure class="${frameClass}">
      <img src="${screenshot.src}" alt="${screenshot.alt}" />
    </figure>
  `;
}

function renderChips(slide) {
  if (!slide.chips?.length) {
    return "";
  }

  return `
    <ul class="mode-chips" aria-label="Available timer modes">
      ${slide.chips.map((chip) => `<li>${chip}</li>`).join("")}
    </ul>
  `;
}

function renderSlide(slide, index) {
  const screenshotHtml = slide.screenshots
    .map((screenshot, screenshotIndex) => renderScreenshot(slide, screenshot, screenshotIndex))
    .join("");

  return `
    <article
      id="${slide.id}"
      class="poster poster--${slide.tone} poster--${slide.id}"
      style="--accent: ${slide.accent}"
      aria-label="${slide.badge} advertisement"
      data-export-name="${String(index + 1).padStart(2, "0")}-${slide.id}.png"
    >
      <div class="poster__border" aria-hidden="true"></div>
      <div class="poster__wash" aria-hidden="true"></div>

      <header class="poster__header">
        <span class="badge">${slide.badge}</span>
        <p class="eyebrow">${slide.eyebrow}</p>
        <h2>${slide.headline.replaceAll("\n", "<br />")}</h2>
        <p class="lead">${slide.body}</p>
      </header>

      <div class="device-stage device-stage--${slide.layout}">
        ${screenshotHtml}
      </div>

      ${renderChips(slide)}

      <footer class="caption-card">
        <strong>${slide.footerTitle}</strong>
        <span>${slide.footerBody}</span>
      </footer>
    </article>
  `;
}

if (slides.length === 0) {
  deck.innerHTML = `<p class="empty-state">Unknown slide: ${requestedSlide}</p>`;
} else {
  deck.innerHTML = slides.map(renderSlide).join("");
}
