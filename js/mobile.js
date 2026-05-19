/* ========== MOBILE DETECTION & BODY CLASSES ========== */
const mobilePortraitMq = window.matchMedia("(max-width: 900px) and (orientation: portrait)");
const mobileLandscapeMq = window.matchMedia(
  "(max-width: 900px) and (orientation: landscape), (max-height: 520px) and (orientation: landscape)"
);
const compactMobileMq = window.matchMedia("(max-width: 900px)");

function isMobileViewport() {
  return compactMobileMq.matches;
}

function isMobilePortrait() {
  return mobilePortraitMq.matches;
}

function isMobileLandscape() {
  return mobileLandscapeMq.matches;
}

function syncMobileBodyClasses() {
  document.body.classList.toggle("is-mobile", isMobileViewport());
  document.body.classList.toggle("is-mobile-portrait", isMobilePortrait());
  document.body.classList.toggle("is-mobile-landscape", isMobileLandscape());
}

function setMobileModalLock(locked) {
  document.body.classList.toggle("modal-open-lock", !!locked);
}

let lastTouchEndAt = 0;

function initMobileZoomLock() {
  document.addEventListener(
    "touchend",
    (e) => {
      if (!isMobileViewport()) return;
      if (e.target.closest("input, textarea, select")) return;

      const now = Date.now();
      if (now - lastTouchEndAt < 320) {
        e.preventDefault();
      }
      lastTouchEndAt = now;
    },
    { passive: false }
  );

  document.addEventListener(
    "gesturestart",
    (e) => {
      if (isMobileViewport()) e.preventDefault();
    },
    { passive: false }
  );
}

function initMobile() {
  initMobileZoomLock();
  syncMobileBodyClasses();
  mobilePortraitMq.addEventListener("change", () => {
    syncMobileBodyClasses();
    if (typeof syncMobileOrientation === "function") syncMobileOrientation();
  });
  mobileLandscapeMq.addEventListener("change", syncMobileBodyClasses);
  compactMobileMq.addEventListener("change", () => {
    syncMobileBodyClasses();
    if (typeof applyLayout === "function") applyLayout();
  });
}
