import SocialLinks from "./SocialLinks";
import { OPERATOR_NAME, SITE_NAME } from "../config/site";

const footerLinkClass =
  "rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-[#241d19] dark:hover:text-white";

const Footer = () => {
  return (
    <footer className="mt-16 border-t border-slate-200/80 bg-[linear-gradient(180deg,_rgba(248,250,252,0.9),_rgba(255,255,255,1))] dark:border-[#322922]/80 dark:bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.07),_transparent_22%),linear-gradient(180deg,_rgba(20,17,15,0.96),_rgba(27,22,19,1))]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-slate-200 bg-white/90 px-6 py-8 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.45)] backdrop-blur-sm dark-theme-shell sm:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-md">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600 dark:text-blue-300">
                {SITE_NAME}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                Rank, compare, and keep up with the series worth your time.
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Explore manga, manhwa, and manhua with a cleaner way to browse,
                vote, and track what you want to keep reading.
              </p>
            </div>

            <div className="flex flex-col items-start gap-4 md:items-end">
              <div className="flex items-center gap-3 rounded-full bg-slate-50 px-4 py-2 ring-1 ring-inset ring-slate-200 dark:bg-[#241d19] dark:ring-[#3a3028]">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Follow
                </span>
                <SocialLinks variant="footer" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                &copy; {new Date().getFullYear()} {SITE_NAME}. Operated by{" "}
                {OPERATOR_NAME}.
              </p>
            </div>
          </div>

          <nav aria-label="Footer" className="mt-8">
            <ul className="flex flex-wrap gap-2">
              <li>
                <a href="/about" className={footerLinkClass}>
                  About
                </a>
              </li>
              <li>
                <a href="/contact" className={footerLinkClass}>
                  Contact
                </a>
              </li>
              <li>
                <a href="/report-issue" className={footerLinkClass}>
                  Report an Issue
                </a>
              </li>
              <li>
                <a href="/how-rankings-work" className={footerLinkClass}>
                  How Rankings Work
                </a>
              </li>
              <li>
                <a href="/terms" className={footerLinkClass}>
                  Terms
                </a>
              </li>
              <li>
                <a href="/privacy" className={footerLinkClass}>
                  Privacy
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
