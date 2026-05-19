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
  lang: "vi",
  layout: {
    preset: "minimal",
    custom: { modalClock: null, modalMusic: null, modalPomo: null }
  },
  bgIndex: 0,
  bgLayerA: true,
  theme: "day",
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
let pendingBgToast = false;
let uiRefreshTimer = null;
const modalBackdrop = $("#modalBackdrop");

/** Cache URL đã tải — preload bằng Image() để chuyển nền không khựng */
const bgUrlReady = new Set();
const bgImageCache = new Map();
const BG_CACHE_MAX = 20;

function trimBgCache() {
  while (bgImageCache.size > BG_CACHE_MAX) {
    const oldest = bgImageCache.keys().next().value;
    bgImageCache.delete(oldest);
    bgUrlReady.delete(oldest);
  }
}

function preloadBgUrl(url) {
  if (!url) return Promise.resolve();
  if (bgUrlReady.has(url)) return Promise.resolve();
  let pending = bgImageCache.get(url);
  if (pending) return pending;
  pending = new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      bgUrlReady.add(url);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
  bgImageCache.set(url, pending);
  trimBgCache();
  return pending;
}

function preloadBgIndex(index) {
  const count = getBackgroundCount();
  if (!count) return;
  index = ((index % count) + count) % count;
  preloadBgUrl(bgPath(index));
  preloadBgUrl(bgFillPath(index));
  preloadBgUrl(thumbPath(index));
}

function preloadBgNeighbors(index) {
  const count = getBackgroundCount();
  if (count <= 1) return;
  preloadBgIndex((index + 1) % count);
  preloadBgIndex((index - 1 + count) % count);
}

/* ========== LOCAL STORAGE ========== */
function loadStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (typeof data.bgIndex === "number" && data.bgIndex >= 0 && data.bgIndex < getBackgroundCount()) {
      state.bgIndex = data.bgIndex;
    }
    if (data.lang === "vi" || data.lang === "en") state.lang = data.lang;
    if (data.theme === "day" || data.theme === "night") state.theme = data.theme;
    if (data.pomo) {
      Object.assign(state.pomo, data.pomo);
      clampPomoState();
    }
    if (Array.isArray(data.playlist)) {
      state.playlist = data.playlist.filter((t) => t && t.videoId);
    }
    if (typeof loadLayoutFromStorage === "function") loadLayoutFromStorage(data);
  } catch (_) { /* ignore corrupt storage */ }
}

function saveStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    lang: state.lang,
    layout: typeof layoutStoragePayload === "function" ? layoutStoragePayload() : state.layout,
    bgIndex: state.bgIndex,
    theme: state.theme,
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

function bgFillPath(index) {
  return cloudinaryBgFillUrl(index);
}

function thumbPath(index) {
  return cloudinaryThumbUrl(index);
}

function updateBgLabel() {
  bgLabel.textContent = t("scene.bgCount", {
    current: state.bgIndex + 1,
    total: getBackgroundCount()
  });
}

function clearBgInlineStyles(img) {
  if (!img) return;
  img.style.width = "";
  img.style.height = "";
  img.style.transform = "";
}

function applyBgToStack(main, fill, mainSrc, fillSrc) {
  clearBgInlineStyles(main);
  main.src = mainSrc;
  if (fill) fill.src = fillSrc || mainSrc;
}

async function paintBgStack(main, fill, mainSrc, fillSrc) {
  applyBgToStack(main, fill, mainSrc, fillSrc);
  if (main.decode) {
    try {
      await main.decode();
    } catch (_) { /* ignore */ }
  }
}

