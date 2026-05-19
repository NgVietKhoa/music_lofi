/* ========== TOAST NOTIFICATIONS ========== */
const TOAST_MAX = 2;
const TOAST_DEFAULT_MS = 2600;
const TOAST_RATE_WINDOW_MS = 1200;
const TOAST_RATE_MAX = 2;
const TOAST_KEY_COOLDOWN_MS = 1400;

const TOAST_ICONS = {
  info: "info",
  success: "circle-check",
  error: "circle-alert",
  warn: "triangle-alert"
};

let toastStackEl = null;
const toastTimers = new WeakMap();
const toastKeyLastAt = new Map();
let toastKeyGlobalLastAt = 0;
let toastRateWindowStart = 0;
let toastRateCount = 0;

function ensureToastStack() {
  if (toastStackEl) return toastStackEl;
  toastStackEl = document.getElementById("toastStack");
  if (!toastStackEl) {
    toastStackEl = document.createElement("div");
    toastStackEl.id = "toastStack";
    toastStackEl.className = "toast-stack";
    toastStackEl.setAttribute("aria-live", "polite");
    toastStackEl.setAttribute("aria-relevant", "additions");
    document.body.appendChild(toastStackEl);
  }
  return toastStackEl;
}

function findToastByMessage(stack, message) {
  return [...stack.children].find((el) => el.dataset.toastMessage === message);
}

function clearToastTimer(el) {
  if (toastTimers.has(el)) {
    clearTimeout(toastTimers.get(el));
    toastTimers.delete(el);
  }
}

function removeToastImmediate(el) {
  if (!el?.isConnected) return;
  clearToastTimer(el);
  el.remove();
}

function dismissToast(el, immediate = false) {
  if (!el?.isConnected) return;
  clearToastTimer(el);
  if (immediate) {
    el.remove();
    return;
  }
  el.classList.add("toast--out");
  const done = () => el.remove();
  el.addEventListener("transitionend", done, { once: true });
  setTimeout(done, 320);
}

function scheduleToastDismiss(el, durationMs) {
  clearToastTimer(el);
  toastTimers.set(
    el,
    setTimeout(() => dismissToast(el), durationMs)
  );
}

function trimToastStack(stack) {
  while (stack.children.length > TOAST_MAX) {
    removeToastImmediate(stack.lastElementChild);
  }
}

function allowToastRate() {
  const now = Date.now();
  if (now - toastRateWindowStart > TOAST_RATE_WINDOW_MS) {
    toastRateWindowStart = now;
    toastRateCount = 0;
  }
  if (toastRateCount >= TOAST_RATE_MAX) return false;
  toastRateCount += 1;
  return true;
}

function mountToast(message, type, durationMs) {
  const stack = ensureToastStack();
  const iconName = TOAST_ICONS[type] || TOAST_ICONS.info;

  const el = document.createElement("div");
  el.className = `toast toast--${type}`;
  el.dataset.toastMessage = message;
  el.setAttribute("role", "status");
  el.innerHTML = `
    <span class="toast-icon" aria-hidden="true"><i data-lucide="${iconName}"></i></span>
    <span class="toast-message"></span>
    <button type="button" class="toast-close">×</button>
  `;
  el.querySelector(".toast-message").textContent = message;
  const closeBtn = el.querySelector(".toast-close");
  closeBtn.setAttribute("aria-label", typeof t === "function" ? t("common.close") : "Close");
  closeBtn.addEventListener("click", () => dismissToast(el));

  stack.prepend(el);
  trimToastStack(stack);

  requestAnimationFrame(() => {
    el.classList.add("toast--visible");
    if (window.lucide) {
      lucide.createIcons({ nodes: [el.querySelector(".toast-icon")], attrs: { "stroke-width": 1.75 } });
    }
  });

  scheduleToastDismiss(el, durationMs);
  return el;
}

/**
 * @param {string} message
 * @param {"info"|"success"|"error"|"warn"} [type]
 * @param {number} [durationMs]
 */
function showToast(message, type = "info", durationMs = TOAST_DEFAULT_MS) {
  if (!message) return;

  const stack = ensureToastStack();
  const existing = findToastByMessage(stack, message);
  if (existing) {
    existing.classList.remove("toast--out");
    existing.classList.add("toast--visible");
    stack.prepend(existing);
    scheduleToastDismiss(existing, durationMs);
    return;
  }

  if (!allowToastRate()) return;

  mountToast(message, type, durationMs);
}

/** i18n key + optional vars; skips if same key shown too recently */
function toastKey(key, vars, type = "info", durationMs) {
  const now = Date.now();
  if (now - toastKeyGlobalLastAt < 900) return;
  const last = toastKeyLastAt.get(key) || 0;
  if (now - last < TOAST_KEY_COOLDOWN_MS) return;
  toastKeyLastAt.set(key, now);
  toastKeyGlobalLastAt = now;

  if (typeof t === "function") showToast(t(key, vars), type, durationMs);
  else showToast(key, type, durationMs);
}
