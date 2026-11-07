/*
"Talk is cheap. Show me the code."
—Linus Torvalds
*/

//Name: Lanz P. Encisso
//Year & Section: BSIT 3A

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
const toolbar = document.getElementById("toolbar");
const sortBtn = document.getElementById("sortBtn");

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

// STEP 2 — Search and show the results ================================

// This function takes the array of shows from the API and builds a card
// for each one, then puts all the cards on the page.
function renderResults(items) {
  results.innerHTML = ""; // clear the last search

  items.forEach((item) => {
    const show = item.show; // each item is { score, show }

    const card = el("button", "card"); // a button, so it can be clicked (Step 4)
    card.type = "button";
    card.dataset.id = show.id; // remember which show this card is
    card.dataset.rating = show.rating.average ?? ""; // store rating for sorting
    card.dataset.index = items.indexOf(item); // store original position for restoring order

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

  // Show the toolbar now that there are results, and reset sort button state
  toolbar.hidden = false;
  sortBtn.classList.remove("active");
  sortBtn.textContent = "⭐ Top rated first";
}

// This listens for when the user submits the search form.
// It stops the page from reloading, grabs what they typed, and calls searchShows.
form.addEventListener("submit", (event) => {
  event.preventDefault(); // stop the form from reloading the page
  const query = input.value.trim();
  if (query === "") return;
  searchShows(query);
});

// STEP 3 — getJSON(): one careful helper for every request =============

// This is a helper function that fetches any URL and returns the JSON data.
// If something goes wrong (no internet, bad status code, etc.), it throws
// an error with a message that's easy for the user to understand.
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

// This function runs when the user searches for a show.
// It shows a loading message, calls getJSON to get the results,
// then either shows the cards or displays an error message.
async function searchShows(query) {
  setStatus(`Searching for "${query}"…`, "loading");
  results.innerHTML = "";
  toolbar.hidden = true; // hide sort button while loading
  sorted = false;

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

// STEP 4 + 5 — Click a show to see its details (with Promise.all) ======

// Instead of adding a click listener to every single card, we put one listener
// on the whole grid. When a card is clicked, closest(".card") finds it.
// This also works for cards added later after a new search.
results.addEventListener("click", (event) => {
  const card = event.target.closest(".card");
  if (card) showDetails(card.dataset.id);
});

// STEP 5 — Promise.all: show + cast + seasons at the same time ==========

// This function opens the details pop-up for a show.
// Instead of waiting for each request one by one, we fire all three at the
// same time using Promise.all so it loads faster.
async function showDetails(id) {
  detailsBody.replaceChildren(el("p", "status loading", "Loading details…"));
  dialog.showModal();

  try {
    const start = performance.now();
    // Start all three requests now, then wait for ALL of them
    const [show, cast, seasons] = await Promise.all([
      getJSON(showURL(id)),
      getJSON(castURL(id)),
      getJSON(seasonsURL(id)),
    ]);
    console.log(`3 requests in ${Math.round(performance.now() - start)} ms`);
    renderDetails(show, cast, seasons);
  } catch (error) {
    // If ANY of the three fails, Promise.all rejects and we land here
    detailsBody.replaceChildren(el("p", "status error", error.message));
  }
}

// This function builds the content inside the details pop-up.
// It shows the show's poster, name, year, network, season count, runtime,
// rating, summary, and the first 6 cast members.
function renderDetails(show, cast, seasons) {
  const where = show.network ? show.network.name : show.webChannel ? show.webChannel.name : "";
  const minutes = show.runtime || show.averageRuntime; // runtime is null when episodes vary
  const seasonText = seasons.length === 1 ? "1 season" : `${seasons.length} seasons`;

  const info = el("div", "info");
  info.append(
    el("h2", "", show.name),
    el("p", "meta", [yearRange(show), where, seasonText, minutes ? `${minutes} min` : ""].filter(Boolean).join(" · ")),
    el("p", "meta", show.genres.join(", ")),
    el("p", "score", show.rating.average ? `★ ${show.rating.average} / 10` : "Not rated yet"),
    el("p", "plot", stripTags(show.summary)) // text only, never innerHTML
  );

  // The first 6 cast members: "Bryan Cranston as Walter White"
  if (cast.length > 0) {
    const list = el("ul", "cast");
    cast.slice(0, 6).forEach((member) => {
      const li = el("li", "", member.person.name + " ");
      li.append(el("span", "", "as " + member.character.name));
      list.append(li);
    });
    info.append(el("h3", "", "Cast"), list);
  }

  const links = el("p", "links");
  const tvmaze = el("a", "", "View on TVmaze ↗");
  tvmaze.href = show.url;
  tvmaze.target = "_blank";
  links.append(tvmaze);
  info.append(links);

  detailsBody.replaceChildren(createPoster(show, "original"), info);
}

// EXTEND D — Sort by rating ============================================

// This function sorts the existing cards on the page from highest to lowest
// rating when the user clicks "Top rated first". Shows with no rating go last.
// Clicking again restores the original search order.
let sorted = false; // keeps track of whether we are in sorted order or not

sortBtn.addEventListener("click", () => {
  const cards = Array.from(results.querySelectorAll(".card"));

  if (!sorted) {
    // Sort highest rating first; empty rating ("") goes to the end
    cards.sort((a, b) => {
      const rA = parseFloat(a.dataset.rating) || 0;
      const rB = parseFloat(b.dataset.rating) || 0;
      return rB - rA;
    });
    sortBtn.textContent = "↺ Back to search order";
    sortBtn.classList.add("active");
    sorted = true;
  } else {
    // Restore original order using the position each card had in the DOM
    cards.sort((a, b) => parseInt(a.dataset.index) - parseInt(b.dataset.index));
    sortBtn.textContent = "⭐ Top rated first";
    sortBtn.classList.remove("active");
    sorted = false;
  }

  // Re-append cards in the new order
  cards.forEach((card) => results.appendChild(card));
});
