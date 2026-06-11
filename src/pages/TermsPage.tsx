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

export function meta() {
  return [
    { title: `Terms of Service | ${SITE_NAME}` },
    {
      name: "description",
      content: `Read the ${SITE_NAME} Terms of Service, including rules for accounts, ratings, forum content, reading lists, reports, and acceptable use.`,
    },
    { property: "og:title", content: `Terms of Service | ${SITE_NAME}` },
    {
      property: "og:description",
      content: `${SITE_NAME} terms for accounts, ratings, community content, and acceptable use.`,
    },
    { property: "og:url", content: absoluteUrl("/terms") },
    { property: "og:type", content: "website" },
  ];
}

export function links() {
  return [{ rel: "canonical", href: absoluteUrl("/terms") }];
}

export default function TermsPage() {
  return (
    <div className="dark-theme-shell mx-auto max-w-4xl px-4 py-12">
      <h1 className={`text-3xl font-bold ${infoPageHeadingText}`}>
        Terms of Service
      </h1>
      <p className={`mt-3 text-sm ${infoPageSubtleText}`}>
        Last updated: May 14, 2026
      </p>

      <div className={`mt-8 space-y-8 ${infoPageBodyText}`}>
        <section className={sectionClass}>
          <h2 className={`text-xl font-semibold ${infoPageHeadingText}`}>
            Operator
          </h2>
          <p>
            {SITE_NAME} is operated by {OPERATOR_NAME}. These terms describe
            the basic rules for using the site, including rankings, accounts,
            forum discussions, reading lists, and issue reports.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={`text-xl font-semibold ${infoPageHeadingText}`}>
            Accounts
          </h2>
          <p>
            You may need an account to vote, create reading lists, submit
            titles, or participate in the forum. You are responsible for keeping
            your login information secure and for activity under your account.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={`text-xl font-semibold ${infoPageHeadingText}`}>
            Ratings, Votes, and Rankings
          </h2>
          <p>
            Rankings are based on community-submitted ratings and site logic.
            Scores may change as more users vote or as moderation, data quality,
            or ranking rules evolve.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={`text-xl font-semibold ${infoPageHeadingText}`}>
            User Content
          </h2>
          <p>
            Forum posts, reading list names, issue reports, title submissions,
            and other contributions remain your responsibility. Do not post
            illegal, abusive, harassing, spammy, misleading, or infringing
            content. We may remove content or limit access when needed to
            protect the community or operate the service.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={`text-xl font-semibold ${infoPageHeadingText}`}>
            Reading Lists and Public Sharing
          </h2>
          <p>
            Reading lists are designed to help you track series. If you make a
            list public or share a public link, people with that link may view
            the list content.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={`text-xl font-semibold ${infoPageHeadingText}`}>
            Reports and Feedback
          </h2>
          <p>
            You may submit issue reports, screenshots, suggestions, or other
            feedback. We may use that information to investigate bugs, improve
            the site, and manage support.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={`text-xl font-semibold ${infoPageHeadingText}`}>
            Disclaimers
          </h2>
          <p>
            {SITE_NAME} is provided as-is. We do our best to keep information
            useful and available, but we do not guarantee that rankings,
            metadata, user content, or site availability will always be complete
            or error-free.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={`text-xl font-semibold ${infoPageHeadingText}`}>
            Contact
          </h2>
          <p>
            Questions about these terms can be sent to{" "}
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
