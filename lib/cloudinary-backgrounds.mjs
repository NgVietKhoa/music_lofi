import cloudinary from "cloudinary";

const BG_FOLDER = process.env.CLOUDINARY_ASSET_FOLDER || "img_gif";
const CACHE_MS = Number(process.env.BG_LIST_CACHE_MS) || 10 * 60 * 1000;

let cache = { ids: null, fetchedAt: 0 };

function sortPublicIds(ids) {
  return [...ids].sort((a, b) => {
    const na = parseInt(String(a).split("_")[0], 10);
    const nb = parseInt(String(b).split("_")[0], 10);
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return String(a).localeCompare(String(b), undefined, { numeric: true });
  });
}

export async function fetchBackgroundPublicIds() {
  cloudinary.v2.config(true);

  let all = [];
  let next;
  do {
    const opts = { max_results: 100 };
    if (next) opts.next_cursor = next;
    const result = await cloudinary.v2.api.resources_by_asset_folder(BG_FOLDER, opts);
    all = all.concat(result.resources || []);
    next = result.next_cursor;
  } while (next);

  const ids = all.map((r) => r.public_id).filter(Boolean);
  if (!ids.length) {
    throw new Error(`Không có ảnh trong folder Cloudinary "${BG_FOLDER}"`);
  }
  return sortPublicIds(ids);
}

export async function getBackgroundPublicIds({ refresh = false } = {}) {
  const now = Date.now();
  if (!refresh && cache.ids?.length && now - cache.fetchedAt < CACHE_MS) {
    return { ids: cache.ids, cached: true, folder: BG_FOLDER };
  }

  const ids = await fetchBackgroundPublicIds();
  cache = { ids, fetchedAt: now };
  return { ids, cached: false, folder: BG_FOLDER };
}
