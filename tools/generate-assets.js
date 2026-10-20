// One-time asset generation: derives optimized WebP/PNG derivatives
// from the master artwork in the repo root.
//
//   node tools/generate-assets.js
//
// Requires: Chrome (puppeteer cache) for canvas encoding.
// Source of truth: "Glossy BLOX BREAK! Puzzle Banner 1.png" + "favicon.png"

const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

const CHROME =
  process.env.CHROME_PATH ||
  "C:/Users/rober/.cache/puppeteer/chrome/win64-154.0.8037.57/chrome-win64/chrome.exe";
const PORT = 9360;
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "assets", "img");

// Crop rectangles measured against the 1024x500 banner.
const CROPS = {
  // full width, keeps all four corner pieces + swooshes
  desktop: { sx: 0, sy: 45, sw: 1024, sh: 360 },
  // tight on the wordmark (bbox x192-874, y88-386), keeps a slice of each swoosh
  mobile: { sx: 150, sy: 58, sw: 765, sh: 344 },
};

function getJSON(urlPath) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: "127.0.0.1", port: PORT, path: urlPath }, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(JSON.parse(data)));
      })
      .on("error", reject);
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const chrome = spawn(
    CHROME,
    [
      "--headless",
      "--disable-gpu",
      "--no-sandbox",
      "--allow-file-access-from-files",
      `--remote-debugging-port=${PORT}`,
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let version;
  for (let i = 0; i < 60; i++) {
    try {
      version = await getJSON("/json/version");
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  if (!version) throw new Error("Could not start Chrome");

  const ws = new WebSocket(version.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve) => {
      const mid = ++id;
      pending.set(mid, resolve);
      ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
    });

  const { result: { targetId } } = await send("Target.createTarget", { url: "about:blank" });
  const { result: { sessionId } } = await send("Target.attachToTarget", {
    targetId,
    flatten: true,
  });
  await send("Page.navigate", { url: "file:///" + ROOT.replace(/\\/g, "/") + "/index.html" }, sessionId);
  await new Promise((r) => setTimeout(r, 1500));

  const expr = `(() => {
    const load = (src) => new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("failed to load " + src));
      i.src = src;
    });
    const draw = (img, sx, sy, sw, sh, dw, dh) => {
      const c = document.createElement("canvas");
      c.width = dw; c.height = dh;
      const g = c.getContext("2d");
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = "high";
      g.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
      return c;
    };
    const out = {};
    const put = (name, canvas, type, q) => { out[name] = canvas.toDataURL(type, q); };

    return (async () => {
      const logo = await load("Glossy%203D%20BLOX%20BREAK%20Logo.png");
      const icon = await load("favicon.png");

      // Wordmark cut from the standalone logo (alpha bbox 86,96 -> 1708,804).
      // This is the one element that stays a raster: the 3D letterforms cannot
      // be expressed as flat vector without losing the glossy plastic look.
      // WebP stores alpha losslessly, so the alpha channel is quantised to a
      // few levels first - that cuts the file roughly 3x with no visible loss.
      const WM = { sx: 86, sy: 96, sw: 1623, sh: 709 };
      const wordmark = (w) => {
        const h = Math.round((WM.sh * w) / WM.sw);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const g = c.getContext("2d");
        g.imageSmoothingQuality = "high";
        g.drawImage(logo, WM.sx, WM.sy, WM.sw, WM.sh, 0, 0, w, h);
        // quantise alpha to 8 levels
        const d = g.getImageData(0, 0, w, h);
        const step = 255 / 7;
        for (let i = 3; i < d.data.length; i += 4) {
          d.data[i] = Math.round(Math.round(d.data[i] / step) * step);
        }
        g.putImageData(d, 0, 0);
        return c;
      };
      put("wordmark.webp",    wordmark(900),  "image/webp", 0.85);
      put("wordmark-2x.webp", wordmark(1623), "image/webp", 0.85);

      const iconAt = (s) => draw(icon, 0, 0, 512, 512, s, s);
      put("icon-32.png",  iconAt(32),  "image/png");
      put("icon-32.webp", iconAt(32),  "image/webp", 0.9);
      put("icon-180.png", iconAt(180), "image/png");

      return JSON.stringify(out);
    })();
  })()`;

  const { result } = await send(
    "Runtime.evaluate",
    { expression: expr, awaitPromise: true, returnByValue: true },
    sessionId
  );
  const value = result.result && result.result.value;
  if (!value) throw new Error(JSON.stringify(result));

  for (const [name, dataUrl] of Object.entries(JSON.parse(value))) {
    const buf = Buffer.from(dataUrl.split(",")[1], "base64");
    fs.writeFileSync(path.join(OUT, name), buf);
    console.log(name.padEnd(24), (buf.length / 1024).toFixed(1) + " KB");
  }

  await send("Target.closeTarget", { targetId });
  ws.close();
  chrome.kill();
  process.exit(0);
})();
