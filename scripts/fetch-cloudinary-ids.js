/**
 * Đồng bộ public_id từ folder img_gif trên Cloudinary → js/cloudinary-ids.json
 * Chạy: node scripts/fetch-cloudinary-ids.js
 * Cần file .env với CLOUDINARY_URL
 */
const fs = require("fs");
const path = require("path");
const cloudinary = require("cloudinary").v2;

const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const line = fs.readFileSync(envPath, "utf8").match(/^CLOUDINARY_URL=(.+)$/m);
  if (line) process.env.CLOUDINARY_URL = line[1].trim();
}

cloudinary.config(true);

async function fetchAll() {
  let all = [];
  let next;
  do {
    const opts = { max_results: 100 };
    if (next) opts.next_cursor = next;
    const r = await cloudinary.api.resources_by_asset_folder("img_gif", opts);
    all = all.concat(r.resources || []);
    next = r.next_cursor;
  } while (next);

  return all.sort((a, b) => {
    const na = parseInt(a.public_id.split("_")[0], 10);
    const nb = parseInt(b.public_id.split("_")[0], 10);
    return na - nb;
  });
}

fetchAll()
  .then((resources) => {
    const ids = resources.map((r) => r.public_id);
    const out = path.join(__dirname, "..", "js", "cloudinary-ids.json");
    fs.writeFileSync(out, JSON.stringify(ids, null, 2) + "\n");
    console.log(`Saved ${ids.length} public IDs → js/cloudinary-ids.json`);
  })
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
