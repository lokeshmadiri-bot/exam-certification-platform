/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0B1F38",
        ink2: "#123257",
        paper: "#F4F7FC",
        brand: "#2F6BFF",
        "brand-dark": "#2256d6",
        live: "#F2A93B",
        t1: "#0E9F6E",
        t2: "#57B85A",
        t3: "#E0A500",
        t4: "#EA7A3B",
        t5: "#E04F4F",
      },
      fontFamily: {
        display: ["Sora", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      }
    },
  },
  plugins: [],
}
