import * as React from "react"
import type { Page, SiteSettings } from "@siteinabox/contracts"
import type { ThemeTokenSpec } from "@siteinabox/contracts/generation"
import { cn } from "@siteinabox/ui/lib/utils"
import type { BlockRegistry } from "../../blocks"
import type { MediaResolver } from "../../media"
import { ThemeStyle, themeMode } from "../../theme"
import { AMBLAST_LEGACY_PAGES, resolveAmblastLegacyPageSlug } from "./legacy-html"

export type AmblastPageRendererProps = {
  page: Page
  settings: SiteSettings
  theme?: ThemeTokenSpec | null
  registry?: BlockRegistry
  mediaResolver?: MediaResolver
  formAction?: string
  className?: string
  canvasClassName?: string
  nonce?: string
  includeThemeStyle?: boolean
}

const AMBLAST_BEHAVIOR_SCRIPT = String.raw`
(() => {
  const ROOT_SELECTOR = '[data-legacy-tenant="amblast"]';

  function parseSettings(element, attrName) {
    const raw = element.getAttribute(attrName || "data-settings") || "{}";
    try {
      return JSON.parse(raw.replace(/&quot;/g, '"'));
    } catch {
      return {};
    }
  }

  function asBool(value) {
    if (value === true || value === "yes") return true;
    if (value === false || value === "no" || value === "" || value == null) return false;
    return Boolean(value);
  }

  function revealInvisible(root) {
    const elements = Array.from(root.querySelectorAll(".amb-invisible"));
    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.remove("amb-invisible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const element = entry.target;
        const settings = parseSettings(element, "data-settings");
        const delay = Number(settings._animation_delay || settings.animation_delay || 0);
        window.setTimeout(() => {
          element.classList.remove("amb-invisible");
          const animation = settings._animation || settings.animation;
          if (typeof animation === "string" && animation && animation !== "none") {
            element.classList.add("animated", animation);
          }
        }, Number.isFinite(delay) ? delay : 0);
        observer.unobserve(element);
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -10% 0px" });

    elements.forEach((element) => observer.observe(element));
  }

  function initCarousels(root) {
    root.querySelectorAll(".amb-info-carousel.swiper, .amb-info-carousel.swiper-container, .swiper.amb-info-carousel").forEach((container) => {
      if (container.dataset.amblastCarouselReady === "true") return;
      const wrapper = container.querySelector(".swiper-wrapper");
      const slides = wrapper ? Array.from(wrapper.querySelectorAll(".swiper-slide")) : [];
      if (!wrapper || slides.length <= 1) return;

      container.dataset.amblastCarouselReady = "true";
      const settings = parseSettings(container, "data-slider-settings");
      let index = 0;
      let timer = 0;
      const pagination = container.querySelector(".swiper-pagination");

      wrapper.style.display = "flex";
      wrapper.style.transition = "transform " + Number(settings.speed || 500) + "ms ease";
      slides.forEach((slide) => {
        slide.style.flex = "0 0 100%";
        slide.style.maxWidth = "100%";
      });

      function renderPagination() {
        if (!pagination) return;
        if (!pagination.children.length) {
          slides.forEach((_, slideIndex) => {
            const bullet = document.createElement("button");
            bullet.type = "button";
            bullet.className = "swiper-pagination-bullet";
            bullet.setAttribute("aria-label", "Toon slide " + String(slideIndex + 1));
            bullet.addEventListener("click", () => {
              index = slideIndex;
              update();
            });
            pagination.appendChild(bullet);
          });
        }
        Array.from(pagination.children).forEach((bullet, slideIndex) => {
          bullet.classList.toggle("swiper-pagination-bullet-active", slideIndex === index);
          bullet.setAttribute("aria-current", slideIndex === index ? "true" : "false");
        });
      }

      function update() {
        wrapper.style.transform = "translate3d(" + String(index * -100) + "%, 0, 0)";
        renderPagination();
      }

      function next() {
        index = (index + 1) % slides.length;
        update();
      }

      container.querySelectorAll(".swiper-button-next, [class*='swiper-button-next']").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          next();
        });
      });
      container.querySelectorAll(".swiper-button-prev, [class*='swiper-button-prev']").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          index = (index - 1 + slides.length) % slides.length;
          update();
        });
      });

      if (asBool(settings.autoplay)) {
        timer = window.setInterval(next, Number(settings.autoplay_speed || 3000));
        container.addEventListener("mouseenter", () => window.clearInterval(timer));
        container.addEventListener("mouseleave", () => {
          timer = window.setInterval(next, Number(settings.autoplay_speed || 3000));
        });
      }

      update();
    });
  }

  function initImageComparison(root) {
    root.querySelectorAll('[data-widget_type="amb-compare.default"]').forEach((widget) => {
      if (widget.dataset.amblastCompareReady === "true") return;
      const afterElement = widget.querySelector(".amb-after");
      const handle = widget.querySelector(".amb-compare-handle");
      const container = widget.querySelector(".amb-compare-wrap, .amb-compare") || widget.querySelector("div");
      if (!afterElement || !handle || !container) return;

      widget.dataset.amblastCompareReady = "true";
      let percent = 50;
      let dragging = false;

      function apply() {
        afterElement.style.clipPath = "inset(0 0 0 " + String(percent) + "%)";
        afterElement.style.webkitClipPath = "inset(0 0 0 " + String(percent) + "%)";
        handle.style.left = String(percent) + "%";
      }

      function move(clientX) {
        const rect = container.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
        percent = rect.width > 0 ? (x / rect.width) * 100 : 50;
        apply();
      }

      handle.addEventListener("pointerdown", (event) => {
        dragging = true;
        try {
          handle.setPointerCapture(event.pointerId);
        } catch {}
        move(event.clientX);
        event.preventDefault();
      });
      handle.addEventListener("pointermove", (event) => {
        if (dragging) move(event.clientX);
      });
      handle.addEventListener("pointerup", (event) => {
        dragging = false;
        try {
          handle.releasePointerCapture(event.pointerId);
        } catch {}
      });
      handle.addEventListener("pointercancel", () => {
        dragging = false;
      });
      container.addEventListener("click", (event) => move(event.clientX));
      apply();
    });
  }

  function initMobileMenu(root) {
    root.querySelectorAll(".amb-nav-toggle").forEach((toggle) => {
      if (toggle.dataset.amblastNavReady === "true") return;
      const menu = toggle.parentElement ? toggle.parentElement.querySelector("nav.amb-nav-horizontal") : null;
      toggle.dataset.amblastNavReady = "true";
      toggle.setAttribute("role", "button");
      toggle.setAttribute("tabindex", "0");
      toggle.setAttribute("aria-expanded", "false");
      toggle.style.pointerEvents = "auto";
      toggle.style.cursor = "pointer";

      function setOpen(open) {
        toggle.setAttribute("aria-expanded", String(open));
        toggle.classList.toggle("amb-nav-active", open);
        if (menu) menu.classList.toggle("amb-nav-active", open);
        const icon = toggle.querySelector("i");
        if (icon) {
          icon.classList.toggle("fa-bars", !open);
          icon.classList.toggle("fa-times", open);
        }
      }

      function activate(event) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(toggle.getAttribute("aria-expanded") !== "true");
      }

      toggle.addEventListener("pointerdown", activate);
      toggle.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") activate(event);
      });
      if (menu) {
        menu.addEventListener("click", (event) => {
          if (event.target && event.target.closest("a[href]")) setOpen(false);
        });
      }
    });
  }

  function bootRoot(root) {
    revealInvisible(root);
    initCarousels(root);
    initImageComparison(root);
    initMobileMenu(root);
  }

  function boot() {
    document.querySelectorAll(ROOT_SELECTOR).forEach(bootRoot);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
`

