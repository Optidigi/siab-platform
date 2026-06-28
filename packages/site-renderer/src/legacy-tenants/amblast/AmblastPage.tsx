import * as React from "react"
import type { Block, LinkRef, MediaRef, Page, SiteSettings } from "@siteinabox/contracts"
import type { ThemeTokenSpec } from "@siteinabox/contracts/generation"
import { cn } from "@siteinabox/ui/lib/utils"
import type { BlockRegistry } from "../../blocks"
import type { MediaResolver } from "../../media"
import { resolveMedia } from "../../media"
import { extractRichText } from "../../rich-text"
import { PUBLIC_RENDERER_THEME_SCOPE, ThemeStyle, themeMode } from "../../theme"
import { AMBLAST_LEGACY_PAGES, type AmblastLegacyPageSlug, resolveAmblastLegacyPageSlug } from "./legacy-html"

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

type AmblastEditableSlots = {
  brandName?: string
  headerLogoSrc?: string
  headerLogoSrcset?: string
  footerLogoSrc?: string
  footerLogoSrcset?: string
  headerCtaHtml?: string
  headerCtaLabel?: string
  headerCtaHref?: string
  footerTagline?: string
  footerCopyright?: string
  privacyLabel?: string
  privacyHref?: string
  footerContactHtml?: string
  footerAddressHtml?: string
  footerEmail?: string
  footerEmailHref?: string
  footerPhone?: string
  footerPhoneHref?: string
  footerLegalHtml?: string
  heroTitle?: string
  heroBodyHtml?: string
  heroCtaHtml?: string
  heroCtaLabel?: string
  heroCtaHref?: string
  contactTitle?: string
  contactIntroTitle?: string
  contactIntroSubtitle?: string
  contactBodyHtml?: string
  contactPromptHtml?: string
  contactDirectEmail?: string
  contactDirectEmailHref?: string
  aboutHeroTitle?: string
  aboutIntroHeading?: string
  aboutIntroText?: string
  aboutIntroBodyHtml?: string
  aboutForegroundImageSrc?: string
  aboutValueOneTitle?: string
  aboutValueOneImageSrc?: string
  aboutCtaHtml?: string
  servicesHeroTitle?: string
  serviceOneImageSrc?: string
  serviceOneTitle?: string
  serviceOneBody?: string
  portfolioHeroTitle?: string
  portfolioIntroHeading?: string
  portfolioIntroBodyHtml?: string
  portfolioBeforeOneSrc?: string
  portfolioAfterOneSrc?: string
  portfolioBeforeOneLabel?: string
  portfolioAfterOneLabel?: string
}

type SlotReplacement = {
  name: keyof AmblastEditableSlots
  needle: string
  kind: "text" | "attr" | "href" | "html"
}

const AMBLAST_GENERATED_DEFAULTS = {
  footerAddress: "Heinsbergerweg 172, 6045 CK Roermond",
  contactAddress: "Heinsbergerweg 172 6045 CK Roermond",
  phone: "+31619963651",
  phoneHref: "tel:+31619963651",
  privacyHref: "/privacy",
  aboutIntroBody:
    "Ontstaan vanuit praktijkervaring. Jarenlang werk binnen industriële omgevingen waar we van dichtbij zagen hoe belangrijk grondige reiniging is voor het voorkomen van stilstand en het waarborgen van kwaliteit.",
  serviceOneBody: "Een totaalservice voor onderhoud en reiniging van fabriekshallen of industriële complexen.",
}

const AMBLAST_LEGACY_DEFAULTS = {
  footerAddress: "Heinsbergerweg 172\n6045 CK Roermond",
  contactAddressHtml: "Stationspark 189<br>6042 AX Roermond",
  phone: "+31 6 19 96 36 51",
  aboutIntroBody:
    "Ontstaan vanuit praktijkervaring. Jarenlang werk binnen industriële omgevingen waar we van dichtbij zagen hoe belangrijk grondig reiniging is voor het voorkomen van stilstand en het waarborgen van kwaliteit. Vanuit die ervaring is Amblast gestart, met als doel een schoonmaakbedrijf op te bouwen dat niet draait om mooie woorden, maar om hard werken en resultaat.",
  serviceOneBody:
    "Een totaal service van onderhoud en reiniging van fabriekshallen of industriële complexen. Op aanvraag en overleg kan zelf de verschillende benodigde services samenstellen.",
  logoSrc: "/uploads/logo/cropped-AMBlast_logo.png",
  logoSrcset: "/uploads/logo/cropped-AMBlast_logo.png 714w, /uploads/logo/cropped-AMBlast_logo-300x75.png 300w",
  phoneHref: "tel:0031619963651",
  privacyHref: "#",
}