function setBackground(index, skipFade) {
  const count = getBackgroundCount();
  index = ((index % count) + count) % count;
  state.bgIndex = index;

  const fullSrc = bgPath(index);
  const fillSrc = bgFillPath(index);
  const thumbSrc = thumbPath(index);
  const showA = state.bgLayerA;
  const incomingStack = showA ? bgStackB : bgStackA;
  const outgoingStack = showA ? bgStackA : bgStackB;
  const incomingMain = showA ? bgB : bgA;
  const incomingFill = showA ? bgBFill : bgAFill;
  const token = ++bgTransitionToken;

  incomingMain.alt = t("scene.bgAlt", { n: index + 1 });

  const commitTransition = () => {
    if (token !== bgTransitionToken) return;
    incomingStack.classList.add("active");
    outgoingStack.classList.remove("active");
    state.bgLayerA = !showA;
    updateBgLabel();
    saveStorage();
  };

  const upgradeToFull = async () => {
    if (token !== bgTransitionToken) return;
    if (incomingMain.getAttribute("src") === fullSrc) return;
    await preloadBgUrl(fullSrc);
    if (token !== bgTransitionToken) return;
    await paintBgStack(incomingMain, incomingFill, fullSrc, fillSrc);
  };

  const finishSwitch = () => {
    commitTransition();
    preloadBgNeighbors(index);
    if (pendingBgToast) {
      pendingBgToast = false;
      toastKey("toast.wallpaper", {
        current: state.bgIndex + 1,
        total: getBackgroundCount()
      }, "success");
    }
  };

  const runFade = async () => {
    if (bgUrlReady.has(fullSrc)) {
      await paintBgStack(incomingMain, incomingFill, fullSrc, fillSrc);
      if (token !== bgTransitionToken) return;
      finishSwitch();
      return;
    }

    const fullPreload = preloadBgUrl(fullSrc);
    await preloadBgUrl(thumbSrc);
    if (token !== bgTransitionToken) return;

    if (bgUrlReady.has(fullSrc)) {
      await paintBgStack(incomingMain, incomingFill, fullSrc, fillSrc);
    } else {
      await paintBgStack(incomingMain, incomingFill, thumbSrc, thumbSrc);
    }
    if (token !== bgTransitionToken) return;
    finishSwitch();

    await fullPreload;
    upgradeToFull();
  };

  if (skipFade) {
    applyBgToStack(incomingMain, incomingFill, fullSrc, fillSrc);
    commitTransition();
    preloadBgNeighbors(index);
    preloadBgUrl(fullSrc);
    preloadBgUrl(fillSrc);
    if (pendingBgToast) {
      pendingBgToast = false;
      toastKey("toast.wallpaper", {
        current: state.bgIndex + 1,
        total: getBackgroundCount()
      }, "success");
    }
    return;
  }

  runFade();
}

function bgNext() {
  pendingBgToast = true;
  setBackground(state.bgIndex + 1);
}
function bgPrev() {
  pendingBgToast = true;
  setBackground(state.bgIndex - 1);
}
function bgShuffle() {
  let next;
  const count = getBackgroundCount();
  do { next = Math.floor(Math.random() * count); }
  while (next === state.bgIndex && count > 1);
  pendingBgToast = true;
  setBackground(next);
}

/* ========== THEME DAY / NIGHT ========== */
function applyTheme() {
  document.body.classList.toggle("night", state.theme === "night");
  setIcon($("#themeToggle"), state.theme === "night" ? "moon" : "sun");
  $("#themeToggle").title = state.theme === "night" ? t("theme.night") : t("theme.day");
  saveStorage();
}

/* ========== MOBILE (see js/mobile.js) ========== */
function syncMobileOrientation() {
  syncMobileBodyClasses?.();
  if (typeof applyLayout === "function") applyLayout();
}

/* ========== WIDGET MODALS ========== */
function openWidgetModal(modalId, dockBtn) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  if (
    modalId === "modalLayout" &&
    typeof isMobileViewport === "function" &&
    isMobileViewport()
  ) {
    return;
  }

  if (modal.classList.contains("layout-pinned")) {
    if (modal.classList.contains("layout-expanded")) {
      collapseLayoutExpanded?.();
      return;
    }
    document.querySelectorAll(".widget-modal").forEach((m) => {
      if (m !== modal) {
        m.classList.remove("open", "layout-expanded");
        if (!m.classList.contains("layout-pinned")) m.setAttribute("hidden", "");
      }
    });
    activeWidgetModal = modalId;
    modal.classList.add("open", "layout-expanded");
    modal.removeAttribute("hidden");
    modalBackdrop.classList.add("open");
    modalBackdrop.setAttribute("aria-hidden", "false");
    document.querySelectorAll(".dock-btn[data-modal]").forEach((b) => b.classList.remove("active"));
    dockBtn?.classList.add("active");
    return;
  }

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
  setMobileModalLock?.(true);
  document.querySelectorAll(".dock-btn[data-modal]").forEach((b) => b.classList.remove("active"));
  dockBtn?.classList.add("active");
  if (modalId === "modalLayout" && typeof renderLayoutPicker === "function") renderLayoutPicker();
}

