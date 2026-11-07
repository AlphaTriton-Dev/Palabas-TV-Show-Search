# Code-Along: Palabas, a TV Show Search App

**Web Systems and Technologies · Wrapping up async/await with `fetch()`**

Today you'll build a TV show search app on a real, free web API: **TVmaze**. You need **no account and no key**. You'll use everything from the async lessons: `fetch`, `async`/`await`, `try`/`catch`, `response.ok`, and `Promise.all`.

Name: Lanz P. Enciso  Section: BSIT 3A  Date: 11 / 5 / 2026

---

## Before we start

1. Open the `starter` folder in VS Code. Right-click `index.html` → **Open with Live Server**.
2. Open DevTools (F12). Keep the **Console** and the **Network** tab open.
3. The HTML and CSS are done. You write JavaScript in the TODO sections of `script.js`. The page elements, the API's URLs, and some helper functions are already at the top of the file.
4. **Fell behind?** Copy the matching file from `checkpoints/` (e.g. `step3-script.js`) over your `script.js` and keep going.

### Sample mode or live mode?

`config.js` has one setting:

```js
const USE_SAMPLE_DATA = true;   // true = saved files in data/, false = live TVmaze
```

- **Sample mode** (`true`, the default) reads saved files from `data/`. It works even without internet. Try: `friends`, `office`, `breaking bad`, `stranger things`, `sherlock`, `thrones`, or `sample` to see all six.
- **Live mode** (`false`) searches every show on TVmaze.

**Why start in sample mode?** TVmaze allows about **20 requests every 10 seconds per internet connection**. In a computer lab, the whole class shares one connection, and Live Server reloads your page every time you save. Stay in sample mode while we code together, and switch to live mode when your teacher says so, or at home.

Your code is exactly the same in both modes. Only the URLs change (see `searchURL()` at the top of `script.js`).

| Step | You'll learn | Time |
|---|---|---|
| 1 · First request | the URL of an API call, `fetch`, two `await`s, the Network tab | 15 min |
| 2 · Search & show | form `submit`, building cards from an array of objects | 20 min |
| 3 · `getJSON()` | network errors, HTTP 429 and 404, "empty is not an error", `try`/`catch` | 20 min |
| 4 · Details pop-up | event delegation, a second endpoint, `<dialog>`, safe text | 20 min |
| 5 · `Promise.all` | three requests at once: show + cast + seasons | 15 min |
| 6 · Challenges | retry, debounce, episodes, favorites | homework |

## What is an API request?

An API is a website made for programs instead of people. You ask with a URL; it answers with JSON.

```
https://api.tvmaze.com/search/shows?q=breaking%20bad
└──── where ─────────┘└─ path ────┘└─ query ─────────┘
```

| URL | What you get |
|---|---|
| `/search/shows?q=friends` | an **array** of `{ score, show }`, best match first |
| `/shows/431` | one show, by its TVmaze ID |
| `/shows/431/cast` | an array of `{ person, character }` |
| `/shows/431/seasons` | an array of seasons |

`encodeURIComponent("breaking bad")` turns the space into `%20`, so the URL stays valid.

A `show` object looks like this (shortened):

```js
{
  id: 169,
  name: "Breaking Bad",
  genres: ["Drama", "Crime", "Thriller"],
  premiered: "2008-01-20",
  ended: "2013-09-29",
  runtime: 60,
  rating: { average: 9.2 },
  network: { name: "AMC" },
  image: { medium: "https://…jpg", original: "https://…jpg" },
  summary: "<p><b>Breaking Bad</b> follows…</p>"
}
```

Watch out for values that can be **`null`**: `image`, `rating.average`, `runtime`, `ended`, `network`. Real data is never perfect. The helpers `createPoster`, `yearRange`, and `stripTags` handle the `null`s for you.

---

## Step 1 · Your first API request

```js
// STEP 1 — Your first API request ======================================
async function testRequest() {
  const url = searchURL("friends");
  console.log("Request:", url); // live mode: open this URL in a new tab to see the raw JSON

  const response = await fetch(url); // 1st await: the response arrives
  console.log("Status:", response.status, "ok?", response.ok);

  const data = await response.json(); // 2nd await: the body is read as JSON
  console.log(data); // an ARRAY of { score, show }
  console.log("How many:", data.length);
  console.log("First show:", data[0].show.name, data[0].show.premiered);
}

testRequest();
```

