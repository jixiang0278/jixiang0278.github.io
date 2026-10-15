const SITE_CONFIG = {
  githubUser: "jixiang0278",
  counterEndpoint: "", // Example: "https://YOUR-SITE.goatcounter.com/counter/..."
  maxProjects: 4,
};

const state = { cachedStats: null, game: null, gameTimer: null, running: false, score: 0 };
const $ = (selector, root = document) => root.querySelector(selector);

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
  const toggle = $("#theme-toggle");
  toggle?.setAttribute("aria-pressed", String(theme === "dark"));
}

function initTheme() {
  const saved = localStorage.getItem("theme");
  const preferred = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  setTheme(saved || preferred);
  $("#theme-toggle")?.addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
}

function initNavigation() {
  const links = [...document.querySelectorAll(".site-nav a")];
  const sections = links.map((link) => document.querySelector(link.hash)).filter(Boolean);
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    links.forEach((link) => link.classList.toggle("active", link.hash === `#${visible.target.id}`));
  }, { rootMargin: "-20% 0px -65%", threshold: [0.05, 0.35] });
  sections.forEach((section) => observer.observe(section));
}

async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

async function loadNews() {
  try {
    const news = await loadJson("data/news.json");
    $("#news-list").innerHTML = news
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((item) => `<li><time datetime="${escapeHtml(item.date)}">${formatDate(item.date)}</time><div><h3>${escapeHtml(item.title)}${item.placeholder ? '<span class="placeholder-badge">Sample</span>' : ""}</h3><p>${escapeHtml(item.description)}</p></div></li>`)
      .join("");
  } catch (error) { console.warn(error); }
}

function renderPublication(publication, liveCitation) {
  const count = liveCitation?.citationCount ?? publication.citationCount;
  const source = liveCitation?.source ?? publication.citationSource;
  const updated = liveCitation?.updatedAt?.slice(0, 10) ?? publication.citationUpdated;
  const article = document.createElement("article");
  article.className = "publication-card";
  article.innerHTML = `
    <div class="publication-meta"><span>${escapeHtml(String(publication.year))}</span><span>Journal article</span><span>Open access</span></div>
    <h3>${escapeHtml(publication.title)}</h3>
    <p class="publication-authors">${publication.authors.map((author) => author === "Xiang Ji" ? `<strong>${escapeHtml(author)}</strong>` : escapeHtml(author)).join(", ")}</p>
    <p class="publication-journal"><em>${escapeHtml(publication.journal)}</em>, ${escapeHtml(publication.volume)}(${escapeHtml(publication.issue)}), ${escapeHtml(publication.articleNumber)} · DOI ${escapeHtml(publication.doi)}</p>
    <div class="publication-actions">
      <a class="button button--primary" href="${escapeHtml(publication.url)}" target="_blank" rel="noreferrer">Read paper <span aria-hidden="true">↗</span></a>
      <button class="button button--secondary cite-button" type="button">Cite</button>
      <span class="citation-chip">${Number(count).toLocaleString()} citation${Number(count) === 1 ? "" : "s"}</span>
    </div>
    <p class="citation-source">Source: <a href="https://openalex.org/${escapeHtml(publication.openAlexId)}" target="_blank" rel="noreferrer">${escapeHtml(source)}</a> · Updated ${escapeHtml(updated)}</p>`;
  $(".cite-button", article).addEventListener("click", () => openCitation(publication.bibtex));
  return article;
}

async function loadPublications() {
  try {
    const publications = await loadJson("data/publications.json");
    const holder = $("#publication-list");
    holder.innerHTML = "";
    publications.forEach((publication) => holder.append(renderPublication(publication, state.cachedStats?.publications?.[publication.openAlexId])));
    const total = publications.reduce((sum, publication) => sum + Number(state.cachedStats?.publications?.[publication.openAlexId]?.citationCount ?? publication.citationCount ?? 0), 0);
    $("#citation-count").textContent = total.toLocaleString();
  } catch (error) {
    console.warn(error);
    $("#publication-list").innerHTML = '<article class="publication-card"><p>Publication data is temporarily unavailable. <a href="https://doi.org/10.3390/jmse14010047">Open the paper directly</a>.</p></article>';
  }
}

function openCitation(bibtex) {
  $("#bibtex-content").textContent = bibtex;
  $("#copy-status").textContent = "";
  $("#citation-dialog").showModal();
}

function initCitationDialog() {
  $("#copy-bibtex")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("#bibtex-content").textContent);
      $("#copy-status").textContent = "Copied to clipboard.";
    } catch {
      $("#copy-status").textContent = "Select the text above and copy it manually.";
    }
  });
}

