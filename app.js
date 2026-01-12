// ====== CONFIG ======
const CONFIG = {
  youtubeChannelUrl: "https://www.youtube.com/@DivineNectar",
  youtubeApiKey: "AIzaSyDYhvyCK-gdbSuM6J9fiauXPmyArzkXcCg", // optional
  youtubeChannelId: "UCjIsdWpYGZspAlXMM_3lcLA", // required if using API
  youtubeMaxResults: 6,

  // Replace with your secure donation link (Razorpay/Instamojo/Donorbox/etc.)
  donationLink: "https://example.com/donate",

  // Replace with real UPI ID
  upiId: "yourupi@bank",

  // Replace playlist ID in HTML too (or do it here if you prefer)
};

// ====== NAV (mobile) ======
const menuBtn = document.getElementById("menuBtn");
const nav = document.getElementById("nav");

menuBtn?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", String(open));
});

nav?.querySelectorAll("a").forEach(a => {
  a.addEventListener("click", () => {
    nav.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
  });
});

// ====== Footer year ======
document.getElementById("year").textContent = new Date().getFullYear().toString();

// ====== Links ======
const channelLink = document.getElementById("channelLink");
const ytCta = document.getElementById("ytCta");
const footerYt = document.getElementById("footerYt");
[channelLink, ytCta, footerYt].forEach(el => el && (el.href = CONFIG.youtubeChannelUrl));

const donationLink = document.getElementById("donationLink");
if (donationLink) donationLink.href = CONFIG.donationLink;

const upiEl = document.getElementById("upiId");
if (upiEl) upiEl.textContent = CONFIG.upiId;

// ====== Copy UPI ======
document.getElementById("copyUpiBtn")?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(CONFIG.upiId);
    alert("UPI ID copied.");
  } catch {
    alert("Could not copy. Please select and copy manually.");
  }
});

// ====== YouTube latest videos (optional API) ======
async function loadLatestVideos() {
  const grid = document.getElementById("videoGrid");
  if (!grid) return;

  // If no API config, show a gentle placeholder message
  if (!CONFIG.youtubeApiKey || !CONFIG.youtubeChannelId) {
    grid.innerHTML = `
      <div class="card" style="grid-column: 1 / -1;">
        <h3>Enable auto-thumbnails (optional)</h3>
        <p class="muted">
          <code>youtubeApiKey</code> and <code>youtubeChannelId</code> in <code>app.js</code>.
        </p>
      </div>
    `;
    return;
  }

  const endpoint =
    `https://www.googleapis.com/youtube/v3/search` +
    `?key=${encodeURIComponent(CONFIG.youtubeApiKey)}` +
    `&channelId=${encodeURIComponent(CONFIG.youtubeChannelId)}` +
    `&part=snippet,id` +
    `&order=date` +
    `&maxResults=${CONFIG.youtubeMaxResults}` +
    `&type=video`;

  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error("YouTube API request failed");
    const data = await res.json();

    const items = (data.items || []).filter(v => v.id && v.id.videoId);

    grid.innerHTML = items.map(item => {
      const vid = item.id.videoId;
      const title = item.snippet.title || "Video";
      const thumb = item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || "";
      const date = item.snippet.publishedAt ? new Date(item.snippet.publishedAt).toLocaleDateString() : "";
      const url = `https://www.youtube.com/watch?v=${vid}`;

      return `
        <a class="video" href="${url}" target="_blank" rel="noopener">
          <img src="${thumb}" alt="${escapeHtml(title)} thumbnail" />
          <div class="vbody">
            <p class="title">${escapeHtml(title)}</p>
            <p class="meta">Watch on YouTube</p>
          </div>
        </a>
      `;
    }).join("");

  } catch (e) {
    grid.innerHTML = `
      <div class="card" style="grid-column: 1 / -1;">
        <h3>Couldn’t load videos</h3>
        <p class="muted">Check your API key / channel ID, or rely on the playlist embed below.</p>
      </div>
    `;
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadLatestVideos();
