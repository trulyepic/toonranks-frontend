import typography from "@tailwindcss/typography";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Body/UI font: Inter (loaded via @fontsource-variable/inter in index.css)
        sans: [
          "Inter Variable",
          "system-ui",
          "Avenir",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        // Headings font: Manrope — slightly rounder/friendlier, suits the comics
        // community feel. Applied to h1-h3 globally in index.css; available as
        // `font-display` for one-off use.
        display: [
          "Manrope Variable",
          "Inter Variable",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [typography],
};
