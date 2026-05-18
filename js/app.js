/* ========== LUCIDE ICON HELPERS ========== */
function icon(name) {
  return `<i data-lucide="${name}" aria-hidden="true"></i>`;
}

function setIcon(el, name) {
  if (!el) return;
  el.innerHTML = icon(name);
  if (window.lucide) lucide.createIcons({ nodes: [el], attrs: { "stroke-width": 1.75 } });
}

function setIconLabel(el, iconName, label) {
  if (!el) return;
  el.innerHTML = icon(iconName) + `<span>${label}</span>`;
  if (window.lucide) lucide.createIcons({ nodes: [el], attrs: { "stroke-width": 1.75 } });
}

function refreshIcons() {
  if (window.lucide) lucide.createIcons({ attrs: { "stroke-width": 1.75 } });
}

const STORAGE_KEY = "lofiChill_v1";

/* ========== STATE ========== */
const state = {
  bgIndex: 0,
  bgLayerA: true,
  theme: "day",
  volume: 0.7,
  muted: false,
  playlist: [],
  currentTrack: -1,
  musicShuffle: false,
  repeatMode: "off", // off | one | all
  isPlaying: false,
  isDraggingProgress: false,
  pomo: {
    secondsLeft: 25 * 60,
    running: false,
    workDuration: 25 * 60
  }
};

/* ========== DOM REFS ========== */
const $ = (sel) => document.querySelector(sel);
const bgStackA = $("#bgStackA");
const bgStackB = $("#bgStackB");
const bgA = $("#bgA");
const bgB = $("#bgB");
const bgAFill = $("#bgAFill");
const bgBFill = $("#bgBFill");
const bgLabel = $("#bgLabel");
const vinyl = $("#vinyl");
const vinylWrap = $("#vinylWrap");
const vinylArt = $("#vinylArt");
let ytPlayer = null;
let ytApiReady = null;
let ytProgressTimer = null;
let ytPendingAutoplay = false;
const trackTitle = $("#trackTitle");
const trackMeta = $("#trackMeta");
const timeCurrent = $("#timeCurrent");
const timeTotal = $("#timeTotal");
const progressFill = $("#progressFill");
const progressWrap = $("#progressWrap");
const playlistEl = $("#playlist");
const ytSearchInput = $("#ytSearchInput");
const ytSearchBtn = $("#ytSearchBtn");
const ytSearchResults = $("#ytSearchResults");

let ytSearchTimer = null;
let ytSearchAbort = null;
const ytSearchState = {
  query: "",
  items: [],
  hasMore: false,
  continuation: null,
  loadingMore: false
};

let activeWidgetModal = null;
let bgTransitionToken = 0;
const modalBackdrop = $("#modalBackdrop");

/* ========== LOCAL STORAGE ========== */
function loadStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (typeof data.bgIndex === "number" && data.bgIndex >= 0 && data.bgIndex < getBackgroundCount()) {
      state.bgIndex = data.bgIndex;
    }
    if (typeof data.volume === "number") state.volume = data.volume;
    if (data.theme === "day" || data.theme === "night") state.theme = data.theme;
    if (data.muted) state.muted = true;
    if (data.pomo) {
      Object.assign(state.pomo, data.pomo);
      clampPomoState();
    }
    if (Array.isArray(data.playlist)) {
      state.playlist = data.playlist.filter((t) => t && t.videoId);
    }
  } catch (_) { /* ignore corrupt storage */ }
}

function saveStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    bgIndex: state.bgIndex,
    volume: state.volume,
    theme: state.theme,
    muted: state.muted,
    pomo: {
      secondsLeft: state.pomo.secondsLeft,
      running: state.pomo.running,
      workDuration: state.pomo.workDuration
    },
    playlist: state.playlist.map((t) => ({
      videoId: t.videoId,
      name: t.name,
      author: t.author || "",
      thumbnail: t.thumbnail || ""
    }))
  }));
}

/* ========== BACKGROUND SYSTEM ========== */
function bgPath(index) {
  return cloudinaryBgUrl(index);
}

function thumbPath(index) {
  return cloudinaryThumbUrl(index);
}

function updateBgLabel() {
  bgLabel.textContent = `bg ${state.bgIndex + 1} / ${getBackgroundCount()}`;
}

function clearBgInlineStyles(img) {
  if (!img) return;
  img.style.width = "";
  img.style.height = "";
  img.style.transform = "";
}