function closeWidgetModals() {
  activeWidgetModal = null;
  modalBackdrop.classList.remove("open");
  modalBackdrop.setAttribute("aria-hidden", "true");
  setMobileModalLock?.(false);
  document.querySelectorAll(".widget-modal").forEach((m) => {
    m.classList.remove("open", "layout-expanded");
    if (!m.classList.contains("layout-pinned")) {
      m.setAttribute("hidden", "");
    }
  });
  document.querySelectorAll(".dock-btn[data-modal]").forEach((b) => b.classList.remove("active"));
}

function closeAllOverlays() {
  closeGallery();
  closeWidgetModals();
}

function scheduleUiRefresh() {
  clearTimeout(uiRefreshTimer);
  uiRefreshTimer = setTimeout(() => {
    uiRefreshTimer = null;
    refreshUiOnLangChange();
  }, 160);
}

function toggleTheme() {
  state.theme = state.theme === "day" ? "night" : "day";
  applyTheme();
  scheduleUiRefresh();
  toastKey(state.theme === "night" ? "toast.themeNight" : "toast.themeDay", null, "info");
}

function switchLanguage() {
  state.lang = toggleLang();
  saveStorage();
  scheduleUiRefresh();
  toastKey(state.lang === "vi" ? "toast.langVi" : "toast.langEn", null, "info");
}

function refreshUiOnLangChange() {
  updateBgLabel();
  applyTheme();
  updateRepeatIcon();
  updateClock();
  renderPlaylist();
  if (state.currentTrack < 0) {
    setTrackDisplay(t("music.noTrack"), "", false);
  }
  if (!ytSearchState.query) {
    setSearchResultsIdle();
  } else if (ytSearchState.items.length) {
    const body = getSearchResultsBody();
    body.querySelector(".yt-search-loading-more, .yt-search-hint, .yt-search-hint--end")?.remove();
    body.insertAdjacentHTML("beforeend", youtubeResultsFooterHtml());
  }
  refreshIcons();
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

  const thumb = thumbPath(index);
  const full = bgPath(index);
  preloadBgUrl(full);

  const showThumb = () => {
    if (galleryPickIndex !== index) return;
    if (galleryPreviewImg) {
      galleryPreviewImg.classList.remove("is-switching");
      galleryPreviewImg.src = thumb;
      galleryPreviewImg.alt = t("scene.bgAlt", { n: index + 1 });
    }
    if (galleryPreviewFill) galleryPreviewFill.src = thumb;
  };

  if (galleryPreviewImg) {
    galleryPreviewImg.classList.add("is-switching");
    preloadBgUrl(thumb).then(showThumb);
  }
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
  const count = getBackgroundCount();
  if (!Number.isFinite(num) || num < 1 || num > count) {
    toastKey("toast.galleryInvalid", null, "warn");
    return;
  }
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
  pendingBgToast = true;
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
  $("#galleryPanel").removeAttribute("hidden");
  $("#galleryBackdrop").classList.add("open");
  $("#galleryPanel").classList.add("open");
  setMobileModalLock?.(true);
  gallerySearch.value = "";
  updateGalleryPreview(state.bgIndex);
  refreshIcons();
}

function closeGallery() {
  $("#galleryBackdrop").classList.remove("open");
  $("#galleryPanel").classList.remove("open");
  $("#galleryPanel").setAttribute("hidden", "");
  if (!activeWidgetModal) setMobileModalLock?.(false);
}


/* ========== CLOCK ========== */
function pad(n) { return String(n).padStart(2, "0"); }

