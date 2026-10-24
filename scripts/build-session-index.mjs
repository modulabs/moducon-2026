import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Only already-published, explicitly approved detail pages belong in this list.
// Do not discover pages by glob or read the preview agent / Google Sheet here.
// Add a slug only after the user approves publication of its detail page.
const approvedSlugs = [
  "dao-lab-together",
  "jo-hyun-wook",
  "kim-do-hyuk",
  "shin-tae-uk",
  "park-cheol",
  "kim-min-hyun",
  "lee-yong-hwan",
  "lee-tae-kyung",
];

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const tracks = ["C", "D"];
const rooms = { C: "B147", D: "B146" };
// Reviewed square framing, in original image pixels. Only the listing uses it.
// Keep the head visible at a similar size; never alter the original/detail photo.
const portraitFrames = {
  "한재선": { imageWidth: 5304, x: 945, y: 780, size: 3500 },
  "백종원": { imageWidth: 1080, x: 0, y: 60, size: 1080 },
  "신지현": { imageWidth: 4000, x: 1000, y: 500, size: 2100 },
  "조현욱": { imageWidth: 413, x: 20, y: 0, size: 380 },
  "신태욱": { imageWidth: 432, x: 10, y: 5, size: 420 },
  "김민현": { imageWidth: 832, x: 188, y: 80, size: 476 },
  "이용환": { imageWidth: 370, x: 20, y: 10, size: 330 },
  "이태경": { imageWidth: 2048, x: 119, y: 57, size: 1812 },
};
const required = (value, message) => {
  if (!value) throw new Error(message);
  return value;
};
const capture = (html, expression, label) => required(html.match(expression)?.[1], `Missing ${label}`).trim();
const sessions = approvedSlugs.map((slug) => {
  const detailPath = join(dist, "session", "2026", slug, "index.html");
  const html = readFileSync(detailPath, "utf8");
  const title = capture(html, /<h1[^>]*>([\s\S]*?)<\/h1>/, `${slug}: title`);
  const track = capture(html, /class="session-track">Track ([A-Z])<\/span>/, `${slug}: track`);
  const room = capture(html, /<dt>장소<\/dt>\s*<dd>이화여대 ECC · (B\d+)<\/dd>/, `${slug}: room`);
  const times = [...html.matchAll(/<time datetime="(2026-12-12T(\d{2}:\d{2}):00\+09:00)">([^<]+)<\/time>/g)];
  required(times.length === 2, `${slug}: expected exactly one start/end time pair`);
  required(tracks.includes(track) && rooms[track] === room, `${slug}: review the approved track columns`);
  const names = [...html.matchAll(/<p class="session-speaker-name">([\s\S]*?)<\/p>/g)].map((m) => m[1].trim());
  const affiliations = [...html.matchAll(/<p class="session-speaker-affiliation">([\s\S]*?)<\/p>/g)].map((m) => m[1].trim());
  required(names.length && names.length === affiliations.length, `${slug}: incomplete speaker information`);
  const profiles = [...html.matchAll(/<div class="session-speaker-profile(?: [^"]*)?">([\s\S]*?)(?=<div class="session-speaker-profile(?: [^"]*)?">|<\/section>)/g)].map((m) => m[1]);
  required(profiles.length === names.length, `${slug}: review speaker/photo association`);
  const portraits = profiles.map((profile, index) => {
    required(capture(profile, /<p class="session-speaker-name">([\s\S]*?)<\/p>/, `${slug}: portrait name`) === names[index], `${slug}: portrait/name mismatch`);
    const src = profile.match(/<figure class="session-speaker-portrait">[\s\S]*?<img\b[^>]*\bsrc="([^"]+)"/)?.[1];
    if (!src) return null;
    const imagePath = resolve(dirname(detailPath), src);
    const asset = relative(dist, imagePath).split(sep).join("/");
    required(asset.startsWith("assets/") && existsSync(imagePath), `${slug}: missing local portrait`);
    return { asset, frame: portraitFrames[names[index]] };
  });
  return { slug, title, track, room, names, affiliations, portraits, start: times[0][2], end: times[1][2], startDate: times[0][1], endDate: times[1][1] };
}).sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end) || a.track.localeCompare(b.track));

const groups = new Map();
for (const session of sessions) {
  const key = `${session.start}-${session.end}`;
  if (!groups.has(key)) groups.set(key, []);
  const row = groups.get(key);
  required(!row.some((existing) => existing.track === session.track), `${key}: overlapping sessions in one track need review`);
  row.push(session);
}

function card(session, prefix, timeId) {
  const { slug, title, track, room, names, affiliations, portraits } = session;
  return `<a class="timetable-card" href="${prefix}session/2026/${slug}/index.html" data-local-route="/session/2026/${slug}" data-session-slug="${slug}" aria-labelledby="${slug}-title ${slug}-speakers" aria-describedby="${timeId} ${slug}-track">
              <p class="timetable-card-track" id="${slug}-track">Track ${track} <span aria-hidden="true">·</span> ${room}</p>
              <h3 id="${slug}-title">${title}</h3>
              <div class="timetable-speakers" id="${slug}-speakers">
                ${names.map((name, index) => {
                  const portrait = portraits[index];
                  const frame = portrait?.frame;
                  const percent = (value) => `${Number(value.toFixed(3))}%`;
                  const framingClass = frame ? " timetable-speaker-avatar--framed" : "";
                  const framingStyle = frame ? ` style="--portrait-width:${percent(frame.imageWidth / frame.size * 100)};--portrait-left:${percent(-frame.x / frame.size * 100)};--portrait-top:${percent(-frame.y / frame.size * 100)}"` : "";
                  const image = portrait ? `<span class="timetable-speaker-avatar${framingClass}"${framingStyle} aria-hidden="true"><img src="${prefix}${portrait.asset}" alt="" loading="lazy" decoding="async"></span>` : "";
                  return `<p class="timetable-speaker">${image}<span class="timetable-speaker-text"><strong>${name}</strong> ${affiliations[index]}</span></p>`;
                }).join("\n                ")}
              </div>
              <span class="timetable-card-plus" aria-hidden="true">+</span>
            </a>`;
}