const AMBLAST_SLOT_REPLACEMENTS: Record<AmblastLegacyPageSlug, SlotReplacement[]> = {
  index: [
    { name: "brandName", needle: "Amblast | Facility Services", kind: "text" },
    { name: "headerLogoSrc", needle: "/uploads/logo/cropped-AMBlast_logo.png", kind: "attr" },
    { name: "headerLogoSrcset", needle: "/uploads/logo/cropped-AMBlast_logo.png 714w, /uploads/logo/cropped-AMBlast_logo-300x75.png 300w", kind: "attr" },
    {
      name: "headerCtaHtml",
      needle:
        '<a class="amb-button amb-button-link amb-size-sm" href="/contact"> <span class="amb-button-inner"> <span class="amb-button-icon"> <i aria-hidden="true" class="far fa-envelope"></i> </span> <span class="amb-button-text">Contact</span> </span> </a>',
      kind: "html",
    },
    { name: "heroTitle", needle: "Specialist in industriële schoonmaak", kind: "text" },
    {
      name: "heroBodyHtml",
      needle:
        "<p>Amblast is dé partner voor industriële reiniging in de papierindustrie en andere productieomgevingen. Wij zorgen dat uw machines, installaties en productieruimtes veilig, hygiënisch en optimaal blijven functioneren</p>",
      kind: "html",
    },
    {
      name: "heroCtaHtml",
      needle:
        '<a class="amb-button amb-button-link amb-size-lg" href="/contact"> <span class="amb-button-inner"> <span class="amb-button-text">Contact</span> </span> </a>',
      kind: "html",
    },
    { name: "footerLogoSrc", needle: "/uploads/logo/cropped-AMBlast_logo.png", kind: "attr" },
    { name: "footerLogoSrcset", needle: "/uploads/logo/cropped-AMBlast_logo.png 714w, /uploads/logo/cropped-AMBlast_logo-300x75.png 300w", kind: "attr" },
    { name: "footerTagline", needle: "Manage your facility", kind: "text" },
    {
      name: "footerContactHtml",
      needle:
        '<p>Heinsbergerweg 172<br>6045 CK Roermond</p><p><a href="mailto:info@amblast.nl">info@amblast.nl</a></p><p><a href="tel:0031619963651">+31 6 19 96 36 51</a></p>',
      kind: "html",
    },
    {
      name: "footerLegalHtml",
      needle: "KvK: 72128690<br>BTW ID: NL002407752B08<br>IBAN: NL45 INGB 0008 6149 44<br>BIC: INGBNL2A",
      kind: "html",
    },
    { name: "footerCopyright", needle: "Copyright © 2026 Amblast", kind: "text" },
    { name: "privacyHref", needle: 'href="#"', kind: "href" },
    { name: "privacyLabel", needle: "Privacy verklaring", kind: "text" },
  ],
  "over-ons": [
    { name: "brandName", needle: "Amblast | Facility Services", kind: "text" },
    {
      name: "headerCtaHtml",
      needle:
        '<a class="amb-button amb-button-link amb-size-sm" href="/contact"> <span class="amb-button-inner"> <span class="amb-button-icon"> <i aria-hidden="true" class="far fa-envelope"></i> </span> <span class="amb-button-text">Contact</span> </span> </a>',
      kind: "html",
    },
    { name: "aboutHeroTitle", needle: '<h1 class="amb-heading amb-size-default">Over ons</h1>', kind: "html" },
    { name: "aboutIntroHeading", needle: '<h2 class="amb-heading amb-size-default">Amblast manages your facility.</h2>', kind: "html" },
    {
      name: "aboutIntroText",
      needle:
        '<div class="amb-heading amb-size-default">Amblast is een familiebedrijf en gespecialiseerd in industriële reiniging. Wij zijn actief in sectoren zoals de papierindustrie en voedingsindustrie, waar schoonmaak onmisbaar is om veilig en efficiënt te kunnen produceren.</div>',
      kind: "html",
    },
    {
      name: "aboutIntroBodyHtml",
      needle:
        "<p>Ontstaan vanuit praktijkervaring. Jarenlang werk binnen industriële omgevingen waar we van dichtbij zagen hoe belangrijk grondig reiniging is voor het voorkomen van stilstand en het waarborgen van kwaliteit. Vanuit die ervaring is Amblast gestart, met als doel een schoonmaakbedrijf op te bouwen dat niet draait om mooie woorden, maar om hard werken en resultaat.</p>",
      kind: "html",
    },
    { name: "aboutForegroundImageSrc", needle: "/uploads/portfolio/IMG_20210723_083536-576x1024.jpg", kind: "attr" },
    { name: "aboutValueOneImageSrc", needle: "/uploads/icons/BANKING-AND-FINANCE-Black-06.png", kind: "attr" },
    { name: "aboutValueOneTitle", needle: "Concurrerende Prijzen", kind: "text" },
    {
      name: "aboutCtaHtml",
      needle:
        '<a class="amb-button amb-button-link amb-size-sm" href="/diensten/"> <span class="amb-button-inner"> <span class="amb-button-text">Diensten</span> </span> </a>',
      kind: "html",
    },
    { name: "footerTagline", needle: "Manage your facility", kind: "text" },
    {
      name: "footerContactHtml",
      needle:
        '<p>Heinsbergerweg 172<br>6045 CK Roermond</p><p><a href="mailto:info@amblast.nl">info@amblast.nl</a></p><p><a href="tel:0031619963651">+31 6 19 96 36 51</a></p>',
      kind: "html",
    },
  ],
  diensten: [
    { name: "brandName", needle: "Amblast | Facility Services", kind: "text" },
    {
      name: "headerCtaHtml",
      needle:
        '<a class="amb-button amb-button-link amb-size-sm" href="/contact"> <span class="amb-button-inner"> <span class="amb-button-icon"> <i aria-hidden="true" class="far fa-envelope"></i> </span> <span class="amb-button-text">Contact</span> </span> </a>',
      kind: "html",
    },
    { name: "servicesHeroTitle", needle: '<h1 class="amb-heading amb-size-default">Onze diensten</h1>', kind: "html" },
    { name: "serviceOneImageSrc", needle: "/uploads/service-cards/003-house.png", kind: "attr" },
    { name: "serviceOneTitle", needle: "<h3 class=\"amb-flipbox-heading\">\nFacility management </h3>", kind: "html" },
    {
      name: "serviceOneBody",
      needle:
        "<div class=\"amb-flipbox-content\">\nEen totaal service van onderhoud en reiniging van fabriekshallen of industriële complexen. Op aanvraag en overleg kan zelf de verschillende benodigde services samenstellen. </div>",
      kind: "html",
    },
    { name: "footerTagline", needle: "Manage your facility", kind: "text" },
    {
      name: "footerContactHtml",
      needle:
        '<p>Heinsbergerweg 172<br>6045 CK Roermond</p><p><a href="mailto:info@amblast.nl">info@amblast.nl</a></p><p><a href="tel:0031619963651">+31 6 19 96 36 51</a></p>',
      kind: "html",
    },
  ],
  portfolio: [
    { name: "brandName", needle: "Amblast | Facility Services", kind: "text" },
    {
      name: "headerCtaHtml",
      needle:
        '<a class="amb-button amb-button-link amb-size-sm" href="/contact"> <span class="amb-button-inner"> <span class="amb-button-icon"> <i aria-hidden="true" class="far fa-envelope"></i> </span> <span class="amb-button-text">Contact</span> </span> </a>',
      kind: "html",
    },
    { name: "portfolioHeroTitle", needle: '<h1 class="amb-heading amb-size-default">Portfolio</h1>', kind: "html" },
    { name: "portfolioIntroHeading", needle: '<h2 class="amb-heading amb-size-default">Hoe we het al meer dan 8 jaar doen</h2>', kind: "html" },
    { name: "portfolioIntroBodyHtml", needle: "<p>Neem hier een kijkje naar het werk dat wij verrichten</p>", kind: "html" },
    { name: "portfolioBeforeOneSrc", needle: "/uploads/portfolio/1-olie-scaled.jpg", kind: "attr" },
    { name: "portfolioAfterOneSrc", needle: "/uploads/portfolio/2-olie-scaled.jpg", kind: "attr" },
    { name: "portfolioBeforeOneLabel", needle: "<span>Voor</span>", kind: "html" },
    { name: "portfolioAfterOneLabel", needle: "<span>Na</span>", kind: "html" },
    { name: "footerTagline", needle: "Manage your facility", kind: "text" },
    {
      name: "footerContactHtml",
      needle:
        '<p>Heinsbergerweg 172<br>6045 CK Roermond</p><p><a href="mailto:info@amblast.nl">info@amblast.nl</a></p><p><a href="tel:0031619963651">+31 6 19 96 36 51</a></p>',
      kind: "html",
    },
  ],
  contact: [
    { name: "brandName", needle: "Amblast | Facility Services", kind: "text" },
    { name: "headerLogoSrc", needle: "/uploads/logo/cropped-AMBlast_logo.png", kind: "attr" },
    { name: "headerLogoSrcset", needle: "/uploads/logo/cropped-AMBlast_logo.png 714w, /uploads/logo/cropped-AMBlast_logo-300x75.png 300w", kind: "attr" },
    {
      name: "headerCtaHtml",
      needle:
        '<a class="amb-button amb-button-link amb-size-sm" href="/contact"> <span class="amb-button-inner"> <span class="amb-button-icon"> <i aria-hidden="true" class="far fa-envelope"></i> </span> <span class="amb-button-text">Contact</span> </span> </a>',
      kind: "html",
    },
    { name: "contactTitle", needle: '<h1 class="amb-heading amb-size-default">Contact</h1>', kind: "html" },
    { name: "contactIntroTitle", needle: '<h2 class="amb-heading amb-size-default">Neem gerust contact op</h2>', kind: "html" },
    { name: "contactIntroSubtitle", needle: '<h2 class="amb-heading amb-size-default">Contact</h2>', kind: "html" },
    {
      name: "contactBodyHtml",
      needle:
        "<p>Stationspark 189<br>6042 AX Roermond</p><p><a href=\"mailto:info@amblast.nl\">info@amblast.nl</a></p><p><a href=\"tel:0031619963651\">+31 6 19 96 36 51</a></p><p>KvK: 72128690<br>BTW ID: NL002407752B08<br>IBAN: NL45 INGB 0008 6149 44<br>BIC: INGBNL2A</p>",
      kind: "html",
    },
    {
      name: "contactPromptHtml",
      needle: "<p>Neem gerust contact met ons op en wij zoeken de beste optie voor u en uw project.</p>",
      kind: "html",
    },
    { name: "contactDirectEmailHref", needle: 'href="mailto:info@amblast.nl"', kind: "href" },
    { name: "contactDirectEmail", needle: "info@amblast.nl", kind: "text" },
    { name: "footerLogoSrc", needle: "/uploads/logo/cropped-AMBlast_logo.png", kind: "attr" },
    { name: "footerLogoSrcset", needle: "/uploads/logo/cropped-AMBlast_logo.png 714w, /uploads/logo/cropped-AMBlast_logo-300x75.png 300w", kind: "attr" },
    { name: "footerTagline", needle: "Manage your facility", kind: "text" },
    {
      name: "footerContactHtml",
      needle:
        '<p>Heinsbergerweg 172<br>6045 CK Roermond</p><p><a href="mailto:info@amblast.nl">info@amblast.nl</a></p><p><a href="tel:0031619963651">+31 6 19 96 36 51</a></p>',
      kind: "html",
    },
    {
      name: "footerLegalHtml",
      needle: "KvK: 72128690<br>BTW ID: NL002407752B08<br>IBAN: NL45 INGB 0008 6149 44<br>BIC: INGBNL2A",
      kind: "html",
    },
    { name: "footerCopyright", needle: "Copyright © 2026 Amblast", kind: "text" },
    { name: "privacyHref", needle: 'href="#"', kind: "href" },
    { name: "privacyLabel", needle: "Privacy verklaring", kind: "text" },
  ],
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/`/g, "&#96;")
}

function textToParagraphHtml(value: string): string {
  const lines = value.split(/\r?\n/)
  return `<p>${lines.map((line) => escapeHtml(line)).join("<br>")}</p>`
}

function headingHtml(level: 1 | 2 | 3, className: string, value: string): string {
  return `<h${level} class="${className}">${escapeHtml(value)}</h${level}>`
}

function divHtml(className: string, value: string): string {
  return `<div class="${className}">${escapeHtml(value)}</div>`
}

function amblastButtonHtml(label: string | null | undefined, href: string | null | undefined): string | undefined {
  if (!label || !href) return undefined
  return `<a class="amb-button amb-button-link amb-size-sm" href="${escapeAttr(href)}"> <span class="amb-button-inner"> <span class="amb-button-text">${escapeHtml(label)}</span> </span> </a>`
}

function headerCtaHtml(label: string | null | undefined, href: string | null | undefined): string | undefined {
  if (!label || !href) return undefined
  return `<a class="amb-button amb-button-link amb-size-sm" href="${escapeAttr(href)}"> <span class="amb-button-inner"> <span class="amb-button-icon"> <i aria-hidden="true" class="far fa-envelope"></i> </span> <span class="amb-button-text">${escapeHtml(label)}</span> </span> </a>`
}

function heroCtaHtml(label: string | null | undefined, href: string | null | undefined): string | undefined {
  if (!label || !href) return undefined
  return `<a class="amb-button amb-button-link amb-size-lg" href="${escapeAttr(href)}"> <span class="amb-button-inner"> <span class="amb-button-text">${escapeHtml(label)}</span> </span> </a>`
}

function serviceFlipboxTitleHtml(value: string): string {
  return `<h3 class="amb-flipbox-heading">\n${escapeHtml(value)} </h3>`
}

function serviceFlipboxBodyHtml(value: string): string {
  return `<div class="amb-flipbox-content">\n${escapeHtml(value)} </div>`
}

function spanHtml(value: string): string {
  return `<span>${escapeHtml(value)}</span>`
}

function multilineHtml(value: string): string {
  return value.split(/\r?\n/).map(escapeHtml).join("<br>")
}

function collectText(node: unknown): string {
  if (!node || typeof node !== "object") return ""
  const current = node as { t?: string; v?: unknown; children?: unknown[] }
  if (current.t === "text") return typeof current.v === "string" ? current.v : ""
  return Array.isArray(current.children) ? current.children.map(collectText).join("") : ""
}

function richTextParts(value: unknown): Array<{ kind: "heading" | "paragraph"; text: string }> {
  if (!value || typeof value !== "object") return []
  const root = value as { variant?: string; children?: unknown[] }
  if (root.variant !== "block" || !Array.isArray(root.children)) return []
  return root.children.flatMap((child) => {
    if (!child || typeof child !== "object") return []
    const block = child as { t?: string }
    if (block.t !== "heading" && block.t !== "paragraph") return []
    const text = collectText(block).replace(/\s+/g, " ").trim()
    return text ? [{ kind: block.t, text }] : []
  })
}

function linkHref(link: LinkRef | null | undefined): string | undefined {
  return typeof link?.href === "string" && link.href.trim() ? link.href.trim() : undefined
}

function mediaSrc(media: MediaRef | null | undefined, mediaResolver?: MediaResolver): string | undefined {
  if (!media) return undefined
  return resolveMedia(media, mediaResolver)?.src
}

function firstBlock<T extends Block["blockType"]>(page: Page, blockType: T): Extract<Block, { blockType: T }> | undefined {
  return page.blocks.find((block): block is Extract<Block, { blockType: T }> => block.blockType === blockType)
}

function exactDefaultAware(value: string | undefined, generatedDefault: string, legacyDefault: string): string | undefined {
  if (!value) return undefined
  return value === generatedDefault ? legacyDefault : value
}

function nonNull<T>(value: T | null | undefined): value is T {
  return value != null
}

function startsWithHref(prefix: string) {
  return (link: LinkRef | null | undefined): link is LinkRef & { href: string } =>
    typeof link?.href === "string" && link.href.startsWith(prefix)
}

function buildAmblastEditableSlots(page: Page, settings: SiteSettings, mediaResolver?: MediaResolver): AmblastEditableSlots {
  const logo = settings.chrome?.header?.logo ?? settings.branding?.logo
  const logoSrc = mediaSrc(logo, mediaResolver)
  const footerLogoSrc = mediaSrc(settings.chrome?.footer?.logo ?? logo, mediaResolver)
  const headerCta = settings.chrome?.header?.cta
  const footerColumnItems = settings.chrome?.footer?.columns?.flatMap((column) => column.items).filter(nonNull) ?? []
  const footerContact = footerColumnItems.find((item) => item.type === "contact")
  const footerBusiness = footerColumnItems.find((item) => item.type === "business")
  const footerAddress = exactDefaultAware(
    footerContact?.text ?? settings.contact?.address ?? undefined,
    AMBLAST_GENERATED_DEFAULTS.footerAddress,
    AMBLAST_LEGACY_DEFAULTS.footerAddress,
  )
  const footerEmail = settings.contactEmail ?? footerContact?.links?.find(startsWithHref("mailto:"))?.label ?? undefined
  const footerPhone = exactDefaultAware(
    settings.contact?.phone ?? footerContact?.links?.find(startsWithHref("tel:"))?.label ?? undefined,
    AMBLAST_GENERATED_DEFAULTS.phone,
    AMBLAST_LEGACY_DEFAULTS.phone,
  )
  const footerPhoneLink = footerContact?.links?.find(startsWithHref("tel:"))?.href
  const legalLink = settings.chrome?.footer?.legalLinks?.[0]
  const mediaHero = firstBlock(page, "mediaHero")
  const contactDetails = firstBlock(page, "contactDetails")
  const contactSection = firstBlock(page, "contactSection")
  const richText = firstBlock(page, "richText")
  const infoCardList = firstBlock(page, "infoCardList")
  const serviceCarousel = firstBlock(page, "serviceCarousel")
  const beforeAfterGallery = firstBlock(page, "beforeAfterGallery")
  const ctaBlock = firstBlock(page, "cta")
  const richParts = richTextParts(richText?.body)
  const firstHeading = richParts.find((part) => part.kind === "heading")?.text
  const firstParagraph = richParts.find((part) => part.kind === "paragraph")?.text
  const secondParagraph = richParts.filter((part) => part.kind === "paragraph")[1]?.text
  const aboutIntroBody = exactDefaultAware(
    secondParagraph,
    AMBLAST_GENERATED_DEFAULTS.aboutIntroBody,
    AMBLAST_LEGACY_DEFAULTS.aboutIntroBody,
  )
  const firstInfoCard = infoCardList?.items[0]
  const firstService = serviceCarousel?.items[0]
  const firstServiceBody = exactDefaultAware(
    firstService?.description ? extractRichText(firstService.description) : undefined,
    AMBLAST_GENERATED_DEFAULTS.serviceOneBody,
    AMBLAST_LEGACY_DEFAULTS.serviceOneBody,
  )
  const firstComparison = beforeAfterGallery?.pairs[0]
  const footerContactHref = footerEmail ? `mailto:${footerEmail}` : undefined
  const footerPhoneHref = exactDefaultAware(footerPhoneLink, AMBLAST_GENERATED_DEFAULTS.phoneHref, AMBLAST_LEGACY_DEFAULTS.phoneHref)
  const footerContactHtml =
    footerAddress && footerEmail && footerContactHref && footerPhone && footerPhoneHref
      ? `<p>${multilineHtml(footerAddress)}</p><p><a href="${escapeAttr(footerContactHref)}">${escapeHtml(footerEmail)}</a></p><p><a href="${escapeAttr(footerPhoneHref)}">${escapeHtml(footerPhone)}</a></p>`
      : undefined

  const contactAddress = contactDetails?.items.find((item) => item.kind === "address")
  const contactEmail = contactDetails?.items.find((item) => item.kind === "email")
  const contactPhone = contactDetails?.items.find((item) => item.kind === "phone")
  const contactLegal = contactDetails?.legal
  const contactAddressText = contactAddress ? extractRichText(contactAddress.value) : undefined
  const contactAddressHtml =
    contactAddressText === AMBLAST_GENERATED_DEFAULTS.contactAddress
      ? AMBLAST_LEGACY_DEFAULTS.contactAddressHtml
      : contactAddressText
        ? multilineHtml(contactAddressText)
        : AMBLAST_LEGACY_DEFAULTS.contactAddressHtml

  const contactLines = [
    contactAddressHtml,
    contactEmail ? `<a href="${escapeAttr(contactEmail.href ?? `mailto:${extractRichText(contactEmail.value)}`)}">${escapeHtml(extractRichText(contactEmail.value))}</a>` : undefined,
    contactPhone
      ? `<a href="${escapeAttr(exactDefaultAware(contactPhone.href ?? undefined, AMBLAST_GENERATED_DEFAULTS.phoneHref, AMBLAST_LEGACY_DEFAULTS.phoneHref) ?? "")}">${escapeHtml(extractRichText(contactPhone.value))}</a>`
      : undefined,
    contactLegal
      ? multilineHtml(
          [
            contactLegal.kvkNumber ? `KvK: ${contactLegal.kvkNumber}` : "",
            contactLegal.btwId ? `BTW ID: ${contactLegal.btwId}` : "",
            contactLegal.iban ? `IBAN: ${contactLegal.iban}` : "",
            contactLegal.bic ? `BIC: ${contactLegal.bic}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        )
      : undefined,
  ].filter(Boolean)

  return {
    brandName: settings.siteName,
    headerLogoSrc: logoSrc,
    headerLogoSrcset: logoSrc ? `${logoSrc} 714w, ${logoSrc.replace(/(\.[a-z0-9]+)$/i, "-300x75$1")} 300w` : undefined,
    footerLogoSrc,
    footerLogoSrcset: footerLogoSrc ? `${footerLogoSrc} 714w, ${footerLogoSrc.replace(/(\.[a-z0-9]+)$/i, "-300x75$1")} 300w` : undefined,
    headerCtaHtml: headerCtaHtml(headerCta?.label, headerCta?.href),
    headerCtaLabel: headerCta?.label ?? undefined,
    headerCtaHref: linkHref(headerCta),
    footerTagline: settings.chrome?.footer?.tagline ?? undefined,
    footerCopyright: settings.chrome?.footer?.copyright ?? undefined,
    privacyLabel: legalLink?.label ?? undefined,
    privacyHref: exactDefaultAware(legalLink?.href ?? undefined, AMBLAST_GENERATED_DEFAULTS.privacyHref, AMBLAST_LEGACY_DEFAULTS.privacyHref),
    footerContactHtml,
    footerAddressHtml: footerAddress ? multilineHtml(footerAddress) : undefined,
    footerEmail,
    footerEmailHref: footerContactHref,
    footerPhone,
    footerPhoneHref,
    footerLegalHtml: footerBusiness?.text ? multilineHtml(footerBusiness.text) : undefined,
    heroTitle: mediaHero ? extractRichText(mediaHero.headline) : undefined,
    heroBodyHtml: mediaHero?.subheadline ? textToParagraphHtml(extractRichText(mediaHero.subheadline)) : undefined,
    heroCtaHtml: heroCtaHtml(mediaHero?.cta?.label, mediaHero?.cta?.href),
    heroCtaLabel: mediaHero?.cta?.label ?? undefined,
    heroCtaHref: linkHref(mediaHero?.cta),
    contactTitle: mediaHero ? headingHtml(1, "amb-heading amb-size-default", extractRichText(mediaHero.headline)) : undefined,
    contactIntroTitle: contactDetails?.title ? headingHtml(2, "amb-heading amb-size-default", extractRichText(contactDetails.title)) : undefined,
    contactIntroSubtitle: contactDetails?.intro ? headingHtml(2, "amb-heading amb-size-default", extractRichText(contactDetails.intro)) : undefined,
    contactBodyHtml: contactLines.length ? contactLines.map((line) => `<p>${line}</p>`).join("") : undefined,
    contactPromptHtml: contactSection?.description ? textToParagraphHtml(extractRichText(contactSection.description)) : undefined,
    contactDirectEmail: settings.contactEmail ?? undefined,
    contactDirectEmailHref: settings.contactEmail ? `mailto:${settings.contactEmail}` : undefined,
    aboutHeroTitle: mediaHero ? headingHtml(1, "amb-heading amb-size-default", extractRichText(mediaHero.headline)) : undefined,
    aboutIntroHeading: firstHeading ? headingHtml(2, "amb-heading amb-size-default", firstHeading) : undefined,
    aboutIntroText: firstParagraph ? divHtml("amb-heading amb-size-default", firstParagraph) : undefined,
    aboutIntroBodyHtml: aboutIntroBody ? textToParagraphHtml(aboutIntroBody) : undefined,
    aboutForegroundImageSrc: mediaSrc(mediaHero?.foregroundImage, mediaResolver),
    aboutValueOneTitle: firstInfoCard ? extractRichText(firstInfoCard.title) : undefined,
    aboutValueOneImageSrc: mediaSrc(firstInfoCard?.image, mediaResolver),
    aboutCtaHtml: amblastButtonHtml(ctaBlock?.primary?.label, ctaBlock?.primary?.href),
    servicesHeroTitle: mediaHero ? headingHtml(1, "amb-heading amb-size-default", extractRichText(mediaHero.headline)) : undefined,
    serviceOneImageSrc: mediaSrc(firstService?.image, mediaResolver),
    serviceOneTitle: firstService ? serviceFlipboxTitleHtml(extractRichText(firstService.title)) : undefined,
    serviceOneBody: firstServiceBody ? serviceFlipboxBodyHtml(firstServiceBody) : undefined,
    portfolioHeroTitle: mediaHero ? headingHtml(1, "amb-heading amb-size-default", extractRichText(mediaHero.headline)) : undefined,
    portfolioIntroHeading: firstHeading ? headingHtml(2, "amb-heading amb-size-default", firstHeading) : undefined,
    portfolioIntroBodyHtml: firstParagraph ? textToParagraphHtml(firstParagraph) : undefined,
    portfolioBeforeOneSrc: mediaSrc(firstComparison?.before, mediaResolver),
    portfolioAfterOneSrc: mediaSrc(firstComparison?.after, mediaResolver),
    portfolioBeforeOneLabel: firstComparison?.beforeLabel ? spanHtml(firstComparison.beforeLabel) : undefined,
    portfolioAfterOneLabel: firstComparison?.afterLabel ? spanHtml(firstComparison.afterLabel) : undefined,
  }
}

