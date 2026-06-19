/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1f2937",
        brand: {
          50: "#eef7f4",
          100: "#d8ede6",
          500: "#2f8f78",
          600: "#267763",
          700: "#235f52"
        },
        saffron: "#c68a2d",
        danger: "#b84040"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(31, 41, 55, 0.08)"
      }
    }
  },
  plugins: []
};
