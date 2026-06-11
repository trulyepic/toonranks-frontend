import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ThemeProvider } from "./components/ThemeContext";
import { UserProvider } from "./login/UserContext.tsx";
import { SearchProvider } from "./components/SearchContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CookieBanner from "./components/CookieBanner";
import { SessionExpiredModal } from "./components/SessionExpiredModal";
import "./index.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Inline scripts migrated from the old index.html <head>.
const RECAPTCHA_ENTERPRISE = `window.recaptchaOptions = Object.assign({}, window.recaptchaOptions, { enterprise: true });`;
const GTAG_CONSENT = `
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  gtag("consent","default",{analytics_storage:"denied",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied",wait_for_update:500});
  gtag("js", new Date());
  gtag("config","AW-948761939");
`;

// Default document metadata. React Router renders the deepest matching route's
// meta(), so any leaf route that exports its own meta() (the prerendered public
// routes) fully replaces this; routes without one — and the SPA fallback shell —
// inherit these site-wide defaults instead of an empty <title>.
export function meta() {
  return [
    { title: "Toon Ranks | Top Manga, Manhwa, and Manhua" },
    {
      name: "description",
      content:
        "Toon Ranks - Discover and rank your favorite Manga, Manhwa, and Manhua!",
    },
  ];
}

// The document shell. Replaces index.html. The public content routes (Home,
// About, Contact, Terms, Privacy, How-Rankings-Work) set <title>/meta via native
// route meta()/links() exports, rendered by <Meta/>/<Links/> below; the remaining
// (mostly auth-gated) pages still use react-helmet client-side. Phase 2 prerenders
// the public routes so their native meta lands in static HTML.
export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />

        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Toon Ranks" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#ffffff" />

        <meta
          name="google-site-verification"
          content="-22LhMc5VZlXznnEGq_EgI0j00L59cFy_fIdqLq-iMk"
        />

        {/* recaptcha enterprise flag must be set before the widget script loads */}
        <script dangerouslySetInnerHTML={{ __html: RECAPTCHA_ENTERPRISE }} />

        {/* Google tag (gtag.js) + Consent Mode v2 default-denied */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=AW-948761939"
        />
        <script dangerouslySetInnerHTML={{ __html: GTAG_CONSENT }} />

        <script src="https://accounts.google.com/gsi/client" async defer />

        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5886971570640795"
          crossOrigin="anonymous"
        />

        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  const [showExpired, setShowExpired] = useState(false);

  useEffect(() => {
    const flag = localStorage.getItem("sessionExpired");
    if (flag) {
      localStorage.removeItem("sessionExpired");
      setShowExpired(true);
    }
  }, []);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <UserProvider>
          <SearchProvider>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-grow bg-[linear-gradient(180deg,_#f8fafc_0%,_#ffffff_18%,_#ffffff_100%)] transition-colors dark:bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.08),_transparent_18%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.04),_transparent_18%),linear-gradient(180deg,_#18120f_0%,_#120f0d_18%,_#171210_100%)]">
                <Outlet />
                <SessionExpiredModal
                  open={showExpired}
                  onConfirm={() => setShowExpired(false)}
                />
              </main>
              <Footer />
              <CookieBanner />
            </div>
          </SearchProvider>
        </UserProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
