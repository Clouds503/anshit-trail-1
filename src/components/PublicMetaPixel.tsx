import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const META_PIXEL_ID = "1270055731046727";
const PIXEL_SCRIPT_SRC = "https://connect.facebook.net/en_US/fbevents.js";
const MAX_RETRY_ATTEMPTS = 20;
const RETRY_INTERVAL_MS = 250;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: (...args: unknown[]) => void;
  }
}

const ensureMetaPixelScript = () => {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (typeof window.fbq === "function") return;

  const fbq = function (...args: unknown[]) {
    const instance = window.fbq as any;
    if (instance.callMethod) {
      instance.callMethod.apply(instance, args);
    } else {
      instance.queue.push(args);
    }
  } as any;

  if (!window._fbq) window._fbq = fbq;
  window.fbq = fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];

  const script = document.createElement("script");
  script.async = true;
  script.src = PIXEL_SCRIPT_SRC;
  const firstScript = document.getElementsByTagName("script")[0];
  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }

  window.fbq("init", META_PIXEL_ID);
};

const PublicMetaPixel = () => {
  const { pathname, search, hash } = useLocation();
  const firstPageViewHandled = useRef(false);

  useEffect(() => {
    ensureMetaPixelScript();
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    if (!firstPageViewHandled.current) {
      firstPageViewHandled.current = true;
      return;
    }

    const pagePath = `${pathname}${search}${hash}`;
    let attempts = 0;
    const sendPageView = () => {
      if (typeof window.fbq !== "function") return false;
      window.fbq("track", "PageView", {
        page_path: pagePath,
        page_location: window.location.href,
      });
      return true;
    };

    if (sendPageView()) return;

    const timer = window.setInterval(() => {
      attempts += 1;
      if (sendPageView() || attempts >= MAX_RETRY_ATTEMPTS) {
        window.clearInterval(timer);
      }
    }, RETRY_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [pathname, search, hash]);

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  );
};

export default PublicMetaPixel;