function setBackground(index, skipFade) {
  const count = getBackgroundCount();
  index = ((index % count) + count) % count;
  state.bgIndex = index;

  const src = bgPath(index);
  const showA = state.bgLayerA;
  const incomingStack = showA ? bgStackB : bgStackA;
  const outgoingStack = showA ? bgStackA : bgStackB;
  const incomingMain = showA ? bgB : bgA;
  const incomingFill = showA ? bgBFill : bgAFill;
  const token = ++bgTransitionToken;

  incomingMain.alt = `Background ${index + 1}`;

  const applySrc = () => {
    clearBgInlineStyles(incomingMain);
    incomingMain.src = src;
    if (incomingFill) incomingFill.src = src;
  };

  const commitTransition = () => {
    if (token !== bgTransitionToken) return;
    incomingStack.classList.add("active");
    outgoingStack.classList.remove("active");
    state.bgLayerA = !showA;
    updateBgLabel();
    saveStorage();
  };

  const loadIncoming = () => {
    incomingMain.onload = null;
    incomingMain.onerror = null;

    if (incomingMain.getAttribute("src") === src && incomingMain.complete && incomingMain.naturalWidth > 0) {
      commitTransition();
      return;
    }

    incomingMain.onload = () => {
      if (token !== bgTransitionToken) return;
      commitTransition();
    };
    incomingMain.onerror = () => {
      if (token !== bgTransitionToken) return;
      commitTransition();
    };
    applySrc();
    if (incomingMain.complete && incomingMain.naturalWidth > 0) {
      incomingMain.onload = null;
      incomingMain.onerror = null;
      commitTransition();
    }
  };

  if (skipFade) {
    applySrc();
    commitTransition();
  } else {
    loadIncoming();
  }
}

function bgNext() { setBackground(state.bgIndex + 1); }
function bgPrev() { setBackground(state.bgIndex - 1); }
function bgShuffle() {
  let next;
  const count = getBackgroundCount();
  do { next = Math.floor(Math.random() * count); }
  while (next === state.bgIndex && count > 1);
  setBackground(next);
}

/* ========== THEME DAY / NIGHT ========== */
function applyTheme() {
  document.body.classList.toggle("night", state.theme === "night");
  setIcon($("#themeToggle"), state.theme === "night" ? "moon" : "sun");
  $("#themeToggle").title = state.theme === "night" ? "Night" : "Day";
  saveStorage();
}

/* ========== MOBILE LANDSCAPE ONLY ========== */
const mobilePortraitMq = window.matchMedia("(max-width: 900px) and (orientation: portrait)");

function isMobilePortrait() {
  return mobilePortraitMq.matches;
}

function syncMobileOrientation() {
  if (isMobilePortrait()) closeAllOverlays();
}

/* ========== WIDGET MODALS ========== */
function openWidgetModal(modalId, dockBtn) {
  if (isMobilePortrait()) return;
  const modal = document.getElementById(modalId);
  if (!modal) return;

  if (activeWidgetModal === modalId) {
    closeWidgetModals();
    return;
  }

  closeWidgetModals();
  activeWidgetModal = modalId;
  modal.removeAttribute("hidden");
  modal.classList.add("open");
  modalBackdrop.classList.add("open");
  modalBackdrop.setAttribute("aria-hidden", "false");
  document.querySelectorAll(".dock-btn[data-modal]").forEach((b) => b.classList.remove("active"));
  dockBtn?.classList.add("active");
}

function closeWidgetModals() {
  activeWidgetModal = null;
  modalBackdrop.classList.remove("open");
  modalBackdrop.setAttribute("aria-hidden", "true");
  document.querySelectorAll(".widget-modal").forEach((m) => {
    m.classList.remove("open");
    m.setAttribute("hidden", "");
  });
  document.querySelectorAll(".dock-btn[data-modal]").forEach((b) => b.classList.remove("active"));
}

function closeAllOverlays() {
  closeGallery();
  closeWidgetModals();
}

function toggleTheme() {
  state.theme = state.theme === "day" ? "night" : "day";
  applyTheme();
}

/* ========== GALLERY — wallpaper picker ========== */
const galleryStage = $("#galleryStage");
const gallerySearch = $("#gallerySearch");
const galleryPreviewImg = $("#galleryPreviewImg");
const galleryPreviewFill = $("#galleryPreviewFill");
const galleryPreviewMeta = $("#galleryPreviewMeta");
const galleryProgressFill = $("#galleryProgressFill");
const galleryApply = $("#galleryApply");
const galleryPrev = $("#galleryPrev");
const galleryNext = $("#galleryNext");
const galleryRandom = $("#galleryRandom");
const galleryJumpBtn = $("#galleryJumpBtn");
let galleryPickIndex = -1;
let gallerySwipeX = 0;

function updateGalleryPreview(index) {
  const count = getBackgroundCount();
  index = ((index % count) + count) % count;
  galleryPickIndex = index;

  const src = bgPath(index);
  if (galleryPreviewImg) {
    galleryPreviewImg.classList.add("is-switching");
    galleryPreviewImg.onload = () => galleryPreviewImg.classList.remove("is-switching");
    galleryPreviewImg.onerror = () => galleryPreviewImg.classList.remove("is-switching");
    galleryPreviewImg.src = src;
    galleryPreviewImg.alt = `Background ${index + 1}`;
  }
  if (galleryPreviewFill) galleryPreviewFill.src = src;
  if (galleryPreviewMeta) {
    galleryPreviewMeta.textContent = `${index + 1} / ${count}`;
  }
  if (galleryProgressFill) {
    galleryProgressFill.style.width = `${((index + 1) / count) * 100}%`;
  }
}

