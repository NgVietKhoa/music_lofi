import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { Innertube, Log } from "youtubei.js";
import { getBackgroundPublicIds } from "./lib/cloudinary-backgrounds.mjs";

Log.setLevel(Log.Level.NONE);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.VERCEL ? process.cwd() : __dirname;

function loadDotEnv() {
  if (process.env.CLOUDINARY_URL) return;
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  const line = fs.readFileSync(envPath, "utf8").match(/^CLOUDINARY_URL=(.+)$/m);
  if (line) process.env.CLOUDINARY_URL = line[1].trim();
}

loadDotEnv();
const PORT = Number(process.env.PORT) || 8080;
const SESSION_TTL_MS = 10 * 60 * 1000;

const app = express();
app.use(cors());
app.use(express.static(ROOT));

app.get("/", (_req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

let innertubePromise = null;
const searchSessions = new Map();

function getInnertube() {
  if (!innertubePromise) innertubePromise = Innertube.create();
  return innertubePromise;
}

function mapVideo(v) {
  return {
    id: v.id,
    title: v.title?.toString() || "Không có tiêu đề",
    author: v.author?.name || "",
    duration: v.duration?.text || "",
    thumbnail: v.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`
  };
}

function extractVideos(search) {
  return (search.videos || [])
    .filter((v) => v?.id?.length === 11)
    .map(mapVideo);
}

function pruneSearchSessions() {
  const now = Date.now();
  for (const [id, session] of searchSessions) {
    if (now - session.touched > SESSION_TTL_MS) searchSessions.delete(id);
  }
}

setInterval(pruneSearchSessions, 60_000);

app.get("/favicon.ico", (_req, res) => {
  res.sendFile(path.join(ROOT, "assets", "logo.png"));
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

/** Danh sách public_id nền — lấy trực tiếp từ Cloudinary (cache server ~10 phút) */
app.get("/api/backgrounds", async (req, res) => {
  if (!process.env.CLOUDINARY_URL) {
    return res.status(503).json({
      error: "Chưa cấu hình CLOUDINARY_URL trên server",
      hint: "Vercel: Settings → Environment Variables"
    });
  }

  try {
    const refresh = req.query.refresh === "1" || req.query.refresh === "true";
    const payload = await getBackgroundPublicIds({ refresh });
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json({
      ids: payload.ids,
      count: payload.ids.length,
      folder: payload.folder,
      cached: payload.cached
    });
  } catch (err) {
    console.error("[backgrounds]", err.message);
    res.status(500).json({ error: err.message || "Không tải được danh sách nền" });
  }
});

/** Tìm kiếm YouTube — trang đầu hoặc tải thêm (?continuation=...) */
app.get("/api/youtube/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Thiếu từ khóa" });

  const continuationId = String(req.query.continuation || "").trim();

  try {
    if (continuationId) {
      const session = searchSessions.get(continuationId);
      if (!session) {
        return res.status(410).json({ error: "Phiên tìm kiếm hết hạn — tìm lại" });
      }
      if (session.query !== q) {
        return res.status(400).json({ error: "Từ khóa không khớp phiên tìm kiếm" });
      }
      if (!session.search.has_continuation) {
        return res.json({ items: [], hasMore: false, continuation: continuationId });
      }

      session.search = await session.search.getContinuation();
      session.touched = Date.now();
      const items = extractVideos(session.search);
      return res.json({
        items,
        hasMore: !!session.search.has_continuation,
        continuation: continuationId
      });
    }

    const yt = await getInnertube();
    const search = await yt.search(q, { type: "video" });
    const sessionId = randomUUID();
    searchSessions.set(sessionId, { query: q, search, touched: Date.now() });

    const items = extractVideos(search);
    res.json({
      items,
      hasMore: !!search.has_continuation,
      continuation: sessionId
    });
  } catch (err) {
    console.error("[search]", err.message);
    res.status(500).json({ error: "Tìm kiếm thất bại" });
  }
});

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Lofi Chill → http://localhost:${PORT}`);
  });
}
