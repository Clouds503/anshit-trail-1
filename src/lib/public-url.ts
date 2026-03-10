const PATH_ALIAS_MAP: Record<string, string> = {
  "/home": "/",
  "/about-us": "/about",
  "/courses": "/programs",
  "/blogs": "/blog",
  "/privacy-policy": "/privacy",
  "/terms-condition": "/terms",
  "/terms-conditions": "/terms",
  "/terms-and-conditions": "/terms",
  "/terms-of-service": "/terms",
  "/refund-policy": "/refund",
};

export const isInternalRouteHref = (href: string): boolean =>
  href.startsWith("/") && !href.startsWith("//");

export const normalizeInternalRouteHref = (rawHref: string): string => {
  const href = `${rawHref || ""}`.trim();
  if (!href) return "/";
  if (!isInternalRouteHref(href)) return href;

  let path = href;
  if (!path.startsWith("/")) path = `/${path}`;
  path = path.replace(/\/{2,}/g, "/");
  path = path.length > 1 ? path.replace(/\/+$/, "") : path;

  if (/^\/blogs\/[^/]+$/i.test(path)) {
    const slug = path.split("/")[2] || "";
    return `/blog/${slug}`.replace(/\/+$/, "");
  }

  if (/^\/courses\/[^/]+$/i.test(path)) {
    const slug = path.split("/")[2] || "";
    return `/course/${slug}`.replace(/\/+$/, "");
  }

  return PATH_ALIAS_MAP[path] || path;
};
