import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
const isDevelopment = process.env.NODE_ENV !== "production";
const fileExtensions = ["js", "jsx", "ts", "tsx", "css"];

const alias = {
  "@": path.resolve(__dirname, "src"),
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  mode: isDevelopment ? "development" : "production",
  resolve: {
    alias,
    extensions: fileExtensions.map((extension) => `.${extension}`),
  },
  build: {
    rollupOptions: {
      output: {
        dir: "dist",
        entryFileNames: "index.js",
        assetFileNames: "index.css",
        chunkFileNames: "chunk.js",
        manualChunks: undefined,
      },
    },
  },
});
