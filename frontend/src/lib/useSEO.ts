import { useEffect } from "react";

const SITE_NAME = "Kisher.Shop";
const DEFAULT_DESCRIPTION =
  "Bangladesh's trusted digital marketplace for game keys, gift cards, mobile top-ups, game accounts, and boosting services. Instant delivery, bKash & Nagad payments, 24/7 support.";

interface SEOOptions {
  /** Page-specific title (without site name suffix). */
  title?: string;
  /** Page-specific meta description. */
  description?: string;
  /** Canonical URL path, e.g. "/category/pubg". */
  path?: string;
  /** Optional: set type for OG. Defaults to "website". */
  type?: "website" | "article" | "product";
  /** Optional: set to true to tell crawlers not to index this page. */
  noindex?: boolean;
}

const BASE_URL = "https://kisher.shop";

/**
 * Updates document title and meta tags per page.
 * Title format: "<Page Title> — Kisher.Shop" (or just "Kisher.Shop" for home).
 * Restores defaults on unmount so stale tags don't leak between pages.
 */
export function useSEO({ title, description, path, type = "website", noindex = false }: SEOOptions = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Buy Game Keys, Gift Cards & Top-Ups in Bangladesh`;
    const desc = description || DEFAULT_DESCRIPTION;
    const canonical = path ? `${BASE_URL}${path}` : `${BASE_URL}/`;
    const robotsContent = noindex
      ? "noindex, nofollow"
      : "index, follow, max-image-preview:large";

    document.title = fullTitle;
    setMeta("description", desc);
    setMeta("robots", robotsContent);
    setLink("canonical", canonical);

    // Open Graph
    setProp("og:title", fullTitle);
    setProp("og:description", desc);
    setProp("og:url", canonical);
    setProp("og:type", type);

    // Twitter
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", desc);

    // Dark theme color stays consistent
    setMeta("theme-color", "#0f172a");

    return () => {
      const homeTitle = `${SITE_NAME} — Buy Game Keys, Gift Cards & Top-Ups in Bangladesh`;
      document.title = homeTitle;
      setMeta("description", DEFAULT_DESCRIPTION);
      setMeta("robots", "index, follow, max-image-preview:large");
      setLink("canonical", `${BASE_URL}/`);
      setProp("og:title", homeTitle);
      setProp("og:description", DEFAULT_DESCRIPTION);
      setProp("og:url", `${BASE_URL}/`);
      setProp("og:type", "website");
      setMeta("twitter:title", homeTitle);
      setMeta("twitter:description", DEFAULT_DESCRIPTION);
    };
  }, [title, description, path, type, noindex]);
}

function setMeta(name: string, content: string) {
  let el = document.head.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setProp(property: string, content: string) {
  let el = document.head.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}
