import { Innertube, Platform, Log } from "youtubei.js";

Log.setLevel(Log.Level.NONE);
Platform.shim.eval = async (d) => new Function(d.output)();

const id = process.argv[2] || "abPmZCZZrFA";
const yt = await Innertube.create({
  client_type: "IOS",
  retrieve_player: false,
  generate_session_locally: true
});
const info = await yt.getBasicInfo(id, { client: "IOS" });

const tries = [
  { type: "video+audio", quality: "best" },
  { type: "audio", quality: "best" },
  { type: "audio" }
];
let fmt = null;
for (const opts of tries) {
  try {
    fmt = info.chooseFormat(opts);
    if (fmt) break;
  } catch { /* skip */ }
}

const url = fmt?.url || (fmt ? await fmt.decipher(yt.session.player) : null);
console.log(url ? "OK" : "FAIL", fmt?.mime_type || "");
