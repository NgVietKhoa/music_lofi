/* ========== CLOUDINARY (public — safe for browser) ========== */
const CLOUDINARY = {
  cloudName: "dwusxbhbr",
  assetFolder: "img_gif",
  transforms: {
    bg: "w_2560,c_limit,f_auto,q_auto",
    thumb: "w_220,h_220,c_fill,f_auto,q_90"
  }
};

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
  return cloudinaryUrl(CLOUDINARY_PUBLIC_IDS[index], CLOUDINARY.transforms.bg);
}

function cloudinaryThumbUrl(index) {
  return cloudinaryUrl(CLOUDINARY_PUBLIC_IDS[index], CLOUDINARY.transforms.thumb);
}

const YOUTUBE_API = "/api/youtube";
