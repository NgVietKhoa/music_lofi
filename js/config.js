/* ========== CLOUDINARY (public — safe for browser) ========== */
const CLOUDINARY = {
  cloudName: "dwusxbhbr",
  assetFolder: "img_gif",
  transforms: {
    /* Nền: f_auto + fl_animated → WebP/AVIF động (mobile + desktop), nhẹ hơn f_gif */
    bg: "w_1920,c_limit,f_auto,q_auto,fl_animated",
    bgMobile: "w_1280,c_limit,f_auto,q_auto,fl_animated",
    /* Lớp blur — nhỏ hơn vì đã bị làm mờ */
    bgFill: "w_960,c_limit,f_auto,q_auto,fl_animated",
    bgFillMobile: "w_640,c_limit,f_auto,q_auto,fl_animated",
    /* Gallery preview: 1 frame, giữ tỉ lệ — không crop */
    galleryPreview: "w_1280,c_limit,f_auto,q_auto,pg_1",
    galleryPreviewMobile: "w_800,c_limit,f_auto,q_auto,pg_1",
    /* Preload nhỏ (hàng xóm) — không dùng cho hiển thị gallery */
    thumb: "w_320,c_limit,f_auto,q_auto,pg_1"
  }
};

function isMobileBgViewport() {
  return window.matchMedia("(max-width: 900px)").matches;
}

/** Public IDs sorted 1→102, loaded from js/cloudinary-ids.json at startup */
let CLOUDINARY_PUBLIC_IDS = [];

function setCloudinaryPublicIds(ids) {
  CLOUDINARY_PUBLIC_IDS = ids;
}

function getBackgroundCount() {
  return CLOUDINARY_PUBLIC_IDS.length;
}

function cloudinaryUrl(publicId, transform) {
  return [
    "https://res.cloudinary.com",
    CLOUDINARY.cloudName,
    "image/upload",
    transform,
    publicId
  ].join("/");
}

function cloudinaryBgUrl(index) {
  const transform = isMobileBgViewport()
    ? CLOUDINARY.transforms.bgMobile
    : CLOUDINARY.transforms.bg;
  return cloudinaryUrl(CLOUDINARY_PUBLIC_IDS[index], transform);
}

function cloudinaryBgFillUrl(index) {
  const transform = isMobileBgViewport()
    ? CLOUDINARY.transforms.bgFillMobile
    : CLOUDINARY.transforms.bgFill;
  return cloudinaryUrl(CLOUDINARY_PUBLIC_IDS[index], transform);
}

function cloudinaryThumbUrl(index) {
  return cloudinaryUrl(CLOUDINARY_PUBLIC_IDS[index], CLOUDINARY.transforms.thumb);
}

function cloudinaryGalleryPreviewUrl(index) {
  const transform = isMobileBgViewport()
    ? CLOUDINARY.transforms.galleryPreviewMobile
    : CLOUDINARY.transforms.galleryPreview;
  return cloudinaryUrl(CLOUDINARY_PUBLIC_IDS[index], transform);
}

const YOUTUBE_API = "/api/youtube";
