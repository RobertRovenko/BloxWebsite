// Blox website shared scripts — interactions

document.addEventListener("DOMContentLoaded", () => {
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

  // Subtle mouse-reactive decorative glow on floating pieces
  const floats = document.querySelectorAll(".piece-float");
  if (floats.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.addEventListener("mousemove", (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      floats.forEach((el, i) => {
        const factor = (i % 2 === 0 ? 1 : -1) * 8;
        const base = el.style.transform || "";
        el.style.translate = `${x * factor}px ${y * factor}px`;
      });
    }, { passive: true });
  }
});