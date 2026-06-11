import { absoluteUrl, SITE_NAME } from "../config/site";
import {
  infoPageBodyText,
  infoPageHeadingText,
  infoPageMutedText,
} from "../util/infoPageStyles";

export function meta() {
  return [
    { title: `How Rankings Work | ${SITE_NAME}` },
    {
      name: "description",
      content:
        "Learn how Toon Ranks calculates scores and ranks manga, manhwa, and manhua using user ratings.",
    },
    { property: "og:title", content: `How Rankings Work | ${SITE_NAME}` },
    {
      property: "og:description",
      content:
        "Learn how Toon Ranks calculates community ranking scores for manga, manhwa, and manhua.",
    },
    { property: "og:url", content: absoluteUrl("/how-rankings-work") },
    { property: "og:type", content: "website" },
  ];
}

export function links() {
  return [{ rel: "canonical", href: absoluteUrl("/how-rankings-work") }];
}

const RankingsInfoPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-10 py-10">
      <h1 className="text-3xl font-bold mb-6 text-blue-500">
        How Rankings Work
      </h1>

      <p className={`mb-4 ${infoPageBodyText}`}>
        {SITE_NAME} is powered by the votes of our community. Every ranking is
        calculated from user-submitted scores across five core categories:
      </p>

      <ul className={`mb-6 list-inside list-disc space-y-2 ${infoPageBodyText}`}>
        <li>
          <strong>Story</strong> - How strong, compelling, or original is the
          plot?
        </li>
        <li>
          <strong>Characters</strong> - Are the characters well-developed and
          memorable?
        </li>
        <li>
          <strong>World Building</strong> - How immersive and consistent is the
          setting?
        </li>
        <li>
          <strong>Art</strong> - How impressive is the visual or artistic style?
        </li>
        <li>
          <strong>Drama / Fighting</strong> - How impactful are emotional scenes
          or action sequences?
        </li>
      </ul>

      <h2 className={`mb-3 mt-8 text-2xl font-semibold ${infoPageHeadingText}`}>
        How Scores Are Calculated
      </h2>
      <ol className={`list-inside list-decimal space-y-2 ${infoPageBodyText}`}>
        <li>User votes are collected for each category.</li>
        <li>Each category score is averaged:</li>
        <li className={`pl-4 text-sm italic ${infoPageMutedText}`}>
          Average = Total Score / Number of Votes
        </li>
        <li>We compute the final score by averaging the 5 category scores:</li>
        <li className={`pl-4 text-sm italic ${infoPageMutedText}`}>
          Final Score = (Story + Characters + World Building + Art + Drama) / 5
        </li>
        <li>
          Series are ranked by highest final score. Series without enough data
          are marked "Unranked."
        </li>
      </ol>

      <p className={`mt-6 ${infoPageBodyText}`}>
        Each user can only vote once per category per series, helping keep
        rankings fair and balanced.
      </p>
    </div>
  );
};

export default RankingsInfoPage;
