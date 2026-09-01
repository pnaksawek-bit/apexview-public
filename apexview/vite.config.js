import { defineConfig } from "vite";

// GitHub Pages serves this project below /<repository>/; local Vite keeps /.
export default defineConfig({
  base: process.env.BASE_PATH || "/",
});
