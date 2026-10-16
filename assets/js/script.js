// Blox website shared scripts — interactions

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

  // Subtle mouse-reactive decorative movement on floating pieces
  // (desktop / fine-pointer only, throttled to one update per frame)
  const floats = document.querySelectorAll(".piece-float");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  if (floats.length && !reducedMotion && finePointer) {
    let pending = false;
    let lastEvent = null;
    document.addEventListener("mousemove", (e) => {
      lastEvent = e;
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        const ev = lastEvent;
        if (ev) {
          const x = (ev.clientX / window.innerWidth - 0.5) * 2;
          const y = (ev.clientY / window.innerHeight - 0.5) * 2;
          floats.forEach((el, i) => {
            const factor = (i % 2 === 0 ? 1 : -1) * 8;
            el.style.translate = `${x * factor}px ${y * factor}px`;
          });
        }
        pending = false;
      });
    }, { passive: true });
  }
});