**Look for it:**
- **Console:** the URL, `Status: 200 ok? true`, then an **array**. Expand item `0`: it has a `score` and a `show`. Open `show` and find `name`, `genres`, `rating`, `image`.
- **Network tab:** click the request and open **Preview** to see the JSON as a tree.
- **Live mode:** open the logged URL in a new browser tab. That raw text is exactly what `fetch` receives.

**Checkpoint** ☐ "First show: Friends 1994-09-22" appears in the Console  ☐ I found the request in the Network tab

---

## Step 2 · Search and show the results

**Delete** the Step 1 code first (it runs on every save and uses up requests). Then type:

```js
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

async function searchShows(query) {
  const response = await fetch(searchURL(query));
  const data = await response.json();
  renderResults(data);
}

form.addEventListener("submit", (event) => {
  event.preventDefault(); // stop the form from reloading the page
  const query = input.value.trim();
  if (query === "") return;
  searchShows(query);
});
```

**Try it:** search `sample` (sample mode) or anything you like (live mode).

**Break it on purpose:** search for something that doesn't exist (sample: `superman`; live: `zzqqxx`).
- **Sample:** the Console shows `Unexpected token '<' … is not valid JSON`. The file doesn't exist, so Live Server sent back an HTML "404" page instead of JSON.
- **Live:** **nothing happens at all**, with no error and no message. TVmaze answered `[]`, an empty array, with status 200. To `fetch` that's a success.

Step 3 fixes both.

**Checkpoint** ☐ Searching shows poster cards  ☐ I can explain why a bad search shows nothing

---

## Step 3 · `getJSON()`: one careful helper for every request

Add `getJSON`, then **replace** your `searchShows` with the new version:

```js
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
```

| What went wrong | What fetch does | How we catch it |
|---|---|---|
| No internet / server unreachable | `fetch` **rejects** | `try`/`catch` around `fetch` |
| Too many requests | HTTP **429** | `response.status === 429` |
| File or page doesn't exist | HTTP **404** | `!response.ok` |
| No shows match | HTTP **200**, empty array `[]` | `data.length === 0` |

> **Remember:** `fetch` only rejects when there is *no answer at all*. A 429, a 404, and an empty result all *resolve*, so you must check them yourself.

**Try it:** search a made-up title in both modes. Turn off Wi-Fi in live mode and search again.

**Checkpoint** ☐ Searching shows a spinner, then the number of shows  ☐ Each problem shows a readable red message, never a crash or a blank page

---

## Step 4 · Click a show to see its details

```js
// STEP 4 — Click a show to see its details ==============================
// ONE listener on the whole grid (event delegation). It also works for
// cards that are added later, after a new search.
results.addEventListener("click", (event) => {
  const card = event.target.closest(".card");
  if (card) showDetails(card.dataset.id);
});

async function showDetails(id) {
  detailsBody.replaceChildren(el("p", "status loading", "Loading details…"));
  dialog.showModal();

  try {
    const show = await getJSON(showURL(id));
    renderDetails(show);
  } catch (error) {
    detailsBody.replaceChildren(el("p", "status error", error.message));
  }
}

function renderDetails(show) {
  const where = show.network ? show.network.name : show.webChannel ? show.webChannel.name : "";
  const minutes = show.runtime || show.averageRuntime; // runtime is null when episodes vary

  const info = el("div", "info");
  info.append(
    el("h2", "", show.name),
    el("p", "meta", [yearRange(show), where, show.genres.join(", "), minutes ? `${minutes} min` : ""].filter(Boolean).join(" · ")),
    el("p", "score", show.rating.average ? `★ ${show.rating.average} / 10` : "Not rated yet"),
    el("p", "plot", stripTags(show.summary)) // text only, never innerHTML
  );

  const links = el("p", "links");
  const tvmaze = el("a", "", "View on TVmaze ↗");
  tvmaze.href = show.url;
  tvmaze.target = "_blank";
  links.append(tvmaze);
  info.append(links);

  detailsBody.replaceChildren(createPoster(show, "original"), info);
}
```

