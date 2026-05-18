# Lofi Chill — Music & Vibes

Ứng dụng web **lofi / chill** chạy trên trình duyệt: nền GIF động từ Cloudinary, nhạc YouTube, đồng hồ, Pomodoro và giao diện kiểu **LifeAt / Lofi.co** (dock + modal kính mờ).

> **Lưu ý:** Phải chạy qua server Node (`npm start`), không mở trực tiếp file `index.html` bằng `file://` — API tìm kiếm YouTube sẽ không hoạt động.

---

## Mục lục

- [Tính năng](#tính-năng)
- [Công nghệ](#công-nghệ)
- [Kiến trúc](#kiến-trúc)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Yêu cầu](#yêu-cầu)
- [Cài đặt & chạy](#cài-đặt--chạy)
- [Hướng dẫn sử dụng](#hướng-dẫn-sử-dụng)
- [API server](#api-server)
- [Cấu hình](#cấu-hình)
- [Đồng bộ nền Cloudinary](#đồng-bộ-nền-cloudinary)
- [Lưu trữ local](#lưu-trữ-local)
- [Gỡ lỗi](#gỡ-lỗi)
- [Giới hạn & pháp lý](#giới-hạn--pháp-lý)

---

## Tính năng

### Nền (Scene)

- Hơn **100 ảnh/GIF** từ Cloudinary (`img_gif`), chuyển mượt giữa hai lớp `bgA` / `bgB`.
- Điều hướng: **Trước / Sau / Ngẫu nhiên**.
- **Gallery** fullscreen: lưới thumbnail, tìm theo số `#`, lazy-load khi cuộn.

### Nhạc (Music)

- **Tìm kiếm YouTube** qua server (`youtubei.js` / Innertube API).
- **Infinite scroll**: cuộn xuống cuối danh sách kết quả → tự tải thêm video.
- **Playlist** lưu trong `localStorage` (videoId, tên, tác giả).
- **Phát nhạc** bằng [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference) — chỉ audio (player ẩn), không proxy stream `googlevideo.com`.
- Điều khiển: Play/Pause, Prev/Next, Shuffle, Repeat (off / one / all), thanh tiến độ, volume.
- Giao diện modal **3 cột**: Tìm kiếm | Đang phát | Playlist (responsive: xếp dọc trên màn hẹp).

### Đồng hồ (Clock)

- Đồng hồ **analog** (kim giờ / phút / giây) + **digital** + ngày tháng.

### Pomodoro

- Chế độ **Làm việc** (mặc định 25 phút) / **Nghỉ** (5 phút).
- Start / Pause / Reset; trạng thái lưu `localStorage`.

### Giao diện

- **Day / Night** theme.
- Dock icon [Lucide](https://lucide.dev/).
- Font: Be Vietnam Pro, Caveat, Space Mono.

---

## Công nghệ

| Thành phần | Công nghệ |
|------------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES modules không dùng — script thường) |
| Backend | Node.js, Express 5 |
| YouTube (tìm kiếm) | [youtubei.js](https://github.com/LuanRT/YouTube.js) (Innertube) |
| YouTube (phát) | YouTube IFrame Player API |
| Nền ảnh | Cloudinary CDN |
| Icon | Lucide (UMD) |

---

## Kiến trúc

```mermaid
flowchart LR
  subgraph Browser
    UI[index.html + app.js]
    YT[YouTube IFrame API]
    LS[(localStorage)]
    UI --> YT
    UI --> LS
    UI -->|fetch /api/youtube/search| API
    UI -->|ảnh nền| CDN[Cloudinary CDN]
  end

  subgraph Server["server.mjs :8080"]
    API[Express API]
    INN[Innertube singleton]
    SESS[Search sessions Map]
    API --> INN
    API --> SESS
    API --> STATIC[Static files]
  end

  INN --> YTAPI[YouTube Innertube]
  YT --> YTEMBED[YouTube embed player]
```

**Luồng tìm kiếm có phân trang**

1. Client gọi `GET /api/youtube/search?q=...` → server tạo phiên, trả `items`, `hasMore`, `continuation`.
2. User cuộn gần cuối → `GET /api/youtube/search?q=...&continuation=<uuid>`.
3. Server gọi `search.getContinuation()` và trả batch tiếp theo.
4. Phiên hết hạn sau **10 phút** không dùng (HTTP `410`).

**Luồng phát nhạc**

- Client gọi `YT.Player` / `loadVideoById` trực tiếp — **không** stream qua server (tránh lỗi 403 CORS / proxy `googlevideo`).

---

## Cấu trúc thư mục

```
music_chill/
├── assets/
│   └── logo.png            # Logo & favicon (tab trình duyệt)
├── index.html              # Trang chính, modal, dock
├── css/
│   └── style.css           # Toàn bộ style (theme, music 3 cột, gallery…)
├── js/
│   ├── app.js              # Logic ứng dụng (~1000 dòng)
│   ├── config.js           # Cloudinary + YOUTUBE_API base path
│   └── cloudinary-ids.json # Danh sách public_id nền (sync từ Cloudinary)
├── server.mjs              # Express: static + API YouTube search
├── scripts/
│   ├── fetch-cloudinary-ids.js  # Đồng bộ ID ảnh từ Cloudinary
│   └── test-audio.mjs           # Script CLI thử stream (dev, không dùng production)
├── package.json
└── README.md
```

---

## Yêu cầu

- **Node.js** 18+ (khuyến nghị 20+)
- Kết nối Internet (YouTube, Cloudinary, Google Fonts)
- Trình duyệt hiện đại (Chrome, Edge, Firefox, Safari)

Tùy chọn (chỉ khi đồng bộ nền Cloudinary):

- Tài khoản Cloudinary + file `.env` với `CLOUDINARY_URL`

---

## Cài đặt & chạy

```bash
# Clone hoặc mở thư mục dự án
cd music_chill

# Cài dependency
npm install

# Chạy server (mặc định cổng 8080)
npm start
```

Mở trình duyệt: **http://localhost:8080**

Đổi cổng:

```bash
# Windows PowerShell
$env:PORT=3000; npm start

# Linux / macOS
PORT=3000 npm start
```

---

## Hướng dẫn sử dụng

### Dock (thanh công cụ dưới)

| Nút | Chức năng |
|-----|-----------|
| Ảnh | Nền + mở Gallery |
| Đồng hồ | Modal đồng hồ |
| Nhạc | Modal Music (tìm + phát + playlist) |
| Pomodoro | Hẹn giờ làm việc / nghỉ |
| Mặt trời / trăng | Đổi theme Day / Night |

### Music

1. Mở modal **Music**.
2. Cột trái: gõ từ khóa → Enter hoặc nút tìm → chọn video trong danh sách (cuộn xuống để load thêm).
3. Video được thêm vào **Playlist** (cột phải).
4. Cột giữa: điều khiển phát như player thông thường.
5. Click bài trong playlist để phát; nút **×** để xóa.

### Scene / Gallery

- **Scene**: prev / next / shuffle nền.
- **Mở Gallery**: chọn thumbnail hoặc tìm `#12` để nhảy nhanh.

---

## API server

Base URL: `http://localhost:8080` (hoặc `PORT` bạn đặt).

### `GET /api/health`

Kiểm tra server sống.

**Response**

```json
{ "ok": true }
```

---

### `GET /api/youtube/search`

Tìm video YouTube (trang đầu hoặc trang tiếp).

| Query | Bắt buộc | Mô tả |
|-------|----------|--------|
| `q` | Có | Từ khóa tìm kiếm |
| `continuation` | Không | UUID phiên từ lần tìm trước (load thêm) |

**Response thành công**

```json
{
  "items": [
    {
      "id": "dQw4w9WgXcQ",
      "title": "…",
      "author": "…",
      "duration": "3:32",
      "thumbnail": "https://i.ytimg.com/vi/…"
    }
  ],
  "hasMore": true,
  "continuation": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Lỗi thường gặp**

| HTTP | Ý nghĩa |
|------|---------|
| `400` | Thiếu `q` hoặc `q` không khớp phiên `continuation` |
| `410` | Phiên tìm kiếm hết hạn — tìm lại từ đầu |
| `500` | Lỗi Innertube / YouTube — thử lại sau |

---

## Cấu hình

### `js/config.js`

```javascript
const CLOUDINARY = {
  cloudName: "dwusxbhbr",      // Đổi nếu dùng Cloudinary riêng
  assetFolder: "img_gif",
  transforms: {
    bg: "w_1920,c_limit,f_auto,q_auto",
    thumb: "w_220,h_220,c_fill,f_auto,q_90"
  }
};

const YOUTUBE_API = "/api/youtube";  // Base path API (relative)
```

### `server.mjs`

| Hằng số | Mặc định | Mô tả |
|---------|----------|--------|
| `PORT` | `8080` | Cổng HTTP (`process.env.PORT`) |
| `SESSION_TTL_MS` | `600000` (10 phút) | Thời gian sống phiên tìm kiếm |

---

## Đồng bộ nền Cloudinary

Khi thêm/xóa GIF trên Cloudinary folder `img_gif`, chạy:

```bash
# Tạo file .env ở thư mục gốc:
# CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

npm run sync:cloudinary
```

Script `scripts/fetch-cloudinary-ids.js` ghi danh sách `public_id` vào `js/cloudinary-ids.json` (sắp xếp theo số trong tên file).

---

## Lưu trữ local

Key: `lofiChill_v1` trong `localStorage`.

| Trường | Nội dung |
|--------|----------|
| `bgIndex` | Index nền hiện tại |
| `volume`, `muted` | Âm lượng nhạc |
| `theme` | `day` \| `night` |
| `playlist` | `[{ videoId, name, author }, …]` |
| `pomo` | mode, secondsLeft, running, work/break duration |

---

## Gỡ lỗi

### Không tìm được nhạc / lỗi mạng

- Đảm bảo đã chạy `npm start` và truy cập `http://localhost:8080` (không phải `file://`).
- F12 → Console: log prefix **`[Lofi Music]`**.

### Phát nhạc không được (MV chính thức)

- Một số video **chặn embed** (bản quyền) → YouTube IFrame trả mã lỗi `101` / `150`.
- Thử bản cover, live, lyric khác.

### Icon tab trình duyệt

- Logo: `assets/logo.png` — liên kết trong `index.html`, `/favicon.ico` trỏ về cùng file.

### Load thêm tìm kiếm báo “Phiên tìm kiếm hết hạn”

- Quá 10 phút không cuộn / đổi từ khóa → tìm lại từ đầu.

### Restart server sau khi sửa `server.mjs`

```bash
# Dừng terminal (Ctrl+C) rồi
npm start
```

---

## Giới hạn & pháp lý

- Dự án dùng API không chính thức của YouTube qua `youtubei.js` — có thể thay đổi / bị giới hạn bất cứ lúc nào.
- Việc phát nhạc tuân theo [Điều khoản YouTube](https://www.youtube.com/t/terms) và chính sách embed.
- Nội dung GIF/ảnh nền host trên Cloudinary — đảm bảo bạn có quyền sử dụng asset.
- **Không** dùng dự án để tải/xử lý stream ngoài phạm vi embed nếu không tuân thủ luật bản quyền.

---

## Scripts npm

| Lệnh | Mô tả |
|------|--------|
| `npm start` | Chạy `node server.mjs` |
| `npm run sync:cloudinary` | Đồng bộ `js/cloudinary-ids.json` từ Cloudinary |

---

## Tham khảo

- [YouTube.js (youtubei.js)](https://github.com/LuanRT/YouTube.js/)
- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)
- Ý tưởng UX: LifeAt, Lofi.co

---

## License

ISC (theo `package.json`). Asset và nội dung YouTube thuộc chủ sở hữu tương ứng.
