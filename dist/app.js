"use strict";

/* MODUCON 2025 — framework-free interactions.
 * Layout: index.html + reference.css. Enhancements: styles.css.
 * The original Framer runtime, analytics and tracking scripts are not used.
 */
(() => {
  const all = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const scrollBehavior = () => reducedMotion.matches ? "instant" : "smooth";

  // Clean web URLs, with relative index.html links retained for offline use.
  if (window.location.protocol !== "file:") {
    all("[data-local-route][href]").forEach((link) => {
      const target = new URL(link.getAttribute("href"), window.location.href);
      const route = link.dataset.localRoute;
      const path = route === "/" ? "/" : `${route}/`;
      link.setAttribute("href", `${path}${target.search}${target.hash}`);
    });
  }

  // Preserve nested links in the reference artwork without nested <a> tags.
  all('span[data-nested-link="true"][href]').forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.location.assign(link.getAttribute("href"));
    });
    link.addEventListener("keydown", (event) => {
      if (event.key === "Enter") { event.preventDefault(); link.click(); }
    });
  });

  // Keyboard behavior for the original design's custom button elements.
  function buttonize(element, label) {
    element.setAttribute("role", "button");
    element.tabIndex = 0;
    if (label) element.setAttribute("aria-label", label);
    element.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      element.click();
    });
  }

  // Each carousel keeps its own scroll position. Swiping remains native.
  all('section[aria-roledescription="carousel"]').forEach((section, index) => {
    const track = section.querySelector("ul.framer--carousel");
    if (!track) return;
    const previous = section.querySelector('button[aria-label="Previous"]');
    const next = section.querySelector('button[aria-label="Next"]');
    section.setAttribute("aria-label", `행사 세션 슬라이드 ${index + 1}`);
    track.tabIndex = 0;
    track.id = `carousel-${index}`;
    track.setAttribute("aria-label", "좌우 방향키로 세션 이동");
    track.removeAttribute("aria-live");
    track.style.touchAction = "pan-x pan-y";

    const setButton = (button, disabled, label) => {
      if (!button) return;
      button.disabled = disabled;
      button.setAttribute("aria-label", label);
      button.setAttribute("aria-controls", track.id);
      button.style.opacity = disabled ? "0" : "1";
      button.style.pointerEvents = disabled ? "none" : "auto";
      button.style.cursor = disabled ? "default" : "pointer";
    };
    const update = () => {
      const end = Math.max(0, track.scrollWidth - track.clientWidth);
      setButton(previous, track.scrollLeft <= 2, "이전 세션");
      setButton(next, track.scrollLeft >= end - 2, "다음 세션");
    };
    const move = (direction) => {
      const card = track.firstElementChild;
      if (!card) return;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      track.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: scrollBehavior() });
    };
    previous?.addEventListener("click", () => move(-1));
    next?.addEventListener("click", () => move(1));
    track.addEventListener("scroll", update, { passive: true });
    track.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        move(event.key === "ArrowLeft" ? -1 : 1);
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        track.scrollTo({ left: event.key === "Home" ? 0 : track.scrollWidth, behavior: scrollBehavior() });
      }
    });
    if ("ResizeObserver" in window) new ResizeObserver(update).observe(track);
    window.addEventListener("load", update, { once: true });
    update();
  });

  // Mobile navigation: hidden links leave the keyboard focus order.
  all("nav.framer-v-1ioopn8, nav.framer-v-1fe4gkm").forEach((nav, index) => {
    const toggle = nav.querySelector('[data-framer-name="Menu Button"]');
    const menu = nav.querySelector('[data-framer-name="Navmenu"]');
    if (!toggle || !menu) return;
    const light = nav.classList.contains("framer-v-1fe4gkm");
    const closedVariant = light ? "framer-v-1fe4gkm" : "framer-v-1ioopn8";
    const openVariant = light ? "framer-v-zo5h3m" : "framer-v-zfrn6f";
    nav.dataset.navTheme = light ? "light" : "dark";
    let isOpen = false;
    menu.id = `mobile-navigation-${index}`;
    toggle.setAttribute("aria-controls", menu.id);
    buttonize(toggle, "메뉴 열기");
    const setOpen = (value, restoreFocus = false) => {
      isOpen = value;
      nav.classList.toggle("menu-open", value);
      nav.classList.toggle(closedVariant, !value);
      nav.classList.toggle(openVariant, value);
      toggle.setAttribute("aria-expanded", String(value));
      toggle.setAttribute("aria-label", value ? "메뉴 닫기" : "메뉴 열기");
      menu.inert = !value;
      menu.setAttribute("aria-hidden", String(!value));
      if (restoreFocus) toggle.focus();
    };
    toggle.addEventListener("click", () => setOpen(!isOpen));
    menu.addEventListener("click", (event) => {
      if (event.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen) setOpen(false, true);
    });
    document.addEventListener("click", (event) => {
      if (isOpen && !nav.contains(event.target)) setOpen(false);
    });
    window.matchMedia("(min-width: 810px)").addEventListener("change", () => setOpen(false));
    setOpen(false);
  });

  // FAQ content is embedded in the HTML; all answers also work without JS.
  all(".framer-vpLOs").forEach((item) => {
    const question = item.querySelector(".framer-rtjk5q");
    const answer = item.querySelector(".faq-answer");
    if (!question || !answer) return;
    buttonize(question);
    question.setAttribute("aria-controls", answer.id);
    question.id = `${answer.id}-question`;
    answer.setAttribute("aria-labelledby", question.id);
    answer.hidden = true;
    question.setAttribute("aria-expanded", "false");
    question.addEventListener("click", () => {
      const open = question.getAttribute("aria-expanded") !== "true";
      question.setAttribute("aria-expanded", String(open));
      item.classList.toggle("faq-open", open);
      answer.hidden = !open;
    });
  });

  // Recreate the hero's repeating typographic ticker without a runtime.
  all('[data-framer-name="Hero"] section > ul:not(.framer--carousel)').forEach((track) => {
    track.classList.add("hero-ticker");
    all("li", track).slice(1).forEach((item) => item.setAttribute("aria-hidden", "true"));
    const updateTicker = () => {
      const first = track.firstElementChild;
      if (!first) return;
      const distance = first.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).gap) || 0);
      track.style.setProperty("--ticker-distance", `${-distance}px`);
      track.style.setProperty("--ticker-duration", `${Math.max(15, distance / 60)}s`);
    };
    if ("ResizeObserver" in window) new ResizeObserver(updateTicker).observe(track);
    document.fonts?.ready.then(updateTicker);
    updateTicker();
  });

  // Archive background videos only play while visible; posters remain usable
  // when motion is reduced or the browser blocks automatic playback.
  const videos = all("video[muted][loop]");
  const visibleVideos = new Set();
  const updateVideo = (video) => {
    if (visibleVideos.has(video) && !reducedMotion.matches && !document.hidden) {
      video.muted = true;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };
  if (videos.length && "IntersectionObserver" in window) {
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) visibleVideos.add(target);
        else visibleVideos.delete(target);
        updateVideo(target);
      });
    });
    videos.forEach((video) => videoObserver.observe(video));
    document.addEventListener("visibilitychange", () => videos.forEach(updateVideo));
    reducedMotion.addEventListener("change", () => videos.forEach(updateVideo));
  }

  // The archive cycles one complete sequence of six partner logos.
  all(".framer-147vj86-container section > ul, .framer-619hio-container section > ul").forEach((track) => {
    const originals = [...track.children];
    originals.forEach((item) => {
      const duplicate = item.cloneNode(true);
      duplicate.setAttribute("aria-hidden", "true");
      duplicate.inert = true;
      track.append(duplicate);
    });
    track.classList.add("logo-ticker");
    const measure = () => {
      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      const distance = originals.reduce((sum, item) => sum + item.getBoundingClientRect().width + gap, 0);
      track.style.setProperty("--ticker-distance", `${-distance}px`);
      track.style.setProperty("--ticker-duration", `${Math.max(1, distance / 100)}s`);
    };
    if ("ResizeObserver" in window) new ResizeObserver(measure).observe(track);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        track.style.animationPlayState = entry.isIntersecting ? "running" : "paused";
      }).observe(track);
    }
    window.addEventListener("load", measure, { once: true });
    measure();
  });

  const status = document.createElement("div");
  status.className = "share-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  document.body.append(status);
  let statusTimeout;
  const announce = (message) => {
    status.textContent = message;
    status.classList.add("is-visible");
    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => status.classList.remove("is-visible"), 3500);
  };
  all("button").filter((button) => button.textContent.trim() === "공유하기").forEach((button) => {
    button.addEventListener("click", async () => {
      const isCurrentEvent = ["/", "/faq"].includes(document.body.dataset.route);
      const share = {
        title: isCurrentEvent ? "MODUCON 2026 — Deeper in AI" : "MODUCON 2025 — From AI to Infinity",
        text: isCurrentEvent ? "2026년 12월 12일, 모두의연구소 11주년 모두콘 2026에 초대합니다." : "모두콘 2025에 초대합니다.",
        url: "https://moducon.modulabs.co.kr/"
      };
      try {
        if (navigator.share) {
          await navigator.share(share);
          return;
        }
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(share.url);
          announce("모두콘 링크를 복사했습니다.");
        } else {
          window.prompt("모두콘 링크를 복사해 주세요.", share.url);
        }
      } catch (error) {
        if (error.name !== "AbortError") window.prompt("모두콘 링크를 복사해 주세요.", share.url);
      }
    });
  });
})();
