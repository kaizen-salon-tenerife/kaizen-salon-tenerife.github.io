"use client";

import { useEffect } from "react";

export default function HomeMotion() {
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!("IntersectionObserver" in window)) return;
    const animations = new Set<Animation>();
    let observer: IntersectionObserver | undefined;

    const start = () => {
      observer?.disconnect();
      animations.forEach((animation) => animation.cancel());
      animations.clear();
      if (preference.matches) return;

      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer?.unobserve(entry.target);
          // Content stays visible before hydration and if animation is unavailable.
          const animation = entry.target.animate(
            [{ opacity: 0.75, translate: "0 14px" }, { opacity: 1, translate: "0 0" }],
            { duration: 850, easing: "cubic-bezier(.22, 1, .36, 1)" },
          );
          animations.add(animation);
          animation.onfinish = () => animations.delete(animation);
        });
      }, { threshold: 0.12 });

      document.querySelectorAll(
        ".mb-hero-copy, .mb-hero-art, .mb-section-heading, .mb-service-card, .mb-about-portrait, .mb-about-copy, .mb-reviews-heading, .mb-contact-grid > div",
      ).forEach((element) => observer?.observe(element));
    };

    start();
    preference.addEventListener("change", start);
    return () => {
      observer?.disconnect();
      animations.forEach((animation) => animation.cancel());
      preference.removeEventListener("change", start);
    };
  }, []);

  return null;
}
