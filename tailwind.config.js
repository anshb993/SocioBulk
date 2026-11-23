/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#F1F0FB",
        primary: "#4F46C8",
        "primary-dark": "#3E36A8",
        tint: "#E8E6FA",
        ink: "#1E1B3A",
        muted: "#6B6882",
        gold: "#8A5E00",
        "gold-soft": "#FBEFD2",
        rust: "#A8431F",
        "rust-soft": "#FBE6DE",
      },
    },
  },
  plugins: [],
};