function galleryStep(delta) {
  if (!delta) return;
  updateGalleryPreview(galleryPickIndex + delta);
}

function galleryJumpFromInput() {
  const raw = gallerySearch.value.trim().replace("#", "");
  const num = parseInt(raw, 10);
  if (!Number.isFinite(num) || num < 1) return;
  updateGalleryPreview(num - 1);
}

function galleryPickRandom() {
  const count = getBackgroundCount();
  if (count <= 1) return;
  let next;
  do {
    next = Math.floor(Math.random() * count);
  } while (next === galleryPickIndex);
  updateGalleryPreview(next);
}

function applyGalleryPick() {
  if (galleryPickIndex < 0) return;
  setBackground(galleryPickIndex);
  closeGallery();
}

function onGalleryKeydown(e) {
  const panel = $("#galleryPanel");
  if (!panel?.classList.contains("open")) return;
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    galleryStep(-1);
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    galleryStep(1);
  } else if (e.key === "Enter") {
    e.preventDefault();
    applyGalleryPick();
  }
}

function bindGallerySwipe() {
  if (!galleryStage) return;
  galleryStage.addEventListener(
    "touchstart",
    (e) => {
      gallerySwipeX = e.touches[0]?.clientX ?? 0;
    },
    { passive: true }
  );
  galleryStage.addEventListener(
    "touchend",
    (e) => {
      const dx = e.changedTouches[0].clientX - gallerySwipeX;
      if (Math.abs(dx) < 48) return;
      galleryStep(dx < 0 ? 1 : -1);
    },
    { passive: true }
  );
}

function openGallery() {
  if (isMobilePortrait()) return;
  $("#galleryPanel").removeAttribute("hidden");
  $("#galleryBackdrop").classList.add("open");
  $("#galleryPanel").classList.add("open");
  gallerySearch.value = "";
  updateGalleryPreview(state.bgIndex);
  refreshIcons();
}

function closeGallery() {
  $("#galleryBackdrop").classList.remove("open");
  $("#galleryPanel").classList.remove("open");
  $("#galleryPanel").setAttribute("hidden", "");
}


/* ========== CLOCK ========== */
function pad(n) { return String(n).padStart(2, "0"); }

function updateClock() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();

  $("#clockDigital").textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
  $("#clockDate").textContent = now.toLocaleDateString("vi-VN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  const secDeg = s * 6;
  const minDeg = m * 6 + s * 0.1;
  const hourDeg = (h % 12) * 30 + m * 0.5;
  $("#handSecond").style.transform = `rotate(${secDeg}deg)`;
  $("#handMinute").style.transform = `rotate(${minDeg}deg)`;
  $("#handHour").style.transform = `rotate(${hourDeg}deg)`;
}

/* ========== YOUTUBE MUSIC ========== */
/** Phát qua YouTube IFrame API (embed), không proxy googlevideo */
function loadYoutubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (ytApiReady) return ytApiReady;
  ytApiReady = new Promise((resolve) => {
    const done = () => resolve();
    if (window.YT?.Player) {
      done();
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") prev();
      done();
    };
  });
  return ytApiReady;
}

function syncYtVolume() {
  if (!ytPlayer?.setVolume) return;
  if (state.muted || state.volume === 0) {
    ytPlayer.mute();
  } else {
    ytPlayer.unMute();
    ytPlayer.setVolume(Math.round(state.volume * 100));
  }
}

function stopYtProgressPoll() {
  if (ytProgressTimer) {
    clearInterval(ytProgressTimer);
    ytProgressTimer = null;
  }
}

function startYtProgressPoll() {
  stopYtProgressPoll();
  ytProgressTimer = setInterval(() => {
    if (!ytPlayer?.getCurrentTime || state.isDraggingProgress) return;
    const cur = ytPlayer.getCurrentTime() || 0;
    const dur = ytPlayer.getDuration() || 0;
    if (dur > 0) {
      progressFill.style.width = (cur / dur) * 100 + "%";
      timeCurrent.textContent = formatTime(cur);
      timeTotal.textContent = formatTime(dur);
    }
  }, 400);
}