**Look for it:**
- **One** listener on `#results` handles clicks on **every** card, even cards from a later search. This is **event delegation**: `event.target.closest(".card")` finds which card was clicked.
- Each click makes a request to a **different endpoint**, `/shows/:id`. Check the Network tab.
- `summary` contains HTML tags. We show it with `stripTags()` and `textContent`, **never** `innerHTML`. Text from an API is not your code: if it contained a `<script>` or an `onerror`, `innerHTML` could run it on your page.
- Close the pop-up with ×, by clicking outside it, or with **Esc** (built into `<dialog>`).

**Checkpoint** ☐ Clicking a card opens its details  ☐ I can explain why one listener is enough

---

## Step 5 · `Promise.all`: show + cast + seasons at the same time

**Replace** your `showDetails` and `renderDetails` with:

```js
// STEP 5 — Promise.all: show + cast + seasons at the same time ==========
// (this replaces the Step 4 showDetails and renderDetails)
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
```

**Look for it:**
- **Network tab:** one click now starts **three** requests at the same moment. In the Waterfall column, the bars run side by side.
- **Console:** "3 requests in … ms". That's about as long as the **slowest** one, not all three added up.
- `const [show, cast, seasons] = await Promise.all([...])` gives you the three results **in the same order** you asked for them, whichever one finished first.
- If **any** request fails, `Promise.all` rejects and `catch` shows the message.

**Checkpoint** ☐ The pop-up shows seasons and cast  ☐ I can explain why `Promise.all` is faster than three `await`s in a row

---

## Step 6 · Challenges (pick at least one)

1. **Retry once on 429.** In `getJSON`, if the status is 429, `await` a 2-second pause (`new Promise((r) => setTimeout(r, 2000))`) and try the request one more time before giving up.
2. **Search as you type.** Search when the user stops typing for 500 ms. Use `setTimeout` and `clearTimeout` on the `input` event, so you don't send a request for every key. This also keeps you under the rate limit.
3. **Episode list.** Live mode: add a "Season 1 episodes" list using `/seasons/:seasonId/episodes` (each season object has an `id`).
4. **Favorites.** Add a ☆ button in the pop-up that saves the show's `id` and `name` in `localStorage`, and a "My favorites" list that survives a page reload.
5. **Sort by rating.** Add a "Top rated first" button that sorts the cards by `rating.average` (`null` last).

**Portfolio idea:** add a "Shows I recommend" section to your portfolio. Store the TVmaze IDs in an array, and use `getJSON` with `Promise.all` to show their posters and summaries.

---

## Cheat sheet

| I want to… | Code |
|---|---|
| ask an API | `const response = await fetch(url);` |
| check the HTTP status | `response.ok`, `response.status` |
| read JSON | `const data = await response.json();` |
| treat "no results" as a message | `if (data.length === 0) { … }` |
| show errors | `try { … } catch (error) { setStatus(error.message, "error"); }` |
| run requests together | `const [a, b] = await Promise.all([getJSON(u1), getJSON(u2)]);` |
| one listener for many items | `parent.addEventListener("click", (e) => e.target.closest(".item"))` |
| put a value in a URL safely | `encodeURIComponent("breaking bad")` |
| show text from an API safely | `element.textContent = …` (not `innerHTML`) |

**Common errors**

| You see | It usually means |
|---|---|
| `Too many requests (429)` | the class used up TVmaze's limit; wait 10 seconds, or use sample mode |
| Nothing happens, no error | the API returned an empty array `[]`: check `data.length` |
| `Unexpected token '<' … not valid JSON` | you received an HTML page (usually a 404), not JSON |
| `Cannot read properties of null (reading 'medium')` | `show.image` is `null`: check before using it |
| `Cannot read properties of undefined (reading 'name')` | wrong path in the object: check it in the Console (`data[0].show.name`) |
| `Failed to fetch` / "Can't reach TVmaze" | no internet, or the page was opened with `file://` |
