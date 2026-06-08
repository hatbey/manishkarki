/* =================================================================
   manishkarki.dev — shared app behaviour
   ================================================================= */

(() => {
  const $  = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

  // ============== theme ==============
  const THEME_KEY = "mk-theme";
  const applyTheme = (t) => {
    document.documentElement.setAttribute("data-theme", t);
    const btn = $(".theme-toggle");
    if (btn) btn.setAttribute("aria-label", `Switch to ${t === "dark" ? "light" : "dark"} mode`);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "dark" ? "#0a0d12" : "#fafaf7");
  };
  const stored = localStorage.getItem(THEME_KEY);
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  applyTheme(stored || (prefersLight ? "light" : "dark"));

  const toggleTheme = () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
  };
  document.addEventListener("click", (e) => {
    if (e.target.closest(".theme-toggle")) toggleTheme();
  });

  // ============== mobile burger ==============
  document.addEventListener("click", (e) => {
    if (e.target.closest(".nav-burger")) {
      $(".nav-links")?.classList.toggle("open");
    } else if (!e.target.closest(".nav")) {
      $(".nav-links")?.classList.remove("open");
    }
  });

  // ============== nav scroll state ==============
  const nav = $(".nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // ============== scroll progress ==============
  const prog = $(".scroll-progress");
  if (prog) {
    const updateProg = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      prog.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    };
    updateProg();
    window.addEventListener("scroll", updateProg, { passive: true });
    window.addEventListener("resize", updateProg);
  }

  // ============== year stamps ==============
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  // ============== reveal on scroll ==============
  const revealTargets = $$(`
    .reveal,
    .section > *:not(.section-head),
    .project-card,
    .note-card,
    .lab-card,
    .principle,
    .timeline li,
    .contact-method,
    .home-stats > div
  `);
  revealTargets.forEach((el) => el.classList.add("reveal"));

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("in"));
  }

  // ============== magnetic buttons ==============
  const magnetic = $$(".btn, .cmd-trigger, .icon-btn");
  magnetic.forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${x * 0.15}px, ${y * 0.25}px)`;
    });
    el.addEventListener("mouseleave", () => (el.style.transform = ""));
  });

  // ============== 3D tilt on project cards ==============
  const tiltCards = $$(".project-card, .lab-card");
  tiltCards.forEach((card) => {
    let raf = 0;
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rx = (y - 0.5) * -4;
        const ry = (x - 0.5) * 4;
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
      });
    });
    card.addEventListener("mouseleave", () => {
      cancelAnimationFrame(raf);
      card.style.transform = "";
    });
  });

  // ============== command palette ==============
  const PALETTE_ITEMS = [
    { group: "navigate", icon: "home", label: "Home",          href: ROOT + "index.html",    keywords: "start landing" },
    { group: "navigate", icon: "user", label: "About",         href: ROOT + "about.html",    keywords: "story bio" },
    { group: "navigate", icon: "grid", label: "Projects",      href: ROOT + "projects.html", keywords: "work portfolio case" },
    { group: "navigate", icon: "doc",  label: "Writing",       href: ROOT + "writing.html",  keywords: "essays blog notes" },
    { group: "navigate", icon: "lab",  label: "Lab",           href: ROOT + "lab.html",      keywords: "playground demo interactive ai" },
    { group: "navigate", icon: "mail", label: "Contact",       href: ROOT + "contact.html",  keywords: "hire email" },
    { group: "navigate", icon: "box",  label: "Uses",          href: ROOT + "uses.html",     keywords: "setup hardware software tools" },

    { group: "projects", icon: "box", label: "docu-chat",            href: ROOT + "projects/docu-chat.html",            keywords: "rag retrieval llm" },
    { group: "projects", icon: "box", label: "prompt-bench",         href: ROOT + "projects/prompt-bench.html",         keywords: "eval evaluation harness" },
    { group: "projects", icon: "box", label: "shelf",                href: ROOT + "projects/shelf.html",                keywords: "django bookkeeping" },
    { group: "projects", icon: "box", label: "kothi",                href: ROOT + "projects/kothi.html",                keywords: "wordpress hotel theme" },
    { group: "projects", icon: "box", label: "neural-from-scratch",  href: ROOT + "projects/neural-from-scratch.html",  keywords: "numpy backprop ml" },

    { group: "essays",   icon: "doc", label: "The RAG mistake I made three times",       href: ROOT + "writing/rag-mistake.html",            keywords: "chunking retrieval" },
    { group: "essays",   icon: "doc", label: "WordPress was an apprenticeship",          href: ROOT + "writing/wordpress-apprenticeship.html", keywords: "career craft" },
    { group: "essays",   icon: "doc", label: "Eval-driven prompting",                    href: ROOT + "writing/eval-driven-prompting.html",  keywords: "evaluation prompts methodology" },

    { group: "actions",  icon: "theme",  label: "Toggle theme",          action: toggleTheme,                                       meta: "T",  keywords: "dark light mode" },
    { group: "actions",  icon: "search", label: "Keyboard shortcuts",    action: () => window.__openHelp && window.__openHelp(),    meta: "?",  keywords: "help kbd shortcuts" },
    { group: "actions",  icon: "github", label: "GitHub profile",        href: "https://github.com/manishkarki",                    meta: "↗",  keywords: "code" },
    { group: "actions",  icon: "mail",   label: "Email me",              href: "mailto:hello@manishkarki.dev",                      meta: "↗",  keywords: "contact" },
    { group: "actions",  icon: "doc",    label: "Download résumé",       href: "#",                                                 meta: "↗",  keywords: "cv resume" },
    { group: "actions",  icon: "theme",  label: "Throw confetti",        action: () => window.__confetti && window.__confetti(40),  meta: "!",  keywords: "celebrate party" },
  ];

  const ICONS = {
    home:   `<path stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round" d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1z"/>`,
    user:   `<circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.6" fill="none"/><path stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" d="M5 20c1.5-3.5 4.5-5 7-5s5.5 1.5 7 5"/>`,
    grid:   `<rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.6" fill="none"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.6" fill="none"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.6" fill="none"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.6" fill="none"/>`,
    lab:    `<path stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round" d="M9 3v6l-5 9a2 2 0 001.7 3h12.6A2 2 0 0020 18l-5-9V3M8 3h8"/>`,
    mail:   `<rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.6" fill="none"/><path stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" d="M3 7l9 6 9-6"/>`,
    box:    `<path stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round" d="M3 7l9-4 9 4v10l-9 4-9-4V7zM3 7l9 4 9-4M12 11v10"/>`,
    theme:  `<circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.6" fill="none"/><path stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>`,
    github: `<path stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round" d="M9 19c-4 1.5-4-2.5-6-3m12 5v-3.5a3 3 0 00-.8-2.3c3-.3 6-1.5 6-6.5a4.6 4.6 0 00-1.3-3.2 4.2 4.2 0 00-.1-3.2s-1-.3-3.5 1.3a12 12 0 00-6.4 0C6.4 2 5.5 2.3 5.5 2.3a4.2 4.2 0 00-.1 3.2A4.6 4.6 0 004 8.7c0 5 3 6.2 6 6.5a3 3 0 00-.8 2.3V21"/>`,
    doc:    `<path stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round" d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9zM14 3v6h6M8 13h8M8 17h6"/>`,
    search: `<circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.6" fill="none"/><path stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M20 20l-3.5-3.5"/>`,
  };
  const renderIcon = (name) => `<svg viewBox="0 0 24 24" class="ico">${ICONS[name] || ""}</svg>`;

  // build palette dom
  const palette = document.createElement("div");
  palette.innerHTML = `
    <div class="cmdk-backdrop" data-cmdk-close></div>
    <div class="cmdk" role="dialog" aria-modal="true" aria-label="Command palette">
      <div class="cmdk-input-wrap">
        <svg viewBox="0 0 24 24">${ICONS.search}</svg>
        <input class="cmdk-input" type="text" placeholder="Type a command or jump to…" autocomplete="off" spellcheck="false" />
        <span class="cmdk-esc">esc</span>
      </div>
      <div class="cmdk-list" role="listbox"></div>
      <div class="cmdk-footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
        <span><kbd>↵</kbd> select</span>
        <span><kbd>esc</kbd> close</span>
      </div>
    </div>
  `;
  document.body.appendChild(palette);

  const backdrop = palette.querySelector(".cmdk-backdrop");
  const dialog   = palette.querySelector(".cmdk");
  const input    = palette.querySelector(".cmdk-input");
  const list     = palette.querySelector(".cmdk-list");
  let selected = 0;
  let filtered = PALETTE_ITEMS;

  const renderList = () => {
    const q = input.value.trim().toLowerCase();
    filtered = q
      ? PALETTE_ITEMS.filter((it) =>
          (it.label + " " + it.keywords + " " + it.group).toLowerCase().includes(q)
        )
      : PALETTE_ITEMS;

    if (!filtered.length) {
      list.innerHTML = `<div class="cmdk-empty">No matches for "<strong>${q}</strong>". Try "projects" or "theme".</div>`;
      return;
    }
    selected = Math.min(selected, filtered.length - 1);

    let last = "";
    list.innerHTML = filtered
      .map((it, i) => {
        const head = it.group !== last ? `<div class="cmdk-group-label">${it.group}</div>` : "";
        last = it.group;
        return (
          head +
          `<button class="cmdk-item" role="option" aria-selected="${i === selected}" data-i="${i}">
            ${renderIcon(it.icon)}
            <span class="label">${it.label}</span>
            <span class="cmdk-meta">${it.meta || "↵"}</span>
          </button>`
        );
      })
      .join("");
  };

  const runItem = (it) => {
    if (!it) return;
    close();
    if (it.action) it.action();
    else if (it.href) {
      if (it.href.startsWith("http") || it.href.startsWith("mailto:")) {
        window.open(it.href, "_blank", "noopener");
      } else {
        navigate(it.href);
      }
    }
  };

  const open = () => {
    backdrop.classList.add("open");
    dialog.classList.add("open");
    input.value = "";
    selected = 0;
    renderList();
    setTimeout(() => input.focus(), 30);
    document.body.style.overflow = "hidden";
  };
  const close = () => {
    backdrop.classList.remove("open");
    dialog.classList.remove("open");
    document.body.style.overflow = "";
  };
  window.__openCmdk = open;

  input.addEventListener("input", () => { selected = 0; renderList(); });
  list.addEventListener("click", (e) => {
    const btn = e.target.closest(".cmdk-item");
    if (btn) runItem(filtered[+btn.dataset.i]);
  });
  list.addEventListener("mousemove", (e) => {
    const btn = e.target.closest(".cmdk-item");
    if (btn) {
      const i = +btn.dataset.i;
      if (i !== selected) {
        selected = i;
        list.querySelectorAll(".cmdk-item").forEach((el, j) =>
          el.setAttribute("aria-selected", j === selected)
        );
      }
    }
  });
  backdrop.addEventListener("click", close);

  // global keyboard
  document.addEventListener("keydown", (e) => {
    const isOpen = dialog.classList.contains("open");
    const inField = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName) ||
                    document.activeElement?.isContentEditable;

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      isOpen ? close() : open();
      return;
    }
    if (!isOpen) {
      if (!inField && e.key.toLowerCase() === "t" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        toggleTheme();
      }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "ArrowDown" || (e.key === "n" && e.ctrlKey)) {
      e.preventDefault();
      selected = (selected + 1) % filtered.length;
      updateSelection();
      return;
    }
    if (e.key === "ArrowUp" || (e.key === "p" && e.ctrlKey)) {
      e.preventDefault();
      selected = (selected - 1 + filtered.length) % filtered.length;
      updateSelection();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      runItem(filtered[selected]);
    }
  });
  const updateSelection = () => {
    const items = list.querySelectorAll(".cmdk-item");
    items.forEach((el, j) => el.setAttribute("aria-selected", j === selected));
    items[selected]?.scrollIntoView({ block: "nearest" });
  };

  // ============== smooth page transitions ==============
  function navigate(href) {
    if (document.startViewTransition) {
      document.startViewTransition(() => (window.location.href = href));
    } else {
      document.body.classList.add("page-leaving");
      setTimeout(() => (window.location.href = href), 180);
    }
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href || a.target === "_blank" || a.hasAttribute("download")) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    try {
      const url = new URL(href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname) return;
    } catch {
      return;
    }
    e.preventDefault();
    navigate(href);
  });

  // ============== skill bars (about page) ==============
  const sbIO = "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.querySelectorAll("[data-fill]").forEach((bar) => {
                bar.style.width = bar.dataset.fill + "%";
              });
            }
          });
        },
        { threshold: 0.2 }
      )
    : null;
  $$(".skill-bars").forEach((el) => sbIO?.observe(el));

  // ============== rotating role text (home) ==============
  const rotator = $(".role-rotator");
  if (rotator) {
    const ROLES = ["AI engineer.", "ML tinkerer.", "Python developer.", "Builder.", "AI engineer."];
    const span = rotator.querySelector("span");
    let i = 0;
    const typeOut = async (text) => {
      span.textContent = "";
      for (let c = 0; c < text.length; c++) {
        span.textContent = text.slice(0, c + 1);
        await sleep(50);
      }
    };
    const typeIn = async (text) => {
      for (let c = text.length; c > 0; c--) {
        span.textContent = text.slice(0, c - 1);
        await sleep(28);
      }
    };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const loop = async () => {
      while (true) {
        const next = ROLES[i % ROLES.length];
        await typeOut(next);
        await sleep(1900);
        await typeIn(next);
        await sleep(220);
        i++;
      }
    };
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) loop();
    else span.textContent = "AI engineer.";
  }

  // ============== projects filter ==============
  const filterBar = $(".filter-bar");
  if (filterBar) {
    filterBar.addEventListener("click", (e) => {
      const chip = e.target.closest(".filter-chip");
      if (!chip) return;
      filterBar.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      const tag = chip.dataset.filter;
      $$(".project-card").forEach((card) => {
        const tags = (card.dataset.tags || "").split(" ");
        card.classList.toggle("hidden", !(tag === "all" || tags.includes(tag)));
      });
    });
  }

  // ============== custom cursor ==============
  const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (hasFinePointer && !reduceMotion) {
    const dot = document.createElement("div");
    const ring = document.createElement("div");
    dot.className = "cursor-dot cursor-hidden";
    ring.className = "cursor-ring cursor-hidden";
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    document.body.classList.add("has-cursor-fx");

    // mouse position (updated every mousemove)
    let mx = -100, my = -100;
    // ring follow position (lerped)
    let rx = -100, ry = -100;
    // smoothed velocity for ring stretch
    let vx = 0, vy = 0;
    let lastSampleT = 0, lastSampleX = -100, lastSampleY = -100;

    const RING_LERP = 0.32; // higher = snappier

    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      // dot is glued to cursor — no lerp, no easing
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      if (dot.classList.contains("cursor-hidden")) {
        dot.classList.remove("cursor-hidden");
        ring.classList.remove("cursor-hidden");
        rx = mx; ry = my;
        lastSampleX = mx; lastSampleY = my;
      }
    };
    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", () => {
      dot.classList.add("cursor-hidden");
      ring.classList.add("cursor-hidden");
    });
    document.addEventListener("mouseenter", () => {
      if (mx >= 0) {
        dot.classList.remove("cursor-hidden");
        ring.classList.remove("cursor-hidden");
      }
    });

    // click → contract both + spawn a ripple at click point
    document.addEventListener("mousedown", (e) => {
      ring.classList.add("clicking");
      dot.classList.add("clicking");
      // ripple
      const r = document.createElement("div");
      r.className = "cursor-ripple";
      r.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 620);
    });
    document.addEventListener("mouseup", () => {
      ring.classList.remove("clicking");
      dot.classList.remove("clicking");
    });

    // ring trails the dot, with velocity-based skew when moving fast
    const trail = (t) => {
      rx += (mx - rx) * RING_LERP;
      ry += (my - ry) * RING_LERP;

      // sample velocity every ~16ms
      if (t - lastSampleT > 16) {
        const ivx = (mx - lastSampleX) * 0.5;
        const ivy = (my - lastSampleY) * 0.5;
        vx = vx * 0.7 + ivx * 0.3;
        vy = vy * 0.7 + ivy * 0.3;
        lastSampleX = mx;
        lastSampleY = my;
        lastSampleT = t;
      }

      // skew based on velocity, clamped — disabled when hovering or clicking
      const isHovering = ring.classList.contains("hovering");
      const isClicking = ring.classList.contains("clicking");
      let skewX = 0, skewY = 0;
      if (!isHovering && !isClicking) {
        const speed = Math.min(28, Math.hypot(vx, vy));
        const f = speed * 0.6;
        skewX = Math.max(-12, Math.min(12, vx * 0.2));
        skewY = Math.max(-12, Math.min(12, vy * 0.2));
        // additionally stretch in direction of motion
        ring.style.borderColor = `color-mix(in srgb, var(--accent) ${Math.round(55 + f * 1.5)}%, transparent)`;
      } else {
        ring.style.borderColor = "";
      }

      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) skew(${skewX}deg, ${skewY}deg)`;
      requestAnimationFrame(trail);
    };
    requestAnimationFrame(trail);

    // hover state
    const interactiveSel = "a, button, [role='button'], input, textarea, select, .att-tok, .embed-canvas, .chat-suggestion, .vs-suggestion, .role-rotator, .filter-chip, .vs-result, label";
    const setHover = (yes) => {
      ring.classList.toggle("hovering", yes);
      dot.classList.toggle("hovering", yes);
    };
    document.addEventListener("mouseover", (e) => {
      setHover(!!e.target.closest(interactiveSel));
    });
    document.addEventListener("mouseout", (e) => {
      if (!e.relatedTarget || !e.relatedTarget.closest?.(interactiveSel)) {
        // only clear when leaving toward something non-interactive
        if (!e.target.closest(interactiveSel)) setHover(false);
      }
    });
  }

  // ============== spotlight on cards ==============
  const spotlightTargets = $$(".project-card, .lab-card, .note-card, .write-card, .principle, .contact-method, .uses-block, .now-block, .vs-result, .cta-block, .skill-col");
  spotlightTargets.forEach((el) => {
    el.classList.add("spotlight");
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });

  // ============== kinetic hero (split into words) ==============
  const kinetic = $(".kinetic");
  if (kinetic && !reduceMotion) {
    const splitNode = (node, baseDelay) => {
      let delay = baseDelay;
      node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const words = child.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          words.forEach((w) => {
            if (!w.trim()) { frag.appendChild(document.createTextNode(w)); return; }
            const mask = document.createElement("span");
            mask.className = "kinetic-mask";
            const span = document.createElement("span");
            span.className = "word";
            span.style.animationDelay = `${delay}ms`;
            span.textContent = w;
            mask.appendChild(span);
            frag.appendChild(mask);
            delay += 80;
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === Node.ELEMENT_NODE && !child.classList.contains("role-rotator") && !child.classList.contains("cursor-blink")) {
          delay = splitNode(child, delay);
        }
      });
      return delay;
    };
    splitNode(kinetic, 100);
  }

  // ============== count-up numbers ==============
  const countTargets = $$(".countup, [data-count]");
  const animateCount = (el, to, opts = {}) => {
    const duration = opts.duration || 1400;
    const decimals = opts.decimals || 0;
    const prefix = opts.prefix || "";
    const suffix = opts.suffix || "";
    const start = performance.now();
    const from = 0;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const e = 1 - Math.pow(1 - t, 3);
      const val = from + (to - from) * e;
      el.textContent = prefix + val.toFixed(decimals) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if ("IntersectionObserver" in window) {
    const countIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const el = e.target;
            const to = parseFloat(el.dataset.count);
            const decimals = parseInt(el.dataset.decimals || "0", 10);
            const prefix = el.dataset.prefix || "";
            const suffix = el.dataset.suffix || "";
            animateCount(el, to, { decimals, prefix, suffix });
            countIO.unobserve(el);
          }
        });
      },
      { threshold: 0.4 }
    );
    countTargets.forEach((el) => countIO.observe(el));
  } else {
    countTargets.forEach((el) => {
      el.textContent = (el.dataset.prefix || "") + el.dataset.count + (el.dataset.suffix || "");
    });
  }

  // ============== live Kathmandu clock ==============
  const clock = $("[data-live-clock]");
  if (clock) {
    const update = () => {
      const now = new Date();
      // Convert to GMT+5:45 (Kathmandu) by computing offset
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const ktm = new Date(utc + (5 * 60 + 45) * 60000);
      const h = ktm.getHours().toString().padStart(2, "0");
      const m = ktm.getMinutes().toString().padStart(2, "0");
      const s = ktm.getSeconds().toString().padStart(2, "0");
      const greeting = h < 5 ? "asleep" : h < 12 ? "good morning" : h < 17 ? "good afternoon" : h < 21 ? "good evening" : "late night";
      clock.innerHTML = `<span class="live-dot" aria-hidden="true"></span>It's <strong>${h}:${m}:${s}</strong> in Kathmandu — ${greeting}`;
    };
    update();
    setInterval(update, 1000);
  }

  // ============== scroll-driven hero parallax ==============
  const hero = $(".home-hero");
  if (hero && !reduceMotion) {
    const onScrollHero = () => {
      hero.style.setProperty("--scroll-y", window.scrollY);
    };
    onScrollHero();
    window.addEventListener("scroll", onScrollHero, { passive: true });
  }

  // ============== help modal (?) ==============
  const helpHtml = `
    <div class="help-modal" id="help-modal" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <h3>Keyboard shortcuts <button onclick="document.getElementById('help-modal').classList.remove('open');document.querySelector('.cmdk-backdrop')?.classList.remove('open');document.body.style.overflow='';">esc</button></h3>
      <h4>Navigation</h4>
      <div class="help-list">
        <div class="row"><span>Open command palette</span><span class="keys"><kbd>⌘</kbd><kbd>K</kbd></span></div>
        <div class="row"><span>Toggle theme</span><span class="keys"><kbd>T</kbd></span></div>
        <div class="row"><span>Show this help</span><span class="keys"><kbd>?</kbd></span></div>
        <div class="row"><span>Close any modal</span><span class="keys"><kbd>Esc</kbd></span></div>
      </div>
      <h4>Inside the palette</h4>
      <div class="help-list">
        <div class="row"><span>Move selection</span><span class="keys"><kbd>↑</kbd><kbd>↓</kbd></span></div>
        <div class="row"><span>Select item</span><span class="keys"><kbd>↵</kbd></span></div>
        <div class="row"><span>Vim-style nav</span><span class="keys"><kbd>Ctrl</kbd><kbd>P</kbd>/<kbd>N</kbd></span></div>
      </div>
      <h4>Surprises</h4>
      <div class="help-list">
        <div class="row"><span>Konami code</span><span class="keys"><kbd>↑↑↓↓←→←→BA</kbd></span></div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", helpHtml);
  const helpModal = $("#help-modal");
  const openHelp = () => {
    $(".cmdk-backdrop")?.classList.add("open");
    helpModal.classList.add("open");
  };
  const closeHelp = () => {
    helpModal.classList.remove("open");
    if (!dialog.classList.contains("open")) $(".cmdk-backdrop")?.classList.remove("open");
  };
  window.__openHelp = openHelp;

  document.addEventListener("keydown", (e) => {
    const inField = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName) ||
                    document.activeElement?.isContentEditable;
    if (!inField && e.key === "?" && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      helpModal.classList.contains("open") ? closeHelp() : openHelp();
    }
    if (e.key === "Escape" && helpModal.classList.contains("open")) {
      closeHelp();
    }
  });
  $(".cmdk-backdrop")?.addEventListener("click", () => {
    if (helpModal.classList.contains("open")) closeHelp();
  });

  // ============== konami easter egg ==============
  const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
  let konIdx = 0;
  document.addEventListener("keydown", (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === KONAMI[konIdx]) {
      konIdx++;
      if (konIdx === KONAMI.length) {
        konIdx = 0;
        triggerKonami();
      }
    } else {
      konIdx = key === KONAMI[0] ? 1 : 0;
    }
  });
  function triggerKonami() {
    document.body.classList.toggle("rainbow");
    burstConfetti(60);
  }

  // ============== confetti ==============
  function burstConfetti(n = 30) {
    const colors = ["#34d399", "#22d3ee", "#fbbf24", "#f472b6", "#a78bfa", "#fb923c"];
    for (let i = 0; i < n; i++) {
      const c = document.createElement("div");
      c.className = "confetti";
      c.style.background = colors[Math.floor(Math.random() * colors.length)];
      c.style.left = window.innerWidth / 2 + "px";
      c.style.top = window.innerHeight / 2 + "px";
      c.style.transform = `translate(-50%, -50%) rotate(${Math.random() * 360}deg)`;
      document.body.appendChild(c);
      const angle = Math.random() * Math.PI * 2;
      const dist = 200 + Math.random() * 400;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 60;
      const rot = Math.random() * 720 - 360;
      const duration = 1200 + Math.random() * 800;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const e = 1 - Math.pow(1 - t, 2);
        c.style.transform = `translate(calc(-50% + ${dx * e}px), calc(-50% + ${dy * e + 200 * t * t}px)) rotate(${rot * e}deg)`;
        c.style.opacity = String(1 - t);
        if (t < 1) requestAnimationFrame(tick);
        else c.remove();
      };
      requestAnimationFrame(tick);
    }
  }
  window.__confetti = burstConfetti;

  // ============== role-rotator pop ==============
  // tiny payoff: clicking the rotating role triggers confetti
  document.addEventListener("click", (e) => {
    if (e.target.closest(".role-rotator")) burstConfetti(20);
  });

  // ============== infinite marquee duplicator ==============
  $$(".marquee-track").forEach((track) => {
    track.innerHTML = track.innerHTML + track.innerHTML;
  });
})();