function renderProjects(repos) {
  const grid = $("#project-grid");
  const usable = repos.filter((repo) => !repo.fork && !repo.archived).sort((a, b) => (b.stargazers_count - a.stargazers_count) || new Date(b.updated_at) - new Date(a.updated_at)).slice(0, SITE_CONFIG.maxProjects);
  if (!usable.length) {
    grid.innerHTML = '<article class="project-card"><p class="eyebrow">A fresh start</p><h3><a href="https://github.com/jixiang0278" target="_blank" rel="noreferrer">Projects are on the way</a></h3><p>Public repositories will appear here automatically as they are published.</p><div class="project-card__meta"><span>GitHub connected</span></div></article>';
    return;
  }
  grid.innerHTML = usable.map((repo) => `
    <article class="project-card">
      <div class="project-card__top"><p class="eyebrow">Repository</p><span aria-label="${repo.stargazers_count} stars">☆ ${repo.stargazers_count}</span></div>
      <h3><a href="${escapeHtml(repo.html_url)}" target="_blank" rel="noreferrer">${escapeHtml(repo.name)} <span aria-hidden="true">↗</span></a></h3>
      <p>${escapeHtml(repo.description || "No description yet.")}</p>
      <div class="project-card__meta"><span>${repo.language ? `<i class="language-dot"></i>${escapeHtml(repo.language)}` : "Static site"}</span><span>⑂ ${repo.forks_count}</span><span>Updated ${formatDate(repo.updated_at.slice(0, 10))}</span></div>
    </article>`).join("");
}

function applyGithubStats(repos) {
  $("#repo-count").textContent = repos.length.toLocaleString();
  $("#star-count").textContent = repos.reduce((sum, repo) => sum + Number(repo.stargazers_count || 0), 0).toLocaleString();
  renderProjects(repos);
}

async function loadStats() {
  try {
    state.cachedStats = await loadJson("data/stats.json");
    const cached = state.cachedStats.github;
    if (cached) {
      $("#repo-count").textContent = Number(cached.publicRepos || 0).toLocaleString();
      $("#star-count").textContent = Number(cached.totalStars || 0).toLocaleString();
      if (cached.featured?.length) renderProjects(cached.featured);
      $("#stats-note").textContent = `Cached data · updated ${new Date(state.cachedStats.updatedAt).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}`;
    }
  } catch (error) { console.warn(error); }
  await loadPublications();
  try {
    const response = await fetch(`https://api.github.com/users/${SITE_CONFIG.githubUser}/repos?per_page=100&sort=updated`, { headers: { Accept: "application/vnd.github+json" } });
    if (!response.ok) throw new Error(`GitHub API: ${response.status}`);
    applyGithubStats(await response.json());
    $("#stats-note").textContent = "Live GitHub data · citation count cached";
  } catch (error) {
    console.warn(error);
    if (!state.cachedStats?.github?.featured?.length) renderProjects([]);
  }
}

async function initCounter() {
  if (!SITE_CONFIG.counterEndpoint) return;
  try {
    const response = await fetch(SITE_CONFIG.counterEndpoint, { mode: "cors" });
    if (!response.ok) throw new Error("Counter unavailable");
    const data = await response.json();
    $("#visitor-count").textContent = Number(data.count ?? data.value).toLocaleString();
  } catch { $("#visitor-count").textContent = "Temporarily unavailable"; }
}

function resetGameStage() {
  clearInterval(state.gameTimer);
  state.gameTimer = null; state.running = false; state.score = 0;
  $("#game-score").textContent = "0";
  $("#game-stage").innerHTML = "";
}

function setGameScore(value) { state.score = value; $("#game-score").textContent = String(value); }

function initCatchGame() {
  resetGameStage();
  $("#game-title").textContent = "Catch the Star";
  $("#game-help").textContent = "Select the star before it moves. Mouse, touch, and keyboard focus are supported.";
  const stage = $("#game-stage");
  const target = document.createElement("button"); target.className = "catch-target"; target.type = "button"; target.textContent = "✦"; target.setAttribute("aria-label", "Catch the star"); stage.append(target);
  const move = () => { const rect = stage.getBoundingClientRect(); target.style.left = `${Math.random() * Math.max(0, rect.width - 55)}px`; target.style.top = `${Math.random() * Math.max(0, rect.height - 55)}px`; };
  target.addEventListener("click", () => { if (state.running) { setGameScore(state.score + 1); move(); } });
  state.game = { start() { state.running = true; move(); clearInterval(state.gameTimer); state.gameTimer = setInterval(move, 1200); }, pause() { state.running = false; clearInterval(state.gameTimer); }, restart() { setGameScore(0); this.start(); } };
  move();
}