function updateClock() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();

  $("#clockDigital").textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
  $("#clockDate").textContent = now.toLocaleDateString(getLocale(), {
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
  if (!ytPlayer?.unMute) return;
  ytPlayer.unMute();
  if (ytPlayer.setVolume) ytPlayer.setVolume(100);
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
  toastKey("toast.trackAdded", null, "success");
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
    throw new Error(t("errors.noServer"));
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || t("music.searchFailed"));
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
  if (ytSearchState.loadingMore) return `<p class="yt-search-loading-more">${t("music.loadingMore")}</p>`;
  if (ytSearchState.hasMore) return `<p class="yt-search-hint">${t("music.scrollMore")}</p>`;
  if (ytSearchState.items.length) return `<p class="yt-search-hint yt-search-hint--end">${t("music.noMoreResults")}</p>`;
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
  setSearchResultsHtml(`<p class="yt-search-idle">${t("music.searchIdle")}</p>`);
}

async function renderYouTubeResults(items, { append = false } = {}) {
  ytSearchResults.classList.remove("is-loading");
  bindYouTubeResultClicks();
  const body = getSearchResultsBody();

  if (!append) {
    ytSearchState.items = items;
    if (!items.length) {
      await setSearchResultsHtml(`<p class="yt-search-empty">${t("music.noResults")}</p>`, { animate: true });
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
  if (footer) footer.textContent = t("music.loadingMore");
  else body.insertAdjacentHTML("beforeend", `<p class="yt-search-loading-more">${t("music.loadingMore")}</p>`);

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
    const errHtml = `<p class="yt-search-empty">${escapeHtml(err.message)} — ${t("music.npmHint")}</p>`;
    await setSearchResultsHtml(errHtml, { animate: true });
    showToast(err.message, "error", 4000);
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
  vinylArt.alt = track.name || t("music.trackArtAlt");
  vinylArt.src = url;
  vinylArt.dataset.current = url;
}

function updateVinyl() {
  vinyl.classList.toggle("spinning", state.isPlaying);
  if (vinylWrap) vinylWrap.classList.toggle("is-playing", state.isPlaying);
}

function renderPlaylist() {
  playlistEl.innerHTML = "";
  if (!state.playlist.length) {
    playlistEl.innerHTML = `<p class="playlist-empty">${t("music.playlistEmpty")}</p>`;
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
    setTrackDisplay(t("music.noTrack"), "", false);
    setVinylArt(null);
    updateVinyl();
    setIcon($("#musicPlay"), "play");
  }
  renderPlaylist();
  toastKey("toast.trackRemoved", null, "info");
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
  setTrackDisplay(t("music.loading"), track.author, false);
  setVinylArt(track);
  renderPlaylist();

  try {
    await loadYoutubeApi();
  } catch {
    setTrackDisplay(t("music.playerLoadFailed"), t("music.checkNetwork"), true);
    showToast(t("music.playerLoadFailed"), "error", 4000);
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
            const errMsg = t("music.youtubeError", { code: e.data });
            setTrackDisplay(t("music.playFailed"), errMsg, true);
            showToast(t("music.playFailed"), "error", 4000);
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
  if (!state.playlist.length) {
    toastKey("toast.noPlaylist", null, "warn");
    return;
  }
  if (state.currentTrack < 0) {
    playTrack(0);
    return;
  }
  if (!ytPlayer) return;
  const st = ytPlayer.getPlayerState();
  if (st === window.YT.PlayerState.PLAYING) ytPlayer.pauseVideo();
  else ytPlayer.playVideo();
}

function getRepeatLabel(mode) {
  const keys = { off: "music.repeatOff", one: "music.repeatOne", all: "music.repeatAll" };
  return t(keys[mode] || keys.off);
}

function updateRepeatIcon() {
  const btn = $("#musicRepeat");
  const iconName = state.repeatMode === "one" ? "repeat-1" : "repeat";
  setIcon(btn, iconName);
  btn.classList.toggle("active-mode", state.repeatMode !== "off");
  btn.title = t("music.repeatTitle", { mode: getRepeatLabel(state.repeatMode) });
}

function cycleRepeat() {
  const modes = ["off", "one", "all"];
  const i = modes.indexOf(state.repeatMode);
  state.repeatMode = modes[(i + 1) % modes.length];
  updateRepeatIcon();
  toastKey("toast.repeat", { mode: getRepeatLabel(state.repeatMode) }, "info");
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
    toastKey("toast.pomoDone", null, "success", 4500);
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
    btn.addEventListener("click", () => {
      const modal = btn.closest(".widget-modal");
      if (modal?.classList.contains("layout-pinned") && modal.classList.contains("layout-expanded")) {
        collapseLayoutExpanded?.();
        return;
      }
      closeWidgetModals();
    });
  });

  $("#bgPrev").addEventListener("click", bgPrev);
  $("#bgNext").addEventListener("click", bgNext);
  $("#bgShuffle").addEventListener("click", bgShuffle);
  $("#themeToggle").addEventListener("click", toggleTheme);
  $("#langToggle").addEventListener("click", switchLanguage);
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
    toastKey(state.musicShuffle ? "toast.shuffleOn" : "toast.shuffleOff", null, "info");
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
    toastKey("toast.pomoStarted", null, "success");
  });
  $("#pomoPause").addEventListener("click", () => {
    state.pomo.running = false;
    setPomoInputsDisabled(false);
    saveStorage();
    toastKey("toast.pomoPaused", null, "info");
  });
  $("#pomoReset").addEventListener("click", () => {
    pomoReset();
    setPomoInputsDisabled(false);
    toastKey("toast.pomoReset", null, "info");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (document.querySelector(".widget-modal.layout-expanded")) {
      collapseLayoutExpanded?.();
      return;
    }
    closeAllOverlays();
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

const APP_LOADING_MIN_MS = 400;

function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForActiveBgPaint() {
  const main = state.bgLayerA ? bgA : bgB;
  const fill = state.bgLayerA ? bgAFill : bgBFill;
  if (!main?.src) return;
  await paintBgStack(main, fill, main.src, fill?.src || main.src);
}

async function hideAppLoading() {
  const el = document.getElementById("appLoading");
  document.body.classList.remove("is-app-loading");
  if (!el) return;
  el.classList.add("is-hiding");
  el.setAttribute("aria-busy", "false");
  await waitMs(460);
  el.remove();
}

async function init() {
  const loadingStarted = performance.now();

  try {
    await loadCloudinaryIds();
  } catch (err) {
    console.error(err);
    bgLabel.textContent = t("errors.cloudinary");
    showToast(t("errors.cloudinary"), "error", 5000);
    return;
  }

  await checkMusicServer();
  loadYoutubeApi().catch(() => {});

  loadStorage();
  initI18n(state.lang);
  if (typeof initLayoutFromStorage === "function") initLayoutFromStorage();
  if (typeof bindLayoutApplyCustom === "function") bindLayoutApplyCustom();
  applyTheme();
  syncYtVolume();

  bgStackA.classList.add("active");
  bgStackB.classList.remove("active");
  state.bgLayerA = true;
  clearBgInlineStyles(bgA);
  clearBgInlineStyles(bgB);
  await preloadBgUrl(bgPath(state.bgIndex));
  await preloadBgUrl(bgFillPath(state.bgIndex));
  setBackground(state.bgIndex, true);
  await waitForActiveBgPaint();
  preloadBgNeighbors(state.bgIndex);

  updateClock();
  setInterval(updateClock, 1000);

  clampPomoState();
  syncPomoInputsFromState();
  setPomoInputsDisabled(state.pomo.running);
  updatePomoDisplay();
  setInterval(pomoTick, 1000);

  renderPlaylist();
  updateRepeatIcon();
  if (state.currentTrack < 0) setTrackDisplay(t("music.noTrack"), "", false);
  refreshIcons();
  bindEvents();

  initMobile?.();
  syncMobileOrientation();
  window.addEventListener("orientationchange", syncMobileOrientation);

  let bgViewportMobile = isMobileBgViewport();
  window.addEventListener("resize", () => {
    const mobile = isMobileBgViewport();
    if (mobile === bgViewportMobile) return;
    bgViewportMobile = mobile;
    bgUrlReady.clear();
    bgImageCache.clear();
    setBackground(state.bgIndex, true);
    preloadBgNeighbors(state.bgIndex);
  });

  const elapsed = performance.now() - loadingStarted;
  if (elapsed < APP_LOADING_MIN_MS) await waitMs(APP_LOADING_MIN_MS - elapsed);
}

async function boot() {
  try {
    await init();
  } catch (err) {
    console.error(err);
  } finally {
    await hideAppLoading();
  }
}

boot();
