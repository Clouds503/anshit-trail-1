import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const GA_MEASUREMENT_IDS = ["G-ZKJ801DZNX", "G-C0V417G1PH"];
const MAX_RETRY_ATTEMPTS = 20;
const RETRY_INTERVAL_MS = 250;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const PublicPageAnalytics = () => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    const pagePath = `${pathname}${search}${hash}`;
    let attempts = 0;
    const dispatchPageView = () => {
      if (typeof window.gtag !== "function") return false;
      GA_MEASUREMENT_IDS.forEach((measurementId) => {
        window.gtag?.("config", measurementId, {
          page_path: pagePath,
          page_location: window.location.href,
          page_title: document.title,
        });
      });
      return true;
    };

    if (dispatchPageView()) return;

    const timer = window.setInterval(() => {
      attempts += 1;
      if (dispatchPageView() || attempts >= MAX_RETRY_ATTEMPTS) {
        window.clearInterval(timer);
      }
    }, RETRY_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [pathname, search, hash]);

  return null;
};

export default PublicPageAnalytics;
