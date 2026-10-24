// BloxBreak! shared scripts — interactions

document.addEventListener("DOMContentLoaded", () => {
  // Mobile navbar toggle
  const navToggle = document.getElementById("nav-toggle");
  const siteNav = document.getElementById("site-nav");
  if (navToggle && siteNav) {
    navToggle.addEventListener("click", () => {
      const open = siteNav.classList.toggle("is-open");
      document.body.classList.toggle("nav-open", open);
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.innerHTML = open ? "&#10005;" : "&#9776;";
    });
    siteNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        siteNav.classList.remove("is-open");
        document.body.classList.remove("nav-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.innerHTML = "&#9776;";
      });
    });
  }

  // Reveal on scroll for cards
  const revealTargets = document.querySelectorAll(".piece-card, .feature-card, .step-card");
  if (revealTargets.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("is-visible"));
  }

  // Interactive hero blocks.
  //
  // The blocks are SVG groups, so their transforms are in *user units* - a
  // fixed shift there looks big on desktop and nearly invisible on a phone
  // (the SVG is scaled down ~2.7x). Everything below is therefore computed
  // in screen pixels and converted back into user units, so the effect
  // feels identical on every device.
  //
  // Each block carries a `data-depth` (0 = far, 1 = near). The pointer:
  //   1. pushes blocks away from the cursor, falling off with distance
  //   2. shifts every block by depth, for a parallax feel
  //   3. tilts blocks slightly, as if they have weight
  //   4. scales up the single block nearest the cursor
  //
  // Only the art direction currently on screen is driven, so the hidden
  // SVG (desktop or mobile) stays at rest.
  //
  // The pointer type is detected from the events themselves rather than from
  // a media query: `(hover: hover) and (pointer: fine)` reports the *primary*
  // pointer, so it is false on touchscreen laptops, tablets in desktop mode
  // and some Wayland setups - which silently disabled the whole effect.
  // Reacting to real mouse/pen movement works everywhere.
  //
  // Disabled for reduced-motion users.
  const heroStage = document.querySelector(".hero-art-wrap");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (heroStage && !reducedMotion) {
    const REACH = 260;   // px - how far a block reacts to the cursor
    const PUSH = 46;     // px - how far a block is pushed at its centre
    const DRIFT = 30;    // px - depth-parallax across the stage
    const TILT = 7;      // deg - maximum rotation
    const LIFT = 0.075;  // scale added to the nearest block

    let pending = false;
    let lastEvent = null;
    let blocks = [];      // blocks of the art direction on screen
    let centres = [];     // their centres, in stage-relative screen pixels
    let unit = 1;         // screen px per svg user unit

    const sync = () => {
      // the art direction that is actually visible
      const svg = Array.from(heroStage.querySelectorAll(".hero-svg")).find(
        (s) => s.getBoundingClientRect().width > 0
      );
      if (!svg) {
        blocks = [];
        centres = [];
        return;
      }
      blocks = Array.from(svg.querySelectorAll(".hero-block"));
      const rect = heroStage.getBoundingClientRect();
      unit = rect.width / svg.viewBox.baseVal.width || 1;
      centres = blocks.map((b) => {
        const r = b.getBoundingClientRect();
        return { x: r.left + r.width / 2 - rect.left, y: r.top + r.height / 2 - rect.top };
      });
    };

    const apply = () => {
      pending = false;
      const ev = lastEvent;
      if (!ev || !blocks.length) return;
      const rect = heroStage.getBoundingClientRect();

      const px = ev.clientX - rect.left;
      const py = ev.clientY - rect.top;
      // normalised pointer position across the stage
      const nx = (px / rect.width - 0.5) * 2;
      const ny = (py / rect.height - 0.5) * 2;

      // first pass: work out which block is nearest
      let nearestIndex = -1;
      let nearestDist = Infinity;
      const falls = blocks.map((b, i) => {
        const c = centres[i];
        if (!c) return 0;
        const d = Math.hypot(c.x - px, c.y - py);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIndex = i;
        }
        const near = Math.max(0, 1 - d / REACH);
        return near * near;
      });

      blocks.forEach((block, i) => {
        const depth = parseFloat(block.dataset.depth) || 0;
        const c = centres[i];
        if (!c) return;
        const falloff = falls[i];

        // 1. push away from the cursor, with distance falloff
        const dx = c.x - px;
        const dy = c.y - py;
        const dist = Math.hypot(dx, dy);
        let ox = 0;
        let oy = 0;
        if (dist > 0.001) {
          ox = (dx / dist) * PUSH * falloff;
          oy = (dy / dist) * PUSH * falloff;
        }

        // 2. depth parallax
        ox += nx * DRIFT * depth;
        oy += ny * DRIFT * depth;

        // 3. tilt, as if the block has weight
        const rot = (ox / PUSH) * TILT * depth;

        // 4. only the nearest block lifts
        const scale = i === nearestIndex ? 1 + falls[i] * LIFT : 1;

        block.style.setProperty("--px", `${(ox / unit).toFixed(2)}px`);
        block.style.setProperty("--py", `${(oy / unit).toFixed(2)}px`);
        block.style.setProperty("--rot", `${rot.toFixed(2)}deg`);
        block.style.setProperty("--sc", scale.toFixed(3));
      });

      // spotlight follows the cursor
      heroStage.style.setProperty("--mx", `${px}px`);
      heroStage.style.setProperty("--my", `${py}px`);
      heroStage.classList.add("is-lit");
    };

    const settle = () => {
      for (const block of blocks) {
        block.style.setProperty("--px", "0px");
        block.style.setProperty("--py", "0px");
        block.style.setProperty("--rot", "0deg");
        block.style.setProperty("--sc", "1");
      }
      heroStage.classList.remove("is-lit");
    };

    sync();
    // re-measure on resize (the art direction may swap, changing the scale)
    let resizePending = false;
    window.addEventListener(
      "resize",
      () => {
        if (resizePending) return;
        resizePending = true;
        requestAnimationFrame(() => {
          resizePending = false;
          sync();
          if (lastEvent) apply();
        });
      },
      { passive: true }
    );

    // React to mouse and pen movement. Touch is ignored: there is no cursor to
    // follow, and dragging the page would set the blocks off-centre.
    const onMove = (e) => {
      if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      lastEvent = e;
      if (pending) return;
      pending = true;
      requestAnimationFrame(apply);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    // Browsers without Pointer Events still fire mousemove.
    document.addEventListener("mousemove", (e) => {
      if (window.PointerEvent) return; // pointermove already covers this
      onMove(e);
    }, { passive: true });

    // settle the blocks when the cursor leaves
    document.addEventListener("mouseleave", () => {
      lastEvent = null;
      settle();
    });
  }
});