function applyAmblastEditableSlots(html: string, slug: AmblastLegacyPageSlug, slots: AmblastEditableSlots): string {
  let output = html
  // First-match replacement is intentional: every editable slot has a typed value,
  // an escaped renderer-built payload, and an ordered/contextual legacy needle.
  // Tests cover CTA ordering, footer placement, and escaped text/attribute input.
  for (const replacement of AMBLAST_SLOT_REPLACEMENTS[slug]) {
    const value = slots[replacement.name]
    if (!value) continue
    const escaped =
      replacement.kind === "html"
        ? value
        : replacement.kind === "attr"
          ? escapeAttr(value)
          : replacement.kind === "href"
            ? `href="${escapeAttr(value)}"`
            : escapeHtml(value)
    output = output.replace(replacement.needle, escaped)
  }
  return output
}

export function AmblastPageRenderer({
  page,
  settings,
  mediaResolver,
  theme,
  className,
  canvasClassName,
  nonce,
  includeThemeStyle = true,
}: AmblastPageRendererProps) {
  const legacySlug = resolveAmblastLegacyPageSlug(page.slug)
  const legacyPage = AMBLAST_LEGACY_PAGES[legacySlug]
  const html = applyAmblastEditableSlots(legacyPage.html, legacySlug, buildAmblastEditableSlots(page, settings, mediaResolver))

  return (
    <div
      className={cn("site-renderer site-renderer--legacy site-renderer--legacy-amblast", className)}
      data-siab-site-renderer
      data-legacy-tenant="amblast"
      data-amblast-page={legacySlug}
      data-amblast-page-id={legacyPage.pageId}
    >
      {includeThemeStyle && <ThemeStyle theme={theme} nonce={nonce} scope={PUBLIC_RENDERER_THEME_SCOPE} />}
      <div
        className={cn("rt-canvas w-full", canvasClassName)}
        data-rt-mode={themeMode(theme)}
        data-page-slug={page.slug}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <AmblastBehavior nonce={nonce} />
    </div>
  )
}
