import { Helmet } from "react-helmet";
import {
  absoluteUrl,
  CONTACT_EMAIL,
  OPERATOR_NAME,
  SITE_NAME,
} from "../config/site";
import {
  infoPageBodyText,
  infoPageHeadingText,
  infoPageSubtleText,
} from "../util/infoPageStyles";

const sectionClass = "space-y-3";

export default function PrivacyPage() {
  return (
    <div className="dark-theme-shell mx-auto max-w-4xl px-4 py-12">
      <Helmet>
        <title>Privacy Policy | {SITE_NAME}</title>
        <link rel="canonical" href={absoluteUrl("/privacy")} />
        <meta
          name="description"
          content={`Read the ${SITE_NAME} Privacy Policy, including how account, OAuth, CAPTCHA, analytics, forum, reading list, report, and screenshot data may be used.`}
        />
        <meta property="og:title" content={`Privacy Policy | ${SITE_NAME}`} />
        <meta
          property="og:description"
          content={`How ${SITE_NAME}, operated by ${OPERATOR_NAME}, handles account, community, report, and analytics data.`}
        />
        <meta property="og:url" content={absoluteUrl("/privacy")} />
        <meta property="og:type" content="website" />
      </Helmet>

      <h1 className={`text-3xl font-bold ${infoPageHeadingText}`}>
        Privacy Policy
      </h1>
      <p className={`mt-3 text-sm ${infoPageSubtleText}`}>
        Last updated: June 4, 2026
      </p>

      <div className={`mt-8 space-y-8 ${infoPageBodyText}`}>
        <section className={sectionClass}>
          <h2 className={`text-xl font-semibold ${infoPageHeadingText}`}>
            Operator
          </h2>
          <p>
            {SITE_NAME} is operated by {OPERATOR_NAME}. This policy explains
            the types of information we may collect and use to run the site.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={`text-xl font-semibold ${infoPageHeadingText}`}>
            Information You Provide
          </h2>
          <p>
            When you create an account, we may collect your username, email
            address, password credentials, verification status, and role. If you
            use Google sign-in, we may receive basic Google account information
            needed to authenticate you.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={`text-xl font-semibold ${infoPageHeadingText}`}>
            Site Activity and Community Content
          </h2>
          <p>
            We store activity needed for Toon Ranks features, including votes,
            ratings, reading lists, public reading list links, forum threads,
            forum posts, reactions, title submissions, and moderation records.
            Content you post publicly may be visible to other users and search
            engines.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={`text-xl font-semibold ${infoPageHeadingText}`}>
            Reports and Uploaded Files
          </h2>
          <p>
            If you report an issue, we may collect the report details, optional
            contact email, page URL, browser user agent, and any screenshot you
            upload. Uploaded screenshots and media may be stored using cloud
            storage services.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={`text-xl font-semibold ${infoPageHeadingText}`}>
            Security, CAPTCHA, and Analytics
          </h2>
          <p>
            We use tools such as reCAPTCHA, Google sign-in, and Google tags or
            analytics to protect the site, understand usage, and improve the
            service. These providers may process technical information according
            to their own policies.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={`text-xl font-semibold ${infoPageHeadingText}`}>
            How We Use Information
          </h2>
          <p>
            We use information to operate accounts, verify email addresses,
            maintain rankings, display community content, troubleshoot issues,
            prevent abuse, improve the product, and communicate when needed.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={`text-xl font-semibold ${infoPageHeadingText}`}>
            Cookies
          </h2>
          <p>
            We use cookies and similar technologies to operate the site and
            improve your experience. The categories we use are:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>
              <strong>Necessary</strong> — required for authentication, security,
              and core site features. These cannot be disabled.
            </li>
            <li>
              <strong>Analytics</strong> — help us understand how visitors use
              the site (Google Analytics / gtag). Only active after you accept
              analytics cookies.
            </li>
            <li>
              <strong>Advertising</strong> — used to serve relevant ads and
              measure ad performance (Google AdSense). Only active after you
              accept advertising cookies.
            </li>
          </ul>
          <p className="mt-2">
            You can manage your cookie preferences at any time via the cookie
            banner at the bottom of the page.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={`text-xl font-semibold ${infoPageHeadingText}`}>
            Advertising
          </h2>
          <p>
            {SITE_NAME} may display ads served by Google AdSense. Google uses
            cookies to serve ads based on your prior visits to this site and
            other sites on the internet. You can opt out of personalised
            advertising by visiting{" "}
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-300"
            >
              Google Ad Settings
            </a>
            . For more information on how Google uses data from sites that use
            its advertising services, see{" "}
            <a
              href="https://policies.google.com/technologies/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-300"
            >
              Google's advertising policies
            </a>
            .
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={`text-xl font-semibold ${infoPageHeadingText}`}>
            Contact
          </h2>
          <p>
            Privacy questions can be sent to{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-blue-600 hover:underline dark:text-blue-300"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