function onYtStateChange(event) {
  const YT = window.YT;
  const st = event.data;

  if (st === YT.PlayerState.PLAYING) {
    state.isPlaying = true;
    updateVinyl();
    setIcon($("#musicPlay"), "pause");
    startYtProgressPoll();
  } else if (st === YT.PlayerState.PAUSED) {
    state.isPlaying = false;
    updateVinyl();
    setIcon($("#musicPlay"), "play");
    stopYtProgressPoll();
  } else if (st === YT.PlayerState.ENDED) {
    stopYtProgressPoll();
    if (state.repeatMode === "one") {
      ytPlayer.seekTo(0, true);
      ytPlayer.playVideo();
      return;
    }
    if (state.repeatMode === "all" || state.currentTrack < state.playlist.length - 1) {
      loadTrack(getNextIndex(), true);
    } else {
      state.isPlaying = false;
      updateVinyl();
      setIcon($("#musicPlay"), "play");
    }
  } else if (
    ytPendingAutoplay &&
    (st === YT.PlayerState.CUED || st === YT.PlayerState.UNSTARTED)
  ) {
    ytPendingAutoplay = false;
    try {
      ytPlayer.playVideo();
    } catch {
      /* mobile có thể chặn — user bấm play thủ công */
    }
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function addYouTubeTrack(item) {
  if (!item?.id) return;

  const existingIndex = state.playlist.findIndex((t) => t.videoId === item.id);
  if (existingIndex >= 0) {
    playTrack(existingIndex);
    return;
  }

  state.playlist.push({
    videoId: item.id,
    name: item.title || "YouTube",
    author: item.author || "",
    thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`
  });
  saveStorage();
  renderPlaylist();
  playTrack(state.playlist.length - 1);
}

async function searchYouTube(query, continuation) {
  if (ytSearchAbort) ytSearchAbort.abort();
  ytSearchAbort = new AbortController();
  let url = `${YOUTUBE_API}/search?q=${encodeURIComponent(query)}`;
  if (continuation) url += `&continuation=${encodeURIComponent(continuation)}`;

  let res;
  try {
    res = await fetch(url, { signal: ytSearchAbort.signal });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new Error("Không kết nối server — chạy: npm start");
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || "Tìm kiếm thất bại");
  }
  return body;
}

function youtubeResultHtml(item) {
  return `
    <button type="button" class="yt-result-item" data-video-id="${escapeHtml(item.id)}">
      ${item.thumbnail ? `<img class="yt-result-thumb" src="${escapeHtml(item.thumbnail)}" alt="" loading="lazy" />` : ""}
      <div class="yt-result-meta">
        <div class="yt-result-title">${escapeHtml(item.title)}</div>
        <div class="yt-result-sub">${escapeHtml(item.author)}${item.duration ? ` · ${escapeHtml(item.duration)}` : ""}</div>
      </div>
    </button>
  `;
}

function youtubeResultsFooterHtml() {
  if (ytSearchState.loadingMore) return '<p class="yt-search-loading-more">Đang tải thêm...</p>';
  if (ytSearchState.hasMore) return '<p class="yt-search-hint">Cuộn xuống để tải thêm</p>';
  if (ytSearchState.items.length) return '<p class="yt-search-hint yt-search-hint--end">Đã hết kết quả</p>';
  return "";
}

function bindYouTubeResultClicks() {
  if (ytSearchResults.dataset.clickBound) return;
  ytSearchResults.dataset.clickBound = "1";
  ytSearchResults.addEventListener("click", (e) => {
    const btn = e.target.closest(".yt-result-item");
    if (!btn) return;
    const item = ytSearchState.items.find((v) => v.id === btn.dataset.videoId);
    if (item) addYouTubeTrack(item);
  });
}

const SEARCH_FADE_MS = 220;

function getSearchResultsBody() {
  return ytSearchResults.querySelector(".yt-search-results-body") || ytSearchResults;
}

function setSearchResultsHtml(html, { animate = false, populated = false } = {}) {
  const body = getSearchResultsBody();
  const apply = () => {
    body.innerHTML = html;
    ytSearchResults.classList.toggle("is-populated", populated);
    body.scrollTop = 0;
  };

  if (!animate) {
    ytSearchResults.classList.remove("is-fading", "is-populated");
    apply();
    return Promise.resolve();
  }

  ytSearchResults.classList.remove("is-populated");
  ytSearchResults.classList.add("is-fading");
  return new Promise((resolve) => {
    setTimeout(() => {
      apply();
      ytSearchResults.classList.remove("is-fading");
      requestAnimationFrame(resolve);
    }, SEARCH_FADE_MS);
  });
}

function setSearchResultsIdle() {
  ytSearchResults.classList.remove("is-loading", "is-populated");
  ytSearchState.items = [];
  ytSearchState.hasMore = false;
  ytSearchState.continuation = null;
  setSearchResultsHtml('<p class="yt-search-idle">Nhập từ khóa để tìm</p>');
}

async function renderYouTubeResults(items, { append = false } = {}) {
  ytSearchResults.classList.remove("is-loading");
  bindYouTubeResultClicks();
  const body = getSearchResultsBody();

  if (!append) {
    ytSearchState.items = items;
    if (!items.length) {
      await setSearchResultsHtml('<p class="yt-search-empty">Không có kết quả</p>', { animate: true });
      return;
    }
    const html = items.map(youtubeResultHtml).join("") + youtubeResultsFooterHtml();
    await setSearchResultsHtml(html, { animate: true, populated: true });
    return;
  }

  if (items.length) {
    const seen = new Set(ytSearchState.items.map((v) => v.id));
    const unique = items.filter((v) => !seen.has(v.id));
    ytSearchState.items.push(...unique);
    items = unique;
  }
  body.querySelector(".yt-search-loading-more, .yt-search-hint")?.remove();
  const chunk = items.map((item) => youtubeResultHtml(item).replace(
    'class="yt-result-item"',
    'class="yt-result-item yt-result-item--enter"'
  )).join("");
  body.insertAdjacentHTML("beforeend", chunk + youtubeResultsFooterHtml());
}

async function loadMoreYouTubeResults() {
  if (!ytSearchState.hasMore || ytSearchState.loadingMore || !ytSearchState.continuation) return;

  ytSearchState.loadingMore = true;
  const body = getSearchResultsBody();
  const footer = body.querySelector(".yt-search-hint, .yt-search-loading-more");
  if (footer) footer.textContent = "Đang tải thêm...";
  else body.insertAdjacentHTML("beforeend", '<p class="yt-search-loading-more">Đang tải thêm...</p>');

  try {
    const data = await searchYouTube(ytSearchState.query, ytSearchState.continuation);
    ytSearchState.hasMore = !!data.hasMore;
    ytSearchState.continuation = data.continuation || ytSearchState.continuation;
    renderYouTubeResults(data.items || [], { append: true });
  } catch (err) {
    if (err.name === "AbortError") return;
    getSearchResultsBody().querySelector(".yt-search-loading-more, .yt-search-hint")?.remove();
    getSearchResultsBody().insertAdjacentHTML("beforeend", `<p class="yt-search-empty">${escapeHtml(err.message)}</p>`);
  } finally {
    ytSearchState.loadingMore = false;
  }
}

function onYouTubeResultsScroll() {
  if (!ytSearchState.hasMore || ytSearchState.loadingMore) return;
  const body = getSearchResultsBody();
  const { scrollTop, scrollHeight, clientHeight } = body;
  if (scrollTop + clientHeight >= scrollHeight - 64) loadMoreYouTubeResults();
}

async function runYouTubeSearch() {
  const query = ytSearchInput.value.trim();
  if (!query) {
    ytSearchState.query = "";
    setSearchResultsIdle();
    return;
  }

  ytSearchState.query = query;
  ytSearchState.items = [];
  ytSearchState.hasMore = false;
  ytSearchState.continuation = null;
  ytSearchState.loadingMore = false;

  ytSearchResults.classList.add("is-loading");

  try {
    const data = await searchYouTube(query);
    ytSearchState.hasMore = !!data.hasMore;
    ytSearchState.continuation = data.continuation || null;
    await renderYouTubeResults(data.items || []);
  } catch (err) {
    if (err.name === "AbortError") return;
    ytSearchResults.classList.remove("is-loading", "is-populated");
    await setSearchResultsHtml(
      `<p class="yt-search-empty">${escapeHtml(err.message)} — chạy <code>npm start</code></p>`,
      { animate: true }
    );
  }
}

function scheduleYouTubeSearch() {
  clearTimeout(ytSearchTimer);
  ytSearchTimer = setTimeout(runYouTubeSearch, 400);
}

/* ========== MUSIC PLAYER HELPERS ========== */
function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${pad(s)}`;
}

function trackThumbnailUrl(track) {
  if (!track?.videoId) return "";
  return track.thumbnail || `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`;
}

function setVinylArt(track) {
  if (!vinylArt) return;
  if (!track?.videoId) {
    vinyl.classList.remove("has-art");
    vinylArt.classList.remove("is-swapping");
    vinylArt.removeAttribute("src");
    delete vinylArt.dataset.current;
    return;
  }

  const url = trackThumbnailUrl(track);
  if (vinylArt.dataset.current === url) {
    vinyl.classList.add("has-art");
    return;
  }

  vinylArt.classList.add("is-swapping");
  vinylArt.onload = () => {
    vinylArt.classList.remove("is-swapping");
    vinyl.classList.add("has-art");
  };
  vinylArt.onerror = () => {
    vinylArt.classList.remove("is-swapping");
    vinyl.classList.remove("has-art");
  };
  vinylArt.alt = track.name || "Ảnh bài hát";
  vinylArt.src = url;
  vinylArt.dataset.current = url;
}

function updateVinyl() {
  vinyl.classList.toggle("spinning", state.isPlaying);
  if (vinylWrap) vinylWrap.classList.toggle("is-playing", state.isPlaying);
}

function applyVolume() {
  $("#volumeSlider").value = state.volume;
  setIcon($("#muteBtn"), state.muted || state.volume === 0 ? "volume-x" : "volume-2");
  syncYtVolume();
  saveStorage();
}

function renderPlaylist() {
  playlistEl.innerHTML = "";
  if (!state.playlist.length) {
    playlistEl.innerHTML = '<p class="playlist-empty">Playlist trống — tìm nhạc YouTube ở trên</p>';
    return;
  }
  state.playlist.forEach((track, i) => {
    const div = document.createElement("div");
    div.className = "playlist-item" + (i === state.currentTrack ? " active" : "");
    div.innerHTML = `<span>${i + 1}. ${track.name}</span><span class="remove-track" data-i="${i}">${icon("x")}</span>`;
    div.addEventListener("click", (e) => {
      const removeBtn = e.target.closest(".remove-track");
      if (removeBtn) {
        removeTrack(parseInt(removeBtn.dataset.i, 10));
        return;
      }
      playTrack(i);
    });
    playlistEl.appendChild(div);
  });
  refreshIcons();
}

function removeTrack(index) {
  const wasCurrent = index === state.currentTrack;
  state.playlist.splice(index, 1);
  saveStorage();
  if (state.currentTrack > index) state.currentTrack--;
  else if (wasCurrent) {
    state.currentTrack = -1;
    if (ytPlayer?.stopVideo) ytPlayer.stopVideo();
    stopYtProgressPoll();
    state.isPlaying = false;
    setTrackDisplay("Chưa có bài hát", "", false);
    setVinylArt(null);
    updateVinyl();
    setIcon($("#musicPlay"), "play");
  }
  renderPlaylist();
}

function setTrackDisplay(title, meta, isError) {
  trackTitle.textContent = title;
  trackTitle.classList.toggle("is-error", !!isError);
  if (trackMeta) trackMeta.textContent = meta || "";
}

async function loadTrack(index, autoplay) {
  if (index < 0 || index >= state.playlist.length) return;
  ytPendingAutoplay = !!autoplay;
  state.currentTrack = index;
  const track = state.playlist[index];
  setTrackDisplay("Đang tải...", track.author, false);
  setVinylArt(track);
  renderPlaylist();

  try {
    await loadYoutubeApi();
  } catch {
    setTrackDisplay("Không tải được player", "Kiểm tra mạng", true);
    return;
  }

  setTrackDisplay(track.name || "YouTube", track.author, false);

  const mountOrLoad = () => {
    if (!ytPlayer) {
      ytPlayer = new window.YT.Player("yt-player", {
        height: "1",
        width: "1",
        videoId: track.videoId,
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1
        },
        events: {
          onReady: (e) => {
            syncYtVolume();
            const dur = e.target.getDuration();
            if (dur) timeTotal.textContent = formatTime(dur);
            if (autoplay) {
              ytPendingAutoplay = false;
              e.target.playVideo();
            }
          },
          onStateChange: onYtStateChange,
          onError: (e) => {
            setTrackDisplay("Không phát được", `Lỗi YouTube #${e.data}`, true);
          }
        }
      });
    } else {
      ytPlayer.loadVideoById({ videoId: track.videoId, startSeconds: 0 });
      syncYtVolume();
      if (autoplay) {
        try {
          ytPlayer.playVideo();
        } catch {
          /* chờ onStateChange CUED */
        }
      } else {
        ytPendingAutoplay = false;
      }
    }
  };

  mountOrLoad();
}

function playTrack(index) {
  loadTrack(index, true);
}

function getNextIndex() {
  const len = state.playlist.length;
  if (!len) return -1;
  if (state.musicShuffle) {
    if (len === 1) return 0;
    let idx;
    do { idx = Math.floor(Math.random() * len); } while (idx === state.currentTrack);
    return idx;
  }
  return (state.currentTrack + 1) % len;
}

function getPrevIndex() {
  const len = state.playlist.length;
  if (!len) return -1;
  if (state.musicShuffle) return getNextIndex();
  return (state.currentTrack - 1 + len) % len;
}

function musicPlayPause() {
  if (!state.playlist.length) return;
  if (state.currentTrack < 0) {
    playTrack(0);
    return;
  }
  if (!ytPlayer) return;
  const st = ytPlayer.getPlayerState();
  if (st === window.YT.PlayerState.PLAYING) ytPlayer.pauseVideo();
  else ytPlayer.playVideo();
}

function updateRepeatIcon() {
  const btn = $("#musicRepeat");
  const iconName = state.repeatMode === "one" ? "repeat-1" : "repeat";
  setIcon(btn, iconName);
  btn.classList.toggle("active-mode", state.repeatMode !== "off");
  btn.title = `Repeat: ${state.repeatMode}`;
}

function cycleRepeat() {
  const modes = ["off", "one", "all"];
  const i = modes.indexOf(state.repeatMode);
  state.repeatMode = modes[(i + 1) % modes.length];
  updateRepeatIcon();
}

function seekFromEvent(e) {
  if (!ytPlayer?.getDuration) return;
  const rect = progressWrap.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const dur = ytPlayer.getDuration();
  if (dur > 0) {
    ytPlayer.seekTo(ratio * dur, true);
    progressFill.style.width = ratio * 100 + "%";
    timeCurrent.textContent = formatTime(ratio * dur);
  }
}

/* ========== POMODORO ========== */
const POMO_MAX_SECONDS = 99 * 86400 + 23 * 3600 + 59 * 60;
const pomoDays = $("#pomoDays");
const pomoHours = $("#pomoHours");
const pomoMinutes = $("#pomoMinutes");

function pomoClampInt(value, min, max) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function splitSecondsToDHM(total) {
  const sec = Math.max(0, Math.floor(total));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return { d, h, m };
}

function dhmToSeconds(d, h, m) {
  return d * 86400 + h * 3600 + m * 60;
}

function migratePomoState() {
  delete state.pomo.breakDuration;
  delete state.pomo.mode;
}

function clampPomoState() {
  migratePomoState();
  state.pomo.workDuration = Math.max(60, Math.min(POMO_MAX_SECONDS, state.pomo.workDuration || 25 * 60));
  if (!state.pomo.running) {
    state.pomo.secondsLeft = Math.min(state.pomo.secondsLeft, state.pomo.workDuration);
  }
  state.pomo.secondsLeft = Math.max(0, state.pomo.secondsLeft || 0);
}

function syncPomoInputsFromState() {
  if (!pomoDays || !pomoHours || !pomoMinutes) return;
  const { d, h, m } = splitSecondsToDHM(state.pomo.workDuration);
  pomoDays.value = d;
  pomoHours.value = h;
  pomoMinutes.value = m;
}

function setPomoInputsDisabled(disabled) {
  if (pomoDays) pomoDays.disabled = disabled;
  if (pomoHours) pomoHours.disabled = disabled;
  if (pomoMinutes) pomoMinutes.disabled = disabled;
}

function readPomoDurationFromInputs() {
  if (!pomoDays || !pomoHours || !pomoMinutes) return state.pomo.workDuration;
  const d = pomoClampInt(pomoDays.value, 0, 99);
  const h = pomoClampInt(pomoHours.value, 0, 23);
  const m = pomoClampInt(pomoMinutes.value, 0, 59);
  let total = dhmToSeconds(d, h, m);
  if (total < 60) total = 25 * 60;
  return Math.min(POMO_MAX_SECONDS, total);
}

function applyPomoSettings() {
  if (!pomoDays || !pomoHours || !pomoMinutes) return;
  state.pomo.workDuration = readPomoDurationFromInputs();
  syncPomoInputsFromState();
  if (!state.pomo.running) {
    state.pomo.secondsLeft = state.pomo.workDuration;
    updatePomoDisplay();
  }
  saveStorage();
}

function formatPomoCountdown(sec) {
  const total = Math.max(0, Math.floor(sec));
  const { d, h, m } = splitSecondsToDHM(total);
  const s = total % 60;
  if (d > 0) return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

function updatePomoDisplay() {
  const el = $("#pomoDisplay");
  if (el) el.textContent = formatPomoCountdown(state.pomo.secondsLeft);
}

function pomoReset() {
  state.pomo.running = false;
  state.pomo.secondsLeft = state.pomo.workDuration;
  updatePomoDisplay();
  saveStorage();
}

function pomoTick() {
  if (!state.pomo.running) return;
  if (state.pomo.secondsLeft <= 0) {
    state.pomo.running = false;
    state.pomo.secondsLeft = 0;
    setPomoInputsDisabled(false);
  } else {
    state.pomo.secondsLeft--;
  }
  updatePomoDisplay();
  saveStorage();
}

/* ========== EVENT LISTENERS ========== */
function bindEvents() {
  document.querySelectorAll(".dock-btn[data-modal]").forEach((btn) => {
    btn.addEventListener("click", () => openWidgetModal(btn.dataset.modal, btn));
  });
  modalBackdrop.addEventListener("click", closeWidgetModals);
  document.querySelectorAll(".modal-close").forEach((btn) => {
    btn.addEventListener("click", closeWidgetModals);
  });

  $("#bgPrev").addEventListener("click", bgPrev);
  $("#bgNext").addEventListener("click", bgNext);
  $("#bgShuffle").addEventListener("click", bgShuffle);
  $("#themeToggle").addEventListener("click", toggleTheme);
  $("#galleryOpen").addEventListener("click", openGallery);
  $("#galleryClose").addEventListener("click", closeGallery);
  $("#galleryBackdrop").addEventListener("click", closeGallery);
  galleryApply?.addEventListener("click", applyGalleryPick);
  galleryPrev?.addEventListener("click", () => galleryStep(-1));
  galleryNext?.addEventListener("click", () => galleryStep(1));
  galleryRandom?.addEventListener("click", galleryPickRandom);
  galleryJumpBtn?.addEventListener("click", galleryJumpFromInput);
  gallerySearch?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      galleryJumpFromInput();
    }
  });
  document.addEventListener("keydown", onGalleryKeydown);
  bindGallerySwipe();

  ytSearchBtn.addEventListener("click", runYouTubeSearch);
  getSearchResultsBody().addEventListener("scroll", onYouTubeResultsScroll, { passive: true });
  ytSearchInput.addEventListener("input", scheduleYouTubeSearch);
  ytSearchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      clearTimeout(ytSearchTimer);
      runYouTubeSearch();
    }
  });

  $("#musicPlay").addEventListener("click", musicPlayPause);
  $("#musicPrev").addEventListener("click", () => {
    if (state.playlist.length) loadTrack(getPrevIndex(), true);
  });
  $("#musicNext").addEventListener("click", () => {
    if (state.playlist.length) loadTrack(getNextIndex(), true);
  });
  $("#musicShuffle").addEventListener("click", () => {
    state.musicShuffle = !state.musicShuffle;
    $("#musicShuffle").classList.toggle("active-mode", state.musicShuffle);
  });
  $("#musicRepeat").addEventListener("click", cycleRepeat);

  progressWrap.addEventListener("mousedown", (e) => {
    state.isDraggingProgress = true;
    seekFromEvent(e);
  });
  document.addEventListener("mousemove", (e) => {
    if (state.isDraggingProgress) seekFromEvent(e);
  });
  document.addEventListener("mouseup", () => { state.isDraggingProgress = false; });

  $("#volumeSlider").addEventListener("input", (e) => {
    state.volume = parseFloat(e.target.value);
    state.muted = false;
    applyVolume();
  });
  $("#muteBtn").addEventListener("click", () => {
    state.muted = !state.muted;
    applyVolume();
  });

  [pomoDays, pomoHours, pomoMinutes].forEach((input) => {
    input?.addEventListener("change", applyPomoSettings);
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") applyPomoSettings();
    });
  });

  $("#pomoStart").addEventListener("click", () => {
    applyPomoSettings();
    state.pomo.running = true;
    setPomoInputsDisabled(true);
    saveStorage();
  });
  $("#pomoPause").addEventListener("click", () => {
    state.pomo.running = false;
    setPomoInputsDisabled(false);
    saveStorage();
  });
  $("#pomoReset").addEventListener("click", () => {
    pomoReset();
    setPomoInputsDisabled(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllOverlays();
  });
}

