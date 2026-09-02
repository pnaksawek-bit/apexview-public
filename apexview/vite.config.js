import { defineConfig } from "vite";

// GitHub Pages serves this project below /<repository>/; local Vite keeps /.
export default defineConfig({
  base: process.env.BASE_PATH || "/",
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three")) return "galaxy-engine";
          if (id.includes("node_modules/lucide")) return "interface-icons";
          return undefined;
        },
      },
    },
  },
});