function initMemoryGame() {
  resetGameStage();
  $("#game-title").textContent = "Memory Match";
  $("#game-help").textContent = "Reveal two cards at a time and match all six pairs.";
  const icons = ["◌", "◇", "✦", "△", "≈", "⊙"];
  let deck = [...icons, ...icons].sort(() => Math.random() - .5), open = [], matched = 0;
  const board = document.createElement("div"); board.className = "memory-board"; $("#game-stage").append(board);
  const build = () => { board.innerHTML = ""; deck.forEach((icon, index) => { const card = document.createElement("button"); card.className = "memory-card"; card.type = "button"; card.textContent = icon; card.dataset.index = index; card.setAttribute("aria-label", "Hidden memory card"); card.addEventListener("click", () => flip(card, icon)); board.append(card); }); };
  const flip = (card, icon) => { if (!state.running || card.classList.contains("revealed") || card.classList.contains("matched") || open.length === 2) return; card.classList.add("revealed"); card.setAttribute("aria-label", `Card ${icon}`); open.push({ card, icon }); if (open.length === 2) setTimeout(() => { if (open[0].icon === open[1].icon) { open.forEach(({card:c}) => c.classList.add("matched")); matched += 2; setGameScore(state.score + 1); if (matched === deck.length) state.running = false; } else open.forEach(({card:c}) => c.classList.remove("revealed")); open = []; }, 550); };
  state.game = { start() { state.running = true; }, pause() { state.running = false; }, restart() { deck = [...icons, ...icons].sort(() => Math.random() - .5); open = []; matched = 0; setGameScore(0); build(); state.running = true; } };
  build();
}

function initSnakeGame() {
  resetGameStage();
  $("#game-title").textContent = "Mini Snake";
  $("#game-help").textContent = "Use arrow keys, WASD, or the touch controls. Eat the coral dots.";
  const stage = $("#game-stage"), size = 18; let snake, direction, food;
  const controls = document.createElement("div"); controls.className = "touch-controls"; controls.innerHTML = '<button class="up" data-dir="up" aria-label="Move up">↑</button><button class="left" data-dir="left" aria-label="Move left">←</button><button class="down" data-dir="down" aria-label="Move down">↓</button><button class="right" data-dir="right" aria-label="Move right">→</button>';
  const reset = () => { snake = [{x:8,y:7},{x:7,y:7},{x:6,y:7}]; direction = {x:1,y:0}; food = {x:12,y:7}; setGameScore(0); draw(); };
  const draw = () => { stage.querySelectorAll(".snake-cell,.snake-food").forEach((node) => node.remove()); const w = stage.clientWidth / size, h = stage.clientHeight / size; snake.forEach((part) => { const cell = document.createElement("span"); cell.className = "snake-cell"; Object.assign(cell.style,{width:`${w}px`,height:`${h}px`,left:`${part.x*w}px`,top:`${part.y*h}px`}); stage.append(cell); }); const pellet = document.createElement("span"); pellet.className = "snake-food"; Object.assign(pellet.style,{width:`${w*.72}px`,height:`${h*.72}px`,left:`${food.x*w+w*.14}px`,top:`${food.y*h+h*.14}px`}); stage.append(pellet); };
  const tick = () => { const head = {x:snake[0].x+direction.x,y:snake[0].y+direction.y}; if (head.x<0||head.x>=size||head.y<0||head.y>=size||snake.some((p)=>p.x===head.x&&p.y===head.y)) { state.game.pause(); return; } snake.unshift(head); if (head.x===food.x&&head.y===food.y) { setGameScore(state.score+1); do { food={x:Math.floor(Math.random()*size),y:Math.floor(Math.random()*size)}; } while(snake.some((p)=>p.x===food.x&&p.y===food.y)); } else snake.pop(); draw(); };
  const turn = (next) => { const dirs={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}}; const d=dirs[next]; if (d && !(d.x===-direction.x&&d.y===-direction.y)) direction=d; };
  stage.addEventListener("keydown", (event) => { const map={ArrowUp:"up",w:"up",ArrowDown:"down",s:"down",ArrowLeft:"left",a:"left",ArrowRight:"right",d:"right"}; if(map[event.key]) { event.preventDefault(); turn(map[event.key]); } });
  controls.addEventListener("click", (event) => turn(event.target.dataset.dir)); stage.after(controls);
  state.game = { start() { if(state.running) return; state.running=true; clearInterval(state.gameTimer); state.gameTimer=setInterval(tick,150); stage.focus(); }, pause() { state.running=false; clearInterval(state.gameTimer); }, restart() { this.pause(); reset(); this.start(); } };
  reset();
}

function initGames() {
  const initializers = [initCatchGame, initMemoryGame, initSnakeGame];
  const setup = initializers[Math.floor(Math.random() * initializers.length)];
  $("#game-toggle")?.addEventListener("click", () => { const panel=$("#game-panel"), open=panel.hidden; panel.hidden=!open; $("#game-toggle").setAttribute("aria-expanded", String(open)); $("#game-toggle").textContent=open?"Close game":"Open game"; if(open&&!state.game) setup(); });
  $("#game-start")?.addEventListener("click", () => state.game?.start());
  $("#game-pause")?.addEventListener("click", () => state.game?.pause());
  $("#game-restart")?.addEventListener("click", () => state.game?.restart());
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme(); initNavigation(); initCitationDialog(); initGames(); initCounter(); loadNews(); loadStats();
  $("#current-year").textContent = new Date().getFullYear();
});
