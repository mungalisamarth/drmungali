// ====== CONFIG ======
const CONFIG = {
  youtubeChannelUrl: "https://www.youtube.com/@DivineNectar",

  // IMPORTANT:
  // Do NOT keep a YouTube API key in frontend JS anymore.
  // The Cloudflare Worker holds it securely as a secret.
  youtubeChannelId: "UCjIsdWpYGZspAlXMM_3lcLA",
  youtubeMaxResults: 6,

  // Cloudflare Worker endpoint (production)
  // Once your site is served from https://drmungali.org (Cloudflare Pages + custom domain),
  // this relative path is best:
  youtubeWorkerPath: "/api/youtube",

  // Optional fallback (useful if you test the site from a different domain like GitHub Pages)
  // Leave as empty string to disable fallback.
  youtubeWorkerFallbackBase: "https://youtube-proxy.mungalisamarth.workers.dev",

  // Replace with your secure donation link (Razorpay/Instamojo/Donorbox/etc.)
  donationLink: "https://example.com/donate",

  // Replace with real UPI ID
 upiId: "MSDRMUNGALISEVAFOUNDATION.eazypay@icici",
};

// ====== ANNOUNCEMENT BAR ======
// Edit this object to change the message that appears across every page.
// To disable the bar entirely: set `active: false`.
// To show multiple rotating messages: add more entries to the `messages`
//   array — they will auto-cycle every `rotateMs` milliseconds.
const ANNOUNCEMENT = {
  active: true,
  rotateMs: 6000, // cycle interval when more than one message
  messages: [
    {
      tag: "Upcoming",
      text: "Join us on 7 June at 5:00 PM IST for the sacred opening of Neem Karoli Maharaj Kutir",
      link: "./neem-karoli-maharaj-kutir.html",
    },
    // Add additional announcements here when needed, e.g.:
    // { tag: "Live", text: "Satsang now live on YouTube", link: "https://www.youtube.com/@DivineNectar" },
  ],
};

(function setupAnnouncementBar() {
  const bar = document.getElementById("noticeBar");
  if (!bar) return;
  if (!ANNOUNCEMENT.active || !ANNOUNCEMENT.messages || !ANNOUNCEMENT.messages.length) {
    bar.hidden = true;
    return;
  }
  const tagEl  = document.getElementById("noticeTag");
  const textEl = document.getElementById("noticeText");
  const linkEl = document.getElementById("noticeLink");

  function apply(msg) {
    if (tagEl)  tagEl.textContent  = msg.tag  || "";
    if (textEl) textEl.textContent = msg.text || "";
    if (linkEl) linkEl.href        = msg.link || "#";
  }

  // Show first message immediately, then unhide the bar
  apply(ANNOUNCEMENT.messages[0]);
  bar.hidden = false;

  // If more than one message, cycle them
  if (ANNOUNCEMENT.messages.length > 1) {
    let i = 0;
    setInterval(() => {
      i = (i + 1) % ANNOUNCEMENT.messages.length;
      // Fade-out, swap, fade-in for a gentler transition
      bar.classList.add("notice-fading");
      setTimeout(() => {
        apply(ANNOUNCEMENT.messages[i]);
        bar.classList.remove("notice-fading");
      }, 250);
    }, Math.max(2500, ANNOUNCEMENT.rotateMs));
  }
})();

// ====== NAV (mobile) ======
const menuBtn = document.getElementById("menuBtn");
const nav = document.getElementById("nav");

menuBtn?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", String(open));
});