function page(route, prefix) {
  const rows = [...groups.entries()].map(([key, items]) => {
    const first = items[0];
    const timeId = `time-${key.replaceAll(":", "")}`;
    return `        <div class="timetable-row" role="listitem">
          <div class="timetable-time" id="${timeId}"><time datetime="${first.startDate}">${first.start}</time><span aria-hidden="true">–</span><span class="timetable-sr-only">부터 </span><time datetime="${first.endDate}">${first.end}</time><span class="timetable-sr-only">까지</span></div>
${tracks.map((track) => {
      const session = items.find((item) => item.track === track);
      return session ? `          <div class="timetable-cell" data-track="${track}">\n            ${card(session, prefix, timeId)}\n          </div>` : `          <div class="timetable-cell timetable-cell--empty" aria-hidden="true"></div>`;
    }).join("\n")}
        </div>`;
  }).join("\n");
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="MODUCON 2026 세션 시간표. 2026년 12월 12일 이화여대 ECC에서 만나는 발표와 연사, 시간, 강의실을 확인하세요.">
  <title>MODUCON 2026 | Sessions</title>
  <link rel="icon" type="image/png" sizes="32x32" href="${prefix}assets/brand-2026/favicon-2026-32.png">
  <link rel="icon" type="image/svg+xml" sizes="any" href="${prefix}assets/brand-2026/favicon-2026.svg">
  <link rel="apple-touch-icon" sizes="180x180" href="${prefix}assets/brand-2026/apple-touch-icon-2026.png">
  <link rel="stylesheet" href="${prefix}styles.css">
  <link rel="stylesheet" href="${prefix}home-sections.css">
  <link rel="stylesheet" href="${prefix}session-2026.css">
  <link rel="stylesheet" href="${prefix}session-timetable-2026.css">
  <script src="${prefix}app.js" defer></script>
</head>
<body class="session-2026 session-timetable" data-route="${route}" data-event-year="2026" data-session-visibility="hidden">
  <!-- Generated by scripts/build-session-index.mjs from approved, published detail pages. -->
  <a class="skip-link" href="#main">본문으로 바로 가기</a>
  <header class="session-header">
    <nav class="session-shell session-navigation" aria-label="주 메뉴">
      <a class="session-logo" href="${prefix}index.html" data-local-route="/" aria-label="MODUCON 2026 홈">
        <img src="${prefix}assets/moducon26_logo_white.png" width="1330" height="436" alt="MODUCON 2026">
      </a>
      <ul>
        <li><a href="${prefix}index.html" data-local-route="/">Home</a></li>
        <li data-session-navigation><a href="${prefix}session/index.html" data-local-route="/session" aria-current="page">전체 세션</a></li>
        <li><a href="${prefix}faq/index.html" data-local-route="/faq">FAQ</a></li>
      </ul>
    </nav>
  </header>

  <main id="main" tabindex="-1">
    <header class="timetable-hero">
      <div class="session-shell">
        <p class="timetable-event">MODUCON 2026 · Deeper in AI</p>
        <h1>Sessions</h1>
        <p class="timetable-date"><time datetime="2026-12-12">2026년 12월 12일(토)</time> · 이화여대 ECC</p>
      </div>
    </header>

    <section class="timetable-section" aria-label="세션 시간표">
      <div class="timetable-grid" role="list" aria-label="MODUCON 2026 시간별 세션, 한국 시간">
        <div class="timetable-columns" aria-hidden="true">
          <span>시간 <small>KST</small></span>
          <span>Track C <small>B147</small></span>
          <span>Track D <small>B146</small></span>
        </div>
${rows}
      </div>
    </section>

  </main>

  <footer class="session-footer">
    <div class="session-shell session-footer-content">
      <a class="session-logo" href="${prefix}index.html" data-local-route="/" aria-label="MODUCON 2026 홈">
        <img src="${prefix}assets/moducon26_logo_black.png" width="1330" height="436" alt="MODUCON 2026" loading="lazy">
      </a>
      <small>© 2026 – MODULABS</small>
    </div>
  </footer>
</body>
</html>
`;
}

writeFileSync(join(dist, "session", "index.html"), page("/session", "../"));
writeFileSync(join(dist, "session", "2026", "index.html"), page("/session/2026", "../../"));
const routesPath = join(root, "routes.json");
let routes = readFileSync(routesPath, "utf8");
for (const route of ["/session", "/session/2026"]) {
  const expression = new RegExp(`\\{\\s*"path": "${route}",[\\s\\S]*?\\}`);
  required(expression.test(routes), `Missing route metadata: ${route}`);
  routes = routes.replace(expression, (block) => block.replace(/"title":\s*"(?:[^"\\]|\\.)*"/, '"title": "MODUCON 2026 | Sessions"'));
}
writeFileSync(routesPath, routes);
console.log(`Generated both 2026 session indexes from ${sessions.length} approved sessions (${sessions.reduce((count, session) => count + session.names.length, 0)} speakers).`);
