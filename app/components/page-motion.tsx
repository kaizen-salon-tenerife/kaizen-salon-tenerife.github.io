"use client";

import { useEffect } from "react";

export default function PageMotion() {
  useEffect(() => {
    const body = document.body;
    const revealItems = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    const parallaxItems = Array.from(
      document.querySelectorAll<HTMLElement>("[data-parallax]"),
    );
    const progress = document.querySelector<HTMLElement>(".scroll-progress");
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      body.classList.add("motion-reduced", "header-visible");

      return () => {
        body.classList.remove("motion-reduced", "header-visible");
      };
    }

    revealItems.forEach((item) => {
      const bounds = item.getBoundingClientRect();
      if (bounds.top < window.innerHeight * 0.92 && bounds.bottom > 0) {
        item.classList.add("is-visible");
      }
    });

    body.classList.add("motion-enabled", "header-visible");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    revealItems.forEach((item) => observer.observe(item));

    let lastY = window.scrollY;
    let frame = 0;

    const paintScroll = () => {
      const currentY = window.scrollY;
      const documentHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const ratio = documentHeight > 0 ? currentY / documentHeight : 0;

      progress?.style.setProperty(
        "--scroll-progress",
        Math.min(1, Math.max(0, ratio)).toString(),
      );

      body.classList.toggle("header-scrolled", currentY > 70);
      body.classList.toggle(
        "header-visible",
        currentY < 90 || currentY < lastY - 2,
      );

      parallaxItems.forEach((item) => {
        const bounds = item.getBoundingClientRect();
        if (bounds.bottom < -100 || bounds.top > window.innerHeight + 100) {
          return;
        }

        const center = bounds.top + bounds.height / 2;
        const normalized =
          (center - window.innerHeight / 2) / window.innerHeight;
        const strength = item.dataset.parallax === "hero" ? 12 : 16;
        const offset = Math.max(-strength, Math.min(strength, normalized * -strength));
        item.style.setProperty("--parallax-y", `${offset.toFixed(2)}px`);
      });

      lastY = currentY;
      frame = 0;
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(paintScroll);
    };

    paintScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      body.classList.remove(
        "motion-enabled",
        "header-visible",
        "header-scrolled",
      );
      parallaxItems.forEach((item) =>
        item.style.removeProperty("--parallax-y"),
      );
    };
  }, []);

  return <div className="scroll-progress" aria-hidden="true" />;
}