function AmblastBehavior({ nonce }: { nonce?: string }) {
  return (
    <script
      nonce={nonce}
      data-amblast-behavior="site-client"
      dangerouslySetInnerHTML={{ __html: AMBLAST_BEHAVIOR_SCRIPT }}
    />
  )
}

export function AmblastPageRenderer({
  page,
  theme,
  className,
  canvasClassName,
  nonce,
  includeThemeStyle = true,
}: AmblastPageRendererProps) {
  const legacySlug = resolveAmblastLegacyPageSlug(page.slug)
  const legacyPage = AMBLAST_LEGACY_PAGES[legacySlug]

  return (
    <div
      className={cn("site-renderer site-renderer--legacy site-renderer--legacy-amblast", className)}
      data-siab-site-renderer
      data-legacy-tenant="amblast"
      data-amblast-page={legacySlug}
      data-amblast-page-id={legacyPage.pageId}
    >
      {includeThemeStyle && <ThemeStyle theme={theme} nonce={nonce} />}
      <div
        className={cn("rt-canvas w-full", canvasClassName)}
        data-rt-mode={themeMode(theme)}
        data-page-slug={page.slug}
        dangerouslySetInnerHTML={{ __html: legacyPage.html }}
      />
      <AmblastBehavior nonce={nonce} />
    </div>
  )
}