/* ========== INIT ========== */
async function loadCloudinaryIds() {
  const res = await fetch("js/cloudinary-ids.json");
  if (!res.ok) throw new Error("Không tải được cloudinary-ids.json");
  const ids = await res.json();
  if (!Array.isArray(ids) || ids.length === 0) throw new Error("cloudinary-ids.json trống");
  setCloudinaryPublicIds(ids);
}

async function checkMusicServer() {
  if (location.protocol === "file:") return false;
  try {
    const res = await fetch("/api/health");
    return res.ok;
  } catch {
    return false;
  }
}

async function init() {
  try {
    await loadCloudinaryIds();
  } catch (err) {
    console.error(err);
    bgLabel.textContent = "Lỗi tải ảnh Cloudinary";
    return;
  }

  await checkMusicServer();
  loadYoutubeApi().catch(() => {});

  loadStorage();
  applyTheme();
  applyVolume();

  bgStackA.classList.add("active");
  bgStackB.classList.remove("active");
  state.bgLayerA = true;
  clearBgInlineStyles(bgA);
  clearBgInlineStyles(bgB);
  setBackground(state.bgIndex, true);

  updateClock();
  setInterval(updateClock, 1000);

  clampPomoState();
  syncPomoInputsFromState();
  setPomoInputsDisabled(state.pomo.running);
  updatePomoDisplay();
  setInterval(pomoTick, 1000);

  renderPlaylist();
  updateRepeatIcon();
  refreshIcons();
  bindEvents();

  syncMobileOrientation();
  mobilePortraitMq.addEventListener("change", syncMobileOrientation);
  window.addEventListener("orientationchange", syncMobileOrientation);

  let bgViewportMobile = isMobileBgViewport();
  window.addEventListener("resize", () => {
    const mobile = isMobileBgViewport();
    if (mobile === bgViewportMobile) return;
    bgViewportMobile = mobile;
    setBackground(state.bgIndex, true);
  });
}

init();
