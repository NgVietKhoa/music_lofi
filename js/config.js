/* ========== CLOUDINARY (public — safe for browser) ========== */
const CLOUDINARY = {
  cloudName: "dwusxbhbr",
  assetFolder: "img_gif",
  transforms: {
    /* f_auto → WebP/AVIF tĩnh trên nhiều mobile; f_gif giữ animation */
    bg: "w_1920,c_limit,f_gif,q_auto",
    bgMobile: "w_1280,c_limit,f_gif,q_auto",
    thumb: "w_220,h_220,c_fill,f_gif,q_90"
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

function cloudinaryThumbUrl(index) {
  return cloudinaryUrl(CLOUDINARY_PUBLIC_IDS[index], CLOUDINARY.transforms.thumb);
}

const YOUTUBE_API = "/api/youtube";
