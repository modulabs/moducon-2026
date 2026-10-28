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
  "kim-tae-su",
  "jo-in-ryeong",
  "park-jong-se",
  "song-kyung-min",
  "jung-hoon-gu",
  "sasha-seo",
  "kim-yu-jin",
  "jung-won-guk",
  "kim-hyung-jin",
];

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const tracks = ["C", "D", "E"];
const rooms = { C: "B147", D: "B146", E: "컨퍼런스홀 A" };
// Reviewed square framing, in original image pixels. Only the listing uses it.
// Keep the head visible at a similar size; never alter the original/detail photo.
const portraitFrames = {
  "정훈구": { imageWidth: 1376, x: 410, y: 230, size: 760 },
  "김형진": { imageWidth: 687, x: 150, y: 70, size: 350 },
  "한재선": { imageWidth: 5304, x: 945, y: 780, size: 3500 },
  "백종원": { imageWidth: 1080, x: 0, y: 60, size: 1080 },
  "신지현": { imageWidth: 4000, x: 1000, y: 500, size: 2100 },
  "조현욱": { imageWidth: 413, x: 20, y: 0, size: 380 },
  "김도혁": { imageWidth: 992, x: 170, y: 0, size: 720 },
  "신태욱": { imageWidth: 432, x: 10, y: 5, size: 420 },
  "김민현": { imageWidth: 832, x: 188, y: 80, size: 476 },
  "이용환": { imageWidth: 370, x: 20, y: 10, size: 330 },
  "이태경": { imageWidth: 2048, x: 119, y: 57, size: 1812 },
  "김태수": { imageWidth: 1086, x: 245, y: 250, size: 600 },
  "조인령": { imageWidth: 716, x: -102, y: 0, size: 920, background: "#fcfcfc" },
  "송경민": { imageWidth: 951, x: 365, y: 150, size: 300 },
  "김유진": { imageWidth: 4000, x: -150, y: 0, size: 4300, background: "#edf2f5" },
  "정원국": { imageWidth: 736, x: 249, y: 70, size: 124 },
  "박종세": { imageWidth: 2731, x: 65, y: 70, size: 2600 },
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
  const room = capture(html, /<dt>장소<\/dt>\s*<dd>이화여대 ECC · (B\d+|컨퍼런스홀 A)<\/dd>/, `${slug}: room`);
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

const minutes = (value) => {
  const [hours, minute] = value.split(":").map(Number);
  return hours * 60 + minute;
};
for (const [index, session] of sessions.entries()) {
  required(minutes(session.end) > minutes(session.start), `${session.slug}: invalid session duration`);
  for (const other of sessions.slice(index + 1)) {
    required(session.track !== other.track || session.end <= other.start || other.end <= session.start,
      `${session.slug} and ${other.slug}: overlapping sessions in one track need review`);
  }
}
// These shared breaks were confirmed by the organizer. Do not infer breaks
// from other gaps: unpublished sessions can also leave empty space.
const intermissions = [
  { start: "11:50", end: "12:05", kind: "break", label: "쉬는 시간" },
  { start: "12:45", end: "13:45", kind: "lunch", label: "점심시간" },
  { start: "14:25", end: "14:40", kind: "break", label: "쉬는 시간" },
  { start: "15:20", end: "15:35", kind: "break", label: "쉬는 시간" },
];
for (const pause of intermissions) {
  required(!sessions.some((session) => session.start < pause.end && pause.start < session.end),
    `${pause.start}–${pause.end}: a published session conflicts with a confirmed break`);
}
// Share every start/end boundary, including the confirmed breaks. Preserve
// chronological DOM order so the same breaks remain between cards on mobile.
const entries = [...sessions, ...intermissions].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
const boundaries = [...new Set(entries.flatMap((entry) => [entry.start, entry.end]))].sort();
const segments = boundaries.slice(0, -1).map((start, index) => {
  const end = boundaries[index + 1];
  return { start, end, row: index + 1, duration: minutes(end) - minutes(start),
    active: sessions.some((session) => session.start < end && start < session.end),
    pause: intermissions.find((pause) => pause.start <= start && end <= pause.end) };
});

function card(session, prefix) {
  const { slug, title, track, room, names, affiliations, portraits } = session;
  return `<a class="timetable-card" href="${prefix}session/2026/${slug}/index.html" data-local-route="/session/2026/${slug}" data-session-slug="${slug}" aria-labelledby="${slug}-title ${slug}-speakers" aria-describedby="${slug}-time ${slug}-track">
              <p class="timetable-card-time" id="${slug}-time"><time datetime="${session.startDate}">${session.start}</time><span aria-hidden="true">–</span><span class="timetable-sr-only">부터 </span><time datetime="${session.endDate}">${session.end}</time><span class="timetable-sr-only">까지, 한국 시간</span></p>
              <p class="timetable-card-track" id="${slug}-track">Track ${track} <span aria-hidden="true">·</span> ${room}</p>
              <h3 id="${slug}-title">${title}</h3>
              <div class="timetable-speakers" id="${slug}-speakers">
                ${names.map((name, index) => {
                  const portrait = portraits[index];
                  const frame = portrait?.frame;
                  const percent = (value) => `${Number(value.toFixed(3))}%`;
                  const framingClass = frame ? " timetable-speaker-avatar--framed" : "";
                  const framingStyle = frame ? ` style="--portrait-width:${percent(frame.imageWidth / frame.size * 100)};--portrait-left:${percent(-frame.x / frame.size * 100)};--portrait-top:${percent(-frame.y / frame.size * 100)}${frame.background ? `;background-color:${frame.background}` : ""}"` : "";
                  const image = portrait ? `<span class="timetable-speaker-avatar${framingClass}"${framingStyle} aria-hidden="true"><img src="${prefix}${portrait.asset}" alt="" loading="lazy" decoding="async"></span>` : "";
                  return `<p class="timetable-speaker">${image}<span class="timetable-speaker-text"><strong>${name}</strong> ${affiliations[index]}</span></p>`;
                }).join("\n                ")}
              </div>
              <span class="timetable-card-plus" aria-hidden="true">+</span>
            </a>`;
}

function page(route, prefix) {
  const rowSizes = segments.map((segment) => segment.active
    ? `minmax(calc(var(--timetable-minute-height) * ${segment.duration}), ${segment.duration}fr)`
    : segment.pause ? (segment.pause.kind === "lunch" ? "minmax(84px, auto)" : "minmax(64px, auto)") : "32px").join(" ");
  const timeLabels = segments.map((segment) => segment.active || segment.pause
    ? `          <div class="timetable-time${segment.pause ? " timetable-time--intermission" : ""}" data-start="${segment.start}" data-end="${segment.end}" style="grid-column:1;grid-row:${segment.row}" aria-hidden="true"><span>${segment.start}</span><span>–</span><span>${segment.end}</span></div>`
    : `          <div class="timetable-gap" style="grid-column:1 / -1;grid-row:${segment.row}" aria-hidden="true"><span>⋮</span></div>`).join("\n");
  const cards = entries.map((session) => {
    const startRow = boundaries.indexOf(session.start) + 1;
    const endRow = boundaries.indexOf(session.end) + 1;
    if (session.kind) {
      return `          <div class="timetable-intermission" role="listitem" data-kind="${session.kind}" data-start="${session.start}" data-end="${session.end}" style="grid-column:2 / -1;grid-row:${startRow} / ${endRow}">
            <strong>${session.label}</strong>
            <span class="timetable-intermission-time"><time datetime="2026-12-12T${session.start}:00+09:00">${session.start}</time><span aria-hidden="true">–</span><span class="timetable-sr-only">부터 </span><time datetime="2026-12-12T${session.end}:00+09:00">${session.end}</time><span class="timetable-sr-only">까지, 한국 시간</span></span>
          </div>`;
    }
    return `          <div class="timetable-cell" role="listitem" data-track="${session.track}" data-start="${session.start}" data-end="${session.end}" style="grid-column:${tracks.indexOf(session.track) + 2};grid-row:${startRow} / ${endRow}">\n            ${card(session, prefix)}\n          </div>`;
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
      <div class="timetable-grid">
        <div class="timetable-columns" aria-hidden="true">
          <span>시간 <small>KST</small></span>
${tracks.map((track) => `          <span>Track ${track} <small>${rooms[track]}</small></span>`).join("\n")}
        </div>
        <div class="timetable-timeline" role="list" aria-label="MODUCON 2026 시간별 세션, 한국 시간" style="grid-template-rows:${rowSizes}">
${timeLabels}
${cards}
        </div>
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
