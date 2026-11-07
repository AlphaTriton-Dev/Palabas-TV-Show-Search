/*
"Talk is cheap. Show me the code."
—Linus Torvalds
*/

// Palabas · WS1 TV Show Search code-along (TVmaze API, no key needed)
// Open DevTools (F12): keep the Console AND the Network tab open.
// Sample or live mode: see config.js.

// ---------- Given: page elements ----------
const form = document.getElementById("searchForm");
const input = document.getElementById("query");
const statusText = document.getElementById("status");
const results = document.getElementById("results");
const dialog = document.getElementById("details");
const detailsBody = document.getElementById("detailsBody");
const closeBtn = document.getElementById("closeDetails");
const modeBadge = document.getElementById("modeBadge");

// ---------- Given: the API's URLs ----------
const API = "https://api.tvmaze.com";

// Turns "Breaking Bad" into "breaking-bad" (used for the sample-data file names)
function slug(text) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// e.g. https://api.tvmaze.com/search/shows?q=breaking%20bad
function searchURL(query) {
  if (USE_SAMPLE_DATA) return `data/search/${slug(query)}.json`;
  return `${API}/search/shows?q=${encodeURIComponent(query)}`;
}

// e.g. https://api.tvmaze.com/shows/169
function showURL(id) {
  return USE_SAMPLE_DATA ? `data/shows/${id}.json` : `${API}/shows/${id}`;
}

// e.g. https://api.tvmaze.com/shows/169/cast
function castURL(id) {
  return USE_SAMPLE_DATA ? `data/cast/${id}.json` : `${API}/shows/${id}/cast`;
}

// e.g. https://api.tvmaze.com/shows/169/seasons
function seasonsURL(id) {
  return USE_SAMPLE_DATA ? `data/seasons/${id}.json` : `${API}/shows/${id}/seasons`;
}

// ---------- Given: helpers (no need to change) ----------

// Shows a message under the search box. type: "info", "loading" or "error"
function setStatus(message, type = "info") {
  statusText.textContent = message;
  statusText.className = "status " + type;
}

// Makes an element with an optional class and text: el("span", "year", "2008")
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// A poster <img>, or a placeholder when the show has no image (image is null)
function createPoster(show, size = "medium") {
  if (!show.image) {
    return el("span", "poster none", "No poster");
  }
  const img = el("img", "poster");
  img.src = show.image[size] || show.image.medium;
  img.alt = `Poster: ${show.name}`;
  img.loading = "lazy";
  img.addEventListener("error", () => img.replaceWith(el("span", "poster none", "No poster")));
  return img;
}

// "2008–2013", or "2016–" for a show that is still running
function yearRange(show) {
  const start = show.premiered ? show.premiered.slice(0, 4) : "?";
  const end = show.ended ? show.ended.slice(0, 4) : "";
  return `${start}–${end}`;
}

// TVmaze summaries contain HTML like "<p><b>Friends</b> follows…</p>".
// This keeps only the text. (Never put text from an API into innerHTML:
// if it contained a <script> or an onerror, it could run on your page.)
function stripTags(html) {
  if (!html) return "No summary yet.";
  return new DOMParser().parseFromString(html, "text/html").body.textContent;
}

// Close the details pop-up (Step 4) with the × button or by clicking outside it
closeBtn.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

// Show which mode we're in
modeBadge.textContent = USE_SAMPLE_DATA ? "Sample data" : "Live · TVmaze";
modeBadge.classList.toggle("live", !USE_SAMPLE_DATA);

// STEP 1 — (testRequest was only a test: deleted in Step 2)

// STEP 2 — Search and show the results ================================
function renderResults(items) {
  results.innerHTML = ""; // clear the last search

  items.forEach((item) => {
    const show = item.show; // each item is { score, show }

    const card = el("button", "card"); // a button, so it can be clicked (Step 4)
    card.type = "button";
    card.dataset.id = show.id; // remember which show this card is

    const rating = show.rating.average; // a number, or null if nobody rated it yet
    card.append(
      createPoster(show),
      el("span", "title", show.name),
      el("span", "year", yearRange(show)),
      el("span", "genres", show.genres.join(", ")),
      el("span", "rating", rating ? `★ ${rating}` : "Not rated yet")
    );
    results.appendChild(card);
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault(); // stop the form from reloading the page
  const query = input.value.trim();
  if (query === "") return;
  searchShows(query);
});


// STEP 3 — getJSON(): one careful helper for every request =============
// It returns the data, or THROWS an Error with a message people can read.
async function getJSON(url) {
  let response;
  try {
    response = await fetch(url);
  } catch (networkError) {
    // fetch only rejects when there is NO answer at all: offline, blocked, server down
    throw new Error("Can't reach TVmaze. Check your internet, or set USE_SAMPLE_DATA = true in config.js.");
  }

  if (response.status === 429) {
    // TVmaze allows about 20 requests every 10 seconds per internet connection
    throw new Error("Too many requests (429). Wait 10 seconds and try again.");
  }
  if (!response.ok) {
    throw new Error(
      USE_SAMPLE_DATA
        ? "Sample mode only knows: friends, office, breaking bad, stranger things, sherlock, thrones, sample."
        : `Request failed (HTTP ${response.status}).`
    );
  }
  return response.json();
}

// (this replaces the Step 2 searchShows)
async function searchShows(query) {
  setStatus(`Searching for "${query}"…`, "loading");
  results.innerHTML = "";

  try {
    const data = await getJSON(searchURL(query));

    // An empty array is NOT an error to fetch (HTTP 200). We must check it.
    if (data.length === 0) {
      setStatus(`No shows found for "${query}". Check the spelling.`, "error");
      return;
    }
    renderResults(data);
    setStatus(`${data.length} ${data.length === 1 ? "show" : "shows"} found for "${query}"`);
  } catch (error) {
    setStatus(error.message, "error");
  }
}

// STEP 4 — Click a show to see its details
// TODO: one click listener on #results, showDetails(id), renderDetails(show)

// STEP 5 — Promise.all: show + cast + seasons at the same time
// TODO: rewrite showDetails with Promise.all, and renderDetails(show, cast, seasons)
