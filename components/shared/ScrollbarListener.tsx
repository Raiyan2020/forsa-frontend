"use client";

import { useEffect } from "react";

export default function ScrollbarListener() {
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = (event: Event) => {
      const target = event.target;

      if (target === document) {
        document.documentElement.classList.add("is-scrolling");
        document.body.classList.add("is-scrolling");
      } else if (target instanceof HTMLElement) {
        target.classList.add("is-scrolling");
      }

      // Clear previous timeout and set a new one to hide the scrollbar
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        document.documentElement.classList.remove("is-scrolling");
        document.body.classList.remove("is-scrolling");

        // Remove from all elements with the class
        const scrollingElements = document.querySelectorAll(".is-scrolling");
        scrollingElements.forEach((el) => el.classList.remove("is-scrolling"));
      }, 1000); // Hide after 1 second of scroll inactivity
    };

    // Use capture phase (true) to capture scroll events from any nested container
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      clearTimeout(scrollTimeout);
    };
  }, []);

  return null;
}