nav?.querySelectorAll("a").forEach((a) => {
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
[channelLink, ytCta, footerYt].forEach((el) => el && (el.href = CONFIG.youtubeChannelUrl));

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

// ====== YouTube latest videos (via Cloudflare Worker) ======
async function loadLatestVideos() {
  const grid = document.getElementById("videoGrid");
  if (!grid) return;

  if (!CONFIG.youtubeChannelId) {
    grid.innerHTML = `
      <div class="card" style="grid-column: 1 / -1;">
        <h3>Missing channel ID</h3>
        <p class="muted">Add <code>youtubeChannelId</code> to <code>app.js</code>.</p>
      </div>
    `;
    return;
  }

  // Build Worker URL
  const qs = new URLSearchParams({
    channelId: CONFIG.youtubeChannelId,
    maxResults: String(CONFIG.youtubeMaxResults),
  });

  // Prefer same-origin (best once site is on drmungali.org)
  const primaryUrl = `${CONFIG.youtubeWorkerPath}?${qs.toString()}`;

  // Optional fallback for testing from other domains
  const fallbackUrl = CONFIG.youtubeWorkerFallbackBase
    ? `${CONFIG.youtubeWorkerFallbackBase}${CONFIG.youtubeWorkerPath}?${qs.toString()}`
    : "";

  // Small helper: render error card
  const renderError = (msg) => {
    grid.innerHTML = `
      <div class="card" style="grid-column: 1 / -1;">
        <h3>Couldn’t load videos</h3>
        <p class="muted">${escapeHtml(msg)}</p>
        <p class="muted">The playlist embed below will still work.</p>
      </div>
    `;
  };

  // Try fetch with fallback
  let data = null;
  try {
    data = await fetchJson(primaryUrl);
  } catch (e1) {
    if (fallbackUrl) {
      try {
        data = await fetchJson(fallbackUrl);
      } catch (e2) {
        renderError("The video feed is temporarily unavailable. Please try again later.");
        return;
      }
    } else {
      renderError("The video feed is temporarily unavailable. Please try again later.");
      return;
    }
  }

  // Normalize items across possible response shapes:
  // A) YouTube Search API style: item.id.videoId + item.snippet.thumbnails...
  // B) playlistItems style (uploads playlist): item.contentDetails.videoId + item.snippet...
  const items = normalizeYouTubeItems(data);

  if (!items.length) {
    renderError("No videos found yet.");
    return;
  }

  grid.innerHTML = items
    .map(({ videoId, title, thumbnail, url }) => {
      return `
        <a class="video" href="${url}" target="_blank" rel="noopener">
          <img src="${thumbnail}" alt="${escapeHtml(title)} thumbnail" />
          <div class="vbody">
            <p class="title">${escapeHtml(title)}</p>
            <p class="meta">Watch on YouTube</p>
          </div>
        </a>
      `;
    })
    .join("");
}

async function fetchJson(url) {
  const res = await fetch(url, { method: "GET" });
  const text = await res.text();
  if (!res.ok) {
    // Try to expose meaningful JSON errors if present (quota, forbidden, etc.)
    try {
      const j = JSON.parse(text);
      throw new Error(j?.error?.message || "Request failed");
    } catch {
      throw new Error("Request failed");
    }
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON");
  }
}

function normalizeYouTubeItems(data) {
  const out = [];

  const items = Array.isArray(data?.items) ? data.items : [];

  for (const item of items) {
    const videoId =
      item?.id?.videoId ||
      item?.contentDetails?.videoId ||
      item?.snippet?.resourceId?.videoId ||
      "";

    if (!videoId) continue;

    const title = item?.snippet?.title || "Video";

    // Prefer thumbnails from API responses if present; else use i.ytimg.com pattern
    const thumb =
      item?.snippet?.thumbnails?.high?.url ||
      item?.snippet?.thumbnails?.medium?.url ||
      (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "");

    const url = `https://www.youtube.com/watch?v=${videoId}`;

    out.push({
      videoId,
      title,
      thumbnail: thumb,
      url,
    });
  }

  return out;
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
window.addEventListener("DOMContentLoaded", () => {
  nav?.classList.remove("open");
  menuBtn?.setAttribute("aria-expanded", "false");
});

// ====== Floating Support button — hide when #support is on screen ======
(function setupFloatingSupport(){
  const floater = document.getElementById("floatingSupport");
  if (!floater) return;

  const supportSection = document.getElementById("support");

  // On inner pages there's no #support anchor — keep floater always visible.
  if (!supportSection) return;

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          floater.classList.toggle("is-hidden", entry.isIntersecting);
        });
      },
      { root: null, threshold: 0.15 }
    );
    io.observe(supportSection);
  }
})();
