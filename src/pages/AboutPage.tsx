// src/pages/AboutPage.tsx

import SocialLinks from "../components/SocialLinks";
import { absoluteUrl, SITE_NAME } from "../config/site";
import { infoPageBodyText, infoPageHeadingText } from "../util/infoPageStyles";

export function meta() {
  return [
    { title: `About | ${SITE_NAME}` },
    {
      name: "description",
      content:
        "Learn about Toon Ranks, a community-powered platform for discovering, ranking, and discussing manga, manhwa, and manhua.",
    },
    { property: "og:title", content: `About | ${SITE_NAME}` },
    {
      property: "og:description",
      content:
        "Learn about Toon Ranks and how readers use it to discover, rank, and discuss series.",
    },
    { property: "og:url", content: absoluteUrl("/about") },
    { property: "og:type", content: "website" },
  ];
}

export function links() {
  return [{ rel: "canonical", href: absoluteUrl("/about") }];
}

const AboutPage = () => {
  return (
    <div className="max-w-4xl mx-auto py-16 px-4">
      <h1 className={`mb-4 text-3xl font-bold ${infoPageHeadingText}`}>
        About {SITE_NAME}
      </h1>
      <p className={`mb-4 leading-relaxed ${infoPageBodyText}`}>
        <strong>{SITE_NAME}</strong> is a fan-driven platform built for readers
        who love discovering and ranking the best
        <span className="font-medium text-blue-600"> Manhwa</span>,
        <span className="font-medium text-red-500"> Manga</span>, and
        <span className="font-medium text-green-600"> Manhua</span>. Whether
        you're into epic fantasy, slice-of-life, drama, or action-packed
        adventures, this platform helps you find top-rated series and share your
        opinions.
      </p>
      <p className={`mb-4 leading-relaxed ${infoPageBodyText}`}>
        Created by enthusiasts for enthusiasts, our goal is to provide a modern,
        community-powered experience that blends great UI, fair voting, and rich
        series detail.
      </p>
      <p className={`mb-4 leading-relaxed ${infoPageBodyText}`}>
        Want to contribute or suggest improvements? Follow us on{" "}
        <SocialLinks /> for rankings, teasers, and community highlights, or use
        the{" "}
        <a href="/contact" className="text-blue-500 hover:underline">
          contact page
        </a>
        .
      </p>
    </div>
  );
};

export default AboutPage;
