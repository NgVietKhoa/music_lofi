/* ========== INTERNATIONALIZATION (vi / en) ========== */
const I18N_STRINGS = {
  vi: {
    "meta.pageTitle": "Lofi Thư Giãn — Nhạc và không gian làm việc",
    "loading.message": "Đang tải không gian...",
    "loading.sub": "Chờ một chút nhé",
    "rotate.title": "Xoay ngang màn hình",
    "rotate.text": "Lofi Thư Giãn được tối ưu cho chế độ ngang trên điện thoại.",
    "dock.tools": "Công cụ",
    "dock.scene": "Nền",
    "dock.clock": "Đồng hồ",
    "dock.music": "Nhạc",
    "dock.focus": "Tập trung",
    "dock.theme": "Ban ngày / Ban đêm",
    "dock.language": "English",
    "theme.day": "Ban ngày",
    "theme.night": "Ban đêm",
    "common.close": "Đóng",
    "scene.title": "Nền",
    "scene.bgPrev": "Ảnh trước",
    "scene.bgNext": "Ảnh sau",
    "scene.shuffle": "Ngẫu nhiên",
    "scene.bgCount": "Nền {current} / {total}",
    "scene.bgAlt": "Nền {n}",
    "scene.pickWallpaper": "Chọn nền",
    "clock.title": "Đồng hồ",
    "music.title": "Nhạc",
    "music.search": "Tìm kiếm",
    "music.searchPlaceholder": "Tìm trên YouTube...",
    "music.searchBtn": "Tìm",
    "music.searchIdle": "Nhập từ khóa để tìm",
    "music.nowPlaying": "Đang phát",
    "music.noTrack": "Chưa có bài hát",
    "music.playlist": "Danh sách phát",
    "music.playlistEmpty": "Danh sách phát trống — hãy tìm nhạc phía trên",
    "music.shuffle": "Trộn ngẫu nhiên",
    "music.prev": "Bài trước",
    "music.playPause": "Phát / Tạm dừng",
    "music.next": "Bài sau",
    "music.repeat": "Lặp lại",
    "music.repeatOff": "Tắt",
    "music.repeatOne": "Một bài",
    "music.repeatAll": "Tất cả",
    "music.repeatTitle": "Lặp lại: {mode}",
    "music.loading": "Đang tải...",
    "music.trackArtAlt": "Ảnh bài hát",
    "music.loadingMore": "Đang tải thêm...",
    "music.scrollMore": "Cuộn xuống để tải thêm",
    "music.noMoreResults": "Đã hết kết quả",
    "music.noResults": "Không có kết quả",
    "music.searchFailed": "Tìm kiếm thất bại",
    "music.playerLoadFailed": "Không tải được trình phát",
    "music.checkNetwork": "Kiểm tra mạng",
    "music.playFailed": "Không phát được",
    "music.youtubeError": "Lỗi YouTube #{code}",
    "music.npmHint": "chạy npm start",
    "pomo.title": "Bộ đếm tập trung",
    "pomo.workDuration": "Thời gian làm việc",
    "pomo.days": "Ngày",
    "pomo.hours": "Giờ",
    "pomo.minutes": "Phút",
    "pomo.start": "Bắt đầu",
    "pomo.pause": "Tạm dừng",
    "pomo.reset": "Đặt lại",
    "gallery.title": "Chọn nền",
    "gallery.numberPlaceholder": "Số",
    "gallery.go": "Đi",
    "gallery.random": "Ngẫu nhiên",
    "gallery.apply": "Chọn nền",
    "errors.noServer": "Không kết nối server — chạy: npm start",
    "errors.cloudinary": "Lỗi tải ảnh Cloudinary",
    "toast.themeDay": "Đã chuyển giao diện ban ngày",
    "toast.themeNight": "Đã chuyển giao diện ban đêm",
    "toast.langVi": "Đã chuyển sang tiếng Việt",
    "toast.langEn": "Đã chuyển sang tiếng Anh",
    "toast.wallpaper": "Đã đổi nền {current} / {total}",
    "toast.galleryInvalid": "Số nền không hợp lệ",
    "toast.pomoStarted": "Bắt đầu đếm thời gian tập trung",
    "toast.pomoPaused": "Đã tạm dừng bộ đếm",
    "toast.pomoReset": "Đã đặt lại bộ đếm",
    "toast.pomoDone": "Hết giờ tập trung — nghỉ ngơi nhé!",
    "toast.shuffleOn": "Đã bật trộn ngẫu nhiên",
    "toast.shuffleOff": "Đã tắt trộn ngẫu nhiên",
    "toast.repeat": "Lặp lại: {mode}",
    "toast.trackAdded": "Đã thêm vào danh sách phát",
    "toast.trackRemoved": "Đã xóa khỏi danh sách phát",
    "toast.noPlaylist": "Danh sách phát đang trống",
    "toast.layoutApplied": "Bố cục: {name}",
    "toast.layoutCustomSaved": "Đã lưu bố cục tùy chỉnh",
    "dock.layout": "Bố cục",
    "layout.title": "Bố cục không gian",
    "layout.presets": "Bố cục có sẵn",
    "layout.customTitle": "Tùy chỉnh widget",
    "layout.customHint": "Chọn widget ghim trên màn hình và vị trí",
    "layout.applyCustom": "Áp dụng",
    "layout.preset.minimal": "Tối giản",
    "layout.preset.focus": "Tập trung",
    "layout.preset.chill": "Thư giãn",
    "layout.preset.studio": "Studio",
    "layout.preset.custom": "Tùy chỉnh",
    "layout.presetDesc.minimal": "Chỉ dock — mở widget khi cần",
    "layout.presetDesc.focus": "Đồng hồ, nhạc (có tìm kiếm), Pomodoro ghim góc",
    "layout.presetDesc.chill": "Đồng hồ giữa trên, nhạc gọn phía dưới",
    "layout.presetDesc.studio": "Nhạc đủ tìm kiếm + playlist, đồng hồ & Pomodoro hai bên",
    "layout.presetDesc.custom": "Tự chọn widget và vị trí",
    "layout.widget.clock": "Đồng hồ",
    "layout.widget.music": "Nhạc",
    "layout.widget.pomo": "Pomodoro",
    "layout.slot.top-left": "Trên trái",
    "layout.slot.top-center": "Trên giữa",
    "layout.slot.top-right": "Trên phải",
    "layout.slot.bottom-left": "Dưới trái",
    "layout.slot.bottom-center": "Dưới giữa",
    "layout.slot.bottom-right": "Dưới phải",
    "layout.size.sm": "Nhỏ",
    "layout.size.md": "Vừa",
    "layout.size.lg": "Lớn"
  },
  en: {
    "meta.pageTitle": "Lofi Chill — Music & Workspace",
    "loading.message": "Loading your space...",
    "loading.sub": "Just a moment",
    "rotate.title": "Rotate your screen",
    "rotate.text": "Lofi Chill works best in landscape mode on phones.",
    "dock.tools": "Tools",
    "dock.scene": "Wallpaper",
    "dock.clock": "Clock",
    "dock.music": "Music",
    "dock.focus": "Focus",
    "dock.theme": "Day / Night",
    "dock.language": "Tiếng Việt",
    "theme.day": "Day",
    "theme.night": "Night",
    "common.close": "Close",
    "scene.title": "Wallpaper",
    "scene.bgPrev": "Previous",
    "scene.bgNext": "Next",
    "scene.shuffle": "Shuffle",
    "scene.bgCount": "Wallpaper {current} / {total}",
    "scene.bgAlt": "Wallpaper {n}",
    "scene.pickWallpaper": "Choose wallpaper",
    "clock.title": "Clock",
    "music.title": "Music",
    "music.search": "Search",
    "music.searchPlaceholder": "Search on YouTube...",
    "music.searchBtn": "Search",
    "music.searchIdle": "Enter keywords to search",
    "music.nowPlaying": "Now playing",
    "music.noTrack": "No track selected",
    "music.playlist": "Playlist",
    "music.playlistEmpty": "Playlist is empty — search for music above",
    "music.shuffle": "Shuffle",
    "music.prev": "Previous",
    "music.playPause": "Play / Pause",
    "music.next": "Next",
    "music.repeat": "Repeat",
    "music.repeatOff": "Off",
    "music.repeatOne": "One",
    "music.repeatAll": "All",
    "music.repeatTitle": "Repeat: {mode}",
    "music.loading": "Loading...",
    "music.trackArtAlt": "Track artwork",
    "music.loadingMore": "Loading more...",
    "music.scrollMore": "Scroll down for more",
    "music.noMoreResults": "No more results",
    "music.noResults": "No results",
    "music.searchFailed": "Search failed",
    "music.playerLoadFailed": "Could not load player",
    "music.checkNetwork": "Check your network",
    "music.playFailed": "Could not play",
    "music.youtubeError": "YouTube error #{code}",
    "music.npmHint": "run npm start",
    "pomo.title": "Focus timer",
    "pomo.workDuration": "Work duration",
    "pomo.days": "Days",
    "pomo.hours": "Hours",
    "pomo.minutes": "Minutes",
    "pomo.start": "Start",
    "pomo.pause": "Pause",
    "pomo.reset": "Reset",
    "gallery.title": "Choose wallpaper",
    "gallery.numberPlaceholder": "No.",
    "gallery.go": "Go",
    "gallery.random": "Random",
    "gallery.apply": "Apply wallpaper",
    "errors.noServer": "Cannot connect to server — run: npm start",
    "errors.cloudinary": "Failed to load Cloudinary images",
    "toast.themeDay": "Switched to day theme",
    "toast.themeNight": "Switched to night theme",
    "toast.langVi": "Switched to Vietnamese",
    "toast.langEn": "Switched to English",
    "toast.wallpaper": "Wallpaper {current} / {total}",
    "toast.galleryInvalid": "Invalid wallpaper number",
    "toast.pomoStarted": "Focus timer started",
    "toast.pomoPaused": "Focus timer paused",
    "toast.pomoReset": "Focus timer reset",
    "toast.pomoDone": "Focus time is up — take a break!",
    "toast.shuffleOn": "Shuffle enabled",
    "toast.shuffleOff": "Shuffle disabled",
    "toast.repeat": "Repeat: {mode}",
    "toast.trackAdded": "Added to playlist",
    "toast.trackRemoved": "Removed from playlist",
    "toast.noPlaylist": "Playlist is empty",
    "toast.layoutApplied": "Layout: {name}",
    "toast.layoutCustomSaved": "Custom layout saved",
    "dock.layout": "Layout",
    "layout.title": "Workspace layout",
    "layout.presets": "Presets",
    "layout.customTitle": "Custom widgets",
    "layout.customHint": "Pin widgets on screen and pick a position",
    "layout.applyCustom": "Apply",
    "layout.preset.minimal": "Minimal",
    "layout.preset.focus": "Focus",
    "layout.preset.chill": "Chill",
    "layout.preset.studio": "Studio",
    "layout.preset.custom": "Custom",
    "layout.presetDesc.minimal": "Dock only — open widgets on demand",
    "layout.presetDesc.focus": "Clock, music with search & timer pinned to corners",
    "layout.presetDesc.chill": "Clock top center, compact music below",
    "layout.presetDesc.studio": "Full music bar with search, clock & timer on sides",
    "layout.presetDesc.custom": "Choose widgets and positions yourself",
    "layout.widget.clock": "Clock",
    "layout.widget.music": "Music",
    "layout.widget.pomo": "Focus timer",
    "layout.slot.top-left": "Top left",
    "layout.slot.top-center": "Top center",
    "layout.slot.top-right": "Top right",
    "layout.slot.bottom-left": "Bottom left",
    "layout.slot.bottom-center": "Bottom center",
    "layout.slot.bottom-right": "Bottom right",
    "layout.size.sm": "Small",
    "layout.size.md": "Medium",
    "layout.size.lg": "Large"
  }
};

let currentLang = "vi";

function t(key, vars) {
  const table = I18N_STRINGS[currentLang] || I18N_STRINGS.vi;
  let str = table[key] ?? I18N_STRINGS.vi[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return str;
}

function getLang() {
  return currentLang;
}

function getLocale() {
  return currentLang === "en" ? "en-US" : "vi-VN";
}

function setLang(lang) {
  if (!I18N_STRINGS[lang]) return;
  currentLang = lang;
  document.documentElement.lang = lang;
  applyI18n();
}

function applyI18n() {
  document.title = t("meta.pageTitle");

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel));
  });
}

function initI18n(lang) {
  if (lang === "vi" || lang === "en") currentLang = lang;
  document.documentElement.lang = currentLang;
  applyI18n();
}

function toggleLang() {
  setLang(currentLang === "vi" ? "en" : "vi");
  return currentLang;
}
